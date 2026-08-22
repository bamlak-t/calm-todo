import "./Event.css";
import { useState } from "react";
import { dateTimeConverter } from "../../utils/utils";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCheck, faClock, faLink, faPenToSquare, faPlus, faTrash, faX } from "@fortawesome/free-solid-svg-icons";

export default function EventModal({ session, onCompletionUpdate, onClose, onSelectionOpen, onEventDeletion, onTitleUpdate, onEditOpen }) {
    const [isEditing, setIsEditing] = useState(false);
    const [editedTitle, setEditedTitle] = useState(session.title);

    const sortSessionEvents = (session_events) => {
        return session_events.sort((a, b) => {
            const timeA = new Date(`${session.allocated_date}T${a.event_time}Z`);
            const timeB = new Date(`${session.allocated_date}T${b.event_time}Z`);
            return timeA - timeB;
        });
    }

    return (
        <div className="event-modal">
            <div className="event-modal__row">
                <div className="event-modal__row-left">
                    {
                        isEditing ? (
                            <input
                                type="text"
                                value={editedTitle}
                                onChange={(e) => setEditedTitle(e.target.value)}
                                className="event-modal__input event-modal__input--title"
                            />
                        ): (
                            <h2>{session.title}</h2>
                        )
                    }
                    <span className="event-modal__subtle-text">{session.end_date}</span>
                    <button className="btn-subtle" onClick={onCompletionUpdate}>
                        <FontAwesomeIcon
                            className="event-modal__badge"
                            icon={session.completed ? faCheck : faClock}
                        />
                    </button>
                </div>
                <div className="event-modal__row-right">
                    <button className="btn btn-icon" onClick={() => { if(isEditing){onTitleUpdate(editedTitle);} setIsEditing(!isEditing);}}>
                        <FontAwesomeIcon icon={faPenToSquare} /></button>
                    <button className="btn btn-icon" onClick={onClose}>
                        <FontAwesomeIcon icon={faX} /></button>
                </div>
            </div>
            {sortSessionEvents(session.session_events || []).map((session_event) => 
            (
                <div className="event-modal__row event-modal__list">
                    <div className="event-modal__row-left">
                        <span>{session_event.title}</span>
                        <span className="event-modal__subtle-text">{dateTimeConverter(session_event.event_time, session.allocated_date)}</span>
                        {session_event.location && <a href={session_event.location} target="_blank" rel="noopener noreferrer"><FontAwesomeIcon icon={faLink} /></a>}
                    </div>
                    <div className="event-modal__row-right">
                        {isEditing && (
                            <>
                            <button className="btn-subtle" onClick={() => onEditOpen(session_event)}>
                                <FontAwesomeIcon icon={faPenToSquare} />
                            </button>
                            <button className="btn-subtle" onClick={() => onEventDeletion(session_event.id)}>
                                <FontAwesomeIcon icon={faTrash} />
                            </button>
                            </>
                        )}
                    </div>
                </div>
            ))}
            {isEditing && (
                <button className="btn btn-icon" onClick={onSelectionOpen}>
                    <FontAwesomeIcon icon={faPlus} />
                </button>
            )}
        </div>
    );
}
