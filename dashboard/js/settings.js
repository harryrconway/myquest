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
     DELETE CONFIRMATION MODAL
  ══════════════════════════════════════════════════════════ */

  function openDeleteConfirm(title, message, onConfirm) {
    var modal    = document.getElementById('modal-delete-confirm');
    var idleEl   = document.getElementById('mdc-idle');
    var loadEl   = document.getElementById('mdc-loading');
    var titleEl  = document.getElementById('mdc-title');
    var msgEl    = document.getElementById('mdc-message');
    var confirmBtn = document.getElementById('mdc-confirm');
    var cancelBtn  = document.getElementById('mdc-cancel');
    if (!modal) return;

    titleEl.textContent = title;
    msgEl.textContent   = message;
    idleEl.hidden   = false;
    loadEl.hidden   = true;
    MQ.ui.modal.open('modal-delete-confirm');

    function cleanup() {
      confirmBtn.removeEventListener('click', onOk);
      cancelBtn.removeEventListener('click', onCancel);
    }
    async function onOk() {
      cleanup();
      idleEl.hidden = true;
      loadEl.hidden = false;
      try { await onConfirm(); } catch (e) { MQ.ui.toast('Delete failed: ' + e.message, 'error'); }
      MQ.ui.modal.close('modal-delete-confirm');
    }
    function onCancel() {
      cleanup();
      MQ.ui.modal.close('modal-delete-confirm');
    }
    confirmBtn.addEventListener('click', onOk);
    cancelBtn.addEventListener('click', onCancel);
  }

  /* ══════════════════════════════════════════════════════════
     ACCOUNT ACTIONS
  ══════════════════════════════════════════════════════════ */

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

  function pickStaffColour() {
    var used = MQ.store.staff.getAll().map(function (s) { return s.colour; }).filter(Boolean);
    return STAFF_PALETTE.find(function (c) { return !used.includes(c); }) ||
           STAFF_PALETTE[used.length % STAFF_PALETTE.length];
  }

  function initTeamCard() {
    var avatarsEl = document.getElementById('team-staff-avatars');
    var form      = document.getElementById('team-staff-form');
    var swatchEl  = document.getElementById('team-colour-swatches');
    if (!avatarsEl) return;

    var selectedStaffId = '';
    var selectedColour  = '';

    function staffInitials(name) {
      return (name || '').split(' ').map(function (w) { return w[0] || ''; }).join('').slice(0, 2).toUpperCase() || '?';
    }

    /* ── Hero section ───────────────────────────────────── */
    function populateHero(s) {
      var heroAvatar = document.getElementById('team-hero-avatar');
      var heroName   = document.getElementById('team-hero-name');
      var heroEmail  = document.getElementById('team-hero-email');
      var heroBadges = document.getElementById('team-hero-badges');
      if (!heroAvatar) return;
      var ROLE_BADGE = { owner: 'badge--amber', manager: 'badge--blue', staff: 'badge--grey' };
      heroAvatar.textContent      = staffInitials(s.name);
      heroAvatar.style.background = s.colour || '#334155';
      heroName.textContent        = s.name || s.email || '—';
      heroEmail.textContent       = s.email || '';
      var roleCls   = ROLE_BADGE[s.role] || 'badge--grey';
      var roleLabel = (s.role || 'staff').charAt(0).toUpperCase() + (s.role || 'staff').slice(1);
      var statusCls = s.active !== false ? 'badge--green' : 'badge--grey';
      heroBadges.innerHTML =
        '<span class="badge ' + roleCls + '">' + escHtml(roleLabel) + '</span>' +
        '<span class="badge ' + statusCls + '">' + (s.active !== false ? 'Active' : 'Inactive') + '</span>';
    }

    /* ── Add Member ──────────────────────────────────────── */
    function openUnifiedAddModal() {
      var formEl    = document.getElementById('add-team-form');
      var successEl = document.getElementById('at-success-panel');
      var errorEl   = document.getElementById('add-team-error');
      var submitBtn = document.getElementById('at-submit');
      if (formEl)    { formEl.reset(); formEl.style.display = ''; }
      if (successEl) successEl.hidden = true;
      if (errorEl)   errorEl.hidden = true;
      if (submitBtn) { submitBtn.textContent = 'Send Invite'; submitBtn.disabled = false; }

      var roleEl   = document.getElementById('at-role');
      var levelGrp = document.getElementById('at-level-group');
      if (roleEl && levelGrp) {
        roleEl.onchange = function () { levelGrp.style.display = roleEl.value === 'staff' ? '' : 'none'; };
        levelGrp.style.display = roleEl.value === 'staff' ? '' : 'none';
      }

      MQ.ui.modal.open('modal-add-team-member');
    }

    function addMember(accountId) {
      var acc = MQ.store.accounts.getById(accountId);
      if (!acc) return;
      var colour = pickStaffColour();
      MQ.store.staff.save({
        id: acc.id, name: acc.name || '', email: acc.email || '', phone: '',
        role: acc.role || 'staff', level: parseInt(acc.cleaningLevel) || 1,
        startDate: '', active: true, colour: colour,
      });
      callApi('/api/update-profile', { userId: acc.id, colour: colour }).catch(function () {});
      MQ.ui.modal.close('modal-add-team-member');
      renderAvatarGrid();
      MQ.ui.toast((acc.name || acc.email) + ' added to the team');
    }

    function initAddTeamForm() {
      var formEl    = document.getElementById('add-team-form');
      var errorEl   = document.getElementById('add-team-error');
      var submitBtn = document.getElementById('at-submit');
      var doneBtn   = document.getElementById('at-success-done');
      var anotherBtn= document.getElementById('at-success-another');
      if (doneBtn)    doneBtn.addEventListener('click', function () { MQ.ui.modal.close('modal-add-team-member'); });
      if (anotherBtn) anotherBtn.addEventListener('click', function () {
        var successEl = document.getElementById('at-success-panel');
        if (successEl) successEl.hidden = true;
        if (formEl) { formEl.reset(); formEl.style.display = ''; }
        if (errorEl) errorEl.hidden = true;
        if (submitBtn) { submitBtn.textContent = 'Send Invitation'; submitBtn.disabled = false; }
      });
      if (!formEl) return;
      formEl.addEventListener('submit', async function (e) {
        e.preventDefault();
        if (errorEl) errorEl.hidden = true;
        var name  = document.getElementById('at-name').value.trim();
        var email = document.getElementById('at-email').value.trim().toLowerCase();
        var role  = document.getElementById('at-role').value;
        var level = role === 'staff' ? (parseInt(document.getElementById('at-level').value) || 1) : null;
        if (!name || !email) {
          if (errorEl) { errorEl.textContent = 'Name and email are required.'; errorEl.hidden = false; }
          return;
        }
        submitBtn.textContent = 'Sending…'; submitBtn.disabled = true;
        var result;
        try {
          result = await callApi('/api/create-account', { name: name, email: email, role: role, cleaning_level: level });
        } catch (e) {
          submitBtn.textContent = 'Send Invite'; submitBtn.disabled = false;
          if (errorEl) { errorEl.textContent = 'Request failed. Please try again.'; errorEl.hidden = false; }
          return;
        }
        submitBtn.textContent = 'Send Invite'; submitBtn.disabled = false;
        if (result.error) {
          if (errorEl) { errorEl.textContent = result.error; errorEl.hidden = false; }
          return;
        }
        if (result.id) {
          var colour = pickStaffColour();
          MQ.store.staff.save({
            id: result.id, name: name, email: email, phone: '',
            role: role, level: level || 1, startDate: '', active: true, colour: colour,
          });
          callApi('/api/update-profile', { userId: result.id, colour: colour }).catch(function () {});
          renderAvatarGrid();
        }
        if (formEl) formEl.style.display = 'none';
        var successEl = document.getElementById('at-success-panel');
        var emailEl   = document.getElementById('at-success-email');
        if (emailEl) emailEl.textContent = email;
        if (successEl) successEl.hidden = false;
      });
    }

    var addBtn = document.getElementById('team-add-btn');
    if (addBtn) addBtn.addEventListener('click', openUnifiedAddModal);
    initAddTeamForm();

    function renderAvatarGrid() {
      var allStaff = MQ.store.staff.getAll()
        .sort(function (a, b) { return (a.name || '').localeCompare(b.name || ''); });
      avatarsEl.innerHTML = '';
      if (!allStaff.length) {
        avatarsEl.innerHTML = '<p style="font-size:13px;color:#94a3b8;">No staff members found.</p>';
        return;
      }
      allStaff.forEach(function (s) {
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'ts-avatar-item' +
          (s.id === selectedStaffId ? ' ts-avatar-item--active' : '') +
          (s.active === false ? ' ts-avatar-item--inactive' : '');
        btn.dataset.id = s.id;
        btn.innerHTML =
          '<span class="ts-avatar-item__circle" style="background:' + (s.colour || '#334155') + ';">' +
            staffInitials(s.name) +
          '</span>' +
          '<span class="ts-avatar-item__name">' + escHtml((s.name || s.email || '?').split(' ')[0]) + '</span>';
        btn.addEventListener('click', function () { selectStaff(s.id); });
        avatarsEl.appendChild(btn);
      });
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

    var toggleBtn = document.getElementById('team-toggle-btn');
    var deleteBtn = document.getElementById('team-delete-btn');

    function selectStaff(id) {
      var s = MQ.store.staff.getById(id);
      if (!s) return;
      selectedStaffId = id;
      selectedColour  = s.colour || '';
      avatarsEl.querySelectorAll('.ts-avatar-item').forEach(function (btn) {
        btn.classList.toggle('ts-avatar-item--active', btn.dataset.id === id);
      });
      renderSwatches(selectedColour);
      document.getElementById('team-name').value   = s.name      || '';
      document.getElementById('team-phone').value  = s.phone     || '';
      document.getElementById('team-role').value   = s.role      || 'staff';
      document.getElementById('team-level').value  = s.level     || 1;
      document.getElementById('team-status').value = s.active !== false ? 'active' : 'suspended';
      document.getElementById('team-start').value  = s.startDate || '';
      var acc = MQ.store.accounts.getById(id);
      document.getElementById('team-email').value  = (acc && acc.email) || s.email || '';
      if (toggleBtn) toggleBtn.textContent = s.active !== false ? 'Deactivate' : 'Activate';
      populateHero(s);
      renderStaffDocuments(id);
      form.style.display = '';
    }

    function renderStaffDocuments(staffId) {
      var listEl = document.getElementById('team-docs-list');
      if (!listEl) return;
      listEl.innerHTML = '<p style="font-size:13px;color:#94a3b8;">Loading documents…</p>';
      MQ.supabase
        .from('profiles')
        .select('police_check_url, drivers_licence_url, right_to_work_url, onboarding_complete')
        .eq('id', staffId)
        .single()
        .then(function (r) {
          if (r.error || !r.data) { listEl.innerHTML = '<p style="font-size:13px;color:#94a3b8;">Documents unavailable.</p>'; return; }
          var p = r.data;
          var docs = [
            { label: 'Police Check',        url: p.police_check_url },
            { label: 'Driver\'s Licence',   url: p.drivers_licence_url },
            { label: 'Right to Work',        url: p.right_to_work_url },
          ];
          var html = docs.map(function (d) {
            return '<div style="display:flex;align-items:center;justify-content:space-between;padding:9px 12px;background:#f8fafc;border-radius:8px;font-size:13px;">' +
              '<span style="font-weight:600;color:#374151;">' + d.label + '</span>' +
              (d.url
                ? '<a href="' + d.url + '" target="_blank" rel="noopener" style="color:#16a34a;font-weight:600;text-decoration:none;">View &rarr;</a>'
                : '<span style="color:#94a3b8;">Not uploaded</span>') +
            '</div>';
          }).join('');
          if (!p.onboarding_complete) {
            html += '<p style="font-size:12px;color:#f59e0b;margin-top:8px;">Onboarding not yet complete.</p>';
          }
          listEl.innerHTML = html;
        });
    }

    var resetPwdBtn = document.getElementById('team-reset-pwd-btn');
    if (resetPwdBtn) {
      resetPwdBtn.addEventListener('click', function () {
        if (!selectedStaffId) return;
        var s     = MQ.store.staff.getById(selectedStaffId);
        var email = document.getElementById('team-email').value || (s && s.email) || '';
        if (!email) { MQ.ui.toast('No email on record', 'error'); return; }
        resetPassword(selectedStaffId, email);
      });
    }

    if (deleteBtn) {
      deleteBtn.addEventListener('click', function () {
        if (!selectedStaffId) return;
        var id   = selectedStaffId;
        var s    = MQ.store.staff.getById(id);
        var name = (s && s.name) || 'this team member';
        openDeleteConfirm(
          'Delete ' + name + '\'s account?',
          'This will permanently remove their account and all access. This cannot be undone.',
          async function () {
            var result = await callApi('/api/delete-account', { userId: id });
            if (result.error) { MQ.ui.toast(result.error, 'error'); return; }
            MQ.store.accounts.delete(id);
            MQ.store.staff.delete(id);
            selectedStaffId = '';
            selectedColour  = '';
            form.style.display = 'none';
            renderAvatarGrid();
            MQ.ui.toast(name + '\'s account deleted', 'info');
          }
        );
      });
    }

    renderAvatarGrid();

    // Sync any Supabase accounts not yet in localStorage so the Team card
    // shows all members on every device, not just the device where they were added
    MQ.supabase.from('profiles').select('id, name, email, role, cleaning_level, colour, status').then(function (r) {
      if (!r.data) return;
      var changed = false;
      r.data.forEach(function (p) {
        MQ.store.accounts.save({
          id: p.id, name: p.name || '', email: p.email || '',
          role: p.role || 'staff', cleaningLevel: p.cleaning_level || 1,
          status: p.status === 'suspended' ? 'suspended' : 'active',
        });
        if (!MQ.store.staff.getById(p.id)) {
          MQ.store.staff.save({
            id: p.id, name: p.name || '', email: p.email || '', phone: '',
            role: p.role || 'staff', level: parseInt(p.cleaning_level) || 1,
            startDate: '', active: p.status !== 'suspended', colour: p.colour || pickStaffColour(),
          });
          changed = true;
        }
      });
      if (changed) renderAvatarGrid();
    }).catch(function () {});

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
      renderAvatarGrid();
    });

    SettingsPage.addMember = addMember;
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

    populateRates();
    renderChecklistTemplate();
    initTeamCard();

    // Load authoritative settings from Supabase and re-render forms
    loadSettingsFromSupabase().then(function () {
      populateRates();
      renderChecklistTemplate();
    }).catch(function () {});

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
