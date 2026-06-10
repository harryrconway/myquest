/* ============================================================
   MYQUEST — scheduled-jobs.js
   Reads quote_requests WHERE status='scheduled' from Supabase
   ============================================================ */
(function () {
  'use strict';

  var jobs         = [];
  var filteredJobs = [];
  var viewingId    = null;

  function escHtml(str) {
    return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function fmtDate(str) {
    if (!str) return '—';
    try {
      var parts = str.split('-');
      var dt = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
      return dt.toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
    } catch (e) { return str; }
  }

  function fmtTime(str) {
    if (!str) return '—';
    try {
      var parts = str.split(':').map(Number);
      var h = parts[0], m = parts[1];
      var suffix = h < 12 ? 'am' : 'pm';
      return (h % 12 || 12) + ':' + String(m).padStart(2, '0') + suffix;
    } catch (e) { return str; }
  }

  function fmtServices(arr) {
    if (!arr || !arr.length) return '—';
    return arr.join(', ');
  }

  function getStaffNames(ids) {
    if (!ids || !ids.length) return '—';
    var staff = MQ.store.staff.getAll();
    return ids.map(function (id) {
      var s = staff.find(function (x) { return x.id === id; });
      return s ? s.name : id;
    }).join(', ');
  }

  /* ─── Role filter ───────────────────────────────────────────── */

  function filterForRole(all) {
    if (MQ.hasRole('manager')) return all;
    var userId = MQ.getCurrentUserId && MQ.getCurrentUserId();
    if (!userId) return all;
    return all.filter(function (j) {
      return j.assigned_staff_ids && j.assigned_staff_ids.indexOf(userId) !== -1;
    });
  }

  /* ─── Search / Count ────────────────────────────────────────── */

  function updateCount() {
    var el = document.getElementById('sj-count');
    if (el) el.textContent = filteredJobs.length + ' ' + (filteredJobs.length === 1 ? 'job' : 'jobs');
  }

  function filterAndRender(query) {
    var q = (query || '').toLowerCase().trim();
    filteredJobs = q ? jobs.filter(function (j) {
      return (j.full_name   || '').toLowerCase().indexOf(q) !== -1 ||
             (j.suburb      || '').toLowerCase().indexOf(q) !== -1 ||
             (j.state       || '').toLowerCase().indexOf(q) !== -1 ||
             (j.services    || []).join(' ').toLowerCase().indexOf(q) !== -1;
    }) : jobs.slice();
    updateCount();
    render(filteredJobs);
  }

  /* ─── Load ─────────────────────────────────────────────────── */

  async function load() {
    var wrap = document.getElementById('sj-table-wrap');
    wrap.innerHTML = '<div style="padding:40px;text-align:center;color:var(--color-light);">Loading…</div>';

    try {
      var { data, error } = await MQ.supabase
        .from('quote_requests')
        .select('*')
        .eq('status', 'scheduled')
        .order('scheduled_date', { ascending: true })
        .order('scheduled_time', { ascending: true });

      if (error) throw error;
      jobs = filterForRole(data || []);
      var searchEl = document.getElementById('sj-search');
      filterAndRender(searchEl ? searchEl.value : '');
    } catch (err) {
      wrap.innerHTML = '<div style="padding:40px;text-align:center;color:var(--color-error);">Failed to load jobs: ' + escHtml(err.message) + '</div>';
    }
  }

  /* ─── Render ────────────────────────────────────────────────── */

  function render(list) {
    var wrap = document.getElementById('sj-table-wrap');

    if (!list.length) {
      wrap.innerHTML = MQ.ui.emptyState(
        'M3 4h18v2H3V4zm0 4h18v2H3V8zm0 4h12v2H3v-2z',
        jobs.length ? 'No results found' : 'No scheduled jobs',
        jobs.length ? 'Try a different search term' : 'Accepted jobs will appear here'
      );
      return;
    }

    var isManager = MQ.hasRole('manager');
    var rows = list.map(function (j) {
      var address = [j.suburb, j.state].filter(Boolean).join(', ') || '—';
      return '<tr>' +
        '<td><strong>' + escHtml(fmtDate(j.scheduled_date)) + '</strong><br><span style="color:#6b7280;font-size:12px;">' + escHtml(fmtTime(j.scheduled_time)) + '</span></td>' +
        '<td>' + escHtml(j.full_name) + '</td>' +
        '<td>' + escHtml(address) + '</td>' +
        '<td>' + escHtml(fmtServices(j.services)) + '</td>' +
        '<td style="font-size:13px;">' + escHtml(getStaffNames(j.assigned_staff_ids)) + '</td>' +
        '<td>' +
          '<div class="dash-table__action-group">' +
            '<button class="action-btn action-btn--view" onclick="SJPage.view(\'' + j.id + '\')">View</button>' +
            (isManager ? '<button class="action-btn action-btn--edit" onclick="SJPage.openEdit(\'' + j.id + '\')">Edit</button>' : '') +
            (isManager ? '<button class="action-btn action-btn--complete" onclick="SJPage.markComplete(\'' + j.id + '\')">Complete</button>' : '') +
          '</div>' +
        '</td>' +
      '</tr>';
    }).join('');

    wrap.innerHTML =
      '<div style="overflow-x:auto;">' +
        '<table class="dash-table">' +
          '<thead><tr>' +
            '<th>Date &amp; Time</th><th>Client</th><th>Location</th><th>Services</th><th>Staff</th><th>Actions</th>' +
          '</tr></thead>' +
          '<tbody>' + rows + '</tbody>' +
        '</table>' +
      '</div>';
  }

  /* ─── View details ──────────────────────────────────────────── */

  function view(id) {
    var j = jobs.find(function (x) { return x.id === id; });
    if (!j) return;
    viewingId = id;

    function row(label, val) {
      if (!val && val !== 0) return '';
      return '<tr><td style="padding:7px 12px 7px 0;font-weight:600;color:#6b7280;width:160px;white-space:nowrap;vertical-align:top;">' +
        escHtml(label) + '</td><td style="padding:7px 0;color:#111827;">' + val + '</td></tr>';
    }

    var address = [j.street_address, j.suburb, j.state, j.postcode].filter(Boolean).join(', ');
    var html =
      '<table style="width:100%;border-collapse:collapse;font-size:14px;">' +
        row('Name',             escHtml(j.full_name)) +
        row('Phone',            '<a href="tel:' + escHtml(j.phone) + '">' + escHtml(j.phone) + '</a>') +
        row('Email',            '<a href="mailto:' + escHtml(j.email) + '">' + escHtml(j.email) + '</a>') +
        row('Address',          escHtml(address)) +
        row('Property type',    escHtml(j.property_type)) +
        row('Services',         escHtml(fmtServices(j.services))) +
        row('Frequency',        escHtml(j.frequency)) +
        row('Scheduled',        escHtml(fmtDate(j.scheduled_date) + ' at ' + fmtTime(j.scheduled_time))) +
        row('Staff',            escHtml(getStaffNames(j.assigned_staff_ids))) +
        row('Internal notes',   escHtml(j.internal_notes)) +
        row('Notes from client', escHtml(j.notes)) +
      '</table>';

    document.getElementById('sj-view-body').innerHTML = html;
    document.getElementById('sj-view-complete-btn').style.display = MQ.hasRole('manager') ? '' : 'none';
    MQ.ui.modal.open('modal-sj-view');
  }

  /* ─── Edit schedule ─────────────────────────────────────────── */

  function openEdit(id) {
    var j = jobs.find(function (x) { return x.id === id; });
    if (!j) return;
    viewingId = id;

    document.getElementById('sj-edit-id').value = id;
    document.getElementById('sj-edit-error').style.display = 'none';

    // Set date picker
    var dateHidden  = document.getElementById('sj-edit-date');
    var displayEl   = document.getElementById('sj-edit-date-display');
    if (j.scheduled_date) {
      dateHidden.value = j.scheduled_date;
      if (displayEl) {
        var d = new Date(j.scheduled_date + 'T00:00:00');
        displayEl.textContent = d.toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' });
        displayEl.classList.remove('cdp-display--placeholder');
      }
    } else {
      dateHidden.value = '';
      if (displayEl) {
        displayEl.textContent = 'Select a date';
        displayEl.classList.add('cdp-display--placeholder');
      }
    }

    // Set time pickers
    if (j.scheduled_time) {
      var parts = j.scheduled_time.split(':').map(Number);
      var hourEl = document.getElementById('sj-edit-time-hour');
      var minEl  = document.getElementById('sj-edit-time-min');
      if (hourEl) hourEl.value = String(parts[0]);
      if (minEl)  minEl.value  = parts[1] < 10 ? '0' + parts[1] : String(parts[1]);
      syncTimeHidden('sj-edit');
    }

    // Staff checkboxes
    var staff  = MQ.store.staff.getAll();
    var cbWrap = document.getElementById('sj-edit-staff-checkboxes');
    cbWrap.innerHTML = staff.length ? staff.map(function (s) {
      var checked = j.assigned_staff_ids && j.assigned_staff_ids.indexOf(s.id) !== -1;
      return '<label style="display:inline-flex;align-items:center;gap:6px;font-size:13px;padding:5px 10px;border:1.5px solid #e5e7eb;border-radius:6px;cursor:pointer;">' +
        '<input type="checkbox" value="' + escHtml(s.id) + '"' + (checked ? ' checked' : '') + '> ' + escHtml(s.name) +
      '</label>';
    }).join('') : '<span style="font-size:13px;color:#9ca3af;">No staff added yet</span>';

    MQ.ui.modal.open('modal-sj-edit');
  }

  async function submitEdit() {
    var id   = document.getElementById('sj-edit-id').value;
    var date = document.getElementById('sj-edit-date').value;
    var time = document.getElementById('sj-edit-time').value;
    var errEl = document.getElementById('sj-edit-error');

    if (!date || !time) {
      errEl.textContent = 'Date and time are required.';
      errEl.style.display = '';
      return;
    }

    var staffIds = Array.from(document.querySelectorAll('#sj-edit-staff-checkboxes input:checked'))
      .map(function (cb) { return cb.value; });

    var btn = document.getElementById('sj-edit-submit');
    btn.disabled    = true;
    btn.textContent = 'Saving…';

    try {
      var { error } = await MQ.supabase
        .from('quote_requests')
        .update({ scheduled_date: date, scheduled_time: time, assigned_staff_ids: staffIds, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;

      MQ.ui.modal.close('modal-sj-edit');
      MQ.ui.toast('Schedule updated');
      load();
    } catch (err) {
      errEl.textContent = err.message;
      errEl.style.display = '';
    } finally {
      btn.disabled    = false;
      btn.textContent = 'Save Changes';
    }
  }

  /* ─── Mark complete ─────────────────────────────────────────── */

  async function markComplete(id) {
    MQ.ui.confirmDelete('Mark this job as complete? A thank-you email will be sent to the customer.', async function () {
      try {
        var session = await MQ.supabase.auth.getSession();
        var token   = session.data.session && session.data.session.access_token;

        var res = await fetch('/api/complete-job', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
          body: JSON.stringify({ jobId: id }),
        });
        var data = await res.json();
        if (!data.success) throw new Error(data.error || 'Failed to complete job.');

        MQ.ui.modal.close('modal-sj-view');
        MQ.ui.toast('Job marked complete — thank-you email sent');
        window.location.href = 'completed-jobs.html';
      } catch (err) {
        MQ.ui.toast('Error: ' + err.message, 'error');
      }
    });
  }

  /* ─── Date Picker ───────────────────────────────────────────── */

  function initDatePicker(prefix) {
    var displayEl = document.getElementById(prefix + '-date-display');
    var hiddenEl  = document.getElementById(prefix + '-date');
    var dropEl    = document.getElementById(prefix + '-date-dropdown');
    var gridEl    = document.getElementById(prefix + '-date-grid');
    var labelEl   = document.getElementById(prefix + '-date-month-label');
    var prevBtn   = document.getElementById(prefix + '-date-prev');
    var nextBtn   = document.getElementById(prefix + '-date-next');

    if (!displayEl) return;

    var today     = new Date();
    today.setHours(0, 0, 0, 0);
    var viewYear  = today.getFullYear();
    var viewMonth = today.getMonth();
    var selectedDate = null;

    var MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    var DNAMES = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

    function pad(n) { return n < 10 ? '0' + n : '' + n; }

    function renderGrid() {
      labelEl.textContent = MONTHS[viewMonth] + ' ' + viewYear;
      var cells = '';
      DNAMES.forEach(function (d) {
        cells += '<div class="cdp-cell cdp-cell--header">' + d + '</div>';
      });
      var first = new Date(viewYear, viewMonth, 1).getDay();
      var daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
      var daysInPrev  = new Date(viewYear, viewMonth, 0).getDate();
      for (var i = 0; i < first; i++) {
        cells += '<div class="cdp-cell cdp-cell--other">' + (daysInPrev - first + 1 + i) + '</div>';
      }
      for (var day = 1; day <= daysInMonth; day++) {
        var thisDate = new Date(viewYear, viewMonth, day);
        var isToday  = thisDate.getTime() === today.getTime();
        var isSel    = selectedDate && thisDate.getTime() === selectedDate.getTime();
        var cls      = 'cdp-cell' + (isToday ? ' cdp-cell--today' : '') + (isSel ? ' cdp-cell--selected' : '');
        cells += '<div class="' + cls + '" data-date="' + viewYear + '-' + pad(viewMonth + 1) + '-' + pad(day) + '">' + day + '</div>';
      }
      var trail = (7 - ((first + daysInMonth) % 7)) % 7;
      for (var t = 1; t <= trail; t++) {
        cells += '<div class="cdp-cell cdp-cell--other">' + t + '</div>';
      }
      gridEl.innerHTML = cells;
      gridEl.querySelectorAll('.cdp-cell[data-date]').forEach(function (el) {
        el.addEventListener('click', function () {
          var val = this.dataset.date;
          hiddenEl.value   = val;
          selectedDate     = new Date(val + 'T00:00:00');
          displayEl.textContent = selectedDate.toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' });
          displayEl.classList.remove('cdp-display--placeholder');
          dropEl.hidden = true;
          renderGrid();
        });
      });
    }

    displayEl.addEventListener('click', function (e) {
      e.stopPropagation();
      dropEl.hidden = !dropEl.hidden;
      if (!dropEl.hidden) renderGrid();
    });
    displayEl.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); dropEl.hidden = !dropEl.hidden; if (!dropEl.hidden) renderGrid(); }
    });
    prevBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      viewMonth--; if (viewMonth < 0) { viewMonth = 11; viewYear--; } renderGrid();
    });
    nextBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      viewMonth++; if (viewMonth > 11) { viewMonth = 0; viewYear++; } renderGrid();
    });
    document.addEventListener('click', function (e) {
      var picker = document.getElementById(prefix + '-date-picker');
      if (picker && !picker.contains(e.target)) dropEl.hidden = true;
    });
  }

  /* ─── Time Picker ───────────────────────────────────────────── */

  function initTimePicker(hourId, minId, hiddenId) {
    var hourEl   = document.getElementById(hourId);
    var minEl    = document.getElementById(minId);
    var hiddenEl = document.getElementById(hiddenId);
    if (!hourEl) return;

    var HOURS = [
      {v:'6',l:'6:00 am'},{v:'7',l:'7:00 am'},{v:'8',l:'8:00 am'},{v:'9',l:'9:00 am'},
      {v:'10',l:'10:00 am'},{v:'11',l:'11:00 am'},{v:'12',l:'12:00 pm'},{v:'13',l:'1:00 pm'},
      {v:'14',l:'2:00 pm'},{v:'15',l:'3:00 pm'},{v:'16',l:'4:00 pm'},{v:'17',l:'5:00 pm'},
      {v:'18',l:'6:00 pm'},{v:'19',l:'7:00 pm'},{v:'20',l:'8:00 pm'},
    ];
    hourEl.innerHTML = HOURS.map(function (h) {
      return '<option value="' + h.v + '">' + h.l + '</option>';
    }).join('');
    hourEl.value = '8';

    function sync() {
      var h = parseInt(hourEl.value);
      var m = minEl ? minEl.value : '00';
      if (hiddenEl) hiddenEl.value = (h < 10 ? '0' + h : '' + h) + ':' + m;
    }
    hourEl.addEventListener('change', sync);
    if (minEl) minEl.addEventListener('change', sync);
    sync();
  }

  function syncTimeHidden(prefix) {
    var hourEl   = document.getElementById(prefix + '-time-hour');
    var minEl    = document.getElementById(prefix + '-time-min');
    var hiddenEl = document.getElementById(prefix + '-time');
    if (!hourEl || !hiddenEl) return;
    var h = parseInt(hourEl.value);
    var m = minEl ? minEl.value : '00';
    hiddenEl.value = (h < 10 ? '0' + h : '' + h) + ':' + m;
  }

  /* ─── Init ──────────────────────────────────────────────────── */

  document.addEventListener('mq:ready', function () {
    load();
    document.getElementById('btn-refresh').addEventListener('click', load);
    document.getElementById('sj-edit-submit').addEventListener('click', submitEdit);
    document.getElementById('sj-view-complete-btn').addEventListener('click', function () {
      if (viewingId) markComplete(viewingId);
    });

    var searchEl = document.getElementById('sj-search');
    if (searchEl) searchEl.addEventListener('input', function () { filterAndRender(this.value); });

    initDatePicker('sj-edit');
    initTimePicker('sj-edit-time-hour', 'sj-edit-time-min', 'sj-edit-time');
  });

  window.SJPage = { view: view, openEdit: openEdit, markComplete: markComplete };
})();
