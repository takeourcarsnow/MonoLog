## Android APK Packaging Guide

This project can be distributed on Android in two lightweight ways without rewriting the app:

1. Trusted Web Activity (TWA) via Bubblewrap (best for production PWA feel)
2. Capacitor WebView wrapper (simple webview container)

Both approaches rely on this site being a Progressive Web App (PWA). A manifest (`/manifest.webmanifest`) and a minimal service worker (`/sw.js`) have been added.

---
### 0. Prerequisites Checklist

- Deployed site is served over HTTPS (mandatory for TWA & service worker)
- `manifest.webmanifest` loads (visit `/manifest.webmanifest`)
- `sw.js` registers in production build (check DevTools > Application > Service Workers)
- Icons: replace the current placeholder `logo.svg` with proper maskable + 512px PNG icons for best install experience

Recommended icon files to add in `public/`:
- `icon-192.png`
- `icon-512.png`
- `icon-maskable-192.png`
- `icon-maskable-512.png`

Update `manifest.webmanifest` with those icons once created.

---
### 1. Option A: Trusted Web Activity (Bubblewrap)

TWA launches your PWA fullscreen using Chrome. It’s lightweight and keeps using your web code.

Install Bubblewrap CLI:
```
npm install -g @bubblewrap/cli
```

Initialize from your live manifest (replace domain):
```
bubblewrap init --manifest https://YOUR_DOMAIN/manifest.webmanifest
```
Answer prompts (package id e.g. `com.monolog.app`). A project folder is created.

Build the APK:
```
bubblewrap build
```
Artifacts (debug & release) appear under `./build/outputs/apk/`.

#### Digital Asset Links
To remove the URL bar and enable Play Integrity, host the generated `assetlinks.json` at:
```
public/.well-known/assetlinks.json
```
You already have a placeholder file. Replace:
`REPLACE_WITH_YOUR_SHA256_SIGNATURE_FINGERPRINT`
with the fingerprint of your signing key (see below).

Get fingerprint (Windows PowerShell example inside Bubblewrap project):
```
keytool -list -v -keystore .\android.keystore -alias android -storepass YOUR_STORE_PASS -keypass YOUR_KEY_PASS | Select-String SHA256:
```

Deploy updated site so Chrome can verify the relationship.

Install APK on device (USB debugging enabled):
```
adb install app-release-signed.apk
```

#### Updating
After site changes you usually do NOT need to rebuild unless manifest/package id changes. The PWA updates itself.

---
### 2. Option B: Capacitor Wrapper

Capacitor embeds a WebView pointing to your deployed site (or the locally bundled export if you can prerender). Since this Next.js app uses dynamic routes & server functions, prefer remote URL mode.

Add dependencies:
```
npm install @capacitor/core @capacitor/cli @capacitor/android
```

Create `capacitor.config.ts` in project root (example):
```ts
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.monolog.app',
  appName: 'MonoLog',
  webDir: '.next', // not really used in remote-server mode
  server: {
    url: 'https://YOUR_DOMAIN',
    cleartext: false
  },
  bundledWebRuntime: false
};
export default config;
```

Initialize & add Android platform:
```
npx cap init
npx cap add android
```

Open Android Studio:
```
npx cap open android
```

Build a release inside Android Studio (Build > Generate Signed Bundle / APK) or via Gradle:
```
cd android
./gradlew assembleRelease   # Windows PowerShell: .\gradlew.bat assembleRelease
```

APK Output: `android/app/build/outputs/apk/release/app-release.apk`.

#### Offline Support
Your PWA service worker will still run inside the WebView (if using a modern WebView / Chrome Custom Tabs). Limited offline reading of cached shell + images will work based on `sw.js` logic.

---
### 3. Generating Proper Icons

Use `pwa-asset-generator`:
```
npx pwa-asset-generator public/logo.svg public --background "#0f0f10" --favicon --maskable --padding 0
```
Then update `manifest.webmanifest` `icons` array accordingly.

---
### 4. Signing Keys (General)

Create a release keystore:
```
keytool -genkey -v -keystore monolog-release.keystore -alias monolog -keyalg RSA -keysize 2048 -validity 10000
```
Keep this file & passwords safe. Its fingerprint goes into `assetlinks.json` for TWA.

---
### 5. Distributing the APK

You can host the APK directly on your website:

1. Place `app-release.apk` file under `public/downloads/monolog-<version>.apk`.
2. Link to it: `<a href="/downloads/monolog-0.3.0.apk" download>Download Android App</a>`.
3. Optionally add integrity hash for user trust:
   - Generate hash: `Get-FileHash -Algorithm SHA256 .\public\downloads\monolog-0.3.0.apk` (PowerShell)
   - Display hash on download page.

Users must enable "Install unknown apps" for their browser to sideload.

---
### 6. Future Improvements
- Use Workbox for richer offline (post drafts, background sync)
- Add push notifications via FCM (requires additional service worker logic)
- Add proper maskable PNG icons
- Add a splash screen color / image for Android 12+ via generated resources (Bubblewrap can scaffold these automatically)

---
### 7. Quick Decision Guide
| Goal | Recommended |
|------|-------------|
| Fastest APK now | Bubblewrap (TWA) |
| Needs native plugins (camera beyond HTML, filesystem) | Capacitor |
| Best PWA UX / small size | TWA |

---
Need help automating any of these steps? Ask and we can add scripts.
