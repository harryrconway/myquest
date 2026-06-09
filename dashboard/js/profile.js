(function () {
  'use strict';

  function esc(s) {
    return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  function initials(name) {
    return (name || '?').split(' ').map(function (w) { return w[0] || ''; }).join('').slice(0, 2).toUpperCase() || '?';
  }

  function roleBadge(role) {
    var map = { owner: 'badge--green', manager: 'badge--blue', staff: 'badge--grey' };
    var label = role ? role.charAt(0).toUpperCase() + role.slice(1) : 'Staff';
    return '<span class="badge ' + (map[role] || 'badge--grey') + '">' + label + '</span>';
  }

  function levelNames() {
    return {1:'Trainee',2:'Cleaner',3:'Mid Cleaner',4:'Senior',5:'Team Leader',6:'Supervisor',7:'Sr Supervisor',8:'Ops Lead',9:'Area Manager',10:'Regional Mgr',11:'Director'};
  }

  function render(staffId) {
    var staff = MQ.store.staff.getById(staffId);
    if (!staff) {
      window.location.href = 'staff.html';
      return;
    }

    var level = staff.level || 1;
    var names = levelNames();
    var levelName = names[level] || ('Level ' + level);
    var isManager = MQ.hasRole('manager');

    var allJobs = MQ.store.jobs.getAll();
    var staffJobs = allJobs.filter(function (j) {
      return Array.isArray(j.staffIds) && j.staffIds.indexOf(staffId) !== -1;
    }).sort(function (a, b) { return (b.date || '').localeCompare(a.date || ''); });

    var allLogs = MQ.store.timeLogs.getAll();
    var staffLogs = allLogs.filter(function (l) { return l.staffId === staffId; })
      .sort(function (a, b) { return (b.date || '').localeCompare(a.date || ''); });

    var html = '';

    /* ---- Profile header ---- */
    html += '<div class="dash-card mb-8"><div class="dash-card__body">' +
      '<div style="display:flex;align-items:center;gap:var(--space-6);flex-wrap:wrap;">' +
        '<div style="width:72px;height:72px;border-radius:50%;background:var(--color-soft-sage);display:flex;align-items:center;justify-content:center;font-size:var(--text-2xl);font-weight:700;color:var(--color-forest-green);flex-shrink:0;">' +
          esc(initials(staff.name)) +
        '</div>' +
        '<div style="flex:1;min-width:0;">' +
          '<h1 style="font-size:var(--text-2xl);font-weight:700;color:var(--color-dark);margin-bottom:var(--space-2);">' + esc(staff.name) + '</h1>' +
          '<div style="display:flex;gap:var(--space-2);flex-wrap:wrap;align-items:center;">' +
            '<span class="level-badge level-badge--' + level + '">L' + level + ' ' + esc(levelName) + '</span>' +
            roleBadge(staff.role) +
            (staff.active ? '<span class="badge badge--green">Active</span>' : '<span class="badge badge--grey">Inactive</span>') +
          '</div>' +
        '</div>' +
      '</div>' +
    '</div></div>';

    /* ---- Detail card ---- */
    var details = [];
    if (staff.email)     details.push(['Email', esc(staff.email)]);
    if (staff.phone)     details.push(['Phone', esc(staff.phone)]);
    if (staff.startDate) details.push(['Started', MQ.ui.formatDate(staff.startDate)]);

    if (details.length) {
      html += '<div class="dash-card mb-8"><div class="dash-card__body">' +
        '<dl style="display:grid;grid-template-columns:max-content 1fr;gap:var(--space-2) var(--space-6);">' +
          details.map(function (d) {
            return '<dt style="color:var(--color-mid);font-size:var(--text-sm);">' + d[0] + '</dt>' +
                   '<dd style="font-size:var(--text-sm);font-weight:500;">' + d[1] + '</dd>';
          }).join('') +
        '</dl>' +
      '</div></div>';
    }

    /* ---- Stats ---- */
    var completed = staffJobs.filter(function (j) { return j.status === 'completed'; }).length;
    var scheduled = staffJobs.filter(function (j) { return j.status === 'scheduled'; }).length;
    var totalHours = staffLogs.reduce(function (s, l) { return s + (parseFloat(l.hours) || 0); }, 0);

    html += '<div class="stats-grid mb-8" style="grid-template-columns:repeat(3,1fr);">' +
      statCard('Jobs Completed', completed, 'green', '<polyline points="20 6 9 17 4 12"/>') +
      statCard('Upcoming Jobs', scheduled, 'blue', '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>') +
      statCard('Hours Logged', Math.round(totalHours * 10) / 10, 'sage', '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>') +
    '</div>';

    /* ---- Recent jobs ---- */
    if (staffJobs.length) {
      var recentJobs = staffJobs.slice(0, 10);
      var clients = MQ.store.clients.getAll();
      html += '<div class="dash-card mb-8">' +
        '<div class="dash-card__header"><span class="dash-card__title">Recent Jobs</span></div>' +
        '<div class="dash-table-wrap"><table class="dash-table"><thead><tr><th>Date</th><th>Client</th><th>Duration</th><th>Status</th></tr></thead><tbody>' +
          recentJobs.map(function (j) {
            var client = clients.find(function (c) { return c.id === j.clientId; });
            var statusMap = { scheduled: 'badge--blue', completed: 'badge--green', cancelled: 'badge--grey', 'in-progress': 'badge--amber' };
            return '<tr>' +
              '<td>' + MQ.ui.formatDate(j.date) + '</td>' +
              '<td>' + esc((client && client.name) || '—') + '</td>' +
              '<td>' + (j.duration ? j.duration + 'h' : '—') + '</td>' +
              '<td><span class="badge ' + (statusMap[j.status] || 'badge--grey') + '">' + esc(j.status || '—') + '</span></td>' +
            '</tr>';
          }).join('') +
        '</tbody></table></div>' +
      '</div>';
    }

    /* ---- Recent time logs ---- */
    if (staffLogs.length) {
      var recentLogs = staffLogs.slice(0, 10);
      html += '<div class="dash-card">' +
        '<div class="dash-card__header"><span class="dash-card__title">Time Logs</span></div>' +
        '<div class="dash-table-wrap"><table class="dash-table"><thead><tr><th>Date</th><th>Clock In</th><th>Clock Out</th><th>Hours</th></tr></thead><tbody>' +
          recentLogs.map(function (l) {
            return '<tr>' +
              '<td>' + MQ.ui.formatDate(l.date) + '</td>' +
              '<td>' + esc(l.clockIn || '—') + '</td>' +
              '<td>' + esc(l.clockOut || '—') + '</td>' +
              '<td>' + (l.hours ? l.hours + 'h' : '—') + '</td>' +
            '</tr>';
          }).join('') +
        '</tbody></table></div>' +
      '</div>';
    }

    document.getElementById('profile-content').innerHTML = html;
  }

  function statCard(label, val, colorKey, iconPath) {
    var colorMap = { green: 'stat-card__icon--green', blue: 'stat-card__icon--blue', sage: 'stat-card__icon--sage' };
    return '<div class="stat-card">' +
      '<div class="stat-card__icon ' + (colorMap[colorKey] || '') + '">' +
        '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">' + iconPath + '</svg>' +
      '</div>' +
      '<div class="stat-card__value">' + esc(String(val)) + '</div>' +
      '<div class="stat-card__label">' + label + '</div>' +
    '</div>';
  }

  document.addEventListener('mq:ready', function () {
    MQ.store.seed();
    var params = new URLSearchParams(window.location.search);
    var staffId = params.get('id');
    if (!staffId) {
      window.location.href = 'staff.html';
      return;
    }
    render(staffId);
  });

})();
