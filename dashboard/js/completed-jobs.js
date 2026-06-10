/* ============================================================
   MYQUEST — completed-jobs.js
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
      return d.toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
    } catch (e) { return str; }
  }

  function fmtTime(str) {
    if (!str) return '';
    var parts = str.split(':');
    var h = parseInt(parts[0]);
    var m = parts[1] || '00';
    var ampm = h >= 12 ? 'pm' : 'am';
    h = h % 12 || 12;
    return h + ':' + m + ' ' + ampm;
  }

  function fmtServices(arr) {
    if (!arr || !arr.length) return '—';
    return arr.join(', ');
  }

  function completedOn(str) {
    if (!str) return '';
    try {
      var d = new Date(str);
      return d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch (e) { return str; }
  }

  /* ─── Search / Count ────────────────────────────────────────── */

  function updateCount() {
    var el = document.getElementById('cj-count');
    if (el) el.textContent = filteredJobs.length;
  }

  function filterAndRender(query) {
    var q = (query || '').toLowerCase().trim();
    filteredJobs = q ? jobs.filter(function (j) {
      return (j.full_name     || '').toLowerCase().indexOf(q) !== -1 ||
             (j.suburb        || '').toLowerCase().indexOf(q) !== -1 ||
             (j.state         || '').toLowerCase().indexOf(q) !== -1 ||
             (j.services      || []).join(' ').toLowerCase().indexOf(q) !== -1 ||
             (j.property_type || '').toLowerCase().indexOf(q) !== -1;
    }) : jobs.slice();
    updateCount();
    render(filteredJobs);
  }

  /* ─── Load ─────────────────────────────────────────────────── */

  async function load() {
    var wrap = document.getElementById('cj-table-wrap');
    wrap.innerHTML = '<div style="padding:60px;text-align:center;color:var(--color-light);">Loading…</div>';

    try {
      var { data, error } = await MQ.supabase
        .from('quote_requests')
        .select('*')
        .eq('status', 'completed')
        .order('updated_at', { ascending: false });

      if (error) throw error;
      jobs = data || [];
      var searchEl = document.getElementById('cj-search');
      filterAndRender(searchEl ? searchEl.value : '');
    } catch (err) {
      wrap.innerHTML = '<div style="padding:60px;text-align:center;color:var(--color-error);">Failed to load: ' + escHtml(err.message) + '</div>';
    }
  }

  /* ─── Render ────────────────────────────────────────────────── */

  function render(list) {
    var wrap = document.getElementById('cj-table-wrap');

    if (!list.length) {
      wrap.innerHTML = MQ.ui.emptyState(
        'M20 6 9 17 4 12',
        jobs.length ? 'No results found' : 'No completed jobs yet',
        jobs.length ? 'Try a different search term' : 'Jobs marked as complete will appear here'
      );
      return;
    }

    var html = list.map(function (j) {
      var initial  = (j.full_name || '?')[0].toUpperCase();
      var location = [j.suburb, j.state].filter(Boolean).join(', ');
      var chips    = (j.services || []).slice(0, 3).map(function (s) {
        return '<span class="req-chip req-chip--green">' + escHtml(s) + '</span>';
      }).join('');
      var doneOn = completedOn(j.updated_at);

      return '<div class="job-card job-card--completed">' +
        '<div class="job-card__done-badge"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg></div>' +
        '<div class="req-card__avatar req-card__avatar--green">' + initial + '</div>' +
        '<div class="req-card__body">' +
          '<div class="req-card__row1">' +
            '<span class="req-card__name">' + escHtml(j.full_name) + '</span>' +
            (doneOn ? '<span class="req-card__ago">' + doneOn + '</span>' : '') +
          '</div>' +
          (location ? '<div class="req-card__meta"><span>' + escHtml(location) + '</span>' +
            (j.property_type ? '<span class="req-card__dot"></span><span class="badge badge--green" style="font-size:11px;">' + escHtml(j.property_type) + '</span>' : '') +
          '</div>' : '') +
          (chips ? '<div class="req-card__chips">' + chips + '</div>' : '') +
        '</div>' +
        '<div class="req-card__actions">' +
          '<button class="action-btn action-btn--view" onclick="CJPage.view(\'' + j.id + '\')">View</button>' +
        '</div>' +
      '</div>';
    }).join('');

    wrap.innerHTML = '<div class="req-list">' + html + '</div>';
  }

  /* ─── View details ──────────────────────────────────────────── */

  function view(id) {
    var j = jobs.find(function (x) { return x.id === id; });
    if (!j) return;

    function row(label, val) {
      if (!val && val !== 0) return '';
      return '<tr><td style="padding:8px 14px 8px 0;font-weight:600;color:#6b7280;width:160px;white-space:nowrap;vertical-align:top;">' +
        escHtml(label) + '</td><td style="padding:8px 0;color:#111827;">' + val + '</td></tr>';
    }

    var address = [j.street_address, j.suburb, j.state, j.postcode].filter(Boolean).join(', ');

    document.getElementById('cj-view-body').innerHTML =
      '<table style="width:100%;border-collapse:collapse;font-size:14px;">' +
        row('Name',           escHtml(j.full_name)) +
        row('Phone',          '<a href="tel:' + escHtml(j.phone) + '">' + escHtml(j.phone) + '</a>') +
        row('Email',          '<a href="mailto:' + escHtml(j.email) + '">' + escHtml(j.email) + '</a>') +
        row('Address',        escHtml(address)) +
        row('Property type',  escHtml(j.property_type)) +
        row('Bedrooms',       j.bedrooms) +
        row('Bathrooms',      j.bathrooms) +
        row('Services',       escHtml(fmtServices(j.services))) +
        row('Frequency',      escHtml(j.frequency)) +
        row('Scheduled date', escHtml(fmtDate(j.scheduled_date))) +
        row('Scheduled time', escHtml(fmtTime(j.scheduled_time))) +
        row('Completed on',   escHtml(completedOn(j.updated_at))) +
        row('Notes',          escHtml(j.notes)) +
        row('Internal notes', escHtml(j.internal_notes)) +
      '</table>';

    MQ.ui.modal.open('modal-cj-view');
  }

  /* ─── Init ──────────────────────────────────────────────────── */

  document.addEventListener('mq:ready', function () {
    load();
    document.getElementById('btn-refresh').addEventListener('click', load);

    var searchEl = document.getElementById('cj-search');
    if (searchEl) searchEl.addEventListener('input', function () { filterAndRender(this.value); });

    MQ.supabase
      .channel('cj-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'quote_requests' },
        function () { load(); })
      .subscribe();
  });

  window.CJPage = { view: view };
})();
