import { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSave, faX } from "@fortawesome/free-solid-svg-icons";
import { dateTimeConverter } from "../../utils/utils";

export default function EventEditModal({ event, onEventUpdate, onEditClose }) {
    const [editedEvent, setEditedEvent] = useState({ ...event });

    return (
        <div className="event-modal">
            <div className="event-modal__row">
                <div className="event-modal__row-left">
                    <h2>Edit Event</h2>
                </div>
                <div className="event-modal__row-right">
                    <button className="btn btn-icon" onClick={() => onEventUpdate(editedEvent.id, editedEvent)}><FontAwesomeIcon icon={faSave} /></button>
                    <button className="btn btn-icon" onClick={onEditClose}><FontAwesomeIcon icon={faX} /></button>
                </div>
            </div>
            <div className="event-modal__row event-modal__row--small">
                <div className="event-modal__row-left">
                    <input 
                        className="event-modal__input event-modal__input--wide event-modal__input--left" 
                        type="text" 
                        value={editedEvent.title} 
                        onChange={(e) => setEditedEvent({ ...editedEvent, title: e.target.value })} 
                    />
                </div>
                <div className="event-modal__row-right">
                    <input 
                        className="event-modal__input event-modal__input--wide" 
                        type="time" 
                        value={editedEvent.event_time} 
                        onChange={(e) => setEditedEvent({ ...editedEvent, event_time: e.target.value })} 
                    />
                </div>
            </div>
            <div>
                <input 
                    className="event-modal__input event-modal__input--wide" 
                    type="text" 
                    value={editedEvent.location} 
                    onChange={(e) => setEditedEvent({ ...editedEvent, location: e.target.value })} 
                />
            </div>
        </div>
    );
}