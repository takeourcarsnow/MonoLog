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

const weekdays = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];

export function CalendarView() {
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

  // Load stats whenever the current month/year changes. Inline the async call
  // so we don't need to include the `loadStats` function in the dependency list.
  useEffect(() => {
    (async () => {
      try {
        setLoadingStats(true);
        const s = await api.calendarStats({ year: curYear, monthIdx: curMonth });
        setStats({ counts: s.counts, mine: s.mine });
      } finally {
        setLoadingStats(false);
      }
    })();
  }, [curYear, curMonth]);

  const showDay = useCallback(async (dk: string) => {
    // toggle selection: clicking the same day again will close the feed
    if (selectedDay === dk) {
      setSelectedDay(null);
      setDayPosts(null);
      setShouldScroll(false);
      return;
    }

    setShouldScroll(true);
    setSelectedDay(dk);
    setLoadingDay(true);
    try {
      const posts = await api.getPostsByDate(dk);
      setDayPosts(posts);
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
      if (curYear === nowYear && curMonth === nowMonth && selectedDay == null) {
        // fire-and-forget; showDay will set loading state and fetch
        void showDay(todayKey);
      }
    } catch (e) { /* ignore */ }
    // run only when month/year changes or selectedDay updates
  }, [curYear, curMonth, selectedDay, showDay]);

  // Scroll to feed on desktop when posts are loaded
  useEffect(() => {
    // Disabled: no longer scroll to feed on select
    // if (shouldScroll && dayPosts && feedRef.current && window.innerWidth >= 900) {
    //   feedRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    // }
  }, [shouldScroll, dayPosts]);

  const matrix = monthMatrix(curYear, curMonth);

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
              count > 0 ? "has-posts" : "",
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
                aria-label={`${d.getDate()} ${new Date(dk).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })} — ${count} public post${count===1? '' : 's'}${isMine ? ', includes your posts' : ''}`}
                onClick={() => showDay(dk)}
                onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && showDay(dk)}
              >
                {/* date number */}
                <div className="d" style={{ ['--date-delay' as any]: `${idx * 28}ms` } as React.CSSProperties}>{d.getDate()}</div>
                {/* Today badge removed per user request */}
                {count > 0 ? <div className={loadingStats ? "dot skeleton" : "dot"} aria-hidden /> : null}
              </div>
            );
          })}
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', justifyContent: 'center', padding: '6px 2px 0' }}>
          <div className="calendar-legend" aria-hidden style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <div className="legend-item" style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
              <span className="legend-dot post" />
              <span className="dim">Public posts</span>
            </div>
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
      : <div className="empty">No public posts for that day.</div>)
      : null
  )}
      </div>
      </div>
    </div>
  );
}
