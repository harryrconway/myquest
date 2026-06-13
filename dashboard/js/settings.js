/* ============================================================
   MYQUEST — settings.js  (Supabase-backed account management)
   ============================================================ */
(function () {
  'use strict';

  /* ── Helpers ────────────────────────────────────────────── */

  function escHtml(str) {
    return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function fmtDate(iso) {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: '2-digit' });
  }

  var LEVEL_NAMES = { 1: 'Junior', 2: 'Mid Level', 3: 'Senior' };

  var STAFF_PALETTE = [
    '#1b4332','#2d6a4f','#40916c','#52b788',
    '#0f766e','#0d9488',
    '#1e3a5f','#1e40af','#0369a1','#0891b2',
    '#4f46e5','#7c3aed','#9333ea',
    '#be185d','#e11d48','#dc2626',
    '#92400e','#b45309','#d97706','#ea580c',
    '#78350f','#a16207',
    '#3f6212','#4d7c0f',
    '#1e293b','#334155','#475569','#64748b',
  ];

  async function getJwt() {
    var result = await MQ.supabase.auth.getSession();
    return result.data && result.data.session ? result.data.session.access_token : null;
  }

  async function callApi(path, body) {
    var jwt = await getJwt();
    if (!jwt) return { error: 'Not authenticated.' };
    var res = await fetch(path, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + jwt },
      body:    JSON.stringify(body),
    });
    return res.json();
  }

  /* ══════════════════════════════════════════════════════════
     ACCOUNTS TABLE
  ══════════════════════════════════════════════════════════ */

  function timeAgo(iso) {
    var d = new Date(iso), now = new Date();
    var days = Math.floor((now - d) / 86400000);
    if (days === 0) return 'Today';
    if (days === 1) return '1 day ago';
    if (days < 30)  return days + ' days ago';
    var months = Math.floor(days / 30.44);
    if (months < 12) return months + ' month' + (months !== 1 ? 's' : '') + ' ago';
    var years = Math.floor(months / 12);
    return years + ' year' + (years !== 1 ? 's' : '') + ' ago';
  }

  async function renderAccounts() {
    var tbody        = document.getElementById('accounts-tbody');
    var currentEmail = MQ.session ? MQ.session.email : '';

    var result = await MQ.supabase.from('profiles').select('*').order('created_at', { ascending: true });
    var profiles = result.data || [];

    if (!profiles.length) {
      tbody.innerHTML = '<tr><td colspan="6"><div class="empty-state"><p class="empty-state__title">No accounts yet</p></div></td></tr>';
      return;
    }

    var ROLE_BADGE = { owner: 'badge--amber', manager: 'badge--blue', staff: 'badge--grey' };

    tbody.innerHTML = profiles.map(function (p) {
      var isMe      = (p.email || '').toLowerCase() === currentEmail.toLowerCase();
      var roleBadge = ROLE_BADGE[p.role] || 'badge--grey';
      var statusBadge = (p.status === 'active' || !p.status)
        ? '<span class="badge badge--green">Active</span>'
        : p.status === 'invited'
          ? '<span class="badge badge--amber">Invited</span>'
          : '<span class="badge badge--grey">Suspended</span>';


      var actions = '';

      // Reset password (send email link)
      actions += '<button class="btn-icon" title="Send password reset email" onclick="SettingsPage.resetPassword(\'' + escHtml(p.id) + '\',\'' + escHtml(p.email) + '\')">' +
        '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>' +
        '</button>';

      if (!isMe) {
        if (p.status === 'invited') {
          actions += ' <button class="btn-icon" title="Mark as active" onclick="SettingsPage.activateAccount(\'' + escHtml(p.id) + '\',\'' + escHtml(p.name || p.email) + '\')">' +
            '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>' +
            '</button>';
          actions += ' <button class="btn-icon" title="Suspend account" onclick="SettingsPage.suspendAccount(\'' + escHtml(p.id) + '\',\'' + escHtml(p.name || p.email) + '\')">' +
            '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>' +
            '</button>';
        } else if (p.status === 'active' || !p.status) {
          actions += ' <button class="btn-icon" title="Suspend account" onclick="SettingsPage.suspendAccount(\'' + escHtml(p.id) + '\',\'' + escHtml(p.name || p.email) + '\')">' +
            '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>' +
            '</button>';
        } else {
          actions += ' <button class="btn-icon" title="Activate account" onclick="SettingsPage.activateAccount(\'' + escHtml(p.id) + '\',\'' + escHtml(p.name || p.email) + '\')">' +
            '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>' +
            '</button>';
        }
        actions += ' <button class="btn-icon btn-icon--danger" title="Delete account" onclick="SettingsPage.deleteAccount(\'' + escHtml(p.id) + '\',\'' + escHtml(p.name || p.email) + '\')">' +
          '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/></svg>' +
          '</button>';
      }

      var joinTooltip = p.created_at
        ? '<span class="mq-date-tip" tabindex="0">' + fmtDate(p.created_at) +
            '<span class="mq-date-tip__popup">' +
              '<span class="mq-date-tip__full">' + new Date(p.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' }) + '</span>' +
              '<span class="mq-date-tip__ago">' + timeAgo(p.created_at) + '</span>' +
            '</span>' +
          '</span>'
        : '—';

      return '<tr>' +
        '<td>' + escHtml(p.name || '—') + (isMe ? ' <span style="font-size:11px;color:#94a3b8;font-weight:500;">(you)</span>' : '') + '</td>' +
        '<td>' + escHtml(p.email) + '</td>' +
        '<td><span class="badge ' + roleBadge + '">' + escHtml((p.role||'staff').charAt(0).toUpperCase() + (p.role||'staff').slice(1)) + '</span></td>' +
        '<td>' + statusBadge + '</td>' +
        '<td style="font-size:12.5px;color:#94a3b8;">' + joinTooltip + '</td>' +
        '<td class="table-actions">' + actions + '</td>' +
        '</tr>';
    }).join('');
  }

  /* ══════════════════════════════════════════════════════════
     ACCOUNT ACTIONS
  ══════════════════════════════════════════════════════════ */

  function suspendAccount(userId, displayName) {
    MQ.ui.confirmDelete('Suspend ' + displayName + '? They will not be able to log in until reactivated.', async function () {
      var result = await callApi('/api/update-profile', { userId: userId, status: 'suspended' });
      if (result.error) { MQ.ui.toast(result.error, 'error'); return; }
      MQ.ui.toast('Account suspended');
      renderAccounts();
    });
  }

  function activateAccount(userId, displayName) {
    MQ.ui.confirmDelete('Activate ' + displayName + '\'s account?', async function () {
      var result = await callApi('/api/update-profile', { userId: userId, status: 'active' });
      if (result.error) { MQ.ui.toast(result.error, 'error'); return; }
      MQ.ui.toast('Account activated');
      renderAccounts();
    });
  }

  function resetPassword(userId, email) {
    MQ.ui.confirmDelete('Send a password reset email to ' + email + '?', async function () {
      var result = await callApi('/api/reset-password', { email: email });
      if (result.error) { MQ.ui.toast(result.error, 'error'); return; }
      MQ.ui.toast('Password reset email sent to ' + email);
    });
  }

  function deleteAccount(userId, displayName) {
    MQ.ui.confirmDelete('Permanently delete ' + displayName + '\'s login account? This cannot be undone.', async function () {
      var acc = MQ.store.accounts.getById(userId);
      var result = await callApi('/api/delete-account', { userId: userId });
      if (result.error) { MQ.ui.toast(result.error, 'error'); return; }
      MQ.store.accounts.delete(userId);
      if (acc && acc.email) {
        var staffRec = MQ.store.staff.getAll().find(function (s) {
          return (s.email || '').toLowerCase() === acc.email.toLowerCase();
        });
        if (staffRec) MQ.store.staff.delete(staffRec.id);
      }
      MQ.ui.toast('Account deleted', 'info');
      renderAccounts();
    });
  }

  /* ══════════════════════════════════════════════════════════
     CREATE ACCOUNT
  ══════════════════════════════════════════════════════════ */

  function openCreateModal() {
    var form   = document.getElementById('create-account-form');
    var panel  = document.getElementById('ca-success-panel');
    var header = document.querySelector('#modal-create-account .modal-header');
    var err    = document.getElementById('create-account-error');
    if (form)   { form.reset(); form.style.display = ''; }
    if (panel)  panel.hidden = true;
    if (header) header.style.display = '';
    if (err)    err.hidden = true;
    MQ.ui.modal.open('modal-create-account');
  }

  var ROLE_LEVEL_DEFAULTS = { staff: '1', manager: '4', owner: '5' };

  function initCreateAccountForm() {
    var form      = document.getElementById('create-account-form');
    var errorEl   = document.getElementById('create-account-error');
    var submitBtn = document.getElementById('ca-submit');
    var roleEl    = document.getElementById('ca-role');
    var levelEl   = document.getElementById('ca-level');

    if (!form) return;

    // Show cleaning level only for staff; hide for manager/owner
    if (roleEl && levelEl) {
      function updateLevelVisibility() {
        var isStaff = roleEl.value === 'staff';
        var grp = document.getElementById('ca-level-group');
        if (grp) grp.style.display = isStaff ? '' : 'none';
        levelEl.required = isStaff;
        if (!isStaff) levelEl.value = '';
        else if (!levelEl.value) levelEl.value = ROLE_LEVEL_DEFAULTS[roleEl.value] || '1';
      }
      roleEl.addEventListener('change', updateLevelVisibility);
      updateLevelVisibility(); // apply on first render
    }

    // Success panel buttons
    var doneBtn    = document.getElementById('ca-success-done');
    var anotherBtn = document.getElementById('ca-success-another');
    if (doneBtn) {
      doneBtn.addEventListener('click', function () { MQ.ui.modal.close('modal-create-account'); });
    }
    if (anotherBtn) {
      anotherBtn.addEventListener('click', function () {
        var panel  = document.getElementById('ca-success-panel');
        var header = document.querySelector('#modal-create-account .modal-header');
        if (panel)  panel.hidden = true;
        if (header) header.style.display = '';
        form.reset();
        form.style.display = '';
        if (errorEl) errorEl.hidden = true;
      });
    }

    form.addEventListener('submit', async function (e) {
      e.preventDefault();
      if (errorEl) errorEl.hidden = true;

      var name           = document.getElementById('ca-name').value.trim();
      var email          = document.getElementById('ca-email').value.trim().toLowerCase();
      var role           = document.getElementById('ca-role').value;
      var cleaning_level = role === 'staff' ? (parseInt(document.getElementById('ca-level').value) || 1) : null;

      if (!name || !email || !role) {
        if (errorEl) { errorEl.textContent = 'All fields are required.'; errorEl.hidden = false; }
        return;
      }

      submitBtn.textContent = 'Sending…';
      submitBtn.disabled    = true;

      var result = await callApi('/api/create-account', { name: name, email: email, role: role, cleaning_level: cleaning_level });

      submitBtn.textContent = 'Send Invitation';
      submitBtn.disabled    = false;

      if (result.error) {
        if (errorEl) { errorEl.textContent = result.error; errorEl.hidden = false; }
        return;
      }

      // Show success state inside modal
      var header    = document.querySelector('#modal-create-account .modal-header');
      var panel     = document.getElementById('ca-success-panel');
      var emailDisp = document.getElementById('ca-success-email');
      if (panel && emailDisp) {
        if (header) header.style.display = 'none';
        form.style.display = 'none';
        emailDisp.textContent = email;
        panel.hidden = false;
      } else {
        MQ.ui.modal.close('modal-create-account');
        MQ.ui.toast('Invitation sent to ' + email);
      }
      renderAccounts();
    });
  }

  /* ══════════════════════════════════════════════════════════
     RATES
  ══════════════════════════════════════════════════════════ */

  function populateRates() {
    var r = MQ.store.rates.get();
    document.getElementById('rate-res-bedroom').value    = r.res.baseBedroom;
    document.getElementById('rate-res-bathroom').value   = r.res.baseBathroom;
    document.getElementById('rate-res-flat').value       = r.res.baseFlat;
    document.getElementById('rate-res-hourly').value     = r.res.hourlyRate;
    document.getElementById('rate-res-staffhours').value = r.res.staffPerHours;
    document.getElementById('rate-extra-oven').value     = r.res.extras.oven;
    document.getElementById('rate-extra-windows').value  = r.res.extras.windows;
    document.getElementById('rate-extra-balcony').value  = r.res.extras.balcony;
    document.getElementById('rate-extra-garage').value   = r.res.extras.garage;
    document.getElementById('rate-extra-fridge').value   = r.res.extras.fridge;
    document.getElementById('rate-extra-walls').value    = r.res.extras.walls;
    document.getElementById('rate-com-sqm').value        = r.com.baseRatePerSqm;
    document.getElementById('rate-com-hourly').value     = r.com.hourlyRate;
  }

  function saveRates() {
    var current = MQ.store.rates.get();
    current.res.baseBedroom   = parseFloat(document.getElementById('rate-res-bedroom').value)    || 35;
    current.res.baseBathroom  = parseFloat(document.getElementById('rate-res-bathroom').value)   || 25;
    current.res.baseFlat      = parseFloat(document.getElementById('rate-res-flat').value)       || 40;
    current.res.hourlyRate    = parseFloat(document.getElementById('rate-res-hourly').value)     || 45;
    current.res.staffPerHours = parseFloat(document.getElementById('rate-res-staffhours').value) || 3;
    current.res.extras.oven     = parseFloat(document.getElementById('rate-extra-oven').value)    || 40;
    current.res.extras.windows  = parseFloat(document.getElementById('rate-extra-windows').value) || 30;
    current.res.extras.balcony  = parseFloat(document.getElementById('rate-extra-balcony').value) || 25;
    current.res.extras.garage   = parseFloat(document.getElementById('rate-extra-garage').value)  || 20;
    current.res.extras.fridge   = parseFloat(document.getElementById('rate-extra-fridge').value)  || 20;
    current.res.extras.walls    = parseFloat(document.getElementById('rate-extra-walls').value)   || 50;
    current.com.baseRatePerSqm  = parseFloat(document.getElementById('rate-com-sqm').value)    || 0.12;
    current.com.hourlyRate      = parseFloat(document.getElementById('rate-com-hourly').value)  || 50;
    MQ.store.rates.save(current);
    MQ.ui.saving();
    callApi('/api/save-settings', { key: 'rates', value: current }).catch(function () {});
    MQ.ui.saved();
    MQ.ui.toast('Rates saved');
  }

  /* ══════════════════════════════════════════════════════════
     CHECKLIST TEMPLATE
  ══════════════════════════════════════════════════════════ */

  var DEFAULT_CHECKLIST = [
    'Vacuum all floors', 'Mop hard floors', 'Clean kitchen benches', 'Wipe stovetop',
    'Clean sinks', 'Scrub toilets', 'Clean shower/bath', 'Dust surfaces',
    'Empty bins', 'Wipe mirrors', 'Wipe door handles',
  ];

  function getChecklistTemplate() {
    var r = MQ.store.rates.get();
    return Array.isArray(r.checklist) && r.checklist.length ? r.checklist : DEFAULT_CHECKLIST.slice();
  }

  function renderChecklistTemplate() {
    var items = getChecklistTemplate();
    var ul = document.getElementById('checklist-template-list');
    if (!ul) return;
    ul.innerHTML = items.map(function(text, i) {
      return '<li class="checklist-template-item">' +
        '<input type="text" class="form-input" value="' + escHtml(text) + '" data-idx="' + i + '" style="flex:1;min-width:0;">' +
        '<button type="button" class="checklist-template-item__remove" data-idx="' + i + '" aria-label="Remove">' +
          '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>' +
        '</button>' +
        '</li>';
    }).join('');
    ul.querySelectorAll('.checklist-template-item__remove').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var idx = parseInt(btn.getAttribute('data-idx'));
        var items2 = getChecklistTemplate();
        items2.splice(idx, 1);
        var r = MQ.store.rates.get();
        r.checklist = items2;
        MQ.store.rates.save(r);
        callApi('/api/save-settings', { key: 'checklist_template', value: items2 }).catch(function () {});
        renderChecklistTemplate();
      });
    });
  }

  function saveChecklistTemplate() {
    var inputs = document.querySelectorAll('#checklist-template-list input[type="text"]');
    var items = [];
    inputs.forEach(function(inp) {
      var v = inp.value.trim();
      if (v) items.push(v);
    });
    var r = MQ.store.rates.get();
    r.checklist = items;
    MQ.store.rates.save(r);
    MQ.ui.saving();
    callApi('/api/save-settings', { key: 'checklist_template', value: items }).catch(function () {});
    MQ.ui.saved();
    MQ.ui.toast('Checklist template saved');
  }

  function addChecklistItem() {
    var r = MQ.store.rates.get();
    var items = getChecklistTemplate();
    items.push('');
    r.checklist = items;
    MQ.store.rates.save(r);
    renderChecklistTemplate();
    var inputs = document.querySelectorAll('#checklist-template-list input[type="text"]');
    if (inputs.length) inputs[inputs.length - 1].focus();
  }

  /* ══════════════════════════════════════════════════════════
     TEAM SETTINGS
  ══════════════════════════════════════════════════════════ */

  function initTeamSettings() {
    var picker   = document.getElementById('team-staff-picker');
    var trigger  = document.getElementById('team-staff-trigger');
    var dot      = document.getElementById('team-staff-dot');
    var label    = document.getElementById('team-staff-label');
    var dropdown = document.getElementById('team-staff-dropdown');
    var searchEl = document.getElementById('team-staff-search');
    var listEl   = document.getElementById('team-staff-list');
    var form     = document.getElementById('team-staff-form');
    var swatchEl = document.getElementById('team-colour-swatches');
    if (!picker || !trigger) return;

    var selectedStaffId = '';
    var selectedColour  = '';
    var allStaff = MQ.store.staff.getAll()
      .sort(function (a, b) { return (a.name || '').localeCompare(b.name || ''); });

    function staffInitials(name) {
      return (name || '').split(' ').map(function (w) { return w[0] || ''; }).join('').slice(0, 2).toUpperCase() || '?';
    }

    function renderPickerList(q) {
      var items = q
        ? allStaff.filter(function (s) { return (s.name || '').toLowerCase().indexOf(q.toLowerCase()) > -1; })
        : allStaff;
      if (!items.length) {
        listEl.innerHTML = '<p style="font-size:13px;color:#94a3b8;text-align:center;padding:14px 0;">No staff found</p>';
        return;
      }
      listEl.innerHTML = items.map(function (s) {
        var active = s.id === selectedStaffId;
        var bg     = s.colour || '#334155';
        var init   = staffInitials(s.name);
        return '<button type="button" class="ts-picker__item' + (active ? ' ts-picker__item--active' : '') + '" data-id="' + s.id + '">' +
          '<span class="ts-picker__item-dot" style="background:' + bg + ';">' + init + '</span>' +
          '<span class="ts-picker__item-info">' +
            '<span class="ts-picker__item-name">' + (s.name || s.email || 'Unknown') + '</span>' +
            '<span class="ts-picker__item-role">' + (s.role || 'staff') + '</span>' +
          '</span>' +
          '<svg class="ts-picker__item-check" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg>' +
        '</button>';
      }).join('');
      listEl.querySelectorAll('.ts-picker__item').forEach(function (btn) {
        btn.addEventListener('click', function () { selectStaff(btn.dataset.id); });
      });
    }

    function openPicker() {
      dropdown.hidden = false;
      picker.classList.add('ts-picker--open');
      trigger.setAttribute('aria-expanded', 'true');
      renderPickerList('');
      searchEl.value = '';
      searchEl.focus();
    }

    function closePicker() {
      dropdown.hidden = true;
      picker.classList.remove('ts-picker--open');
      trigger.setAttribute('aria-expanded', 'false');
    }

    function renderSwatches(current) {
      swatchEl.innerHTML = '';
      STAFF_PALETTE.forEach(function (c) {
        var el = document.createElement('span');
        el.className = 'colour-swatch' + (c === current ? ' colour-swatch--active' : '');
        el.style.background = c;
        el.title = c;
        el.addEventListener('click', function () { selectedColour = c; renderSwatches(c); });
        swatchEl.appendChild(el);
      });
    }

    function selectStaff(id) {
      var s = MQ.store.staff.getById(id);
      if (!s) return;
      selectedStaffId = id;
      selectedColour  = s.colour || '';
      dot.style.display    = '';
      dot.style.background = s.colour || '#334155';
      label.textContent    = s.name || s.email || id;
      label.classList.remove('ts-picker__label--placeholder');
      closePicker();
      renderSwatches(selectedColour);
      document.getElementById('team-name').value   = s.name      || '';
      document.getElementById('team-phone').value  = s.phone     || '';
      document.getElementById('team-role').value   = s.role      || 'staff';
      document.getElementById('team-level').value  = s.level     || 1;
      document.getElementById('team-status').value = s.active !== false ? 'active' : 'suspended';
      document.getElementById('team-start').value  = s.startDate || '';
      form.style.display = '';
    }

    trigger.addEventListener('click', function () {
      if (dropdown.hidden) openPicker(); else closePicker();
    });
    searchEl.addEventListener('input', function () { renderPickerList(searchEl.value); });
    document.addEventListener('click', function (e) {
      if (!picker.contains(e.target)) closePicker();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closePicker();
    });

    label.classList.add('ts-picker__label--placeholder');

    document.getElementById('team-save-btn').addEventListener('click', async function () {
      if (!selectedStaffId) return;
      var updates = {
        userId:         selectedStaffId,
        name:           document.getElementById('team-name').value.trim(),
        phone:          document.getElementById('team-phone').value.trim(),
        colour:         selectedColour,
        role:           document.getElementById('team-role').value,
        cleaning_level: parseInt(document.getElementById('team-level').value) || 1,
        status:         document.getElementById('team-status').value,
      };
      MQ.ui.saving();
      var result = await callApi('/api/update-profile', updates);
      MQ.ui.saved();
      if (result.error) { MQ.ui.toast(result.error, 'error'); return; }
      MQ.ui.toast('Changes saved');
      var s = MQ.store.staff.getById(selectedStaffId);
      if (s) {
        s.name      = updates.name;
        s.phone     = updates.phone;
        s.colour    = selectedColour;
        s.role      = updates.role;
        s.level     = updates.cleaning_level;
        s.active    = updates.status === 'active';
        s.startDate = document.getElementById('team-start').value;
        MQ.store.staff.save(s);
      }
      dot.style.background = selectedColour || '#334155';
      if (updates.name) label.textContent = updates.name;
    });
  }

  /* ══════════════════════════════════════════════════════════
     INIT
  ══════════════════════════════════════════════════════════ */

  async function loadSettingsFromSupabase() {
    var result = await MQ.supabase.from('company_settings').select('key, value').in('key', ['rates', 'checklist_template']);
    if (!result.data) return;
    result.data.forEach(function (row) {
      if (row.key === 'rates' && row.value && typeof row.value === 'object') {
        var current = MQ.store.rates.get();
        // Merge top-level keys from Supabase into localStorage defaults
        Object.assign(current, row.value);
        MQ.store.rates.save(current);
      }
      if (row.key === 'checklist_template' && Array.isArray(row.value)) {
        var r = MQ.store.rates.get();
        r.checklist = row.value;
        MQ.store.rates.save(r);
      }
    });
  }

  document.addEventListener('mq:ready', function () {
    if (!MQ.hasRole('owner')) {
      window.location.href = 'index.html';
      return;
    }

    renderAccounts();
    populateRates();
    renderChecklistTemplate();
    initCreateAccountForm();
    initTeamSettings();

    // Load authoritative settings from Supabase and re-render forms
    loadSettingsFromSupabase().then(function () {
      populateRates();
      renderChecklistTemplate();
    }).catch(function () {});

    document.getElementById('btn-create-account').addEventListener('click', openCreateModal);
    document.getElementById('save-rates-btn').addEventListener('click', saveRates);
    document.getElementById('save-checklist-template-btn').addEventListener('click', saveChecklistTemplate);
    document.getElementById('btn-add-checklist-item').addEventListener('click', addChecklistItem);

    document.getElementById('btn-clear').addEventListener('click', function () {
      MQ.ui.modal.open('modal-data-options');
    });
  });

  /* ══════════════════════════════════════════════════════════
     DATA MANAGEMENT — CLEAR OPTIONS
  ══════════════════════════════════════════════════════════ */

  function closeOptionsModal() {
    MQ.ui.modal.close('modal-data-options');
  }

  async function callClearApi(target) {
    var jwt = await getJwt();
    if (!jwt) throw new Error('Not authenticated.');
    var res  = await fetch('/api/clear-jobs', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + jwt },
      body:    JSON.stringify({ target: target }),
    });
    var data = await res.json();
    if (!data.success) throw new Error(data.error || 'Delete failed.');
  }

  function clearUnscheduled() {
    if (!window.confirm('Permanently delete all unscheduled quote requests? This cannot be undone.')) return;
    closeOptionsModal();
    callClearApi('unscheduled')
      .then(function () { MQ.ui.toast('Unscheduled jobs cleared'); })
      .catch(function (err) { MQ.ui.toast('Error: ' + err.message, 'error'); });
  }

  function clearScheduled() {
    if (!window.confirm('Permanently delete all scheduled jobs? This cannot be undone.')) return;
    closeOptionsModal();
    callClearApi('scheduled')
      .then(function () { MQ.ui.toast('Scheduled jobs cleared'); })
      .catch(function (err) { MQ.ui.toast('Error: ' + err.message, 'error'); });
  }

  function clearCompleted() {
    if (!window.confirm('Permanently delete all completed jobs? This cannot be undone.')) return;
    closeOptionsModal();
    callClearApi('completed')
      .then(function () { MQ.ui.toast('Completed jobs cleared'); })
      .catch(function (err) { MQ.ui.toast('Error: ' + err.message, 'error'); });
  }

  function clearStaff() {
    if (!window.confirm('Delete all locally stored staff records? This cannot be undone.')) return;
    closeOptionsModal();
    MQ.store.staff.clear();
    MQ.ui.toast('Staff records deleted', 'info');
  }

  function resetRates() {
    if (!window.confirm('Reset all quote rates back to their defaults?')) return;
    closeOptionsModal();
    MQ.store.rates.save(MQ.store.rates.defaults);
    populateRates();
    MQ.ui.toast('Rates reset to defaults');
  }

  function openDeleteAll() {
    MQ.ui.modal.close('modal-data-options');
    var input = document.getElementById('delete-all-confirm-input');
    var errEl = document.getElementById('delete-all-error');
    if (input) input.value = '';
    if (errEl) errEl.style.display = 'none';
    MQ.ui.modal.open('modal-delete-all-confirm');
  }

  async function confirmDeleteAll() {
    var input = document.getElementById('delete-all-confirm-input');
    var errEl = document.getElementById('delete-all-error');
    if (!input || input.value.trim().toUpperCase() !== 'DELETE') {
      if (errEl) errEl.style.display = '';
      return;
    }

    var btn = document.getElementById('delete-all-confirm-btn');
    btn.textContent = 'Deleting…';
    btn.disabled = true;

    try {
      // Delete all Supabase job records via server-side API
      await callClearApi('all');

      // Clear all local data except auth session
      var SESSION_KEYS = ['mq_session', 'mq_permissions'];
      Object.keys(localStorage).forEach(function (k) {
        if (SESSION_KEYS.indexOf(k) === -1) localStorage.removeItem(k);
      });

      MQ.ui.modal.close('modal-delete-all-confirm');
      MQ.ui.toast('All data deleted', 'info');
      populateRates();
    } catch (err) {
      MQ.ui.toast('Error: ' + err.message, 'error');
    } finally {
      btn.textContent = 'Delete Everything';
      btn.disabled = false;
    }
  }

  window.SettingsPage = {
    suspendAccount:   suspendAccount,
    activateAccount:  activateAccount,
    deleteAccount:    deleteAccount,
    resetPassword:    resetPassword,
    clearUnscheduled: clearUnscheduled,
    clearScheduled:   clearScheduled,
    clearCompleted:   clearCompleted,
    clearStaff:       clearStaff,
    resetRates:       resetRates,
    openDeleteAll:    openDeleteAll,
    confirmDeleteAll: confirmDeleteAll,
  };

})();
