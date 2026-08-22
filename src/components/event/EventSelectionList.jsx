import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus, faX } from "@fortawesome/free-solid-svg-icons";
import { dateTimeConverter } from "../../utils/utils";

export default function EventSelectionList({ session, onSelectionClose, onEventInsertion }) {
    return (
        <div className="event-modal">
            <div className="event-modal__row">
                <div className="event-modal__row-left">
                    <h2>Add Event</h2>
                </div>
                <div className="event-modal__row-right">
                    <button className="btn btn-icon" onClick={onSelectionClose}><FontAwesomeIcon icon={faX} /></button>
                </div>
            </div>
            <div className="event-modal__list-wrapper">
                {session.map((session_event) => 
                (
                    <div className="event-modal__row event-modal__list">
                        <div className="event-modal__row-left">
                            <span>{session_event.title}</span>
                            <span className="event-modal__subtle-text">{dateTimeConverter(session_event.event_time, session_event.allocated_date)}</span>
                            {session_event.location && <a href={session_event.location} target="_blank" rel="noopener noreferrer"><i className="fa-solid fa-link"></i></a>}
                        </div>
                        <div className="event-modal__row-right">
                            <button className="btn-subtle" onClick={() => onEventInsertion(session_event.id)}>
                                <FontAwesomeIcon icon={faPlus} />
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}