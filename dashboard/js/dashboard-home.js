(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', function () {
    MQ.store.seed();
    renderGreeting();
    renderStats();
    renderUpcomingJobs();
  });

  function renderGreeting() {
    const el = document.getElementById('dash-greeting');
    if (!el) return;
    const h = new Date().getHours();
    const time = h < 12 ? 'morning' : h < 17 ? 'afternoon' : 'evening';
    const name = MQ.session ? MQ.session.name.split(' ')[0] : '';
    el.textContent = 'Good ' + time + (name ? ', ' + name : '') + '.';

    const dateEl = document.getElementById('dash-date');
    if (dateEl) {
      dateEl.textContent = new Date().toLocaleDateString('en-AU', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
      });
    }
  }

  function renderStats() {
    const today = new Date().toISOString().slice(0, 10);
    const jobs = MQ.store.visibleJobs();
    const todayJobs = jobs.filter(function (j) { return j.date === today; });
    const completed = todayJobs.filter(function (j) { return j.status === 'completed'; });
    const staff = MQ.store.staff.getAll().filter(function (s) { return s.active; });
    setText('stat-today-jobs', todayJobs.length);
    setText('stat-completed', completed.length);
    setText('stat-staff', staff.length);
  }

  function renderUpcomingJobs() {
    var container = document.getElementById('upcoming-body');
    if (!container) return;

    var today = new Date();
    today.setHours(0, 0, 0, 0);
    var tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    var in7 = new Date(today);
    in7.setDate(today.getDate() + 7);

    var jobs = MQ.store.visibleJobs().filter(function (j) {
      var d = new Date(j.date + 'T00:00:00');
      return d >= today && d <= in7 && j.status !== 'cancelled';
    }).sort(function (a, b) {
      return a.date.localeCompare(b.date) || (a.time || '').localeCompare(b.time || '');
    });

    if (!jobs.length) {
      container.innerHTML =
        '<div class="empty-state">' +
          '<svg class="empty-state__icon" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">' +
            '<rect x="3" y="4" width="18" height="18" rx="2"/>' +
            '<line x1="3" y1="9" x2="21" y2="9"/>' +
            '<line x1="8" y1="2" x2="8" y2="6"/>' +
            '<line x1="16" y1="2" x2="16" y2="6"/>' +
          '</svg>' +
          '<p class="empty-state__title">No upcoming jobs</p>' +
          '<p class="empty-state__sub">Nothing scheduled in the next 7 days</p>' +
        '</div>';
      return;
    }

    var clients = {};
    MQ.store.clients.getAll().forEach(function (c) { clients[c.id] = c; });
    var staffMap = {};
    MQ.store.staff.getAll().forEach(function (s) { staffMap[s.id] = s; });

    var recurringLabels = {
      daily: 'Daily', weekly: 'Weekly',
      fortnightly: 'Fortnightly', monthly: 'Monthly'
    };

    function getSuburb(addr) {
      if (!addr) return '';
      var parts = addr.split(',');
      if (parts.length < 2) return '';
      return parts[parts.length - 1].trim()
        .replace(/\s+(?:NSW|QLD|VIC|SA|WA|TAS|NT|ACT)\s+\d{4}$/, '')
        .trim();
    }

    // Group jobs by date
    var groups = {};
    var dateOrder = [];
    jobs.forEach(function (j) {
      if (!groups[j.date]) { groups[j.date] = []; dateOrder.push(j.date); }
      groups[j.date].push(j);
    });

    var html = dateOrder.map(function (date) {
      var d = new Date(date + 'T00:00:00');
      var isToday    = d.getTime() === today.getTime();
      var isTomorrow = d.getTime() === tomorrow.getTime();

      var groupLabel = isToday ? 'Today'
        : isTomorrow ? 'Tomorrow'
        : d.toLocaleDateString('en-AU', { weekday: 'long' });
      var groupDate = d.toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' });
      var count = groups[date].length;

      var cardsHtml = groups[date].map(function (j) {
        var client    = clients[j.clientId] || {};
        var timeStr   = j.time ? MQ.ui.formatTime(j.time) : '—';
        var suburb    = getSuburb(client.address);
        var serviceType = client.cleaningType || '';
        var recLabel  = j.recurring ? (recurringLabels[j.recurring] || '') : '';
        var notes     = j.notes || '';

        var staffAvatars = (j.staffIds || []).slice(0, 5).map(function (id) {
          var s = staffMap[id];
          if (!s) return '';
          var isLead = id === j.teamLeaderId;
          var cls = 'job-card__avatar' + (isLead ? ' job-card__avatar--lead' : '');
          return '<span class="' + cls + '" title="' + s.name + (isLead ? ' (Lead)' : '') + '">' + s.name.charAt(0) + '</span>';
        }).filter(Boolean).join('');

        var chips = [serviceType, recLabel].filter(Boolean).map(function (t) {
          return '<span class="job-card__chip">' + t + '</span>';
        }).join('');

        return '<div class="job-card job-card--' + (j.status || 'scheduled') + '">' +
          '<div class="job-card__time-col">' +
            '<div class="job-card__time">' + timeStr + '</div>' +
            (j.duration ? '<div class="job-card__dur">' + j.duration + ' hrs</div>' : '') +
          '</div>' +
          '<div class="job-card__body">' +
            '<div class="job-card__top">' +
              '<span class="job-card__client">' + (client.name || '—') + '</span>' +
              MQ.ui.statusBadge(j.status || 'scheduled') +
            '</div>' +
            (suburb ? '<div class="job-card__addr"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>' + suburb + '</div>' : '') +
            (notes ? '<div class="job-card__notes">' + notes + '</div>' : '') +
            '<div class="job-card__footer">' +
              (staffAvatars ? '<div class="job-card__avatars">' + staffAvatars + '</div>' : '<div></div>') +
              (chips ? '<div class="job-card__chips">' + chips + '</div>' : '') +
            '</div>' +
          '</div>' +
        '</div>';
      }).join('');

      return '<div class="job-group' + (isToday ? ' job-group--today' : '') + '">' +
        '<div class="job-group__header">' +
          '<span class="job-group__label' + (isToday ? ' job-group__label--today' : '') + '">' + groupLabel + '</span>' +
          '<span class="job-group__date">' + groupDate + '</span>' +
          '<span class="job-group__count">' + count + ' job' + (count !== 1 ? 's' : '') + '</span>' +
        '</div>' +
        '<div class="job-group__cards">' + cardsHtml + '</div>' +
      '</div>';
    }).join('');

    container.innerHTML = '<div class="job-groups">' + html + '</div>';
  }

  function setText(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  }

})();
