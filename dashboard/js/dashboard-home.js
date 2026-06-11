(function () {
  'use strict';

  async function reload() {
    await Promise.all([renderStats(), renderUpcomingJobs()]);
  }

  document.addEventListener('mq:ready', async function () {
    renderGreeting();
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
    var name = MQ.session ? MQ.session.name.split(' ')[0] : '';
    el.textContent = 'Good ' + time + (name ? ', ' + name : '') + '.';

    var dateEl = document.getElementById('dash-date');
    if (dateEl) {
      dateEl.textContent = new Date().toLocaleDateString('en-AU', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
      });
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
      var in7   = new Date();
      in7.setDate(in7.getDate() + 7);
      var in7Str = in7.toISOString().slice(0, 10);

      var { data, error } = await MQ.supabase
        .from('quote_requests')
        .select('id, full_name, suburb, state, services, scheduled_date, scheduled_time, assigned_staff_ids, property_type')
        .eq('status', 'scheduled')
        .gte('scheduled_date', today)
        .lte('scheduled_date', in7Str)
        .order('scheduled_date', { ascending: true })
        .order('scheduled_time', { ascending: true });

      if (error) throw error;

      var jobs = data || [];

      if (!jobs.length) {
        container.innerHTML =
          '<div class="empty-state" style="padding:3rem">' +
            '<p class="empty-state__title">No upcoming jobs</p>' +
            '<p class="empty-state__sub">Nothing scheduled in the next 7 days</p>' +
          '</div>';
        return;
      }

      var staffMap = {};
      MQ.store.staff.getAll().forEach(function (s) { staffMap[s.id] = s; });

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
          : new Date(date + 'T00:00:00').toLocaleDateString('en-AU', { weekday: 'long' });
        var groupDate  = new Date(date + 'T00:00:00').toLocaleDateString('en-AU', { day: 'numeric', month: 'long' });
        var count      = groups[date].length;

        var cardsHtml = groups[date].map(function (j) {
          var timeStr  = j.scheduled_time ? fmtTime(j.scheduled_time) : '—';
          var location = [j.suburb, j.state].filter(Boolean).join(', ');
          var services = j.services && j.services.length ? j.services.slice(0, 2).join(', ') : '—';
          var staffNames = (j.assigned_staff_ids || []).slice(0, 3).map(function (id) {
            var s = staffMap[id];
            return s ? '<span class="job-card__avatar" title="' + s.name + '">' + s.name.charAt(0) + '</span>' : '';
          }).filter(Boolean).join('');

          return '<div class="job-card job-card--scheduled">' +
            '<div class="job-card__time-col">' +
              '<div class="job-card__time">' + timeStr + '</div>' +
            '</div>' +
            '<div class="job-card__body">' +
              '<div class="job-card__top">' +
                '<span class="job-card__client">' + escHtml(j.full_name) + '</span>' +
                '<span class="badge badge--green" style="font-size:11px;">Scheduled</span>' +
              '</div>' +
              (location ? '<div class="job-card__addr"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>' + escHtml(location) + '</div>' : '') +
              '<div class="job-card__footer">' +
                (staffNames ? '<div class="job-card__avatars">' + staffNames + '</div>' : '<div></div>') +
                '<span class="job-card__chip">' + escHtml(services) + '</span>' +
              '</div>' +
            '</div>' +
          '</div>';
        }).join('');

        return '<div class="job-group' + (isToday ? ' job-group--today' : '') + '">' +
          '<div class="job-group__header">' +
            '<span class="job-group__label' + (isToday ? ' job-group__label--today' : '') + '">' + groupLabel + '</span>' +
            '<span class="job-group__date">' + groupDate + '</span>' +
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

  function escHtml(str) {
    return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
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

  // Re-run stats when page is restored from bfcache (back-button after completing a job)
  window.addEventListener('pageshow', function (event) {
    if (event.persisted) { reload(); }
  });

})();
