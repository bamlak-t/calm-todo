import { create } from "zustand";

export const useSessionStore = create((set) => ({
  sessions: [],

  setSessions: (sessions) =>
    set({
      sessions,
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
}));
