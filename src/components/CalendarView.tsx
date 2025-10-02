"use client";

import { useEffect, useState } from "react";
import { monthMatrix, toDateKey } from "@/lib/date";
import { api } from "@/lib/api";
import { PostCard } from "./PostCard";
import InlinePreloader from "./InlinePreloader";
import type { HydratedPost } from "@/lib/types";

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

  const showDay = async (dk: string) => {
    // toggle selection: clicking the same day again will close the feed
    if (selectedDay === dk) {
      setSelectedDay(null);
      setDayPosts(null);
      return;
    }

    setSelectedDay(dk);
    setLoadingDay(true);
    try {
      const posts = await api.getPostsByDate(dk);
      setDayPosts(posts);
    } finally {
      setLoadingDay(false);
    }
  };

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
  }, [curYear, curMonth]);

  const matrix = monthMatrix(curYear, curMonth);

  return (
    <div className="view-fade">
      <div className="calendar-page">
      <div className="calendar">
        <div className="header">
          <button className="btn" id="prev" aria-label="Previous month" onClick={() => {
            const m = curMonth - 1;
            if (m < 0) { setMonth(11); setYear(curYear - 1); } else setMonth(m);
          }}>←</button>
          <div>
            <strong
              id="title"
              role="button"
              tabIndex={0}
              onClick={() => { const n = new Date(); setYear(n.getFullYear()); setMonth(n.getMonth()); setSelectedDay(null); }}
              onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && ((): void => { const n = new Date(); setYear(n.getFullYear()); setMonth(n.getMonth()); setSelectedDay(null); })()}
            >
              {new Date(curYear, curMonth).toLocaleString(undefined, { month: "long", year: "numeric" })}
            </strong>
          </div>
          <button className="btn" id="next" aria-label="Next month" onClick={() => {
            const m = curMonth + 1;
            if (m > 11) { setMonth(0); setYear(curYear + 1); } else setMonth(m);
          }}>→</button>
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
              loadingStats ? "skeleton" : "",
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
                <div className="d">{d.getDate()}</div>
                {isToday ? <div className="today-badge">Today</div> : null}
                <div className="count">{count > 0 ? `${count} post${count===1 ? '' : 's'}` : ''}</div>
                {count > 0 ? <div className="dot" aria-hidden /> : null}
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
  <div className="feed" id="day-feed">
        {selectedDay ? (
          <div style={{ marginBottom: 8, textAlign: 'center' }}>
            {/* keyed wrapper so changing selectedDay or counts will retrigger CSS animation */}
            <div key={selectedDay + "-" + (stats.counts[selectedDay] || 0)} className="day-header-anim">
              <strong style={{ display: 'block' }}>{new Date(selectedDay).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}</strong>
              <div className="dim" style={{ marginTop: 4 }}>{(stats.counts[selectedDay] || 0)} public post{(stats.counts[selectedDay] || 0) === 1 ? '' : 's'}</div>
            </div>
          </div>
        ) : null}

  {loadingDay ? (
    <InlinePreloader />
  ) : (
    dayPosts ? (dayPosts.length ? dayPosts.map(p => <PostCard key={p.id} post={p} />)
      : <div className="empty">No public posts for that day.</div>)
      : null
  )}
      </div>
      </div>
    </div>
  );
}