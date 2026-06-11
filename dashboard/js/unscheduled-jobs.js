/* ============================================================
   MYQUEST — unscheduled-jobs.js
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

  function timeAgo(str) {
    if (!str) return '';
    var diff  = Date.now() - new Date(str).getTime();
    var mins  = Math.floor(diff / 60000);
    if (mins < 2)   return 'just now';
    if (mins < 60)  return mins + ' min ago';
    var hours = Math.floor(mins / 60);
    if (hours < 24) return hours + ' hr' + (hours === 1 ? '' : 's') + ' ago';
    var days  = Math.floor(hours / 24);
    return days + ' day' + (days === 1 ? '' : 's') + ' ago';
  }

  /* ─── Search / Count ────────────────────────────────────────── */

  function updateCount() {
    var el = document.getElementById('uj-count');
    if (el) el.textContent = filteredJobs.length;
  }

  function filterAndRender(query) {
    var q = (query || '').toLowerCase().trim();
    filteredJobs = q ? jobs.filter(function (j) {
      return (j.full_name      || '').toLowerCase().indexOf(q) !== -1 ||
             (j.suburb         || '').toLowerCase().indexOf(q) !== -1 ||
             (j.state          || '').toLowerCase().indexOf(q) !== -1 ||
             (j.services       || []).join(' ').toLowerCase().indexOf(q) !== -1 ||
             (j.property_type  || '').toLowerCase().indexOf(q) !== -1;
    }) : jobs.slice();
    updateCount();
    render(filteredJobs);
  }

  /* ─── Load ─────────────────────────────────────────────────── */

  async function load() {
    var wrap = document.getElementById('uj-table-wrap');
    wrap.innerHTML = '<div style="padding:60px;text-align:center;color:var(--color-light);">Loading…</div>';

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
      wrap.innerHTML = '<div style="padding:60px;text-align:center;color:var(--color-error);">Failed to load: ' + escHtml(err.message) + '</div>';
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

    var html = list.map(function (j) {
      var initial  = (j.full_name || '?')[0].toUpperCase();
      var location = [j.suburb, j.state].filter(Boolean).join(', ');
      var details  = [];
      if (j.bedrooms)  details.push(j.bedrooms  + ' bed');
      if (j.bathrooms) details.push(j.bathrooms + ' bath');

      var metaHtml = '';
      if (location) metaHtml += '<span>' + escHtml(location) + '</span>';
      if (j.property_type) {
        if (metaHtml) metaHtml += '<span class="req-card__dot"></span>';
        metaHtml += '<span class="badge badge--amber" style="font-size:11px;">' + escHtml(j.property_type) + '</span>';
      }
      if (details.length) {
        if (metaHtml) metaHtml += '<span class="req-card__dot"></span>';
        metaHtml += '<span>' + escHtml(details.join(' · ')) + '</span>';
      }

      var chips = (j.services || []).slice(0, 4).map(function (s) {
        return '<span class="req-chip">' + escHtml(s) + '</span>';
      }).join('');

      return '<div class="req-card">' +
        '<div class="req-card__avatar">' + initial + '</div>' +
        '<div class="req-card__body">' +
          '<div class="req-card__row1">' +
            '<span class="req-card__name">' + escHtml(j.full_name) + '</span>' +
            '<span class="req-card__ago">' + timeAgo(j.created_at) + '</span>' +
          '</div>' +
          (metaHtml ? '<div class="req-card__meta">' + metaHtml + '</div>' : '') +
          (chips    ? '<div class="req-card__chips">' + chips + '</div>' : '') +
        '</div>' +
        '<div class="req-card__actions">' +
          '<button class="action-btn action-btn--view"   onclick="UJPage.view(\''       + j.id + '\')">View</button>'     +
          '<button class="action-btn action-btn--accept" onclick="UJPage.openAccept(\'' + j.id + '\')">Schedule</button>' +
          '<button class="action-btn action-btn--archive" onclick="UJPage.archive(\''   + j.id + '\')">Archive</button>'  +
        '</div>' +
      '</div>';
    }).join('');

    wrap.innerHTML = '<div class="req-list">' + html + '</div>';
  }

  /* ─── View details ──────────────────────────────────────────── */

  function view(id) {
    var j = jobs.find(function (x) { return x.id === id; });
    if (!j) return;
    viewingId = id;

    function row(label, val) {
      if (!val && val !== 0) return '';
      return '<tr><td style="padding:8px 14px 8px 0;font-weight:600;color:#6b7280;width:160px;white-space:nowrap;vertical-align:top;">' +
        escHtml(label) + '</td><td style="padding:8px 0;color:#111827;">' + val + '</td></tr>';
    }

    var address = [j.street_address, j.suburb, j.state, j.postcode].filter(Boolean).join(', ');
    var extras  = j.extras && j.extras.length ? j.extras.join(', ') : null;
    var days    = j.preferred_days && j.preferred_days.length ? j.preferred_days.join(', ') : null;

    document.getElementById('uj-view-body').innerHTML =
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
        row('Preferred days',   days   ? escHtml(days)   : null) +
        row('Preferred time',   escHtml(j.preferred_time)) +
        row('Flexible',         j.flexible_schedule ? 'Yes' : null) +
        row('Notes',            escHtml(j.notes)) +
        row('Submitted',        escHtml(fmtDate(j.created_at))) +
      '</table>';

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
    var recurrenceEl = document.getElementById('uj-recurrence');
    if (recurrenceEl) recurrenceEl.value = 'none';

    var displayEl = document.getElementById('uj-date-display');
    if (displayEl) { displayEl.textContent = 'Select a date'; displayEl.classList.add('cdp-display--placeholder'); }
    var hourEl = document.getElementById('uj-time-hour');
    var minEl  = document.getElementById('uj-time-min');
    if (hourEl) hourEl.value = '8';
    if (minEl)  minEl.value  = '00';
    syncTimeHidden('uj');

    var staff  = MQ.store.staff.getAll();
    var cbWrap = document.getElementById('uj-staff-checkboxes');
    cbWrap.innerHTML = staff.length ? staff.map(function (s) {
      return '<label style="display:inline-flex;align-items:center;gap:6px;font-size:13px;padding:5px 12px;border:1.5px solid #e5e7eb;border-radius:8px;cursor:pointer;">' +
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

    if (!date || !time) { errEl.textContent = 'Date and time are required.'; errEl.style.display = ''; return; }

    var staffIds = Array.from(document.querySelectorAll('#uj-staff-checkboxes input:checked'))
      .map(function (cb) { return cb.value; });

    var recurrence = (document.getElementById('uj-recurrence') || {}).value || 'none';
    var checklistTemplate = (MQ.store.rates.get().checklist || []);

    var btn = document.getElementById('uj-accept-submit');
    btn.disabled = true; btn.textContent = 'Scheduling…';

    try {
      var session = await MQ.supabase.auth.getSession();
      var token   = session.data.session && session.data.session.access_token;

      var res  = await fetch('/api/accept-job', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
        body: JSON.stringify({ jobId: id, scheduledDate: date, scheduledTime: time, assignedStaffIds: staffIds, internalNotes: notes, recurrence: recurrence, checklistTemplate: checklistTemplate }),
      });
      var data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to schedule job.');

      MQ.ui.modal.close('modal-uj-accept');
      MQ.ui.toast('Job scheduled — confirmation email sent');
      load();
    } catch (err) {
      errEl.textContent = err.message; errEl.style.display = '';
    } finally {
      btn.disabled = false; btn.textContent = 'Confirm Schedule';
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
    var displayEl = document.getElementById(prefix + '-date-display');
    var hiddenEl  = document.getElementById(prefix + '-date');
    var dropEl    = document.getElementById(prefix + '-date-dropdown');
    var gridEl    = document.getElementById(prefix + '-date-grid');
    var labelEl   = document.getElementById(prefix + '-date-month-label');
    var prevBtn   = document.getElementById(prefix + '-date-prev');
    var nextBtn   = document.getElementById(prefix + '-date-next');
    if (!displayEl) return;

    var today        = new Date(); today.setHours(0,0,0,0);
    var viewYear     = today.getFullYear();
    var viewMonth    = today.getMonth();
    var selectedDate = null;
    var MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    var DNAMES = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

    function pad(n) { return n < 10 ? '0' + n : '' + n; }

    function renderGrid() {
      labelEl.textContent = MONTHS[viewMonth] + ' ' + viewYear;
      var cells = DNAMES.map(function(d) { return '<div class="cdp-cell cdp-cell--header">' + d + '</div>'; }).join('');
      var first = new Date(viewYear, viewMonth, 1).getDay();
      var dim   = new Date(viewYear, viewMonth + 1, 0).getDate();
      var prevD = new Date(viewYear, viewMonth, 0).getDate();
      for (var i = 0; i < first; i++) cells += '<div class="cdp-cell cdp-cell--other">' + (prevD - first + 1 + i) + '</div>';
      for (var d = 1; d <= dim; d++) {
        var dt  = new Date(viewYear, viewMonth, d);
        var cls = 'cdp-cell' + (dt.getTime() === today.getTime() ? ' cdp-cell--today' : '') + (selectedDate && dt.getTime() === selectedDate.getTime() ? ' cdp-cell--selected' : '');
        cells += '<div class="' + cls + '" data-date="' + viewYear + '-' + pad(viewMonth+1) + '-' + pad(d) + '">' + d + '</div>';
      }
      var trail = (7 - ((first + dim) % 7)) % 7;
      for (var t = 1; t <= trail; t++) cells += '<div class="cdp-cell cdp-cell--other">' + t + '</div>';
      gridEl.innerHTML = cells;
      gridEl.querySelectorAll('.cdp-cell[data-date]').forEach(function(el) {
        el.addEventListener('click', function() {
          hiddenEl.value = this.dataset.date;
          selectedDate   = new Date(this.dataset.date + 'T00:00:00');
          displayEl.textContent = selectedDate.toLocaleDateString('en-AU', {weekday:'short',day:'numeric',month:'long',year:'numeric'});
          displayEl.classList.remove('cdp-display--placeholder');
          dropEl.hidden = true; renderGrid();
        });
      });
    }

    displayEl.addEventListener('click',   function(e) { e.stopPropagation(); dropEl.hidden = !dropEl.hidden; if (!dropEl.hidden) renderGrid(); });
    displayEl.addEventListener('keydown', function(e) { if (e.key==='Enter'||e.key===' ') { e.preventDefault(); dropEl.hidden=!dropEl.hidden; if(!dropEl.hidden)renderGrid(); } });
    prevBtn.addEventListener('click', function(e) { e.stopPropagation(); viewMonth--; if(viewMonth<0){viewMonth=11;viewYear--;} renderGrid(); });
    nextBtn.addEventListener('click', function(e) { e.stopPropagation(); viewMonth++; if(viewMonth>11){viewMonth=0;viewYear++;} renderGrid(); });
    document.addEventListener('click', function(e) { var p=document.getElementById(prefix+'-date-picker'); if(p&&!p.contains(e.target))dropEl.hidden=true; });
  }

  /* ─── Time Picker ───────────────────────────────────────────── */

  function initTimePicker(prefix) {
    var hourEl = document.getElementById(prefix + '-time-hour');
    if (!hourEl) return;
    var HOURS = [{v:'6',l:'6:00 am'},{v:'7',l:'7:00 am'},{v:'8',l:'8:00 am'},{v:'9',l:'9:00 am'},
      {v:'10',l:'10:00 am'},{v:'11',l:'11:00 am'},{v:'12',l:'12:00 pm'},{v:'13',l:'1:00 pm'},
      {v:'14',l:'2:00 pm'},{v:'15',l:'3:00 pm'},{v:'16',l:'4:00 pm'},{v:'17',l:'5:00 pm'},
      {v:'18',l:'6:00 pm'},{v:'19',l:'7:00 pm'},{v:'20',l:'8:00 pm'}];
    hourEl.innerHTML = HOURS.map(function(h){ return '<option value="'+h.v+'">'+h.l+'</option>'; }).join('');
    hourEl.value = '8';
    var minEl = document.getElementById(prefix + '-time-min');
    function sync() { syncTimeHidden(prefix); }
    hourEl.addEventListener('change', sync);
    if (minEl) minEl.addEventListener('change', sync);
    sync();
  }

  function syncTimeHidden(prefix) {
    var h = document.getElementById(prefix + '-time-hour');
    var m = document.getElementById(prefix + '-time-min');
    var hidden = document.getElementById(prefix + '-time');
    if (!h || !hidden) return;
    var hv = parseInt(h.value);
    hidden.value = (hv < 10 ? '0' + hv : '' + hv) + ':' + (m ? m.value : '00');
  }

  /* ─── Init ──────────────────────────────────────────────────── */

  document.addEventListener('mq:ready', function () {
    load();
    document.getElementById('btn-refresh').addEventListener('click', load);
    document.getElementById('uj-accept-submit').addEventListener('click', submitAccept);
    document.getElementById('uj-view-accept-btn').addEventListener('click', function () { if (viewingId) openAccept(viewingId); });

    var searchEl = document.getElementById('uj-search');
    if (searchEl) searchEl.addEventListener('input', function () { filterAndRender(this.value); });

    initDatePicker('uj');
    initTimePicker('uj');

    // Realtime: reload when any quote_requests row changes (new submission or status update)
    MQ.supabase
      .channel('uj-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'quote_requests' },
        function () { load(); })
      .subscribe();
  });

  window.UJPage = { view: view, openAccept: openAccept, archive: archive };
})();
