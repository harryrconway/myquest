(function () {
  'use strict';

  var sb;
  var today = new Date(); today.setHours(0, 0, 0, 0);
  var cursor = new Date(today.getFullYear(), today.getMonth(), 1);
  var weekCursor = startOfWeek(today);
  var view = 'month';
  var selectedDate = null;
  var allJobs = [];

  function startOfWeek(d) {
    var dt = new Date(d); dt.setHours(0, 0, 0, 0);
    var day = dt.getDay();
    dt.setDate(dt.getDate() + (day === 0 ? -6 : 1 - day));
    return dt;
  }

  function addDays(d, n) {
    var dt = new Date(d); dt.setDate(dt.getDate() + n); return dt;
  }

  function isoDate(d) {
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }

  function pad(n) { return String(n).padStart(2, '0'); }

  function fmtTime(t) {
    if (!t) return '';
    var p = t.split(':'), h = parseInt(p[0]), m = p[1];
    return (h % 12 || 12) + ':' + m + (h >= 12 ? ' pm' : ' am');
  }

  function escHtml(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  async function loadJobs(from, to) {
    var res = await sb.from('quote_requests')
      .select('id, first_name, last_name, suburb, service_type, scheduled_date, scheduled_time, bedrooms, bathrooms, recurrence')
      .eq('status', 'scheduled')
      .gte('scheduled_date', from)
      .lte('scheduled_date', to)
      .order('scheduled_date')
      .order('scheduled_time');
    return res.data || [];
  }

  function jobsForDate(dateStr) {
    return allJobs.filter(function (j) { return j.scheduled_date === dateStr; });
  }

  /* ── Month view ────────────────────────────────────────────── */
  function renderMonth() {
    var year = cursor.getFullYear(), month = cursor.getMonth();
    document.getElementById('cal-title').textContent =
      cursor.toLocaleDateString('en-AU', { month: 'long', year: 'numeric' });

    var firstDay = new Date(year, month, 1);
    var dow = firstDay.getDay();
    var gridStart = addDays(firstDay, dow === 0 ? -6 : 1 - dow);

    var isMobile = window.innerWidth <= 599;
    var html = '<div class="cal-month">';
    html += '<div class="cal-month__header">';
    ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].forEach(function (d) {
      html += '<div class="cal-month__dow">' + d + '</div>';
    });
    html += '</div><div class="cal-month__grid">';

    var d = new Date(gridStart);
    for (var i = 0; i < 42; i++) {
      var ds = isoDate(d);
      var isToday = ds === isoDate(today);
      var isOther = d.getMonth() !== month;
      var isSelected = selectedDate === ds;
      var dayJobs = jobsForDate(ds);

      var cls = 'cal-cell' + (isToday ? ' is-today' : '') + (isOther ? ' is-other-month' : '') + (isSelected ? ' is-selected' : '');
      html += '<div class="' + cls + '" data-date="' + ds + '">';
      html += '<div class="cal-cell__day">' + d.getDate() + '</div>';
      html += '<div class="cal-cell__chips">';

      if (!isMobile) {
        var max = 3;
        dayJobs.slice(0, max).forEach(function (j) {
          html += '<span class="cal-job-chip" data-id="' + j.id + '">' + fmtTime(j.scheduled_time) + ' ' + escHtml(j.first_name || '') + '</span>';
        });
        if (dayJobs.length > max) {
          html += '<span class="cal-job-chip cal-job-chip--more">+' + (dayJobs.length - max) + ' more</span>';
        }
      } else if (dayJobs.length > 0) {
        html += '<div class="cal-cell__dot"></div>';
      }
      html += '</div></div>';
      d = addDays(d, 1);
    }
    html += '</div></div>';
    document.getElementById('cal-grid-wrap').innerHTML = html;

    document.querySelectorAll('.cal-cell').forEach(function (cell) {
      cell.addEventListener('click', function (e) {
        if (e.target.classList.contains('cal-job-chip') && e.target.dataset.id) {
          openJobLink(e.target.dataset.id); return;
        }
        selectDay(cell.dataset.date);
      });
    });
    document.querySelectorAll('.cal-job-chip[data-id]').forEach(function (chip) {
      chip.addEventListener('click', function (e) {
        e.stopPropagation(); openJobLink(chip.dataset.id);
      });
    });
  }

  /* ── Week view ─────────────────────────────────────────────── */
  function renderWeek() {
    var we = addDays(weekCursor, 6);
    document.getElementById('cal-title').textContent =
      weekCursor.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' }) + ' — ' +
      we.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });

    var hours = [];
    for (var h = 7; h <= 19; h++) { hours.push(h); }

    var html = '<div class="cal-week"><div class="cal-week__head"><div class="cal-week__head-time"></div>';
    for (var d = 0; d < 7; d++) {
      var day = addDays(weekCursor, d);
      var isT = isoDate(day) === isoDate(today);
      html += '<div class="cal-week__head-day' + (isT ? ' is-today' : '') + '">' +
        day.toLocaleDateString('en-AU', { weekday: 'short' }).toUpperCase() +
        '<span>' + day.getDate() + '</span></div>';
    }
    html += '</div><div class="cal-week__body"><div class="cal-week__time-col">';
    hours.forEach(function (h) {
      html += '<div class="cal-week__slot-label">' + (h === 12 ? '12pm' : h > 12 ? (h - 12) + 'pm' : h + 'am') + '</div>';
    });
    html += '</div>';

    for (var di = 0; di < 7; di++) {
      var dday = addDays(weekCursor, di);
      var dds = isoDate(dday);
      html += '<div class="cal-week__day-col">';
      hours.forEach(function () { html += '<div class="cal-week__slot"></div>'; });
      jobsForDate(dds).forEach(function (job) {
        if (!job.scheduled_time) return;
        var tp = job.scheduled_time.split(':');
        var jh = parseInt(tp[0]), jm = parseInt(tp[1]);
        if (jh < 7 || jh > 19) return;
        var top = (jh - 7) * 56 + (jm / 60 * 56);
        html += '<div class="cal-week__job-block" data-id="' + job.id + '" style="top:' + top + 'px;height:52px;">' +
          fmtTime(job.scheduled_time) + ' · ' + escHtml((job.first_name || '') + ' ' + (job.last_name || '')) + '</div>';
      });
      html += '</div>';
    }
    html += '</div></div>';
    document.getElementById('cal-grid-wrap').innerHTML = html;

    document.querySelectorAll('.cal-week__job-block[data-id]').forEach(function (b) {
      b.addEventListener('click', function () { openJobLink(b.dataset.id); });
    });
  }

  /* ── Day panel ─────────────────────────────────────────────── */
  function selectDay(dateStr) {
    selectedDate = dateStr;
    renderMonth();

    var jobs = jobsForDate(dateStr);
    var d = new Date(dateStr + 'T00:00:00');
    document.getElementById('cal-panel-title').textContent =
      d.toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' });

    var body = document.getElementById('cal-panel-body');
    if (jobs.length === 0) {
      body.innerHTML = '<p class="cal-panel__empty">No jobs scheduled.</p>';
    } else {
      body.innerHTML = jobs.map(function (j) {
        return '<div class="cal-panel-job" data-id="' + j.id + '">' +
          '<div class="cal-panel-job__time">' + fmtTime(j.scheduled_time) + '</div>' +
          '<div class="cal-panel-job__name">' + escHtml((j.first_name || '') + ' ' + (j.last_name || '')) + '</div>' +
          '<div class="cal-panel-job__meta">' + escHtml(j.suburb || '') + (j.service_type ? ' · ' + escHtml(j.service_type) : '') + '</div>' +
          '</div>';
      }).join('');
      body.querySelectorAll('.cal-panel-job').forEach(function (el) {
        el.addEventListener('click', function () { openJobLink(el.dataset.id); });
      });
    }

    var panel = document.getElementById('cal-panel');
    panel.hidden = false;
    document.getElementById('cal-layout').classList.remove('no-panel');
  }

  function closePanel() {
    document.getElementById('cal-panel').hidden = true;
    document.getElementById('cal-layout').classList.add('no-panel');
    selectedDate = null;
    if (view === 'month') renderMonth();
  }

  function openJobLink(id) {
    window.location.href = 'scheduled-jobs.html#view:' + id;
  }

  /* ── Data refresh ──────────────────────────────────────────── */
  async function refresh() {
    var from, to;
    if (view === 'month') {
      var y = cursor.getFullYear(), m = cursor.getMonth();
      from = isoDate(new Date(y, m, 1));
      to = isoDate(new Date(y, m + 1, 0));
    } else {
      from = isoDate(weekCursor);
      to = isoDate(addDays(weekCursor, 6));
    }
    allJobs = await loadJobs(from, to);
    var countEl = document.getElementById('cal-count');
    var labelEl = document.getElementById('cal-count-label');
    if (countEl) countEl.textContent = allJobs.length;
    if (labelEl) labelEl.textContent = view === 'month' ? 'this month' : 'this week';
    view === 'month' ? renderMonth() : renderWeek();
  }

  /* ── Init ──────────────────────────────────────────────────── */
  function init() {
    sb = MQ.supabase;

    document.getElementById('cal-btn-month').addEventListener('click', function () {
      if (view === 'month') return;
      view = 'month';
      this.classList.add('is-active');
      document.getElementById('cal-btn-week').classList.remove('is-active');
      refresh();
    });
    document.getElementById('cal-btn-week').addEventListener('click', function () {
      if (view === 'week') return;
      view = 'week';
      this.classList.add('is-active');
      document.getElementById('cal-btn-month').classList.remove('is-active');
      weekCursor = startOfWeek(selectedDate ? new Date(selectedDate + 'T00:00:00') : today);
      closePanel();
      refresh();
    });
    document.getElementById('cal-btn-today').addEventListener('click', function () {
      cursor = new Date(today.getFullYear(), today.getMonth(), 1);
      weekCursor = startOfWeek(today);
      refresh();
    });
    document.getElementById('cal-btn-prev').addEventListener('click', function () {
      if (view === 'month') cursor = new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1);
      else weekCursor = addDays(weekCursor, -7);
      refresh();
    });
    document.getElementById('cal-btn-next').addEventListener('click', function () {
      if (view === 'month') cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
      else weekCursor = addDays(weekCursor, 7);
      refresh();
    });
    document.getElementById('cal-panel-close').addEventListener('click', closePanel);

    refresh();
    sb.channel('cal-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'quote_requests' }, function () { refresh(); })
      .subscribe();
  }

  document.addEventListener('mq:ready', function () { init(); });
})();
