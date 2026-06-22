(function () {
  'use strict';
  var escHtml = window.escHtml || function (s) { return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); };

  async function reload() {
    var tasks = [renderStats(), renderUpcomingJobs()];
    if (MQ.hasRole('manager')) tasks.push(renderAvailability());
    await Promise.all(tasks);
  }

  document.addEventListener('mq:ready', async function () {
    renderGreeting();
    renderMessageOfWeek();
    await reload();

    MQ.supabase
      .channel('home-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'quote_requests' },
        function () { reload(); })
      .subscribe();
  });

  function renderGreeting() {
    var el = document.getElementById('dash-greeting');
    if (!el) return;
    var h    = new Date().getHours();
    var time = h < 12 ? 'morning' : h < 17 ? 'afternoon' : 'evening';
    var name = (MQ.session && MQ.session.name) ? MQ.session.name.split(' ')[0] : '';
    el.textContent = 'Good ' + time + (name ? ', ' + name : '') + '.';

    var dateEl = document.getElementById('dash-date');
    if (dateEl) {
      dateEl.textContent = new Date().toLocaleDateString('en-AU', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
      });
    }
  }

  function renderMessageOfWeek() {
    var banner = document.getElementById('dash-motw-banner');
    var textEl = document.getElementById('dash-motw-text');
    if (!banner || !textEl) return;
    var msg = MQ.messageOfWeek || '';
    if (!msg) { banner.hidden = true; return; }
    textEl.textContent = msg;
    banner.hidden = false;
  }

  var AVAIL_LABELS = { wants_more: 'Wants more work', comfortable: 'Comfortable', full: "I'm full" };

  async function renderAvailability() {
    var card = document.getElementById('dash-availability-card');
    var body = document.getElementById('dash-availability-body');
    if (!card || !body) return;
    try {
      var res = await MQ.supabase.from('profiles').select('id, name, colour, availability, status').neq('status', 'suspended');
      if (res.error) throw res.error;
      var staff = (res.data || []).filter(function (p) { return p.availability && p.availability.work_preference; });
      if (!staff.length) { card.style.display = 'none'; return; }
      staff.sort(function (a, b) { return (a.name || '').localeCompare(b.name || ''); });
      body.innerHTML = staff.map(function (p) {
        var pref = p.availability.work_preference;
        var label = AVAIL_LABELS[pref] || pref;
        return '<span class="avail-badge"><span class="avail-badge__dot avail-badge__dot--' + pref + '"></span>' +
          escHtml(p.name || 'Unnamed') + ' — ' + escHtml(label) + '</span>';
      }).join('');
      card.style.display = '';
    } catch (err) {
      card.style.display = 'none';
    }
  }

  async function renderStats() {
    try {
      var today     = new Date().toISOString().slice(0, 10);
      var weekStart = getWeekStart();
      var weekEnd   = getWeekEnd();
      var monthStart = today.slice(0, 7) + '-01';
      var monthEnd   = today.slice(0, 7) + '-' + new Date(new Date(today).getFullYear(), new Date(today).getMonth() + 1, 0).getDate();

      var [unscheduled, scheduled, completed] = await Promise.all([
        MQ.supabase.from('quote_requests').select('id', { count: 'exact', head: true }).eq('status', 'unscheduled'),
        MQ.supabase.from('quote_requests').select('id', { count: 'exact', head: true }).eq('status', 'scheduled'),
        MQ.supabase.from('quote_requests').select('id', { count: 'exact', head: true }).eq('status', 'completed'),
      ]);

      setText('stat-new-requests', unscheduled.count || 0);
      setText('stat-today-jobs',   scheduled.count   || 0);
      setText('stat-week-jobs',    completed.count   || 0);
    } catch (err) {
      console.error('Stats error:', err);
    }
  }

  async function renderUpcomingJobs() {
    var container = document.getElementById('upcoming-body');
    if (!container) return;

    try {
      var today = new Date().toISOString().slice(0, 10);
      var now = new Date();
      var monthEndStr = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);

      var [jobsRes, staffRes] = await Promise.all([
        MQ.supabase
          .from('quote_requests')
          .select('id, full_name, street_address, suburb, state, postcode, scheduled_date, scheduled_time, assigned_staff_ids')
          .eq('status', 'scheduled')
          .gte('scheduled_date', today)
          .lte('scheduled_date', monthEndStr)
          .order('scheduled_date', { ascending: true })
          .order('scheduled_time', { ascending: true }),
        MQ.supabase
          .from('profiles')
          .select('id, name, phone, email'),
      ]);

      if (jobsRes.error) throw jobsRes.error;

      var jobs = jobsRes.data || [];

      if (!jobs.length) {
        container.innerHTML =
          '<div class="empty-state" style="padding:3rem">' +
            '<p class="empty-state__title">No upcoming jobs</p>' +
            '<p class="empty-state__sub">Nothing scheduled this month</p>' +
          '</div>';
        return;
      }

      var staffMap = {};
      (staffRes.data || []).forEach(function (s) { staffMap[s.id] = s; });

      var todayDate = today;
      var tomorrowDate = new Date();
      tomorrowDate.setDate(tomorrowDate.getDate() + 1);
      var tomorrowStr = tomorrowDate.toISOString().slice(0, 10);

      var groups = {};
      var dateOrder = [];
      jobs.forEach(function (j) {
        if (!groups[j.scheduled_date]) { groups[j.scheduled_date] = []; dateOrder.push(j.scheduled_date); }
        groups[j.scheduled_date].push(j);
      });

      var html = dateOrder.map(function (date) {
        var isToday    = date === todayDate;
        var isTomorrow = date === tomorrowStr;
        var groupLabel = isToday ? 'Today' : isTomorrow ? 'Tomorrow'
          : new Date(date + 'T00:00:00').toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'short' });
        var groupDate  = new Date(date + 'T00:00:00').toLocaleDateString('en-AU', { day: 'numeric', month: 'long' });
        var count      = groups[date].length;

        var cardsHtml = groups[date].map(function (j) {
          var timeStr = j.scheduled_time ? fmtTime(j.scheduled_time) : '—';

          var addrParts = [
            j.street_address,
            j.suburb,
            (j.state && j.postcode) ? j.state + ' ' + j.postcode : (j.state || j.postcode),
          ].filter(Boolean);
          var location = addrParts.join(', ');

          var staffHtml = (j.assigned_staff_ids || []).map(function (id) {
            var s = staffMap[id];
            if (!s) return '';
            var contacts = [s.phone, s.email].filter(Boolean).map(function (c) {
              return '<span>' + escHtml(c) + '</span>';
            }).join('');
            return '<div class="job-card__staff-row">' +
              '<svg class="job-card__staff-icon" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>' +
              '<span class="job-card__staff-name">' + escHtml(s.name) + '</span>' +
              (contacts ? '<span class="job-card__staff-contact">' + contacts + '</span>' : '') +
            '</div>';
          }).filter(Boolean).join('');

          return '<div class="job-card job-card--scheduled">' +
            '<div class="job-card__time-col">' +
              '<div class="job-card__time">' + timeStr + '</div>' +
            '</div>' +
            '<div class="job-card__body">' +
              '<div class="job-card__top">' +
                '<span class="job-card__client">' + escHtml(j.full_name) + '</span>' +
              '</div>' +
              (location ? '<div class="job-card__addr"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>' + escHtml(location) + '</div>' : '') +
              (staffHtml ? '<div class="job-card__staff-list">' + staffHtml + '</div>' : '') +
            '</div>' +
          '</div>';
        }).join('');

        var dateBlockHtml;
        if (isToday) {
          dateBlockHtml = '<div class="job-group__date-block job-group__date-block--today"><span class="job-group__day-name">Today</span></div>';
        } else if (isTomorrow) {
          dateBlockHtml = '<div class="job-group__date-block"><span class="job-group__day-name">Tmrw</span></div>';
        } else {
          var d = new Date(date + 'T00:00:00');
          var dName  = d.toLocaleDateString('en-AU', { weekday: 'short' }).toUpperCase();
          var dNum   = d.getDate();
          var dMonth = d.toLocaleDateString('en-AU', { month: 'short' }).toUpperCase();
          dateBlockHtml = '<div class="job-group__date-block">' +
            '<span class="job-group__day-name">' + dName + '</span>' +
            '<span class="job-group__day-num">' + dNum + '</span>' +
            '<span class="job-group__month">' + dMonth + '</span>' +
          '</div>';
        }

        return '<div class="job-group' + (isToday ? ' job-group--today' : '') + '">' +
          '<div class="job-group__header">' +
            dateBlockHtml +
            '<div class="job-group__divider"></div>' +
            '<span class="job-group__count">' + count + ' job' + (count !== 1 ? 's' : '') + '</span>' +
          '</div>' +
          '<div class="job-group__cards">' + cardsHtml + '</div>' +
        '</div>';
      }).join('');

      container.innerHTML = '<div class="job-groups">' + html + '</div>';
    } catch (err) {
      container.innerHTML = '<div style="padding:2rem;text-align:center;color:var(--color-error);">Failed to load upcoming jobs: ' + escHtml(err.message || String(err)) + '</div>';
    }
  }

  function fmtTime(str) {
    try {
      var parts = str.split(':').map(Number);
      var h = parts[0], m = parts[1];
      var suffix = h < 12 ? 'am' : 'pm';
      return (h % 12 || 12) + ':' + String(m).padStart(2, '0') + suffix;
    } catch (e) { return str; }
  }



  function getWeekStart() {
    var d = new Date();
    d.setDate(d.getDate() - d.getDay() + 1);
    return d.toISOString().slice(0, 10);
  }

  function getWeekEnd() {
    var d = new Date();
    d.setDate(d.getDate() - d.getDay() + 7);
    return d.toISOString().slice(0, 10);
  }

  function setText(id, val) {
    var el = document.getElementById(id);
    if (el) el.textContent = val;
  }

  document.addEventListener('mq:pageshow', function () { reload(); });

})();
