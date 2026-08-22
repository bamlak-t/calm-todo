import CalendarHeader from "./CalendarHeader";
import CalendarGrid from "./CalendarGrid";
import EventModal from "../event/EventModal";
import EventSelectionList from "../event/EventSelectionList";
import { useState } from "react";
import "./Calendar.css";

import { useSessionStore } from "../../features/sessions/sessionStore";

export default function Calendar() {
 const { sessions, activeSession, setActiveSession, updateSession, updateEvent } = useSessionStore();
 const [isEventSelectionOpen, setIsEventSelectionOpen] = useState(false);

 const handleCompletionUpdate = async () => {
  if (activeSession) {
     await updateSession(activeSession.id, { completed: !activeSession.completed });
   }
 }

 const handleEventDeletion = async (eventId) => {
  const backlogSession = sessions.find((session) => session.title === "Inbox (Unplanned)");
  if (!activeSession || !backlogSession) { return; }
  const deletedEvent = activeSession.session_events?.find((event) => event.id === eventId);
  await updateEvent(eventId, {session_id: backlogSession.id,});
};

const handleEventInsertion = async (eventId) => {
  const backlogSession = sessions.find((session) => session.title === "Inbox (Unplanned)");
  if (!activeSession || !backlogSession) { return; }
  const insertedEvent = backlogSession.session_events?.find((event) => event.id === eventId);
  await updateEvent(eventId, {session_id: activeSession.id,});
}


 const handleEventSelectionOpen = () => {
   setIsEventSelectionOpen(true);
 }

 const handleEventSelectionClose = () => {
   setIsEventSelectionOpen(false);
 }
 
  return (
    <section className="calendar-section">
      <CalendarHeader />

      <div className="calendar-table-wrapper">
        <CalendarGrid />
      </div>

      {activeSession && (
        <div className="event-modal__wrapper">
            <EventModal
                session={activeSession}
                onCompletionUpdate={handleCompletionUpdate}
                onClose={() => setActiveSession(null)}
                onSelectionOpen={handleEventSelectionOpen}
                onEventDeletion={handleEventDeletion}
            />
        </div>
      )}
      {isEventSelectionOpen && (
        <div className="event-modal__wrapper">
            <EventSelectionList 
            session={sessions.find((session) => session.title === "Inbox (Unplanned)")?.session_events || []} 
            onSelectionClose={handleEventSelectionClose} 
            onEventInsertion={handleEventInsertion}
            />
        </div>
      )}
    </section>
  );
}
