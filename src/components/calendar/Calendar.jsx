import CalendarHeader from "./CalendarHeader";
import CalendarGrid from "./CalendarGrid";
import "./Calendar.css";

export default function Calendar() {
  return (
    <section className="calendar-section">
      <CalendarHeader />

      <div className="calendar-table-wrapper">
        <CalendarGrid />
      </div>
    </section>
  );
}
