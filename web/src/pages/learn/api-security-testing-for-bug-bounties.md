---
layout: "@layouts/MarkdownLayout.astro"
title: "API Security Testing for Bug Bounties: A Practical Guide"
description: "How to find vulnerabilities in REST and GraphQL APIs during bounty hunting, from authentication flaws to business logic bugs that scanners miss."
date: "2026-04-07"
---

APIs are where the money is. Over 60% of data breaches in 2025 involved API exploitation, according to reports from Akamai and Salt Security. The reason is straightforward: companies expose more functionality through APIs than through their web interfaces, and API endpoints get less scrutiny from both developers and security teams.

I have found more high-severity bugs through API testing than any other approach. IDOR, broken authentication, mass assignment, privilege escalation - these all live in the API layer, and most of them are invisible to automated scanners. If you are only testing what you can see in the browser, you are ignoring the largest attack surface on most targets.

## Finding APIs to test

Before you can test an API, you need to know it exists. The web interface a company ships is a thin layer over a much larger set of endpoints. Your job is to find the ones they did not mean to expose.

### Traffic interception

Set up Burp Suite or Caido as a proxy and use the application normally. Click every button, fill out every form, visit every page. Watch the HTTP history fill up with API calls. This is the minimum. But do not stop at the browser.

Mobile apps are where undocumented APIs hide. Install the target's mobile app on a rooted Android device or an emulator, configure it to proxy through Burp, and walk through every feature. Mobile apps frequently call endpoints the web frontend does not use, and those endpoints often have weaker security controls.

To intercept HTTPS traffic from mobile apps that implement certificate pinning, use Frida with objection:

```bash
# Disable SSL pinning on Android
objection -g com.target.app explore -s "android sslpinning disable"
```

Once pinning is disabled, the app's traffic flows through your proxy like any other HTTP client.

### Documentation and specs

Check for API documentation that the company published intentionally or accidentally:

```
https://target.com/api/docs
https://target.com/swagger.json
https://target.com/openapi.json
https://target.com/api/v1/swagger-ui.html
https://target.com/graphql (with GraphiQL or Playground enabled)
https://target.com/api-docs
https://target.com/redoc
```

Also check the Wayback Machine. Companies sometimes remove API docs from production but forget that older versions are cached. Run your [recon](/learn/bug-bounty-recon-methodology) wordlists against the Wayback CDX API to find archived swagger files.

### JavaScript file analysis

Modern frontend apps bundle API calls into their JavaScript. Pull apart the JS files and extract every URL pattern:

```bash
# Download all JS files from a target
cat js-urls.txt | while read url; do curl -s "$url"; done > all-js.txt

# Extract API endpoints
grep -oP '["'"'"'](/api/[a-zA-Z0-9/_-]+)["'"'"']' all-js.txt | sort -u
```

Better yet, use LinkFinder or JSLuice to do this systematically. I often find entire endpoint groups - admin APIs, internal tooling APIs, debug endpoints - referenced in frontend code but never linked from the UI. These are prime targets because developers assume nobody will call them directly.

If you have your [toolkit set up properly](/learn/bug-bounty-toolkit-setup), these steps become routine.

## Authentication and authorization testing

Most API vulnerabilities I report fall into two categories: broken authentication and broken authorization. These are OWASP's [API1 and API2](https://owasp.org/API-Security/editions/2023/en/0x00-header/) for good reason.

### Token analysis

Grab a JWT from your authenticated session and decode it:

```bash
# Decode a JWT (base64 the header and payload)
echo "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoxMjM0LCJyb2xlIjoidXNlciIsImlhdCI6MTcxMjQ0ODAwMH0.signature" \
  | cut -d'.' -f2 | base64 -d 2>/dev/null
```

Output: `{"user_id":1234,"role":"user","iat":1712448000}`

Now test for common JWT weaknesses:

- Change `"alg": "HS256"` to `"alg": "none"` and remove the signature. Some libraries accept unsigned tokens.
- If the algorithm is RS256, try switching to HS256 and sign with the public key. This is the algorithm confusion attack.
- Check if the `user_id` or `role` claim is trusted without server-side validation. Change `"role": "user"` to `"role": "admin"` and see what happens.
- Test for weak signing secrets using tools like jwt_tool or hashcat against common wordlists.

### Broken object-level authorization (BOLA/IDOR)

This is the single most common API vulnerability. The pattern is simple: change an ID in a request and see if you get back someone else's data.

```http
GET /api/v1/users/1234/orders HTTP/1.1
Authorization: Bearer <your-token>
```

Change `1234` to `1235`. If you get another user's orders, that is BOLA. Test this on every endpoint that takes an identifier - user IDs, order IDs, document IDs, invoice numbers, anything.

Some tips that make IDOR hunting more productive:

- Create two accounts. Use account A's token to request account B's resources. This eliminates ambiguity about whether you are seeing your own cached data.
- Test both read and write operations. Sometimes GET is protected but PUT or DELETE is not.
- Look for sequential IDs. UUIDs are harder to enumerate but not immune - sometimes the UUID is leaked in another endpoint's response.
- Check for indirect references. An endpoint might not take a user ID directly but accept a resource ID that belongs to another user.

For a deeper treatment of IDOR testing, see the [IDOR and broken access control hunting guide](/learn/idor-and-broken-access-control-hunting).

### Broken function-level authorization

This is different from BOLA. Instead of accessing another user's resource, you are calling an endpoint you should not have access to at all.

```http
# Regular user endpoint
GET /api/v1/users/me HTTP/1.1
Authorization: Bearer <regular-user-token>

# Try the admin endpoint with the same token
GET /api/v1/admin/users HTTP/1.1
Authorization: Bearer <regular-user-token>
```

I find these by collecting all endpoints from JavaScript analysis and API documentation, then calling each one with a low-privilege token. Developers often protect the UI (hiding the admin button) but forget to enforce authorization on the API endpoint itself.

Also test HTTP method switching. An endpoint might block GET but allow POST, or vice versa:

```http
# GET returns 403
GET /api/v1/admin/config HTTP/1.1

# But PUT works fine
PUT /api/v1/admin/config HTTP/1.1
Content-Type: application/json

{"debug_mode": true}
```

## GraphQL-specific attack surface

GraphQL has become common enough that you will encounter it on many targets. It introduces a unique set of vulnerabilities that REST APIs do not have.

### Introspection

The first thing to try on any GraphQL endpoint is an [introspection query](https://graphql.org/learn/introspection/):

```graphql
{
  __schema {
    types {
      name
      fields {
        name
        type {
          name
        }
      }
    }
  }
}
```

Send this to the GraphQL endpoint (usually `/graphql` or `/api/graphql`):

```http
POST /graphql HTTP/1.1
Content-Type: application/json

{"query": "{ __schema { types { name fields { name type { name } } } } }"}
```

If introspection is enabled, you just got a complete map of every type, field, query, and mutation the API supports. This is like finding an unlocked swagger file but even more detailed. Pipe the result into a tool like GraphQL Voyager to visualize the schema.

Many targets disable introspection in production. Try these bypasses:

- Send the query as a GET request with the query in the URL parameter
- Use field suggestion errors: query a nonexistent field and see if the error message suggests valid field names
- Try introspection with a different `Content-Type` header
- Check if introspection is disabled for anonymous users but enabled for authenticated users

### Batching attacks

GraphQL supports sending multiple operations in a single request. This is useful for bypassing rate limits on operations like login:

```json
[
  {"query": "mutation { login(email: \"user@test.com\", password: \"password1\") { token } }"},
  {"query": "mutation { login(email: \"user@test.com\", password: \"password2\") { token } }"},
  {"query": "mutation { login(email: \"user@test.com\", password: \"password3\") { token } }"}
]
```

If the server accepts batched requests and does not rate-limit per operation within a batch, you can brute force credentials, OTPs, or any other value far faster than the rate limit would normally allow. I have bypassed 2FA on targets this way by batching 1000 OTP guesses in a single HTTP request.

You can also use query aliasing within a single query to achieve the same effect:

```graphql
mutation {
  a1: login(email: "user@test.com", password: "pass1") { token }
  a2: login(email: "user@test.com", password: "pass2") { token }
  a3: login(email: "user@test.com", password: "pass3") { token }
}
```

### Nested query denial of service

GraphQL schemas often have circular relationships. A `User` has `posts`, each `Post` has an `author` (a `User`), who has `posts`, and so on. You can exploit this to build queries that grow exponentially:

```graphql
{
  users {
    posts {
      author {
        posts {
          author {
            posts {
              author {
                name
              }
            }
          }
        }
      }
    }
  }
}
```

If the server does not enforce query depth limits or complexity analysis, this query can consume enormous CPU and memory. This is a denial of service vulnerability. Test it carefully - start with shallow nesting and increase gradually. You do not want to crash a production server.

### Authorization bypass through field access

GraphQL resolvers handle authorization per field. Developers sometimes protect the obvious paths but miss alternative ones. If a `User` type has a `role` field that is hidden from regular users, you might still access it through a related type:

```graphql
{
  posts {
    author {
      role
      email
      ssn
    }
  }
}
```

The `posts` query might be public, and the `author` resolver might not strip sensitive fields. I have extracted admin emails, internal user IDs, and even API keys this way by querying sensitive fields through indirect relationships.

For more on [GraphQL security testing, PortSwigger's guide](https://portswigger.net/web-security/graphql) is thorough.

## Business logic flaws

These are the bugs that make API testing worth the effort. Scanners cannot find them. They require understanding what the application is supposed to do and then finding the gap between the intended behavior and the actual behavior.

### Price and quantity manipulation

E-commerce and SaaS APIs often trust the client to send correct pricing data:

```http
POST /api/v1/orders HTTP/1.1
Content-Type: application/json
Authorization: Bearer <token>

{
  "items": [
    {"product_id": "abc123", "quantity": 1, "price": 0.01}
  ]
}
```

Change the price to 0.01. Change the quantity to -1 and see if you get a refund credit. Change the currency code if one is present. Apply the same coupon code twice. Apply a percentage discount to an item that was already discounted. These are all real bugs I have seen paid out.

### State machine abuse

Multi-step processes (checkout, account verification, password reset) follow an expected sequence. What happens when you skip a step?

```http
# Step 1: Request password reset (expected)
POST /api/v1/auth/reset-request
{"email": "victim@target.com"}

# Step 2: Verify OTP (expected, but skip it)
# POST /api/v1/auth/verify-otp

# Step 3: Set new password (go directly here)
POST /api/v1/auth/reset-password
{"email": "victim@target.com", "new_password": "hacked123"}
```

If the API does not validate that step 2 was completed before allowing step 3, you can reset anyone's password without knowing their OTP. I see this pattern in about one out of every ten targets I test.

### Race conditions

APIs that perform check-then-act operations are vulnerable to race conditions. The classic example is redeeming a gift card or coupon:

```python
import asyncio
import aiohttp

async def redeem(session):
    return await session.post(
        'https://target.com/api/v1/coupons/redeem',
        json={'code': 'DISCOUNT50'},
        headers={'Authorization': 'Bearer <token>'}
    )

async def main():
    async with aiohttp.ClientSession() as session:
        tasks = [redeem(session) for _ in range(20)]
        results = await asyncio.gather(*tasks)
        for r in results:
            print(r.status, await r.text())

asyncio.run(main())
```

Fire 20 concurrent requests to redeem the same single-use coupon. If the server checks "is this coupon used?" and then marks it as used in separate database operations without proper locking, multiple requests can succeed. This applies to any one-time action: voting, funds transfer, invitation acceptance, free trial activation.

## Mass assignment and parameter pollution

Mass assignment happens when an API binds request parameters directly to internal objects without filtering. The [REST Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/REST_Security_Cheat_Sheet.html) covers the defensive side, but here is how to find it.

### Finding mass assignment

When updating your profile, the API might accept:

```http
PUT /api/v1/users/me HTTP/1.1
Content-Type: application/json
Authorization: Bearer <token>

{"name": "Alice", "email": "alice@test.com"}
```

Now add fields the developer did not intend you to set:

```http
PUT /api/v1/users/me HTTP/1.1
Content-Type: application/json
Authorization: Bearer <token>

{
  "name": "Alice",
  "email": "alice@test.com",
  "role": "admin",
  "is_verified": true,
  "credit_balance": 99999,
  "subscription_tier": "enterprise"
}
```

How do you know which field names to try? Several sources:

- The GET response for the same resource often includes fields you cannot set. Try setting them.
- API documentation or introspection reveals the full object schema.
- Error messages sometimes leak field names ("unknown field: is_admin" tells you `is_admin` exists).
- Common patterns: `role`, `is_admin`, `admin`, `verified`, `active`, `balance`, `plan`, `permissions`.

### HTTP parameter pollution

When the same parameter is sent multiple times, different server frameworks handle it differently:

```http
# Express (Node.js) takes the last value
GET /api/search?role=user&role=admin

# PHP takes the last value
GET /api/search?role=user&role=admin

# Flask (Python) takes the first value
GET /api/search?role=user&role=admin

# ASP.NET joins them
GET /api/search?role=user&role=admin  -> role = "user,admin"
```

This behavior difference becomes exploitable when a WAF or API gateway parses parameters differently than the backend. The WAF might check the first `role` parameter (which is "user" and looks fine), while the backend uses the last one ("admin").

## Rate limit bypass patterns

Rate limiting on APIs is common but often implemented poorly. Here are the bypasses I try:

- Change the case of the endpoint: `/api/Login` vs `/api/login`
- Add a trailing slash: `/api/login/`
- Add URL parameters: `/api/login?foo=bar`
- Use HTTP method override headers: `X-HTTP-Method-Override: POST`
- Rotate IP headers the server might trust: `X-Forwarded-For`, `X-Real-IP`, `X-Originating-IP`, `True-Client-IP`
- Distribute across API versions: `/api/v1/login`, `/api/v2/login`
- Use unicode or encoding tricks in the path: `/api/log%69n`

For authenticated endpoints, try creating multiple accounts and distributing requests across them. If the rate limit is per-account rather than per-action, this defeats it.

## Putting it together

My workflow for API testing on a new target goes like this:

1. Proxy all web and [mobile app](/learn/mobile-app-security-testing-for-bounties) traffic to build an endpoint map.
2. Find API documentation, swagger files, and GraphQL introspection results.
3. Extract endpoints from JavaScript files.
4. Test every endpoint for [authentication issues](/learn/hunting-authentication-vulnerabilities) - can I call it without a token, with an expired token, with another user's token?
5. Test every endpoint that takes an ID for BOLA/IDOR using two test accounts.
6. Look for mass assignment by adding extra fields to every write operation.
7. For GraphQL targets, test batching, nested queries, and field-level authorization.
8. Map business logic flows and try skipping steps, manipulating values, and racing concurrent requests.

The bugs that pay the most in API testing are not the technical exploits. They are the logic flaws where the API does exactly what you ask it to, but nobody considered that someone would ask for that. A scanner will never find a race condition in a payment flow or a state machine bypass in a verification process. That is why manual API testing remains one of the most profitable approaches in bounty hunting.
