/* ============================================================
   MYQUEST — scheduled-jobs.js
   Reads quote_requests WHERE status='scheduled' from Supabase
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
      var [y, m, d] = str.split('-');
      var dt = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
      return dt.toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
    } catch (e) { return str; }
  }

  function fmtTime(str) {
    if (!str) return '—';
    try {
      var [h, m] = str.split(':').map(Number);
      var suffix = h < 12 ? 'am' : 'pm';
      var hour   = h % 12 || 12;
      return hour + ':' + String(m).padStart(2, '0') + suffix;
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
      render();
    } catch (err) {
      wrap.innerHTML = '<div style="padding:40px;text-align:center;color:var(--color-error);">Failed to load jobs: ' + escHtml(err.message) + '</div>';
    }
  }

  /* ─── Render ────────────────────────────────────────────────── */

  function render() {
    var wrap = document.getElementById('sj-table-wrap');

    if (!jobs.length) {
      wrap.innerHTML = MQ.ui.emptyState(
        'M3 4h18v2H3V4zm0 4h18v2H3V8zm0 4h12v2H3v-2z',
        'No scheduled jobs',
        'Accepted jobs will appear here'
      );
      return;
    }

    var rows = jobs.map(function (j) {
      var address = [j.suburb, j.state].filter(Boolean).join(', ') || '—';
      var isManager = MQ.hasRole('manager');
      return '<tr>' +
        '<td>' + escHtml(fmtDate(j.scheduled_date)) + ' ' + escHtml(fmtTime(j.scheduled_time)) + '</td>' +
        '<td>' + escHtml(j.full_name) + '</td>' +
        '<td>' + escHtml(address) + '</td>' +
        '<td>' + escHtml(fmtServices(j.services)) + '</td>' +
        '<td>' + escHtml(getStaffNames(j.assigned_staff_ids)) + '</td>' +
        '<td>' +
          '<div style="display:flex;gap:6px;flex-wrap:wrap;">' +
            '<button class="btn-outline" style="font-size:12px;padding:4px 10px;" onclick="SJPage.view(\'' + j.id + '\')">View</button>' +
            (isManager ? '<button class="btn-outline" style="font-size:12px;padding:4px 10px;" onclick="SJPage.openEdit(\'' + j.id + '\')">Edit</button>' : '') +
            (isManager ? '<button class="btn-primary" style="font-size:12px;padding:4px 10px;" onclick="SJPage.markComplete(\'' + j.id + '\')">Complete</button>' : '') +
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

    document.getElementById('sj-edit-id').value   = id;
    document.getElementById('sj-edit-date').value  = j.scheduled_date || '';
    document.getElementById('sj-edit-time').value  = j.scheduled_time || '';
    document.getElementById('sj-edit-error').style.display = 'none';

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
        load();
      } catch (err) {
        MQ.ui.toast('Error: ' + err.message, 'error');
      }
    });
  }

  /* ─── Init ──────────────────────────────────────────────────── */

  document.addEventListener('mq:ready', function () {
    load();
    document.getElementById('btn-refresh').addEventListener('click', load);
    document.getElementById('sj-edit-submit').addEventListener('click', submitEdit);
    document.getElementById('sj-view-complete-btn').addEventListener('click', function () {
      if (viewingId) markComplete(viewingId);
    });
  });

  window.SJPage = { view: view, openEdit: openEdit, markComplete: markComplete };
})();
