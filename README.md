# MonoLog

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

- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Storage)
- **State Management**: SWR for server state
- **Icons**: Lucide React
- **Image Processing**: Sharp for optimization
- **PWA**: Service Worker with offline support

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
│   ├── api/               # API routes
│   ├── components/        # React components
│   ├── styles/           # CSS stylesheets
│   └── globals.css       # Global styles
├── public/               # Static assets
├── scripts/              # Build and utility scripts
└── src/
    └── lib/              # Core utilities and types
```

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
2. Create a feature branch
3. Make your changes
4. Run performance checks: `npm run check-perf`
5. Test your changes: `npm test`
6. Submit a pull request

## 📄 License

This project is private and proprietary.

## 🙏 Acknowledgments

- Built with [Next.js](https://nextjs.org/)
- Styled with [Tailwind CSS](https://tailwindcss.com/)
- Icons by [Lucide](https://lucide.dev/)
- Backend powered by [Supabase](https://supabase.com/)

---

**MonoLog** — Your day in pictures.
