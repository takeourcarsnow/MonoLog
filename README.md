# MonoLog v0.3.0

MonoLog — Your day in pictures.

A modern, performant daily photo journal built with Next.js. Create a single post each day, attach multiple images to show sequence and detail, follow friends, and slowly build a thoughtful visual archive.

![MonoLog](public/logo.svg)

## ✨ Features

- **Daily habit**: One post per day helps you focus on what matters and build a consistent archive.
- **Multiple Images**: Attach up to multiple images to each post
- **Social Features**: Follow users, favorite posts, leave comments
- **Progressive Web App**: Installable, works offline with service worker
- **Performance Optimized**: Fast loading with advanced optimizations
- **Responsive Design**: Beautiful on all devices
- **Dark/Light Theme**: Automatic theme switching
- **Spotify Integration**: Link songs to your posts
- **Accessibility**: WCAG compliant with proper ARIA labels

## 🚀 Tech Stack

- **Framework**: Next.js 16.0.1 with App Router
- **Language**: TypeScript 5.9.3
- **UI Library**: React 19.2.0
- **Styling**: Tailwind CSS 4.1.16
- **Backend**: Supabase (PostgreSQL + Storage)
- **State Management**: SWR 2.3.6 for server state
- **Icons**: Lucide React 0.552.0
- **Image Processing**: Sharp 0.34.4 for optimization
- **PWA**: Service Worker with Workbox
- **Testing**: Jest 30.2.0, Playwright 1.56.1
- **Linting**: ESLint 9.39.0 with TypeScript rules

## 📦 Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/takeourcarsnow/MonoLog.git
   cd MonoLog
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**

   Copy `.env.example` to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```

   For local development (default):
   ```env
   NEXT_PUBLIC_MODE=local
   ```

   For Supabase deployment:
   ```env
   NEXT_PUBLIC_MODE=supabase
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   ```

4. **Run the development server**
   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000) in your browser.

## 🏗️ Build & Deployment

### Development
```bash
# Start dev server
npm run dev

# Start dev server with Turbo (faster builds)
npm run dev:turbo
```

### Production Build
```bash
# Build for production
npm run build

# Start production server
npm start

# Analyze bundle size
npm run analyze
```

### Performance Checks
```bash
# Run performance verification
npm run check-perf
```

### Deployment

MonoLog is optimized for deployment on Vercel, the platform built by the creators of Next.js.

1. **Connect your repository** to Vercel
2. **Set environment variables** in Vercel dashboard:
   - `NEXT_PUBLIC_MODE=supabase`
   - `NEXT_PUBLIC_SUPABASE_URL=your_supabase_url`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key`
   - `SUPABASE_SERVICE_ROLE_KEY=your_service_role_key`
3. **Deploy** - Vercel will automatically build and deploy your app

For other platforms, ensure they support Next.js 16+ with Node.js runtime.

## 📱 Progressive Web App

MonoLog is a fully-featured PWA that can be installed on mobile devices and desktops. Key PWA features:

- **Service Worker**: Caches assets for offline use
- **Web App Manifest**: Proper app metadata and icons
- **Install Prompt**: Automatic installation prompts
- **Background Sync**: Posts sync when connection is restored

## 🎨 Design System

- **Typography**: Patrick Hand font for a personal touch
- **Color Scheme**: Adaptive light/dark themes
- **Components**: Modular, reusable component architecture
- **Animations**: Smooth transitions and micro-interactions

## 🔧 Configuration

### Image Settings
- **Max file size**: 8MB per image
- **Max dimension**: 1600px (auto-resized)
- **Formats**: WebP, AVIF, JPEG, PNG support

### Posting Limits
- **Daily limit**: 1 post per user per day (keep it intentional — add as many photos as you need)
- **Images per post**: Multiple images supported

### Performance Optimizations
- SWC minification
- Image optimization with Next.js
- Package import optimization
- CSS containment
- React.memo for components
- Web Vitals monitoring

## 🗂️ Project Structure

```
├── app/                    # Next.js App Router
│   ├── api/               # API routes (auth, comments, communities, etc.)
│   ├── components/        # React components
│   ├── [username]/        # Dynamic user pages
│   ├── about/             # About page
│   ├── calendar/          # Calendar view
│   ├── communities/       # Communities pages
│   ├── explore/           # Explore page
│   ├── favorites/         # Favorites page
│   ├── feed/              # Feed page
│   ├── hashtags/          # Hashtags page
│   ├── offline/           # Offline page
│   ├── post/              # Post pages
│   ├── profile/           # Profile pages
│   ├── reset-password/    # Password reset
│   ├── search/            # Search page
│   ├── styles/            # CSS stylesheets
│   ├── upload/            # Upload page
│   ├── week-review/       # Week review page
│   ├── globals.css        # Global styles
│   ├── layout.tsx         # Root layout
│   ├── page.tsx           # Home page
│   └── ...
├── lib/                   # Core utilities and types
├── public/                # Static assets
├── scripts/               # Build and utility scripts
└── src/
    └── lib/               # Additional utilities
```

## 🏗️ Architecture Highlights

### Core Components
- **AppShell**: Main navigation component using Swiper for touch-friendly interface
- **ImageZoom**: Advanced image viewing with pinch-to-zoom, pan, and double-tap
- **CalendarView**: Interactive calendar for browsing posts by date
- **CommunitiesView**: Social features for user communities and threads
- **FeedView**: Main feed with infinite scrolling and post interactions

### Key Features Implementation
- **PWA Support**: Service worker for offline functionality, install prompts
- **Image Processing**: Client-side image editing with filters, cropping, and optimization
- **Spotify Integration**: Link songs to posts via Spotify API
- **Real-time Notifications**: WebSocket-based notifications for social interactions
- **Advanced Search**: Full-text search across posts, users, and hashtags
- **Security**: Rate limiting, content moderation, secure token handling

### API Routes
- **Authentication**: Sign up, sign in, password reset
- **Posts**: CRUD operations, favorites, hashtags, explore feed
- **Users**: Profiles, following/followers, avatar management
- **Communities**: Creation, joining, thread discussions
- **Comments & Threads**: Nested discussions and replies
- **Storage**: Image upload and optimization
- **Spotify**: Metadata fetching and token management

## 🧪 Testing

```bash
npm test
```

## 📊 Performance Monitoring

The app includes comprehensive performance monitoring:

- **Web Vitals**: Core Web Vitals tracking
- **Bundle Analysis**: Bundle size monitoring
- **Performance Score**: Automated performance checks
- **Image Optimization**: Automatic image compression

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Run performance checks: `npm run check-perf`
5. Run tests: `npm test`
6. Run linting: `npm run lint`
7. Commit your changes (`git commit -m 'Add some amazing feature'`)
8. Push to the branch (`git push origin feature/amazing-feature`)
9. Submit a pull request

## 🐛 Troubleshooting

### Build Issues
- Ensure Node.js version is 18+ and npm is up to date
- Clear `.next` cache: `rm -rf .next`
- Reinstall dependencies: `rm -rf node_modules && npm install`

### Common Warnings
The build may show React Hook dependency warnings. These are typically safe to ignore as they relate to complex state management in image handling components, but ensure hooks are used correctly.

### Performance
If performance checks fail, review:
- Bundle size with `npm run analyze`
- Image optimizations
- Unused imports and code

### Environment
- For local development, ensure `.env.local` exists with `NEXT_PUBLIC_MODE=local`
- For production, set Supabase environment variables correctly

### Known Issues
- Search results may not show accurate comment counts (optimization pending)
- Some React Hook warnings in development (safe to ignore, related to image zoom complexity)

### Viewport sizing (mobile)

As of Nov 2025 the app uses CSS dynamic viewport units (dvh) instead of JavaScript to track the visible viewport height. A single CSS custom property is defined in `app/styles/global.css`:

```
:root { --viewport-height: 1dvh; }
```

Existing styles keep using `var(--viewport-height)` so no runtime listeners are required. The `<meta name="viewport">` in `app/layout.tsx` specifies `viewport-fit=cover` for proper safe-area insets. If you encounter clipping after a pinch-zoom + refresh on very old iOS Safari versions that lack `dvh`, please update iOS; older browsers are not officially supported.

## 📄 License

This project is private and proprietary.

## 🙏 Acknowledgments

- Built with [Next.js](https://nextjs.org/)
- Styled with [Tailwind CSS](https://tailwindcss.com/)
- Icons by [Lucide](https://lucide.dev/)
- Backend powered by [Supabase](https://supabase.com/)

---

**MonoLog** — Your day in pictures.
