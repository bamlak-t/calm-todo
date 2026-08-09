import "./Event.css";

export default function EventModal({ session }) {
    const modalCloseHandler = () => {
        document.querySelector(".event-modal__wrapper").style.display = "none";
    }
    const dateTimeConverter = (event_time) => {
        const date = new Date(`${session.allocated_date}T${event_time}Z`);
        return `${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
    }

    const sortSessionEvents = (session_events) => {
        return session_events.sort((a, b) => {
            const timeA = new Date(`${session.allocated_date}T${a.event_time}Z`);
            const timeB = new Date(`${session.allocated_date}T${b.event_time}Z`);
            return timeA - timeB;
        });
    }

    return (
        <div className="event-modal">
            <div className="event-modal__header">
                <div className="event-modal__header-left">
                    <h2>{session.title}</h2>
                    <span className="event-modal__subtle-text">{session.end_date}</span>
                    {session.completed ? <i class="event-modal__badge fa-solid fa-check"></i> : <i class="event-modal__badge fa-regular fa-clock"></i>}
                </div>
                <div className="event-modal__header-right">
                    <button className="btn btn-icon"><i class="fa-solid fa-pen-to-square"></i></button>
                    <button className="btn btn-icon" onClick={modalCloseHandler}><i class="fa-solid fa-x"></i></button>
                </div>
            </div>
            {sortSessionEvents(session.session_events || []).map((session_event) => 
            (
                <div className="event-modal__list">
                    <span>{session_event.title}</span>
                    <span className="event-modal__subtle-text">{dateTimeConverter(session_event.event_time)}</span>
                    {session_event.location && <a href={session_event.location} target="_blank" rel="noopener noreferrer"><i class="fa-solid fa-link"></i></a>}
                </div>
            ))}
        </div>
    );
}
