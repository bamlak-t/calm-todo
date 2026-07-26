import { format, isSameMonth, isToday } from "date-fns";

export default function DayCell({ day }) {
  return (
    <div
      className={
        "calendar-day " +
        (!isSameMonth(day, new Date()) ? "muted" : "") +
        (isToday(day) ? " today" : "")
      }
    >
      <span className="day-number">{format(day, "d")}</span>
    </div>
  );
}
