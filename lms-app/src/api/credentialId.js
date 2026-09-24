/* ============================================================================
   PUBLIC CREDENTIAL ID
   The ID printed on a certificate and used in its public verification URL
   (verify.<domain>/c/<credentialId>). It must be unguessable and reveal
   nothing: no course, learner, or timestamp.

   Format: 12 characters from the Crockford base32 alphabet (no I, L, O, U,
   so it reads aloud and types cleanly), grouped 4-4-4, e.g. 7KQ2-M9XD-P4TA.
   60 bits of randomness from crypto.getRandomValues. 256 is a multiple of 32,
   so masking each byte to 5 bits keeps every character equally likely.
   The backend (Sprint 4) must generate IDs the same way, server-side.
   ============================================================================ */

const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

export const CREDENTIAL_ID_PATTERN = /^[0-9A-HJKMNP-TV-Z]{4}-[0-9A-HJKMNP-TV-Z]{4}-[0-9A-HJKMNP-TV-Z]{4}$/;

export function newCredentialId() {
  const bytes = new Uint8Array(12);
  globalThis.crypto.getRandomValues(bytes);
  const chars = [...bytes].map((b) => ALPHABET[b & 31]).join('');
  return `${chars.slice(0, 4)}-${chars.slice(4, 8)}-${chars.slice(8, 12)}`;
}
