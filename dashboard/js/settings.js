/* ============================================================
   MYQUEST — settings.js  (Supabase-backed account management)
   ============================================================ */
(function () {
  'use strict';
  var escHtml = window.escHtml || function (s) { return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); };

  /* ── Helpers ────────────────────────────────────────────── */



  function fmtDate(iso) {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: '2-digit' });
  }

  var ROLE_LABELS = {
    'junior-cleaner': 'Junior Cleaner',
    'mid-cleaner':    'Mid Level Cleaner',
    'senior-cleaner': 'Senior Cleaner',
    'manager':        'Manager',
    'owner':          'Owner',
    'staff':          'Junior Cleaner',
  };

  var STAFF_PALETTE = [
    '#1a1a1a','#FFD400','#D4AF00','#FFE566',
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
    try {
      var jwt = await getJwt();
      if (!jwt) return { error: 'Not authenticated.' };
      var res = await fetch(path, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + jwt },
        body:    JSON.stringify(body),
      });
      return await res.json();
    } catch (e) {
      return { error: 'Network error. Please try again.' };
    }
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

  async function resetPassword(userId, email, btn) {
    if (btn) { btn.textContent = 'Sending…'; btn.disabled = true; }
    try {
      var result = await callApi('/api/reset-password', { email: email });
      if (result.error) { MQ.ui.toast(result.error, 'error'); }
      else { MQ.ui.toast('Password reset email sent to ' + email); }
    } catch (e) {
      MQ.ui.toast('Request failed. Please try again.', 'error');
    }
    if (btn) { btn.textContent = 'Reset Password'; btn.disabled = false; }
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
     MESSAGE OF THE WEEK
  ══════════════════════════════════════════════════════════ */

  function initMessageOfWeek(isOwner) {
    if (!isOwner) return;
    var textEl = document.getElementById('motw-text');
    var saveBtn = document.getElementById('motw-save-btn');
    if (!textEl || !saveBtn) return;
    textEl.value = MQ.messageOfWeek || '';
    saveBtn.addEventListener('click', async function () {
      var text = textEl.value.trim();
      saveBtn.textContent = 'Saving…'; saveBtn.disabled = true;
      var result = await callApi('/api/save-settings', { key: 'message_of_week', value: { text: text } });
      saveBtn.textContent = 'Save'; saveBtn.disabled = false;
      if (result.error) { MQ.ui.toast(result.error, 'error'); return; }
      MQ.messageOfWeek = text;
      MQ.ui.toast(text ? 'Message of the week saved' : 'Message of the week cleared');
    });
  }

  /* ══════════════════════════════════════════════════════════
     TEAM SETTINGS
  ══════════════════════════════════════════════════════════ */

  function pickStaffColour() {
    var used = MQ.store.staff.getAll().map(function (s) { return s.colour; }).filter(Boolean);
    return STAFF_PALETTE.find(function (c) { return !used.includes(c); }) ||
           STAFF_PALETTE[used.length % STAFF_PALETTE.length];
  }

  function openUnifiedAddModal() {
    var formEl    = document.getElementById('add-team-form');
    var successEl = document.getElementById('at-success-panel');
    var errorEl   = document.getElementById('add-team-error');
    var submitBtn = document.getElementById('at-submit');
    if (formEl)    { formEl.reset(); formEl.style.display = ''; }
    if (successEl) successEl.hidden = true;
    if (errorEl)   errorEl.hidden = true;
    if (submitBtn) { submitBtn.textContent = 'Send Invite'; submitBtn.disabled = false; }
    MQ.ui.modal.open('modal-add-team-member');
  }

  // Wire Add Team Member button immediately — don't wait for mq:ready (Safari mobile timing)
  document.addEventListener('DOMContentLoaded', function () {
    var addBtn = document.getElementById('team-add-btn');
    if (addBtn) addBtn.addEventListener('click', openUnifiedAddModal);
  });

  function initTeamCard() {
    var avatarsEl = document.getElementById('team-staff-avatars');
    var form      = document.getElementById('team-staff-form');
    var swatchEl  = document.getElementById('team-colour-swatches');
    if (!avatarsEl) return;

    var selectedStaffId   = '';
    var selectedColour    = '';
    var selectedAvailability = '';

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
      var ROLE_BADGE = {
        owner: 'badge--amber', manager: 'badge--blue',
        'senior-cleaner': 'badge--green',
        'mid-cleaner': 'badge--grey', 'junior-cleaner': 'badge--grey', staff: 'badge--grey',
      };
      heroAvatar.textContent      = staffInitials(s.name);
      heroAvatar.style.background = s.colour || '#000';
      heroName.textContent        = s.name || s.email || '—';
      var joinedStr = s.startDate
        ? 'Joined ' + new Date(s.startDate + 'T00:00:00').toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
        : '';
      heroEmail.innerHTML = escHtml(s.email || '') +
        (joinedStr ? '<span style="margin-left:8px;font-size:11px;color:rgba(0,0,0,0.4);font-weight:500;">' + escHtml(joinedStr) + '</span>' : '');
      var roleCls   = ROLE_BADGE[s.role] || 'badge--grey';
      var roleLabel = ROLE_LABELS[s.role] || (s.role || 'Junior Cleaner');
      var statusCls = s.active !== false ? 'badge--green' : 'badge--grey';
      heroBadges.innerHTML =
        '<span class="badge ' + roleCls + '">' + escHtml(roleLabel) + '</span>' +
        '<span class="badge ' + statusCls + '">' + (s.active !== false ? 'Active' : 'Inactive') + '</span>';
    }

    function addMember(accountId) {
      var acc = MQ.store.accounts.getById(accountId);
      if (!acc) return;
      var colour = pickStaffColour();
      MQ.store.staff.save({
        id: acc.id, name: acc.name || '', email: acc.email || '', phone: '',
        role: acc.role || 'junior-cleaner',
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
        var name      = document.getElementById('at-name').value.trim();
        var email     = document.getElementById('at-email').value.trim().toLowerCase();
        var role      = document.getElementById('at-role').value;
        var startDate = document.getElementById('at-start').value || null;
        if (!name || !email) {
          if (errorEl) { errorEl.textContent = 'Name and email are required.'; errorEl.hidden = false; }
          return;
        }
        submitBtn.textContent = 'Sending…'; submitBtn.disabled = true;
        var result;
        try {
          result = await callApi('/api/create-account', { name: name, email: email, role: role });
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
          MQ.store.accounts.save({
            id: result.id, name: name, email: email,
            role: role, status: 'invited',
          });
          MQ.store.staff.save({
            id: result.id, name: name, email: email, phone: '',
            role: role, startDate: startDate || '', active: true, colour: colour,
          });
          callApi('/api/update-profile', { userId: result.id, colour: colour, start_date: startDate }).catch(function () {});
          renderAvatarGrid();
        }
        if (formEl) formEl.style.display = 'none';
        var successEl = document.getElementById('at-success-panel');
        var emailEl   = document.getElementById('at-success-email');
        if (emailEl) emailEl.textContent = email;
        if (successEl) successEl.hidden = false;
      });
    }

    initAddTeamForm();

    function renderAvatarGrid() {
      var allStaff = MQ.store.staff.getAll()
        .sort(function (a, b) { return (a.name || '').localeCompare(b.name || ''); });
      // Anyone below manager only ever sees/selects their own profile here —
      // this turns the Team card into a self-service "My Profile" view for them.
      if (!MQ.hasRole('manager') && MQ.session && MQ.session.id) {
        allStaff = allStaff.filter(function (s) { return s.id === MQ.session.id; });
      }
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

    // Role pill group wiring
    var rolePills = document.querySelectorAll('.role-pill');
    function setRolePill(value) {
      // Legacy 'staff' maps to 'junior-cleaner'
      var effectiveVal = (value === 'staff') ? 'junior-cleaner' : (value || 'junior-cleaner');
      document.getElementById('team-role').value = effectiveVal;
      rolePills.forEach(function (p) {
        p.classList.toggle('is-active', p.dataset.value === effectiveVal);
      });
    }
    rolePills.forEach(function (pill) {
      pill.addEventListener('click', function () {
        setRolePill(pill.dataset.value);
      });
    });

    // Availability pills
    var availPills = document.querySelectorAll('.ts-avail-pill');
    function setAvailPill(value) {
      selectedAvailability = value || '';
      document.getElementById('team-avail').value = selectedAvailability;
      availPills.forEach(function (p) {
        var active = p.dataset.value === selectedAvailability;
        p.classList.toggle('is-active', active);
        p.textContent = active ? '✓ ' + (p.dataset.label || p.dataset.value) : (p.dataset.label || p.dataset.value);
      });
    }
    availPills.forEach(function (pill) {
      pill.addEventListener('click', function () { setAvailPill(pill.dataset.value === selectedAvailability ? '' : pill.dataset.value); });
    });

    function selectStaff(id) {
      var s = MQ.store.staff.getById(id);
      if (!s) return;
      selectedStaffId = id;
      selectedColour  = s.colour || '';
      avatarsEl.querySelectorAll('.ts-avatar-item').forEach(function (btn) {
        btn.classList.toggle('ts-avatar-item--active', btn.dataset.id === id);
      });
      renderSwatches(selectedColour);
      document.getElementById('team-name').value  = s.name || '';
      document.getElementById('team-phone').value = s.mobile || s.phone || '';
      document.getElementById('team-start').textContent = s.startDate ? new Date(s.startDate + 'T00:00:00').toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
      var acc = MQ.store.accounts.getById(id);
      document.getElementById('team-email').value = (acc && acc.email) || s.email || '';
      setRolePill(s.role);
      if (toggleBtn) toggleBtn.textContent = s.active !== false ? 'Deactivate' : 'Activate';
      populateHero(s);
      renderStaffDocuments(id);
      form.style.display = '';
    }

    var DOC_FIELDS = [
      { label: 'Police Check',      field: 'police_check_url',    slug: 'police-check' },
      { label: 'Driver\'s Licence', field: 'drivers_licence_url', slug: 'drivers-licence' },
      { label: 'Right to Work',     field: 'right_to_work_url',   slug: 'right-to-work' },
    ];
    var DOC_ALLOWED_EXTS = ['pdf', 'jpg', 'jpeg', 'png'];
    var DOC_MAX_BYTES    = 5 * 1024 * 1024;

    async function ensureStorageBucket() {
      var jwt = await getJwt();
      if (!jwt) throw new Error('Not authenticated.');
      var res = await fetch('/api/ensure-storage', { method: 'POST', headers: { 'Authorization': 'Bearer ' + jwt } });
      if (!res.ok) throw new Error('Could not initialise storage. Please try again.');
    }

    async function uploadStaffDoc(file, slug, staffId) {
      var ext  = file.name.split('.').pop().toLowerCase();
      var path = staffId + '/' + slug + '.' + ext;
      var res  = await MQ.supabase.storage.from('staff-documents').upload(path, file, { upsert: true });
      if (res.error) throw new Error(res.error.message);
      var signed = await MQ.supabase.storage.from('staff-documents').createSignedUrl(path, 60 * 60 * 24 * 365);
      return signed.data ? signed.data.signedUrl : path;
    }

    function renderStaffDocuments(staffId) {
      var listEl = document.getElementById('team-docs-list');
      if (!listEl) return;
      listEl.innerHTML = '<p style="font-size:13px;color:#94a3b8;">Loading documents…</p>';
      var ecName  = document.getElementById('team-ec-name');
      var ecPhone = document.getElementById('team-ec-phone');
      var ecRel   = document.getElementById('team-ec-rel');
      if (ecName)  ecName.value  = '';
      if (ecPhone) ecPhone.value = '';
      if (ecRel)   ecRel.value   = '';
      MQ.supabase
        .from('profiles')
        .select('*')
        .eq('id', staffId)
        .limit(1)
        .then(function (r) {
          if (r.error) { listEl.innerHTML = '<p style="font-size:13px;color:#94a3b8;">Documents unavailable.</p>'; return; }
          var p = (r.data && r.data[0]) || null;
          if (!p) { listEl.innerHTML = '<p style="font-size:13px;color:#94a3b8;">Documents unavailable.</p>'; return; }
          if (ecName)  ecName.value  = p.emergency_contact_name   || '';
          if (ecPhone) ecPhone.value = p.emergency_contact_number  || '';
          if (ecRel)   ecRel.value   = p.emergency_relation        || '';
          setAvailPill((p.availability && p.availability.work_preference) || '');
          var startEl = document.getElementById('team-start');
          if (startEl && p.start_date) {
            startEl.textContent = new Date(p.start_date + 'T00:00:00')
              .toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });
          }
          var html = DOC_FIELDS.map(function (d) {
            var url = p[d.field];
            var inputId = 'doc-upload-' + d.slug;
            return '<div style="display:flex;align-items:center;justify-content:space-between;padding:9px 12px;background:#f8fafc;border-radius:8px;font-size:13px;gap:10px;">' +
              '<span style="font-weight:600;color:#374151;">' + escHtml(d.label) + '</span>' +
              '<span style="display:flex;align-items:center;gap:14px;flex-shrink:0;">' +
                (url
                  ? '<a href="' + url + '" target="_blank" rel="noopener" style="color:#000;font-weight:600;text-decoration:none;">View &rarr;</a>'
                  : '<span style="color:#94a3b8;">Not uploaded</span>') +
                '<label for="' + inputId + '" style="color:#000;font-weight:600;text-decoration:underline;cursor:pointer;">' + (url ? 'Replace' : 'Upload') + '</label>' +
                '<input type="file" id="' + inputId + '" data-field="' + d.field + '" data-slug="' + d.slug + '" accept=".pdf,.jpg,.jpeg,.png" style="display:none">' +
              '</span>' +
            '</div>' +
            '<p class="doc-upload-err" id="' + inputId + '-err" style="display:none;font-size:12px;color:#dc2626;margin:-4px 0 0;"></p>';
          }).join('');
          if (!p.onboarding_complete) {
            html += '<p style="font-size:12px;color:#f59e0b;margin-top:8px;">Onboarding not yet complete.</p>';
          }
          listEl.innerHTML = html;
          DOC_FIELDS.forEach(function (d) {
            var input = document.getElementById('doc-upload-' + d.slug);
            if (input) wireDocUpload(input, staffId);
          });
        });
    }

    function wireDocUpload(input, staffId) {
      input.addEventListener('change', async function () {
        var file = input.files && input.files[0];
        if (!file) return;
        var errEl = document.getElementById(input.id + '-err');
        if (errEl) { errEl.style.display = 'none'; errEl.textContent = ''; }
        var ext = file.name.split('.').pop().toLowerCase();
        if (DOC_ALLOWED_EXTS.indexOf(ext) === -1) {
          if (errEl) { errEl.textContent = 'Please upload a PDF, JPG or PNG file.'; errEl.style.display = 'block'; }
          return;
        }
        if (file.size > DOC_MAX_BYTES) {
          if (errEl) { errEl.textContent = 'File must be under 5 MB.'; errEl.style.display = 'block'; }
          return;
        }
        var field = input.dataset.field;
        var slug  = input.dataset.slug;
        try {
          await ensureStorageBucket();
          var url = await uploadStaffDoc(file, slug, staffId);
          var updates = { userId: staffId };
          updates[field] = url;
          var result = await callApi('/api/update-profile', updates);
          if (result.error) throw new Error(result.error);
          MQ.ui.toast('Document uploaded');
          renderStaffDocuments(staffId);
        } catch (e) {
          if (errEl) { errEl.textContent = e.message || 'Upload failed. Please try again.'; errEl.style.display = 'block'; }
        }
      });
    }

    var resetPwdBtn = document.getElementById('team-reset-pwd-btn');
    if (resetPwdBtn) {
      resetPwdBtn.addEventListener('click', function () {
        if (!selectedStaffId) return;
        var s     = MQ.store.staff.getById(selectedStaffId);
        var email = document.getElementById('team-email').value || (s && s.email) || '';
        if (!email) { MQ.ui.toast('No email on record', 'error'); return; }
        resetPassword(selectedStaffId, email, resetPwdBtn);
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

    // Anyone below manager only has themselves in the grid — open their own
    // form immediately rather than making them click their own avatar.
    if (!MQ.hasRole('manager') && MQ.session && MQ.session.id && MQ.store.staff.getById(MQ.session.id)) {
      selectStaff(MQ.session.id);
    }

    // Sync profiles from Supabase into the in-memory store so the Team card
    // reflects the latest database state (auth.js also does this on every page load)
    MQ.supabase.from('profiles').select('*').then(function (r) {
      if (!r.data || r.error) return;
      var changed = false;
      r.data.forEach(function (p) {
        MQ.store.accounts.save({
          id: p.id, name: p.name || '', email: p.email || '',
          role: p.role || 'junior-cleaner',
          status: p.status === 'suspended' ? 'suspended' : (p.status || 'active'),
        });
        var existing = MQ.store.staff.getById(p.id);
        MQ.store.staff.save(Object.assign({}, existing || {}, {
          id: p.id, name: p.name || '', email: p.email || '',
          mobile:    p.mobile     || (existing && existing.mobile)    || '',
          role:      p.role       || 'junior-cleaner',
          startDate: p.start_date || (existing && existing.startDate) || '',
          active:    p.status !== 'suspended',
          colour:    p.colour     || (existing && existing.colour)    || '',
        }));
        changed = true;
      });
      if (changed) renderAvatarGrid();
    }).catch(function () {});

    document.getElementById('team-save-btn').addEventListener('click', async function () {
      if (!selectedStaffId) return;
      var updates = {
        userId:       selectedStaffId,
        name:         document.getElementById('team-name').value.trim(),
        mobile:       document.getElementById('team-phone').value.trim(),
        colour:       selectedColour,
        role:         document.getElementById('team-role').value,
        availability: selectedAvailability ? { work_preference: selectedAvailability } : null,
      };
      MQ.ui.saving();
      var result = await callApi('/api/update-profile', updates);
      MQ.ui.saved();
      if (result.error) { MQ.ui.toast(result.error, 'error'); return; }
      MQ.ui.toast('Changes saved');
      var s = MQ.store.staff.getById(selectedStaffId);
      if (s) {
        s.name   = updates.name;
        s.mobile = updates.mobile;
        s.colour = selectedColour;
        s.role   = updates.role;
        MQ.store.staff.save(s);
      }
      renderAvatarGrid();
    });

    SettingsPage.addMember    = addMember;
    SettingsPage.selectStaff  = selectStaff;
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
        // Merge top-level keys from Supabase into in-memory rate defaults
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
    // Settings is reachable by every role now — owner-only sections are
    // hidden individually via data-min-role (applied by auth.js), and the
    // Team card itself shows only the current user's own profile for
    // anyone below manager (see initTeamCard's avatar-grid restriction).
    var isOwner = MQ.hasRole('owner');

    if (!MQ.hasRole('manager')) {
      var titleEl = document.getElementById('settings-page-title');
      var subEl   = document.getElementById('settings-page-sub');
      if (titleEl) titleEl.textContent = 'My Profile';
      if (subEl)   subEl.textContent   = 'Your personal details and availability';
      var teamTitleEl = document.getElementById('team-card-title');
      var teamSubEl   = document.getElementById('team-card-sub');
      if (teamTitleEl) teamTitleEl.textContent = 'My Profile';
      if (teamSubEl)   teamSubEl.textContent   = 'Update your details and let us know your availability';
    }

    if (isOwner) {
      populateRates();
      renderChecklistTemplate();
    }
    initTeamCard();
    initMessageOfWeek(isOwner);

    // Deep-link: settings.html#staff:[uuid] — scroll to Team section and open that staff member
    var staffHash = window.location.hash;
    if (staffHash && staffHash.startsWith('#staff:')) {
      var targetStaffId = staffHash.slice(7);
      history.replaceState(null, '', window.location.pathname);
      var teamSection = document.getElementById('team-staff-avatars');
      if (teamSection) setTimeout(function () { teamSection.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 100);
      if (MQ.store.staff.getById(targetStaffId)) {
        setTimeout(function () { SettingsPage.selectStaff(targetStaffId); }, 120);
      }
    }

    if (isOwner) {
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
    }
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
    if (!window.confirm('Clear staff from this page session? They will reload from the database on next page load.')) return;
    closeOptionsModal();
    MQ.store.staff.clear();
    MQ.ui.toast('Staff cleared from session', 'info');
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

      // Reset all in-memory stores (data re-syncs from Supabase on next page load)
      MQ.store.clearAll();

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
