export const dateTimeConverter = (event_time, allocated_date) => {
    if (!event_time || !allocated_date) {
        return "";
    }
    const date = new Date(`${allocated_date}T${event_time}Z`);
    return `${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
}