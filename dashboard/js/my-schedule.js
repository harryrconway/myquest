(function () {
  'use strict';

  var sb, userId;
  var today = new Date(); today.setHours(0, 0, 0, 0);
  var cursor = new Date(today.getFullYear(), today.getMonth(), 1);
  var monthJobs = [];
  var viewingJobId = null;

  /* ── helpers ──────────────────────────────────────────── */
  function startOfMonth(d) { return new Date(d.getFullYear(), d.getMonth(), 1); }
  function endOfMonth(d)   { return new Date(d.getFullYear(), d.getMonth() + 1, 0); }
  function addDays(d, n)   { var dt = new Date(d); dt.setDate(dt.getDate() + n); return dt; }

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

  /* ── data ─────────────────────────────────────────────── */
  async function load() {
    if (!userId) return;
    var from = isoDate(startOfMonth(cursor));
    var to   = isoDate(endOfMonth(cursor));

    var res = await sb.from('quote_requests')
      .select('*')
      .eq('status', 'scheduled')
      .gte('scheduled_date', from)
      .lte('scheduled_date', to)
      .order('scheduled_date')
      .order('scheduled_time');

    if (res.error) {
      console.error('[my-schedule] load error:', res.error);
      monthJobs = [];
    } else {
      monthJobs = (res.data || [])
        .map(function (j) { j.scheduled_date = (j.scheduled_date || '').slice(0, 10); return j; })
        .filter(function (j) {
          return Array.isArray(j.assigned_staff_ids) && j.assigned_staff_ids.indexOf(userId) !== -1;
        });
    }
    updateHeader();
    renderMonth();
  }

  /* ── header ───────────────────────────────────────────── */
  function updateHeader() {
    var nameEl = document.querySelector('.js-user-name');
    var first = nameEl ? nameEl.textContent.trim().split(' ')[0] : '';
    var monthLabel = cursor.toLocaleDateString('en-AU', { month: 'long', year: 'numeric' });

    document.getElementById('ms-greeting').textContent =
      greeting() + (first && first !== 'Loading…' ? ', ' + first : '') + '.';

    document.getElementById('ms-sub').textContent = monthJobs.length === 0
      ? 'No jobs scheduled in ' + monthLabel + '.'
      : monthJobs.length + ' job' + (monthJobs.length !== 1 ? 's' : '') + ' in ' + monthLabel + '.';

    var msCount = document.getElementById('ms-count');
    if (msCount) msCount.textContent = monthJobs.length;

    document.getElementById('ms-week-label').textContent = monthLabel;
  }

  /* ── render ───────────────────────────────────────────── */
  function renderMonth() {
    var todayStr  = isoDate(today);
    var daysCount = endOfMonth(cursor).getDate();
    var html = '';

    for (var i = 1; i <= daysCount; i++) {
      var d  = new Date(cursor.getFullYear(), cursor.getMonth(), i);
      var ds = isoDate(d);
      var dayJobs = monthJobs.filter(function (j) { return j.scheduled_date === ds; });
      if (!dayJobs.length) continue;

      var isToday  = ds === todayStr;
      var dayLabel = d.toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' });

      html += '<div class="myschedule-day">' +
        '<div class="myschedule-day__header' + (isToday ? ' is-today' : '') + '">' +
          escHtml(dayLabel) +
          (isToday ? ' <span class="myschedule-today-badge">Today</span>' : '') +
        '</div>';

      dayJobs.forEach(function (j) {
        var address  = [j.street_address, j.suburb].filter(Boolean).join(', ');
        var services = Array.isArray(j.services) && j.services.length
          ? j.services.join(', ') : (j.service_type || '');
        var chips = [
          services || null,
          j.bedrooms  ? j.bedrooms  + ' bed'  : null,
          j.bathrooms ? j.bathrooms + ' bath' : null,
        ].filter(Boolean);

        html += '<div class="myschedule-job" data-id="' + escHtml(j.id) + '">' +
          '<div class="myschedule-job__time">' + (j.scheduled_time ? escHtml(fmtTime(j.scheduled_time)) : '<span style="color:rgba(0,0,0,0.25)">—</span>') + '</div>' +
          '<div class="myschedule-job__body">' +
            '<div class="myschedule-job__name">' + escHtml(j.full_name || '') + '</div>' +
            (address ? '<div class="myschedule-job__address">' + escHtml(address) + '</div>' : '') +
            (chips.length ? '<div class="myschedule-job__chips">' +
              chips.map(function (c) { return '<span class="ms-chip">' + escHtml(c) + '</span>'; }).join('') +
            '</div>' : '') +
          '</div>' +
          '<div class="myschedule-job__arrow">›</div>' +
        '</div>';
      });

      html += '</div>';
    }

    if (!html) {
      html = '<div class="myschedule-empty">' +
        '<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" style="color:rgba(0,0,0,0.2);margin-bottom:12px;"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="16" y1="2" x2="16" y2="6"/></svg>' +
        '<p>No jobs scheduled this month.</p></div>';
    }

    document.getElementById('ms-days-wrap').innerHTML = html;

    document.querySelectorAll('.myschedule-job').forEach(function (el) {
      el.addEventListener('click', function () { openJobView(el.dataset.id); });
    });
  }

  /* ── job detail modal ─────────────────────────────────── */
  function openJobView(id) {
    var j = monthJobs.find(function (x) { return x.id === id; });
    if (!j) return;
    viewingJobId = id;

    var address = [j.street_address, j.suburb, j.state, j.postcode].filter(Boolean).join(', ');
    var staffNames = (j.assigned_staff_ids || []).map(function (sid) {
      var s = MQ.store.staff.getAll().find(function (x) { return x.id === sid; });
      return s ? s.name : null;
    }).filter(Boolean).join(', ');

    var dateLabel = j.scheduled_date
      ? new Date(j.scheduled_date + 'T00:00:00').toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
      : '—';

    var rows = [
      ['Client',   j.full_name || '—'],
      ['Date',     dateLabel],
      ['Time',     j.scheduled_time ? fmtTime(j.scheduled_time) : '—'],
      ['Address',  address || '—'],
      ['Service',  j.service_type || (Array.isArray(j.services) && j.services.length ? j.services.join(', ') : '—')],
      ['Rooms',    j.bedrooms ? j.bedrooms + ' bed / ' + (j.bathrooms || '?') + ' bath' : '—'],
      ['Phone',    j.phone || '—'],
      ['Email',    j.email || '—'],
      ['Staff',    staffNames || '—'],
    ];
    if (j.notes || j.internal_notes) rows.push(['Notes', j.notes || j.internal_notes]);

    var html = '<table class="detail-table"><tbody>' +
      rows.map(function (r) {
        return '<tr><td class="detail-table__label">' + escHtml(r[0]) + '</td><td>' + escHtml(r[1]) + '</td></tr>';
      }).join('') +
    '</tbody></table>';

    // Checklist
    var checklist = j.checklist;
    if (typeof checklist === 'string') { try { checklist = JSON.parse(checklist); } catch (e) { checklist = []; } }
    var items = Array.isArray(checklist) ? checklist : [];

    if (items.length) {
      var done = items.filter(function (x) { return x.done; }).length;
      html += '<div class="mform-section" style="margin-top:16px;border-top:1px solid #f1f5f9;padding-top:16px;">' +
        '<div style="font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:0.08em;color:rgba(0,0,0,0.35);margin-bottom:10px;">Checklist</div>' +
        '<div class="checklist-progress"><div class="checklist-progress__bar"><div class="checklist-progress__fill" style="width:' + Math.round(done / items.length * 100) + '%"></div></div>' +
        '<span class="checklist-progress__label">' + done + ' / ' + items.length + '</span></div>' +
        '<ul class="checklist-items">' +
        items.map(function (item, idx) {
          return '<li class="checklist-item' + (item.done ? ' is-done' : '') + '">' +
            '<label><input type="checkbox" data-idx="' + idx + '"' + (item.done ? ' checked' : '') + '> ' + escHtml(item.text) + '</label></li>';
        }).join('') +
        '</ul></div>';
    }

    document.getElementById('ms-view-body').innerHTML = html;

    document.querySelectorAll('#ms-view-body .checklist-item input[type="checkbox"]').forEach(function (cb) {
      cb.addEventListener('change', function () {
        var idx = parseInt(cb.dataset.idx);
        items[idx].done = cb.checked;
        cb.closest('.checklist-item').classList.toggle('is-done', cb.checked);
        var totalDone = items.filter(function (x) { return x.done; }).length;
        var fill  = document.querySelector('#ms-view-body .checklist-progress__fill');
        var label = document.querySelector('#ms-view-body .checklist-progress__label');
        if (fill)  fill.style.width = Math.round(totalDone / items.length * 100) + '%';
        if (label) label.textContent = totalDone + ' / ' + items.length;
        var job = monthJobs.find(function (x) { return x.id === viewingJobId; });
        if (job) job.checklist = items;
        sb.from('quote_requests').update({ checklist: items }).eq('id', viewingJobId).then(function () {});
      });
    });

    MQ.ui.modal.open('modal-ms-view');

    var footer = document.querySelector('#modal-ms-view .modal-footer');
    if (footer) {
      footer.innerHTML =
        '<button class="btn-outline" data-modal-close="modal-ms-view">Close</button>' +
        '<button class="btn-primary" id="ms-complete-btn">Mark Complete</button>';
      document.getElementById('ms-complete-btn').addEventListener('click', markComplete);
    }
  }

  async function markComplete() {
    var btn = document.getElementById('ms-complete-btn');
    if (btn) { btn.disabled = true; btn.textContent = 'Completing…'; }
    try {
      var session = (await sb.auth.getSession()).data.session;
      var res = await fetch('/api/complete-job', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + session.access_token },
        body: JSON.stringify({ jobId: viewingJobId }),
      });
      var data = await res.json();
      if (data.error) throw new Error(data.error);
      MQ.ui.modal.close('modal-ms-view');
      MQ.ui.toast('Job marked as complete');
      load();
    } catch (err) {
      MQ.ui.toast(err.message || 'Failed to complete job', 'error');
      if (btn) { btn.disabled = false; btn.textContent = 'Mark Complete'; }
    }
  }

  /* ── init ─────────────────────────────────────────────── */
  function init() {
    sb = MQ.supabase;

    sb.auth.getUser().then(function (r) {
      userId = r.data && r.data.user ? r.data.user.id : null;
      load();
    });

    document.getElementById('ms-btn-today').addEventListener('click', function () {
      cursor = new Date(today.getFullYear(), today.getMonth(), 1);
      load();
    });
    document.getElementById('ms-btn-prev').addEventListener('click', function () {
      cursor = new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1);
      load();
    });
    document.getElementById('ms-btn-next').addEventListener('click', function () {
      cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
      load();
    });

    sb.channel('ms-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'quote_requests' }, function () { load(); })
      .subscribe();
  }

  document.addEventListener('mq:ready',    function () { init(); });
  document.addEventListener('mq:pageshow', function () { load(); });
})();
