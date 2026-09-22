# TLC_TRNG DST - v3 (Sprint 1: Cognito auth)

A build of the TLC TRNG, LLC Decision Support Tool with the mockup authentication replaced by real AWS Cognito-backed auth. Intended for stakeholder review and demo use under real auth conditions.

## What changed in v3 (relative to v2)

- **Real authentication.** AWS Cognito User Pool replaces the SEED_USERS mockup. Users sign in with email + password; first sign-in forces a permanent password reset from the temp password issued by an admin.
- **Real admin operations.** Invite, deactivate, reactivate, reset password, and change role all call live Cognito Admin API endpoints (via an HTTP API + JWT-authorized Lambdas) instead of mutating an in-memory list.
- **Demo password gate removed.** The shared access code that fronted the app is gone since Cognito is now the auth boundary. Users sign in directly with their own credentials.
- **InviteUserForm** dropped the Email Code / Password Sign-In Method picker (everyone is on password auth now). Admins generate a temp password automatically and communicate it out-of-band.
- **Critical: Cognito SDK polyfill in index.html.** amazon-cognito-identity-js requires `window.global` to be defined before any module script runs. Removing the inline `<script>` at the top of `<head>` causes a silent blank-screen failure. Do not remove.

## Backend wiring

Authentication and admin operations are powered by the auth stack deployed via `dst-auth-cloudformation.yaml`, stack name `tlctrng-dst-auth-stack`, region `us-east-2`. The values wired into `src/dst.config.js`:

```
UserPoolId:   us-east-2_3tqzC2SvO
AppClientId:  7cesdcbto1faommuccf1bns09t
ApiInvokeUrl: https://2f26y4pt1d.execute-api.us-east-2.amazonaws.com
Region:       us-east-2
```

These values live in `src/dst.config.js` under the `cognito` and `api` sections.

## First-time admin

The first admin (Travis) was created via CLI:

```bash
aws cognito-idp admin-create-user \
  --user-pool-id us-east-2_3tqzC2SvO \
  --username travis@TLCTRNG.com \
  --user-attributes Name=email,Value=travis@TLCTRNG.com Name=email_verified,Value=true \
    Name=name,Value="Travis Cryan" Name=custom:role,Value=admin Name=custom:status,Value=active \
  --temporary-password "TLCTRNG@2026" \
  --message-action SUPPRESS \
  --region us-east-2
```

After that, additional users can be invited via the Admin Portal inside the app, and the LoginScreen handles the force-change-password challenge on first sign-in.

## Build provenance

This build was assembled per:
- DST Build Playbook v2 for the demo build (data, branding, codebase customization)
- `dst-auth-deployment-guide.md` for the auth stack (deploys via CloudFormation in one operation)
- `dst-auth-codebase-integration.md` for the React codebase delta to consume Cognito

## One-time setup

```bash
node --version    # should be 18.x or 20.x
npm install
rm -rf node_modules/.vite    # important if upgrading from v2
npm run dev
```

The `rm -rf node_modules/.vite` step forces Vite to re-bundle dependencies with the new `global` define added for the Cognito polyfill. Without this, the cached pre-bundle from the v2 install may still emit `global is not defined` errors at runtime.

## Smoke test

Open http://localhost:5173 (no password gate anymore). Walk:

- Sign in as `travis@TLCTRNG.com` with `TLCTRNG@2026`. On first sign-in you'll be prompted to set a permanent password (8+ chars, mixed case, number, symbol).
- After setting the password, you land on the Home screen with the TLC_TRNG branding.
- Open Admin Portal. The user list shows seed users from `dst.config.js` (local cache) plus Travis (auto-added from the Cognito session).
- Invite a test user. The flash message reveals the generated temp password (15-second display). Copy it.
- In a private/incognito window, sign in as the new user. Force-password-change kicks in.
- Back as admin, deactivate a user. The Cognito User Pool reflects the change.

## Production deploy

```bash
npm run build
aws s3 sync dist/ s3://tlctrng-demo-dst --delete
aws cloudfront create-invalidation --distribution-id E2VY0OWWUSRNM1 --paths "/*"
```

## What's still pending

- Sprint 2: persistence and shared scenarios (DynamoDB + Lambda + API Gateway for saved scenarios)
- Sprint 3: real map (Google Maps replacing the SVG)
- Sprint 4 through 7: PWA / offline, dashboard view, content polish, operational hardening
