/* ============================================================
   MYQUEST — settings.js
   ============================================================ */
(function () {
  'use strict';

  /* ── Crypto (mirrors login.js) ──────────────────────────── */

  async function hashPassword(password, salt) {
    var enc = new TextEncoder();
    var buf = await crypto.subtle.digest('SHA-256', enc.encode(salt + ':' + password));
    return Array.from(new Uint8Array(buf)).map(function (b) {
      return b.toString(16).padStart(2, '0');
    }).join('');
  }

  function randomHex(bytes) {
    return Array.from(crypto.getRandomValues(new Uint8Array(bytes))).map(function (b) {
      return b.toString(16).padStart(2, '0');
    }).join('');
  }

  function generateTempPassword() {
    var chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    var bytes = crypto.getRandomValues(new Uint8Array(8));
    var pw = Array.from(bytes).map(function (b) { return chars[b % chars.length]; }).join('');
    return pw.slice(0, 4) + '-' + pw.slice(4); // XXXX-XXXX
  }

  /* ── Helpers ────────────────────────────────────────────── */

  function escHtml(str) {
    return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function timeAgo(iso) {
    if (!iso) return 'Never';
    var diff = Date.now() - new Date(iso).getTime();
    var m = Math.floor(diff / 60000);
    if (m < 1)   return 'Just now';
    if (m < 60)  return m + 'm ago';
    var h = Math.floor(m / 60);
    if (h < 24)  return h + 'h ago';
    var d = Math.floor(h / 24);
    if (d < 30)  return d + 'd ago';
    return new Date(iso).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' });
  }

  var currentTempPw = '';

  var LEVEL_NAMES = {
    1:'Trainee', 2:'Cleaner', 3:'Mid Cleaner', 4:'Senior Cleaner',
    5:'Team Leader', 6:'Supervisor', 7:'Senior Supervisor',
    8:'Operations Lead', 9:'Area Manager', 10:'Regional Manager', 11:'Director'
  };

  /* ══════════════════════════════════════════════════════════
     ACCOUNTS TABLE
  ══════════════════════════════════════════════════════════ */

  function renderAccounts() {
    var tbody    = document.getElementById('accounts-tbody');
    var accounts = MQ.store.accounts.getAll();
    var currentEmail = MQ.session ? MQ.session.email : '';

    if (!accounts.length) {
      tbody.innerHTML = '<tr><td colspan="6"><div class="empty-state"><p class="empty-state__title">No accounts yet</p></div></td></tr>';
      return;
    }

    var ROLE_BADGE = { owner: 'badge--amber', manager: 'badge--blue', staff: 'badge--grey' };

    tbody.innerHTML = accounts.map(function (acc) {
      var isMe     = acc.email.toLowerCase() === currentEmail.toLowerCase();
      var roleBadge = ROLE_BADGE[acc.role] || 'badge--grey';
      var statusBadge = acc.status === 'active'
        ? '<span class="badge badge--green">Active</span>'
        : '<span class="badge badge--grey">Suspended</span>';
      var mustChangeBadge = acc.mustChangePassword
        ? ' <span class="badge badge--amber" title="Must change password on next login">Temp PW</span>'
        : '';
      var lockedBadge = acc.lockedUntil && Date.now() < acc.lockedUntil
        ? ' <span class="badge" style="background:#fee2e2;color:#dc2626;">Locked</span>'
        : '';

      var actions = '';

      // Reset password (anyone, including self)
      actions += '<button class="btn-icon" title="Reset password" onclick="SettingsPage.resetPassword(\'' + acc.id + '\')">' +
        '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>' +
        '</button>';

      if (!isMe) {
        // Suspend / Activate toggle
        if (acc.status === 'active') {
          actions += ' <button class="btn-icon" title="Suspend account" onclick="SettingsPage.suspendAccount(\'' + acc.id + '\')">' +
            '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>' +
            '</button>';
        } else {
          actions += ' <button class="btn-icon" title="Activate account" onclick="SettingsPage.activateAccount(\'' + acc.id + '\')">' +
            '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>' +
            '</button>';
        }
        // Unlock if locked
        if (acc.lockedUntil && Date.now() < acc.lockedUntil) {
          actions += ' <button class="btn-icon" title="Unlock account" onclick="SettingsPage.unlockAccount(\'' + acc.id + '\')">' +
            '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></svg>' +
            '</button>';
        }
        // Delete
        actions += ' <button class="btn-icon btn-icon--danger" title="Delete account" onclick="SettingsPage.deleteAccount(\'' + acc.id + '\')">' +
          '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/></svg>' +
          '</button>';
      }

      var levelName = acc.cleaningLevel ? (LEVEL_NAMES[parseInt(acc.cleaningLevel)] || acc.cleaningLevel) : null;
      var levelTag  = levelName
        ? ' <span style="font-size:11px;color:#64748b;font-weight:500;">· ' + escHtml(levelName) + '</span>'
        : '';

      return '<tr>' +
        '<td>' + escHtml(acc.name || '—') + levelTag + (isMe ? ' <span style="font-size:11px;color:#94a3b8;font-weight:500;">(you)</span>' : '') + '</td>' +
        '<td>' + escHtml(acc.email) + '</td>' +
        '<td><span class="badge ' + roleBadge + '">' + escHtml(acc.role) + '</span></td>' +
        '<td>' + statusBadge + mustChangeBadge + lockedBadge + '</td>' +
        '<td style="font-size:12.5px;color:#94a3b8;">' + timeAgo(acc.lastLoginAt) + '</td>' +
        '<td class="table-actions">' + actions + '</td>' +
        '</tr>';
    }).join('');
  }

  /* ══════════════════════════════════════════════════════════
     ACTIVITY LOG
  ══════════════════════════════════════════════════════════ */

  var LOG_CONFIG = {
    login_success:          { icon: '✓', color: '#16a34a', bg: '#f0fdf4', label: 'Signed in' },
    login_failed:           { icon: '✕', color: '#dc2626', bg: '#fef2f2', label: 'Failed login' },
    login_failed_no_account:{ icon: '✕', color: '#dc2626', bg: '#fef2f2', label: 'Unknown email attempt' },
    account_locked:         { icon: '⊘', color: '#dc2626', bg: '#fef2f2', label: 'Account locked' },
    password_changed:       { icon: '⟳', color: '#1d4ed8', bg: '#eff6ff', label: 'Password changed' },
    owner_setup:            { icon: '★', color: '#92400e', bg: '#fffbeb', label: 'Owner account created' },
    account_created:        { icon: '+', color: '#1d4ed8', bg: '#eff6ff', label: 'Account created' },
    account_suspended:      { icon: '⊘', color: '#64748b', bg: '#f8fafc', label: 'Account suspended' },
    account_activated:      { icon: '✓', color: '#16a34a', bg: '#f0fdf4', label: 'Account activated' },
    password_reset:         { icon: '⟳', color: '#92400e', bg: '#fffbeb', label: 'Password reset by owner' },
    account_unlocked:       { icon: '↑', color: '#16a34a', bg: '#f0fdf4', label: 'Account unlocked' },
  };

  function renderAuthLog() {
    var container = document.getElementById('auth-log-list');
    var logs = MQ.store.authLog.getAll().slice(0, 25);

    if (!logs.length) {
      container.innerHTML = '<p style="font-size:13px;color:#cbd5e1;font-style:italic;">No activity yet.</p>';
      return;
    }

    container.innerHTML = logs.map(function (log) {
      var cfg = LOG_CONFIG[log.event] || { icon: '·', color: '#94a3b8', bg: '#f8fafc', label: log.event };
      return '<div style="display:flex;align-items:center;gap:12px;padding:8px 10px;background:' + cfg.bg + ';border-radius:10px;">' +
        '<span style="width:24px;height:24px;border-radius:7px;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:800;color:' + cfg.color + ';background:white;flex-shrink:0;">' + cfg.icon + '</span>' +
        '<div style="flex:1;min-width:0;">' +
          '<span style="font-size:13px;font-weight:600;color:#1e293b;">' + escHtml(cfg.label) + '</span>' +
          '<span style="font-size:12px;color:#94a3b8;margin-left:8px;">' + escHtml(log.email || '') + '</span>' +
        '</div>' +
        '<span style="font-size:11.5px;color:#94a3b8;flex-shrink:0;" title="' + escHtml(log.at || '') + '">' + timeAgo(log.at) + '</span>' +
        '</div>';
    }).join('');
  }

  /* ══════════════════════════════════════════════════════════
     ACCOUNT ACTIONS
  ══════════════════════════════════════════════════════════ */

  function suspendAccount(id) {
    var acc = MQ.store.accounts.getById(id);
    if (!acc) return;
    MQ.ui.confirmDelete('Suspend ' + (acc.name || acc.email) + '? They will not be able to log in until reactivated.', function () {
      acc.status = 'suspended';
      MQ.store.accounts.save(acc);
      MQ.store.authLog.append({ email: acc.email, event: 'account_suspended' });
      renderAccounts();
      renderAuthLog();
      MQ.ui.toast('Account suspended');
    });
  }

  function activateAccount(id) {
    var acc = MQ.store.accounts.getById(id);
    if (!acc) return;
    acc.status = 'active';
    MQ.store.accounts.save(acc);
    MQ.store.authLog.append({ email: acc.email, event: 'account_activated' });
    renderAccounts();
    renderAuthLog();
    MQ.ui.toast('Account activated');
  }

  function unlockAccount(id) {
    var acc = MQ.store.accounts.getById(id);
    if (!acc) return;
    acc.lockedUntil    = null;
    acc.failedAttempts = 0;
    MQ.store.accounts.save(acc);
    MQ.store.authLog.append({ email: acc.email, event: 'account_unlocked' });
    renderAccounts();
    renderAuthLog();
    MQ.ui.toast('Account unlocked');
  }

  function deleteAccount(id) {
    var acc = MQ.store.accounts.getById(id);
    if (!acc) return;
    var owners = MQ.store.accounts.getAll().filter(function (a) { return a.role === 'owner'; });
    if (acc.role === 'owner' && owners.length <= 1) {
      MQ.ui.toast('Cannot delete the only owner account', 'error');
      return;
    }
    MQ.ui.confirmDelete('Permanently delete ' + (acc.name || acc.email) + '\'s account? This will also remove them from staff, jobs and time logs.', function () {
      // Remove linked staff record and cascade to jobs + time logs
      var staffRecord = MQ.store.staff.getAll().find(function (s) {
        return s.email.toLowerCase() === acc.email.toLowerCase();
      });

      if (staffRecord) {
        // Remove from jobs: staffIds array and teamLeaderId
        MQ.store.jobs.getAll().forEach(function (job) {
          var changed = false;
          if (Array.isArray(job.staffIds) && job.staffIds.includes(staffRecord.id)) {
            job.staffIds = job.staffIds.filter(function (sid) { return sid !== staffRecord.id; });
            changed = true;
          }
          if (job.teamLeaderId === staffRecord.id) {
            job.teamLeaderId = null;
            changed = true;
          }
          if (changed) MQ.store.jobs.save(job);
        });

        // Delete time logs
        MQ.store.timeLogs.getAll().filter(function (l) {
          return l.staffId === staffRecord.id;
        }).forEach(function (l) { MQ.store.timeLogs.delete(l.id); });

        // Delete staff record
        MQ.store.staff.delete(staffRecord.id);
      }

      MQ.store.accounts.delete(id);
      renderAccounts();
      renderAuthLog();
      MQ.ui.toast('Account deleted', 'info');
    });
  }

  function resetPassword(id) {
    var acc = MQ.store.accounts.getById(id);
    if (!acc) return;
    MQ.ui.confirmDelete('Reset password for ' + (acc.name || acc.email) + '? A new temporary password will be generated.', async function () {
      var tempPw = generateTempPassword();
      var salt   = randomHex(16);
      acc.passwordHash       = await hashPassword(tempPw, salt);
      acc.salt               = salt;
      acc.mustChangePassword = true;
      acc.failedAttempts     = 0;
      acc.lockedUntil        = null;
      MQ.store.accounts.save(acc);
      MQ.store.authLog.append({ email: acc.email, event: 'password_reset' });
      renderAccounts();
      renderAuthLog();
      showTempPw('Password Reset — ' + (acc.name || acc.email), 'Give this to them in person. They must change it on next login.', tempPw);
    });
  }


  /* ══════════════════════════════════════════════════════════
     TEMP PASSWORD MODAL
  ══════════════════════════════════════════════════════════ */

  function showTempPw(title, subtitle, pw) {
    currentTempPw = pw;
    document.getElementById('temp-pw-title').textContent    = title;
    document.getElementById('temp-pw-subtitle').textContent = subtitle;
    document.getElementById('temp-pw-display').textContent  = pw;
    document.getElementById('temp-pw-copy').textContent     = '';
    document.getElementById('temp-pw-copy').innerHTML =
      '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> Copy Password';
    MQ.ui.modal.open('modal-temp-pw');
  }

  function copyTempPw() {
    if (!currentTempPw) return;
    navigator.clipboard.writeText(currentTempPw).then(function () {
      var btn = document.getElementById('temp-pw-copy');
      btn.innerHTML = '✓ Copied!';
      btn.style.color = '#16a34a';
      setTimeout(function () {
        btn.innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> Copy Password';
        btn.style.color = '';
      }, 2000);
    }).catch(function () {
      MQ.ui.toast('Could not copy — write it down manually', 'error');
    });
  }

  function onTempPwClose() {
    currentTempPw = '';
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
    current.res.baseBedroom  = parseFloat(document.getElementById('rate-res-bedroom').value)    || 35;
    current.res.baseBathroom = parseFloat(document.getElementById('rate-res-bathroom').value)   || 25;
    current.res.baseFlat     = parseFloat(document.getElementById('rate-res-flat').value)       || 40;
    current.res.hourlyRate   = parseFloat(document.getElementById('rate-res-hourly').value)     || 45;
    current.res.staffPerHours= parseFloat(document.getElementById('rate-res-staffhours').value) || 3;
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

  document.addEventListener('DOMContentLoaded', function () {
    if (!MQ.hasRole('owner')) {
      window.location.href = 'index.html';
      return;
    }

    renderAccounts();
    renderAuthLog();
    populateRates();

    document.getElementById('save-rates-btn').addEventListener('click', saveRates);

    document.getElementById('btn-clear').addEventListener('click', function () {
      MQ.ui.confirmDelete('This will permanently delete ALL data — clients, jobs, staff, accounts and settings. This cannot be undone. Are you absolutely sure?', function () {
        MQ.store.clearAll();
        MQ.ui.toast('All data cleared', 'info');
        setTimeout(function () { window.location.href = '../login.html'; }, 1200);
      });
    });
  });

  window.SettingsPage = {
    suspendAccount: suspendAccount,
    activateAccount: activateAccount,
    unlockAccount:  unlockAccount,
    deleteAccount:  deleteAccount,
    resetPassword:  resetPassword,
    copyTempPw:     copyTempPw,
    onTempPwClose:  onTempPwClose,
  };

})();
