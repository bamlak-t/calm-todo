import CalendarHeader from "./CalendarHeader";
import CalendarGrid from "./CalendarGrid";
import EventModal from "../event/EventModal";
import "./Calendar.css";

import { useSessionStore } from "../../features/sessions/sessionStore";

export default function Calendar() {
 const activeSession = useSessionStore((state) => state.activeSession);
 console.log("activeSession", activeSession);
  return (
    <section className="calendar-section">
      <CalendarHeader />

      <div className="calendar-table-wrapper">
        <CalendarGrid />
      </div>

      <div className="event-modal__wrapper">
        {activeSession && <EventModal session={activeSession} />}
      </div>
    </section>
  );
}
