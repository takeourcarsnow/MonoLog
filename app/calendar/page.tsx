"use client";
import dynamic from 'next/dynamic';

const CalendarView = dynamic(() => import("@/app/components/calendar/CalendarView").then(mod => ({ default: mod.CalendarView })), {
  loading: () => <div className="calendar-page"><div className="calendar-header"><h2>Loading calendar...</h2></div></div>
});

export default function CalendarPage() {
  return <CalendarView />;
}
