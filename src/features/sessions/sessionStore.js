import { create } from "zustand";

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

  updateSession: (id, updates) =>
    set((state) => ({
      sessions: state.sessions.map((session) =>
        session.id === id
          ? {
              ...session,
              ...updates,
            }
          : session,
      ),
    })),

  deleteSession: (id) =>
    set((state) => ({
      sessions: state.sessions.filter((session) => session.id !== id),
    })),

  setActiveSession: (session) =>
    set({
      activeSession: session,
    }),
}));
