(function () {
  'use strict';
  var escHtml = window.escHtml || function (s) { return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); };

  var sb;
  var clients        = [];
  var pastJobs       = [];
  var selectedClientId = null;
  var editingClientId  = null;
  var importSourceId   = null;
  var showFollowUpOnly = false;

  async function callApi(path, body) {
    var sess = await sb.auth.getSession();
    var jwt  = sess.data && sess.data.session && sess.data.session.access_token;
    if (!jwt) return { error: 'Not authenticated.' };
    var res = await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + jwt },
      body: JSON.stringify(body),
    });
    return res.json();
  }

  function initials(name) {
    return (name || '').split(' ').filter(Boolean).map(function (p) { return p[0]; }).join('').toUpperCase().slice(0, 2) || '?';
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
      var daysSince = lastDate
        ? Math.floor((Date.now() - new Date(lastDate)) / 86400000)
        : (cJobs.length === 0 ? Math.floor((Date.now() - new Date(c.created_at || 0)) / 86400000) : 0);
      return Object.assign({}, c, { job_count: cJobs.length, last_date: lastDate, days_since: daysSince, needs_follow_up: daysSince > 60 });
    });

    document.getElementById('clients-count').textContent = clients.length;
    var followUpCount = clients.filter(function (c) { return c.needs_follow_up; }).length;
    var followUpCountEl = document.getElementById('clients-followup-count');
    if (followUpCountEl) followUpCountEl.textContent = followUpCount || '';
    renderGrid(filterClients(document.getElementById('clients-search').value));
  }

  function renderGrid(list) {
    var grid  = document.getElementById('clients-grid');
    var empty = document.getElementById('clients-empty');

    if (list.length === 0) {
      grid.innerHTML = '';
      empty.style.display = '';
      return;
    }
    empty.style.display = 'none';

    grid.innerHTML = list.map(function (c) {
      var location  = [c.suburb, c.state].filter(Boolean).join(', ');
      var lastLabel = c.last_date ? fmtDate(c.last_date) : 'No jobs yet';
      return '<div class="client-card' + (c.id === selectedClientId ? ' is-selected' : '') + '" data-id="' + c.id + '">' +
        '<div class="client-card__top">' +
          '<div class="client-card__avatar">' + initials(c.full_name) + '</div>' +
          '<div class="client-card__info">' +
            '<div class="client-card__name">' + escHtml(c.full_name) + '</div>' +
            '<div class="client-card__contact">' + escHtml(c.email || c.phone || '') + '</div>' +
          '</div>' +
          (c.needs_follow_up ? '<div class="client-card__followup-badge">Follow Up</div>' : '') +
        '</div>' +
        '<div class="client-card__meta">' +
          '<div class="client-card__location">' + escHtml(location) + '</div>' +
          '<div class="client-card__stats">' +
            '<div class="client-stat"><div class="client-stat__val">' + c.job_count + '</div><div class="client-stat__lbl">Jobs</div></div>' +
          '</div>' +
        '</div>' +
        '<div class="client-card__lastjob">' +
          '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="16" y1="2" x2="16" y2="6"/></svg>' +
          escHtml(lastLabel) +
        '</div>' +
        '</div>';
    }).join('');

    grid.querySelectorAll('.client-card').forEach(function (card) {
      card.addEventListener('click', function () { selectClient(card.dataset.id); });
    });
  }

  function filterClients(q) {
    var list = showFollowUpOnly ? clients.filter(function (c) { return c.needs_follow_up; }) : clients;
    if (!q) return list;
    q = q.toLowerCase();
    return list.filter(function (c) {
      return (c.full_name || '').toLowerCase().indexOf(q) !== -1 ||
        (c.email    || '').toLowerCase().indexOf(q) !== -1 ||
        (c.suburb   || '').toLowerCase().indexOf(q) !== -1 ||
        (c.phone    || '').toLowerCase().indexOf(q) !== -1;
    });
  }

  function selectClient(id) {
    selectedClientId = id;
    var c = clients.find(function (x) { return x.id === id; });
    if (!c) return;

    renderGrid(filterClients(document.getElementById('clients-search').value));

    document.getElementById('cd-avatar').textContent = initials(c.full_name);
    document.getElementById('cd-name').textContent   = c.full_name;

    var subParts = [];
    if (c.email) subParts.push('<a href="mailto:' + escHtml(c.email) + '">' + escHtml(c.email) + '</a>');
    if (c.phone) subParts.push('<a href="tel:'    + escHtml(c.phone) + '">' + escHtml(c.phone) + '</a>');
    document.getElementById('cd-sub').innerHTML = subParts.join(' \xb7 ') || 'No contact info';

    var body    = document.getElementById('cd-body');
    var address = [c.street_address, c.suburb, c.state, c.postcode].filter(Boolean).join(', ');
    var rows    = '';

    if (c.needs_follow_up) {
      rows += '<div class="client-followup-banner">' +
        '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><circle cx="12" cy="16" r="1" fill="currentColor" stroke="none"/></svg>' +
        'No job in ' + c.days_since + ' days — consider reaching out' +
      '</div>';
    }

    rows += '<div class="client-detail__section-title">Contact</div>';
    if (c.email) rows += '<div class="client-detail-row"><span class="client-detail-row__label">Email</span>' +
      '<span class="client-detail-row__val"><a href="mailto:' + escHtml(c.email) + '">' + escHtml(c.email) + '</a></span></div>';
    if (c.phone) rows += '<div class="client-detail-row"><span class="client-detail-row__label">Phone</span>' +
      '<span class="client-detail-row__val"><a href="tel:' + escHtml(c.phone) + '">' + escHtml(c.phone) + '</a></span></div>';
    if (address) rows += '<div class="client-detail-row"><span class="client-detail-row__label">Address</span>' +
      '<span class="client-detail-row__val">' + escHtml(address) + '</span></div>';
    if (c.last_date) rows += '<div class="client-detail-row"><span class="client-detail-row__label">Last Job</span>' +
      '<span class="client-detail-row__val">' + fmtDate(c.last_date) + '</span></div>';
    if (!c.email && !c.phone && !address) rows += '<div class="client-detail-row"><span class="client-detail-row__val" style="color:#000;font-style:italic;">No contact info</span></div>';

    var actions = '';
    if (MQ.hasRole('manager')) actions += '<button class="btn-outline" style="font-size:13px;padding:6px 14px;" onclick="ClientsPage.editClient(\'' + escHtml(c.id) + '\')">Edit</button>';
    if (MQ.hasRole('owner'))   actions += '<button class="btn-outline" style="font-size:13px;padding:6px 14px;color:var(--color-error);border-color:var(--color-error);" onclick="ClientsPage.deleteClient(\'' + escHtml(c.id) + '\')">Delete</button>';
    if (actions) rows += '<div style="display:flex;gap:8px;padding:12px 0 4px;">' + actions + '</div>';

    rows += '<div class="client-detail__section-title" style="display:flex;align-items:center;justify-content:space-between;">' +
      '<span>Property Notes</span>' +
      '<button class="client-notes__edit-btn" onclick="ClientsPage.editNotes()" aria-label="Edit notes">' +
        '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>' +
        ' Edit' +
      '</button>' +
    '</div>' +
    '<div class="client-notes" id="cd-notes-view">' +
      (c.notes
        ? '<div class="client-notes__display">' + escHtml(c.notes) + '</div>'
        : '<div class="client-notes__empty">No notes yet — add alarm codes, key location, pet info, or preferences.</div>') +
    '</div>' +
    '<div class="client-notes" id="cd-notes-edit" hidden>' +
      '<textarea class="client-notes__textarea" id="cd-notes-textarea" placeholder="Alarm code, key location, pets, surface preferences…">' + escHtml(c.notes || '') + '</textarea>' +
      '<div class="client-notes__actions">' +
        '<button class="btn-primary" style="font-size:13px;padding:6px 16px;" onclick="ClientsPage.saveNotes(\'' + escHtml(c.id) + '\')">Save</button>' +
        '<button class="btn-outline" style="font-size:13px;padding:6px 14px;" onclick="ClientsPage.cancelNotes()">Cancel</button>' +
      '</div>' +
    '</div>';

    body.innerHTML = rows;

    document.getElementById('client-detail').hidden = false;
    document.getElementById('clients-layout').classList.remove('no-panel');
  }

  function editNotes() {
    document.getElementById('cd-notes-view').hidden = true;
    document.getElementById('cd-notes-edit').hidden = false;
    document.getElementById('cd-notes-textarea').focus();
  }

  function cancelNotes() {
    document.getElementById('cd-notes-edit').hidden = true;
    document.getElementById('cd-notes-view').hidden = false;
  }

  async function saveNotes(id) {
    var notes = document.getElementById('cd-notes-textarea').value.trim() || null;
    var btn   = document.querySelector('#cd-notes-edit .btn-primary');
    if (btn) { btn.disabled = true; btn.textContent = 'Saving…'; }

    var result = await sb.from('clients').update({ notes: notes }).eq('id', id);

    if (result.error) {
      MQ.ui.toast(result.error.message, 'error');
      if (btn) { btn.disabled = false; btn.textContent = 'Save'; }
      return;
    }

    var c = clients.find(function (x) { return x.id === id; });
    if (c) c.notes = notes;

    MQ.ui.toast('Notes saved');
    cancelNotes();

    var notesView = document.getElementById('cd-notes-view');
    if (notesView) {
      notesView.innerHTML = notes
        ? '<div class="client-notes__display">' + escHtml(notes) + '</div>'
        : '<div class="client-notes__empty">No notes yet — add alarm codes, key location, pet info, or preferences.</div>';
    }
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
    importSourceId  = null;
    document.getElementById('client-form-title').textContent = 'Add Client';
    ['cf-name','cf-email','cf-phone','cf-street','cf-suburb','cf-state','cf-postcode'].forEach(function (id) {
      document.getElementById(id).value = '';
    });
    document.getElementById('cf-notes').value = '';
    document.getElementById('client-form-error').style.display  = 'none';
    document.getElementById('cf-past-search').value             = '';
    document.getElementById('cf-past-results').style.display    = 'none';
    document.getElementById('cf-past-tag').style.display        = 'none';
    document.getElementById('cf-past-tag').innerHTML            = '';
    document.getElementById('cf-past-section').style.display    = '';
    loadPastJobs();
    MQ.ui.modal.open('modal-client-form');
  }

  function openEditModal(id) {
    var c = clients.find(function (x) { return x.id === id; });
    if (!c) return;
    editingClientId = id;
    importSourceId  = null;
    document.getElementById('client-form-title').textContent = 'Edit Client';
    document.getElementById('cf-name').value     = c.full_name || '';
    document.getElementById('cf-email').value    = c.email || '';
    document.getElementById('cf-phone').value    = c.phone || '';
    document.getElementById('cf-street').value   = c.street_address || '';
    document.getElementById('cf-suburb').value   = c.suburb || '';
    document.getElementById('cf-state').value    = c.state || '';
    document.getElementById('cf-postcode').value = c.postcode || '';
    document.getElementById('cf-notes').value    = c.notes || '';
    document.getElementById('client-form-error').style.display = 'none';
    document.getElementById('cf-past-section').style.display   = 'none';
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
      email:          document.getElementById('cf-email').value.trim()    || null,
      phone:          document.getElementById('cf-phone').value.trim()    || null,
      street_address: document.getElementById('cf-street').value.trim()   || null,
      suburb:         document.getElementById('cf-suburb').value.trim()   || null,
      state:          document.getElementById('cf-state').value.trim()    || null,
      postcode:       document.getElementById('cf-postcode').value.trim() || null,
      notes:          document.getElementById('cf-notes').value.trim()    || null,
    };

    try {
      var result;
      if (editingClientId) {
        result = await sb.from('clients').update(payload).eq('id', editingClientId);
      } else {
        result = await sb.from('clients').insert(payload).select('id').single();
      }
      if (result.error) throw result.error;

      if (!editingClientId && importSourceId && result.data && result.data.id) {
        await sb.from('quote_requests').update({ client_id: result.data.id }).eq('id', importSourceId);
      }

      MQ.ui.modal.close('modal-client-form');
      MQ.ui.toast(editingClientId ? 'Client updated' : 'Client added');
      pastJobs = [];
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
      var result = await callApi('/api/delete-client', { clientId: id });
      if (result.error) { MQ.ui.toast(result.error, 'error'); return; }
      MQ.ui.toast('Client deleted', 'info');
      closeDetail();
      load();
    });
  }

  /* ─── Past work search (client-side) ────────────────────────── */

  async function loadPastJobs() {
    if (pastJobs.length) return;
    var { data } = await sb.from('quote_requests')
      .select('id, full_name, email, phone, street_address, suburb, state, postcode, services, scheduled_date, invoice_reference, status')
      .not('full_name', 'is', null)
      .order('created_at', { ascending: false });
    pastJobs = data || [];
  }

  function onPastSearchInput() {
    var query = document.getElementById('cf-past-search').value.trim().toLowerCase();
    if (!query || query.length < 2) {
      document.getElementById('cf-past-results').style.display = 'none';
      return;
    }
    if (!pastJobs.length) {
      var resultsEl = document.getElementById('cf-past-results');
      resultsEl.innerHTML = '<div style="padding:10px 14px;font-size:13px;color:#000;">Loading…</div>';
      resultsEl.style.display = '';
      loadPastJobs().then(function () { renderPastResults(query); });
      return;
    }
    renderPastResults(query);
  }

  function renderPastResults(query) {
    var resultsEl = document.getElementById('cf-past-results');

    var matched = pastJobs.filter(function (j) {
      return (j.full_name         || '').toLowerCase().indexOf(query) !== -1 ||
             (j.phone             || '').toLowerCase().indexOf(query) !== -1 ||
             (j.street_address    || '').toLowerCase().indexOf(query) !== -1 ||
             (j.suburb            || '').toLowerCase().indexOf(query) !== -1 ||
             (j.invoice_reference || '').toLowerCase().indexOf(query) !== -1;
    }).slice(0, 8);

    if (!matched.length) {
      resultsEl.innerHTML = '<div style="padding:10px 14px;font-size:13px;color:#000;">No past jobs found</div>';
      resultsEl.style.display = '';
      return;
    }

    var statusLabel = { completed: 'Done', scheduled: 'Scheduled', unscheduled: 'Pending', archived: 'Archived' };
    var statusColor = { completed: '#000', scheduled: '#000', unscheduled: '#000', archived: '#000' };
    var statusBg    = { completed: '#e8e8e8', scheduled: '#e8e8e8', unscheduled: '#f0f0f0', archived: '#f1f5f9' };

    resultsEl.innerHTML = matched.map(function (j, i) {
      var location  = [j.suburb, j.state].filter(Boolean).join(', ');
      var dateLabel = j.scheduled_date ? fmtDate(j.scheduled_date) : '';
      var inv       = j.invoice_reference
        ? '<span class="cf-past-result__inv">INV: ' + escHtml(j.invoice_reference) + '</span>' : '';
      var statusTag = j.status
        ? '<span style="font-size:10px;font-weight:700;color:' + (statusColor[j.status] || '#000') + ';background:' + (statusBg[j.status] || '#f1f5f9') + ';padding:1px 6px;border-radius:4px;margin-left:6px;">' + (statusLabel[j.status] || j.status) + '</span>' : '';
      var services  = (j.services || []).slice(0, 2).join(', ');
      return '<div class="cf-past-result" data-idx="' + i + '">' +
        '<div class="cf-past-result__name">' + escHtml(j.full_name) + statusTag + inv + '</div>' +
        '<div class="cf-past-result__meta">' +
          (location  ? escHtml(location)         : '') +
          (j.phone   ? ' · ' + escHtml(j.phone)  : '') +
          (dateLabel ? ' · ' + dateLabel          : '') +
          (services  ? ' · ' + escHtml(services)  : '') +
        '</div>' +
        '</div>';
    }).join('');

    resultsEl.querySelectorAll('.cf-past-result').forEach(function (el) {
      el.addEventListener('click', function () { prefillFromJob(matched[parseInt(el.dataset.idx)]); });
    });
    resultsEl.style.display = '';
  }

  function prefillFromJob(job) {
    importSourceId = job.id;
    document.getElementById('cf-name').value     = job.full_name      || '';
    document.getElementById('cf-email').value    = job.email          || '';
    document.getElementById('cf-phone').value    = job.phone          || '';
    document.getElementById('cf-street').value   = job.street_address || '';
    document.getElementById('cf-suburb').value   = job.suburb         || '';
    document.getElementById('cf-state').value    = job.state          || '';
    document.getElementById('cf-postcode').value = job.postcode       || '';

    document.getElementById('cf-past-results').style.display = 'none';
    document.getElementById('cf-past-search').value          = '';

    var dateLabel = job.scheduled_date ? fmtDate(job.scheduled_date) : '';
    var inv       = job.invoice_reference ? ' · ' + escHtml(job.invoice_reference) : '';
    var tag = document.getElementById('cf-past-tag');
    tag.innerHTML =
      '<span style="display:inline-flex;align-items:center;gap:8px;background:#dbeafe;color:#1e40af;font-size:12px;font-weight:600;padding:5px 10px;border-radius:6px;">' +
      '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>' +
      'Imported: ' + escHtml(job.full_name) + (dateLabel ? ' · ' + dateLabel : '') + inv +
      '<button type="button" onclick="ClientsPage.clearImport()" style="background:none;border:none;cursor:pointer;color:#1e40af;font-size:16px;line-height:1;padding:0 2px;margin-left:2px;">&times;</button>' +
      '</span>';
    tag.style.display = '';
  }

  function clearImport() {
    importSourceId = null;
    document.getElementById('cf-past-tag').style.display = 'none';
    document.getElementById('cf-past-tag').innerHTML     = '';
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

    var pastSearch = document.getElementById('cf-past-search');
    if (pastSearch) pastSearch.addEventListener('input', onPastSearchInput);

    var followUpBtn = document.getElementById('clients-followup-filter');
    if (followUpBtn) {
      followUpBtn.addEventListener('click', function () {
        showFollowUpOnly = !showFollowUpOnly;
        followUpBtn.classList.toggle('is-active', showFollowUpOnly);
        renderGrid(filterClients(document.getElementById('clients-search').value));
      });
    }

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

  document.addEventListener('mq:pageshow', function () { load(); });

  window.ClientsPage = { editClient: openEditModal, deleteClient: deleteClient, clearImport: clearImport, editNotes: editNotes, saveNotes: saveNotes, cancelNotes: cancelNotes };
})();
