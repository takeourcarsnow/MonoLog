## MonoLog Trusted Web Activity (Option A) Quick Guide

This guide focuses purely on generating and updating an Android APK using a Trusted Web Activity (TWA) with Bubblewrap.

You already have:
- `manifest.webmanifest` with start_url `/`
- `sw.js` (basic offline shell + image cache)
- Placeholder `public/.well-known/assetlinks.json`

### 1. Install Dependencies
Bubblewrap CLI has been added as a dev dependency. Install:
```
npm install
```

### 2. Pick Your Production Domain
Decide the final HTTPS origin (e.g. `https://monolog.app`). Update:
1. `package.json` script `twa:init` (replace `YOUR_DOMAIN`).
2. Any hard-coded references to `example.com` in metadata.

### 3. Initialize Bubblewrap Project
Run (first time only):
```
npm run twa:init
```
Answer prompts:
- Application Name: MonoLog
- Package ID: com.monolog.app (or reverse-DNS you prefer)
- Launch URL: (auto from manifest)
- Signing Key: Let Bubblewrap create one OR supply existing

This creates an `android/` (or named) folder outside your web `public/` assets.

### 4. Generate / Confirm Signing Key
If you let Bubblewrap create one, it will produce `android.keystore`. Keep it safe.
If you need to generate manually:
```
keytool -genkey -v -keystore android.keystore -alias monolog -keyalg RSA -keysize 2048 -validity 10000
```

### 5. Get SHA-256 Fingerprint
```
keytool -list -v -keystore .\android.keystore -alias monolog | Select-String SHA256:
```
Copy the hex fingerprint (no spaces) and replace the placeholder in `public/.well-known/assetlinks.json`.
Deploy the site so the file is accessible at:
```
https://YOUR_DOMAIN/.well-known/assetlinks.json
```

### 6. Build Debug APK
```
npm run twa:build
```
Outputs appear under the Bubblewrap project (e.g. `./build/outputs/apk/debug/`).

### 7. Build Signed Release APK
Ensure `android.keystore` and alias match the script parameters, then:
```
npm run twa:build:release
```
Result: `./build/outputs/apk/release/app-release-signed.apk`.

### 8. Test on Device
Enable USB debugging; then:
```
adb install -r build/outputs/apk/release/app-release-signed.apk
```
Open MonoLog. If URL bar is visible or shows a splash fallback, asset links may not be verified yet (Chrome cache can delay). Use Chrome DevTools `chrome://digital-asset-links` or simply wait a few minutes, then relaunch.

### 9. Hosting the APK
Copy the release APK into `public/downloads/monolog-<version>.apk` and ensure `/download` page link is updated.

### 10. Updating After Web Changes
If only web content changes (no manifest start_url / appId change):
1. Deploy web updates.
2. Users automatically get updates (PWA).
No APK rebuild needed unless: icons, name, package id, signing, or manifest structure changed.

When manifest changes:
```
npm run twa:update
npm run twa:build:release
```

### 11. Play Store (Later)
To publish later, you already have nearly everything. Ensure:
- High-res icon 512x512 PNG (in Bubblewrap project)
- Feature graphic
- Privacy policy URL
- Data safety form

### 12. Troubleshooting
| Issue | Cause | Fix |
|-------|-------|-----|
| White screen on launch | Network offline + insufficient precache | Enhance `sw.js` precache list or add offline page |
| URL bar visible | Asset links not verified | Correct fingerprint, redeploy, relaunch after a few mins |
| `sw.js` not installing | Wrong scope or 404 | Check `https://YOUR_DOMAIN/sw.js` status 200 |
| App shows outdated UI | Service worker cached older bundle | Use DevTools Application > Clear storage, or implement versioned cache purge |

### 13. Optional Enhancements
- Add push notifications (needs FCM + updated `sw.js` with `push` listener)
- Add offline draft post queue (background sync)
- Use Workbox to manage caching strategies declaratively

---
If you want, we can script fingerprint extraction and assetlinks update automatically—just ask.
