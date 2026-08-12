# Authentication and Accounts

## Identity Model

- [ ] Give every account one internal immutable user ID.
- [ ] Keep provider IDs separate from internal user IDs.
- [ ] Allow many identities to link to one account.
- [ ] Store provider subject IDs as opaque strings.
- [ ] Never key game data by email address.
- [ ] Let users change email without changing identity.

## Local Accounts

- [ ] Support local email or username login.
- [ ] Hash passwords with a modern PHP password API.
- [ ] Never store plaintext passwords.
- [ ] Add password reset tokens with short expiry.
- [ ] Invalidate reset tokens after use.
- [ ] Rate-limit password reset attempts.
- [ ] Notify users after important credential changes.

## OpenID Connect

- [ ] Use OpenID Connect for federated identity.
- [ ] Use authorization code flows for browser login.
- [ ] Use PKCE where supported by the client flow.
- [ ] Validate issuer values.
- [ ] Validate client audience values.
- [ ] Validate token signatures.
- [ ] Validate token expiry.
- [ ] Validate nonce values where required.
- [ ] Use exact registered redirect URIs.
- [ ] Reject open redirect behavior.
- [ ] Use provider discovery metadata where practical.

## Login Providers

- [ ] Add a generic OIDC provider adapter.
- [ ] Add Google through the OIDC adapter.
- [ ] Add a Facebook identity adapter.
- [ ] Keep provider claims outside core account data.
- [ ] Let providers be enabled by configuration.
- [ ] Handle provider email changes safely.
- [ ] Handle providers that do not return an email.

## Account Linking

- [ ] Let signed-in users link another identity.
- [ ] Require recent authentication before linking.
- [ ] Prevent one provider identity linking twice.
- [ ] Require confirmation before unlinking identities.
- [ ] Prevent removal of the last login method.
- [ ] Show linked identities in account settings.

## Passkeys and WebAuthn

- [ ] Support optional WebAuthn credentials.
- [ ] Let users register multiple passkeys.
- [ ] Store credential IDs and public key material.
- [ ] Store authenticator counters where applicable.
- [ ] Verify relying party ID.
- [ ] Verify origin.
- [ ] Verify challenge freshness.
- [ ] Prevent challenge replay.
- [ ] Allow users to label passkeys.
- [ ] Allow users to revoke lost passkeys.

## Two-Factor Authentication

- [ ] Support optional TOTP.
- [ ] Generate one-time recovery codes.
- [ ] Hash stored recovery codes.
- [ ] Consume recovery codes after use.
- [ ] Allow WebAuthn as a strong second factor.
- [ ] Require reauthentication to disable 2FA.
- [ ] Add a recovery path for lost authenticators.

## Sessions

- [ ] Use secure server-side sessions for the website.
- [ ] Rotate session IDs after authentication.
- [ ] Mark auth cookies Secure.
- [ ] Mark auth cookies HttpOnly.
- [ ] Set an appropriate SameSite policy.
- [ ] Expire idle sessions.
- [ ] Allow users to revoke other sessions.
- [ ] Record basic session security metadata.
