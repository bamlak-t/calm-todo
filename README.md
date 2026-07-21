# 📋 CalmTodo

A simple, calm, high-contrast Todo List & Calendar Web Application backed by Supabase with multi-calendar (Google & Apple Calendar) support, designed for direct deployment on **GitHub Static Pages**.

Styled with signature thick black borders, clean white cards, rounded action buttons, and JetBrains Mono typography inspired by [calm-kepler](https://bamlak-t.github.io/calm-kepler/).

---

## ✨ Features

- **🔒 4-Digit Security PIN**: Built-in 4-digit code lock pad (default: `1234`) to secure your todo session on shared screens.
- **📅 Full Calendar Grid (Month & Week Views)**:
  - Interactive calendar grid showing date cells, today highlights, and allocated sessions/events.
  - **Drag-and-Drop Date Allocation**: Simply drag any Todo Session from the bottom pool onto any calendar day!
- **📋 Session-Based Groupings**:
  - Todo items are structured as **Sessions** (groupings of events like *Friday Outing*, *Project Sprint*).
  - Each Session holds multiple **Sub-Events** (e.g. *🍝 18:30 Dinner*, *🎬 20:30 Cinema*, *🍹 Drinks Bar*).
- **🥇 Ranking System**:
  - Rank your todo sessions by priority (`#1`, `#2`, `#3`...).
  - High-priority sessions stay at the top of your rank pool.
- **🌐 Google & Apple Calendar Sync**:
  - Connect external public iCal feeds (`.ics` / `webcal://`) from Google Calendar and Apple iCloud Calendar.
  - Overlay external events right on your calendar grid.
  - **Export to `.ics`**: One-click download of allocated todo sessions to import into Apple Calendar or Google Calendar.
- **⚡ Supabase Backed**:
  - Pre-configured with your Supabase credentials:
    - **URL**: `https://ipiuhnopkycycirspeky.supabase.co`
    - **Publishable Key**: `sb_publishable_19qI3Xe4m37bws_bn6l4pw_KKitS2FN`
  - Real-time persistence with offline local storage fallback.
- **📐 Fixed Bottom Accordion UI**:
  - Todo sessions are housed in a fixed bottom drawer that stays accessible without blocking your calendar grid view.

---

## 🚀 How to Host on GitHub Pages

1. Push this repository to GitHub (e.g. `https://github.com/username/calm-todo`).
2. Go to **Repository Settings** -> **Pages**.
3. Under **Build and deployment**, select **Source**: `Deploy from a branch`.
4. Choose `main` branch and `/ (root)` folder, then click **Save**.
5. Your app will be live at `https://username.github.io/calm-todo/`!

---

## 🗄️ Supabase Setup Instructions

1. Open your Supabase SQL Editor: [https://ipiuhnopkycycirspeky.supabase.co](https://ipiuhnopkycycirspeky.supabase.co)
2. Copy and paste the contents of `supabase_schema.sql` into the SQL Editor and click **Run**.
3. Your tables (`todo_sessions`, `session_events`, `external_calendars`, `app_settings`) will be created automatically.
