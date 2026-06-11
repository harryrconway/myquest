(function () {
  'use strict';

  var sb;
  var clients = [];
  var selectedClientId = null;

  function initials(name) {
    return (name || '').split(' ').filter(Boolean).map(function (p) { return p[0]; }).join('').toUpperCase().slice(0, 2) || '?';
  }

  function escHtml(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function fmtDate(str) {
    if (!str) return '—';
    return new Date(str.split('T')[0] + 'T00:00:00').toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  async function load() {
    var clientRes = await sb.from('clients').select('*').order('full_name');
    var rawClients = clientRes.data || [];

    var jobRes = await sb.from('quote_requests')
      .select('client_id, status, scheduled_date, created_at')
      .not('client_id', 'is', null);
    var jobs = jobRes.data || [];

    clients = rawClients.map(function (c) {
      var cJobs = jobs.filter(function (j) { return j.client_id === c.id; });
      var lastDate = null;
      cJobs.forEach(function (j) {
        var d = j.scheduled_date || (j.created_at || '').split('T')[0];
        if (!lastDate || d > lastDate) lastDate = d;
      });
      return Object.assign({}, c, { job_count: cJobs.length, last_date: lastDate });
    });

    document.getElementById('clients-count').textContent = clients.length;
    renderGrid(filterClients(document.getElementById('clients-search').value));
  }

  function renderGrid(list) {
    var grid = document.getElementById('clients-grid');
    var empty = document.getElementById('clients-empty');

    if (list.length === 0) {
      grid.innerHTML = '';
      empty.style.display = '';
      return;
    }
    empty.style.display = 'none';

    grid.innerHTML = list.map(function (c) {
      var location = [c.suburb, c.state].filter(Boolean).join(', ');
      var lastLabel = c.last_date ? 'Last: ' + fmtDate(c.last_date) : '';
      return '<div class="client-card' + (c.id === selectedClientId ? ' is-selected' : '') + '" data-id="' + c.id + '">' +
        '<div class="client-card__top">' +
          '<div class="client-card__avatar">' + initials(c.full_name) + '</div>' +
          '<div class="client-card__info">' +
            '<div class="client-card__name">' + escHtml(c.full_name) + '</div>' +
            '<div class="client-card__contact">' + escHtml(c.email || c.phone || '') + '</div>' +
          '</div>' +
        '</div>' +
        '<div class="client-card__meta">' +
          '<div class="client-card__location">' + escHtml(location || lastLabel) + '</div>' +
          '<div class="client-card__stats">' +
            '<div class="client-stat"><div class="client-stat__val">' + c.job_count + '</div><div class="client-stat__lbl">Jobs</div></div>' +
          '</div>' +
        '</div></div>';
    }).join('');

    grid.querySelectorAll('.client-card').forEach(function (card) {
      card.addEventListener('click', function () { selectClient(card.dataset.id); });
    });
  }

  function filterClients(q) {
    if (!q) return clients;
    q = q.toLowerCase();
    return clients.filter(function (c) {
      return (c.full_name || '').toLowerCase().includes(q) ||
        (c.email || '').toLowerCase().includes(q) ||
        (c.suburb || '').toLowerCase().includes(q) ||
        (c.phone || '').toLowerCase().includes(q);
    });
  }

  async function selectClient(id) {
    selectedClientId = id;
    var c = clients.find(function (x) { return x.id === id; });
    if (!c) return;

    renderGrid(filterClients(document.getElementById('clients-search').value));

    // Populate header
    document.getElementById('cd-avatar').textContent = initials(c.full_name);
    document.getElementById('cd-name').textContent = c.full_name;
    document.getElementById('cd-sub').textContent = [c.email, c.phone].filter(Boolean).join(' · ') || 'No contact info';

    var body = document.getElementById('cd-body');

    // Build contact rows
    var address = [c.street_address, c.suburb, c.state, c.postcode].filter(Boolean).join(', ');
    var rows = [
      ['Email', c.email || '—'],
      ['Phone', c.phone || '—'],
      ['Address', address || '—'],
    ];
    if (c.notes) rows.push(['Notes', c.notes]);

    var html = '<div class="client-detail__section-title">Contact</div>';
    rows.forEach(function (r) {
      html += '<div class="client-detail-row"><span class="client-detail-row__label">' + r[0] + '</span>' +
        '<span class="client-detail-row__val">' + escHtml(r[1]) + '</span></div>';
    });
    html += '<div class="client-detail__section-title">Job History</div>' +
      '<p style="font-size:13px;color:#94a3b8;padding:6px 0;">Loading…</p>';
    body.innerHTML = html;

    // Show detail panel
    document.getElementById('client-detail').hidden = false;
    document.getElementById('clients-layout').classList.remove('no-panel');

    // Load jobs async
    var jobRes = await sb.from('quote_requests')
      .select('id, service_type, suburb, bedrooms, bathrooms, status, scheduled_date, created_at')
      .eq('client_id', id)
      .order('created_at', { ascending: false });
    var cJobs = jobRes.data || [];

    var statusColor = { completed: '#2d6a4f', scheduled: '#1e40af', unscheduled: '#92400e', archived: '#64748b' };
    var statusBg = { completed: '#d1fae5', scheduled: '#dbeafe', unscheduled: '#fef3c7', archived: '#f1f5f9' };
    var statusLabel = { completed: 'Done', scheduled: 'Scheduled', unscheduled: 'Pending', archived: 'Archived' };

    var jobHtml = '<div class="client-detail__section-title">Job History (' + cJobs.length + ')</div>';
    if (cJobs.length === 0) {
      jobHtml += '<p style="font-size:13px;color:#94a3b8;font-style:italic;padding:6px 0;">No jobs yet</p>';
    } else {
      cJobs.forEach(function (j) {
        var dateStr = j.scheduled_date || (j.created_at || '').split('T')[0];
        var badge = '<span style="font-size:10px;font-weight:700;color:' + (statusColor[j.status] || '#64748b') +
          ';background:' + (statusBg[j.status] || '#f1f5f9') + ';padding:2px 6px;border-radius:4px;margin-left:6px;">' +
          (statusLabel[j.status] || j.status) + '</span>';
        jobHtml += '<div class="client-detail__job">' +
          '<div class="client-detail__job-date">' + fmtDate(dateStr) + badge + '</div>' +
          '<div class="client-detail__job-name">' + escHtml(j.service_type || 'Cleaning') + '</div>' +
          '<div class="client-detail__job-meta">' + escHtml(j.suburb || '') +
          (j.bedrooms ? ' · ' + j.bedrooms + 'BR' : '') + (j.bathrooms ? ' / ' + j.bathrooms + 'BA' : '') + '</div>' +
          '</div>';
      });
    }

    // Re-build body with jobs
    body.innerHTML = html.replace(/<div class="client-detail__section-title">Job History<\/div>.*$/s, '') + jobHtml;
  }

  function closeDetail() {
    selectedClientId = null;
    document.getElementById('client-detail').hidden = true;
    document.getElementById('clients-layout').classList.add('no-panel');
    renderGrid(filterClients(document.getElementById('clients-search').value));
  }

  function init() {
    sb = MQ.supabase;
    document.getElementById('cd-close').addEventListener('click', closeDetail);
    document.getElementById('btn-refresh').addEventListener('click', load);
    document.getElementById('clients-search').addEventListener('input', function () {
      renderGrid(filterClients(this.value));
    });
    load();
  }

  document.addEventListener('mq:ready', function () { init(); });
})();
