/* ============================================================
   MYQUEST — completed-jobs.js
   Reads quote_requests WHERE status='completed' from Supabase
   ============================================================ */
(function () {
  'use strict';

  var jobs         = [];
  var filteredJobs = [];

  function escHtml(str) {
    return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function fmtDate(str) {
    if (!str) return '—';
    try {
      var d = new Date(str);
      return d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });
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

  /* ─── Search / Count ────────────────────────────────────────── */

  function updateCount() {
    var el = document.getElementById('cj-count');
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
    var wrap = document.getElementById('cj-table-wrap');
    wrap.innerHTML = '<div style="padding:40px;text-align:center;color:var(--color-light);">Loading…</div>';

    try {
      var { data, error } = await MQ.supabase
        .from('quote_requests')
        .select('*')
        .eq('status', 'completed')
        .order('job_completed_at', { ascending: false });

      if (error) throw error;
      jobs = data || [];
      var searchEl = document.getElementById('cj-search');
      filterAndRender(searchEl ? searchEl.value : '');
    } catch (err) {
      wrap.innerHTML = '<div style="padding:40px;text-align:center;color:var(--color-error);">Failed to load jobs: ' + escHtml(err.message) + '</div>';
    }
  }

  /* ─── Render ────────────────────────────────────────────────── */

  function render(list) {
    var wrap = document.getElementById('cj-table-wrap');

    if (!list.length) {
      wrap.innerHTML = MQ.ui.emptyState(
        'M20 6 9 17 4 12',
        jobs.length ? 'No results found' : 'No completed jobs yet',
        jobs.length ? 'Try a different search term' : 'Completed jobs will appear here'
      );
      return;
    }

    var rows = list.map(function (j) {
      var address = [j.suburb, j.state].filter(Boolean).join(', ') || '—';
      return '<tr>' +
        '<td><strong>' + escHtml(fmtDate(j.job_completed_at)) + '</strong></td>' +
        '<td>' + escHtml(j.full_name) + '</td>' +
        '<td>' + escHtml(address) + '</td>' +
        '<td>' + escHtml(fmtServices(j.services)) + '</td>' +
        '<td style="font-size:13px;">' + escHtml(getStaffNames(j.assigned_staff_ids)) + '</td>' +
        '<td>' +
          '<div class="dash-table__action-group">' +
            '<button class="action-btn action-btn--view" onclick="CJPage.view(\'' + j.id + '\')">View</button>' +
          '</div>' +
        '</td>' +
      '</tr>';
    }).join('');

    wrap.innerHTML =
      '<div style="overflow-x:auto;">' +
        '<table class="dash-table">' +
          '<thead><tr>' +
            '<th>Completed</th><th>Client</th><th>Location</th><th>Services</th><th>Staff</th><th>Actions</th>' +
          '</tr></thead>' +
          '<tbody>' + rows + '</tbody>' +
        '</table>' +
      '</div>';
  }

  /* ─── View details ──────────────────────────────────────────── */

  function view(id) {
    var j = jobs.find(function (x) { return x.id === id; });
    if (!j) return;

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
        row('Staff',            escHtml(getStaffNames(j.assigned_staff_ids))) +
        row('Notes from client', escHtml(j.notes)) +
        row('Internal notes',   escHtml(j.internal_notes)) +
        row('Scheduled',        j.scheduled_date ? escHtml(fmtDate(j.scheduled_date)) : null) +
        row('Completed',        escHtml(fmtDate(j.job_completed_at))) +
      '</table>';

    document.getElementById('cj-view-body').innerHTML = html;
    MQ.ui.modal.open('modal-cj-view');
  }

  /* ─── Init ──────────────────────────────────────────────────── */

  document.addEventListener('mq:ready', function () {
    load();
    document.getElementById('btn-refresh').addEventListener('click', load);

    var searchEl = document.getElementById('cj-search');
    if (searchEl) searchEl.addEventListener('input', function () { filterAndRender(this.value); });
  });

  window.CJPage = { view: view };
})();
