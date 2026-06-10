/* ============================================================
   MYQUEST — unscheduled-jobs.js
   Reads quote_requests WHERE status='unscheduled' from Supabase
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
      var d = new Date(str);
      return d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch (e) { return str; }
  }

  function fmtServices(arr) {
    if (!arr || !arr.length) return '—';
    return arr.join(', ');
  }

  /* ─── Search / Count ────────────────────────────────────────── */

  function updateCount() {
    var el = document.getElementById('uj-count');
    if (el) el.textContent = filteredJobs.length + ' ' + (filteredJobs.length === 1 ? 'request' : 'requests');
  }

  function filterAndRender(query) {
    var q = (query || '').toLowerCase().trim();
    filteredJobs = q ? jobs.filter(function (j) {
      return (j.full_name   || '').toLowerCase().indexOf(q) !== -1 ||
             (j.suburb      || '').toLowerCase().indexOf(q) !== -1 ||
             (j.state       || '').toLowerCase().indexOf(q) !== -1 ||
             (j.services    || []).join(' ').toLowerCase().indexOf(q) !== -1 ||
             (j.property_type || '').toLowerCase().indexOf(q) !== -1;
    }) : jobs.slice();
    updateCount();
    render(filteredJobs);
  }

  /* ─── Load ─────────────────────────────────────────────────── */

  async function load() {
    var wrap = document.getElementById('uj-table-wrap');
    wrap.innerHTML = '<div style="padding:40px;text-align:center;color:var(--color-light);">Loading…</div>';

    try {
      var { data, error } = await MQ.supabase
        .from('quote_requests')
        .select('*')
        .eq('status', 'unscheduled')
        .order('created_at', { ascending: false });

      if (error) throw error;
      jobs = data || [];
      var searchEl = document.getElementById('uj-search');
      filterAndRender(searchEl ? searchEl.value : '');
    } catch (err) {
      wrap.innerHTML = '<div style="padding:40px;text-align:center;color:var(--color-error);">Failed to load jobs: ' + escHtml(err.message) + '</div>';
    }
  }

  /* ─── Render ────────────────────────────────────────────────── */

  function render(list) {
    var wrap = document.getElementById('uj-table-wrap');

    if (!list.length) {
      wrap.innerHTML = MQ.ui.emptyState(
        'M22 12h-4l-3 9L9 3l-3 9H2',
        jobs.length ? 'No results found' : 'No unscheduled jobs',
        jobs.length ? 'Try a different search term' : 'New quote requests will appear here'
      );
      return;
    }

    var rows = list.map(function (j) {
      var address = [j.suburb, j.state].filter(Boolean).join(', ') || '—';
      return '<tr>' +
        '<td><strong>' + escHtml(j.full_name) + '</strong></td>' +
        '<td>' + escHtml(address) + '</td>' +
        '<td><a href="tel:' + escHtml(j.phone) + '">' + escHtml(j.phone) + '</a></td>' +
        '<td>' + escHtml(fmtServices(j.services)) + '</td>' +
        '<td><span class="badge badge--blue">' + escHtml(j.property_type || '—') + '</span></td>' +
        '<td style="color:#6b7280;font-size:13px;">' + escHtml(fmtDate(j.created_at)) + '</td>' +
        '<td>' +
          '<div class="dash-table__action-group">' +
            '<button class="action-btn action-btn--view" onclick="UJPage.view(\'' + j.id + '\')">View</button>' +
            '<button class="action-btn action-btn--accept" onclick="UJPage.openAccept(\'' + j.id + '\')">Schedule</button>' +
            '<button class="action-btn action-btn--archive" title="Archive" onclick="UJPage.archive(\'' + j.id + '\')">Archive</button>' +
          '</div>' +
        '</td>' +
      '</tr>';
    }).join('');

    wrap.innerHTML =
      '<div style="overflow-x:auto;">' +
        '<table class="dash-table">' +
          '<thead><tr>' +
            '<th>Name</th><th>Location</th><th>Phone</th><th>Services</th><th>Property</th><th>Submitted</th><th>Actions</th>' +
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
    var extras  = j.extras  && j.extras.length  ? j.extras.join(', ')  : null;
    var days    = j.preferred_days && j.preferred_days.length ? j.preferred_days.join(', ') : null;

    var html =
      '<table style="width:100%;border-collapse:collapse;font-size:14px;">' +
        row('Name',             escHtml(j.full_name)) +
        row('Phone',            '<a href="tel:' + escHtml(j.phone) + '">' + escHtml(j.phone) + '</a>') +
        row('Email',            '<a href="mailto:' + escHtml(j.email) + '">' + escHtml(j.email) + '</a>') +
        row('Preferred contact', escHtml(j.preferred_contact)) +
        row('Address',          escHtml(address)) +
        row('Access notes',     escHtml(j.access_instructions)) +
        row('Property type',    escHtml(j.property_type)) +
        row('Bedrooms',         j.bedrooms) +
        row('Bathrooms',        j.bathrooms) +
        row('Living areas',     j.living_areas) +
        row('Floor area',       j.floor_area_sqm ? j.floor_area_sqm + ' sqm' : null) +
        row('Services',         escHtml(fmtServices(j.services))) +
        row('Frequency',        escHtml(j.frequency)) +
        row('Condition',        escHtml(j.condition)) +
        row('Extras',           extras ? escHtml(extras) : null) +
        row('Preferred days',   days ? escHtml(days) : null) +
        row('Preferred time',   escHtml(j.preferred_time)) +
        row('Flexible schedule', j.flexible_schedule ? 'Yes' : null) +
        row('Notes',            escHtml(j.notes)) +
        row('Submitted',        escHtml(fmtDate(j.created_at))) +
      '</table>';

    document.getElementById('uj-view-body').innerHTML = html;
    MQ.ui.modal.open('modal-uj-view');
  }

  /* ─── Accept / Schedule ─────────────────────────────────────── */

  function openAccept(id) {
    viewingId = id;
    document.getElementById('uj-accept-id').value = id;
    document.getElementById('uj-date').value  = '';
    document.getElementById('uj-time').value  = '';
    document.getElementById('uj-notes').value = '';
    document.getElementById('uj-accept-error').style.display = 'none';

    // Reset date picker display
    var displayEl = document.getElementById('uj-date-display');
    if (displayEl) {
      displayEl.textContent = 'Select a date';
      displayEl.classList.add('cdp-display--placeholder');
    }
    // Reset time pickers
    var hourEl = document.getElementById('uj-time-hour');
    var minEl  = document.getElementById('uj-time-min');
    if (hourEl) hourEl.value = '8';
    if (minEl)  minEl.value  = '00';
    syncTimeHidden('uj');

    var staff    = MQ.store.staff.getAll();
    var cbWrap   = document.getElementById('uj-staff-checkboxes');
    cbWrap.innerHTML = staff.length ? staff.map(function (s) {
      return '<label style="display:inline-flex;align-items:center;gap:6px;font-size:13px;padding:5px 10px;border:1.5px solid #e5e7eb;border-radius:6px;cursor:pointer;">' +
        '<input type="checkbox" value="' + escHtml(s.id) + '"> ' + escHtml(s.name) +
      '</label>';
    }).join('') : '<span style="font-size:13px;color:#9ca3af;">No staff added yet</span>';

    MQ.ui.modal.close('modal-uj-view');
    MQ.ui.modal.open('modal-uj-accept');
  }

  async function submitAccept() {
    var id    = document.getElementById('uj-accept-id').value;
    var date  = document.getElementById('uj-date').value;
    var time  = document.getElementById('uj-time').value;
    var notes = document.getElementById('uj-notes').value.trim();
    var errEl = document.getElementById('uj-accept-error');

    if (!date || !time) {
      errEl.textContent = 'Date and time are required.';
      errEl.style.display = '';
      return;
    }

    var staffIds = Array.from(document.querySelectorAll('#uj-staff-checkboxes input:checked'))
      .map(function (cb) { return cb.value; });

    var btn = document.getElementById('uj-accept-submit');
    btn.disabled    = true;
    btn.textContent = 'Scheduling…';

    try {
      var session = await MQ.supabase.auth.getSession();
      var token   = session.data.session && session.data.session.access_token;

      var res = await fetch('/api/accept-job', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
        body: JSON.stringify({ jobId: id, scheduledDate: date, scheduledTime: time, assignedStaffIds: staffIds, internalNotes: notes }),
      });
      var data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to schedule job.');

      MQ.ui.modal.close('modal-uj-accept');
      MQ.ui.toast('Job scheduled — confirmation email sent to customer');
      load();
    } catch (err) {
      errEl.textContent = err.message;
      errEl.style.display = '';
    } finally {
      btn.disabled    = false;
      btn.textContent = 'Confirm Schedule';
    }
  }

  /* ─── Archive ───────────────────────────────────────────────── */

  function archive(id) {
    MQ.ui.confirmDelete('Archive this quote request? It will be removed from the queue.', async function () {
      try {
        var { error } = await MQ.supabase
          .from('quote_requests')
          .update({ status: 'archived', updated_at: new Date().toISOString() })
          .eq('id', id);
        if (error) throw error;
        MQ.ui.toast('Archived', 'info');
        load();
      } catch (err) {
        MQ.ui.toast('Failed to archive: ' + err.message, 'error');
      }
    });
  }

  /* ─── Date Picker ───────────────────────────────────────────── */

  function initDatePicker(prefix) {
    var displayEl  = document.getElementById(prefix + '-date-display');
    var hiddenEl   = document.getElementById(prefix + '-date');
    var dropEl     = document.getElementById(prefix + '-date-dropdown');
    var gridEl     = document.getElementById(prefix + '-date-grid');
    var labelEl    = document.getElementById(prefix + '-date-month-label');
    var prevBtn    = document.getElementById(prefix + '-date-prev');
    var nextBtn    = document.getElementById(prefix + '-date-next');

    if (!displayEl) return;

    var today     = new Date();
    today.setHours(0, 0, 0, 0);
    var viewYear  = today.getFullYear();
    var viewMonth = today.getMonth();
    var selectedDate = null;

    var MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    var DAYS   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

    function renderGrid() {
      labelEl.textContent = MONTHS[viewMonth] + ' ' + viewYear;
      var cells = '';
      DAYS.forEach(function (d) {
        cells += '<div class="cdp-cell cdp-cell--header">' + d + '</div>';
      });
      var first = new Date(viewYear, viewMonth, 1).getDay();
      var daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
      var daysInPrev  = new Date(viewYear, viewMonth, 0).getDate();

      for (var i = 0; i < first; i++) {
        cells += '<div class="cdp-cell cdp-cell--other">' + (daysInPrev - first + 1 + i) + '</div>';
      }
      for (var d = 1; d <= daysInMonth; d++) {
        var thisDate = new Date(viewYear, viewMonth, d);
        var isToday  = thisDate.getTime() === today.getTime();
        var isSel    = selectedDate && thisDate.getTime() === selectedDate.getTime();
        var cls      = 'cdp-cell' + (isToday ? ' cdp-cell--today' : '') + (isSel ? ' cdp-cell--selected' : '');
        cells += '<div class="' + cls + '" data-date="' + viewYear + '-' + pad(viewMonth + 1) + '-' + pad(d) + '">' + d + '</div>';
      }
      var trail = (7 - ((first + daysInMonth) % 7)) % 7;
      for (var t = 1; t <= trail; t++) {
        cells += '<div class="cdp-cell cdp-cell--other">' + t + '</div>';
      }
      gridEl.innerHTML = cells;

      gridEl.querySelectorAll('.cdp-cell[data-date]').forEach(function (el) {
        el.addEventListener('click', function () {
          var val = this.dataset.date;
          hiddenEl.value  = val;
          selectedDate    = new Date(val + 'T00:00:00');
          displayEl.textContent = selectedDate.toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' });
          displayEl.classList.remove('cdp-display--placeholder');
          dropEl.hidden = true;
          renderGrid();
        });
      });
    }

    function pad(n) { return n < 10 ? '0' + n : '' + n; }

    displayEl.addEventListener('click', function (e) {
      e.stopPropagation();
      dropEl.hidden = !dropEl.hidden;
      if (!dropEl.hidden) renderGrid();
    });

    displayEl.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        dropEl.hidden = !dropEl.hidden;
        if (!dropEl.hidden) renderGrid();
      }
    });

    prevBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      viewMonth--;
      if (viewMonth < 0) { viewMonth = 11; viewYear--; }
      renderGrid();
    });

    nextBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      viewMonth++;
      if (viewMonth > 11) { viewMonth = 0; viewYear++; }
      renderGrid();
    });

    document.addEventListener('click', function (e) {
      var picker = document.getElementById(prefix + '-date-picker');
      if (picker && !picker.contains(e.target)) dropEl.hidden = true;
    });
  }

  /* ─── Time Picker ───────────────────────────────────────────── */

  function initTimePicker(prefix) {
    var hourEl   = document.getElementById(prefix + '-time-hour');
    var minEl    = document.getElementById(prefix + '-time-min');
    if (!hourEl) return;

    var HOURS = [
      {v:'6',  l:'6:00 am'}, {v:'7',  l:'7:00 am'}, {v:'8',  l:'8:00 am'},
      {v:'9',  l:'9:00 am'}, {v:'10', l:'10:00 am'},{v:'11', l:'11:00 am'},
      {v:'12', l:'12:00 pm'},{v:'13', l:'1:00 pm'}, {v:'14', l:'2:00 pm'},
      {v:'15', l:'3:00 pm'}, {v:'16', l:'4:00 pm'}, {v:'17', l:'5:00 pm'},
      {v:'18', l:'6:00 pm'}, {v:'19', l:'7:00 pm'}, {v:'20', l:'8:00 pm'},
    ];
    hourEl.innerHTML = HOURS.map(function (h) {
      return '<option value="' + h.v + '">' + h.l + '</option>';
    }).join('');
    hourEl.value = '8';

    function sync() { syncTimeHidden(prefix); }
    hourEl.addEventListener('change', sync);
    minEl.addEventListener('change', sync);
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
    document.getElementById('uj-accept-submit').addEventListener('click', submitAccept);
    document.getElementById('uj-view-accept-btn').addEventListener('click', function () {
      if (viewingId) openAccept(viewingId);
    });

    var searchEl = document.getElementById('uj-search');
    if (searchEl) searchEl.addEventListener('input', function () { filterAndRender(this.value); });

    initDatePicker('uj');
    initTimePicker('uj');
  });

  window.UJPage = { view: view, openAccept: openAccept, archive: archive };
})();
