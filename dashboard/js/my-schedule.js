(function () {
  'use strict';

  var sb, userId;
  var today = new Date(); today.setHours(0, 0, 0, 0);
  var weekStart = startOfWeek(today);
  var weekJobs = [];

  function startOfWeek(d) {
    var dt = new Date(d); dt.setHours(0, 0, 0, 0);
    var day = dt.getDay();
    dt.setDate(dt.getDate() + (day === 0 ? -6 : 1 - day));
    return dt;
  }

  function addDays(d, n) { var dt = new Date(d); dt.setDate(dt.getDate() + n); return dt; }

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
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function greeting() {
    var h = new Date().getHours();
    return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  }

  async function load() {
    if (!userId) return;
    var from = isoDate(weekStart);
    var to = isoDate(addDays(weekStart, 6));

    var res = await sb.from('quote_requests')
      .select('*')
      .eq('status', 'scheduled')
      .contains('assigned_staff_ids', [userId])
      .gte('scheduled_date', from)
      .lte('scheduled_date', to)
      .order('scheduled_date')
      .order('scheduled_time');

    weekJobs = res.data || [];
    updateHeader();
    renderWeek();
  }

  function updateHeader() {
    var nameEl = document.querySelector('.js-user-name');
    var first = nameEl ? nameEl.textContent.trim().split(' ')[0] : '';
    document.getElementById('ms-greeting').textContent = greeting() + (first && first !== 'Loading…' ? ', ' + first : '') + '.';
    document.getElementById('ms-sub').textContent = weekJobs.length === 0
      ? 'No jobs scheduled this week.' : 'You have ' + weekJobs.length + ' job' + (weekJobs.length !== 1 ? 's' : '') + ' this week.';
    document.getElementById('ms-week-label').textContent =
      weekStart.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' }) + ' — ' +
      addDays(weekStart, 6).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  function renderWeek() {
    var todayStr = isoDate(today);
    var html = '';

    for (var i = 0; i < 7; i++) {
      var d = addDays(weekStart, i);
      var ds = isoDate(d);
      var dayJobs = weekJobs.filter(function (j) { return j.scheduled_date === ds; });
      var isToday = ds === todayStr;

      var dayLabel = d.toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' });
      html += '<div class="myschedule-day">' +
        '<div class="myschedule-day__header' + (isToday ? ' is-today' : '') + '">' +
        dayLabel + (isToday ? ' — Today' : '') + '</div>';

      if (dayJobs.length === 0) {
        html += '<p class="myschedule-day__empty">Nothing scheduled</p>';
      } else {
        dayJobs.forEach(function (j) {
          var address = [j.street_address, j.suburb].filter(Boolean).join(', ');
          var meta = [j.service_type, j.bedrooms ? j.bedrooms + ' bed' : null, j.bathrooms ? j.bathrooms + ' bath' : null].filter(Boolean).join(' · ');
          html += '<div class="myschedule-job" data-id="' + j.id + '">' +
            '<div class="myschedule-job__time">' + fmtTime(j.scheduled_time) + '</div>' +
            '<div class="myschedule-job__body">' +
              '<div class="myschedule-job__name">' + escHtml((j.first_name || '') + ' ' + (j.last_name || '')) + '</div>' +
              (address ? '<div class="myschedule-job__address">' + escHtml(address) + '</div>' : '') +
              (meta ? '<div class="myschedule-job__chips"><span class="badge badge--blue" style="font-size:11px;padding:2px 8px;border-radius:20px;background:#dbeafe;color:#1e40af;font-weight:600;">' + escHtml(meta) + '</span></div>' : '') +
            '</div></div>';
        });
      }
      html += '</div>';
    }

    document.getElementById('ms-days-wrap').innerHTML = html;

    document.querySelectorAll('.myschedule-job').forEach(function (el) {
      el.addEventListener('click', function () { openJobView(el.dataset.id); });
    });
  }

  function openJobView(id) {
    var j = weekJobs.find(function (x) { return x.id === id; });
    if (!j) return;

    var address = [j.street_address, j.suburb, j.state, j.postcode].filter(Boolean).join(', ');
    var staffNames = (j.assigned_staff_ids || []).map(function (sid) {
      var s = MQ.store.staff.getAll().find(function (x) { return x.id === sid; });
      return s ? s.name : null;
    }).filter(Boolean).join(', ');

    var rows = [
      ['Client', (j.first_name || '') + ' ' + (j.last_name || '')],
      ['Date', j.scheduled_date ? new Date(j.scheduled_date + 'T00:00:00').toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : '—'],
      ['Time', j.scheduled_time ? fmtTime(j.scheduled_time) : '—'],
      ['Address', address || '—'],
      ['Service', j.service_type || '—'],
      ['Rooms', j.bedrooms ? j.bedrooms + ' bed / ' + (j.bathrooms || '?') + ' bath' : '—'],
      ['Phone', j.phone || '—'],
      ['Email', j.email || '—'],
      ['Staff', staffNames || '—'],
    ];
    if (j.internal_notes) rows.push(['Notes', j.internal_notes]);

    var html = '<table class="detail-table"><tbody>' +
      rows.map(function (r) {
        return '<tr><td class="detail-table__label">' + r[0] + '</td><td>' + escHtml(r[1]) + '</td></tr>';
      }).join('') + '</tbody></table>';

    // Checklist
    var checklist = j.checklist;
    if (typeof checklist === 'string') { try { checklist = JSON.parse(checklist); } catch (e) { checklist = []; } }
    if (Array.isArray(checklist) && checklist.length > 0) {
      var done = checklist.filter(function (item) { return item.done; }).length;
      html += '<div class="mform-section" style="margin-top:16px;border-top:1px solid #f1f5f9;padding-top:16px;">' +
        '<div style="font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:0.08em;color:#94a3b8;margin-bottom:10px;">Checklist</div>' +
        '<div class="checklist-progress"><div class="checklist-progress__bar"><div class="checklist-progress__fill" style="width:' + Math.round(done / checklist.length * 100) + '%"></div></div>' +
        '<span class="checklist-progress__label">' + done + ' / ' + checklist.length + '</span></div>' +
        '<ul class="checklist-items">' +
        checklist.map(function (item) {
          return '<li class="checklist-item' + (item.done ? ' is-done' : '') + '">' +
            '<label><input type="checkbox"' + (item.done ? ' checked' : '') + ' disabled> ' + escHtml(item.text) + '</label></li>';
        }).join('') +
        '</ul></div>';
    }

    document.getElementById('ms-view-body').innerHTML = html;
    MQ.ui.modal.open('modal-ms-view');
  }

  function init() {
    sb = MQ.supabase;

    sb.auth.getUser().then(function (r) {
      userId = r.data && r.data.user ? r.data.user.id : null;
      load();
    });

    document.getElementById('ms-btn-today').addEventListener('click', function () {
      weekStart = startOfWeek(today); load();
    });
    document.getElementById('ms-btn-prev').addEventListener('click', function () {
      weekStart = addDays(weekStart, -7); load();
    });
    document.getElementById('ms-btn-next').addEventListener('click', function () {
      weekStart = addDays(weekStart, 7); load();
    });
  }

  document.addEventListener('mq:ready', function () { init(); });
})();
