/* MyQuest — staff.js — HRIS */
(function () {
  'use strict';

  var COLOURS = ['#000000','#1e40af','#065f46','#7c3aed','#9f1239','#92400e','#0e7490','#374151'];
  var ROLES   = ['owner','manager','senior-cleaner','mid-cleaner','junior-cleaner','staff'];
  var MAX_FILE_BYTES = 5 * 1024 * 1024;

  var token    = '';
  var allStaff = [];
  var openId   = null;
  var openProfile = null;

  function qs(sel, ctx) { return (ctx || document).querySelector(sel); }
  function esc(s) {
    return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }
  function sanitize(v, n) { return String(v || '').trim().slice(0, n || 200); }
  function sanitizePhone(v) { return sanitize(v, 20).replace(/[^\d\s\-+().]/g, ''); }

  /* ── tick SVG ────────────────────────────────────────────── */

  function tickSvg(ok) {
    var cls = ok ? 'staff-tick staff-tick--ok' : 'staff-tick staff-tick--no';
    var d   = ok
      ? '<polyline points="4 12 9 17 20 6"/>'
      : '<line x1="8" y1="8" x2="16" y2="16"/><line x1="16" y1="8" x2="8" y2="16"/>';
    return '<div class="' + cls + '"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round">' + d + '</svg></div>';
  }

  /* ── avatar HTML ─────────────────────────────────────────── */

  function avatarHtml(p, size, radius) {
    var s  = size   || 40;
    var r  = radius || 12;
    var bg = p.colour || 'linear-gradient(135deg,#334155,#1e293b)';
    var style = 'width:' + s + 'px;height:' + s + 'px;border-radius:' + r + 'px;background:' + esc(bg) + ';display:flex;align-items:center;justify-content:center;font-size:' + Math.round(s * .38) + 'px;font-weight:800;color:#fff;flex-shrink:0;overflow:hidden;';
    if (p.profile_photo_url) {
      return '<div style="' + style + '"><img src="' + esc(p.profile_photo_url) + '" alt="" style="width:100%;height:100%;object-fit:cover;"></div>';
    }
    return '<div style="' + style + '">' + esc((p.name || '?').charAt(0).toUpperCase()) + '</div>';
  }

  /* ── render list ─────────────────────────────────────────── */

  function renderList(staff) {
    var listEl  = qs('#staff-list');
    var countEl = qs('#staff-count');
    if (!listEl) return;
    if (countEl) countEl.textContent = allStaff.length;

    if (!staff.length) {
      listEl.innerHTML = '<div class="staff-empty-state"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg><p>No staff members yet.<br>Click <strong>+ Add Member</strong> to invite someone.</p></div>';
      return;
    }

    listEl.innerHTML = staff.map(function (p) {
      var roleLabel = (p.role || 'staff').replace(/-/g, ' ');
      var badgeHtml = '';
      if (p.status === 'suspended') badgeHtml = '<span class="staff-badge staff-badge--suspended">Suspended</span>';
      else if (p.status === 'invited') badgeHtml = '<span class="staff-badge staff-badge--invited">Invited</span>';
      var selected = p.id === openId ? ' is-selected' : '';
      return [
        '<div class="staff-row' + selected + '" data-id="' + esc(p.id) + '">',
          avatarHtml(p, 40, 12),
          '<div class="staff-row__info">',
            '<div class="staff-row__name">' + esc(p.name || p.email || '—') + '</div>',
            '<div class="staff-row__role">' + esc(roleLabel) + '</div>',
          '</div>',
          '<div class="staff-row__badges">',
            tickSvg(!!p.police_check_url),
            badgeHtml,
          '</div>',
        '</div>',
      ].join('');
    }).join('');

    listEl.querySelectorAll('.staff-row').forEach(function (row) {
      row.addEventListener('click', function () {
        openProfile = null;
        openDetailPanel(row.dataset.id);
      });
    });
  }

  /* ── filter ──────────────────────────────────────────────── */

  function applyFilter() {
    var q = ((qs('#staff-search') || {}).value || '').toLowerCase().trim();
    var filtered = q
      ? allStaff.filter(function (p) {
          return (p.name || '').toLowerCase().includes(q)
              || (p.role || '').toLowerCase().includes(q)
              || (p.email || '').toLowerCase().includes(q);
        })
      : allStaff;
    renderList(filtered);
  }

  /* ── open detail panel ───────────────────────────────────── */

  async function openDetailPanel(id) {
    openId = id;
    var layout = qs('#staff-layout');
    var detail = qs('#staff-detail');
    var inner  = qs('#staff-detail-inner');
    if (!detail || !inner) return;

    applyFilter();
    detail.style.display = 'block';
    if (layout) layout.classList.remove('no-panel');
    inner.innerHTML = '<div style="padding:32px;text-align:center;color:#94a3b8;font-size:13px;">Loading…</div>';

    try {
      var res  = await fetch('/api/get-staff-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
        body: JSON.stringify({ userId: id }),
      });
      if (!res.ok) throw new Error('Failed to load profile.');
      var data = await res.json();
      if (!data.profile) throw new Error('Profile not found.');
      openProfile = data.profile;
      renderDetailPanel(data.profile);
    } catch (e) {
      inner.innerHTML = '<div style="padding:32px;text-align:center;color:#dc2626;font-size:13px;">' + esc(e.message) + '</div>';
    }
  }

  function closeDetailPanel() {
    openId      = null;
    openProfile = null;
    var layout = qs('#staff-layout');
    var detail = qs('#staff-detail');
    if (layout) layout.classList.add('no-panel');
    if (detail) detail.style.display = 'none';
    applyFilter();
  }

  /* ── detail panel render ─────────────────────────────────── */

  var activeTab = 'overview';

  function renderDetailPanel(p) {
    var inner = qs('#staff-detail-inner');
    if (!inner) return;

    var tabs = [
      { id: 'overview',   label: 'Overview' },
      { id: 'documents',  label: 'Documents' },
      { id: 'employment', label: 'Employment' },
      { id: 'emergency',  label: 'Emergency' },
    ];

    var tabsHtml = tabs.map(function (t) {
      return '<button class="staff-panel-tab' + (t.id === activeTab ? ' is-active' : '') + '" data-tab="' + t.id + '">' + t.label + '</button>';
    }).join('');

    var closeSvg = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';

    inner.innerHTML = [
      '<div style="padding:18px 20px 14px;border-bottom:1px solid #f1f5f9;display:flex;align-items:flex-start;gap:12px;">',
        avatarHtml(p, 52, 15),
        '<div style="flex:1;min-width:0;padding-top:2px;">',
          '<div style="font-size:16px;font-weight:800;color:#0f172a;letter-spacing:-.02em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + esc(p.name || '—') + '</div>',
          '<div style="font-size:12px;color:#64748b;margin-top:3px;text-transform:capitalize;">' + esc((p.role || 'staff').replace(/-/g,' ')) + (p.status === 'invited' ? ' · <span style="color:#d97706;">Invited</span>' : p.status === 'suspended' ? ' · <span style="color:#dc2626;">Suspended</span>' : '') + '</div>',
          '<label for="sp-photo-upload" style="display:inline-block;font-size:11px;font-weight:600;color:#64748b;cursor:pointer;margin-top:5px;text-decoration:underline;">Change photo</label>',
          '<input type="file" id="sp-photo-upload" accept=".jpg,.jpeg,.png" style="display:none">',
        '</div>',
        '<button id="sp-close" class="client-detail__close" title="Close">' + closeSvg + '</button>',
      '</div>',
      '<div class="staff-panel-tabs">' + tabsHtml + '</div>',
      '<div class="staff-panel-body" id="sp-body"></div>',
    ].join('');

    qs('#sp-close', inner).addEventListener('click', closeDetailPanel);
    wireDetailPhotoUpload(p);

    inner.querySelectorAll('.staff-panel-tab').forEach(function (btn) {
      btn.addEventListener('click', function () {
        activeTab = btn.dataset.tab;
        inner.querySelectorAll('.staff-panel-tab').forEach(function (b) { b.classList.toggle('is-active', b === btn); });
        renderTabBody(p, activeTab);
      });
    });

    renderTabBody(p, activeTab);
  }

  /* ── tab dispatch ────────────────────────────────────────── */

  function renderTabBody(p, tab) {
    var body = qs('#sp-body');
    if (!body) return;
    if (tab === 'overview')   renderOverview(p, body);
    if (tab === 'documents')  renderDocuments(p, body);
    if (tab === 'employment') renderEmployment(p, body);
    if (tab === 'emergency')  renderEmergency(p, body);
  }

  /* ── Overview tab ────────────────────────────────────────── */

  function renderOverview(p, body) {
    var roleOpts = ROLES.map(function (r) {
      return '<option value="' + r + '"' + (r === p.role ? ' selected' : '') + '>' + r.replace(/-/g,' ') + '</option>';
    }).join('');
    var levelOpts = [1,2,3,4,5].map(function (n) {
      return '<option value="' + n + '"' + (n === (p.cleaning_level || 1) ? ' selected' : '') + '>Level ' + n + '</option>';
    }).join('');
    var dobFormatted = '';
    if (p.date_of_birth) {
      var parts = p.date_of_birth.split('-');
      dobFormatted = (parts[2] || '') + '/' + (parts[1] || '') + '/' + (parts[0] || '');
    }

    body.innerHTML = [
      '<div class="sp-field"><label class="sp-label">Full name</label>',
        '<input class="sp-input" id="ov-name" type="text" value="' + esc(p.name || '') + '" maxlength="100"></div>',
      '<div class="sp-field"><label class="sp-label">Email</label>',
        '<input class="sp-input" id="ov-email" type="email" value="' + esc(p.email || '') + '" readonly></div>',
      '<div class="sp-row-2">',
        '<div class="sp-field"><label class="sp-label">Role</label><select class="sp-input" id="ov-role">' + roleOpts + '</select></div>',
        '<div class="sp-field"><label class="sp-label">Level</label><select class="sp-input" id="ov-level">' + levelOpts + '</select></div>',
      '</div>',
      '<div class="sp-row-2">',
        '<div class="sp-field"><label class="sp-label">Phone</label><input class="sp-input" id="ov-phone" type="tel" value="' + esc(p.mobile || p.phone || '') + '" maxlength="20"></div>',
        '<div class="sp-field"><label class="sp-label">Start date</label><input class="sp-input" id="ov-start" type="date" value="' + esc(p.start_date || '') + '"></div>',
      '</div>',
      '<div class="sp-field"><label class="sp-label">Date of birth</label>',
        '<input class="sp-input" id="ov-dob" type="text" value="' + esc(dobFormatted) + '" placeholder="DD/MM/YYYY" maxlength="10"></div>',
      '<div class="sp-field"><label class="sp-label">Street address</label>',
        '<input class="sp-input" id="ov-address" type="text" value="' + esc(p.address || '') + '" maxlength="100"></div>',
      '<div class="sp-row-2">',
        '<div class="sp-field"><label class="sp-label">Suburb</label><input class="sp-input" id="ov-suburb" type="text" value="' + esc(p.suburb || '') + '" maxlength="60"></div>',
        '<div class="sp-field"><label class="sp-label">Postcode</label><input class="sp-input" id="ov-postcode" type="text" value="' + esc(p.postcode || '') + '" maxlength="4" inputmode="numeric"></div>',
      '</div>',
      '<div class="sp-save-row">',
        '<button class="btn-micro btn-micro--primary" id="ov-save">Save</button>',
        '<span id="ov-msg" style="display:none;font-size:12px;font-weight:600;"></span>',
      '</div>',
    ].join('');

    qs('#ov-save', body).addEventListener('click', function () { saveOverview(p, body); });
  }

  async function saveOverview(p, body) {
    var btn = qs('#ov-save', body);
    var msg = qs('#ov-msg', body);
    if (btn) { btn.textContent = 'Saving…'; btn.disabled = true; }
    if (msg) msg.style.display = 'none';

    var dobRaw   = ((qs('#ov-dob', body) || {}).value || '');
    var dobParts = dobRaw.split('/');
    var dobISO   = (dobParts.length === 3 && dobParts[2].length === 4)
      ? dobParts[2] + '-' + dobParts[1].padStart(2,'0') + '-' + dobParts[0].padStart(2,'0')
      : null;
    var phone    = sanitizePhone((qs('#ov-phone', body) || {}).value);
    var addr     = sanitize((qs('#ov-address', body) || {}).value, 100);
    var suburb   = sanitize((qs('#ov-suburb', body) || {}).value, 60);
    var postcode = sanitize((qs('#ov-postcode', body) || {}).value, 4).replace(/\D/g,'');
    var newName  = sanitize((qs('#ov-name', body) || {}).value, 100);
    var newRole  = (qs('#ov-role', body) || {}).value;

    var payload = {
      userId:         p.id,
      name:           newName,
      phone:          phone,
      mobile:         phone,
      role:           newRole,
      cleaning_level: parseInt((qs('#ov-level', body) || {}).value) || 1,
      start_date:     sanitize((qs('#ov-start', body) || {}).value, 10) || null,
      address:        addr,
      suburb:         suburb,
      postcode:       postcode,
    };
    if (dobISO) payload.date_of_birth = dobISO;

    try {
      var res  = await fetch('/api/update-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
        body: JSON.stringify(payload),
      });
      var data = await res.json();
      if (data.error) throw new Error(data.error);
      if (msg) { msg.className = 'sp-msg-ok'; msg.textContent = 'Saved!'; msg.style.display = 'inline'; setTimeout(function () { msg.style.display = 'none'; }, 2500); }
      p.name = newName; p.role = newRole; p.phone = phone; p.mobile = phone;
      var idx = allStaff.findIndex(function (s) { return s.id === p.id; });
      if (idx !== -1) { allStaff[idx].name = newName; allStaff[idx].role = newRole; applyFilter(); }
    } catch (e) {
      if (msg) { msg.className = 'sp-msg-err'; msg.textContent = e.message || 'Save failed.'; msg.style.display = 'inline'; }
    } finally {
      if (btn) { btn.textContent = 'Save'; btn.disabled = false; }
    }
  }

  /* ── Documents tab ───────────────────────────────────────── */

  function renderDocuments(p, body) {
    var docs = [
      { key: 'police_check_url',    label: 'Police Check',    filename: 'police-check' },
      { key: 'drivers_licence_url', label: "Driver's Licence", filename: 'drivers-licence' },
      { key: 'right_to_work_url',   label: 'Right to Work',   filename: 'right-to-work' },
    ];
    body.innerHTML = docs.map(function (doc) {
      var url    = p[doc.key];
      var hasDoc = !!url;
      var viewBtn = hasDoc ? '<a href="' + esc(url) + '" target="_blank" rel="noopener" class="btn-micro">View</a>' : '';
      return [
        '<div class="doc-slot" id="slot-' + doc.key + '">',
          '<div class="doc-slot__icon">' + tickSvg(hasDoc) + '</div>',
          '<div class="doc-slot__info">',
            '<div class="doc-slot__name">' + esc(doc.label) + '</div>',
            '<div class="doc-slot__status" id="dstatus-' + doc.key + '">' + (hasDoc ? 'On file' : 'Not uploaded') + '</div>',
          '</div>',
          '<div class="doc-slot__actions">',
            viewBtn,
            '<label class="btn-micro btn-micro--primary" for="dup-' + doc.key + '">' + (hasDoc ? 'Replace' : 'Upload') + '</label>',
            '<input type="file" id="dup-' + doc.key + '" accept=".pdf,.jpg,.jpeg,.png" style="display:none">',
          '</div>',
        '</div>',
      ].join('');
    }).join('');

    docs.forEach(function (doc) { wireDocUpload(doc, p, body); });
  }

  function wireDocUpload(doc, p, body) {
    var input = qs('#dup-' + doc.key, body);
    if (!input) return;
    input.addEventListener('change', async function () {
      if (!input.files || !input.files[0]) return;
      var file = input.files[0];
      var ext  = file.name.split('.').pop().toLowerCase();
      if (['pdf','jpg','jpeg','png'].indexOf(ext) === -1) { alert('Please upload a PDF, JPG or PNG.'); return; }
      if (file.size > MAX_FILE_BYTES) { alert('File must be under 5 MB.'); return; }
      var statusEl = qs('#dstatus-' + doc.key, body);
      if (statusEl) statusEl.textContent = 'Uploading…';
      try {
        await fetch('/api/ensure-storage', { method: 'POST', headers: { 'Authorization': 'Bearer ' + token } });
        var sb   = window.MQ && MQ.supabase;
        var path = p.id + '/' + doc.filename + '.' + ext;
        var up   = await sb.storage.from('staff-documents').upload(path, file, { upsert: true });
        if (up.error) throw new Error(up.error.message);
        var signed = await sb.storage.from('staff-documents').createSignedUrl(path, 60 * 60 * 24 * 365);
        var url    = signed.data ? signed.data.signedUrl : path;
        var update = { userId: p.id }; update[doc.key] = url;
        var res  = await fetch('/api/update-profile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
          body: JSON.stringify(update),
        });
        var data = await res.json();
        if (data.error) throw new Error(data.error);
        p[doc.key] = url;
        if (doc.key === 'police_check_url') {
          var idx = allStaff.findIndex(function (s) { return s.id === p.id; });
          if (idx !== -1) { allStaff[idx].police_check_url = url; applyFilter(); }
        }
        // Refresh slot
        var slot = qs('#slot-' + doc.key, body);
        if (slot) {
          slot.querySelector('.doc-slot__icon').innerHTML = tickSvg(true);
          if (statusEl) statusEl.textContent = 'On file';
          var actions = slot.querySelector('.doc-slot__actions');
          if (actions) {
            actions.innerHTML = '<a href="' + esc(url) + '" target="_blank" rel="noopener" class="btn-micro">View</a><label class="btn-micro btn-micro--primary" for="dup-' + doc.key + '">Replace</label><input type="file" id="dup-' + doc.key + '" accept=".pdf,.jpg,.jpeg,.png" style="display:none">';
            wireDocUpload(doc, p, body);
          }
        }
      } catch (e) {
        if (statusEl) statusEl.textContent = 'Failed: ' + (e.message || 'try again');
      }
    });
  }

  /* ── Employment tab ──────────────────────────────────────── */

  function renderEmployment(p, body) {
    var swatchesHtml = COLOURS.map(function (c) {
      return '<div class="staff-swatch' + (p.colour === c ? ' is-active' : '') + '" data-colour="' + c + '" style="background:' + c + ';"></div>';
    }).join('');

    var agreedDate = p.employment_agreement_received_at
      ? ' · Received ' + new Date(p.employment_agreement_received_at).toLocaleDateString('en-AU')
      : '';
    var hasEmpAgree = !!p.employment_agreement_url;
    var viewEmpBtn  = hasEmpAgree ? '<a href="' + esc(p.employment_agreement_url) + '" target="_blank" rel="noopener" class="btn-micro" style="margin-left:6px;">View</a>' : '';

    var statusToggleLabel = p.status === 'suspended' ? 'Reactivate account' : 'Suspend account';
    var statusToggleClass = p.status === 'suspended' ? 'btn-micro' : 'btn-micro btn-micro--danger';

    body.innerHTML = [
      '<div class="sp-field"><label class="sp-label">Colour tag</label>',
        '<div class="staff-colour-swatches" id="sp-swatches">' + swatchesHtml + '</div>',
      '</div>',
      '<hr style="border:none;border-top:1px solid #f1f5f9;margin:12px 0;">',
      '<div class="sp-field">',
        '<label class="sp-label">Employment agreement</label>',
        '<div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-bottom:8px;">',
          tickSvg(hasEmpAgree),
          '<span style="font-size:12.5px;color:' + (hasEmpAgree ? '#059669' : '#94a3b8') + ';">' + (hasEmpAgree ? 'On file' + agreedDate : 'Not on file') + '</span>',
          viewEmpBtn,
        '</div>',
        '<div style="display:flex;align-items:center;gap:8px;">',
          '<label class="btn-micro btn-micro--primary" for="emp-agree-upload">Upload PDF</label>',
          '<input type="file" id="emp-agree-upload" accept=".pdf,.jpg,.jpeg,.png" style="display:none">',
          '<span id="emp-agree-status" style="font-size:11.5px;color:#94a3b8;"></span>',
        '</div>',
      '</div>',
      '<hr style="border:none;border-top:1px solid #f1f5f9;margin:12px 0;">',
      '<div class="sp-field">',
        '<label class="sp-label">HR notes <span style="font-weight:400;text-transform:none;font-size:11px;">(private)</span></label>',
        '<textarea class="sp-input" id="emp-notes" rows="4" placeholder="Internal notes…" maxlength="2000" style="resize:vertical;">' + esc(p.hr_notes || '') + '</textarea>',
      '</div>',
      '<div class="sp-save-row">',
        '<button class="btn-micro btn-micro--primary" id="emp-save">Save notes</button>',
        '<span id="emp-msg" style="display:none;font-size:12px;font-weight:600;"></span>',
      '</div>',
      '<hr style="border:none;border-top:1px solid #f1f5f9;margin:12px 0;">',
      '<div>',
        '<label class="sp-label">Account status</label>',
        '<button class="' + statusToggleClass + '" id="sp-toggle-status">' + statusToggleLabel + '</button>',
      '</div>',
    ].join('');

    // Colour swatches
    body.querySelectorAll('.staff-swatch').forEach(function (sw) {
      sw.addEventListener('click', async function () {
        body.querySelectorAll('.staff-swatch').forEach(function (s) { s.classList.remove('is-active'); });
        sw.classList.add('is-active');
        var colour = sw.dataset.colour;
        await fetch('/api/update-profile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
          body: JSON.stringify({ userId: p.id, colour: colour }),
        });
        p.colour = colour;
        var idx = allStaff.findIndex(function (s) { return s.id === p.id; });
        if (idx !== -1) { allStaff[idx].colour = colour; applyFilter(); }
      });
    });

    // Employment agreement upload
    wireEmpAgreementUpload(p, body);

    // Save notes
    qs('#emp-save', body).addEventListener('click', async function () {
      var btn = qs('#emp-save', body);
      var msg = qs('#emp-msg', body);
      if (btn) { btn.textContent = 'Saving…'; btn.disabled = true; }
      if (msg) msg.style.display = 'none';
      try {
        var res = await fetch('/api/update-profile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
          body: JSON.stringify({ userId: p.id, hr_notes: sanitize((qs('#emp-notes', body) || {}).value, 2000) }),
        });
        var data = await res.json();
        if (data.error) throw new Error(data.error);
        if (msg) { msg.className = 'sp-msg-ok'; msg.textContent = 'Saved!'; msg.style.display = 'inline'; setTimeout(function () { msg.style.display = 'none'; }, 2500); }
      } catch (e) {
        if (msg) { msg.className = 'sp-msg-err'; msg.textContent = e.message || 'Save failed.'; msg.style.display = 'inline'; }
      } finally {
        if (btn) { btn.textContent = 'Save notes'; btn.disabled = false; }
      }
    });

    // Status toggle
    var toggleBtn = qs('#sp-toggle-status', body);
    if (toggleBtn) {
      toggleBtn.addEventListener('click', async function () {
        var newStatus = p.status === 'suspended' ? 'active' : 'suspended';
        if (!window.confirm(newStatus === 'suspended' ? 'Suspend this account?' : 'Reactivate this account?')) return;
        toggleBtn.disabled = true;
        try {
          var res = await fetch('/api/update-profile', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
            body: JSON.stringify({ userId: p.id, status: newStatus }),
          });
          var data = await res.json();
          if (data.error) throw new Error(data.error);
          p.status = newStatus;
          var idx = allStaff.findIndex(function (s) { return s.id === p.id; });
          if (idx !== -1) { allStaff[idx].status = newStatus; applyFilter(); }
          renderEmployment(p, body);
        } catch (e) {
          alert('Error: ' + (e.message || 'Please try again.'));
          toggleBtn.disabled = false;
        }
      });
    }
  }

  function wireEmpAgreementUpload(p, body) {
    var input  = qs('#emp-agree-upload', body);
    var status = qs('#emp-agree-status', body);
    if (!input) return;
    input.addEventListener('change', async function () {
      if (!input.files || !input.files[0]) return;
      var file = input.files[0];
      var ext  = file.name.split('.').pop().toLowerCase();
      if (['pdf','jpg','jpeg','png'].indexOf(ext) === -1) { if (status) status.textContent = 'PDF/JPG/PNG only.'; return; }
      if (file.size > MAX_FILE_BYTES) { if (status) status.textContent = 'Max 5 MB.'; return; }
      if (status) status.textContent = 'Uploading…';
      try {
        await fetch('/api/ensure-storage', { method: 'POST', headers: { 'Authorization': 'Bearer ' + token } });
        var sb   = window.MQ && MQ.supabase;
        var path = p.id + '/employment-agreement.' + ext;
        var up   = await sb.storage.from('staff-documents').upload(path, file, { upsert: true });
        if (up.error) throw new Error(up.error.message);
        var signed = await sb.storage.from('staff-documents').createSignedUrl(path, 60 * 60 * 24 * 365);
        var url    = signed.data ? signed.data.signedUrl : path;
        var now    = new Date().toISOString();
        var res    = await fetch('/api/update-profile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
          body: JSON.stringify({ userId: p.id, employment_agreement_url: url, employment_agreement_received_at: now }),
        });
        var data = await res.json();
        if (data.error) throw new Error(data.error);
        p.employment_agreement_url = url;
        p.employment_agreement_received_at = now;
        if (status) status.textContent = 'Uploaded!';
        setTimeout(function () { renderEmployment(p, body); }, 600);
      } catch (e) {
        if (status) status.textContent = 'Failed: ' + (e.message || 'Please try again.');
      }
    });
  }

  /* ── Emergency tab ───────────────────────────────────────── */

  function renderEmergency(p, body) {
    body.innerHTML = [
      '<div class="sp-field"><label class="sp-label">Contact name</label>',
        '<input class="sp-input" id="ec-name" type="text" value="' + esc(p.emergency_contact_name || '') + '" maxlength="100"></div>',
      '<div class="sp-row-2">',
        '<div class="sp-field"><label class="sp-label">Phone</label>',
          '<input class="sp-input" id="ec-phone" type="tel" value="' + esc(p.emergency_contact_number || '') + '" maxlength="20"></div>',
        '<div class="sp-field"><label class="sp-label">Relationship</label>',
          '<input class="sp-input" id="ec-rel" type="text" value="' + esc(p.emergency_relation || '') + '" maxlength="50"></div>',
      '</div>',
      '<div class="sp-save-row">',
        '<button class="btn-micro btn-micro--primary" id="ec-save">Save</button>',
        '<span id="ec-msg" style="display:none;font-size:12px;font-weight:600;"></span>',
      '</div>',
    ].join('');

    qs('#ec-save', body).addEventListener('click', async function () {
      var btn = qs('#ec-save', body);
      var msg = qs('#ec-msg', body);
      if (btn) { btn.textContent = 'Saving…'; btn.disabled = true; }
      if (msg) msg.style.display = 'none';
      try {
        var res = await fetch('/api/update-profile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
          body: JSON.stringify({
            userId: p.id,
            emergency_contact_name:   sanitize((qs('#ec-name', body) || {}).value, 100),
            emergency_contact_number: sanitizePhone((qs('#ec-phone', body) || {}).value),
            emergency_relation:       sanitize((qs('#ec-rel', body) || {}).value, 50),
          }),
        });
        var data = await res.json();
        if (data.error) throw new Error(data.error);
        if (msg) { msg.className = 'sp-msg-ok'; msg.textContent = 'Saved!'; msg.style.display = 'inline'; setTimeout(function () { msg.style.display = 'none'; }, 2500); }
      } catch (e) {
        if (msg) { msg.className = 'sp-msg-err'; msg.textContent = e.message || 'Save failed.'; msg.style.display = 'inline'; }
      } finally {
        if (btn) { btn.textContent = 'Save'; btn.disabled = false; }
      }
    });
  }

  /* ── Detail panel photo upload ───────────────────────────── */

  function wireDetailPhotoUpload(p) {
    var input = qs('#sp-photo-upload');
    if (!input) return;
    input.addEventListener('change', async function () {
      if (!input.files || !input.files[0]) return;
      var file = input.files[0];
      var ext  = file.name.split('.').pop().toLowerCase();
      if (['jpg','jpeg','png'].indexOf(ext) === -1) return;
      if (file.size > MAX_FILE_BYTES) { alert('Max 5 MB.'); return; }
      try {
        await fetch('/api/ensure-storage', { method: 'POST', headers: { 'Authorization': 'Bearer ' + token } });
        var sb   = window.MQ && MQ.supabase;
        var path = p.id + '/profile-photo.' + ext;
        var up   = await sb.storage.from('staff-documents').upload(path, file, { upsert: true });
        if (up.error) throw new Error(up.error.message);
        var signed = await sb.storage.from('staff-documents').createSignedUrl(path, 60 * 60 * 24 * 365);
        var url    = signed.data ? signed.data.signedUrl : path;
        var res    = await fetch('/api/update-profile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
          body: JSON.stringify({ userId: p.id, profile_photo_url: url }),
        });
        var data = await res.json();
        if (data.error) throw new Error(data.error);
        p.profile_photo_url = url;
        var idx = allStaff.findIndex(function (s) { return s.id === p.id; });
        if (idx !== -1) { allStaff[idx].profile_photo_url = url; applyFilter(); }
        // Refresh panel header avatar
        var headerAvatar = qs('#staff-detail-inner div[style*="overflow:hidden"]');
        if (headerAvatar) headerAvatar.innerHTML = '<img src="' + esc(url) + '" alt="" style="width:100%;height:100%;object-fit:cover;">';
      } catch (e) {
        alert('Upload failed: ' + (e.message || 'Please try again.'));
      }
    });
  }

  /* ── Add Staff modal ─────────────────────────────────────── */

  function openAddModal() {
    var modal = qs('#modal-add-staff');
    if (!modal) return;
    qs('#add-name').value   = '';
    qs('#add-email').value  = '';
    qs('#add-role').value   = 'staff';
    qs('#add-start').value  = '';
    qs('#add-staff-error').style.display = 'none';
    qs('#add-staff-submit').textContent  = 'Send Invitation';
    qs('#add-staff-submit').disabled     = false;
    modal.hidden = false;
  }

  function closeAddModal() {
    var modal = qs('#modal-add-staff');
    if (modal) modal.hidden = true;
  }

  function showAddError(msg) {
    var el = qs('#add-staff-error');
    if (el) { el.textContent = msg; el.style.display = 'block'; }
  }

  async function submitAddStaff() {
    var btn   = qs('#add-staff-submit');
    var name  = sanitize((qs('#add-name') || {}).value, 100);
    var email = sanitize((qs('#add-email') || {}).value, 200).toLowerCase();
    var role  = (qs('#add-role') || {}).value || 'staff';
    var start = ((qs('#add-start') || {}).value || '').trim() || null;

    if (!name)  { showAddError('Please enter a name.'); return; }
    if (!email) { showAddError('Please enter an email address.'); return; }

    if (btn) { btn.textContent = 'Sending…'; btn.disabled = true; }
    qs('#add-staff-error').style.display = 'none';

    try {
      var res  = await fetch('/api/create-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
        body: JSON.stringify({ name: name, email: email, role: role, cleaning_level: 1 }),
      });
      var data = await res.json();
      if (data.error) throw new Error(data.error);

      if (start && data.id) {
        await fetch('/api/update-profile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
          body: JSON.stringify({ userId: data.id, start_date: start }),
        });
      }

      closeAddModal();
      await loadStaff();
    } catch (e) {
      showAddError(e.message || 'Failed to send invitation.');
      if (btn) { btn.textContent = 'Send Invitation'; btn.disabled = false; }
    }
  }

  /* ── load staff ──────────────────────────────────────────── */

  async function loadStaff() {
    var sb = window.MQ && MQ.supabase;
    if (!sb) return;
    var res = await sb.from('profiles')
      .select('id,name,email,role,status,colour,profile_photo_url,police_check_url,cleaning_level')
      .neq('role', 'owner')
      .order('name', { ascending: true });
    if (res.error) { console.error(res.error); return; }
    allStaff = res.data || [];
    applyFilter();
    if (openId) openDetailPanel(openId);
  }

  /* ── init ────────────────────────────────────────────────── */

  async function doInit() {
    if (!MQ.hasRole('owner')) { window.location.href = 'index.html'; return; }

    var sb = window.MQ && MQ.supabase;
    if (!sb) return;
    var sess = await sb.auth.getSession();
    if (sess.data && sess.data.session) token = sess.data.session.access_token;

    await loadStaff();

    var searchEl = qs('#staff-search');
    if (searchEl) searchEl.addEventListener('input', applyFilter);

    qs('#btn-add-staff').addEventListener('click', openAddModal);
    qs('#modal-add-close').addEventListener('click', closeAddModal);
    qs('#add-staff-submit').addEventListener('click', submitAddStaff);

    var modal = qs('#modal-add-staff');
    if (modal) modal.addEventListener('click', function (e) { if (e.target === modal) closeAddModal(); });
  }

  MQ.onReady(doInit);

})();
