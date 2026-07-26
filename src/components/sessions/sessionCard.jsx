export default function SessionCard({ session }) {
  return (
    <article
      style={{
        borderLeft: `5px solid ${session.color}`,
      }}
    >
      <h2>{session.title}</h2>

      <p>Rank: {session.rank}</p>

      <p>Date: {session.allocated_date}</p>

      <p>{session.notes}</p>

      <h3>Events</h3>

      <ul>
        {session.session_events?.map((event) => (
          <li key={event.id}>
            {event.title}

            {event.completed && " ✓"}
          </li>
        ))}
      </ul>
    </article>
  );
}
