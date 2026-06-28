/* MyQuest — staff.js — HRIS table with A2 row-expand */
(function () {
  'use strict';

  var allStaff    = [];
  var openRowId   = null;
  var activeFilter = 'current'; // 'current' (onboarding+active) | 'onboarding' | 'active' | 'exited' | 'all'
  var profileCache = {};

  var COLOURS = ['#000000','#1e40af','#065f46','#7c3aed','#9f1239','#92400e','#0e7490','#374151','#b45309','#be123c'];

  /* ── helpers ─────────────────────────────────────────────── */

  function esc(s) {
    return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }
  function sanitize(val, max) { return String(val || '').trim().slice(0, max || 200); }

  function initials(name) {
    return (name || '??').split(' ').filter(Boolean).map(function (w) { return w[0]; }).join('').slice(0, 2).toUpperCase();
  }

  function fmtDate(iso) {
    if (!iso) return '—';
    var p = iso.split('-');
    if (p.length < 2) return iso;
    var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return (p[2] || '').replace(/^0/, '') + ' ' + (months[parseInt(p[1], 10) - 1] || '') + ' ' + p[0];
  }

  function statusChip(s) {
    if (s === 'active')     return '<span class="hris-chip hris-chip--green"><span class="hris-dot hris-dot--green"></span>Active</span>';
    if (s === 'exited')     return '<span class="hris-chip hris-chip--red"><span class="hris-dot hris-dot--red"></span>Exited</span>';
    if (s === 'onboarding') return '<span class="hris-chip hris-chip--amber"><span class="hris-dot hris-dot--amber"></span>Onboarding</span>';
    return '<span class="hris-chip hris-chip--amber"><span class="hris-dot hris-dot--amber"></span>Onboarding</span>';
  }

  function docCell(has) {
    return has
      ? '<span class="hris-tick-ok">&#x2713;</span> On file'
      : '<span class="hris-tick-no">&#x2715;</span> Missing';
  }

  function applyFilter(staff) {
    if (activeFilter === 'all') return staff;
    if (activeFilter === 'current') return staff.filter(function (s) { return s.status !== 'exited'; });
    return staff.filter(function (s) { return s.status === activeFilter; });
  }

  /* ── load all staff ─────────────────────────────────────── */

  async function loadStaff() {
    var sb = window.MQ && MQ.supabase;
    if (!sb) return;
    var result = await sb
      .from('profiles')
      .select('id,name,email,role,status,colour,phone,mobile,start_date,profile_photo_url,police_check_url,employment_agreement_url,drivers_licence_url,right_to_work_url')
      .neq('role', 'owner')
      .order('name');
    if (result.error) { console.error(result.error); return; }
    allStaff = result.data || [];
    updateCounts();
    renderTable(applyFilter(allStaff));
  }

  function updateCounts() {
    var visible = applyFilter(allStaff);
    var countEl = document.getElementById('staff-count');
    if (countEl) countEl.textContent = visible.length;
  }

  /* ── render table ───────────────────────────────────────── */

  function renderTable(staff) {
    openRowId = null;
    var tbody = document.getElementById('hris-tbody');
    if (!tbody) return;
    if (!staff.length) {
      tbody.innerHTML = '<tr><td colspan="8"><div class="hris-td" style="padding:48px;text-align:center;color:#94a3b8;">No staff members found.</div></td></tr>';
      return;
    }
    tbody.innerHTML = '';
    staff.forEach(function (s) {
      var ini = initials(s.name);
      var col = s.colour || '#64748b';
      var hasPolice   = !!s.police_check_url;
      var hasContract = !!s.employment_agreement_url;
      var hasLicence  = !!s.drivers_licence_url;
      var hasRTW      = !!s.right_to_work_url;
      var avatarContent = s.profile_photo_url
        ? '<img src="' + esc(s.profile_photo_url) + '" style="width:100%;height:100%;object-fit:cover;" alt="">'
        : ini;

      var tr = document.createElement('tr');
      tr.className = 'hris-row--body';
      tr.dataset.id = s.id;
      tr.innerHTML = [
        '<td><div class="hris-td">',
          '<div class="hris-name-cell">',
            '<div class="hris-avatar" style="background:' + esc(col) + ';">' + avatarContent + '</div>',
            '<div><strong>' + esc(s.name || '&mdash;') + '</strong><span class="hris-role">' + esc(s.role || '') + '</span></div>',
            '<span class="hris-chevron">&#x25BC;</span>',
          '</div>',
        '</div></td>',
        '<td><div class="hris-td">' + statusChip(s.status) + '</div></td>',
        '<td><div class="hris-td">' + esc(s.phone || s.mobile || '&mdash;') + '</div></td>',
        '<td><div class="hris-td">' + fmtDate(s.start_date) + '</div></td>',
        '<td class="' + (hasPolice   ? '' : 'hris-cell-missing') + '"><div class="hris-td"><div class="hris-doc-cell">' + docCell(hasPolice)   + '</div></div></td>',
        '<td class="' + (hasContract ? '' : 'hris-cell-missing') + '"><div class="hris-td"><div class="hris-doc-cell">' + docCell(hasContract) + '</div></div></td>',
        '<td class="' + (hasLicence  ? '' : 'hris-cell-missing') + '"><div class="hris-td"><div class="hris-doc-cell">' + docCell(hasLicence)  + '</div></div></td>',
        '<td class="' + (hasRTW      ? '' : 'hris-cell-missing') + '"><div class="hris-td"><div class="hris-doc-cell">' + docCell(hasRTW)      + '</div></div></td>',
      ].join('');

      var expandTr = document.createElement('tr');
      expandTr.className = 'hris-row--expand';
      expandTr.dataset.id = s.id;
      expandTr.innerHTML = '<td colspan="8"><div class="hris-expand-cell" id="hris-expand-' + s.id + '"><div class="hris-td" style="color:#94a3b8;">Loading&hellip;</div></div></td>';

      tr.addEventListener('click', function () { toggleRow(s.id, tr, expandTr); });

      tbody.appendChild(tr);
      tbody.appendChild(expandTr);
    });
  }

  /* ── toggle expand row ──────────────────────────────────── */

  function toggleRow(id, tr, expandTr) {
    var isOpen = tr.classList.contains('is-open');

    if (openRowId && openRowId !== id) {
      var prevTr  = document.querySelector('.hris-row--body[data-id="' + openRowId + '"]');
      var prevExp = document.querySelector('.hris-row--expand[data-id="' + openRowId + '"]');
      if (prevTr)  prevTr.classList.remove('is-open');
      if (prevExp) prevExp.classList.remove('is-visible');
    }

    if (isOpen) {
      tr.classList.remove('is-open');
      expandTr.classList.remove('is-visible');
      openRowId = null;
    } else {
      tr.classList.add('is-open');
      expandTr.classList.add('is-visible');
      openRowId = id;
      loadExpandCard(id);
    }
  }

  /* ── load expand card via API ───────────────────────────── */

  async function loadExpandCard(id) {
    var container = document.getElementById('hris-expand-' + id);
    if (!container) return;

    var sb  = window.MQ && MQ.supabase;
    var tok = '';
    if (sb) {
      var sess = await sb.auth.getSession();
      tok = sess.data && sess.data.session ? sess.data.session.access_token : '';
    }
    if (!tok) { container.innerHTML = '<div class="hris-td" style="color:#dc2626;">Not authenticated.</div>'; return; }

    try {
      var res  = await fetch('/api/get-staff-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + tok },
        body: JSON.stringify({ userId: id }),
      });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      var data = await res.json();
      if (!data.profile) throw new Error('Profile not found');
      // Carry invited_at from the table row data since get-staff-profile may not include it
      var rowData = allStaff.find(function (s) { return s.id === id; }) || {};
      data.profile.invited_at = data.profile.invited_at || rowData.invited_at || null;
      profileCache[id] = data.profile;
      renderViewCard(data.profile, container, tok);
    } catch (e) {
      container.innerHTML = '<div class="hris-td" style="color:#dc2626;padding:20px;">Failed to load: ' + esc(e.message) + '</div>';
    }
  }

  /* ── view card ──────────────────────────────────────────── */

  function renderViewCard(p, container, tok) {
    var ini = initials(p.name);
    var col = p.colour || '#64748b';
    var avatarContent = p.profile_photo_url
      ? '<img src="' + esc(p.profile_photo_url) + '" style="width:100%;height:100%;object-fit:cover;border-radius:16px;" alt="">'
      : ini;

    function vField(label, val, isMissing) {
      var empty = !val;
      var style = (empty && isMissing) ? ' style="color:#dc2626;font-style:italic;"' : (empty ? ' style="color:#94a3b8;"' : '');
      var display = val ? esc(val) : (isMissing ? 'Not provided' : '—');
      return '<div class="a2-field"><div class="a2-field-label">' + esc(label) + '</div><div class="a2-field-value"' + style + '>' + display + '</div></div>';
    }

    function docActions(url, docType) {
      var ok  = !!url;
      return [
        '<div style="display:flex;gap:5px;align-items:center;">',
          ok ? '<span class="a2-doc-badge a2-doc-badge--ok">&#x2713; On file</span>' : '<span class="a2-doc-badge a2-doc-badge--missing">&#x2715; Missing</span>',
          ok ? '<a href="' + esc(url) + '" target="_blank" rel="noopener" class="hris-btn-micro" onclick="event.stopPropagation()">View</a>' : '',
          '<button type="button" class="hris-btn-micro hris-btn-micro--primary" data-upload="' + esc(docType) + '" data-uid="' + esc(p.id) + '" onclick="event.stopPropagation()">' + (ok ? 'Replace' : 'Upload') + '</button>',
        '</div>',
      ].join('');
    }

    var isOnboarding = p.status === 'onboarding';
    var suburb2line = [p.suburb, p.state, p.postcode].filter(Boolean).join(' ');

    // Build the invite button for onboarding staff
    var inviteBtnHtml = '';
    if (isOnboarding) {
      if (p.invited_at) {
        var inviteDate = fmtDate(p.invited_at.split('T')[0]);
        inviteBtnHtml = '<button class="hris-btn hris-btn--outline" data-action="resend-invite" data-uid="' + esc(p.id) + '">Invited ' + esc(inviteDate) + ' &mdash; Resend</button>';
      } else {
        inviteBtnHtml = '<button class="hris-btn hris-btn--invite" data-action="send-invite" data-uid="' + esc(p.id) + '">Send Invite</button>';
      }
    }

    container.innerHTML = [
      '<div class="a2-profile-card">',
        '<div class="a2-col">',
          '<div class="a2-col-heading">Staff Member</div>',
          '<div class="a2-person">',
            '<div class="a2-avatar-lg" style="background:' + esc(col) + ';">' + avatarContent + '</div>',
            '<div><div class="a2-full-name">' + esc(p.name || '&mdash;') + '</div>',
            '<div class="a2-role-tag">' + esc(p.role || '') + (p.cleaning_level ? ' &middot; Level ' + p.cleaning_level : '') + '</div></div>',
            statusChip(p.status),
          '</div>',
        '</div>',
        '<div class="a2-col">',
          '<div class="a2-col-heading">Personal Details</div>',
          vField('Phone', p.phone || p.mobile),
          vField('Address', p.address),
          suburb2line ? '<div class="a2-field"><div class="a2-field-value" style="color:#64748b;font-size:12px;font-weight:500;">' + esc(suburb2line) + '</div></div>' : '',
          vField('Start Date', fmtDate(p.start_date)),
          p.availability ? vField('Availability', p.availability) : '',
        '</div>',
        '<div class="a2-col">',
          '<div class="a2-col-heading">Emergency Contact</div>',
          vField('Name', p.emergency_contact_name, true),
          vField('Relationship', p.emergency_relation),
          vField('Phone', p.emergency_contact_number, true),
        '</div>',
        '<div class="a2-col">',
          '<div class="a2-col-heading">Documents</div>',
          '<div class="a2-doc-row"><span class="a2-doc-name">Police Check</span>'    + docActions(p.police_check_url,         'police_check')        + '</div>',
          '<div class="a2-doc-row"><span class="a2-doc-name">Contract</span>'         + docActions(p.employment_agreement_url, 'employment_agreement') + '</div>',
          '<div class="a2-doc-row"><span class="a2-doc-name">Driver Licence</span>'  + docActions(p.drivers_licence_url,      'drivers_licence')     + '</div>',
          '<div class="a2-doc-row"><span class="a2-doc-name">Right to Work</span>'   + docActions(p.right_to_work_url,        'right_to_work')       + '</div>',
          p.hr_notes ? '<div class="a2-hr-notes">' + esc(p.hr_notes) + '</div>' : '',
        '</div>',
      '</div>',
      '<div class="a2-action-row">',
        '<button class="hris-btn hris-btn--primary" id="btn-edit-' + esc(p.id) + '">Edit Profile</button>',
        inviteBtnHtml,
      '</div>',
    ].join('');

    var editBtn = document.getElementById('btn-edit-' + p.id);
    if (editBtn) editBtn.addEventListener('click', function (e) { e.stopPropagation(); renderEditCard(p, container, tok); });

    container.querySelectorAll('[data-action]').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        if (btn.dataset.action === 'send-invite' || btn.dataset.action === 'resend-invite') {
          sendInvite(p.id, btn, container, tok);
        }
      });
    });

    wireDocUploads(container, p, tok);
  }

  /* ── edit card ──────────────────────────────────────────── */

  function renderEditCard(p, container, tok) {
    var ini = initials(p.name);
    var col = p.colour || '#64748b';
    var avatarContent = p.profile_photo_url
      ? '<img src="' + esc(p.profile_photo_url) + '" style="width:100%;height:100%;object-fit:cover;border-radius:16px;" alt="">'
      : ini;

    function buildSel(id, options, val) {
      var opts = options.map(function (o) {
        var v = typeof o === 'object' ? o.value : o;
        var l = typeof o === 'object' ? o.label : o;
        return '<option value="' + esc(v) + '"' + (String(val) === String(v) ? ' selected' : '') + '>' + esc(l) + '</option>';
      }).join('');
      return '<select class="hris-edit-input" id="' + id + '">' + opts + '</select>';
    }

    var roleOpts   = ['staff','junior-cleaner','mid-cleaner','senior-cleaner','manager'].map(function (r) { return { value: r, label: r.replace(/-/g, ' ') }; });
    var levelOpts  = [1,2,3,4,5].map(function (n) { return { value: n, label: 'Level ' + n }; });
    var statusOpts = [
      { value: 'active',     label: 'Active' },
      { value: 'exited',     label: 'Exited' },
      { value: 'onboarding', label: 'Onboarding' },
    ];
    var stateOpts  = ['ACT','NSW','NT','QLD','SA','TAS','VIC','WA'];
    var currentColour = p.colour || '#64748b';
    var swatchHtml = COLOURS.map(function (c) {
      return '<span class="hris-swatch' + (c === currentColour ? ' is-active' : '') + '" data-colour="' + c + '" style="background:' + c + ';"></span>';
    }).join('');

    // Map legacy status values to valid new ones for the select
    var currentStatus = p.status;
    if (currentStatus === 'invited' || currentStatus === 'suspended') currentStatus = 'onboarding';
    if (!['onboarding','active','exited'].includes(currentStatus)) currentStatus = 'active';

    function docActions(url, docType) {
      var ok = !!url;
      return [
        '<div style="display:flex;gap:5px;align-items:center;">',
          ok ? '<span class="a2-doc-badge a2-doc-badge--ok">&#x2713; On file</span>' : '<span class="a2-doc-badge a2-doc-badge--missing">&#x2715; Missing</span>',
          ok ? '<a href="' + esc(url) + '" target="_blank" rel="noopener" class="hris-btn-micro" onclick="event.stopPropagation()">View</a>' : '',
          '<button type="button" class="hris-btn-micro hris-btn-micro--primary" data-upload="' + esc(docType) + '" data-uid="' + esc(p.id) + '" onclick="event.stopPropagation()">' + (ok ? 'Replace' : 'Upload') + '</button>',
        '</div>',
      ].join('');
    }

    container.innerHTML = [
      '<div class="a2-profile-card">',
        '<div class="a2-col">',
          '<div class="a2-col-heading">Staff Member</div>',
          '<div style="margin-bottom:14px;"><div class="a2-avatar-lg" style="background:' + esc(col) + ';">' + avatarContent + '</div></div>',
          '<div class="hris-edit-field"><label class="hris-edit-label">Name</label><input class="hris-edit-input" id="ef-name" value="' + esc(p.name||'') + '" maxlength="100"></div>',
          '<div class="hris-edit-field"><label class="hris-edit-label">Role</label>' + buildSel('ef-role', roleOpts, p.role||'staff') + '</div>',
          '<div class="hris-edit-field"><label class="hris-edit-label">Level</label>' + buildSel('ef-level', levelOpts, p.cleaning_level||1) + '</div>',
          '<div class="hris-edit-field"><label class="hris-edit-label">Start Date</label><input class="hris-edit-input" id="ef-start" type="date" value="' + esc(p.start_date||'') + '"></div>',
          '<div class="hris-edit-field"><label class="hris-edit-label">Status</label>' + buildSel('ef-status', statusOpts, currentStatus) + '</div>',
          '<div class="hris-edit-field"><label class="hris-edit-label">Colour</label><div class="hris-swatches" id="ef-swatches">' + swatchHtml + '</div><input type="hidden" id="ef-colour" value="' + esc(currentColour) + '"></div>',
        '</div>',
        '<div class="a2-col">',
          '<div class="a2-col-heading">Personal Details</div>',
          '<div class="hris-edit-field"><label class="hris-edit-label">Phone</label><input class="hris-edit-input" id="ef-phone" type="tel" value="' + esc(p.phone||p.mobile||'') + '" maxlength="30"></div>',
          '<div class="hris-edit-field"><label class="hris-edit-label">Street Address</label><input class="hris-edit-input" id="ef-address" value="' + esc(p.address||'') + '" maxlength="100"></div>',
          '<div class="hris-edit-field"><label class="hris-edit-label">Suburb</label><input class="hris-edit-input" id="ef-suburb" value="' + esc(p.suburb||'') + '" maxlength="60"></div>',
          '<div style="display:grid;grid-template-columns:80px 1fr;gap:8px;">',
            '<div class="hris-edit-field"><label class="hris-edit-label">State</label>' + buildSel('ef-state', stateOpts, p.state||'QLD') + '</div>',
            '<div class="hris-edit-field"><label class="hris-edit-label">Postcode</label><input class="hris-edit-input" id="ef-postcode" value="' + esc(p.postcode||'') + '" maxlength="4" inputmode="numeric"></div>',
          '</div>',
        '</div>',
        '<div class="a2-col">',
          '<div class="a2-col-heading">Emergency Contact</div>',
          '<div class="hris-edit-field"><label class="hris-edit-label">Name</label><input class="hris-edit-input" id="ef-ec-name" value="' + esc(p.emergency_contact_name||'') + '" maxlength="100"></div>',
          '<div class="hris-edit-field"><label class="hris-edit-label">Relationship</label><input class="hris-edit-input" id="ef-ec-rel" value="' + esc(p.emergency_relation||'') + '" maxlength="50"></div>',
          '<div class="hris-edit-field"><label class="hris-edit-label">Phone</label><input class="hris-edit-input" id="ef-ec-phone" type="tel" value="' + esc(p.emergency_contact_number||'') + '" maxlength="30"></div>',
        '</div>',
        '<div class="a2-col">',
          '<div class="a2-col-heading">Documents</div>',
          '<div class="a2-doc-row"><span class="a2-doc-name">Police Check</span>'    + docActions(p.police_check_url,         'police_check')        + '</div>',
          '<div class="a2-doc-row"><span class="a2-doc-name">Contract</span>'         + docActions(p.employment_agreement_url, 'employment_agreement') + '</div>',
          '<div class="a2-doc-row"><span class="a2-doc-name">Driver Licence</span>'  + docActions(p.drivers_licence_url,      'drivers_licence')     + '</div>',
          '<div class="a2-doc-row"><span class="a2-doc-name">Right to Work</span>'   + docActions(p.right_to_work_url,        'right_to_work')       + '</div>',
          '<div class="hris-edit-field" style="margin-top:12px;"><label class="hris-edit-label">HR Notes</label><textarea class="hris-edit-input" id="ef-hr-notes" rows="3" maxlength="2000">' + esc(p.hr_notes||'') + '</textarea></div>',
        '</div>',
      '</div>',
      '<div class="a2-action-row">',
        '<button class="hris-btn hris-btn--primary" id="btn-save-'   + esc(p.id) + '">Save changes</button>',
        '<button class="hris-btn hris-btn--outline"  id="btn-cancel-' + esc(p.id) + '">Cancel</button>',
        '<span id="save-msg-' + esc(p.id) + '" style="font-size:12px;font-weight:600;margin-left:8px;display:none;"></span>',
      '</div>',
    ].join('');

    var saveBtn   = document.getElementById('btn-save-'   + p.id);
    var cancelBtn = document.getElementById('btn-cancel-' + p.id);
    if (saveBtn)   saveBtn.addEventListener('click',   function (e) { e.stopPropagation(); saveEdits(p, container, tok); });
    if (cancelBtn) cancelBtn.addEventListener('click', function (e) { e.stopPropagation(); renderViewCard(profileCache[p.id] || p, container, tok); });

    container.querySelectorAll('.hris-swatch').forEach(function (sw) {
      sw.addEventListener('click', function (e) {
        e.stopPropagation();
        container.querySelectorAll('.hris-swatch').forEach(function (s) { s.classList.remove('is-active'); });
        sw.classList.add('is-active');
        var colInput = document.getElementById('ef-colour');
        if (colInput) colInput.value = sw.dataset.colour;
      });
    });

    wireDocUploads(container, p, tok);
  }

  /* ── save edits ─────────────────────────────────────────── */

  async function saveEdits(p, container, tok) {
    var saveBtn = document.getElementById('btn-save-' + p.id);
    var msgEl   = document.getElementById('save-msg-' + p.id);
    if (saveBtn) { saveBtn.textContent = 'Saving…'; saveBtn.disabled = true; }
    if (msgEl)   msgEl.style.display = 'none';

    function gv(id) { var el = document.getElementById(id); return el ? el.value : ''; }

    var addrParts = [gv('ef-address'), gv('ef-suburb'), gv('ef-state'), gv('ef-postcode')].filter(Boolean);
    var payload = {
      userId:                   p.id,
      name:                     sanitize(gv('ef-name'), 100),
      role:                     gv('ef-role'),
      cleaning_level:           parseInt(gv('ef-level'), 10) || 1,
      start_date:               gv('ef-start') || null,
      status:                   gv('ef-status'),
      phone:                    sanitize(gv('ef-phone'), 30),
      mobile:                   sanitize(gv('ef-phone'), 30),
      address:                  sanitize(gv('ef-address'), 100),
      suburb:                   sanitize(gv('ef-suburb'), 60),
      state:                    gv('ef-state'),
      postcode:                 sanitize(gv('ef-postcode'), 4).replace(/\D/g, ''),
      residential_address:      addrParts.join(', '),
      emergency_contact_name:   sanitize(gv('ef-ec-name'), 100),
      emergency_relation:       sanitize(gv('ef-ec-rel'), 50),
      emergency_contact_number: sanitize(gv('ef-ec-phone'), 30),
      hr_notes:                 sanitize(gv('ef-hr-notes'), 2000),
      colour:                   gv('ef-colour') || (p.colour || '#64748b'),
    };

    try {
      var res  = await fetch('/api/update-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + tok },
        body: JSON.stringify(payload),
      });
      var data = await res.json();
      if (data.error) throw new Error(data.error);

      var updated = Object.assign({}, profileCache[p.id] || p, payload);
      profileCache[p.id] = updated;
      updateTableRow(p.id, updated);

      // Keep allStaff in sync so filters apply correctly after edits
      for (var i = 0; i < allStaff.length; i++) {
        if (allStaff[i].id === p.id) { Object.assign(allStaff[i], payload); break; }
      }

      if (saveBtn) { saveBtn.textContent = 'Saved ✓'; saveBtn.disabled = true; }
      var cancelBtn2 = document.getElementById('btn-cancel-' + p.id);
      if (cancelBtn2) {
        cancelBtn2.textContent = 'Done';
        cancelBtn2.onclick = function (e) { e.stopPropagation(); renderViewCard(updated, container, tok); };
      }
    } catch (e) {
      if (msgEl) { msgEl.textContent = e.message || 'Save failed.'; msgEl.style.color = '#dc2626'; msgEl.style.display = 'inline'; }
      if (saveBtn) { saveBtn.textContent = 'Save changes'; saveBtn.disabled = false; }
    }
  }

  /* ── update summary row after save ─────────────────────── */

  function updateTableRow(id, p) {
    var tr = document.querySelector('.hris-row--body[data-id="' + id + '"]');
    if (!tr) return;
    var cells = tr.querySelectorAll('td');
    if (cells.length < 4) return;
    var col = p.colour || '#64748b';
    var avatarContent = p.profile_photo_url
      ? '<img src="' + esc(p.profile_photo_url) + '" style="width:100%;height:100%;object-fit:cover;" alt="">'
      : initials(p.name);
    cells[0].innerHTML = '<div class="hris-td"><div class="hris-name-cell"><div class="hris-avatar" style="background:' + esc(col) + ';">' + avatarContent + '</div><div><strong>' + esc(p.name||'&mdash;') + '</strong><span class="hris-role">' + esc(p.role||'') + '</span></div><span class="hris-chevron">&#x25BC;</span></div></div>';
    cells[1].innerHTML = '<div class="hris-td">' + statusChip(p.status) + '</div>';
    cells[2].innerHTML = '<div class="hris-td">' + esc(p.phone||p.mobile||'&mdash;') + '</div>';
    cells[3].innerHTML = '<div class="hris-td">' + fmtDate(p.start_date) + '</div>';
  }

  /* ── send invite ────────────────────────────────────────── */

  async function sendInvite(uid, btn, container, tok) {
    var original = btn.textContent;
    btn.textContent = 'Sending…';
    btn.disabled = true;

    try {
      var res  = await fetch('/api/send-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + tok },
        body: JSON.stringify({ userId: uid }),
      });
      var data = await res.json();
      if (data.error) throw new Error(data.error);

      // Update local cache with invited_at so button reflects the sent date
      var p = profileCache[uid];
      if (p) {
        p.invited_at = new Date().toISOString();
        profileCache[uid] = p;
        renderViewCard(p, container, tok);
      } else {
        btn.textContent = 'Invite sent ✓';
        btn.disabled = false;
      }

      // Update allStaff row
      var row = allStaff.find(function (s) { return s.id === uid; });
      if (row) row.invited_at = new Date().toISOString();

    } catch (e) {
      alert('Could not send invite: ' + (e.message || 'Please try again.'));
      btn.textContent = original;
      btn.disabled = false;
    }
  }

  /* ── document upload ────────────────────────────────────── */

  var DOC_FIELD_MAP = {
    police_check:         'police_check_url',
    employment_agreement: 'employment_agreement_url',
    drivers_licence:      'drivers_licence_url',
    right_to_work:        'right_to_work_url',
  };

  var DOC_TABLE_COL = {
    police_check: 4, employment_agreement: 5, drivers_licence: 6, right_to_work: 7,
  };

  function wireDocUploads(container, p, tok) {
    container.querySelectorAll('[data-upload]').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        pickAndUpload(p, btn.dataset.upload, btn.dataset.uid, container, tok);
      });
    });
  }

  async function pickAndUpload(p, docType, uid, container, tok) {
    var input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf,.jpg,.jpeg,.png';

    input.onchange = async function () {
      if (!input.files || !input.files[0]) return;
      var file = input.files[0];
      if (file.size > 20 * 1024 * 1024) { alert('File must be under 20 MB.'); return; }

      var btn = container.querySelector('[data-upload="' + docType + '"]');
      if (btn) { btn.textContent = '…'; btn.disabled = true; }

      try {
        await fetch('/api/ensure-storage', { method: 'POST', headers: { 'Authorization': 'Bearer ' + tok } });

        var sb  = window.MQ && MQ.supabase;
        var path = uid + '/' + docType;
        var uploadRes = await sb.storage.from('staff-documents').upload(path, file, { upsert: true });
        if (uploadRes.error) throw new Error(uploadRes.error.message);

        var signed = await sb.storage.from('staff-documents').createSignedUrl(path, 60 * 60 * 24 * 365);
        var url = signed.data ? signed.data.signedUrl : path;

        var fieldName = DOC_FIELD_MAP[docType];
        if (!fieldName) throw new Error('Unknown doc type');

        var updatePayload = { userId: uid };
        updatePayload[fieldName] = url;
        if (docType === 'employment_agreement') {
          updatePayload.employment_agreement_received_at = new Date().toISOString();
        }

        var updateRes = await fetch('/api/update-profile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + tok },
          body: JSON.stringify(updatePayload),
        });
        var updateData = await updateRes.json();
        if (updateData.error) throw new Error(updateData.error);

        var cachedP = profileCache[uid] || p;
        cachedP[fieldName] = url;
        profileCache[uid]  = cachedP;

        var colIdx   = DOC_TABLE_COL[docType];
        var tableRow = document.querySelector('.hris-row--body[data-id="' + uid + '"]');
        if (tableRow && colIdx !== undefined) {
          var cells = tableRow.querySelectorAll('td');
          if (cells[colIdx]) {
            cells[colIdx].className = '';
            cells[colIdx].innerHTML = '<div class="hris-td"><div class="hris-doc-cell"><span class="hris-tick-ok">&#x2713;</span> On file</div></div>';
          }
        }

        var isEditMode = !!container.querySelector('#ef-name');
        if (isEditMode) renderEditCard(cachedP, container, tok);
        else            renderViewCard(cachedP, container, tok);

      } catch (e) {
        if (btn) { btn.textContent = 'Upload'; btn.disabled = false; }
        alert('Upload failed: ' + (e.message || 'Please try again.'));
      }
    };
    input.click();
  }

  /* ── filter pills ───────────────────────────────────────── */

  function wireFilters() {
    document.querySelectorAll('.hris-filter-pill').forEach(function (pill) {
      pill.addEventListener('click', function () {
        activeFilter = pill.dataset.filter;
        document.querySelectorAll('.hris-filter-pill').forEach(function (p) {
          p.classList.toggle('is-active', p.dataset.filter === activeFilter);
        });
        updateCounts();
        var searchInput = document.getElementById('staff-search');
        var q = searchInput ? searchInput.value.toLowerCase().trim() : '';
        var filtered = applyFilter(allStaff);
        if (q) filtered = filtered.filter(function (s) {
          return (s.name || '').toLowerCase().indexOf(q) !== -1 || (s.role || '').toLowerCase().indexOf(q) !== -1;
        });
        renderTable(filtered);
      });
    });
  }

  /* ── search ─────────────────────────────────────────────── */

  function wireSearch() {
    var input = document.getElementById('staff-search');
    if (!input) return;
    input.addEventListener('input', function () {
      var q = input.value.toLowerCase().trim();
      var filtered = applyFilter(allStaff);
      if (q) filtered = filtered.filter(function (s) {
        return (s.name || '').toLowerCase().indexOf(q) !== -1 || (s.role || '').toLowerCase().indexOf(q) !== -1;
      });
      renderTable(filtered);
    });
  }

  /* ── add staff modal ────────────────────────────────────── */

  function wireAddStaff() {
    var btn       = document.getElementById('btn-add-staff');
    var modal     = document.getElementById('modal-add-staff');
    var closeBtn  = document.getElementById('modal-add-close');
    var submitBtn = document.getElementById('add-staff-submit');
    if (!btn || !modal) return;

    btn.addEventListener('click', function () {
      MQ.ui.modal.open('modal-add-staff');
      var el = document.getElementById('add-name');
      if (el) el.focus();
    });
    if (closeBtn) closeBtn.addEventListener('click', function () { MQ.ui.modal.close('modal-add-staff'); });
    modal.addEventListener('click', function (e) { if (e.target === modal) MQ.ui.modal.close('modal-add-staff'); });
    if (submitBtn) submitBtn.addEventListener('click', submitAddStaff);

    // Wire colour swatches in the add modal
    document.querySelectorAll('.add-colour-swatch').forEach(function (sw) {
      sw.addEventListener('click', function () {
        document.querySelectorAll('.add-colour-swatch').forEach(function (s) { s.classList.remove('is-active'); });
        sw.classList.add('is-active');
        var inp = document.getElementById('add-colour');
        if (inp) inp.value = sw.dataset.colour;
      });
    });
  }

  async function submitAddStaff() {
    var btn   = document.getElementById('add-staff-submit');
    var errEl = document.getElementById('add-staff-error');
    if (btn)   { btn.textContent = 'Adding…'; btn.disabled = true; }
    if (errEl) errEl.style.display = 'none';

    var name   = sanitize((document.getElementById('add-name')   || {}).value, 100);
    var email  = sanitize((document.getElementById('add-email')  || {}).value, 200).toLowerCase();
    var role   = (document.getElementById('add-role')   || {}).value || 'staff';
    var start  = (document.getElementById('add-start')  || {}).value || null;
    var phone  = sanitize((document.getElementById('add-phone')  || {}).value, 30);
    var level  = parseInt((document.getElementById('add-level')  || {}).value, 10) || 1;
    var colour = (document.getElementById('add-colour') || {}).value || '#64748b';

    if (!name)  { showAddErr('Please enter a name.');           if (btn) { btn.textContent = 'Add Member'; btn.disabled = false; } return; }
    if (!email) { showAddErr('Please enter an email address.'); if (btn) { btn.textContent = 'Add Member'; btn.disabled = false; } return; }

    try {
      var sb   = window.MQ && MQ.supabase;
      var sess = await sb.auth.getSession();
      var tok  = sess.data && sess.data.session ? sess.data.session.access_token : '';

      var res  = await fetch('/api/create-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + tok },
        body: JSON.stringify({ name: name, email: email, role: role, start_date: start, phone: phone, cleaning_level: level, colour: colour }),
      });
      var data = await res.json();
      if (data.error) throw new Error(data.error);

      MQ.ui.modal.close('modal-add-staff');
      // Clear all fields
      ['add-name', 'add-email', 'add-start', 'add-phone'].forEach(function (id) { var el = document.getElementById(id); if (el) el.value = ''; });
      var roleEl = document.getElementById('add-role');   if (roleEl) roleEl.value = 'staff';
      var lvlEl  = document.getElementById('add-level');  if (lvlEl) lvlEl.value = '1';
      // Reset colour swatches
      document.querySelectorAll('.add-colour-swatch').forEach(function (s) { s.classList.remove('is-active'); });
      var colourInp = document.getElementById('add-colour'); if (colourInp) colourInp.value = '#64748b';

      await loadStaff();
    } catch (e) {
      showAddErr(e.message || 'Failed to create account. Please try again.');
    } finally {
      if (btn) { btn.textContent = 'Add Member'; btn.disabled = false; }
    }
  }

  function showAddErr(msg) {
    var el = document.getElementById('add-staff-error');
    if (el) { el.textContent = msg; el.style.display = 'block'; }
  }

  /* ── init ───────────────────────────────────────────────── */

  MQ.onReady(async function () {
    if (!MQ.hasRole('owner')) return;
    await loadStaff();
    wireSearch();
    wireFilters();
    wireAddStaff();
  });

})();
