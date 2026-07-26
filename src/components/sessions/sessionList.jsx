import { useEffect } from "react";

import { getSessions } from "../../features/sessions/sessionService";

import { useSessionStore } from "../../features/sessions/sessionStore";

import SessionCard from "./SessionCard";

export default function SessionList() {
  const { sessions, setSessions } = useSessionStore();

  useEffect(() => {
    async function load() {
      const data = await getSessions();

      setSessions(data);
    }

    load();
  }, []);

  return (
    <section>
      {sessions.map((session) => (
        <SessionCard key={session.id} session={session} />
      ))}
    </section>
  );
}
