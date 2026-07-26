import { format } from "date-fns";

import { useCalendarStore } from "../../features/calendar/calendarStore";

export default function CalendarHeader() {
  const { currentDate, nextMonth, prevMonth, today, view, setView } =
    useCalendarStore();

  return (
    <div className="calendar-header">
      <h2>{format(currentDate, "MMMM yyyy")}</h2>

      <div className="calendar-controls">
        <button class="btn btn-sm" onClick={prevMonth}>
          Prev
        </button>

        <button class="btn btn-sm" onClick={today}>
          Today
        </button>

        <button class="btn btn-sm" onClick={nextMonth}>
          Next
        </button>

        <div className="view-controls">
          <button
            className={`view-btn ${view === "month" ? "active" : ""}`}
            onClick={() => setView("month")}
          >
            Month
          </button>

          <button
            className={`view-btn ${view === "week" ? "active" : ""}`}
            onClick={() => setView("week")}
          >
            Week
          </button>
        </div>
      </div>
    </div>
  );
}
