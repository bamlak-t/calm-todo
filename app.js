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

  let currentPage = 1;
  const itemsPerPage = 10;
  let searchQuery = '';

  // Hardcoded Supabase Config (from User Request)
  const supabaseUrl = 'https://ipiuhnopkycycirspeky.supabase.co';
  const supabaseKey = 'sb_publishable_19qI3Xe4m37bws_bn6l4pw_KKitS2FN';

  // Category Color Map & Icons (Emojis removed per user request)
  const CATEGORIES = {
    'food-drink': { name: 'Food / Drink', icon: '', color: 'var(--accent-yellow)' },
    entertainment: { name: 'Cinema / Show', icon: '', color: 'var(--accent-blue)' },
    shopping: { name: 'Shopping', icon: '', color: 'var(--accent-orange)' },
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
    fetchExternalEvents();
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
      sessions = [];
      saveSessionsLocal();
    }

    const localCals = localStorage.getItem('calmtodo_ext_cals');
    if (localCals) {
      externalCalendars = JSON.parse(localCals);
    } else {
      externalCalendars = [];
    }
  }

  function loadSessionsFromLocal() {
    const local = localStorage.getItem('calmtodo_sessions');
    if (local) {
      sessions = JSON.parse(local);
      ensureInboxExists();
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
              location: e.location || '',
              completed: e.completed
            }))
        }));
        ensureInboxExists();
        saveSessionsLocal();
        renderSessions();
        renderCalendar();
      } else {
        // DB empty
        ensureInboxExists();
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
        // If it's a locally generated ID (e.g. 's-12345...'), let Supabase generate a UUID
        const isNewSession = typeof s.id === 'string' && s.id.startsWith('s-') && s.id.length < 30;

        const { data: upsertedSession, error: sessionErr } = await supabaseClient.from('todo_sessions').upsert({
          id: isNewSession ? undefined : s.id,
          title: s.title,
          rank: s.rank,
          allocated_date: s.allocated_date || null,
          completed: s.completed,
          notes: s.notes
        }).select().single();

        if (sessionErr) throw sessionErr;

        // Update local id to the DB UUID to prevent future duplicates or deletion failures
        if (isNewSession && upsertedSession) {
          s.id = upsertedSession.id;
        }

        // Sync events for this session
        if (s.events) {
          for (const ev of s.events) {
            const isNewEvent = typeof ev.id === 'string' && ev.id.startsWith('e-') && ev.id.length < 30;
            const { data: upsertedEv } = await supabaseClient.from('session_events').upsert({
              id: isNewEvent ? undefined : ev.id,
              session_id: s.id,
              title: ev.title,
              category: ev.category,
              event_time: ev.event_time || null,
              location: ev.location || '',
              completed: ev.completed
            }).select().single();

            if (isNewEvent && upsertedEv) {
              ev.id = upsertedEv.id;
            }
          }
        }
      }
      saveSessionsLocal(); // Save the new UUIDs locally
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

  function handleSearch(query) {
    searchQuery = query.toLowerCase();
    currentPage = 1;
    renderSessions();
  }

  function changePage(delta) {
    currentPage += delta;
    renderSessions();
  }

  function ensureInboxExists() {
    let inbox = sessions.find(s => s.title === 'Inbox (Unplanned)');
    if (!inbox) {
      inbox = {
        id: 's-' + Date.now(),
        title: 'Inbox (Unplanned)',
        rank: 9999,
        allocated_date: null,
        completed: false,
        notes: 'Loose tasks go here. Move them to a planned session later.',
        events: []
      };
      sessions.push(inbox);
    }
  }

  // --- Core Rendering ---& Sub-Events Logic ---
  function renderSessions() {
    const container = document.getElementById('session-list-container');
    if (!container) return;
    container.innerHTML = '';

    // Sort by rank ascending (1 is highest priority)
    sessions.sort((a, b) => a.rank - b.rank);

    const pendingCount = sessions.filter(s => !s.completed).length;
    document.getElementById('pending-count-badge').textContent = `${pendingCount} Pending`;

    let filteredSessions = sessions;
    if (searchQuery) {
      filteredSessions = sessions.filter(s =>
        s.title.toLowerCase().includes(searchQuery) ||
        (s.notes && s.notes.toLowerCase().includes(searchQuery)) ||
        (s.events && s.events.some(e => e.title.toLowerCase().includes(searchQuery)))
      );
    }

    const totalPages = Math.ceil(filteredSessions.length / itemsPerPage) || 1;
    if (currentPage > totalPages) currentPage = totalPages;
    if (currentPage < 1) currentPage = 1;

    const pageInd = document.getElementById('page-indicator');
    if (pageInd) pageInd.textContent = `Page ${currentPage} of ${totalPages}`;
    const btnPrev = document.getElementById('btn-prev-page');
    if (btnPrev) btnPrev.disabled = currentPage === 1;
    const btnNext = document.getElementById('btn-next-page');
    if (btnNext) btnNext.disabled = currentPage === totalPages;

    const paginatedSessions = filteredSessions.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    if (paginatedSessions.length === 0) {
      container.innerHTML = `
        <div style="text-align: center; padding: 24px; color: var(--text-muted); font-family: var(--font-mono);">
          No todo sessions created yet. Click <strong>+ New Session</strong> to add one!
        </div>
      `;
      return;
    }

    paginatedSessions.forEach((session, index) => {
      const card = document.createElement('div');
      card.className = `session-card ${session.completed ? 'completed' : ''}`;
      // Remove drag/drop attributes from the wrapper

      const isInbox = session.title === 'Inbox (Unplanned)';

      const dateBadge = isInbox ? '' : (session.allocated_date
        ? `<span class="badge badge-green">${session.allocated_date}</span>`
        : `<span class="badge badge-orange">Unallocated</span>`);

      card.innerHTML = `
        <div class="session-header-row">
          <div class="session-title-area">
            <h4 class="session-title ${session.completed ? 'completed' : ''}">${escapeHtml(session.title)}</h4>
            ${dateBadge}
          </div>
          <div class="session-actions">
            ${isInbox ? '' : `
              <button class="btn btn-sm" onclick="App.moveRank('${session.id}', -1)" title="Move Up">▲</button>
              <button class="btn btn-sm" onclick="App.moveRank('${session.id}', 1)" title="Move Down">▼</button>
              <button class="btn btn-sm" onclick="App.openSessionEditor('${session.id}')">Edit</button>
              <button class="btn btn-sm btn-outline" style="color: var(--accent-red); border-color: var(--accent-red);" onclick="App.deleteSession('${session.id}')" title="Delete">✕</button>
            `}
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
        const locationBadge = e.location ? `<a href="${e.location.startsWith('http') ? e.location : '#'}" target="_blank" class="badge" style="background: var(--bg-color); font-size: 0.65rem; border: 1px solid var(--text-muted); text-decoration: none; color: var(--text-muted); cursor: pointer;" title="${escapeHtml(e.location)}">📍 ${e.location.startsWith('http') ? 'Map' : escapeHtml(e.location)}</a>` : '';
        const displayTime = e.event_time ? e.event_time.substring(0, 5) : '';
        return `
              <div class="subevent-item">
                <div class="subevent-left">
                  <input type="checkbox" class="subevent-checkbox" ${e.completed ? 'checked' : ''} 
                    onchange="App.toggleSubEvent('${session.id}', '${e.id}')" />
                  <span class="badge category-badge" style="background: ${catInfo.color}">
                    <span class="badge-full">${catInfo.icon ? catInfo.icon + ' ' : ''}${catInfo.name}</span>
                    <span class="badge-short">${catInfo.icon ? catInfo.icon + ' ' : ''}${catInfo.name.charAt(0)}</span>
                  </span>
                  <span class="subevent-title ${e.completed ? 'completed' : ''}" style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                    ${displayTime ? `<strong>${displayTime}</strong> - ` : ''}${escapeHtml(e.title)}
                  </span>
                  ${locationBadge}
                </div>
                <div style="display: flex; gap: 4px; align-items: center; flex-shrink: 0;">
                  <button class="btn btn-sm" style="padding: 2px 6px; font-size: 0.7rem;" onclick="App.moveSubEvent('${session.id}', '${e.id}')" title="Move">➔</button>
                  ${session.title !== 'Inbox (Unplanned)' ? `
                    <button class="btn btn-sm" style="padding: 2px 6px; font-size: 0.7rem;" onclick="App.editSubEvent('${session.id}', '${e.id}')" title="Edit">&#9998;</button>
                    <button class="btn btn-sm" style="padding: 2px 6px; font-size: 0.7rem;" onclick="App.deleteSubEvent('${session.id}', '${e.id}')" title="Delete">✕</button>
                  ` : ''}
                </div>
              </div>
            `}).join('')}
          </div>

          <!-- Add Subevent Form -->
          <form onsubmit="App.handleAddSubEvent(event, '${session.id}')" class="add-subevent-form" style="align-items: center;">
            <input type="text" placeholder="Event description..." class="form-control" style="flex: 2; font-size: 0.8rem;" required />
            <div class="category-pills" data-selected="general">
              ${Object.entries(CATEGORIES).map(([key, cat]) => `<button type="button" class="cat-pill ${key === 'general' ? 'active' : ''}" data-cat="${key}" style="--pill-color: ${cat.color}" onclick="App.selectCategoryPill(this)">${cat.name}</button>`).join('')}
            </div>
            <input type="time" class="form-control" style="font-size: 0.8rem;" required />
            <input type="text" placeholder="Location link..." class="form-control location-input" style="flex: 1; font-size: 0.8rem;" />
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

  function toggleNewItemType() {
    const type = document.querySelector('input[name="new_item_type"]:checked').value;
    if (type === 'session') {
      document.getElementById('new-session-fields').style.display = 'block';
      document.getElementById('new-event-fields').style.display = 'none';
      document.getElementById('btn-save-new-item').textContent = 'Save Session';
      document.getElementById('form-session-title').required = true;
      document.getElementById('new-event-title').required = false;
    } else {
      document.getElementById('new-session-fields').style.display = 'none';
      document.getElementById('new-event-fields').style.display = 'block';
      document.getElementById('btn-save-new-item').textContent = 'Save Event';
      document.getElementById('form-session-title').required = false;
      document.getElementById('new-event-title').required = true;
    }
  }

  function openNewItemModal() {
    document.getElementById('form-session-id').value = '';
    document.getElementById('form-session-title').value = '';
    document.getElementById('form-session-rank').value = '1';
    document.getElementById('form-session-date').value = '';
    document.getElementById('form-session-notes').value = '';
    
    document.getElementById('new-event-title').value = '';
    document.getElementById('new-event-time').value = '';
    document.getElementById('new-event-location').value = '';
    
    document.getElementById('session-modal-title').textContent = 'Create New...';
    document.getElementById('new-item-type-toggle').style.display = 'flex';
    document.querySelector('input[name="new_item_type"][value="event"]').checked = true;
    
    // Populate dropdown
    const select = document.getElementById('new-event-target-session');
    select.innerHTML = sessions.map(s => `<option value="${s.id}">${escapeHtml(s.title)}</option>`).join('');
    const inbox = sessions.find(s => s.title === 'Inbox (Unplanned)');
    if (inbox) select.value = inbox.id;

    // Populate category pills
    const catContainer = document.getElementById('new-event-category-pills');
    catContainer.innerHTML = Object.entries(CATEGORIES).map(([key, cat]) =>
      `<button type="button" class="cat-pill ${key === 'general' ? 'active' : ''}" data-cat="${key}" onclick="App.selectCategoryPill(this)" style="background-color: ${cat.color}">
         ${cat.icon ? cat.icon + ' ' : ''}${cat.name}
       </button>`
    ).join('');
    catContainer.dataset.selected = 'general';

    toggleNewItemType();
    openModal('new-session-modal');
  }

  function saveSessionForm(e) {
    e.preventDefault();
    const id = document.getElementById('form-session-id').value;
    const type = document.querySelector('input[name="new_item_type"]:checked').value;

    if (type === 'event' && !id) {
      const targetSessionId = document.getElementById('new-event-target-session').value;
      const targetSession = sessions.find(s => s.id === targetSessionId);
      if (!targetSession) return;
      
      const newEvent = {
        id: 'e-' + Date.now(),
        title: document.getElementById('new-event-title').value.trim(),
        category: document.getElementById('new-event-category-pills').dataset.selected || 'general',
        completed: false,
        event_time: document.getElementById('new-event-time').value ? document.getElementById('new-event-time').value + ':00' : null,
        location: document.getElementById('new-event-location').value.trim()
      };
      
      if (!targetSession.events) targetSession.events = [];
      targetSession.events.push(newEvent);
      
      saveSessionsLocal();
      syncAllToDB();
      renderSessions();
      renderCalendar();
      closeModal('new-session-modal');
      return;
    }

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
    
    // Hide toggle since we are editing a session
    document.getElementById('new-item-type-toggle').style.display = 'none';
    const sessionRadio = document.querySelector('input[name="new_item_type"][value="session"]');
    if (sessionRadio) sessionRadio.checked = true;
    toggleNewItemType();

    openModal('new-session-modal');
  }

  async function deleteSession(sessionId) {
    if (confirm('Are you sure you want to delete this session grouping?')) {
      // Optimistically update UI
      sessions = sessions.filter(s => s.id !== sessionId);
      saveSessionsLocal();
      renderSessions();
      renderCalendar();

      // If connected to Supabase, try to delete from DB regardless of ID format
      if (supabaseClient) {
        try {
          // 1. Delete child sub-events first to avoid Postgres foreign key constraint errors
          await supabaseClient.from('session_events').delete().eq('session_id', sessionId);
          // 2. Delete the parent session
          const { error } = await supabaseClient.from('todo_sessions').delete().eq('id', sessionId);
          if (error) console.error('Failed to delete session in DB', error);
        } catch (err) {
          console.error('Error during DB deletion', err);
        }
      }

      syncAllToDB();
    }
  }

  // --- Sub-events Logic ---
  function handleAddSubEvent(e, sessionId) {
    e.preventDefault();
    const form = e.target;
    const titleInput = form.querySelector('input[type="text"]');
    const pillsContainer = form.querySelector('.category-pills');
    const timeInput = form.querySelector('input[type="time"]');
    const locationInput = form.querySelector('.location-input');

    const title = titleInput.value.trim();
    if (!title) return;

    const category = pillsContainer ? pillsContainer.dataset.selected : 'general';

    const session = sessions.find(s => s.id === sessionId);
    if (session) {
      if (!session.events) session.events = [];
      session.events.push({
        id: 'e-' + Date.now(),
        title: title,
        category: category,
        event_time: timeInput.value || '',
        location: locationInput ? locationInput.value.trim() : '',
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

  function editSubEvent(sessionId, eventId) {
    const session = sessions.find(s => s.id === sessionId);
    if (!session || !session.events) return;
    const sub = session.events.find(e => e.id === eventId);
    if (!sub) return;

    document.getElementById('edit-subevent-session-id').value = sessionId;
    document.getElementById('edit-subevent-id').value = eventId;
    document.getElementById('edit-subevent-title').value = sub.title;
    document.getElementById('edit-subevent-time').value = sub.event_time ? sub.event_time.substring(0, 5) : '';
    document.getElementById('edit-subevent-location').value = sub.location || '';

    const catContainer = document.getElementById('edit-subevent-category');
    catContainer.innerHTML = Object.entries(CATEGORIES).map(([key, cat]) =>
      `<button type="button" class="cat-pill ${sub.category === key ? 'active' : ''}" data-cat="${key}" onclick="App.selectCategoryPill(this)" style="background-color: ${cat.color}">
         ${cat.icon ? cat.icon + ' ' : ''}${cat.name}
       </button>`
    ).join('');
    catContainer.dataset.selected = sub.category || 'general';

    openModal('edit-subevent-modal');
  }

  function saveSubEventForm(e) {
    e.preventDefault();
    const sessionId = document.getElementById('edit-subevent-session-id').value;
    const eventId = document.getElementById('edit-subevent-id').value;

    const session = sessions.find(s => s.id === sessionId);
    if (!session || !session.events) return;
    const sub = session.events.find(ev => ev.id === eventId);
    if (!sub) return;

    sub.title = document.getElementById('edit-subevent-title').value.trim();
    sub.category = document.getElementById('edit-subevent-category').dataset.selected || 'general';
    const timeVal = document.getElementById('edit-subevent-time').value;
    sub.event_time = timeVal ? timeVal + ':00' : null;
    sub.location = document.getElementById('edit-subevent-location').value.trim();

    closeModal('edit-subevent-modal');
    saveSessionsLocal();
    syncAllToDB();
    renderSessions();
    renderCalendar();
  }

  async function deleteSubEvent(sessionId, eventId) {
    if (!confirm('Are you sure you want to delete this event?')) return;

    const session = sessions.find(s => s.id === sessionId);
    if (session && session.events) {
      // Optimistically update UI
      session.events = session.events.filter(e => e.id !== eventId);
      saveSessionsLocal();
      renderSessions();
      renderCalendar();

      // Delete from DB if connected
      if (supabaseClient) {
        try {
          const { error } = await supabaseClient.from('session_events').delete().eq('id', eventId);
          if (error) console.error('Failed to delete event in DB', error);
        } catch (err) {
          console.error('Error during event deletion', err);
        }
      }

      syncAllToDB();
    }
  }

  function moveSubEvent(sessionId, eventId) {
    const session = sessions.find(s => s.id === sessionId);
    if (!session || !session.events) return;

    const subEventIndex = session.events.findIndex(e => e.id === eventId);
    if (subEventIndex === -1) return;
    const subEvent = session.events[subEventIndex];

    const targetSessions = sessions.filter(s => s.id !== sessionId);
    if (targetSessions.length === 0) {
      alert("No other sessions to move this event to.");
      return;
    }

    document.getElementById('move-subevent-session-id').value = sessionId;
    document.getElementById('move-subevent-id').value = eventId;

    const optionsContainer = document.getElementById('move-subevent-options');
    optionsContainer.innerHTML = targetSessions.map((s, idx) => `
      <label style="display: flex; align-items: center; gap: 8px; padding: 8px; background: var(--bg-color); border: 1px solid var(--border-color); border-radius: 8px; cursor: pointer;">
        <input type="radio" name="move-target" value="${s.id}" ${idx === 0 ? 'checked' : ''} />
        <span style="font-weight: 500;">${escapeHtml(s.title)}</span>
      </label>
    `).join('');

    openModal('move-subevent-modal');
  }

  async function saveMoveSubEvent(e) {
    e.preventDefault();
    const sessionId = document.getElementById('move-subevent-session-id').value;
    const eventId = document.getElementById('move-subevent-id').value;
    const targetSessionId = document.querySelector('input[name="move-target"]:checked')?.value;

    if (!targetSessionId) return;

    const session = sessions.find(s => s.id === sessionId);
    const targetSession = sessions.find(s => s.id === targetSessionId);
    if (!session || !targetSession) return;

    const subEventIndex = session.events.findIndex(ev => ev.id === eventId);
    if (subEventIndex === -1) return;
    const subEvent = session.events[subEventIndex];

    // Remove from old, add to new
    session.events.splice(subEventIndex, 1);
    if (!targetSession.events) targetSession.events = [];
    targetSession.events.push(subEvent);

    closeModal('move-subevent-modal');
    saveSessionsLocal();
    renderSessions();
    renderCalendar();

    // Update DB
    if (supabaseClient) {
      try {
        const { error } = await supabaseClient
          .from('session_events')
          .update({ session_id: targetSession.id })
          .eq('id', eventId);
        if (error) console.error("Failed to move event in DB", error);
      } catch (err) {
        console.error("Error moving event", err);
      }
    }

    syncAllToDB();
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

  function selectCategoryPill(btn) {
    const container = btn.closest('.category-pills');
    container.querySelectorAll('.cat-pill').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    container.dataset.selected = btn.dataset.cat;
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

  async function fetchExternalEvents() {
    externalEvents = [];
    const activeCals = externalCalendars.filter(c => c.active);
    if (activeCals.length === 0) {
      renderCalendar();
      return;
    }

    try {
      for (const cal of activeCals) {
        // We will call our Supabase Edge Function Proxy to fetch & parse the .ics safely
        // bypassing browser CORS restrictions.
        const proxyUrl = `${supabaseUrl}/functions/v1/ical-proxy?url=${encodeURIComponent(cal.url)}`;
        const res = await fetch(proxyUrl);

        if (!res.ok) {
          console.error(`Failed to fetch calendar ${cal.name}: ${res.status}`);
          continue;
        }

        const events = await res.json();
        // The edge function will return [{ summary, date: 'YYYY-MM-DD', source: 'google' }, ...]
        if (Array.isArray(events)) {
          events.forEach(e => {
            externalEvents.push({
              summary: `${cal.name}: ${e.summary}`,
              date: e.date,
              source: cal.type
            });
          });
        }
      }
    } catch (err) {
      console.error('Error fetching external calendars', err);
    }

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
    handleSearch,
    changePage,
    renderCalendar,
    navigateMonth,
    jumpToToday,
    setCalendarView,
    toggleAccordion,
    moveRank,
    promptAllocateDate,
    openSessionEditor,
    toggleNewItemType,
    openNewItemModal,
    saveSessionForm,
    deleteSession,
    handleAddSubEvent,
    selectCategoryPill,
    toggleSubEvent,
    editSubEvent,
    saveSubEventForm,
    deleteSubEvent,
    moveSubEvent,
    saveMoveSubEvent,
    addExternalCalendar,
    deleteExternalCal,
    exportToICS,
    openModal,
    closeModal,
    toggleDarkMode
  };
})();
