import { create } from "zustand";

export const useCalendarStore = create((set) => ({
  currentDate: new Date(),
  view: "month",

  setView: (view) => set({ view }),

  nextMonth: () =>
    set((state) => ({
      currentDate: new Date(
        state.currentDate.getFullYear(),
        state.currentDate.getMonth() + 1,
        1,
      ),
    })),

  prevMonth: () =>
    set((state) => ({
      currentDate: new Date(
        state.currentDate.getFullYear(),
        state.currentDate.getMonth() - 1,
        1,
      ),
    })),

  today: () =>
    set({
      currentDate: new Date(),
    }),
}));
