#!/usr/bin/env python3
"""Space the narration's beats to the cut's timing, leaving the voice itself untouched.

  python3 tools/time_narration.py <narration audio> <words.json> <beats.json> <out.wav> <out timing.js> [<length s>]

beats.json lists each beat as {"id", "first": its opening word or words, "at": target start in seconds}, in order. The read is cut in
the silence before each beat's first word (the middle of the gap to the previous word), and each beat is moved later
so its first word lands on "at". Beats only ever move later, never closer. The result is padded with silence to the
cut's length. timing.js holds window.TIMING: each beat's start and end and every word's shifted times, so the
picture is timed to the voice.
"""
import json, subprocess, sys

src, words_path, beats_path, out_wav, out_js = sys.argv[1:6]
length = float(sys.argv[6]) if len(sys.argv) > 6 else None
words = json.load(open(words_path))
beats = json.load(open(beats_path))
norm = lambda w: "".join(c for c in w.lower() if c.isalnum())

# find each beat's opening words, in order ("first" may be a few words, to tell apart beats that start alike)
starts, k = [], 0
for b in beats:
    want = [norm(w) for w in b["first"].split()]
    while k < len(words) and [norm(w["w"]) for w in words[k:k + len(want)]] != want:
        k += 1
    if k == len(words):
        sys.exit(f"beat {b['id']}: opening {b['first']!r} not found")
    starts.append(k); k += 1

dur = float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", src],
                           capture_output=True, text=True, check=True).stdout)
cuts = [0.0] + [(words[i - 1]["e"] + words[i]["s"]) / 2 for i in starts[1:]] + [dur]
shifts = [b["at"] - words[i]["s"] for b, i in zip(beats, starts)]
for a, b in zip(shifts, shifts[1:]):
    if b < a - 1e-6:
        sys.exit(f"beat targets would pull the read together ({a:.2f} s then {b:.2f} s): move the later beat's 'at' later")

# lay each piece at its shifted place, then pad to the cut's length
parts, labels = [], []
for j, (c0, c1, s) in enumerate(zip(cuts, cuts[1:], shifts)):
    parts.append(f"[0:a]atrim={c0:.3f}:{c1:.3f},asetpts=PTS-STARTPTS,adelay={round((c0 + s) * 1000)}:all=1[p{j}]")
    labels.append(f"[p{j}]")
end = cuts[-1] + shifts[-1]
total = max(length or 0, end)
graph = ";".join(parts) + ";" + "".join(labels) + f"amix=inputs={len(labels)}:normalize=0:dropout_transition=0,apad=whole_dur={total:.3f}[a]"
subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", src, "-filter_complex", graph, "-map", "[a]", "-ar", "48000", "-ac", "2",
                "-c:a", "pcm_s16le", out_wav], check=True)

timing = {"length": total, "beats": [], "words": []}
for j, (b, i) in enumerate(zip(beats, starts)):
    last = (starts[j + 1] if j + 1 < len(starts) else len(words)) - 1
    timing["beats"].append({"id": b["id"], "start": round(words[i]["s"] + shifts[j], 3), "end": round(words[last]["e"] + shifts[j], 3)})
    for w in words[i:last + 1]:
        timing["words"].append({"w": w["w"], "s": round(w["s"] + shifts[j], 3), "e": round(w["e"] + shifts[j], 3), "beat": b["id"]})
open(out_js, "w").write("window.TIMING = " + json.dumps(timing, indent=1) + ";\n")
for b in timing["beats"]:
    print(f"{b['id']:>8}: {b['start']:6.2f} - {b['end']:6.2f}")
print(f"voice ends {end:.2f} s; padded to {total:.2f} s")
