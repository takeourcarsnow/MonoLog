"use client";

import { useEffect, useState } from "react";
import { monthMatrix, toDateKey } from "@/lib/date";
import { api } from "@/lib/api";
import { PostCard } from "./PostCard";
import type { HydratedPost } from "@/lib/types";

const weekdays = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];

export function CalendarView() {
  const now = new Date();
  const [curYear, setYear] = useState(now.getFullYear());
  const [curMonth, setMonth] = useState(now.getMonth());
  const [stats, setStats] = useState<{ counts: Record<string, number>; mine: Set<string> }>({ counts: {}, mine: new Set() });
  const [dayPosts, setDayPosts] = useState<HydratedPost[] | null>(null);
  const [loadingDay, setLoadingDay] = useState(false);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  // Load stats whenever the current month/year changes. Inline the async call
  // so we don't need to include the `loadStats` function in the dependency list.
  useEffect(() => {
    (async () => {
      const s = await api.calendarStats({ year: curYear, monthIdx: curMonth });
      setStats({ counts: s.counts, mine: s.mine });
    })();
  }, [curYear, curMonth]);

  const showDay = async (dk: string) => {
    setSelectedDay(dk);
    setLoadingDay(true);
    const posts = await api.getPostsByDate(dk);
    setDayPosts(posts);
    setLoadingDay(false);
  };

  const matrix = monthMatrix(curYear, curMonth);

  return (
    <div className="view-fade">
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
        <div className="dim" style={{ padding: "0 2px 6px" }}>Tap a day to see all public posts</div>
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
              isSelected ? "selected" : "",
            ].join(" ").trim();

            return (
              <div
                key={dk}
                className={className}
                role="button" tabIndex={0}
                aria-pressed={isSelected}
                onClick={() => showDay(dk)}
                onKeyDown={(e) => (e.key === "Enter" || e.key === "") && showDay(dk)}
              >
                <div className="d">{d.getDate()}</div>
                <div className="count">{count} post{count===1 ? "" : "s"}</div>
                {count > 0 ? <div className="dot" aria-hidden /> : null}
              </div>
            );
          })}
        </div>
      </div>
      <div className="feed" id="day-feed">
        {selectedDay ? (
          <div style={{ marginBottom: 8 }}>
            <strong>{new Date(selectedDay).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}</strong>
            <div className="dim" style={{ marginTop: 4 }}>{(stats.counts[selectedDay] || 0)} public post{(stats.counts[selectedDay] || 0) === 1 ? '' : 's'}</div>
          </div>
        ) : null}

        {loadingDay ? <div className="dim">Loading…</div> : (
          dayPosts ? (dayPosts.length ? dayPosts.map(p => <PostCard key={p.id} post={p} />)
                  : <div className="empty">No public posts for that day.</div>)
                  : <div className="dim">Select a day to view posts</div>
        )}
      </div>
    </div>
  );
}