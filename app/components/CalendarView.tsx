"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { monthMatrix, toDateKey } from "@/src/lib/date";
import { api } from "@/src/lib/api";
import { PostCard } from "./PostCard";
import InlinePreloader from "./InlinePreloader";
import { ViewToggle } from "./ViewToggle";
import { GridView } from "./GridView";
import { Calendar } from "lucide-react";
import type { HydratedPost } from "@/src/lib/types";
import { MiniSlideshow } from "./MiniSlideshow";
import { getStats as cacheGetStats, setStats as cacheSetStats, getPosts as cacheGetPosts, setPosts as cacheSetPosts, anyImageLoaded as cacheAnyImageLoaded, markImageLoaded as cacheMarkImageLoaded } from "@/src/lib/cache/calendarCache";

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
  const [dayPostsCache, setDayPostsCache] = useState<Record<string, HydratedPost[]>>({});
  // Only start loading data when the view has been active for a short time.
  // This prevents quick swipes through the calendar from triggering loads.
  const [shouldLoad, setShouldLoad] = useState<boolean>(false);
  const loadTimerRef = useRef<number | null>(null);

  // Load stats whenever the current month/year changes. Inline the async call
  // so we don't need to include the `loadStats` function in the dependency list.
  // Only load stats/posts when shouldLoad is true. This gate prevents
  // eager network requests when this component is merely mounted briefly
  // (for example, during a swipe across views).
  useEffect(() => {
    if (!shouldLoad) return;
    let cancelled = false;

    const offset = new Date().getTimezoneOffset();
    const cacheKey = `${curYear}-${curMonth}-${offset}`;

    (async () => {
      try {
        setLoadingStats(true);

        // Use cached stats if present
  const cachedStats = cacheGetStats(cacheKey);
        if (cachedStats) {
          setStats({ counts: cachedStats.counts, mine: new Set(cachedStats.mine) });
        } else {
          const s = await api.calendarStats({ year: curYear, monthIdx: curMonth, offset });
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
            const postPromises = missing.map(dk => api.getPostsByDate(dk).catch(() => []));
            const postsArrays = await Promise.all(postPromises);
            if (cancelled) return;
            missing.forEach((dk, i) => {
              cacheSetPosts(dk, postsArrays[i]);
            });
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

  const goToToday = useCallback(() => {
    const n = new Date();
    setYear(n.getFullYear());
    setMonth(n.getMonth());
    setSelectedDay(null);
  }, []);

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

  return (
    <div className="view-fade">
      <div className="calendar-page">
      <div className="calendar">
        <div className="header">
          <button className="btn" id="prev" aria-label="Previous month" onClick={goToPrevMonth}>←</button>
          <div>
            <strong
              id="title"
              role="button"
              tabIndex={0}
              onClick={goToToday}
              onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && goToToday()}
            >
              {new Date(curYear, curMonth).toLocaleString(undefined, { month: "long", year: "numeric" })}
            </strong>
          </div>
          <button className="btn" id="next" aria-label="Next month" onClick={goToNextMonth}>→</button>
        </div>
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
              // don't apply the global skeleton to the whole day element —
              // that made the date number text transparent while stats load.
              // we'll apply skeleton only to the count/dot placeholders below.
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
  <div className="feed grid-view" id="day-feed" ref={feedRef}>
        {dayPosts && dayPosts.length > 0 && (
          <ViewToggle
            title={<Calendar size={20} strokeWidth={2} />}
            subtitle="Posts from selected day"
            selected={view}
            onSelect={(v) => { setView(v); if (typeof window !== "undefined") localStorage.setItem("calendarView", v); }}
            className="tight"
          />
        )}

  {loadingDay ? (
    <InlinePreloader />
  ) : (
    dayPosts ? (dayPosts.length ? (
      view === "grid" ? (
        <GridView posts={dayPosts} hasMore={false} setSentinel={() => {}} loadingMore={false} />
      ) : (
        dayPosts.map(p => <PostCard key={p.id} post={p} disableMediaNavigation={true} />)
      )
    )
      : <div className="empty">No posts for that day.</div>)
      : null
  )}
      </div>
      </div>
    </div>
  );
}
