---
layout: "@layouts/MarkdownLayout.astro"
title: "Reading Source Code to Find Vulnerabilities: A Bounty Hunter's Approach"
description: "How to audit source code efficiently in a bounty context - finding security-relevant patterns without reading every line."
date: "2026-04-07"
---

Professional code auditors get full repository access, paid hours, and architecture diagrams. Bug bounty hunters get a minified JavaScript bundle and a dream. The approach has to be different. You cannot read every line. You do not need to. Most vulnerabilities cluster around a small number of patterns, and the fastest path to a payout is knowing exactly what to grep for.

This is how I approach source code review in a bounty context, whether the code is sitting in a public GitHub repo, packed inside a JavaScript bundle, or pulled from a decompiled Android APK.

## Where the code comes from

Before you can read code, you need code. In bounty hunting, you rarely get it handed to you. Here are the places I actually find it.

### Public repositories

Many companies open-source parts of their stack. Check GitHub, GitLab, and Bitbucket for the organization name. Sometimes the main product is closed-source but internal tools, SDKs, or microservices are public. These often share authentication patterns, database schemas, or utility functions with the main app.

Use the [lookup tool](/lookup) to find repositories linked to a target quickly. Then look at the commit history. Recent commits fixing "security" or "auth" issues tell you where problems have been, and similar problems tend to recur nearby.

```bash
git log --all --oneline --grep="fix" | grep -i "auth\|token\|session\|bypass\|inject\|sanitiz"
```

Old commits matter. `git log -p` on sensitive files shows you what changed and what the code looked like before the fix. Reverted patches are gold.

### JavaScript bundles

Every web app ships its client-side code to your browser. Open DevTools, go to Sources, and you have it. The code is usually minified but not encrypted. Webpack, Vite, and similar bundlers produce source maps sometimes, and developers forget to disable them in production.

Check for source maps first:

```bash
curl -s https://target.com/assets/app.js | tail -1
# Look for: //# sourceMappingURL=app.js.map
```

If the source map exists, download it and extract the original source:

```bash
npm install -g source-map-explorer
# or just fetch the .map file directly and parse it
curl -s https://target.com/assets/app.js.map | jq '.sources'
```

Even without source maps, tools like [prettier](https://prettier.io/) make minified code readable enough. I use `js-beautify` for quick formatting:

```bash
js-beautify -f app.min.js -o app.js
```

### Mobile app decompilation

Android APKs are ZIP files containing Dalvik bytecode. Use [jadx](https://github.com/skylot/jadx) to decompile them back to readable Java:

```bash
jadx -d output/ target.apk
```

For iOS, the process is harder because apps are encrypted on device. But many apps ship frameworks and libraries that are not encrypted, and class dumps still reveal API structures.

The [mobile app security testing guide](/learn/mobile-app-security-testing-for-bounties) covers the full decompilation workflow. For code review purposes, you just need the decompiled output.

### Leaked or exposed source

`.git` directories exposed on web servers are more common than you would think. Tools like [git-dumper](https://github.com/arthaud/git-dumper) reconstruct full repositories from exposed `.git` folders:

```bash
git-dumper https://target.com/.git/ output/
```

Also check for `.env` files, `docker-compose.yml`, and other config files that sometimes get deployed accidentally. Your [recon methodology](/learn/bug-bounty-recon-methodology) should already be catching these.

## Grepping for gold

You cannot read an entire codebase. But you can search it intelligently. I keep a list of patterns that consistently lead to findings. Here are the ones I actually use.

### Hardcoded secrets

This is the easiest class of finding. Developers embed API keys, tokens, and passwords in source code constantly.

```bash
grep -rn "api_key\|apikey\|api_secret\|secret_key\|password\s*=" --include="*.js" --include="*.py" --include="*.java" .
grep -rn "AKIA[0-9A-Z]\{16\}" .  # AWS access key IDs
grep -rn "ghp_[a-zA-Z0-9]\{36\}" .  # GitHub personal access tokens
grep -rn "sk-[a-zA-Z0-9]\{48\}" .  # OpenAI API keys
grep -rn "eyJ[a-zA-Z0-9_-]*\.eyJ[a-zA-Z0-9_-]*\." .  # JWTs
```

Tools like [trufflehog](https://github.com/trufflesecurity/trufflehog) and [gitleaks](https://github.com/gitleaks/gitleaks) automate this across git history. They are worth running, but I still do manual greps because automated tools miss custom patterns specific to the target.

### SQL injection sinks

Look for string concatenation in database queries. The pattern varies by language but the idea is the same: user input being glued into a query string.

```bash
# Python
grep -rn "execute.*%s\|execute.*format\|execute.*f'" --include="*.py" .
grep -rn "cursor\.execute.*+" --include="*.py" .

# Java
grep -rn "createQuery.*+" --include="*.java" .
grep -rn "prepareStatement.*+" --include="*.java" .  # ironic, but it happens

# PHP
grep -rn "\$_GET\|\$_POST\|\$_REQUEST" --include="*.php" . | grep -i "query\|select\|insert\|update\|delete"

# Node.js
grep -rn "query.*+" --include="*.js" . | grep -v node_modules
```

The `+` operator in a database query context almost always means string concatenation with unsanitized input. Not every hit is exploitable, but every hit deserves five minutes of tracing.

### Command injection

Any place the application executes system commands with user-controlled input:

```bash
grep -rn "exec(\|system(\|popen(\|subprocess\|child_process\|Runtime.getRuntime" .
grep -rn "os\.system\|os\.popen\|subprocess\.call\|subprocess\.run\|subprocess\.Popen" --include="*.py" .
grep -rn "shell_exec\|passthru\|proc_open" --include="*.php" .
```

### Insecure deserialization

```bash
grep -rn "pickle\.loads\|yaml\.load\|yaml\.unsafe_load" --include="*.py" .
grep -rn "ObjectInputStream\|readObject\|readUnshared" --include="*.java" .
grep -rn "unserialize\|json_decode" --include="*.php" .
grep -rn "JSON\.parse" --include="*.js" .  # less risky alone, but check what happens after
```

### Authentication and authorization

These are where the money is. Look for patterns that suggest broken access controls:

```bash
grep -rn "isAdmin\|is_admin\|role.*=\|user\.role\|req\.user" .
grep -rn "@login_required\|@authenticated\|@requires_auth" --include="*.py" .
grep -rn "verify.*token\|jwt\.decode\|jwt\.verify" .
grep -rn "TODO\|FIXME\|HACK\|XXX\|TEMPORARY" . | grep -i "auth\|secur\|token\|session"
```

That last one is my favorite. Developers leave notes about security shortcuts they intend to fix later. They often do not fix them.

### Client-side secrets in JavaScript

In JavaScript bundles, I always search for:

```bash
grep -n "localStorage\|sessionStorage" app.js | grep -i "token\|key\|secret\|auth"
grep -n "Authorization.*Bearer" app.js
grep -n "x-api-key\|x-auth-token" app.js
grep -n "/api/v[0-9]\|/internal/\|/admin/" app.js  # hidden endpoints
```

Hidden API endpoints embedded in the client are a consistent source of findings. Developers build admin or internal features, protect them with client-side checks only, and ship the endpoint URLs in the bundle for anyone to read.

## Tracing user input from entry to sink

Grepping gives you candidate locations. The next step is tracing: follow data from where the user controls it (the source) to where it does something dangerous (the sink).

### Identify the entry points

In web apps, user input enters through:

- Request parameters (query strings, POST bodies, headers)
- File uploads
- WebSocket messages
- URL path segments
- Cookies

In the code, these show up as framework-specific patterns. For Express.js, it is `req.params`, `req.query`, `req.body`, `req.headers`. For Flask, it is `request.args`, `request.form`, `request.json`. For Spring, it is `@RequestParam`, `@PathVariable`, `@RequestBody`.

### Follow the data

Once you find an entry point, trace what happens to the input. Ask these questions at each step:

1. Is the input validated? If so, can the validation be bypassed?
2. Is the input sanitized or encoded? If so, is it the right encoding for the context where it ends up?
3. Does the input reach a dangerous function (database query, OS command, HTML rendering, file path construction)?

Here is a concrete example. Say you find this in a Node.js app:

```javascript
app.get('/api/user/:id', async (req, res) => {
  const user = await db.query(`SELECT * FROM users WHERE id = ${req.params.id}`);
  res.json(user);
});
```

The trace is short: `req.params.id` goes directly into a SQL query with string interpolation. No validation, no parameterization. That is SQL injection. But real code is rarely this obvious. The input might pass through three helper functions, get stored in a variable with a different name, and reach the sink 200 lines later in a different file. This is where patience pays off.

### Trace backwards from sinks

Sometimes it is faster to start at the dangerous function and trace backwards. Find all calls to `db.query()`, then check whether any of them use unsanitized input. This reverse approach works well when the codebase is large and entry points are everywhere.

```bash
# Find all database query calls, then manually check each one
grep -rn "db\.query\|connection\.query\|pool\.query" --include="*.js" .
```

For each result, check: does the query use parameterized placeholders (`$1`, `?`), or does it use string concatenation/template literals? Parameterized queries are safe. Everything else needs a closer look.

## When static analysis tools help (and when they waste time)

I have a mixed relationship with static analysis tools. They are good at finding known patterns at scale. They are bad at understanding application logic.

### When to use them

[Semgrep](https://semgrep.dev/docs/) is the best option for bounty hunters. It is free, fast, and has community-maintained rules for common vulnerabilities. Run it early on any codebase you plan to spend more than an hour on:

```bash
semgrep --config=auto /path/to/source
```

The `--config=auto` flag pulls relevant rulesets based on the languages detected. For a more targeted scan:

```bash
semgrep --config=p/owasp-top-ten /path/to/source
semgrep --config=p/javascript /path/to/source
```

Semgrep excels at finding injection flaws, hardcoded secrets, and known-insecure API usage. It handles taint tracking across function calls, which saves you from doing that trace manually.

[CodeQL](https://codeql.github.com/) is more powerful but slower to set up. For targets with public GitHub repos, check if they already have CodeQL enabled - you can sometimes see the results in the Security tab.

### When to skip them

Do not run static analysis on minified JavaScript. The results will be garbage. Beautify first, or better yet, find the source maps.

Do not spend time configuring custom rules for a one-off target. The setup cost only pays off if you plan to test the same codebase repeatedly.

Do not trust the absence of findings. Static analysis misses logic bugs, broken access controls, and race conditions. The most valuable bounty findings, in my experience, come from understanding what the application is supposed to do and finding where it fails to enforce that. No tool catches "this admin endpoint is missing an authorization check" unless someone wrote a rule for that specific framework's auth pattern.

## Turning a code finding into a working exploit

Finding vulnerable code is half the work. You still need to prove it is exploitable. Programs pay for impact, not for theoretical risks.

### Confirm the code is reachable

Just because you found a SQL injection in the source does not mean you can reach it. The endpoint might be behind authentication you cannot bypass, or behind a WAF that blocks your payload. The vulnerable function might be dead code that is never called.

Map the route from the code to the network. Find the URL, the HTTP method, the required headers, and the expected input format. Then craft a request.

### Build a minimal proof of concept

Start with the simplest possible payload. For SQL injection, try something that causes a measurable difference:

```
# Time-based detection
/api/user/1' AND SLEEP(5)--
/api/user/1' AND pg_sleep(5)--

# Error-based detection
/api/user/1'
```

For XSS findings from code review, check whether the rendering context matches what you expect. If the code injects user input into an HTML attribute, your payload needs to break out of that attribute. Reading the code tells you exactly which payload structure will work, instead of guessing with a wordlist.

If you are new to XSS testing, the [XSS guide](/learn/finding-xss-vulnerabilities-in-bug-bounties) covers payload construction in detail. For API-specific issues, see the [API security testing guide](/learn/api-security-testing-for-bug-bounties).

### Document the chain

Your report should show: where the vulnerable code is, how user input reaches it, what the impact is, and a working proof of concept. Include the file path and line number from the source, the HTTP request that triggers it, and the response showing the vulnerability. Screenshots of the code alongside the working exploit make reports significantly more convincing.

The [report writing guide](/learn/writing-your-first-report) covers how to structure this for maximum impact.

### What if you cannot exploit it?

Sometimes you find code that is clearly wrong but you cannot trigger it externally. You have options. Some programs accept source code findings if the impact is clear. Others require a working PoC. Read the program policy before reporting.

If the code is in a public repo, check whether the deployed version matches. Companies do not always deploy from main. The vulnerable code might be in a branch that was never released, or it might have been patched in production without updating the repo.

## A practical workflow

Here is how I actually spend my time when I get access to a target's source code, whether it is a GitHub repo or a decompiled APK:

1. Run `trufflehog` or `gitleaks` on the git history. Five minutes, sometimes produces instant findings.
2. Run `semgrep --config=auto`. Review the high-confidence results. Ten minutes.
3. Grep for the patterns listed above, focusing on auth and injection. Twenty minutes.
4. Identify the main entry points (routes, API handlers, exported functions). Map them to URLs I can actually hit. Thirty minutes.
5. Pick the three most promising findings and try to exploit them. The rest of the time.

Most of my time goes to step 5. Steps 1 through 4 are about filtering, not finding. You are building a shortlist of things worth testing, then spending your real effort on exploitation and proof.

If the first three targets do not pan out, go back to step 3 with different patterns. Expand to business logic: look for price calculations, permission checks, rate limiters, anything where the code makes a decision you might be able to influence.

## External references

- [OWASP Code Review Guide](https://owasp.org/www-project-code-review-guide/) - comprehensive reference for code review methodology
- [Semgrep documentation](https://semgrep.dev/docs/) - rules, configuration, and custom pattern writing
- [PortSwigger Web Security Academy](https://portswigger.net/web-security) - interactive labs for practicing the vulnerability classes you find in code

Set up your [toolkit](/learn/bug-bounty-toolkit-setup) with the tools mentioned here before starting your first code review. Having everything installed and configured saves you from breaking your flow mid-audit.
