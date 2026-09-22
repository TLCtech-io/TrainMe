/* ============================================================================
   AUTHENTICATION & ADMIN API LAYER

   Wraps amazon-cognito-identity-js (Cognito SDK) and the admin API calls in
   promise-based functions. All organization-specific values come from
   dst.config.js.
   ============================================================================ */

import {
  CognitoUserPool,
  CognitoUser,
  AuthenticationDetails,
} from 'amazon-cognito-identity-js';

import DST_CONFIG from './dst.config.js';

const userPool = new CognitoUserPool({
  UserPoolId: DST_CONFIG.cognito.userPoolId,
  ClientId:   DST_CONFIG.cognito.appClientId,
});

/* Sign-in. Resolves to:
   { status: 'success', tokens, user }
   { status: 'NEW_PASSWORD_REQUIRED', cognitoUser, userAttributes }
   Rejects with Cognito error on failure.
*/
export function signIn(email, password) {
  return new Promise((resolve, reject) => {
    const cognitoUser = new CognitoUser({ Username: email, Pool: userPool });
    const authDetails = new AuthenticationDetails({ Username: email, Password: password });

    cognitoUser.authenticateUser(authDetails, {
      onSuccess: (session) => {
        const payload = session.getIdToken().payload;
        resolve({
          status: 'success',
          tokens: {
            idToken:      session.getIdToken().getJwtToken(),
            accessToken:  session.getAccessToken().getJwtToken(),
            refreshToken: session.getRefreshToken().getToken(),
          },
          user: {
            email:  payload.email,
            name:   payload.name || payload.email,
            role:   payload['custom:role']   || 'user',
            status: payload['custom:status'] || 'active',
            sub:    payload.sub,
          },
        });
      },
      onFailure: reject,
      newPasswordRequired: (userAttributes) => {
        delete userAttributes.email_verified;
        delete userAttributes.email;
        resolve({ status: 'NEW_PASSWORD_REQUIRED', cognitoUser, userAttributes });
      },
    });
  });
}

/* Complete force-change-password challenge. Same success shape as signIn. */
export function completeNewPassword(cognitoUser, newPassword, userAttributes = {}) {
  return new Promise((resolve, reject) => {
    cognitoUser.completeNewPasswordChallenge(newPassword, userAttributes, {
      onSuccess: (session) => {
        const payload = session.getIdToken().payload;
        resolve({
          status: 'success',
          tokens: {
            idToken:      session.getIdToken().getJwtToken(),
            accessToken:  session.getAccessToken().getJwtToken(),
            refreshToken: session.getRefreshToken().getToken(),
          },
          user: {
            email:  payload.email,
            name:   payload.name || payload.email,
            role:   payload['custom:role']   || 'user',
            status: payload['custom:status'] || 'active',
            sub:    payload.sub,
          },
        });
      },
      onFailure: reject,
    });
  });
}

/* Sign out - clears local Cognito session (tokens in localStorage). */
export function signOut() {
  const currentUser = userPool.getCurrentUser();
  if (currentUser) currentUser.signOut();
}

/* Restore session on app load. Resolves to { tokens, user } or null. */
export function getCurrentSession() {
  return new Promise((resolve) => {
    const currentUser = userPool.getCurrentUser();
    if (!currentUser) { resolve(null); return; }
    currentUser.getSession((err, session) => {
      if (err || !session || !session.isValid()) { resolve(null); return; }
      const payload = session.getIdToken().payload;
      resolve({
        tokens: {
          idToken:      session.getIdToken().getJwtToken(),
          accessToken:  session.getAccessToken().getJwtToken(),
          refreshToken: session.getRefreshToken().getToken(),
        },
        user: {
          email:  payload.email,
          name:   payload.name || payload.email,
          role:   payload['custom:role']   || 'user',
          status: payload['custom:status'] || 'active',
          sub:    payload.sub,
        },
      });
    });
  });
}

/* Admin API caller. endpointKey is one of: invite, deactivate, reactivate,
   resetPassword, changeRole. body is the request payload. idToken is the
   JWT from the current session. */
export async function adminApi(endpointKey, body, idToken) {
  const path = DST_CONFIG.api.endpoints[endpointKey];
  if (!path) throw new Error(`Unknown admin endpoint: ${endpointKey}`);
  const url = DST_CONFIG.api.baseUrl + path;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${idToken}`,
    },
    body: JSON.stringify(body || {}),
  });

  let json = {};
  try { json = await response.json(); } catch { /* not JSON */ }

  if (!response.ok) {
    const message = json.error || json.message || `HTTP ${response.status}`;
    const err = new Error(message);
    err.status = response.status;
    err.body = json;
    throw err;
  }
  return json;
}

/* Friendly error message mapping for Cognito error codes. */
export function friendlyAuthError(err) {
  const code = err.code || err.name || '';
  const msg  = err.message || '';
  if (code === 'NotAuthorizedException') {
    if (msg.includes('disabled')) return 'This account has been deactivated. Contact an administrator to reactivate it.';
    return 'Incorrect email or password.';
  }
  if (code === 'UserNotFoundException')           return 'Incorrect email or password.';
  if (code === 'PasswordResetRequiredException')  return 'Your password must be reset by an administrator. Please contact an admin.';
  if (code === 'UserNotConfirmedException')       return 'This account has not been confirmed yet.';
  if (code === 'InvalidPasswordException')        return 'Password does not meet the policy: 8+ characters, mixed case, number, symbol.';
  if (code === 'LimitExceededException')          return 'Too many attempts. Please wait a few minutes and try again.';
  if (code === 'TooManyRequestsException')        return 'Too many requests. Please slow down and try again.';
  if (code === 'NetworkError' || msg.includes('Network')) return 'Network error. Check your connection and try again.';
  return msg || 'Sign-in failed. Please try again.';
}
