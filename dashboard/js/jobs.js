/* ============================================================
   MYQUEST — jobs.js
   ============================================================ */
(function () {
  'use strict';

  var editingId    = null;
  var pendingQuoteId = null;

  // ── Helpers ───────────────────────────────────────────────
  function escHtml(str) {
    return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  // Returns YYYY-MM-DD using local time (avoids UTC offset bug)
  function localDateStr(d) {
    var m   = String(d.getMonth() + 1).padStart(2, '0');
    var day = String(d.getDate()).padStart(2, '0');
    return d.getFullYear() + '-' + m + '-' + day;
  }

  var SERVICE_LABELS = {
    'standard':     'Standard Clean',
    'deep':         'Deep Clean',
    'end-of-lease': 'End of Lease',
    'move-in':      'Move-in Clean',
    'after-build':  'After Build',
    'window':       'Window Clean',
    'carpet':       'Carpet Clean',
    'commercial':   'Commercial',
  };

  function serviceLabel(type) {
    return type ? (SERVICE_LABELS[type] || type) : '';
  }

  function getClientName(id) {
    var c = MQ.store.clients.getById(id);
    return c ? c.name : '—';
  }

  function getClientAddress(clientId) {
    var c = MQ.store.clients.getById(clientId);
    return c ? (c.address || '—') : '—';
  }

  function getStaffNames(ids) {
    if (!ids || !ids.length) return '—';
    return ids.map(function (id) {
      var s = MQ.store.staff.getById(id);
      return s ? s.name.split(' ')[0] : '?';
    }).join(', ');
  }

  // ── Filters ───────────────────────────────────────────────
  function getFilters() {
    return {
      status:  document.getElementById('filter-status').value,
      from:    document.getElementById('filter-from').value,
      to:      document.getElementById('filter-to').value,
      staffId: document.getElementById('filter-staff').value,
    };
  }

  function applyFilters(jobs) {
    var f = getFilters();
    return jobs.filter(function (j) {
      if (f.status  && j.status !== f.status) return false;
      if (f.from    && j.date < f.from)       return false;
      if (f.to      && j.date > f.to)         return false;
      if (f.staffId && (!j.staffIds || !j.staffIds.includes(f.staffId))) return false;
      return true;
    });
  }

  // ── View modal helpers ────────────────────────────────────
  function infoSection(title, rows) {
    if (!rows.length) return '';
    return '<div style="margin-bottom:var(--space-5);">' +
      '<div style="font-size:0.68rem;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:var(--color-mid);margin-bottom:var(--space-3);">' + title + '</div>' +
      '<div style="display:grid;grid-template-columns:max-content 1fr;gap:var(--space-2) var(--space-6);font-size:var(--text-sm);">' +
        rows.map(function (r) {
          return '<span style="color:var(--color-mid);white-space:nowrap;">' + r[0] + '</span>' +
                 '<span style="color:var(--color-dark);">' + escHtml(String(r[1])) + '</span>';
        }).join('') +
      '</div>' +
    '</div>';
  }

  // ── View job modal ────────────────────────────────────────
  function view(id) {
    var j = MQ.store.jobs.getById(id);
    if (!j) return;

    var client   = MQ.store.clients.getById(j.clientId);
    var prop     = j.propertyId ? MQ.store.properties.getById(j.propertyId) : null;
    var allStaff = MQ.store.staff.getAll();
    var assigned = (j.staffIds || []).map(function (sid) {
      return allStaff.find(function (s) { return s.id === sid; });
    }).filter(Boolean);
    document.getElementById('view-job-title').textContent = client ? client.name : 'Job Details';
    document.getElementById('view-job-meta').textContent  =
      MQ.ui.formatDate(j.date) + (j.time ? '  ·  ' + MQ.ui.formatTime(j.time) : '');

    var html = '';

    /* Status / schedule strip */
    html += '<div style="display:flex;flex-wrap:wrap;gap:var(--space-2);align-items:center;padding-bottom:var(--space-5);margin-bottom:var(--space-5);border-bottom:1px solid #f3f4f6;">' +
      MQ.ui.statusBadge(j.status) +
      (j.serviceType ? '<span class="badge badge--blue">' + escHtml(serviceLabel(j.serviceType)) + '</span>' : '') +
      (j.duration    ? '<span class="badge badge--grey">' + j.duration + 'h</span>' : '') +
      (j.price       ? '<span class="badge badge--green">$' + parseFloat(j.price).toFixed(2) + '</span>' : '') +
    '</div>';

    /* Two-column layout */
    html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-6);">';

    /* Left: client info + notes */
    html += '<div>';
    if (client) {
      var clientRows = [];
      if (client.address)         clientRows.push(['Address',  client.address]);
      if (client.phone)           clientRows.push(['Phone',    client.phone]);
      if (client.cleaningType)    clientRows.push(['Type',     client.cleaningType]);
      if (client.accessNotes)     clientRows.push(['Access',   client.accessNotes]);
      if (client.alarmInfo)       clientRows.push(['Alarm',    client.alarmInfo]);
      if (client.parkingNotes)    clientRows.push(['Parking',  client.parkingNotes]);
      if (client.pets)            clientRows.push(['Pets',     client.pets]);
      if (client.fragile)         clientRows.push(['Fragile',  client.fragile]);
      if (client.specialRequests) clientRows.push(['Requests', client.specialRequests]);
      html += infoSection('Client', clientRows);
    }
    if (j.notes) {
      html += infoSection('Notes', [['', j.notes]]);
    }
    html += '</div>';

    /* Right: property + team */
    html += '<div>';
    if (prop) {
      var propRows = [];
      var typeLabel = [prop.subtype, prop.type].filter(Boolean).join(' / ');
      if (typeLabel)           propRows.push(['Type',       typeLabel]);
      if (prop.bedrooms)       propRows.push(['Bedrooms',   prop.bedrooms]);
      if (prop.bathrooms)      propRows.push(['Bathrooms',  prop.bathrooms]);
      if (prop.sqm)            propRows.push(['Area',       prop.sqm + ' sqm']);
      if (prop.frequency)      propRows.push(['Frequency',  prop.frequency]);
      if (prop.carpetAreas)    propRows.push(['Carpet',     prop.carpetAreas]);
      if (prop.hardFloorAreas) propRows.push(['Hard Floor', prop.hardFloorAreas]);
      html += infoSection('Property', propRows);
    }

    if (assigned.length) {
      html += '<div style="margin-bottom:var(--space-5);">' +
        '<div style="font-size:0.68rem;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:var(--color-mid);margin-bottom:var(--space-3);">Team</div>' +
        '<div style="display:flex;flex-direction:column;gap:var(--space-2);">' +
          assigned.map(function (s) {
            return '<div style="display:flex;align-items:center;gap:var(--space-3);padding:var(--space-2) var(--space-3);background:#f9fafb;border:1.5px solid #e5e7eb;border-radius:var(--radius-sm);">' +
              '<span style="font-size:var(--text-sm);color:var(--color-dark);flex:1;">' + escHtml(s.name) + '</span>' +
              '<span class="badge badge--grey" style="font-size:0.6rem;">' + escHtml(s.role || 'staff') + '</span>' +
            '</div>';
          }).join('') +
        '</div>' +
      '</div>';
    }
    html += '</div>';
    html += '</div>'; /* end two-col */

    document.getElementById('view-job-body').innerHTML = html;

    /* Footer */
    var footerHTML = '<button type="button" class="btn-outline" data-modal-close="modal-view-job">Close</button>' +
      '<div style="display:flex;gap:var(--space-2);">';
    if (j.status !== 'completed' && j.status !== 'cancelled') {
      footerHTML += '<button class="btn-outline" style="color:var(--color-forest-green);border-color:var(--color-forest-green);" ' +
        'onclick="JobsPage.markComplete(\'' + j.id + '\');MQ.ui.modal.close(\'modal-view-job\')">&#10003; Mark Done</button>';
    }
    footerHTML += '<button class="btn-primary" onclick="MQ.ui.modal.close(\'modal-view-job\');JobsPage.edit(\'' + j.id + '\')">Edit</button>';
    footerHTML += '</div>';
    document.getElementById('view-job-footer').innerHTML = footerHTML;

    MQ.ui.modal.open('modal-view-job');
  }

  // ── Table render ──────────────────────────────────────────
  function renderTable() {
    var tbody = document.getElementById('jobs-tbody');
    var all   = MQ.store.visibleJobs().slice().sort(function (a, b) { return a.date < b.date ? -1 : 1; });
    var jobs  = applyFilters(all);

    if (!jobs.length) {
      tbody.innerHTML = '<tr><td colspan="6">' + MQ.ui.emptyState('M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z', 'No jobs found', 'Adjust filters or add a new job') + '</td></tr>';
      return;
    }

    tbody.innerHTML = jobs.map(function (j) {
      var isComplete = j.status === 'completed' || j.status === 'cancelled';

      var dateCell = '<strong>' + MQ.ui.formatDate(j.date) + '</strong>' +
        (j.time ? '<div style="font-size:var(--text-xs);color:var(--color-mid);margin-top:1px;">' + MQ.ui.formatTime(j.time) + (j.duration ? ' · ' + j.duration + 'h' : '') + '</div>' : '');

      var clientCell = '<strong>' + escHtml(getClientName(j.clientId)) + '</strong>' +
        (j.serviceType ? '<div style="font-size:var(--text-xs);color:var(--color-mid);margin-top:1px;">' + escHtml(serviceLabel(j.serviceType)) + '</div>' : '');

      var actions = '';
      if (!isComplete) {
        actions += '<button class="btn-outline" style="padding:0.35rem 0.65rem;font-size:0.72rem;white-space:nowrap;" onclick="JobsPage.markComplete(\'' + j.id + '\')" title="Mark complete">' +
          '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg> Done</button> ';
      }
      actions += '<button class="btn-icon" onclick="JobsPage.edit(\'' + j.id + '\')" title="Edit">' +
        '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>';
      actions += ' <button class="btn-icon btn-icon--danger" onclick="JobsPage.remove(\'' + j.id + '\')" title="Delete">' +
        '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/></svg></button>';

      return '<tr style="cursor:pointer;" onclick="JobsPage.view(\'' + j.id + '\')">' +
        '<td>' + dateCell + '</td>' +
        '<td>' + clientCell + '</td>' +
        '<td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--color-mid);">' + escHtml(getClientAddress(j.clientId)) + '</td>' +
        '<td>' + escHtml(getStaffNames(j.staffIds)) + '</td>' +
        '<td>' + MQ.ui.statusBadge(j.status) + '</td>' +
        '<td class="table-actions" onclick="event.stopPropagation()">' + actions + '</td>' +
        '</tr>';
    }).join('');
  }

  // ── Populate dropdowns ────────────────────────────────────
  function populateFilterStaff() {
    var sel   = document.getElementById('filter-staff');
    var staff = MQ.store.staff.getAll().filter(function (s) { return s.active; });
    sel.innerHTML = '<option value="">All Staff</option>' + staff.map(function (s) {
      return '<option value="' + s.id + '">' + escHtml(s.name) + '</option>';
    }).join('');
  }

  function populateJobClientDropdown(selectedId) {
    var sel     = document.getElementById('job-client');
    var clients = MQ.store.clients.getAll();
    sel.innerHTML = '<option value="">— Select client —</option>' + clients.map(function (c) {
      return '<option value="' + c.id + '"' + (c.id === selectedId ? ' selected' : '') + '>' + escHtml(c.name) + '</option>';
    }).join('');
  }

  function populateJobPropertyDropdown(clientId, selectedId) {
    var sel   = document.getElementById('job-property');
    if (!clientId) { sel.innerHTML = '<option value="">— No property —</option>'; return; }
    var props = MQ.store.properties.getAll().filter(function (p) { return p.clientId === clientId; });
    sel.innerHTML = '<option value="">— No property —</option>' + props.map(function (p) {
      var label = p.subtype || p.type;
      if (p.bedrooms) label += ' (' + p.bedrooms + 'b)';
      if (p.sqm)      label += ' ' + p.sqm + 'sqm';
      return '<option value="' + p.id + '"' + (p.id === selectedId ? ' selected' : '') + '>' + escHtml(label) + '</option>';
    }).join('');
  }

  function populateStaffCheckboxes(selectedIds) {
    var container = document.getElementById('job-staff-checkboxes');
    var staff     = MQ.store.staff.getAll().filter(function (s) { return s.active; });
    selectedIds   = selectedIds || [];

    container.innerHTML = staff.map(function (s) {
      var checked = selectedIds.includes(s.id) ? 'checked' : '';
      return '<label style="display:flex;align-items:center;gap:0.35rem;">' +
        '<input type="checkbox" class="job-staff-cb" value="' + s.id + '" ' + checked + '> ' +
        escHtml(s.name) + '</label>';
    }).join('');
  }

  // ── Client info panel (inside add/edit modal) ─────────────
  function renderClientInfo(clientId, propertyId) {
    var panel = document.getElementById('job-client-info');
    if (!panel) return;
    if (!clientId) { panel.hidden = true; return; }
    var c = MQ.store.clients.getById(clientId);
    if (!c) { panel.hidden = true; return; }

    var p    = propertyId ? MQ.store.properties.getById(propertyId) : null;
    var rows = [];

    if (c.address)         rows.push(['Address',  c.address]);
    if (c.cleaningType)    rows.push(['Type',      c.cleaningType]);
    if (c.accessNotes)     rows.push(['Access',    c.accessNotes]);
    if (c.alarmInfo)       rows.push(['Alarm',     c.alarmInfo]);
    if (c.parkingNotes)    rows.push(['Parking',   c.parkingNotes]);
    if (c.pets)            rows.push(['Pets',      c.pets]);
    if (c.fragile)         rows.push(['Fragile',   c.fragile]);
    if (c.specialRequests) rows.push(['Requests',  c.specialRequests]);

    if (p) {
      var pd = [];
      if (p.bedrooms)  pd.push(p.bedrooms  + ' bed');
      if (p.bathrooms) pd.push(p.bathrooms + ' bath');
      if (p.sqm)       pd.push(p.sqm       + ' sqm');
      if (pd.length)   rows.push(['Property', pd.join(' · ')]);
      if (p.frequency) rows.push(['Frequency', p.frequency]);
    }

    if (!rows.length) { panel.hidden = true; return; }

    panel.hidden  = false;
    panel.innerHTML =
      '<div style="background:#f8fafc;border:1.5px solid #e2e8f0;border-radius:var(--radius-sm);padding:var(--space-4);">' +
        '<div style="font-size:0.68rem;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:var(--color-mid);margin-bottom:var(--space-3);">' + escHtml(c.name) + '</div>' +
        '<div style="display:grid;grid-template-columns:max-content 1fr;gap:var(--space-1) var(--space-5);font-size:var(--text-sm);">' +
          rows.map(function (r) {
            return '<span style="color:var(--color-mid);white-space:nowrap;">' + r[0] + '</span>' +
                   '<span style="color:var(--color-dark);">' + escHtml(r[1]) + '</span>';
          }).join('') +
        '</div>' +
      '</div>';
  }

  // ── Open add modal ────────────────────────────────────────
  function openAddModal(preClientId) {
    editingId = null;
    document.getElementById('job-modal-title').textContent = 'Add Job';
    document.getElementById('job-id').value = '';
    document.getElementById('job-form').reset();
    populateJobClientDropdown(preClientId || null);
    populateJobPropertyDropdown(preClientId || null, null);
    populateStaffCheckboxes([]);
    document.getElementById('job-date').value = localDateStr(new Date());
    document.getElementById('job-time').value = '09:00';
    renderClientInfo(preClientId || null, null);
    MQ.ui.modal.open('modal-add-job');
  }

  // ── Edit existing job ─────────────────────────────────────
  function edit(id) {
    var j = MQ.store.jobs.getById(id);
    if (!j) return;
    editingId = id;
    document.getElementById('job-modal-title').textContent = 'Edit Job';
    document.getElementById('job-id').value = j.id;
    populateJobClientDropdown(j.clientId);
    populateJobPropertyDropdown(j.clientId, j.propertyId);
    populateStaffCheckboxes(j.staffIds || []);
    document.getElementById('job-date').value      = j.date         || '';
    document.getElementById('job-time').value      = j.time         || '';
    document.getElementById('job-duration').value  = j.duration     || 2;
    document.getElementById('job-status').value    = j.status       || 'scheduled';
    document.getElementById('job-type').value      = j.serviceType  || '';
    document.getElementById('job-price').value     = j.price        || '';
    document.getElementById('job-notes').value     = j.notes        || '';
    renderClientInfo(j.clientId, j.propertyId);
    MQ.ui.modal.open('modal-add-job');
  }

  // ── Mark complete ─────────────────────────────────────────
  function markComplete(id) {
    var j = MQ.store.jobs.getById(id);
    if (!j) return;
    j.status = 'completed';
    MQ.store.jobs.save(j);
    renderTable();
    MQ.ui.toast('Job completed', 'success');
  }

  // ── Delete ────────────────────────────────────────────────
  function remove(id) {
    if (!MQ.hasRole('manager')) { MQ.ui.toast('Only managers and owners can delete', 'error'); return; }
    MQ.ui.confirmDelete('Delete this job?', function () {
      MQ.store.jobs.delete(id);
      renderTable();
      MQ.ui.toast('Job deleted', 'info');
    });
  }

  // ── Init ─────────────────────────────────────────────────
  document.addEventListener('mq:ready', function () {
    MQ.store.seed();
    populateFilterStaff();
    renderTable();

    var params = new URLSearchParams(location.search);

    /* Pre-open add modal from client page */
    var clientId = params.get('clientId');
    if (clientId && MQ.store.clients.getById(clientId)) {
      openAddModal(clientId);
    }

    /* Open view modal from roster chip */
    var jobId = params.get('jobId');
    if (jobId && MQ.store.jobs.getById(jobId)) {
      view(jobId);
    }

    /* Pre-fill from accepted quote */
    var quoteId = params.get('quoteId');
    if (quoteId) {
      var q = MQ.store.quotes.getById(quoteId);
      if (q && q.status === 'accepted' && !q.jobCreated) {
        pendingQuoteId = quoteId;
        openAddModal(q.clientId || null);
        if (q.clientId) {
          document.getElementById('job-client').value = q.clientId;
          populateJobPropertyDropdown(q.clientId, q.propertyId);
          renderClientInfo(q.clientId, q.propertyId);
        }
        if (q.propertyId)  document.getElementById('job-property').value  = q.propertyId;
        if (q.labourHours) document.getElementById('job-duration').value  = q.labourHours;
        if (q.price)       document.getElementById('job-price').value     = q.price;
        if (q.price)       document.getElementById('job-notes').value     = 'From quote — ' + MQ.ui.formatCurrency(q.price);
      }
    }

    document.getElementById('btn-add-job').addEventListener('click', function () { openAddModal(null); });

    /* Filters — use 'input' for date pickers so they react immediately */
    document.getElementById('filter-status').addEventListener('change', renderTable);
    document.getElementById('filter-staff').addEventListener('change', renderTable);
    document.getElementById('filter-from').addEventListener('input', renderTable);
    document.getElementById('filter-to').addEventListener('input', renderTable);

    document.getElementById('filter-clear-btn').addEventListener('click', function () {
      document.getElementById('filter-status').value = '';
      document.getElementById('filter-from').value   = '';
      document.getElementById('filter-to').value     = '';
      document.getElementById('filter-staff').value  = '';
      renderTable();
    });

    /* Client / property change → refresh info panel */
    document.getElementById('job-client').addEventListener('change', function () {
      populateJobPropertyDropdown(this.value, null);
      renderClientInfo(this.value, null);
    });

    document.getElementById('job-property').addEventListener('change', function () {
      renderClientInfo(document.getElementById('job-client').value, this.value);
    });

    /* Save job */
    document.getElementById('job-form').addEventListener('submit', function (e) {
      e.preventDefault();
      var clientId = document.getElementById('job-client').value;
      var date     = document.getElementById('job-date').value;
      var time     = document.getElementById('job-time').value;
      if (!clientId || !date || !time) {
        MQ.ui.toast('Client, date and time are required', 'error');
        return;
      }

      var staffIds = Array.from(document.querySelectorAll('.job-staff-cb:checked')).map(function (el) { return el.value; });

      var obj = {
        clientId:     clientId,
        propertyId:   document.getElementById('job-property').value   || null,
        date:         date,
        time:         time,
        duration:     parseFloat(document.getElementById('job-duration').value) || 2,
        status:       document.getElementById('job-status').value,
        serviceType:  document.getElementById('job-type').value        || null,
        price:        parseFloat(document.getElementById('job-price').value)  || null,
        staffIds:     staffIds,
        notes:        document.getElementById('job-notes').value.trim(),
      };
      if (editingId) obj.id = editingId;

      MQ.store.jobs.save(obj);

      if (pendingQuoteId) {
        var qt = MQ.store.quotes.getById(pendingQuoteId);
        if (qt) { qt.jobCreated = true; MQ.store.quotes.save(qt); }
        pendingQuoteId = null;
      }

      MQ.ui.modal.close('modal-add-job');
      renderTable();
      MQ.ui.toast('Job saved');
    });
  });

  window.JobsPage = { view: view, edit: edit, remove: remove, markComplete: markComplete };
})();
