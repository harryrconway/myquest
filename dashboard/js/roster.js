/* ============================================================
   MYQUEST — roster.js
   ============================================================ */
(function () {
  'use strict';

  var DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  var STATUS_BG = {
    'scheduled':   '#3b82f6',
    'in-progress': '#f59e0b',
    'completed':   '#22c55e',
    'cancelled':   '#9ca3af',
  };

  // ── Date helpers ──────────────────────────────────────────
  function getMondayOfWeek(date) {
    var d   = new Date(date);
    var day = d.getDay();
    d.setDate(d.getDate() + ((day === 0) ? -6 : 1 - day));
    d.setHours(0, 0, 0, 0);
    return d;
  }

  function addDays(date, n) {
    var d = new Date(date);
    d.setDate(d.getDate() + n);
    return d;
  }

  // Uses local time — avoids UTC offset bug (toISOString returns UTC)
  function isoDate(d) {
    var m   = String(d.getMonth() + 1).padStart(2, '0');
    var day = String(d.getDate()).padStart(2, '0');
    return d.getFullYear() + '-' + m + '-' + day;
  }

  function shortDate(d) {
    return d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' });
  }

  function getWeekDates(monday) {
    return DAY_NAMES.map(function (_, i) { return addDays(monday, i); });
  }

  // ── State ─────────────────────────────────────────────────
  var currentWeekStart = getMondayOfWeek(new Date());

  function getClientName(id) {
    var c = MQ.store.clients.getById(id);
    return c ? c.name.split(' ')[0] : '?';
  }

  // ── Render ────────────────────────────────────────────────
  function renderRoster() {
    var dates     = getWeekDates(currentWeekStart);
    var todayStr  = isoDate(new Date());
    var isManager = MQ.hasRole('manager');
    var allStaff  = MQ.store.staff.getAll().filter(function (s) { return s.active; });
    var jobs      = MQ.store.jobs.getAll();

    var staffToShow = isManager
      ? allStaff
      : allStaff.filter(function (s) { return s.email === MQ.session.email; });

    document.getElementById('roster-week-label').textContent =
      'Week of ' + shortDate(currentWeekStart) + ' – ' + shortDate(dates[6]);

    // Header row: Staff | Mon … Sun | Hrs
    document.getElementById('roster-thead').innerHTML = '<tr>' +
      '<th style="min-width:130px;">Staff</th>' +
      dates.map(function (d, i) {
        var isToday = isoDate(d) === todayStr;
        var bg  = isToday ? 'background:var(--color-soft-sage);' : '';
        var col = isToday ? 'color:var(--color-forest-green);' : '';
        var fw  = isToday ? 'font-weight:700;' : '';
        return '<th style="min-width:110px;' + bg + col + fw + '">' +
          DAY_NAMES[i] + '<br>' +
          '<small style="font-weight:400;font-size:0.7rem;opacity:0.75;">' + shortDate(d) + '</small>' +
        '</th>';
      }).join('') +
      '<th style="text-align:right;min-width:50px;color:var(--color-light);">Hrs</th>' +
    '</tr>';

    // Body rows
    var tbody = document.getElementById('roster-tbody');
    if (!staffToShow.length) {
      tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;padding:2rem;color:var(--color-mid);">No active staff to display</td></tr>';
      return;
    }

    tbody.innerHTML = staffToShow.map(function (s) {
      var initial   = s.name.charAt(0).toUpperCase();
      var firstName = s.name.split(' ')[0];
      var weekHours = 0;

      var staffCell = '<td>' +
        '<div class="roster-staff-cell">' +
          '<div class="roster-staff-avatar">' + initial + '</div>' +
          '<span style="font-size:var(--text-sm);font-weight:600;color:var(--color-dark);">' + firstName + '</span>' +
        '</div>' +
      '</td>';

      var dayCells = dates.map(function (d) {
        var dateStr = isoDate(d);
        var isToday = dateStr === todayStr;
        var dayJobs = jobs.filter(function (j) {
          return j.date === dateStr && j.staffIds && j.staffIds.includes(s.id);
        });

        dayJobs.forEach(function (j) { weekHours += (parseFloat(j.duration) || 0); });

        var chips = dayJobs.map(function (j) {
          var bg    = STATUS_BG[j.status] || STATUS_BG.scheduled;
          var label = getClientName(j.clientId) + (j.time ? ' ' + j.time.slice(0, 5) : '');
          var tip   = getClientName(j.clientId) +
            (j.time     ? ' at ' + j.time.slice(0, 5) : '') +
            (j.duration ? ' · ' + j.duration + 'h'    : '') +
            (j.status !== 'scheduled' ? ' (' + j.status + ')' : '');
          return '<a href="jobs.html?jobId=' + j.id + '" class="roster-chip" style="background:' + bg + ';" title="' + tip + '">' + label + '</a>';
        }).join('');

        var cellBg = isToday ? 'background:rgba(45,90,60,0.04);' : '';
        return '<td style="' + cellBg + 'vertical-align:top;padding:var(--space-2);">' + (chips || '') + '</td>';
      }).join('');

      var hoursCell = '<td style="text-align:right;vertical-align:middle;font-size:var(--text-xs);font-weight:700;color:' +
        (weekHours > 0 ? 'var(--color-mid)' : 'var(--color-light)') + ';white-space:nowrap;">' +
        (weekHours > 0 ? weekHours + 'h' : '—') +
      '</td>';

      return '<tr>' + staffCell + dayCells + hoursCell + '</tr>';
    }).join('');
  }

  // ── Copy last week ────────────────────────────────────────
  function copyLastWeek() {
    var lastMonday = addDays(currentWeekStart, -7);
    var lastDates  = getWeekDates(lastMonday);
    var thisDates  = getWeekDates(currentWeekStart);
    var jobs       = MQ.store.jobs.getAll();

    var lastWeekJobs = jobs.filter(function (j) {
      return j.date >= isoDate(lastDates[0]) && j.date <= isoDate(lastDates[6]);
    });

    if (!lastWeekJobs.length) {
      MQ.ui.toast('No jobs found in previous week', 'info');
      return;
    }

    var count = 0;
    lastWeekJobs.forEach(function (j) {
      var dayOffset = lastDates.findIndex(function (d) { return isoDate(d) === j.date; });
      if (dayOffset < 0) return;
      var newDate = isoDate(thisDates[dayOffset]);

      var exists = jobs.some(function (jj) {
        return jj.date === newDate && jj.clientId === j.clientId && jj.time === j.time;
      });
      if (exists) return;

      MQ.store.jobs.save({
        clientId:     j.clientId,
        propertyId:   j.propertyId,
        date:         newDate,
        time:         j.time,
        duration:     j.duration,
        serviceType:  j.serviceType,
        price:        j.price,
        staffIds:     j.staffIds,
        teamLeaderId: j.teamLeaderId,
        status:       'scheduled',
        notes:        j.notes,
        recurring:    j.recurring,
      });
      count++;
    });

    MQ.ui.toast(count + ' job' + (count !== 1 ? 's' : '') + ' copied to this week', count > 0 ? 'success' : 'info');
    renderRoster();
  }

  // ── Init ─────────────────────────────────────────────────
  document.addEventListener('mq:ready', function () {
    MQ.store.seed();
    renderRoster();

    document.getElementById('roster-prev').addEventListener('click', function () {
      currentWeekStart = addDays(currentWeekStart, -7);
      renderRoster();
    });
    document.getElementById('roster-today').addEventListener('click', function () {
      currentWeekStart = getMondayOfWeek(new Date());
      renderRoster();
    });
    document.getElementById('roster-next').addEventListener('click', function () {
      currentWeekStart = addDays(currentWeekStart, 7);
      renderRoster();
    });

    var copyBtn = document.getElementById('roster-copy');
    if (copyBtn) copyBtn.addEventListener('click', copyLastWeek);
  });
})();
