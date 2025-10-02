# PWA Installation Setup for MonoLog

This project is now configured as a **Progressive Web App (PWA)**, allowing users on Android (and other platforms) to install it directly from their browser without building an APK.

## What's Been Set Up

### ✅ Files Created/Modified:

1. **`app/manifest.ts`** - Web App Manifest that tells browsers how to install the app
2. **`src/components/InstallPrompt.tsx`** - Custom install prompt component
3. **`public/icon-192.png`** & **`public/icon-512.png`** - App icons for installation
4. **`app/layout.tsx`** - Updated with PWA metadata
5. **`src/components/AppShell.tsx`** - Added InstallPrompt component

## How It Works

### For Android Users:
1. Visit your website in **Chrome** or **Edge** browser
2. After ~3 seconds, a prompt will appear at the bottom: **"Install MonoLog"**
3. User taps **"Install"**
4. The app icon is added to their home screen
5. Opening it launches in full-screen mode (no browser UI)

### Browser Support:
- ✅ **Android Chrome/Edge** - Full support with install prompt
- ✅ **Samsung Internet** - Full support
- ⚠️ **iOS Safari** - Partial support (manual "Add to Home Screen" from share menu)
- ⚠️ **Desktop Chrome/Edge** - Shows install button in address bar

## Testing Locally

1. Start your dev server:
   ```bash
   npm run dev
   ```

2. On Android device:
   - Connect to same WiFi as your computer
   - Visit `http://[YOUR-IP]:3000` (find your IP with `ipconfig`)
   - Wait for install prompt to appear

3. Or use Chrome DevTools:
   - Open DevTools → Application tab
   - Click "Manifest" to verify manifest is loaded
   - Click "Service Workers" (optional - for offline support)

## What Users Get

- 📱 **App-like experience** - Full screen, no browser UI
- 🏠 **Home screen icon** - Easy access like a native app
- 🎨 **Custom theme** - Uses your app colors
- ⚡ **Fast loading** - Can be cached for offline use (if you add a service worker)
- 🔔 **Future: Push notifications** - Can be added later

## When Prompt Appears

The install prompt will show:
- ✅ After 3 seconds of visiting the site
- ✅ Only on supported browsers (Chrome, Edge, Samsung Internet)
- ✅ Only if not already installed
- ❌ Won't show if user dismissed it before (stored in localStorage)

## Customization

### Change When Prompt Appears
Edit `src/components/InstallPrompt.tsx`, line with `setTimeout`:
```typescript
setTimeout(() => setShowPrompt(true), 3000); // Change 3000 to different milliseconds
```

### Change App Colors
Edit `app/manifest.ts`:
```typescript
background_color: '#0f0f10',  // App background
theme_color: '#0f0f10',        // Status bar color
```

### Update App Name
Edit `app/manifest.ts`:
```typescript
name: 'Your Full App Name',
short_name: 'ShortName',  // Used on home screen
```

## Deploy to Production

1. Deploy to Vercel/Netlify/your host as usual
2. Ensure HTTPS is enabled (required for PWA)
3. Share your URL - users can install directly from browser!

## No APK Required! 🎉

Unlike traditional Android apps:
- ❌ No Google Play Store submission
- ❌ No APK building/signing
- ❌ No Android Studio setup
- ✅ Just deploy your website!
- ✅ Users install from browser
- ✅ Updates automatically when you deploy

## Next Steps (Optional)

Want to make it even better?

1. **Add Service Worker** for offline support
   - Install `next-pwa` package
   - Cache assets for offline use

2. **Add Push Notifications**
   - Requires service worker
   - Use Web Push API

3. **Add App Shortcuts**
   - Quick actions from home screen icon
   - Add to manifest.ts

4. **Test on Real Device**
   - Deploy to production
   - Install on your Android phone
   - Test as if it's a real app!

## Troubleshooting

**Prompt not showing?**
- Check if already installed (uninstall from Chrome → Settings → Apps)
- Clear localStorage: `localStorage.removeItem('pwa-install-dismissed')`
- Check Chrome version (need 79+)
- Ensure HTTPS in production

**Icons not loading?**
- Check `/icon-192.png` and `/icon-512.png` exist in public folder
- Regenerate: `node scripts/generate-icons-sharp.js`

**Manifest errors?**
- Open DevTools → Console for errors
- Check DevTools → Application → Manifest

---

Made with ❤️ - Your website is now an installable app!
