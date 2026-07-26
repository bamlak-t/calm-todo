import { useCalendarStore } from "../../features/calendar/calendarStore";
import { getMonthDays } from "../../features/calendar/calendarUtils";

import DayCell from "./DayCell";

export default function CalendarGrid() {
  const currentDate = useCalendarStore((s) => s.currentDate);

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
          <DayCell key={day.toISOString()} day={day} />
        ))}
      </div>
    </>
  );
}
