"""
Extract DST data from Meridian-style sample CSVs into the JSON shapes that
src/App.jsx expects. Substitutes 'Meridian' / 'meridian' references with the
target organization (TLC_TRNG / tlctrng) so the demo reads as that org.

Inputs (in --src directory):
    meridian_assets.csv
    meridian_dependencies.csv
    meridian_personnel.csv
    meridian_department_directors.csv
    meridian_process_details.csv      [optional; supplies long-form per-asset
                                       content for impacts, critical questions,
                                       and short-term phased playbooks]

Outputs (in --out directory, defaults to src/data/):
    assets.json       (list of asset dicts, App.jsx-compatible)
    edges.json        (dict of {source_id: [target_id, ...]})
    depLookup.json    (dict of {id: {name, type, dept, score}})
    personnel.json    (list of personnel dicts)
    directors.json    (dict of {dept: director dict})
"""

import argparse
import csv
import json
import os
import re
import sys
from collections import defaultdict


# ----------------------------------------------------------------------------
# String substitution: Meridian -> TLC_TRNG
# ----------------------------------------------------------------------------

def make_substitutor(target_short, target_full, target_email_domain):
    """
    Returns a function that takes any string from the CSVs and replaces the
    fictional 'Meridian' brand with the real target org's brand.

    Replacements applied in order (most specific first, so 'meridian-demo.com'
    is caught before 'meridian'):
      - 'meridian-demo.com' -> target_email_domain
      - 'Meridian Industries' -> target_full
      - 'Meridian Pkwy' -> target_short.replace('_', ' ') + ' Pkwy'  (looks natural)
      - 'Meridian' -> target_short
      - 'meridian' (lowercase, e.g. inside email locals) -> target_short.lower()
    """
    pkwy_label = target_short.replace('_', ' ')

    def sub(text):
        if not isinstance(text, str):
            return text
        out = text
        out = out.replace('meridian-demo.com', target_email_domain)
        out = out.replace('Meridian Industries', target_full)
        out = out.replace('Meridian Pkwy', f'{pkwy_label} Pkwy')
        out = out.replace('Meridian', target_short)
        # Lowercase 'meridian' (rare, mostly in email locals like jdoe@meridian...)
        # which we already handled; this catches anything stray.
        out = re.sub(r'\bmeridian\b', target_short.lower(), out)
        return out

    return sub


# ----------------------------------------------------------------------------
# Asset extraction
# ----------------------------------------------------------------------------

def extract_assets(assets_csv_path, sub):
    """Read meridian_assets.csv and produce a list of asset dicts."""
    with open(assets_csv_path, newline='', encoding='utf-8-sig') as f:
        reader = csv.DictReader(f)
        rows = list(reader)

    assets = []
    for row in rows:
        # opCategory comes through as just the label (e.g. 'Life Safety').
        # We keep it as-is for display. opCategoryRaw matches App.jsx's older
        # legacy field naming convention ('1-Life Safety').
        op_label = (row.get('opCategory') or '').strip()
        op_num = (row.get('opCategoryNum') or '').strip()
        op_raw = f"{op_num}-{op_label}" if op_num else op_label

        try:
            lat = float(row['lat']) if row.get('lat') else None
            lng = float(row['lng']) if row.get('lng') else None
        except (TypeError, ValueError):
            lat, lng = None, None

        try:
            score = int(row.get('restorationScore') or 0)
        except ValueError:
            score = 0

        try:
            priority = int(row.get('priority') or 0)
        except ValueError:
            priority = 0

        record = {
            'id':              (row.get('id') or '').strip(),
            'name':            sub((row.get('name') or '').strip()),
            'type':            (row.get('type') or '').strip(),
            'dept':            (row.get('dept') or '').strip(),
            'programOffice':   sub((row.get('programOffice') or '').strip()),
            'opCategory':      op_label,
            'opCategoryRaw':   op_raw,
            'priority':        priority,
            'restorationScore': score,
            'score':           score,           # legacy alias used in cascade rendering
            'direct':          int(row.get('direct') or 0),
            'indirect':        int(row.get('indirect') or 0),
            'total':           int(row.get('total') or 0),
            'depth':           int(row.get('depth') or 0),
            'description':     sub((row.get('description') or '').strip()),
            'address':         sub((row.get('address') or '').strip()),
            'lat':             lat,
            'lng':             lng,
            # Demo dataset has no separate impacts/shortTerm long-form source,
            # so these are empty by default. Populated from process_details.csv
            # in main() if that optional CSV is present.
            'impacts':           '',
            'criticalQuestions': [],
            'shortTerm':         [],
            # downstream/upstream are filled in below from the dependencies CSV
            'downstream':      [],
            'upstream':        [],
        }
        assets.append(record)

    return assets


# ----------------------------------------------------------------------------
# Dependency extraction (edges, downstream/upstream lists)
# ----------------------------------------------------------------------------

def extract_dependencies(deps_csv_path, assets_by_id, sub):
    """
    Read meridian_dependencies.csv and produce:
      - edges: dict of {source_id: [target_id, ...]}
      - downstream/upstream entries on each asset record
    """
    with open(deps_csv_path, newline='', encoding='utf-8-sig') as f:
        reader = csv.DictReader(f)
        rows = list(reader)

    edges = defaultdict(list)

    for row in rows:
        sid = (row.get('source_id') or '').strip()
        tid = (row.get('target_id') or '').strip()
        ttype = (row.get('target_type') or '').strip()
        tname = sub((row.get('target_name') or '').strip())
        if not sid or not tid:
            continue

        if tid not in edges[sid]:
            edges[sid].append(tid)

        # Add to source asset's downstream
        src_asset = assets_by_id.get(sid)
        if src_asset is not None:
            entry = {'id': tid, 'name': tname, 'type': ttype.lower()}
            if entry not in src_asset['downstream']:
                src_asset['downstream'].append(entry)

        # Add to target asset's upstream
        tgt_asset = assets_by_id.get(tid)
        if tgt_asset is not None:
            src_record = assets_by_id.get(sid)
            entry = {
                'id': sid,
                'name': src_record['name'] if src_record else sid,
                'type': src_record['type'].lower() if src_record else 'process',
            }
            if entry not in tgt_asset['upstream']:
                tgt_asset['upstream'].append(entry)

    return dict(edges)


# ----------------------------------------------------------------------------
# Personnel extraction
# ----------------------------------------------------------------------------

def extract_personnel(personnel_csv_path, sub):
    """Read meridian_personnel.csv and produce a list of personnel dicts."""
    with open(personnel_csv_path, newline='', encoding='utf-8-sig') as f:
        reader = csv.DictReader(f)
        rows = list(reader)

    out = []
    for row in rows:
        # Demo CSV has 'office' as a phone-number-ish field. We map it to
        # officePhone, and leave the textual programOffice empty (the demo
        # personnel data doesn't carry that distinction).
        out.append({
            'id':           (row.get('id') or '').strip(),
            'name':         sub((row.get('name') or '').strip()),
            'title':        sub((row.get('title') or '').strip()),
            'function':     sub((row.get('function') or '').strip()),
            'dept':         (row.get('dept') or '').strip(),
            'office':       '',  # programOffice text label; not used in demo
            'email':        sub((row.get('email') or '').strip()),
            'mobile':       (row.get('mobile') or '').strip(),
            'officePhone':  (row.get('office') or '').strip(),  # numeric phone in demo
        })
    return out


# ----------------------------------------------------------------------------
# Director extraction
# ----------------------------------------------------------------------------

def extract_directors(directors_csv_path, sub):
    """
    Read meridian_department_directors.csv and produce a dict keyed by dept.
    Format matches the PCCA build's directors.json.
    """
    with open(directors_csv_path, newline='', encoding='utf-8-sig') as f:
        reader = csv.DictReader(f)
        rows = list(reader)

    out = {}
    for row in rows:
        dept = (row.get('dept') or '').strip()
        if not dept:
            continue
        out[dept] = {
            'name':           sub((row.get('name') or '').strip()),
            'title':          sub((row.get('title') or '').strip()),
            'phone':          (row.get('office') or '').strip(),  # office line
            'email':          sub((row.get('email') or '').strip()),
            'mobile':         (row.get('mobile') or '').strip(),
            '_personnelName': sub((row.get('name') or '').strip()),
        }
    return out


# ----------------------------------------------------------------------------
# Lookup table
# ----------------------------------------------------------------------------

def build_lookup(assets):
    """Quick lookup {id: {name, type, dept, score}} used by cascade rendering."""
    return {
        a['id']: {
            'name': a['name'],
            'type': a['type'],
            'dept': a['dept'],
            'score': a['score'],
        }
        for a in assets
    }


# ----------------------------------------------------------------------------
# Process details extraction
# ----------------------------------------------------------------------------

def extract_process_details(details_csv_path, sub):
    """
    Read meridian_process_details.csv and produce a per-asset dict:
        { asset_id: { 'impacts': str,
                      'criticalQuestions': [str, ...],
                      'shortTerm': [ {head, body}, ... ] } }

    The CSV is row-oriented with these columns: ProcessID, Section, Order,
    Level, Text, Bold, Phase. Relevant sections:

      Section='Impacts'                  one row per asset, Level=0
      Section='Critical Questions'       8 rows per asset, Level=1
      Section='Short-Term Operations'    12 rows per asset:
                                           Level=1 Bold=Y rows are phase headers
                                           Level=2 rows are action items
                                         each row has a Phase column ("First 30
                                         minutes", "First 2 hours", "First 24
                                         hours") that groups items.

    Items within each section are emitted in CSV row order (which matches the
    Order column).
    """
    if not os.path.exists(details_csv_path):
        # Optional input; if missing, return empty dict and the caller leaves
        # impacts/criticalQuestions/shortTerm at their default empty values.
        print(f'  (no process details CSV at {details_csv_path}, skipping)')
        return {}

    with open(details_csv_path, newline='', encoding='utf-8-sig') as f:
        reader = csv.DictReader(f)
        rows = list(reader)

    # Group rows by ProcessID, preserving the file's row order within each group
    by_pid = defaultdict(list)
    for r in rows:
        by_pid[(r.get('ProcessID') or '').strip()].append(r)

    out = {}
    # Preserve a stable phase order based on first-seen-in-file order per asset
    for pid, prows in by_pid.items():
        impacts_text = ''
        questions = []
        phases_order = []                # list of phase names in first-seen order
        phase_items  = defaultdict(list) # phase name -> [action strings]

        for r in prows:
            section = (r.get('Section') or '').strip()
            text    = sub((r.get('Text') or '').strip())
            level   = (r.get('Level') or '').strip()
            bold    = (r.get('Bold') or '').strip().upper() == 'Y'
            phase   = sub((r.get('Phase') or '').strip())

            if section == 'Impacts':
                # Single-row section; take the first non-empty value
                if text and not impacts_text:
                    impacts_text = text

            elif section == 'Critical Questions':
                if text:
                    questions.append(text)

            elif section == 'Short-Term Operations':
                # Skip the phase header rows (bold, level 1). Their content is
                # just the phase name, which we already have from the Phase
                # column. Keep only the leaf action items.
                if bold:
                    if phase and phase not in phases_order:
                        phases_order.append(phase)
                    continue
                if not phase:
                    continue
                if phase not in phases_order:
                    phases_order.append(phase)
                if text:
                    phase_items[phase].append(text)

        # Convert phase dict into the [{head, body}, ...] shape App.jsx expects
        short_term = [
            {'head': p, 'body': phase_items[p]}
            for p in phases_order
            if phase_items[p]
        ]

        out[pid] = {
            'impacts':           impacts_text,
            'criticalQuestions': questions,
            'shortTerm':         short_term,
        }

    return out




def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--src', required=True, help='Directory containing meridian_*.csv')
    ap.add_argument('--out', default='src/data', help='Output directory for JSON files')
    ap.add_argument('--target-short', default='TLC_TRNG', help='Replacement short name')
    ap.add_argument('--target-full', default='TLC TRNG, LLC', help='Replacement full name')
    ap.add_argument('--target-email-domain', default='tlctrng.com', help='Replacement email domain')
    args = ap.parse_args()

    sub = make_substitutor(args.target_short, args.target_full, args.target_email_domain)

    os.makedirs(args.out, exist_ok=True)

    # 1. Assets
    assets = extract_assets(os.path.join(args.src, 'meridian_assets.csv'), sub)
    assets_by_id = {a['id']: a for a in assets}

    # 2. Dependencies (mutates assets in place to add downstream/upstream)
    edges = extract_dependencies(os.path.join(args.src, 'meridian_dependencies.csv'),
                                  assets_by_id, sub)

    # 3. Process details: long-form per-asset content (impacts, critical
    # questions, short-term phased playbooks). Merged onto each asset record
    # by ID, overwriting the empty defaults set in extract_assets().
    details = extract_process_details(
        os.path.join(args.src, 'meridian_process_details.csv'), sub)
    details_applied = 0
    for asset in assets:
        d = details.get(asset['id'])
        if not d:
            continue
        if d.get('impacts'):
            asset['impacts'] = d['impacts']
        if d.get('criticalQuestions'):
            asset['criticalQuestions'] = d['criticalQuestions']
        if d.get('shortTerm'):
            asset['shortTerm'] = d['shortTerm']
        details_applied += 1

    # 4. Personnel
    personnel = extract_personnel(os.path.join(args.src, 'meridian_personnel.csv'), sub)

    # 5. Directors
    directors = extract_directors(os.path.join(args.src, 'meridian_department_directors.csv'), sub)

    # 6. Lookup
    lookup = build_lookup(assets)

    # Write all five
    def write_json(name, data):
        path = os.path.join(args.out, name)
        with open(path, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        return path

    write_json('assets.json', assets)
    write_json('edges.json', edges)
    write_json('depLookup.json', lookup)
    write_json('personnel.json', personnel)
    write_json('directors.json', directors)

    # Sanity counts
    counts = {
        'processes':      sum(1 for a in assets if a['type'] == 'Process'),
        'systems':        sum(1 for a in assets if a['type'] == 'System'),
        'facilities':     sum(1 for a in assets if a['type'] == 'Facility'),
        'edges':          sum(len(v) for v in edges.values()),
        'personnel':      len(personnel),
        'directors':      len(directors),
        'details_merged': details_applied,
    }
    print('Extraction complete.')
    for k, v in counts.items():
        print(f'  {k}: {v}')


if __name__ == '__main__':
    main()
