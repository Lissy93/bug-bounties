---
layout: "@layouts/MarkdownLayout.astro"
title: "Mobile App Security Testing for Bug Bounties"
description: "How to test iOS and Android apps in a bounty context - from setting up a proxy to finding hardcoded secrets and insecure data storage."
date: "2026-04-07"
---

Most bounty hunters avoid mobile targets. The setup is more involved, the tooling is less familiar, and there is an assumption that you need deep reverse engineering skills to find anything. That assumption is wrong. The majority of mobile bugs I have reported were found by intercepting HTTP traffic and reading decompiled source for hardcoded values. If you already test web apps, you have 80% of what you need.

Mobile scope is also significantly less competitive. On any given program, the web app might have dozens of active hunters poking at it while the iOS and Android apps get minimal attention. That is an opportunity.

This guide is written for web-focused hunters expanding into mobile. I will skip the academic stuff and focus on what actually finds bugs in bounty programs.

## Why mobile targets are worth your time

Programs that include mobile apps in scope tend to pay well for findings there. Mobile-specific bugs like insecure local storage or deep link hijacking are often rated higher severity than their web equivalents because they can lead to account takeover on a physical device. A hardcoded API key in a decompiled APK might be informational on its own, but if that key grants access to internal endpoints, you are looking at a high or critical payout.

The other reason is simple: fewer eyes on the target means more bugs left to find. I have found issues in mobile apps that had been live for years, untouched by other researchers.

## Setting up your mobile testing environment

You need three things: a device (or emulator), a proxy to intercept traffic, and a way to bypass certificate pinning. The setup takes an afternoon the first time. After that it is routine.

### Proxy configuration

You are probably already using Burp Suite. Good. The same instance works for mobile traffic. You just need to route your device's traffic through it.

On Android (emulator or physical device):

1. Find your computer's local IP address (not localhost).
2. On the device, go to Wi-Fi settings, long-press your network, modify it, and set the proxy to your computer's IP on port 8080.
3. Open the device browser and navigate to `http://burpsuite` to download the CA certificate.
4. Install the certificate. On Android 7+, user-installed certificates are not trusted by default for app traffic. You need to either use an Android 6 emulator, or modify the app's network security config, or use a rooted device.

For a quick start, I recommend an Android 11 emulator with root access via [Android Studio](https://developer.android.com/studio):

```bash
sdkmanager "system-images;android-30;google_apis;x86_64"
avdmanager create avd -n bounty -k "system-images;android-30;google_apis;x86_64"
emulator -avd bounty -writable-system
```

The `-writable-system` flag lets you push the Burp CA to the system certificate store so all apps trust it:

```bash
# Convert Burp cert to the right format
openssl x509 -inform DER -in burp-cert.der -out burp-cert.pem
hash=$(openssl x509 -inform PEM -subject_hash_old -in burp-cert.pem | head -1)
cp burp-cert.pem "$hash.0"

# Push to system store
adb root
adb remount
adb push "$hash.0" /system/etc/security/cacerts/
adb shell chmod 644 /system/etc/security/cacerts/"$hash.0"
adb reboot
```

On iOS, the process is simpler if you have a jailbroken device. Install the Burp CA profile through Safari, then trust it in Settings > General > About > Certificate Trust Settings. For certificate pinning bypass, install SSL Kill Switch 2 via Cydia.

If you do not have a jailbroken iOS device, you can still intercept traffic from many apps. Not all of them pin certificates.

### Certificate pinning bypass with Frida

Many apps implement certificate pinning, which means they reject your Burp CA even if it is in the system store. [Frida](https://frida.re/docs/home/) is the standard tool for bypassing this at runtime.

Install Frida on your host machine:

```bash
pip install frida-tools
```

Push the Frida server to your Android device:

```bash
# Download the right version for your architecture
wget https://github.com/frida/frida/releases/download/16.6.1/frida-server-16.6.1-android-x86_64.xz
unxz frida-server-16.6.1-android-x86_64.xz

adb push frida-server-16.6.1-android-x86_64 /data/local/tmp/frida-server
adb shell chmod 755 /data/local/tmp/frida-server
adb shell /data/local/tmp/frida-server &
```

Now use the universal SSL pinning bypass script:

```bash
frida -U -f com.target.app -l universal-ssl-pinning-bypass.js --no-pause
```

You can find well-maintained bypass scripts in the [Frida CodeShare](https://codeshare.frida.re/). The one by httptoolkit covers most common pinning implementations including OkHttp, TrustManager, and NSURLSession on iOS.

Once pinning is bypassed, the app's traffic flows through Burp just like a web app. From here, your existing web testing skills apply directly.

## Static analysis: pulling apart the app binary

Before you even run the app, there is value in looking at its source. Android apps are particularly easy to decompile. iOS apps require more effort but are still workable.

### Decompiling Android APKs

Grab the APK from the device or from a mirror site:

```bash
# From device
adb shell pm path com.target.app
adb pull /data/app/com.target.app-1/base.apk

# Or use apkeep to download from the Play Store directly
pip install apkeep
apkeep -a com.target.app .
```

Decompile with [jadx](https://github.com/skylot/jadx), which produces readable Java source:

```bash
jadx -d output/ base.apk
```

Now search the decompiled source for interesting strings:

```bash
grep -rn "api_key\|secret\|password\|token\|https://.*internal" output/sources/
```

I have found production API keys, Firebase secrets, and hardcoded admin credentials this way. It sounds too simple, but developers routinely ship secrets in mobile apps because they assume the binary is opaque. It is not.

[MobSF](https://github.com/MobSF/Mobile-Security-Framework-MobSF) automates much of this static analysis. Run it locally with Docker:

```bash
docker run -it --rm -p 8000:8000 opensecurity/mobile-security-framework-mobsf
```

Upload the APK and MobSF will flag hardcoded secrets, insecure configurations, exported activities, and more. It is not a replacement for manual review, but it catches things grep misses - like base64-encoded keys or secrets split across multiple strings.

### iOS IPA analysis

If you have a jailbroken device, pull the decrypted IPA with frida-ios-dump:

```bash
python dump.py com.target.app
```

For static analysis without a device, you can sometimes find IPAs on third-party sites, though these may be outdated. Once you have the IPA, unzip it and look at the binary and plist files:

```bash
unzip target.ipa -d extracted/
strings extracted/Payload/Target.app/Target | grep -i "api\|key\|secret\|http"
plutil -p extracted/Payload/Target.app/Info.plist
```

The `Info.plist` file often contains URL schemes, API endpoints, and configuration values that are useful for testing.

## Intercepting and modifying API traffic

This is where your web skills pay off directly. Mobile apps are frontends for APIs. The API calls they make are often less hardened than the web app's calls because developers assume the mobile client is trusted.

### What to look for in mobile API traffic

Fire up the app with your proxy running and use every feature. Log in, browse, edit your profile, make purchases, interact with other users. Watch the HTTP history in Burp.

Common patterns I look for:

- **User IDs in requests.** If the app sends `GET /api/v2/users/12345/orders`, change that ID. Mobile APIs have IDOR vulnerabilities at a higher rate than web APIs in my experience, because the mobile client often sends the user ID explicitly rather than relying on server-side session resolution.
- **Authorization tokens.** Capture the auth token from one account and replay requests with it against another user's resources. Mobile apps sometimes use long-lived tokens that are not properly scoped.
- **Version differences.** The mobile app might hit `/api/v2/` while the web app uses `/api/v3/`. Older API versions frequently lack security controls that were added later. Try downgrading version numbers in your intercepted requests.
- **Hidden endpoints.** Decompile the app and grep for API paths. You will often find endpoints the app no longer calls but that still work server-side. These forgotten endpoints are gold.

```bash
# Find API endpoints in decompiled Android source
grep -rn "\"\/api\|https://" output/sources/ | grep -v "\.png\|\.jpg\|\.svg"
```

For a deeper look at API testing techniques, see [API security testing for bug bounties](/learn/api-security-testing-for-bug-bounties).

### Modifying requests on the fly

In Burp, set up match-and-replace rules for things you want to test persistently. For example, if you want to test whether the app handles role escalation:

```
Type: Request header
Match: X-User-Role: standard
Replace: X-User-Role: admin
```

Or modify request bodies to inject unexpected values. Mobile apps rarely validate inputs client-side with the same rigor as web apps because developers rely on the compiled client as a trust boundary. It is not one.

## Common mobile-specific findings

Some vulnerability classes are unique to mobile or show up far more often there. These are worth checking on every mobile target.

### Insecure local data storage

Mobile apps store data on the device in ways that are often insecure. Check these locations on Android:

```bash
# Shared preferences (often contains tokens, user data)
adb shell cat /data/data/com.target.app/shared_prefs/*.xml

# SQLite databases
adb shell ls /data/data/com.target.app/databases/
adb pull /data/data/com.target.app/databases/app.db
sqlite3 app.db ".tables"
sqlite3 app.db "SELECT * FROM users;"

# Files directory
adb shell ls -la /data/data/com.target.app/files/
```

I have found session tokens, plaintext passwords, PII, and even full API responses cached in shared preferences. On a rooted or compromised device, this data is trivially accessible. Programs generally rate insecure storage as medium severity, sometimes high if sensitive financial or health data is involved.

On iOS, check the equivalent locations: NSUserDefaults plist files, CoreData SQLite databases, and the Keychain (though Keychain storage is generally considered acceptable).

### Deep link hijacking

Mobile apps register custom URL schemes like `targetapp://` and sometimes universal links. If the app does not properly validate deep link parameters, you can craft a link that performs actions on behalf of the user.

Check the Android manifest for exported activities and intent filters:

```bash
grep -A 5 "intent-filter" output/resources/AndroidManifest.xml | grep -B 2 "scheme"
```

And in the iOS Info.plist:

```bash
plutil -p Info.plist | grep -A 3 "CFBundleURLSchemes"
```

A typical attack: the app registers `targetapp://reset-password?token=` and an attacker can craft a malicious page that redirects to this URL scheme with a stolen token. Or the app handles `targetapp://open?url=https://evil.com` and loads an attacker-controlled page in a WebView. This leads directly into the next finding type.

### WebView vulnerabilities

Many mobile apps use WebViews to render content. A WebView is basically an embedded browser, and it carries all the same risks. If the app loads attacker-controllable URLs in a WebView with JavaScript enabled (the default on Android), you can potentially:

- Execute JavaScript in the context of the app's origin
- Access JavaScript bridge interfaces that expose native functionality
- Steal tokens or session data from the WebView's cookie jar

Look for `loadUrl()`, `evaluateJavascript()`, and `addJavascriptInterface()` in the decompiled source. The `addJavascriptInterface` call is particularly interesting because it exposes Java methods to JavaScript, and before Android 4.2 this was exploitable for remote code execution. Even on modern Android versions, a poorly implemented JavaScript interface can leak data or trigger privileged actions.

```bash
grep -rn "loadUrl\|WebView\|addJavascriptInterface\|setJavaScriptEnabled" output/sources/
```

If you find a WebView that loads URLs from deep link parameters or push notification data without sanitization, that is typically a high-severity finding.

### Exported components on Android

Android apps declare activities, services, broadcast receivers, and content providers in their manifest. If these are exported (accessible to other apps) and handle sensitive operations, that is a vulnerability.

```bash
# Find exported components
grep -B 1 'exported="true"' output/resources/AndroidManifest.xml
```

An exported activity that skips authentication checks can let a malicious app on the same device access protected functionality. An exported content provider might leak the app's database. These are less glamorous than RCE but they pay consistently.

## What mobile bugs pay

Payouts vary by program, but here are ranges I have seen and that other hunters have reported publicly:

| Finding type | Typical severity | Payout range |
|---|---|---|
| Hardcoded production API key (with access) | High | $500 - $5,000 |
| IDOR in mobile API | Medium - High | $500 - $3,000 |
| Insecure local storage of tokens/PII | Medium | $200 - $1,500 |
| Deep link hijacking leading to actions | Medium - High | $500 - $3,000 |
| WebView XSS / JavaScript bridge abuse | High | $1,000 - $5,000 |
| Certificate pinning bypass alone | Informational | Usually $0 |
| Exported component with auth bypass | Medium | $300 - $2,000 |

Note that certificate pinning bypass by itself is almost never accepted as a valid finding. It is a prerequisite for your testing, not a reportable bug. The same goes for "the app can be decompiled" or "the app runs on rooted devices." These are expected behaviors, not vulnerabilities.

Programs with mobile scope worth looking at include those from major tech companies on HackerOne and Bugcrowd, plus dedicated mobile-first companies like banking and fintech apps. Check [choosing your first bug bounty program](/learn/choosing-your-first-bug-bounty-program) for how to evaluate scope.

## A practical workflow for mobile testing

Here is how I approach a new mobile target, start to finish:

1. Download the APK/IPA and run static analysis with MobSF. Note any hardcoded secrets, interesting URLs, and exported components.
2. Decompile with jadx and grep for API endpoints, keys, and interesting strings.
3. Set up the proxy and certificate pinning bypass. Install the app on your test device.
4. Use every feature of the app while watching Burp. Map out the API surface.
5. Test API endpoints for IDORs, broken access control, and injection. Try version downgrading.
6. Check local storage for sensitive data after using the app.
7. Test deep links and WebViews identified during static analysis.
8. Check exported components on Android.

Steps 4 and 5 are where I spend the most time because they are where the highest-value bugs live. The API behind the mobile app is the same API behind the web app, but the mobile client might call it differently or expose endpoints the web client does not use.

## Resources

- [OWASP Mobile Application Security](https://mas.owasp.org/) - the definitive reference for mobile security testing methodology and verification standards
- [MobSF](https://github.com/MobSF/Mobile-Security-Framework-MobSF) - automated static and dynamic analysis
- [Frida documentation](https://frida.re/docs/home/) - runtime instrumentation for pinning bypass and beyond
- [Android security tips](https://developer.android.com/privacy-and-security/security-tips) - useful for understanding what the developer was supposed to do

For tooling setup beyond mobile-specific tools, see [bug bounty toolkit setup](/learn/bug-bounty-toolkit-setup). For reading decompiled source effectively, see [reading source code for vulnerabilities](/learn/reading-source-code-for-vulnerabilities).

## Where to go from here

If you have been testing web apps and feel comfortable with Burp, intercepting mobile traffic is a natural next step. The learning curve is in the setup, not the testing. Once traffic flows through your proxy, you already know what to do with it.

Start with Android. The tooling is more accessible, emulators are free, and you do not need a jailbroken device. Pick a program with an Android app in scope, decompile it, set up your proxy, and start looking at traffic. The first time you find an IDOR in a mobile API that dozens of web-focused hunters walked past, you will understand why this niche is worth the setup time.
