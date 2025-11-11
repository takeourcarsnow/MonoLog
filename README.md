# MonoLog v0.3.0

MonoLog — Your day in pictures.

A modern, performant daily photo journal built with Next.js. Create a single post each day, attach multiple images to show sequence and detail, follow friends, and slowly build a thoughtful visual archive.

![MonoLog](public/logo.svg)

## ✨ Features

- **Daily habit**: One post per day helps you focus on what matters and build a consistent archive.
- **Multiple Images**: Attach up to multiple images to each post with advanced editing (filters, cropping, rotation)
- **Social Features**: Follow users, favorite posts, leave comments, create communities and threads
- **Communities & Threads**: Join or create communities, participate in threaded discussions
- **Stories**: Share temporary stories with friends
- **Calendar View**: Browse your posts by date with an interactive calendar
- **Week Review**: Reflect on your week with summary views
- **Hashtags & Search**: Tag posts and search across content, users, and hashtags
- **Notifications**: Real-time notifications for social interactions
- **Spotify Integration**: Link songs to your posts via Spotify API
- **Offline Support**: Works offline with service worker caching
- **Progressive Web App**: Installable on mobile and desktop
- **Performance Optimized**: Fast loading with advanced optimizations, image compression, and lazy loading
- **Responsive Design**: Beautiful on all devices with adaptive layouts
- **Dark/Light Theme**: Automatic theme switching based on system preferences
- **Accessibility**: WCAG compliant with proper ARIA labels and keyboard navigation
- **Image Processing**: Client-side image editing with filters, cropping, and optimization using Sharp
- **Security**: Rate limiting, content moderation, secure authentication

## 🚀 Tech Stack

- **Framework**: Next.js 16.0.1 with App Router
- **Language**: TypeScript 5.9.3
- **UI Library**: React 19.2.0
- **Styling**: Tailwind CSS 4.1.16
- **Backend**: Supabase (PostgreSQL + Storage)
- **State Management**: SWR 2.3.6 for server state
- **Icons**: Lucide React 0.552.0
- **Image Processing**: Sharp 0.34.4 for optimization, EXIFR 7.1.3 for metadata
- **PWA**: Service Worker with Workbox
- **Testing**: Jest 30.2.0, Playwright 1.56.1
- **Linting**: ESLint 9.39.0 with TypeScript rules
- **Form Validation**: Zod 4.1.12
- **Carousel/Swiper**: Swiper 12.0.3 for touch interfaces
- **Inert Polyfill**: WICG Inert 3.1.3 for accessibility
- **Performance**: Web Vitals 5.1.0 for monitoring

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

# Analyze bundle with detailed report
npm run analyze-bundle
```

### Testing
```bash
# Run Jest tests
npm test

# Run automated tests
npm run test:auto

# Run cross-browser tests
npm run test:cross-browser

# Run device-specific tests
npm run test:devices

# Run edge case tests
npm run test:edge-cases
```

### Performance Checks
```bash
# Run performance verification
npm run check-perf

# Check bundle size
npm run check-bundle

# Check environment setup
npm run check-env
```

### Utility Scripts
```bash
# Migrate library folders
npm run migrate:lib

# Lint code
npm run lint

# Remove unused images
npm run remove-unused-images

# Generate icons
npm run generate-icons

# Convert images to WebP
npm run convert-posts-to-webp
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
- **Processing**: Client-side cropping, filters, rotation with Sharp optimization

### Posting Limits
- **Daily limit**: 1 post per user per day (keep it intentional — add as many photos as you need)
- **Images per post**: Multiple images supported
- **Stories**: Ephemeral content with 24-hour expiration

### Performance Optimizations
- SWC minification
- Image optimization with Next.js Image component
- Package import optimization
- CSS containment and viewport units
- React.memo for components
- Web Vitals monitoring
- Request deduplication
- Comment and slide state caching

### Environment Variables
- `NEXT_PUBLIC_MODE`: `local` or `supabase`
- `NEXT_PUBLIC_SUPABASE_URL`: Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY`: Supabase service role key

## 🗂️ Project Structure

```
├── app/                    # Next.js App Router
│   ├── api/               # API routes (auth, comments, communities, posts, etc.)
│   ├── components/        # React components (shared UI elements)
│   ├── [username]/        # Dynamic user profile pages
│   ├── about/             # About page
│   ├── achievements/      # User achievements page
│   ├── calendar/          # Calendar view for browsing posts
│   ├── communities/       # Communities and threads pages
│   ├── explore/           # Explore feed page
│   ├── favorites/         # User's favorite posts
│   ├── feed/              # Main social feed
│   ├── hashtags/          # Hashtag search and browsing
│   ├── notifications/     # Notifications page
│   ├── offline/           # Offline fallback page
│   ├── post/              # Individual post pages
│   ├── profile/           # User profile management
│   ├── reset-password/    # Password reset flow
│   ├── search/            # Global search page
│   ├── spotify/           # Spotify integration pages
│   ├── styles/            # Additional CSS stylesheets
│   ├── upload/            # Image upload and editing
│   ├── vertical-demo/     # Demo pages
│   ├── week-review/       # Weekly reflection pages
│   ├── globals.css        # Global styles
│   ├── layout.tsx         # Root layout component
│   ├── manifest.ts        # Web app manifest
│   ├── not-found.tsx      # 404 page
│   ├── page.tsx           # Home page
│   └── sitemap.ts         # Sitemap generation
├── docs/                  # Documentation files
├── lib/                   # Core utilities, types, and configurations
├── public/                # Static assets (images, icons, service worker)
├── scripts/               # Build, test, and utility scripts
├── __tests__/             # Test files
├── eslint.config.js       # ESLint configuration
├── next.config.mjs        # Next.js configuration
├── package.json           # Dependencies and scripts
├── postcss.config.cjs     # PostCSS configuration
├── tailwind.config.ts     # Tailwind CSS configuration
├── tsconfig.json          # TypeScript configuration
└── README.md              # This file
```

## 🏗️ Architecture Highlights

### Core Components
- **AppShell**: Main navigation component using Swiper for touch-friendly interface
- **ImageZoom**: Advanced image viewing with pinch-to-zoom, pan, and double-tap
- **CalendarView**: Interactive calendar for browsing posts by date
- **CommunitiesView**: Social features for user communities and threads
- **FeedView**: Main feed with infinite scrolling and post interactions
- **PostCard**: Reusable post display component with image gallery
- **Uploader**: Image upload with editing capabilities (crop, filter, rotate)
- **NavBar**: Bottom navigation with swipe gestures

### Key Features Implementation
- **PWA Support**: Service worker for offline functionality, install prompts, background sync
- **Image Processing**: Client-side image editing with filters, cropping, rotation, and optimization
- **Spotify Integration**: Link songs to posts via Spotify Web API with token management
- **Real-time Notifications**: WebSocket-based notifications for social interactions
- **Advanced Search**: Full-text search across posts, users, hashtags, and communities
- **Communities & Threads**: Nested discussion threads with replies and mentions
- **Stories**: Ephemeral content sharing with automatic expiration
- **Week Review**: Automated weekly summaries and reflections
- **Security**: Rate limiting, content moderation, secure token handling, input validation with Zod

### API Routes
- **Authentication**: Sign up, sign in, password reset, session management
- **Posts**: CRUD operations, favorites, hashtags, explore feed, image uploads
- **Users**: Profiles, following/followers, avatar management, achievements
- **Communities**: Creation, joining, thread discussions, moderation
- **Comments & Threads**: Nested discussions, replies, mentions, notifications
- **Stories**: Creation, viewing, expiration handling
- **Storage**: Image upload, optimization, cleanup utilities
- **Spotify**: Metadata fetching, token refresh, track linking
- **Notifications**: Real-time updates, push notifications
- **Search**: Global search across all content types
- **Reports**: Content moderation and reporting system

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

## 📚 Documentation

For detailed guides and documentation, see the `docs/` folder:

- [API Guide](docs/API_GUIDE.md) - Comprehensive API documentation
- [Backup Guide](docs/BACKUP_GUIDE.md) - Data backup and restoration
- [Camera Effects](docs/CAMERA_EFFECTS.md) - Image processing and effects
- [Edge Case Testing](docs/EDGE_CASE_TESTING.md) - Testing edge cases
- [Migration Library](docs/MIGRATION_LIB.md) - Database migrations
- [Roadmap](docs/ROADMAP.md) - Future development plans

## 🙏 Acknowledgments

- Built with [Next.js](https://nextjs.org/)
- Styled with [Tailwind CSS](https://tailwindcss.com/)
- Icons by [Lucide](https://lucide.dev/)
- Backend powered by [Supabase](https://supabase.com/)

---

**MonoLog** — Your day in pictures.
