/* ============================================================
   MYQUEST — unscheduled-jobs.js
   Reads quote_requests WHERE status='unscheduled' from Supabase
   ============================================================ */
(function () {
  'use strict';

  var jobs = [];
  var viewingId = null;

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
      render();
    } catch (err) {
      wrap.innerHTML = '<div style="padding:40px;text-align:center;color:var(--color-error);">Failed to load jobs: ' + escHtml(err.message) + '</div>';
    }
  }

  /* ─── Render ────────────────────────────────────────────────── */

  function render() {
    var wrap = document.getElementById('uj-table-wrap');

    if (!jobs.length) {
      wrap.innerHTML = MQ.ui.emptyState(
        'M22 12h-4l-3 9L9 3l-3 9H2',
        'No unscheduled jobs',
        'New quote requests will appear here'
      );
      return;
    }

    var rows = jobs.map(function (j) {
      var address = [j.suburb, j.state].filter(Boolean).join(', ') || '—';
      return '<tr>' +
        '<td>' + escHtml(j.full_name) + '</td>' +
        '<td>' + escHtml(address) + '</td>' +
        '<td><a href="tel:' + escHtml(j.phone) + '">' + escHtml(j.phone) + '</a></td>' +
        '<td>' + escHtml(fmtServices(j.services)) + '</td>' +
        '<td>' + escHtml(j.property_type || '—') + '</td>' +
        '<td>' + escHtml(fmtDate(j.created_at)) + '</td>' +
        '<td>' +
          '<div style="display:flex;gap:6px;">' +
            '<button class="btn-outline" style="font-size:12px;padding:4px 10px;" onclick="UJPage.view(\'' + j.id + '\')">View</button>' +
            '<button class="btn-primary" style="font-size:12px;padding:4px 10px;" onclick="UJPage.openAccept(\'' + j.id + '\')">Accept</button>' +
            '<button class="btn-icon btn-icon--danger" title="Archive" onclick="UJPage.archive(\'' + j.id + '\')" style="font-size:11px;padding:4px 8px;">Archive</button>' +
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
        row('Staff count',      j.staff_count) +
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

  /* ─── Init ──────────────────────────────────────────────────── */

  document.addEventListener('mq:ready', function () {
    load();
    document.getElementById('btn-refresh').addEventListener('click', load);
    document.getElementById('uj-accept-submit').addEventListener('click', submitAccept);
    document.getElementById('uj-view-accept-btn').addEventListener('click', function () {
      if (viewingId) openAccept(viewingId);
    });
  });

  window.UJPage = { view: view, openAccept: openAccept, archive: archive };
})();
