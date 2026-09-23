/* ============================================================================
   MOCK STORE: THE DYNAMODB SINGLE TABLE, IN MEMORY
   Mirrors the planned table exactly (playbook Section 5): every record is an
   item with PK and SK, plus index attributes where an access pattern needs
   one. The store offers only the operations DynamoDB makes cheap: get by
   key, query a partition (optionally by SK prefix), and query an index. It
   has no scan, on purpose, so a new access pattern has to be designed as a
   key or an index before it can be written.

   Only src/api/ touches the store. Components go through the api object.

   TABLE DESIGN
   Entity        PK                  SK                         Index attributes
   User profile  USER#<sub>          PROFILE
   Course        COURSE#<courseId>   META                       GSI2PK CATALOG#<status>, GSI2SK COURSE#<courseId>
   Content item  COURSE#<courseId>   ITEM#<itemId>
   Enrollment    USER#<sub>          ENROLL#<courseId>          GSI1PK COURSE#<courseId>, GSI1SK ENROLL#<sub>
   CMI runtime   USER#<sub>          CMI#<courseId>#<scoId>
   Certificate   USER#<sub>          CERT#<courseId>            GSI3PK CRED#<credentialId>, GSI3SK CERT

   GSI1 inverts the enrollment key: the course roster (Sprint 2 instructor
   view) is one query, COURSE#<courseId> / begins_with ENROLL#.
   GSI2 is the catalog: CATALOG#published / begins_with COURSE#.
   GSI3 finds a certificate by its public credential ID (the Sprint 7
   verification page, verify.<domain>/c/<credentialId>): CRED#<id> / CERT.

   The SES outbox is not table data; it stays a plain array.
   ============================================================================ */

import { seedUsers, seedCourses, seedItems } from './seed.js';

// Key builders: the only place key strings are spelled. Sprint 4 Lambdas
// use the same shapes.
export const keys = {
  user: (sub) => `USER#${sub}`,
  profile: () => 'PROFILE',
  course: (courseId) => `COURSE#${courseId}`,
  meta: () => 'META',
  item: (itemId) => `ITEM#${itemId}`,
  enroll: (courseId) => `ENROLL#${courseId}`,
  enrollee: (sub) => `ENROLL#${sub}`,
  cmi: (courseId, scoId) => `CMI#${courseId}#${scoId}`,
  cert: (courseId) => `CERT#${courseId}`,
  catalog: (status) => `CATALOG#${status}`,
  credential: (credentialId) => `CRED#${credentialId}`,
};

// Attributes that exist only for the table; the api strips them before
// returning an item, as the real Lambdas will.
const KEY_ATTRS = ['PK', 'SK', 'GSI1PK', 'GSI1SK', 'GSI2PK', 'GSI2SK', 'GSI3PK', 'GSI3SK', 'entity'];

export function stripKeys(item) {
  if (!item) return null;
  const out = { ...item };
  for (const k of KEY_ATTRS) delete out[k];
  return out;
}

const INDEXES = {
  GSI1: ['GSI1PK', 'GSI1SK'],
  GSI2: ['GSI2PK', 'GSI2SK'],
  GSI3: ['GSI3PK', 'GSI3SK'],
};

function makeTable() {
  const items = new Map(); // `${PK}\u0000${SK}` -> item
  const id = (pk, sk) => `${pk}\u0000${sk}`;
  const copy = (item) => (item ? structuredClone(item) : null);
  const bySk = (a, b) => (a.SK < b.SK ? -1 : a.SK > b.SK ? 1 : 0);

  return {
    // GetItem
    get(pk, sk) {
      return copy(items.get(id(pk, sk)) || null);
    },
    // PutItem (full replace, like DynamoDB)
    put(item) {
      if (!item.PK || !item.SK) throw new Error('put: item needs PK and SK');
      items.set(id(item.PK, item.SK), copy(item));
      return copy(item);
    },
    // Query on the base table: one partition, optional SK prefix, SK order
    query(pk, skPrefix = '') {
      return [...items.values()]
        .filter((i) => i.PK === pk && i.SK.startsWith(skPrefix))
        .sort(bySk)
        .map(copy);
    },
    // Query on a GSI: one index partition, optional index-SK prefix
    queryIndex(indexName, pk, skPrefix = '') {
      const attrs = INDEXES[indexName];
      if (!attrs) throw new Error(`queryIndex: unknown index ${indexName}`);
      const [pkAttr, skAttr] = attrs;
      return [...items.values()]
        .filter((i) => i[pkAttr] === pk && String(i[skAttr] ?? '').startsWith(skPrefix))
        .sort((a, b) => (a[skAttr] < b[skAttr] ? -1 : a[skAttr] > b[skAttr] ? 1 : 0))
        .map(copy);
    },
  };
}

export function makeStore() {
  const table = makeTable();

  // USER#<sub> / PROFILE: mirror of the Cognito user, role cached for queries.
  for (const u of Object.values(seedUsers)) {
    table.put({
      PK: keys.user(u.sub), SK: keys.profile(), entity: 'user',
      sub: u.sub, email: u.email, name: u.name, role: u.role,
    });
  }
  // COURSE#<courseId> / META, indexed into the catalog by status.
  for (const c of seedCourses) {
    table.put({
      PK: keys.course(c.courseId), SK: keys.meta(), entity: 'course',
      GSI2PK: keys.catalog(c.status), GSI2SK: keys.course(c.courseId),
      ...c,
    });
  }
  // COURSE#<courseId> / ITEM#<itemId>: the content items of each course.
  for (const it of seedItems) {
    table.put({ PK: keys.course(it.courseId), SK: keys.item(it.itemId), entity: 'item', ...it });
  }

  return {
    table,
    outbox: [], // stand-in for SES; certificate "emails" land here
  };
}
