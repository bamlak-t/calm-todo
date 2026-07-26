import { useEffect } from "react";

import { useCalendarStore } from "../../features/calendar/calendarStore";
import { getMonthDays } from "../../features/calendar/calendarUtils";

import { getSessions } from "../../features/sessions/sessionService";
import { useSessionStore } from "../../features/sessions/sessionStore";

import DayCell from "./DayCell";

export default function CalendarGrid() {
  const currentDate = useCalendarStore((s) => s.currentDate);

  const sessions = useSessionStore((s) => s.sessions);
  const setSessions = useSessionStore((s) => s.setSessions);

  useEffect(() => {
    async function loadSessions() {
      try {
        const data = await getSessions();

        console.log("Retrieved sessions:", data);

        setSessions(
          data.map((session) => ({
            ...session,
            events: session.session_events ?? [],
          })),
        );
      } catch (error) {
        console.error("Failed to load sessions:", error);
      }
    }

    loadSessions();
  }, [setSessions]);

  const days = getMonthDays(currentDate);

  return (
    <>
      <div className="calendar-weekdays">
        {["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"].map((day) => (
          <div key={day}>{day}</div>
        ))}
      </div>

      <div className="calendar-grid">
        {days.map((day) => (
          <DayCell key={day.toISOString()} day={day} sessions={sessions} />
        ))}
      </div>
    </>
  );
}
