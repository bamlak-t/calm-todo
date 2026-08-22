import { create } from "zustand";
import { 
  updateSession as updateSessionService,
  updateEvent as updateEventService,
} from "./sessionService";

export const useSessionStore = create((set) => ({
  sessions: [],
  activeSession: null,
  loading: false,
  error: null,

  setSessions: (sessions) =>
    set({
      sessions,
    }),

  setLoading: (loading) =>
    set({
      loading,
    }),

  setError: (error) =>
    set({
      error,
    }),

  addSession: (session) =>
    set((state) => ({
      sessions: [...state.sessions, session],
    })),

  updateSession: async (id, updates) => {
      const updatedSession = await updateSessionService(id, updates);

      set((state) => ({
          sessions: state.sessions.map((session) =>
              session.id === id
                  ? {
                      ...session,
                      ...updatedSession,
                  }
                  : session
          ),

          activeSession:
              state.activeSession?.id === id
                  ? {
                      ...state.activeSession,
                      ...updatedSession,
                  }
                  : state.activeSession,
      }));

      return updatedSession;
    },  

  updateEvent: async (id, updates) => {
  const updatedEvent = await updateEventService(id, updates);

  set((state) => {
    const updatedSessions = state.sessions.map((session) => {
      // Remove the event from this session
      const remainingEvents =
        session.session_events?.filter(
          (event) => event.id !== id
        ) || [];

      // Add it to its new session
      if (session.id === updatedEvent.session_id) {
        return {
          ...session,
          session_events: [
            ...remainingEvents,
            updatedEvent,
          ],
        };
      }

      return {
        ...session,
        session_events: remainingEvents,
      };
    });

    // Find the updated active session from the newly updated sessions
    const updatedActiveSession =
      state.activeSession
        ? updatedSessions.find(
            (session) => session.id === state.activeSession.id
          ) || null
        : null;

    return {
      sessions: updatedSessions,
      activeSession: updatedActiveSession,
    };
  });

  return updatedEvent;
},

    deleteSession: (id) =>
      set((state) => ({
        sessions: state.sessions.filter((session) => session.id !== id),
      })),

    setActiveSession: (session) =>
      set({
        activeSession: session,
      }),
  }));
