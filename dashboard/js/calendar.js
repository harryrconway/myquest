(function () {
  'use strict';

  var today = new Date();
  today.setHours(0, 0, 0, 0);
  var currentYear = today.getFullYear();
  var currentMonth = today.getMonth();

  var STATUS_COLORS = {
    'scheduled':   { bg: '#3b82f6', text: '#fff', light: '#dbeafe' },
    'in-progress': { bg: '#f59e0b', text: '#fff', light: '#fef3c7' },
    'completed':   { bg: '#22c55e', text: '#fff', light: '#dcfce7' },
    'cancelled':   { bg: '#d1d5db', text: '#6b7280', light: '#f3f4f6' },
  };

  function isoDate(d) {
    var m = String(d.getMonth() + 1).padStart(2, '0');
    var day = String(d.getDate()).padStart(2, '0');
    return d.getFullYear() + '-' + m + '-' + day;
  }

  function getClientName(id) {
    var c = MQ.store.clients.getById(id);
    return c ? c.name : '—';
  }

  function getFilters() {
    return {
      status:  (document.getElementById('cal-filter-status') || {}).value || '',
      staffId: (document.getElementById('cal-filter-staff') || {}).value || '',
    };
  }

  function applyFilters(jobs) {
    var f = getFilters();
    return jobs.filter(function (j) {
      if (f.status && j.status !== f.status) return false;
      if (f.staffId && (!j.staffIds || j.staffIds.indexOf(f.staffId) === -1)) return false;
      return true;
    });
  }

  function renderCalendar() {
    var grid = document.getElementById('cal-grid');
    var label = document.getElementById('cal-month-label');

    var firstDay = new Date(currentYear, currentMonth, 1);
    var lastDay  = new Date(currentYear, currentMonth + 1, 0);

    label.textContent = firstDay.toLocaleDateString('en-AU', { month: 'long', year: 'numeric' });

    var offset = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;
    var allJobs = applyFilters(MQ.store.visibleJobs());

    var cells = [];
    for (var i = 0; i < offset; i++) {
      var padDate = new Date(firstDay);
      padDate.setDate(padDate.getDate() - (offset - i));
      cells.push({ date: padDate, current: false });
    }
    for (var d = 1; d <= lastDay.getDate(); d++) {
      cells.push({ date: new Date(currentYear, currentMonth, d), current: true });
    }
    var rem = cells.length % 7;
    if (rem > 0) {
      for (var j = 1; j <= 7 - rem; j++) {
        var pd = new Date(lastDay);
        pd.setDate(pd.getDate() + j);
        cells.push({ date: pd, current: false });
      }
    }

    grid.innerHTML = cells.map(function (cell) {
      var ds = isoDate(cell.date);
      var isToday = isoDate(today) === ds;
      var dayJobs = allJobs.filter(function (j) { return j.date === ds; });

      var chips = dayJobs.slice(0, 3).map(function (j) {
        var sc = STATUS_COLORS[j.status] || STATUS_COLORS.scheduled;
        var timeStr = j.time ? j.time.slice(0, 5) + ' ' : '';
        return '<div style="background:' + sc.bg + ';color:' + sc.text + ';border-radius:4px;font-size:10px;font-weight:600;padding:2px 5px;margin-bottom:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;cursor:pointer;line-height:1.4;" onclick="event.stopPropagation();CalendarPage.showDetail(\'' + ds + '\')" title="' + getClientName(j.clientId) + '">' +
          timeStr + getClientName(j.clientId) +
        '</div>';
      }).join('');

      var overflow = dayJobs.length > 3
        ? '<div style="font-size:10px;color:var(--color-mid);margin-top:1px;">+' + (dayJobs.length - 3) + ' more</div>'
        : '';

      var todayStyle = isToday ? 'background:#f0fdf4;' : (!cell.current ? 'background:#fafafa;opacity:0.6;' : '');

      return '<div style="min-height:96px;padding:6px;border-right:1px solid #f3f4f6;border-bottom:1px solid #f3f4f6;' + todayStyle + 'cursor:pointer;position:relative;" onclick="CalendarPage.showDetail(\'' + ds + '\')">' +
        '<div style="display:flex;align-items:center;justify-content:' + (isToday ? 'center' : 'flex-start') + ';margin-bottom:4px;">' +
          '<span style="' + (isToday ? 'background:var(--color-forest-green);color:white;width:22px;height:22px;border-radius:50%;display:flex;align-items:center;justify-content:center;' : '') + 'font-size:var(--text-xs);font-weight:' + (isToday ? '700' : '500') + ';color:' + (isToday ? 'white' : (cell.current ? 'var(--color-dark)' : 'var(--color-light)')) + ';">' + cell.date.getDate() + '</span>' +
        '</div>' +
        chips + overflow +
      '</div>';
    }).join('');
  }

  function showDetail(dateStr) {
    var panel    = document.getElementById('cal-detail');
    var dateLabel= document.getElementById('cal-detail-date');
    var countEl  = document.getElementById('cal-detail-count');
    var body     = document.getElementById('cal-detail-body');

    var d = new Date(dateStr + 'T00:00:00');
    dateLabel.textContent = d.toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' });

    var jobs = applyFilters(MQ.store.visibleJobs()).filter(function (j) { return j.date === dateStr; });
    jobs.sort(function (a, b) { return (a.time || '').localeCompare(b.time || ''); });

    if (countEl) countEl.textContent = jobs.length + ' job' + (jobs.length === 1 ? '' : 's');

    if (!jobs.length) {
      body.innerHTML = '<p style="color:var(--color-mid);font-size:var(--text-sm);text-align:center;padding:var(--space-6) 0;">No jobs on this day.</p>';
      panel.style.display = 'block';
      return;
    }

    var clientMap = {};
    MQ.store.clients.getAll().forEach(function (c) { clientMap[c.id] = c; });
    var staffMap = {};
    MQ.store.staff.getAll().forEach(function (s) { staffMap[s.id] = s; });

    body.innerHTML = jobs.map(function (j) {
      var client = clientMap[j.clientId] || {};
      var sc = STATUS_COLORS[j.status] || STATUS_COLORS.scheduled;
      var staffNames = (j.staffIds || []).map(function (id) {
        return (staffMap[id] || {}).name || '';
      }).filter(Boolean).join(', ');

      return '<div style="background:' + sc.light + ';border-left:3px solid ' + sc.bg + ';border-radius:var(--radius-sm);padding:var(--space-3) var(--space-3);margin-bottom:var(--space-3);">' +
        '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px;">' +
          '<span style="font-size:var(--text-sm);font-weight:700;color:var(--color-dark);">' + (client.name || '—') + '</span>' +
          '<span style="background:' + sc.bg + ';color:' + sc.text + ';font-size:10px;font-weight:700;padding:1px 6px;border-radius:99px;text-transform:capitalize;">' + (j.status || '') + '</span>' +
        '</div>' +
        (j.time ? '<div style="font-size:var(--text-xs);color:var(--color-mid);margin-bottom:2px;">⏱ ' + MQ.ui.formatTime(j.time) + (j.duration ? ' · ' + j.duration + ' hrs' : '') + '</div>' : '') +
        (staffNames ? '<div style="font-size:var(--text-xs);color:var(--color-mid);margin-bottom:2px;">👤 ' + staffNames + '</div>' : '') +
        (client.address ? '<div style="font-size:var(--text-xs);color:var(--color-light);">📍 ' + client.address + '</div>' : '') +
        (j.notes ? '<div style="font-size:var(--text-xs);color:var(--color-mid);margin-top:4px;font-style:italic;">' + j.notes + '</div>' : '') +
      '</div>';
    }).join('');

    panel.style.display = 'block';
  }

  function populateStaffFilter() {
    var sel = document.getElementById('cal-filter-staff');
    if (!sel) return;
    MQ.store.staff.getAll().filter(function (s) { return s.active; }).forEach(function (s) {
      var opt = document.createElement('option');
      opt.value = s.id;
      opt.textContent = s.name;
      sel.appendChild(opt);
    });
  }

  document.addEventListener('mq:ready', function () {
    MQ.store.seed();
    populateStaffFilter();
    renderCalendar();

    document.getElementById('cal-prev').addEventListener('click', function () {
      currentMonth--;
      if (currentMonth < 0) { currentMonth = 11; currentYear--; }
      renderCalendar();
    });
    document.getElementById('cal-next').addEventListener('click', function () {
      currentMonth++;
      if (currentMonth > 11) { currentMonth = 0; currentYear++; }
      renderCalendar();
    });
    document.getElementById('cal-today').addEventListener('click', function () {
      currentYear = today.getFullYear();
      currentMonth = today.getMonth();
      renderCalendar();
      document.getElementById('cal-detail').style.display = 'none';
    });
    document.getElementById('cal-detail-close').addEventListener('click', function () {
      document.getElementById('cal-detail').style.display = 'none';
    });

    var filterStatus = document.getElementById('cal-filter-status');
    var filterStaff  = document.getElementById('cal-filter-staff');
    var filterClear  = document.getElementById('cal-filter-clear');
    if (filterStatus) filterStatus.addEventListener('change', renderCalendar);
    if (filterStaff)  filterStaff.addEventListener('change', renderCalendar);
    if (filterClear)  filterClear.addEventListener('click', function () {
      filterStatus.value = '';
      filterStaff.value = '';
      renderCalendar();
    });
  });

  window.CalendarPage = { showDetail: showDetail };
})();
