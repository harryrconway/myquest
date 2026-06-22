/* ============================================================
   MYQUEST — scheduled-jobs.js
   ============================================================ */
(function () {
  'use strict';
  var escHtml = window.escHtml || function (s) { return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); };

  var jobs         = [];
  var filteredJobs = [];
  var editingId    = null;
  var viewingId    = null;
  var checklistTimer = null;
  var hashHandled  = false;



  function fmtDate(str) {
    if (!str) return '—';
    try {
      var d = new Date(str);
      return d.toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
    } catch (e) { return str; }
  }

  function fmtTime(str) {
    if (!str) return '';
    var parts = str.split(':');
    var h = parseInt(parts[0]);
    var m = parts[1] || '00';
    var ampm = h >= 12 ? 'pm' : 'am';
    h = h % 12 || 12;
    return h + ':' + m + ' ' + ampm;
  }

  function fmtServices(arr) {
    if (!arr || !arr.length) return '—';
    return arr.join(', ');
  }

  /* ─── Search / Count ────────────────────────────────────────── */

  function updateCount() {
    var el = document.getElementById('sj-count');
    if (el) el.textContent = filteredJobs.length;
  }

  function filterAndRender(query) {
    var q = (query || '').toLowerCase().trim();
    filteredJobs = q ? jobs.filter(function (j) {
      return (j.full_name     || '').toLowerCase().indexOf(q) !== -1 ||
             (j.suburb        || '').toLowerCase().indexOf(q) !== -1 ||
             (j.state         || '').toLowerCase().indexOf(q) !== -1 ||
             (j.services      || []).join(' ').toLowerCase().indexOf(q) !== -1 ||
             (j.property_type || '').toLowerCase().indexOf(q) !== -1;
    }) : jobs.slice();
    updateCount();
    render(filteredJobs);
    renderDigest(filteredJobs);
  }

  /* ─── Load ─────────────────────────────────────────────────── */

  async function load() {
    var wrap = document.getElementById('sj-table-wrap');
    wrap.innerHTML = '<div style="padding:60px;text-align:center;color:var(--color-light);">Loading…</div>';

    try {
      var { data, error } = await MQ.supabase
        .from('quote_requests')
        .select('*')
        .eq('status', 'scheduled')
        .order('scheduled_date', { ascending: true });

      if (error) throw error;
      jobs = data || [];
      var searchEl = document.getElementById('sj-search');
      filterAndRender(searchEl ? searchEl.value : '');
      if (!hashHandled) {
        hashHandled = true;
        var hash = window.location.hash;
        if (hash && hash.slice(0, 6) === '#view:') {
          var autoId = hash.slice(6);
          history.replaceState(null, '', window.location.pathname);
          if (jobs.find(function (j) { return j.id === autoId; })) {
            setTimeout(function () { view(autoId); }, 80);
          }
        }
      }
    } catch (err) {
      wrap.innerHTML = '<div style="padding:60px;text-align:center;color:var(--color-error);">Failed to load: ' + escHtml(err.message) + '</div>';
    }
  }

  /* ─── Render ────────────────────────────────────────────────── */

  function groupByDate(list) {
    var groups = {};
    var order  = [];
    list.forEach(function (j) {
      var key = j.scheduled_date || 'unset';
      if (!groups[key]) { groups[key] = []; order.push(key); }
      groups[key].push(j);
    });
    return order.map(function (k) { return { date: k, jobs: groups[k] }; });
  }

  function render(list) {
    var wrap = document.getElementById('sj-table-wrap');

    if (!list.length) {
      wrap.innerHTML = MQ.ui.emptyState(
        'M3 4 h18 M3 10 h18 M8 2 v4 M16 2 v4',
        jobs.length ? 'No results found' : 'No scheduled jobs',
        jobs.length ? 'Try a different search term' : 'Accepted quote requests will appear here'
      );
      return;
    }

    var groups = groupByDate(list);
    var html   = groups.map(function (g) {
      var dateLabel = g.date === 'unset' ? 'No date set' : fmtDate(g.date);

      var cards = g.jobs.map(function (j) {
        var initial  = (j.full_name || '?')[0].toUpperCase();
        var address  = [j.street_address, j.suburb, j.state].filter(Boolean).join(', ');
        var chips    = (j.services || []).slice(0, 3).map(function (s) {
          return '<span class="req-chip req-chip--blue">' + escHtml(s) + '</span>';
        }).join('');

        var checklist = j.checklist;
        if (typeof checklist === 'string') { try { checklist = JSON.parse(checklist); } catch(e) { checklist = []; } }
        var checklistArr = Array.isArray(checklist) ? checklist : [];
        var checkDone = checklistArr.filter(function(x){ return x.done; }).length;
        var allDone = checklistArr.length > 0 && checkDone === checklistArr.length;

        var sideInfoHtml = '';
        if (j.property_type) {
          sideInfoHtml += '<span class="job-card__side-pill">' + escHtml(j.property_type) + '</span>';
        }
        if (j.frequency) {
          sideInfoHtml += '<span class="job-card__side-pill">' + escHtml(j.frequency) + '</span>';
        }
        if (checklistArr.length > 0) {
          sideInfoHtml += '<span class="job-card__side-pill job-card__side-pill--checklist' + (allDone ? ' job-card__side-pill--done' : '') + '">' +
            '<svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>' +
            checkDone + '/' + checklistArr.length +
          '</span>';
        }

        var assignedIds = Array.isArray(j.assigned_staff_ids) ? j.assigned_staff_ids : [];
        var liveStaff   = assignedIds.map(function (id) { return MQ.store.staff.getById(id); }).filter(Boolean);
        var staffColour = liveStaff.length && liveStaff[0].colour ? liveStaff[0].colour : (j.assigned_staff_colour || '');
        var staffName   = liveStaff.length ? '' : (j.assigned_staff_name || '');

        var personIcon = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>';
        var cleanerHtml = '';
        if (liveStaff.length) {
          var staffChips = liveStaff.map(function (s) {
            return '<span class="job-card__cleaner-chip" style="background:' + (s.colour || '#334155') + ';" ' +
              'onclick="event.stopPropagation();window.location.href=\'settings.html#staff:' + s.id + '\'" ' +
              'title="View ' + escHtml(s.name) + '\'s profile">' + escHtml(s.name) + '</span>';
          }).join('');
          cleanerHtml = '<div class="job-card__cleaner">' + personIcon + staffChips + '</div>';
        } else if (staffName) {
          cleanerHtml = '<div class="job-card__cleaner">' + personIcon + '<span>' + escHtml(staffName) + '</span></div>';
        }

        var eyeIcon   = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>';
        var editIcon  = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>';
        var checkIcon = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>';

        return '<div class="job-card job-card--scheduled"' +
            (staffColour ? ' style="border-left:4px solid ' + staffColour + ';"' : '') + '>' +
          '<div class="job-card__main">' +
            '<div class="job-card__time">' +
              '<span class="job-card__hour">' + escHtml(fmtTime(j.scheduled_time)) + '</span>' +
            '</div>' +
            '<div class="req-card__avatar req-card__avatar--blue">' + initial + '</div>' +
            '<div class="req-card__body">' +
              '<div class="req-card__row1">' +
                '<span class="req-card__name">' + escHtml(j.full_name) + '</span>' +
              '</div>' +
              (address  ? '<div class="req-card__meta"><span>' + escHtml(address) + '</span></div>' : '') +
              (j.phone  ? '<div class="req-card__meta" style="margin-top:1px;"><span>' + escHtml(j.phone) + '</span></div>' : '') +
              (chips    ? '<div class="req-card__chips">' + chips + '</div>' : '') +
            '</div>' +
          '</div>' +
          ((sideInfoHtml || cleanerHtml) ? '<div class="job-card__meta-row">' + sideInfoHtml + cleanerHtml + '</div>' : '') +
          '<div class="job-card__btn-row">' +
            '<button class="action-btn action-btn--view"     onclick="SJPage.view(\''         + j.id + '\')">' + eyeIcon   + 'View</button>'     +
            '<button class="action-btn action-btn--accept"   onclick="SJPage.openEdit(\''     + j.id + '\')">' + editIcon  + 'Edit</button>'     +
            (j.needs_coverage
              ? '<button class="action-btn action-btn--archive" disabled>Needs Cover</button>'
              : '<button class="action-btn action-btn--archive" onclick="SJPage.requestCoverage(\'' + j.id + '\')">Can\'t Make It</button>') +
            '<button class="action-btn action-btn--complete" onclick="SJPage.markComplete(\'' + j.id + '\')">' + checkIcon + 'Complete</button>' +
          '</div>' +
        '</div>';
      }).join('');

      var todayStr    = new Date().toISOString().slice(0, 10);
      var tomorrowStr = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
      var isGrpToday    = g.date === todayStr;
      var isGrpTomorrow = g.date === tomorrowStr;
      var grpDateBlock;
      if (g.date === 'unset') {
        grpDateBlock = '<div class="job-group__date-block"><span class="job-group__day-name">No date</span></div>';
      } else if (isGrpToday) {
        grpDateBlock = '<div class="job-group__date-block job-group__date-block--today"><span class="job-group__day-name">Today</span></div>';
      } else if (isGrpTomorrow) {
        grpDateBlock = '<div class="job-group__date-block"><span class="job-group__day-name">Tmrw</span></div>';
      } else {
        var gd = new Date(g.date + 'T00:00:00');
        var gdName  = gd.toLocaleDateString('en-AU', { weekday: 'short' }).toUpperCase();
        var gdNum   = gd.getDate();
        var gdMonth = gd.toLocaleDateString('en-AU', { month: 'short' }).toUpperCase();
        grpDateBlock = '<div class="job-group__date-block">' +
          '<span class="job-group__day-name">' + gdName + '</span>' +
          '<span class="job-group__day-num">' + gdNum + '</span>' +
          '<span class="job-group__month">' + gdMonth + '</span>' +
        '</div>';
      }

      return '<div class="job-group' + (isGrpToday ? ' job-group--today' : '') + '">' +
        '<div class="job-group__header">' +
          grpDateBlock +
          '<div class="job-group__divider"></div>' +
          '<span class="job-group__count">' + g.jobs.length + ' job' + (g.jobs.length === 1 ? '' : 's') + '</span>' +
        '</div>' +
        '<div class="job-group__cards">' + cards + '</div>' +
      '</div>';
    }).join('');

    wrap.innerHTML = html;
  }

  /* ─── View details ──────────────────────────────────────────── */

  function view(id) {
    var j = jobs.find(function (x) { return x.id === id; });
    if (!j) return;
    viewingId = id;

    var initial = (j.full_name || '?').charAt(0).toUpperCase();
    var address = [j.street_address, j.suburb, j.state, j.postcode].filter(Boolean).join(', ');

    var checklist = j.checklist;
    if (typeof checklist === 'string') { try { checklist = JSON.parse(checklist); } catch(e) { checklist = []; } }
    if (!Array.isArray(checklist)) checklist = [];

    function field(label, val, full) {
      if (!val && val !== 0) return '';
      return '<div class="job-detail__field' + (full ? ' job-detail__field--full' : '') + '">' +
        '<div class="job-detail__label">' + label + '</div>' +
        '<div class="job-detail__value">' + val + '</div>' +
        '</div>';
    }

    var chips = (j.services || []).map(function (s) {
      return '<span class="req-chip req-chip--blue">' + escHtml(s) + '</span>';
    }).join('');

    var phoneIcon = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.15 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.06 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21 16.92z"/></svg>';
    var emailIcon = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>';

    var contactsHtml = '';
    if (j.phone) contactsHtml += '<a href="tel:' + escHtml(j.phone) + '">' + phoneIcon + ' ' + escHtml(j.phone) + '</a>';
    if (j.email) contactsHtml += '<a href="mailto:' + escHtml(j.email) + '">' + emailIcon + ' ' + escHtml(j.email) + '</a>';

    var checklistHtml = '';
    if (checklist.length > 0) {
      var done = checklist.filter(function (item) { return item.done; }).length;
      var pct  = Math.round(done / checklist.length * 100);
      checklistHtml =
        '<div class="job-detail__section" style="margin-top:4px;">' +
          '<div class="job-detail__section-title">Checklist</div>' +
          '<div class="checklist-progress">' +
            '<div class="checklist-progress__bar"><div class="checklist-progress__fill" id="sj-progress-fill" style="width:' + pct + '%"></div></div>' +
            '<span class="checklist-progress__label" id="sj-progress-label">' + done + ' / ' + checklist.length + '</span>' +
          '</div>' +
          '<ul class="checklist-items" id="sj-checklist-items">' +
          checklist.map(function (item) {
            return '<li class="checklist-item' + (item.done ? ' is-done' : '') + '">' +
              '<label><input type="checkbox" value="' + escHtml(item.id) + '"' + (item.done ? ' checked' : '') + '> ' + escHtml(item.text) + '</label>' +
              '</li>';
          }).join('') +
          '</ul>' +
        '</div>';
    }

    document.getElementById('sj-view-body').innerHTML =
      '<div class="job-detail">' +
        '<div class="job-detail__hero">' +
          '<div class="job-detail__hero-avatar">' + initial + '</div>' +
          '<div class="job-detail__hero-body">' +
            '<div class="job-detail__hero-name">' + escHtml(j.full_name || '') + '</div>' +
            (contactsHtml ? '<div class="job-detail__hero-contacts">' + contactsHtml + '</div>' : '') +
          '</div>' +
        '</div>' +

        '<div class="job-detail__section">' +
          '<div class="job-detail__section-title">Property</div>' +
          '<div class="job-detail__grid">' +
            (address ? field('Address', escHtml(address), true) : '') +
            field('Type', escHtml(j.property_type)) +
            (j.bedrooms  ? field('Bedrooms',  j.bedrooms)  : '') +
            (j.bathrooms ? field('Bathrooms', j.bathrooms) : '') +
          '</div>' +
        '</div>' +

        '<div class="job-detail__section">' +
          '<div class="job-detail__section-title">Service</div>' +
          (chips ? '<div class="job-detail__chips">' + chips + '</div>' : '') +
          '<div class="job-detail__grid" style="margin-top:' + (chips ? '10px' : '0') + ';">' +
            field('Frequency', escHtml(j.frequency)) +
            (j.recurrence && j.recurrence !== 'none' ? field('Repeat', escHtml(j.recurrence)) : '') +
          '</div>' +
        '</div>' +

        '<div class="job-detail__section">' +
          '<div class="job-detail__section-title">Schedule</div>' +
          '<div class="job-detail__grid">' +
            field('Date', escHtml(fmtDate(j.scheduled_date))) +
            field('Time', escHtml(fmtTime(j.scheduled_time))) +
          '</div>' +
        '</div>' +

        ((j.notes || j.internal_notes) ?
          '<div class="job-detail__section">' +
            '<div class="job-detail__section-title">Notes</div>' +
            (j.notes ? '<div class="job-detail__note">' + escHtml(j.notes) + '</div>' : '') +
            (j.internal_notes ? '<div class="job-detail__note" style="margin-top:6px;border-left:3px solid #000;">' + escHtml(j.internal_notes) + '</div>' : '') +
          '</div>'
        : '') +

        checklistHtml +
      '</div>';

    // Bind checklist checkboxes
    if (checklist.length > 0) {
      document.querySelectorAll('#sj-checklist-items input[type="checkbox"]').forEach(function (cb) {
        cb.addEventListener('change', function () {
          var itemId = cb.value;
          checklist = checklist.map(function (item) {
            return item.id === itemId ? Object.assign({}, item, { done: cb.checked }) : item;
          });
          var li = cb.closest('li');
          if (li) li.classList.toggle('is-done', cb.checked);
          var nowDone = checklist.filter(function (item) { return item.done; }).length;
          var nowPct  = Math.round(nowDone / checklist.length * 100);
          var fillEl  = document.getElementById('sj-progress-fill');
          var labelEl = document.getElementById('sj-progress-label');
          if (fillEl)  fillEl.style.width  = nowPct + '%';
          if (labelEl) labelEl.textContent  = nowDone + ' / ' + checklist.length;
          clearTimeout(checklistTimer);
          checklistTimer = setTimeout(function () { saveChecklist(id, checklist); }, 600);
        });
      });
    }

    MQ.ui.modal.open('modal-sj-view');
  }

  /* ─── Mark complete ─────────────────────────────────────────── */

  async function markComplete(id) {
    var j = jobs.find(function (x) { return x.id === id; });
    if (!j) return;

    try {
      var session = await MQ.supabase.auth.getSession();
      var token   = session.data.session && session.data.session.access_token;

      var res  = await fetch('/api/complete-job', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
        body: JSON.stringify({ jobId: id }),
      });
      var data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to mark complete.');

      // If the view modal is currently open, show success inline
      var viewModal = document.getElementById('modal-sj-view');
      var isInView  = viewModal && !viewModal.hasAttribute('hidden');

      if (isInView) {
        document.getElementById('sj-view-body').innerHTML =
          '<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:48px 24px;text-align:center;gap:18px;">' +
            '<div style="width:68px;height:68px;background:#f0f0f0;border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0;">' +
              '<svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#000" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>' +
            '</div>' +
            '<div>' +
              '<div style="font-size:19px;font-weight:700;color:#000;margin-bottom:8px;">Job Complete!</div>' +
              '<div style="font-size:14px;color:#000;line-height:1.55;">A thank-you email has been sent to<br><strong style="color:#000;">' + escHtml(j.email || j.full_name) + '</strong>.</div>' +
            '</div>' +
          '</div>';

        var footer = viewModal.querySelector('.modal-footer');
        if (footer) {
          footer.innerHTML =
            '<button class="btn-outline" onclick="MQ.ui.modal.close(\'modal-sj-view\');">Close</button>' +
            (MQ.hasRole('owner') ? '<a class="btn-primary" href="completed-jobs.html">View Completed Jobs</a>' : '');
        }
        viewingId = null;
        load();
      } else {
        MQ.ui.toast('Job marked complete — thank-you email sent');
        load();
      }
    } catch (err) {
      MQ.ui.toast('Error: ' + err.message, 'error');
    }
  }

  /* ─── Request coverage (manager-initiated "can't make it") ──── */

  async function requestCoverage(id) {
    var j = jobs.find(function (x) { return x.id === id; });
    if (!j) return;
    if (!window.confirm("This will open the job up for another team member to claim. Continue?")) return;

    try {
      var session = await MQ.supabase.auth.getSession();
      var token   = session.data.session && session.data.session.access_token;
      var res  = await fetch('/api/request-coverage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
        body: JSON.stringify({ jobId: id }),
      });
      var data = await res.json();
      if (data.error) throw new Error(data.error);
      MQ.ui.toast('Coverage requested — this job is now an open shift');
      load();
    } catch (err) {
      MQ.ui.toast('Error: ' + err.message, 'error');
    }
  }

  /* ─── Save Checklist ────────────────────────────────────────── */

  function saveChecklist(jobId, checklist) {
    MQ.supabase.auth.getSession().then(function(r) {
      var token = r.data && r.data.session && r.data.session.access_token;
      if (!token) return;
      fetch('/api/save-checklist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
        body: JSON.stringify({ jobId: jobId, checklist: checklist }),
      }).catch(function(){});
    });
  }

  /* ─── Edit Schedule ─────────────────────────────────────────── */

  function openEdit(id) {
    var j = jobs.find(function (x) { return x.id === id; });
    if (!j) return;
    editingId = id;

    document.getElementById('sj-edit-id').value = id;
    document.getElementById('sj-edit-date').value = j.scheduled_date || '';
    document.getElementById('sj-edit-time').value = j.scheduled_time || '';
    document.getElementById('sj-edit-error').style.display = 'none';

    var displayEl = document.getElementById('sj-edit-date-display');
    if (displayEl) {
      if (j.scheduled_date) {
        var d = new Date(j.scheduled_date + 'T00:00:00');
        displayEl.textContent = d.toLocaleDateString('en-AU', {weekday:'short',day:'numeric',month:'long',year:'numeric'});
        displayEl.classList.remove('cdp-display--placeholder');
      } else {
        displayEl.textContent = 'Select a date';
        displayEl.classList.add('cdp-display--placeholder');
      }
    }

    if (j.scheduled_time) {
      var parts  = (j.scheduled_time || '08:00').split(':');
      var hourEl = document.getElementById('sj-edit-time-hour');
      var minEl  = document.getElementById('sj-edit-time-min');
      if (hourEl) hourEl.value = parseInt(parts[0]).toString();
      if (minEl)  minEl.value  = parts[1] || '00';
      syncEditTimeHidden();
    }

    var staff  = MQ.store.staff.getAll();
    var cbWrap = document.getElementById('sj-edit-staff-checkboxes');
    var assigned = j.assigned_staff_ids || [];
    cbWrap.innerHTML = staff.length ? staff.map(function (s) {
      var checked = assigned.indexOf(s.id) !== -1 ? ' checked' : '';
      return '<label style="display:inline-flex;align-items:center;gap:6px;font-size:13px;padding:5px 12px;border:1.5px solid #e5e7eb;border-radius:8px;cursor:pointer;">' +
        (s.colour ? '<span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:' + escHtml(s.colour) + ';flex-shrink:0;"></span>' : '') +
        '<input type="checkbox" value="' + escHtml(s.id) + '"' + checked + '> ' + escHtml(s.name) +
      '</label>';
    }).join('') : '<span style="font-size:13px;color:#000;">No staff added yet</span>';

    MQ.ui.modal.close('modal-sj-view');
    MQ.ui.modal.open('modal-sj-edit');
  }

  async function submitEdit() {
    var id    = document.getElementById('sj-edit-id').value;
    var date  = document.getElementById('sj-edit-date').value;
    var time  = document.getElementById('sj-edit-time').value;
    var errEl = document.getElementById('sj-edit-error');

    if (!date || !time) { errEl.textContent = 'Date and time are required.'; errEl.style.display = ''; return; }

    var staffIds    = Array.from(document.querySelectorAll('#sj-edit-staff-checkboxes input:checked'))
      .map(function (cb) { return cb.value; });
    var liveMembers = staffIds.map(function (id) { return MQ.store.staff.getById(id); }).filter(Boolean);
    var newColour   = liveMembers.length && liveMembers[0].colour ? liveMembers[0].colour : '';
    var newName     = liveMembers.map(function (s) { return s.name; }).join(', ');

    var btn = document.getElementById('sj-edit-submit');
    btn.disabled = true; btn.textContent = 'Saving…';
    MQ.ui.saving();

    try {
      var session = await MQ.supabase.auth.getSession();
      var token   = session.data.session && session.data.session.access_token;
      var resp = await fetch('/api/update-job-schedule', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobId: id,
          scheduledDate: date,
          scheduledTime: time,
          assignedStaffIds: staffIds,
          assignedStaffColour: newColour,
          assignedStaffName: newName,
        }),
      });
      if (!resp.ok) {
        var errData = await resp.json().catch(function () { return {}; });
        throw new Error(errData.error || 'Save failed');
      }

      MQ.ui.modal.close('modal-sj-edit');
      MQ.ui.toast('Schedule updated');
      load();
    } catch (err) {
      errEl.textContent = err.message; errEl.style.display = '';
    } finally {
      btn.disabled = false; btn.textContent = 'Save Changes';
      MQ.ui.saved();
    }
  }

  /* ─── Date Picker ───────────────────────────────────────────── */

  function initDatePicker(prefix) {
    var displayEl = document.getElementById(prefix + '-date-display');
    var hiddenEl  = document.getElementById(prefix + '-date');
    var dropEl    = document.getElementById(prefix + '-date-dropdown');
    var gridEl    = document.getElementById(prefix + '-date-grid');
    var labelEl   = document.getElementById(prefix + '-date-month-label');
    var prevBtn   = document.getElementById(prefix + '-date-prev');
    var nextBtn   = document.getElementById(prefix + '-date-next');
    if (!displayEl) return;

    var today        = new Date(); today.setHours(0,0,0,0);
    var viewYear     = today.getFullYear();
    var viewMonth    = today.getMonth();
    var selectedDate = null;
    var MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    var DNAMES = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

    function pad(n) { return n < 10 ? '0' + n : '' + n; }

    function renderGrid() {
      labelEl.textContent = MONTHS[viewMonth] + ' ' + viewYear;
      var cells = DNAMES.map(function(d) { return '<div class="cdp-cell cdp-cell--header">' + d + '</div>'; }).join('');
      var first = new Date(viewYear, viewMonth, 1).getDay();
      var dim   = new Date(viewYear, viewMonth + 1, 0).getDate();
      var prevD = new Date(viewYear, viewMonth, 0).getDate();
      for (var i = 0; i < first; i++) cells += '<div class="cdp-cell cdp-cell--other">' + (prevD - first + 1 + i) + '</div>';
      for (var d = 1; d <= dim; d++) {
        var dt  = new Date(viewYear, viewMonth, d);
        var cls = 'cdp-cell' + (dt.getTime() === today.getTime() ? ' cdp-cell--today' : '') + (selectedDate && dt.getTime() === selectedDate.getTime() ? ' cdp-cell--selected' : '');
        cells += '<div class="' + cls + '" data-date="' + viewYear + '-' + pad(viewMonth+1) + '-' + pad(d) + '">' + d + '</div>';
      }
      var trail = (7 - ((first + dim) % 7)) % 7;
      for (var t = 1; t <= trail; t++) cells += '<div class="cdp-cell cdp-cell--other">' + t + '</div>';
      gridEl.innerHTML = cells;
      gridEl.querySelectorAll('.cdp-cell[data-date]').forEach(function(el) {
        el.addEventListener('click', function() {
          hiddenEl.value = this.dataset.date;
          selectedDate   = new Date(this.dataset.date + 'T00:00:00');
          displayEl.textContent = selectedDate.toLocaleDateString('en-AU', {weekday:'short',day:'numeric',month:'long',year:'numeric'});
          displayEl.classList.remove('cdp-display--placeholder');
          dropEl.hidden = true; renderGrid();
        });
      });
    }

    displayEl.addEventListener('click',   function(e) { e.stopPropagation(); dropEl.hidden = !dropEl.hidden; if (!dropEl.hidden) renderGrid(); });
    displayEl.addEventListener('keydown', function(e) { if (e.key==='Enter'||e.key===' ') { e.preventDefault(); dropEl.hidden=!dropEl.hidden; if(!dropEl.hidden)renderGrid(); } });
    prevBtn.addEventListener('click', function(e) { e.stopPropagation(); viewMonth--; if(viewMonth<0){viewMonth=11;viewYear--;} renderGrid(); });
    nextBtn.addEventListener('click', function(e) { e.stopPropagation(); viewMonth++; if(viewMonth>11){viewMonth=0;viewYear++;} renderGrid(); });
    document.addEventListener('click', function(e) { var p=document.getElementById(prefix+'-date-picker'); if(p&&!p.contains(e.target))dropEl.hidden=true; });
  }

  /* ─── Time Picker ───────────────────────────────────────────── */

  function initTimePicker() {
    var hourEl = document.getElementById('sj-edit-time-hour');
    if (!hourEl) return;
    var HOURS = [{v:'6',l:'6:00 am'},{v:'7',l:'7:00 am'},{v:'8',l:'8:00 am'},{v:'9',l:'9:00 am'},
      {v:'10',l:'10:00 am'},{v:'11',l:'11:00 am'},{v:'12',l:'12:00 pm'},{v:'13',l:'1:00 pm'},
      {v:'14',l:'2:00 pm'},{v:'15',l:'3:00 pm'},{v:'16',l:'4:00 pm'},{v:'17',l:'5:00 pm'},
      {v:'18',l:'6:00 pm'},{v:'19',l:'7:00 pm'},{v:'20',l:'8:00 pm'}];
    hourEl.innerHTML = HOURS.map(function(h){ return '<option value="'+h.v+'">'+h.l+'</option>'; }).join('');
    hourEl.value = '8';
    hourEl.addEventListener('change', syncEditTimeHidden);
    var minEl = document.getElementById('sj-edit-time-min');
    if (minEl) minEl.addEventListener('change', syncEditTimeHidden);
    syncEditTimeHidden();
  }

  function syncEditTimeHidden() {
    var h = document.getElementById('sj-edit-time-hour');
    var m = document.getElementById('sj-edit-time-min');
    var hidden = document.getElementById('sj-edit-time');
    if (!h || !hidden) return;
    var hv = parseInt(h.value);
    hidden.value = (hv < 10 ? '0' + hv : '' + hv) + ':' + (m ? m.value : '00');
  }

  /* ─── Init ──────────────────────────────────────────────────── */

  document.addEventListener('mq:ready', function () {
    load();

    // Sync fresh staff colours from Supabase so card rendering uses live values
    MQ.supabase.from('profiles').select('id, colour, name').then(function (result) {
      (result.data || []).forEach(function (p) {
        var s = MQ.store.staff.getById(p.id);
        if (!s) return;
        var changed = false;
        if (p.colour !== undefined && p.colour !== s.colour) { s.colour = p.colour || ''; changed = true; }
        if (p.name   !== undefined && p.name   !== s.name)   { s.name   = p.name   || ''; changed = true; }
        if (changed) MQ.store.staff.save(s);
      });
    }).catch(function () {});

    document.getElementById('btn-refresh').addEventListener('click', load);
    document.getElementById('sj-edit-submit').addEventListener('click', submitEdit);
    document.getElementById('sj-view-complete-btn').addEventListener('click', function () { if (viewingId) markComplete(viewingId); });

    var searchEl = document.getElementById('sj-search');
    if (searchEl) searchEl.addEventListener('input', function () { filterAndRender(this.value); });

    initDatePicker('sj-edit');
    initTimePicker();

    MQ.supabase
      .channel('sj-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'quote_requests' },
        function () { load(); })
      .subscribe();
  });

  document.addEventListener('mq:pageshow', function () { load(); });

  /* ─── Digest panel ──────────────────────────────────────────── */

  function renderDigest(jobList) {
    var el = document.getElementById('sj-digest');
    if (!el) return;

    var recurringMap = {};
    var oneOffs = [];

    jobList.forEach(function (j) {
      if (j.recurrence && j.recurrence !== 'none') {
        var key = j.client_id || j.full_name;
        if (!recurringMap[key]) {
          recurringMap[key] = { job: j, count: 0, nextDate: j.scheduled_date };
        }
        recurringMap[key].count++;
        if (j.scheduled_date < recurringMap[key].nextDate) {
          recurringMap[key].nextDate = j.scheduled_date;
        }
      } else {
        oneOffs.push(j);
      }
    });

    var clients = Object.values(recurringMap)
      .sort(function (a, b) { return a.nextDate.localeCompare(b.nextDate); });

    var html = '';

    if (clients.length) {
      html += '<div class="sj-digest__card"><div class="sj-digest__heading">Recurring Clients</div>';
      clients.forEach(function (entry) {
        var j = entry.job;
        var initial = (j.full_name || '?')[0].toUpperCase();
        var recLabel = j.recurrence.charAt(0).toUpperCase() + j.recurrence.slice(1);
        html += '<div class="sj-digest__row" onclick="SJPage.filterToClient(' + JSON.stringify(j.full_name) + ')">' +
          '<div class="sj-digest__avatar">' + escHtml(initial) + '</div>' +
          '<div class="sj-digest__info">' +
            '<div class="sj-digest__name">' + escHtml(j.full_name) + '</div>' +
            '<div class="sj-digest__sub">' + escHtml(recLabel) + ' &bull; Next: ' + escHtml(fmtDate(entry.nextDate)) + '</div>' +
          '</div>' +
          '<div class="sj-digest__badge">' + entry.count + '</div>' +
        '</div>';
      });
      html += '</div>';
    }

    if (oneOffs.length) {
      oneOffs.sort(function (a, b) { return a.scheduled_date.localeCompare(b.scheduled_date); });
      html += '<div class="sj-digest__card"><div class="sj-digest__heading">One-off Jobs</div>' +
        '<div class="sj-digest__row" style="cursor:default;">' +
          '<div class="sj-digest__info">' +
            '<div class="sj-digest__name">' + oneOffs.length + ' upcoming job' + (oneOffs.length !== 1 ? 's' : '') + '</div>' +
            '<div class="sj-digest__sub">Next: ' + escHtml(fmtDate(oneOffs[0].scheduled_date)) + '</div>' +
          '</div>' +
        '</div></div>';
    }

    if (!html) {
      html = '<div class="sj-digest__card"><div class="sj-digest__heading" style="border:none;padding:14px;">No upcoming jobs</div></div>';
    }

    el.innerHTML = html;
  }

  function filterToClient(name) {
    var searchEl = document.getElementById('sj-search');
    if (searchEl) {
      searchEl.value = name;
      searchEl.dispatchEvent(new Event('input'));
    }
  }

  window.SJPage = { view: view, openEdit: openEdit, markComplete: markComplete, requestCoverage: requestCoverage, filterToClient: filterToClient };
})();
