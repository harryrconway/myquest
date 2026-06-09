/* ============================================================
   MYQUEST — time-tracking.js
   ============================================================ */
(function () {
  'use strict';

  var clockInterval = null;
  var openLogId = null;
  var logStaffFilter = '';

  function pad2(n) { return String(n).padStart(2, '0'); }

  function updateClock() {
    var now = new Date();
    document.getElementById('clock-display').textContent =
      pad2(now.getHours()) + ':' + pad2(now.getMinutes()) + ':' + pad2(now.getSeconds());
    document.getElementById('clock-date').textContent =
      now.toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  }

  function getMyStaff() {
    return MQ.store.staff.getAll().find(function (s) { return s.email === MQ.session.email; }) || null;
  }

  function getClientName(id) {
    var c = MQ.store.clients.getById(id);
    return c ? c.name : '—';
  }

  function getStaffName(id) {
    var s = MQ.store.staff.getById(id);
    return s ? s.name : '—';
  }

  function getJobLabel(jobId) {
    var j = MQ.store.jobs.getById(jobId);
    if (!j) return 'Unknown job';
    return getClientName(j.clientId) + (j.time ? ' ' + j.time.slice(0,5) : '');
  }

  function populateJobSelect() {
    var sel = document.getElementById('clock-job-select');
    var today = new Date().toISOString().slice(0, 10);
    var jobs = MQ.store.visibleJobs().filter(function (j) { return j.date === today; });

    sel.innerHTML = '<option value="">— No job selected —</option>' + jobs.map(function (j) {
      return '<option value="' + j.id + '">' + getClientName(j.clientId) + (j.time ? ' @ ' + j.time.slice(0,5) : '') + '</option>';
    }).join('');
  }

  function findOpenLog() {
    var myStaff = getMyStaff();
    if (!myStaff) return null;
    var logs = MQ.store.timeLogs.getAll();
    return logs.find(function (l) { return l.staffId === myStaff.id && !l.clockOut; }) || null;
  }

  function updateClockBtn() {
    var openLog = findOpenLog();
    var btn = document.getElementById('clock-btn');
    var status = document.getElementById('clock-status');
    if (openLog) {
      openLogId = openLog.id;
      btn.textContent = 'Clock Out';
      btn.classList.remove('btn-primary');
      btn.classList.add('btn-danger');
      var inTime = new Date(openLog.clockIn);
      status.textContent = 'Clocked in since ' + pad2(inTime.getHours()) + ':' + pad2(inTime.getMinutes());
      if (openLog.jobId) {
        document.getElementById('clock-job-select').value = openLog.jobId;
      }
    } else {
      openLogId = null;
      btn.textContent = 'Clock In';
      btn.classList.remove('btn-danger');
      btn.classList.add('btn-primary');
      status.textContent = '';
    }
  }

  function clockIn() {
    var myStaff = getMyStaff();
    if (!myStaff) { MQ.ui.toast('Staff record not found for your account', 'error'); return; }
    var jobId = document.getElementById('clock-job-select').value || null;
    var log = {
      staffId: myStaff.id,
      jobId: jobId,
      clockIn: new Date().toISOString(),
      clockOut: null,
      totalMins: null,
    };
    MQ.store.timeLogs.save(log);
    updateClockBtn();
    renderLogsTable();
    MQ.ui.toast('Clocked in at ' + pad2(new Date().getHours()) + ':' + pad2(new Date().getMinutes()));
  }

  function clockOut() {
    var openLog = findOpenLog();
    if (!openLog) return;
    var now = new Date();
    var inTime = new Date(openLog.clockIn);
    var totalMins = Math.round((now - inTime) / 60000);
    openLog.clockOut = now.toISOString();
    openLog.totalMins = totalMins;
    MQ.store.timeLogs.save(openLog);
    openLogId = null;
    updateClockBtn();
    renderLogsTable();
    var hrs = Math.floor(totalMins / 60);
    var mins = totalMins % 60;
    MQ.ui.toast('Clocked out. Total: ' + hrs + 'h ' + mins + 'm');
  }

  function formatDuration(mins) {
    if (!mins && mins !== 0) return '—';
    var h = Math.floor(mins / 60);
    var m = mins % 60;
    return h + 'h ' + pad2(m) + 'm';
  }

  function renderLogsTable() {
    var tbody = document.getElementById('time-log-tbody');
    var isManager = MQ.hasRole('manager');
    var myStaff = getMyStaff();
    var logs = MQ.store.timeLogs.getAll().slice().reverse();

    if (isManager && logStaffFilter) {
      logs = logs.filter(function (l) { return l.staffId === logStaffFilter; });
    } else if (!isManager && myStaff) {
      logs = logs.filter(function (l) { return l.staffId === myStaff.id; });
    }

    if (!logs.length) {
      tbody.innerHTML = '<tr><td colspan="7"><div class="empty-state"><p class="empty-state__title">No time logs yet</p></div></td></tr>';
      return;
    }

    tbody.innerHTML = logs.map(function (l) {
      var inTime = new Date(l.clockIn);
      var outTime = l.clockOut ? new Date(l.clockOut) : null;
      return '<tr' + (!l.clockOut ? ' style="background:rgba(45,90,60,0.04);"' : '') + '>' +
        '<td>' + getStaffName(l.staffId) + '</td>' +
        '<td>' + (l.jobId ? getJobLabel(l.jobId) : '—') + '</td>' +
        '<td>' + inTime.toLocaleDateString('en-AU') + '</td>' +
        '<td>' + pad2(inTime.getHours()) + ':' + pad2(inTime.getMinutes()) + '</td>' +
        '<td>' + (outTime ? pad2(outTime.getHours()) + ':' + pad2(outTime.getMinutes()) : '<span class="badge badge--green">Active</span>') + '</td>' +
        '<td>' + formatDuration(l.totalMins) + '</td>' +
        '<td class="table-actions">' +
          (isManager ? '<button class="btn-icon btn-icon--danger" onclick="TimeTrackingPage.deleteLog(\'' + l.id + '\')" title="Delete"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/></svg></button>' : '') +
        '</td>' +
        '</tr>';
    }).join('');
  }

  function populateManagerFilter() {
    var row = document.getElementById('log-filter-row');
    var sel = document.getElementById('log-filter-staff');
    if (!MQ.hasRole('manager')) return;
    row.style.display = '';
    var staff = MQ.store.staff.getAll();
    sel.innerHTML = '<option value="">All Staff</option>' + staff.map(function (s) {
      return '<option value="' + s.id + '">' + s.name + '</option>';
    }).join('');
    sel.addEventListener('change', function () {
      logStaffFilter = this.value;
      renderLogsTable();
    });
  }

  function deleteLog(id) {
    if (!MQ.hasRole('manager')) { MQ.ui.toast('Only managers and owners can delete', 'error'); return; }
    MQ.ui.confirmDelete('Delete this time log?', function () {
      MQ.store.timeLogs.delete(id);
      renderLogsTable();
      updateClockBtn();
      MQ.ui.toast('Log deleted', 'info');
    });
  }

  document.addEventListener('mq:ready', function () {
    MQ.store.seed();
    updateClock();
    clockInterval = setInterval(updateClock, 1000);
    populateJobSelect();
    updateClockBtn();
    renderLogsTable();
    populateManagerFilter();

    document.getElementById('clock-btn').addEventListener('click', function () {
      var openLog = findOpenLog();
      if (openLog) {
        clockOut();
      } else {
        clockIn();
      }
    });
  });

  window.TimeTrackingPage = { deleteLog: deleteLog };
})();
