import "./Event.css";
import { useSessionStore } from "../../features/sessions/sessionStore";

export default function EventChip({ session }) {
    const { setActiveSession } = useSessionStore();
    const eventClickHandler = (session) => {
        document.querySelector(".event-modal__wrapper").style.display = "block";
        setActiveSession(session);
    }
    return (
        <div key={session.id} className="event-chip" onClick={() => eventClickHandler(session)}>
            {session.title}
        </div>
    );
}
