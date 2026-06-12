(function () {
  'use strict';

  var sb;
  var clients = [];
  var selectedClientId = null;
  var editingClientId = null;

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

    document.getElementById('cd-avatar').textContent = initials(c.full_name);
    document.getElementById('cd-name').textContent = c.full_name;

    var subParts = [];
    if (c.email) subParts.push('<a href="mailto:' + escHtml(c.email) + '">' + escHtml(c.email) + '</a>');
    if (c.phone) subParts.push('<a href="tel:' + escHtml(c.phone) + '">' + escHtml(c.phone) + '</a>');
    document.getElementById('cd-sub').innerHTML = subParts.join(' · ') || 'No contact info';

    var body = document.getElementById('cd-body');
    var address = [c.street_address, c.suburb, c.state, c.postcode].filter(Boolean).join(', ');

    var rows = '<div class="client-detail__section-title">Contact</div>';
    if (c.email) rows += '<div class="client-detail-row"><span class="client-detail-row__label">Email</span>' +
      '<span class="client-detail-row__val"><a href="mailto:' + escHtml(c.email) + '">' + escHtml(c.email) + '</a></span></div>';
    if (c.phone) rows += '<div class="client-detail-row"><span class="client-detail-row__label">Phone</span>' +
      '<span class="client-detail-row__val"><a href="tel:' + escHtml(c.phone) + '">' + escHtml(c.phone) + '</a></span></div>';
    if (address) rows += '<div class="client-detail-row"><span class="client-detail-row__label">Address</span>' +
      '<span class="client-detail-row__val">' + escHtml(address) + '</span></div>';
    if (!c.email && !c.phone && !address) rows += '<div class="client-detail-row"><span class="client-detail-row__val" style="color:#94a3b8;font-style:italic;">No contact info</span></div>';
    if (c.notes) rows += '<div class="client-detail-row"><span class="client-detail-row__label">Notes</span>' +
      '<span class="client-detail-row__val">' + escHtml(c.notes) + '</span></div>';

    var actions = '';
    if (MQ.hasRole('manager')) actions += '<button class="btn-outline" style="font-size:13px;padding:6px 14px;" onclick="ClientsPage.editClient(\'' + escHtml(c.id) + '\')">Edit</button>';
    if (MQ.hasRole('owner'))   actions += '<button class="btn-outline" style="font-size:13px;padding:6px 14px;color:var(--color-error);border-color:var(--color-error);" onclick="ClientsPage.deleteClient(\'' + escHtml(c.id) + '\')">Delete</button>';
    if (actions) rows += '<div style="display:flex;gap:8px;padding:12px 0 4px;">' + actions + '</div>';

    rows += '<div class="client-detail__section-title">Job History</div>' +
      '<p style="font-size:13px;color:#94a3b8;padding:6px 0;">Loading…</p>';
    body.innerHTML = rows;

    document.getElementById('client-detail').hidden = false;
    document.getElementById('clients-layout').classList.remove('no-panel');

    var jobRes = await sb.from('quote_requests')
      .select('id, service_type, suburb, bedrooms, bathrooms, status, scheduled_date, created_at')
      .eq('client_id', id)
      .order('created_at', { ascending: false });
    var cJobs = jobRes.data || [];

    var statusColor = { completed: '#2d6a4f', scheduled: '#1e40af', unscheduled: '#92400e', archived: '#64748b' };
    var statusBg    = { completed: '#d1fae5', scheduled: '#dbeafe', unscheduled: '#fef3c7', archived: '#f1f5f9' };
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

    body.innerHTML = rows.replace(/<div class="client-detail__section-title">Job History<\/div>.*$/s, '') + jobHtml;
  }

  function closeDetail() {
    selectedClientId = null;
    document.getElementById('client-detail').hidden = true;
    document.getElementById('clients-layout').classList.add('no-panel');
    renderGrid(filterClients(document.getElementById('clients-search').value));
  }

  /* ─── Add / Edit Modal ───────────────────────────────────────── */

  function openAddModal() {
    editingClientId = null;
    document.getElementById('client-form-title').textContent = 'Add Client';
    ['cf-name','cf-email','cf-phone','cf-street','cf-suburb','cf-state','cf-postcode'].forEach(function (id) {
      document.getElementById(id).value = '';
    });
    document.getElementById('cf-notes').value = '';
    document.getElementById('client-form-error').style.display = 'none';
    MQ.ui.modal.open('modal-client-form');
  }

  function openEditModal(id) {
    var c = clients.find(function (x) { return x.id === id; });
    if (!c) return;
    editingClientId = id;
    document.getElementById('client-form-title').textContent = 'Edit Client';
    document.getElementById('cf-name').value    = c.full_name || '';
    document.getElementById('cf-email').value   = c.email || '';
    document.getElementById('cf-phone').value   = c.phone || '';
    document.getElementById('cf-street').value  = c.street_address || '';
    document.getElementById('cf-suburb').value  = c.suburb || '';
    document.getElementById('cf-state').value   = c.state || '';
    document.getElementById('cf-postcode').value = c.postcode || '';
    document.getElementById('cf-notes').value   = c.notes || '';
    document.getElementById('client-form-error').style.display = 'none';
    MQ.ui.modal.open('modal-client-form');
  }

  async function saveClient() {
    var name  = document.getElementById('cf-name').value.trim();
    var errEl = document.getElementById('client-form-error');
    if (!name) { errEl.textContent = 'Full name is required.'; errEl.style.display = ''; return; }

    var btn = document.getElementById('cf-submit');
    btn.disabled = true; btn.textContent = 'Saving…';

    var payload = {
      full_name:      name,
      email:          document.getElementById('cf-email').value.trim()   || null,
      phone:          document.getElementById('cf-phone').value.trim()   || null,
      street_address: document.getElementById('cf-street').value.trim()  || null,
      suburb:         document.getElementById('cf-suburb').value.trim()  || null,
      state:          document.getElementById('cf-state').value.trim()   || null,
      postcode:       document.getElementById('cf-postcode').value.trim() || null,
      notes:          document.getElementById('cf-notes').value.trim()   || null,
    };

    try {
      var result;
      if (editingClientId) {
        result = await sb.from('clients').update(payload).eq('id', editingClientId);
      } else {
        result = await sb.from('clients').insert(payload);
      }
      if (result.error) throw result.error;
      MQ.ui.modal.close('modal-client-form');
      MQ.ui.toast(editingClientId ? 'Client updated' : 'Client added');
      load();
    } catch (err) {
      errEl.textContent = err.message; errEl.style.display = '';
    } finally {
      btn.disabled = false; btn.textContent = 'Save Client';
    }
  }

  /* ─── Delete ─────────────────────────────────────────────────── */

  function deleteClient(id) {
    var c = clients.find(function (x) { return x.id === id; });
    if (!c) return;
    MQ.ui.confirmDelete('Delete "' + escHtml(c.full_name || 'client') + '"? This cannot be undone.', async function () {
      var { error } = await sb.from('clients').delete().eq('id', id);
      if (error) { MQ.ui.toast(error.message, 'error'); return; }
      MQ.ui.toast('Client deleted', 'info');
      closeDetail();
      load();
    });
  }

  /* ─── Init ───────────────────────────────────────────────────── */

  function init() {
    sb = MQ.supabase;

    document.getElementById('cd-close').addEventListener('click', closeDetail);
    document.getElementById('btn-refresh').addEventListener('click', load);
    document.getElementById('clients-search').addEventListener('input', function () {
      renderGrid(filterClients(this.value));
    });
    document.getElementById('cf-submit').addEventListener('click', saveClient);

    if (MQ.hasRole('manager')) {
      var addBtn = document.getElementById('btn-add-client');
      if (addBtn) { addBtn.style.display = ''; addBtn.addEventListener('click', openAddModal); }
    }

    load();

    sb.channel('clients-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'clients' }, function () { load(); })
      .subscribe();
  }

  document.addEventListener('mq:ready', function () { init(); });

  window.addEventListener('pageshow', function (event) {
    if (event.persisted) { load(); }
  });

  window.ClientsPage = { editClient: openEditModal, deleteClient: deleteClient };
})();
