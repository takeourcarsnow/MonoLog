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

  const loadStats = async (year = curYear, month = curMonth) => {
    const s = await api.calendarStats({ year, monthIdx: month });
    setStats({ counts: s.counts, mine: s.mine });
  };

  useEffect(() => { loadStats(); }, [curYear, curMonth]);

  const showDay = async (dk: string) => {
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
          <div><strong id="title">{new Date(curYear, curMonth).toLocaleString(undefined, { month: "long", year: "numeric" })}</strong></div>
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
            const className = ["day", isToday ? "today" : "", isMine ? "mine" : ""].join(" ").trim();
            return (
              <div
                key={dk}
                className={className}
                role="button" tabIndex={0}
                onClick={() => showDay(dk)}
                onKeyDown={(e) => e.key === "Enter" && showDay(dk)}
              >
                <div className="d">{d.getDate()}</div>
                <div className="count">{count} post{count===1 ? "" : "s"}</div>
              </div>
            );
          })}
        </div>
      </div>
      <div className="feed" id="day-feed">
        {loadingDay ? <div className="dim">Loading…</div> : (
          dayPosts ? (dayPosts.length ? dayPosts.map(p => <PostCard key={p.id} post={p} />)
                  : <div className="empty">No public posts for that day.</div>)
                  : null
        )}
      </div>
    </div>
  );
}