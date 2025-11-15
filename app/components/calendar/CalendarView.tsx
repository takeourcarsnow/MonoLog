"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { monthMatrix, toDateKey } from "@/lib/date";
import { api } from "@/lib/api";
import { PostCard } from "@/app/components/PostCard";
import { ViewToggle } from "@/app/components/ui/ViewToggle";
import { GridView } from "@/app/components/feed/GridView";
import { Calendar } from "lucide-react";
import type { HydratedPost } from "@/lib/types";
import { MiniSlideshow } from "@/app/components/media/MiniSlideshow";
import { getStats as cacheGetStats, setStats as cacheSetStats, getPosts as cacheGetPosts, setPosts as cacheSetPosts, anyImageLoaded as cacheAnyImageLoaded, markImageLoaded as cacheMarkImageLoaded } from "@/lib/cache/calendarCache";
import { useAuth } from "@/lib/hooks/useAuth";
import { CalendarDaySkeleton } from "./CalendarDaySkeleton";

const weekdays = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];

interface CalendarViewProps {
  // Whether the calendar view is currently the active app view. When false,
  // the calendar will avoid making network requests or loading images.
  isActive?: boolean;
}

export function CalendarView({ isActive = true }: CalendarViewProps) {
  const now = new Date();
  const [curYear, setYear] = useState(now.getFullYear());
  const [curMonth, setMonth] = useState(now.getMonth());
  const [stats, setStats] = useState<{ counts: Record<string, number>; mine: Set<string> }>({ counts: {}, mine: new Set() });
  const [loadingStats, setLoadingStats] = useState(false);
  const [dayPosts, setDayPosts] = useState<HydratedPost[] | null>(null);
  const [loadingDay, setLoadingDay] = useState(false);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const feedRef = useRef<HTMLDivElement>(null);
  const [shouldScroll, setShouldScroll] = useState(false);
  const [view, setView] = useState<"list" | "grid">((typeof window !== "undefined" && (localStorage.getItem("calendarView") as any)) || "list");
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [pendingView, setPendingView] = useState<"list" | "grid" | null>(null);
  const fadeRef = useRef<HTMLDivElement | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);
  const [dayPostsCache, setDayPostsCache] = useState<Record<string, HydratedPost[]>>({});
  // Only start loading data when the view has been active for a short time.
  // This prevents quick swipes through the calendar from triggering loads.
  const [shouldLoad, setShouldLoad] = useState<boolean>(false);
  const loadTimerRef = useRef<number | null>(null);

  const { me } = useAuth();

  // Load stats whenever the current month/year changes. Inline the async call
  // so we don't need to include the `loadStats` function in the dependency list.
  // Only load stats/posts when shouldLoad is true. This gate prevents
  // eager network requests when this component is merely mounted briefly
  // (for example, during a swipe across views).
  useEffect(() => {
    if (!shouldLoad) return;
    let cancelled = false;

    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    const cacheKey = `${curYear}-${curMonth}-${tz}`;

    (async () => {
      try {
        setLoadingStats(true);

        // Use cached stats if present
  const cachedStats = cacheGetStats(cacheKey);
        if (cachedStats) {
          setStats({ counts: cachedStats.counts, mine: new Set(cachedStats.mine) });
        } else {
          const s = await api.calendarStats({ year: curYear, monthIdx: curMonth, timeZone: tz });
          if (cancelled) return;
          setStats({ counts: s.counts, mine: new Set(s.mine) });
          // store in module cache
          cacheSetStats(cacheKey, { counts: s.counts, mine: s.mine });
        }

        // Fetch posts for all days with posts (but check module cache first)
        const statsObj = cacheGetStats(cacheKey) || { counts: {} };
        const daysWithPosts = Object.keys(statsObj.counts).filter(dk => (statsObj.counts[dk] || 0) > 0);
        if (daysWithPosts.length > 0) {
          const missing = daysWithPosts.filter(dk => !cacheGetPosts(dk));
          if (missing.length > 0) {
            // Batch API calls to avoid overwhelming the network (max 3 concurrent requests)
            const batchSize = 3;
            for (let i = 0; i < missing.length; i += batchSize) {
              if (cancelled) break;
              const batch = missing.slice(i, i + batchSize);
              const postPromises = batch.map(dk => api.getPostsByDate(dk).catch(() => []));
              const postsArrays = await Promise.all(postPromises);
              if (cancelled) break;
              batch.forEach((dk, batchIndex) => {
                cacheSetPosts(dk, postsArrays[batchIndex]);
              });
            }
          }

          // create a view-local cache object composed from module cache
          const newCache: Record<string, HydratedPost[]> = {};
          daysWithPosts.forEach((dk) => {
            newCache[dk] = cacheGetPosts(dk) || [];
          });
          setDayPostsCache(newCache);
        }
      } finally {
        if (!cancelled) setLoadingStats(false);
      }
    })();

    return () => { cancelled = true; };
  }, [curYear, curMonth, shouldLoad]);

  const showDay = useCallback(async (dk: string, scroll: boolean = true) => {
    // toggle selection: clicking the same day again will close the feed
    if (selectedDay === dk) {
      setSelectedDay(null);
      setDayPosts(null);
      setShouldScroll(false);
      return;
    }

    setShouldScroll(scroll);
    setSelectedDay(dk);
    setLoadingDay(true);
    try {
      // Prefer module-level cache -> view cache -> network
  const cached = cacheGetPosts(dk);
      if (cached) {
        setDayPosts(cached);
      } else if (dayPostsCache[dk]) {
        setDayPosts(dayPostsCache[dk]);
      } else {
        const posts = await api.getPostsByDate(dk);
        // populate module cache for future navigations
  cacheSetPosts(dk, posts);
        setDayPosts(posts);
      }
    } finally {
      setLoadingDay(false);
    }
  }, [selectedDay]);

  const goToPrevMonth = useCallback(() => {
    const m = curMonth - 1;
    if (m < 0) { setMonth(11); setYear(curYear - 1); } else setMonth(m);
  }, [curMonth, curYear]);

  const goToNextMonth = useCallback(() => {
    const m = curMonth + 1;
    if (m > 11) { setMonth(0); setYear(curYear + 1); } else setMonth(m);
  }, [curMonth, curYear]);

  // Auto-select today when the calendar initially shows the current month/year
  useEffect(() => {
    try {
      const todayKey = toDateKey(new Date());
      const nowYear = new Date().getFullYear();
      const nowMonth = new Date().getMonth();
      // only auto-open if calendar is showing this month/year and nothing is selected
      if (curYear === nowYear && curMonth === nowMonth && selectedDay == null && shouldLoad) {
        // fire-and-forget; showDay will set loading state and fetch
        void showDay(todayKey, false);
      }
    } catch (e) { /* ignore */ }
    // run only when month/year changes or selectedDay updates
  }, [curYear, curMonth, selectedDay, showDay, shouldLoad]);

  // When the parent marks this view as active, wait a short debounce before
  // enabling loading. This avoids loads when the view is only briefly shown
  // during a fast swipe across the AppShell slides.
  useEffect(() => {
    try {
      if (isActive) {
        // small debounce (ms)
        const t = window.setTimeout(() => setShouldLoad(true), 300);
        loadTimerRef.current = t;
      } else {
        // immediate cancel when view becomes inactive. We keep cached data
        // so returning to the calendar doesn't require refetching unless
        // the month changed while inactive.
        if (loadTimerRef.current) {
          window.clearTimeout(loadTimerRef.current);
          loadTimerRef.current = null;
        }
        setShouldLoad(false);
      }
    } catch (e) {}
    return () => {
      if (loadTimerRef.current) { window.clearTimeout(loadTimerRef.current); loadTimerRef.current = null; }
    };
  }, [isActive]);

  // Scroll to feed on desktop when posts are loaded
  useEffect(() => {
    if (shouldScroll && dayPosts && feedRef.current) {
      feedRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [shouldScroll, dayPosts]);

  const matrix = monthMatrix(curYear, curMonth);

  const renderMiniSlideshow = (dk: string) => {
    const posts = dayPostsCache[dk];
    if (!posts || posts.length === 0) return null;
    const urls = posts.flatMap(p => p.thumbnailUrls || (p.thumbnailUrl ? [p.thumbnailUrl] : []) || p.imageUrls || (p.imageUrl ? [p.imageUrl] : []));
    const allowLoad = true;
    return (
      <MiniSlideshow
        imageUrls={urls}
        fill={true}
        allowLoad={allowLoad}
      />
    );
  };

  const handleViewChange = useCallback((v: "list" | "grid") => {
    if (v === view) return;
    setPendingView(v);
    const el = fadeRef.current;
    if (!el) {
      setView(v);
      setPendingView(null);
      if (typeof window !== "undefined") localStorage.setItem("calendarView", v);
      return;
    }
    if (cleanupRef.current) {
      try { cleanupRef.current(); } catch {}
      cleanupRef.current = null;
    }
    setIsTransitioning(true);
    const onEnd = (e: AnimationEvent) => {
      if (e.target !== el) return;
      el.removeEventListener('animationend', onEnd as any);
      setView(v);
      setPendingView(null);
      if (typeof window !== "undefined") localStorage.setItem("calendarView", v);
      requestAnimationFrame(() => { setIsTransitioning(false); });
      cleanupRef.current = null;
    };
    el.addEventListener('animationend', onEnd as any);
    cleanupRef.current = () => {
      try { el.removeEventListener('animationend', onEnd as any); } catch {}
      setIsTransitioning(false);
    };
    // Yield to ensure class application before transition observed
    requestAnimationFrame(() => {});
  }, [view]);

  useEffect(() => {
    return () => { if (cleanupRef.current) { try { cleanupRef.current(); } catch {} } };
  }, []);

  return (
    <div className="view-fade">
      {!me ? (
        <div className="empty feed-empty" style={{ textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
          <div style={{ maxWidth: 520, margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 120, height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--card-bg)', borderRadius: 16 }} aria-hidden>
              <Calendar size={56} strokeWidth={1.5} />
            </div>
            <h2 style={{ margin: '6px 0 0 0', fontSize: '1.15rem' }}>Calendar View</h2>
            <p style={{ margin: 0, color: 'var(--text-secondary)', maxWidth: 420 }}>Sign in to explore posts organized by date</p>
          </div>
        </div>
      ) : (
      <div className="calendar-page">
        <div className="calendar-header">
          <button onClick={goToPrevMonth} className="calendar-nav-btn" aria-label="Previous month">
            ‹
          </button>
          <h2 className="calendar-month">
            {new Date(curYear, curMonth).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
          </h2>
          <button onClick={goToNextMonth} className="calendar-nav-btn" aria-label="Next month">
            ›
          </button>
        </div>
      <div className="calendar" key={`${curYear}-${curMonth}`}>
        <div className="calendar-weekdays">
          {weekdays.map(d => <div key={d} className="dim" style={{ textAlign: "center" }}>{d}</div>)}
        </div>
        {/* legend originally below the grid; kept removed here per user request */}
        <div className="calendar-grid" id="grid" aria-label="Month grid">
          {matrix.map((d, idx) => {
            if (!d) return <div className="day" key={idx} style={{ visibility: "hidden" }} />;
            const dk = toDateKey(d);
            const count = stats.counts[dk] || 0;
            const isToday = toDateKey(new Date()) === dk;
            const isMine = stats.mine.has(dk);
            const isSelected = selectedDay === dk;
            const className = [
              "day",
              isToday ? "today" : "",
              isMine ? "mine" : "",
              // Note: removed "has-posts" class so days with posts no longer
              // get a separate visual indicator (dot/background).
              count > 0 && dayPostsCache[dk] ? "has-slideshow" : "",
              isSelected ? "selected" : "",
            ].join(" ").trim();

            return (
              <div
                key={dk}
                className={className}
                role="button" tabIndex={0}
                aria-pressed={isSelected}
                aria-label={`${d.getDate()} ${new Date(dk).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })} — ${count} post${count===1? '' : 's'}${isMine ? ', includes your posts' : ''}`}
                onClick={() => showDay(dk, true)}
                onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && showDay(dk, true)}
              >
                {/* date number */}
                <div className="d" style={{ ['--date-delay' as any]: `${idx * 28}ms` } as React.CSSProperties}>{d.getDate()}</div>
                {/* Today badge removed per user request */}
                {count > 0 && renderMiniSlideshow(dk)}
              </div>
            );
          })}
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', justifyContent: 'center', padding: '6px 2px 0' }}>
          <div className="calendar-legend" aria-hidden style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {/* Removed 'Posts' legend entry per user request; keep only 'Your posts' */}
            <div className="legend-item" style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
              <span className="legend-dot mine" />
              <span className="dim">Your posts</span>
            </div>
          </div>
        </div>
      </div>
        {dayPosts && dayPosts.length > 0 && (
          <ViewToggle
            title={<Calendar size={20} strokeWidth={2} />}
            subtitle="Posts from selected day"
            selected={pendingView ?? view}
            onSelect={handleViewChange}
            className="tight"
          />
        )}
  <div ref={fadeRef} className={`fade-anim ${isTransitioning ? 'fade-hidden' : 'fade-visible'}`}>
    <div className={`feed ${view === 'grid' ? 'grid-view' : ''}`} id="day-feed" ref={feedRef}>
      {loadingDay ? (
        <CalendarDaySkeleton view={view} />
      ) : (
        dayPosts ? (dayPosts.length ? (
          view === "grid" ? (
            <GridView posts={dayPosts} hasMore={false} setSentinel={() => {}} loadingMore={false} />
          ) : (
            dayPosts.map((p, index) => <PostCard key={p.id} post={p} disableMediaNavigation={true} index={index} />)
          )
        )
          : <div className="empty">No posts for that day.</div>)
          : null
      )}
    </div>
  </div>
      </div>
      )}
    </div>
  );
}
