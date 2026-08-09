import { format, isSameMonth, isToday } from "date-fns";
import EventChip from "../event/EventChip";
import EventModal from "../event/EventModal";

export default function DayCell({ day, sessions = [] }) {
  const dateString = format(day, "yyyy-MM-dd");

  const allocatedSessions = sessions.filter((session) => {
    if (!session.allocated_date) return false;

    const start = session.allocated_date;
    const end = session.end_date || start;

    return dateString >= start && dateString <= end;
  });

  return (
    <div
      className={
        "calendar-day " +
        (!isSameMonth(day, new Date()) ? "muted" : "") +
        (isToday(day) ? " today" : "")
      }
    >
      <span className="day-number">{format(day, "d")}</span>

      <div className="day-events">
        {allocatedSessions.map((session) => (
          <>
            <EventChip key={session.id} session={session} />
          </>
        ))}
      </div>
    </div>
  );
}
