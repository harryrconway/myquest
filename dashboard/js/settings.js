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

  var LEVEL_NAMES = {
    1: 'Trainee', 2: 'Cleaner', 3: 'Mid Cleaner', 4: 'Senior Cleaner',
    5: 'Team Leader',
  };

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

      var levelName = p.cleaning_level ? (LEVEL_NAMES[parseInt(p.cleaning_level)] || 'Level ' + p.cleaning_level) : null;
      var levelTag  = levelName
        ? ' <span style="font-size:11px;color:#64748b;font-weight:500;">· ' + escHtml(levelName) + '</span>'
        : '';

      var actions = '';

      // Reset password (send email link)
      actions += '<button class="btn-icon" title="Send password reset email" onclick="SettingsPage.resetPassword(\'' + escHtml(p.id) + '\',\'' + escHtml(p.email) + '\')">' +
        '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>' +
        '</button>';

      if (!isMe) {
        if (p.status === 'active' || !p.status || p.status === 'invited') {
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

      return '<tr>' +
        '<td>' + escHtml(p.name || '—') + levelTag + (isMe ? ' <span style="font-size:11px;color:#94a3b8;font-weight:500;">(you)</span>' : '') + '</td>' +
        '<td>' + escHtml(p.email) + '</td>' +
        '<td><span class="badge ' + roleBadge + '">' + escHtml(p.role) + '</span></td>' +
        '<td>' + statusBadge + '</td>' +
        '<td style="font-size:12.5px;color:#94a3b8;">' + fmtDate(p.created_at) + '</td>' +
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
      var result = await callApi('/api/delete-account', { userId: userId });
      if (result.error) { MQ.ui.toast(result.error, 'error'); return; }
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
    MQ.ui.toast('Rates saved');
  }

  /* ══════════════════════════════════════════════════════════
     INIT
  ══════════════════════════════════════════════════════════ */

  document.addEventListener('mq:ready', function () {
    if (!MQ.hasRole('owner')) {
      window.location.href = 'index.html';
      return;
    }

    renderAccounts();
    populateRates();
    initCreateAccountForm();

    document.getElementById('btn-create-account').addEventListener('click', openCreateModal);
    document.getElementById('save-rates-btn').addEventListener('click', saveRates);

    document.getElementById('btn-clear').addEventListener('click', function () {
      MQ.ui.confirmDelete('This will permanently delete ALL local data — clients, jobs, staff and settings. This cannot be undone. Are you absolutely sure?', function () {
        MQ.store.clearAll();
        MQ.ui.toast('All data cleared', 'info');
        setTimeout(function () { window.location.href = '../login.html'; }, 1200);
      });
    });
  });

  window.SettingsPage = {
    suspendAccount:  suspendAccount,
    activateAccount: activateAccount,
    deleteAccount:   deleteAccount,
    resetPassword:   resetPassword,
  };

})();
