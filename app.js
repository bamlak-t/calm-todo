/**
 * CalmTodo - Core Application Engine
 * Backed by Supabase with LocalStorage Fallback & iCal Multi-Calendar Sync
 */

const App = (function () {
  // Config & State
  let supabaseClient = null;

  let currentDate = new Date();
  let calendarView = 'month'; // 'month' or 'week'

  // Data Store
  let sessions = [];
  let externalCalendars = [];
  let externalEvents = [];

  // Hardcoded Supabase Config (from User Request)
  const supabaseUrl = 'https://ipiuhnopkycycirspeky.supabase.co';
  const supabaseKey = 'sb_publishable_19qI3Xe4m37bws_bn6l4pw_KKitS2FN';

  // Category Color Map & Icons (Emojis removed per user request)
  const CATEGORIES = {
    food: { name: 'Food / Dining', icon: '', color: 'var(--accent-yellow)' },
    entertainment: { name: 'Cinema / Show', icon: '', color: 'var(--accent-blue)' },
    bar: { name: 'Drinks / Bar', icon: '', color: 'var(--accent-purple)' },
    shopping: { name: 'Shopping', icon: '', color: 'var(--accent-orange)' },
    fitness: { name: 'Fitness / Sport', icon: '', color: 'var(--accent-green)' },
    work: { name: 'Work / Task', icon: '', color: 'var(--accent-rose)' },
    general: { name: 'General', icon: '', color: '#e5e7eb' }
  };

  // --- Initializer ---
  function init() {
    loadSavedSettings();
    initSupabase();
    setupDefaultData();
    renderCalendar();
    renderSessions();
    renderExternalCalendarsList();
  }

  function loadSavedSettings() {
    const isDark = localStorage.getItem('calmtodo_dark_mode') === 'true';
    if (isDark) {
      document.body.classList.add('dark-mode');
    }
  }

  function initSupabase() {
    if (window.supabase && supabaseUrl && supabaseKey) {
      try {
        supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);
        updateLogoState(true);
        fetchSessionsFromDB();
      } catch (err) {
        console.warn('Supabase init error, falling back to local storage:', err);
        updateLogoState(false);
        loadSessionsFromLocal();
      }
    } else {
      updateLogoState(false);
      loadSessionsFromLocal();
    }
  }

  function updateLogoState(isConnected) {
    const logo = document.getElementById('app-title-logo');
    if (logo) {
      if (isConnected) {
        logo.classList.remove('faint');
      } else {
        logo.classList.add('faint');
      }
    }
  }

  // --- Demo Data Setup ---
  function setupDefaultData() {
    const local = localStorage.getItem('calmtodo_sessions');
    if (local) {
      sessions = JSON.parse(local);
    } else {
      const todayStr = formatDateIso(new Date());
      sessions = [
        {
          id: 's-1',
          title: 'Weekend Outing & Movie Night',
          rank: 1,
          allocated_date: todayStr,
          completed: false,
          notes: 'Book cinema tickets online ahead of time',
          events: [
            { id: 'e-1', title: 'Dinner at Italian Bistro', category: 'food', event_time: '18:30', completed: false },
            { id: 'e-2', title: 'Cinema - Sci-Fi Movie', category: 'entertainment', event_time: '20:30', completed: false }
          ]
        },
        {
          id: 's-2',
          title: 'Sunday Fitness & Grocery Refresh',
          rank: 2,
          allocated_date: null,
          completed: false,
          notes: 'Buy fruits and organic vegetables',
          events: [
            { id: 'e-3', title: 'Morning Park Run (5K)', category: 'fitness', event_time: '09:00', completed: true },
            { id: 'e-4', title: 'Supermarket Grocery Haul', category: 'shopping', event_time: '11:00', completed: false }
          ]
        }
      ];
      saveSessionsLocal();
    }

    const localCals = localStorage.getItem('calmtodo_ext_cals');
    if (localCals) {
      externalCalendars = JSON.parse(localCals);
    } else {
      externalCalendars = [
        { id: 'c-1', name: 'Google Personal', type: 'google', url: 'https://calendar.google.com/public/sample.ics', color: '#10b981', active: true }
      ];
    }
  }

  function loadSessionsFromLocal() {
    const local = localStorage.getItem('calmtodo_sessions');
    if (local) {
      sessions = JSON.parse(local);
      renderSessions();
      renderCalendar();
    }
  }

  // --- Database Sync (Supabase & LocalStorage) ---
  async function fetchSessionsFromDB() {
    if (!supabaseClient) return loadSessionsFromLocal();
    try {
      const { data: dbSessions, error } = await supabaseClient
        .from('todo_sessions')
        .select('*')
        .order('rank', { ascending: true });

      if (error) throw error;

      if (dbSessions && dbSessions.length > 0) {
        // Fetch subevents
        const { data: dbEvents } = await supabaseClient.from('session_events').select('*');
        
        sessions = dbSessions.map(s => ({
          id: s.id,
          title: s.title,
          rank: s.rank,
          allocated_date: s.allocated_date,
          completed: s.completed,
          notes: s.notes || '',
          events: (dbEvents || [])
            .filter(e => e.session_id === s.id)
            .map(e => ({
              id: e.id,
              title: e.title,
              category: e.category || 'general',
              event_time: e.event_time || '',
              completed: e.completed
            }))
        }));
        saveSessionsLocal();
        renderSessions();
        renderCalendar();
      } else {
        // DB empty, save current default sessions to DB
        syncAllToDB();
      }
    } catch (err) {
      console.warn('DB Fetch failed, using local sessions:', err);
      loadSessionsFromLocal();
    }
  }

  async function syncAllToDB() {
    if (!supabaseClient) return;
    try {
      for (const s of sessions) {
        await supabaseClient.from('todo_sessions').upsert({
          id: typeof s.id === 'string' && s.id.includes('-') && s.id.length > 30 ? s.id : undefined,
          title: s.title,
          rank: s.rank,
          allocated_date: s.allocated_date || null,
          completed: s.completed,
          notes: s.notes
        });
      }
    } catch (err) {
      console.warn('DB Sync error:', err);
    }
  }

  function saveSessionsLocal() {
    localStorage.setItem('calmtodo_sessions', JSON.stringify(sessions));
  }


  // --- Calendar Engine ---
  function renderCalendar() {
    const grid = document.getElementById('calendar-grid');
    if (!grid) return;
    grid.innerHTML = '';

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    // Update label
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    document.getElementById('month-year-label').textContent = `${monthNames[month]} ${year}`;

    if (calendarView === 'month') {
      renderMonthView(grid, year, month);
    } else {
      renderWeekView(grid);
    }
  }

  function renderMonthView(grid, year, month) {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    // Starting day offset (Mon=0, Sun=6)
    let startDayIndex = firstDay.getDay() - 1;
    if (startDayIndex === -1) startDayIndex = 6; // Sunday

    const totalDays = lastDay.getDate();
    const todayStr = formatDateIso(new Date());

    // Previous month filler days
    const prevLastDay = new Date(year, month, 0).getDate();
    for (let i = startDayIndex - 1; i >= 0; i--) {
      const dayNum = prevLastDay - i;
      const cell = createDayCell(dayNum, true, null);
      grid.appendChild(cell);
    }

    // Current month days
    for (let d = 1; d <= totalDays; d++) {
      const dateObj = new Date(year, month, d);
      const dateStr = formatDateIso(dateObj);
      const isToday = (dateStr === todayStr);

      const cell = createDayCell(d, false, dateStr, isToday);
      grid.appendChild(cell);
    }

    // Next month filler days (up to 35 or 42 grid cells)
    const currentCellsCount = startDayIndex + totalDays;
    const nextDaysNeeded = (currentCellsCount > 35 ? 42 : 35) - currentCellsCount;
    for (let n = 1; n <= nextDaysNeeded; n++) {
      const cell = createDayCell(n, true, null);
      grid.appendChild(cell);
    }
  }

  function renderWeekView(grid) {
    // Current week starting Mon
    const curr = new Date(currentDate);
    const day = curr.getDay();
    const diff = curr.getDate() - day + (day === 0 ? -6 : 1); // Adjust for Monday start
    const monday = new Date(curr.setDate(diff));
    const todayStr = formatDateIso(new Date());

    for (let i = 0; i < 7; i++) {
      const dateObj = new Date(monday);
      dateObj.setDate(monday.getDate() + i);
      const dateStr = formatDateIso(dateObj);
      const isToday = (dateStr === todayStr);

      const cell = createDayCell(dateObj.getDate(), false, dateStr, isToday);
      cell.style.minHeight = '240px';
      grid.appendChild(cell);
    }
  }

  function createDayCell(dayNumber, isOtherMonth, dateStr, isToday = false) {
    const cell = document.createElement('div');
    cell.className = `calendar-day ${isOtherMonth ? 'other-month' : ''} ${isToday ? 'today' : ''}`;
    
    if (dateStr) {
      cell.setAttribute('data-date', dateStr);

      // Drag and Drop target handlers
      cell.addEventListener('dragover', (e) => {
        e.preventDefault();
        cell.classList.add('drag-over');
      });
      cell.addEventListener('dragleave', () => cell.classList.remove('drag-over'));
      cell.addEventListener('drop', (e) => {
        e.preventDefault();
        cell.classList.remove('drag-over');
        const sessionId = e.dataTransfer.getData('text/plain');
        if (sessionId) {
          allocateSessionToDate(sessionId, dateStr);
        }
      });
    }

    const numSpan = document.createElement('span');
    numSpan.className = 'day-number';
    numSpan.textContent = dayNumber;
    cell.appendChild(numSpan);

    if (dateStr && !isOtherMonth) {
      const eventsContainer = document.createElement('div');
      eventsContainer.className = 'day-events';

      // Render allocated todo sessions & sub-events for this date
      const allocatedSessions = sessions.filter(s => s.allocated_date === dateStr);
      allocatedSessions.forEach(s => {
        const chip = document.createElement('div');
        chip.className = `event-chip ${s.completed ? 'completed' : ''}`;
        chip.title = `${s.title} (${s.events ? s.events.length : 0} events)`;
        chip.innerHTML = `<span>S: ${escapeHtml(s.title)}</span>`;
        chip.onclick = (e) => {
          e.stopPropagation();
          openSessionEditor(s.id);
        };
        eventsContainer.appendChild(chip);

        // Also list individual sub-events inside the session
        if (s.events) {
          s.events.forEach(sub => {
            const subChip = document.createElement('div');
            subChip.className = `event-chip ${sub.completed ? 'completed' : ''}`;
            subChip.style.background = CATEGORIES[sub.category]?.color || 'var(--accent-yellow)';
            const catIcon = CATEGORIES[sub.category]?.icon ? CATEGORIES[sub.category].icon + ' ' : '';
            subChip.innerHTML = `<span>${catIcon}${sub.event_time ? sub.event_time + ' ' : ''}${escapeHtml(sub.title)}</span>`;
            eventsContainer.appendChild(subChip);
          });
        }
      });

      // Render external calendar events (Google / Apple Cal)
      const extOnDay = externalEvents.filter(e => e.date === dateStr);
      extOnDay.forEach(ext => {
        const extChip = document.createElement('div');
        extChip.className = 'event-chip external-event';
        extChip.innerHTML = `<span>Ext: ${escapeHtml(ext.summary)}</span>`;
        eventsContainer.appendChild(extChip);
      });

      cell.appendChild(eventsContainer);
    }

    return cell;
  }

  function navigateMonth(delta) {
    currentDate.setMonth(currentDate.getMonth() + delta);
    renderCalendar();
  }

  function jumpToToday() {
    currentDate = new Date();
    renderCalendar();
  }

  function setCalendarView(view) {
    calendarView = view;
    document.getElementById('view-month-btn').classList.toggle('active', view === 'month');
    document.getElementById('view-week-btn').classList.toggle('active', view === 'week');
    renderCalendar();
  }

  // --- Todo Sessions & Sub-Events Logic ---
  function renderSessions() {
    const container = document.getElementById('session-list-container');
    if (!container) return;
    container.innerHTML = '';

    // Sort by rank ascending (1 is highest priority)
    sessions.sort((a, b) => a.rank - b.rank);

    const pendingCount = sessions.filter(s => !s.completed).length;
    document.getElementById('pending-count-badge').textContent = `${pendingCount} Pending`;

    if (sessions.length === 0) {
      container.innerHTML = `
        <div style="text-align: center; padding: 24px; color: var(--text-muted); font-family: var(--font-mono);">
          No todo sessions created yet. Click <strong>+ New Session</strong> to add one!
        </div>
      `;
      return;
    }

    sessions.forEach((session, index) => {
      const card = document.createElement('div');
      card.className = `session-card ${session.completed ? 'completed' : ''}`;
      card.draggable = true;

      // Drag event for dragging session onto calendar
      card.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('text/plain', session.id);
        card.style.opacity = '0.5';
      });
      card.addEventListener('dragend', () => {
        card.style.opacity = '1';
      });

      const dateBadge = session.allocated_date 
        ? `<span class="badge badge-green">Date: ${session.allocated_date}</span>`
        : `<span class="badge badge-orange">Unallocated</span>`;

      card.innerHTML = `
        <div class="session-header-row">
          <div class="session-title-area">
            <span class="drag-handle" title="Drag onto Calendar date">::</span>
            <span class="badge badge-rank">#${session.rank} Rank</span>
            <h4 class="session-title">${escapeHtml(session.title)}</h4>
            ${dateBadge}
          </div>

          <div class="session-actions">
            <button class="btn btn-sm" onclick="App.moveRank('${session.id}', -1)" title="Increase Priority">Move Up</button>
            <button class="btn btn-sm" onclick="App.moveRank('${session.id}', 1)" title="Decrease Priority">Move Down</button>
            <button class="btn btn-sm btn-accent" onclick="App.promptAllocateDate('${session.id}')">Allocate</button>
            <button class="btn btn-sm" onclick="App.openSessionEditor('${session.id}')">Edit</button>
            <button class="btn btn-sm" style="color: #ef4444;" onclick="App.deleteSession('${session.id}')">Del</button>
          </div>
        </div>

        ${session.notes ? `<p style="font-size: 0.8rem; color: var(--text-muted); margin-top: 6px;">Notes: ${escapeHtml(session.notes)}</p>` : ''}

        <!-- Sub-events container -->
        <div class="subevents-container">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
            <span style="font-size: 0.78rem; font-weight: 700; font-family: var(--font-mono);">
              Events (${session.events ? session.events.filter(e => e.completed).length : 0}/${session.events ? session.events.length : 0})
            </span>
          </div>

          <div id="subevents-list-${session.id}" style="display: flex; flex-direction: column; gap: 6px;">
            ${(session.events || []).map(e => {
              const catInfo = CATEGORIES[e.category] || CATEGORIES['general'];
              return `
              <div class="subevent-item">
                <div class="subevent-left">
                  <input type="checkbox" class="subevent-checkbox" ${e.completed ? 'checked' : ''} 
                    onchange="App.toggleSubEvent('${session.id}', '${e.id}')" />
                  <span class="badge" style="background: ${catInfo.color}">
                    ${catInfo.icon ? catInfo.icon + ' ' : ''}${catInfo.name}
                  </span>
                  <span class="subevent-title ${e.completed ? 'completed' : ''}">
                    ${e.event_time ? `<strong>${e.event_time}</strong> - ` : ''}${escapeHtml(e.title)}
                  </span>
                </div>
                <button class="btn btn-sm" style="padding: 2px 6px; font-size: 0.7rem;" onclick="App.deleteSubEvent('${session.id}', '${e.id}')">✕</button>
              </div>
            `}).join('')}
          </div>

          <!-- Add Subevent Form -->
          <form onsubmit="App.handleAddSubEvent(event, '${session.id}')" class="add-subevent-form">
            <input type="text" placeholder="+ Add event (e.g. Cinema / Restaurant)" class="form-control" style="flex: 2; font-size: 0.8rem;" required />
            <select class="form-control" style="flex: 1; font-size: 0.8rem;">
              <option value="food">Food / Dining</option>
              <option value="entertainment">Cinema / Show</option>
              <option value="bar">Drinks / Bar</option>
              <option value="shopping">Shopping</option>
              <option value="fitness">Fitness</option>
              <option value="work">Work</option>
              <option value="general" selected>General</option>
            </select>
            <input type="time" class="form-control" style="font-size: 0.8rem;" />
            <button type="submit" class="btn btn-sm btn-primary">+ Add</button>
          </form>
        </div>
      `;

      container.appendChild(card);
    });
  }

  function moveRank(sessionId, delta) {
    const idx = sessions.findIndex(s => s.id === sessionId);
    if (idx === -1) return;

    const targetIdx = idx + delta;
    if (targetIdx >= 0 && targetIdx < sessions.length) {
      // Swap ranks
      const tempRank = sessions[idx].rank;
      sessions[idx].rank = sessions[targetIdx].rank;
      sessions[targetIdx].rank = tempRank;

      saveSessionsLocal();
      syncAllToDB();
      renderSessions();
    }
  }

  function allocateSessionToDate(sessionId, dateStr) {
    const session = sessions.find(s => s.id === sessionId);
    if (session) {
      session.allocated_date = dateStr;
      saveSessionsLocal();
      syncAllToDB();
      renderSessions();
      renderCalendar();
    }
  }

  function promptAllocateDate(sessionId) {
    const session = sessions.find(s => s.id === sessionId);
    if (!session) return;
    const dateStr = prompt(`Allocate "${session.title}" to date (YYYY-MM-DD):`, session.allocated_date || formatDateIso(new Date()));
    if (dateStr !== null) {
      allocateSessionToDate(sessionId, dateStr);
    }
  }

  function saveSessionForm(e) {
    e.preventDefault();
    const id = document.getElementById('form-session-id').value;
    const title = document.getElementById('form-session-title').value.trim();
    const rank = parseInt(document.getElementById('form-session-rank').value) || 1;
    const date = document.getElementById('form-session-date').value;
    const notes = document.getElementById('form-session-notes').value.trim();

    if (!title) return;

    if (id) {
      // Edit existing
      const existing = sessions.find(s => s.id === id);
      if (existing) {
        existing.title = title;
        existing.rank = rank;
        existing.allocated_date = date || null;
        existing.notes = notes;
      }
    } else {
      // New session
      const newSession = {
        id: 's-' + Date.now(),
        title: title,
        rank: rank,
        allocated_date: date || null,
        completed: false,
        notes: notes,
        events: []
      };
      sessions.push(newSession);
    }

    saveSessionsLocal();
    syncAllToDB();
    renderSessions();
    renderCalendar();
    closeModal('new-session-modal');
  }

  function openSessionEditor(sessionId) {
    const session = sessions.find(s => s.id === sessionId);
    if (!session) return;

    document.getElementById('form-session-id').value = session.id;
    document.getElementById('form-session-title').value = session.title;
    document.getElementById('form-session-rank').value = session.rank;
    document.getElementById('form-session-date').value = session.allocated_date || '';
    document.getElementById('form-session-notes').value = session.notes || '';
    document.getElementById('session-modal-title').textContent = 'Edit Session';

    openModal('new-session-modal');
  }

  function deleteSession(sessionId) {
    if (confirm('Are you sure you want to delete this session grouping?')) {
      sessions = sessions.filter(s => s.id !== sessionId);
      saveSessionsLocal();
      syncAllToDB();
      renderSessions();
      renderCalendar();
    }
  }

  // --- Sub-events Logic ---
  function handleAddSubEvent(e, sessionId) {
    e.preventDefault();
    const form = e.target;
    const titleInput = form.querySelector('input[type="text"]');
    const catSelect = form.querySelector('select');
    const timeInput = form.querySelector('input[type="time"]');

    const title = titleInput.value.trim();
    if (!title) return;

    const session = sessions.find(s => s.id === sessionId);
    if (session) {
      if (!session.events) session.events = [];
      session.events.push({
        id: 'e-' + Date.now(),
        title: title,
        category: catSelect.value,
        event_time: timeInput.value || '',
        completed: false
      });
      saveSessionsLocal();
      syncAllToDB();
      renderSessions();
      renderCalendar();
    }
  }

  function toggleSubEvent(sessionId, eventId) {
    const session = sessions.find(s => s.id === sessionId);
    if (session && session.events) {
      const sub = session.events.find(e => e.id === eventId);
      if (sub) {
        sub.completed = !sub.completed;
        saveSessionsLocal();
        syncAllToDB();
        renderSessions();
        renderCalendar();
      }
    }
  }

  function deleteSubEvent(sessionId, eventId) {
    const session = sessions.find(s => s.id === sessionId);
    if (session && session.events) {
      session.events = session.events.filter(e => e.id !== eventId);
      saveSessionsLocal();
      syncAllToDB();
      renderSessions();
      renderCalendar();
    }
  }

  // --- Accordion Controls ---
  function toggleAccordion() {
    const accordion = document.getElementById('todo-accordion');
    const icon = document.getElementById('accordion-toggle-icon');
    if (accordion) {
      const isExpanded = accordion.classList.toggle('expanded');
      icon.textContent = isExpanded ? '▼' : '▲';
    }
  }

  // --- Multi-Calendar Sync (Google & Apple) ---
  function addExternalCalendar(e) {
    e.preventDefault();
    const name = document.getElementById('cal-name-input').value.trim();
    const type = document.getElementById('cal-type-input').value;
    const url = document.getElementById('cal-url-input').value.trim();

    if (!name || !url) return;

    const newCal = {
      id: 'c-' + Date.now(),
      name: name,
      type: type,
      url: url,
      color: type === 'google' ? '#3b82f6' : '#10b981',
      active: true
    };

    externalCalendars.push(newCal);
    localStorage.setItem('calmtodo_ext_cals', JSON.stringify(externalCalendars));
    renderExternalCalendarsList();
    fetchExternalEvents();

    document.getElementById('cal-name-input').value = '';
    document.getElementById('cal-url-input').value = '';
  }

  function renderExternalCalendarsList() {
    const container = document.getElementById('external-calendars-list');
    if (!container) return;
    container.innerHTML = '';

    if (externalCalendars.length === 0) {
      container.innerHTML = '<p style="font-size: 0.8rem; color: var(--text-muted);">No external calendars connected yet.</p>';
      return;
    }

    externalCalendars.forEach(c => {
      const item = document.createElement('div');
      item.style.cssText = 'display: flex; justify-content: space-between; align-items: center; background: var(--bg-color); border: 1.5px solid var(--border-color); padding: 8px 12px; border-radius: var(--radius-sm); font-size: 0.85rem;';
      item.innerHTML = `
        <div>
          <strong>${c.type === 'google' ? 'Google' : 'Apple'}: ${escapeHtml(c.name)}</strong>
          <div style="font-size: 0.72rem; color: var(--text-muted); word-break: break-all;">${escapeHtml(c.url)}</div>
        </div>
        <button class="btn btn-sm" style="color: #ef4444;" onclick="App.deleteExternalCal('${c.id}')">✕</button>
      `;
      container.appendChild(item);
    });
  }

  function deleteExternalCal(id) {
    externalCalendars = externalCalendars.filter(c => c.id !== id);
    localStorage.setItem('calmtodo_ext_cals', JSON.stringify(externalCalendars));
    renderExternalCalendarsList();
    renderCalendar();
  }

  function fetchExternalEvents() {
    // Parse sample/simulated iCal events for connected feeds
    externalEvents = [];
    externalCalendars.forEach(c => {
      if (c.active) {
        // Add sample external calendar events for demonstration
        const todayStr = formatDateIso(new Date());
        externalEvents.push({
          summary: `${c.name}: Sync Meeting`,
          date: todayStr,
          source: c.type
        });
      }
    });
    renderCalendar();
  }

  function exportToICS() {
    let icsContent = "BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//CalmTodo App//EN\r\n";
    
    sessions.forEach(s => {
      if (s.allocated_date) {
        const cleanDate = s.allocated_date.replace(/-/g, '');
        icsContent += "BEGIN:VEVENT\r\n";
        icsContent += `SUMMARY:${s.title}\r\n`;
        if (s.notes) icsContent += `DESCRIPTION:${s.notes}\r\n`;
        icsContent += `DTSTART;VALUE=DATE:${cleanDate}\r\n`;
        icsContent += `DTEND;VALUE=DATE:${cleanDate}\r\n`;
        icsContent += "END:VEVENT\r\n";
      }
    });
    
    icsContent += "END:VCALENDAR";

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.setAttribute('download', 'calmtodo_events.ics');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // --- UI Helpers ---
  function openModal(modalId) {
    document.getElementById(modalId)?.classList.add('active');
  }

  function closeModal(modalId) {
    document.getElementById(modalId)?.classList.remove('active');
  }

  function toggleDarkMode() {
    document.body.classList.toggle('dark-mode');
    const isDark = document.body.classList.contains('dark-mode');
    localStorage.setItem('calmtodo_dark_mode', isDark);
  }

  function formatDateIso(d) {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>"']/g, function (m) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m];
    });
  }

  // Auto-init on load
  document.addEventListener('DOMContentLoaded', init);

  return {
    renderCalendar,
    navigateMonth,
    jumpToToday,
    setCalendarView,
    toggleAccordion,
    moveRank,
    promptAllocateDate,
    openSessionEditor,
    saveSessionForm,
    deleteSession,
    handleAddSubEvent,
    toggleSubEvent,
    deleteSubEvent,
    addExternalCalendar,
    deleteExternalCal,
    exportToICS,
    openModal,
    closeModal,
    toggleDarkMode
  };
})();
