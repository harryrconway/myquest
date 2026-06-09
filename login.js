/* ============================================================
   MYQUEST — login.js
   Handles all login page states: login, change-password,
   first-run setup, and success.
   ============================================================ */
(function () {
  'use strict';

  /* ── Crypto helpers ─────────────────────────────────────── */

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

  function sleep(ms) {
    return new Promise(function (r) { setTimeout(r, ms); });
  }

  /* ── Account store helpers ──────────────────────────────── */

  function getAccounts() {
    try { return JSON.parse(localStorage.getItem('mq_accounts') || '[]'); }
    catch { return []; }
  }

  function saveAccounts(list) {
    localStorage.setItem('mq_accounts', JSON.stringify(list));
  }

  function getAccount(email) {
    return getAccounts().find(function (a) {
      return a.email.toLowerCase() === email.toLowerCase();
    }) || null;
  }

  function updateAccount(account) {
    var list = getAccounts();
    var idx  = list.findIndex(function (a) { return a.id === account.id; });
    if (idx > -1) list[idx] = account;
    saveAccounts(list);
  }

  function logEvent(email, event) {
    if (window.MQ && MQ.store && MQ.store.authLog) {
      MQ.store.authLog.append({ email: email, event: event });
    }
  }

  /* ── Session ────────────────────────────────────────────── */

  function createSession(account) {
    var session = {
      token:        randomHex(32),
      email:        account.email,
      name:         account.name,
      role:         account.role,
      loginTime:    new Date().toISOString(),
      expiresAt:    new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(),
      lastActivity: new Date().toISOString(),
    };
    sessionStorage.setItem('mq_session', JSON.stringify(session));
  }

  /* ── Password strength ──────────────────────────────────── */

  function passwordStrength(pw) {
    var score = 0;
    if (pw.length >= 10)                          score++;
    if (/[A-Z]/.test(pw) && /[a-z]/.test(pw))    score++;
    if (/[0-9]/.test(pw))                         score++;
    if (/[^A-Za-z0-9]/.test(pw))                  score++;
    return score; // 0–4
  }

  function updateStrengthUI(pw, barId, labelId) {
    var bar   = document.getElementById(barId);
    var label = document.getElementById(labelId);
    if (!bar || !label) return;
    var score  = passwordStrength(pw);
    var widths = ['20%', '40%', '65%', '85%', '100%'];
    var colors = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#16a34a'];
    var labels = ['Very weak', 'Weak', 'Fair', 'Good', 'Strong'];
    bar.style.width      = pw.length ? widths[score] : '0';
    bar.style.background = colors[score];
    label.textContent    = pw.length ? labels[score] : '';
    label.style.color    = colors[score];
  }

  function updateRequirements(pw) {
    function mark(id, ok) {
      var el = document.getElementById(id);
      if (!el) return;
      el.classList.toggle('req-met', ok);
    }
    mark('req-len',  pw.length >= 10);
    mark('req-case', /[A-Z]/.test(pw) && /[a-z]/.test(pw));
    mark('req-num',  /[0-9]/.test(pw));
    mark('req-sym',  /[^A-Za-z0-9]/.test(pw));
  }

  /* ── Show/hide states ───────────────────────────────────── */

  function showState(id) {
    ['state-login', 'state-change-pw', 'state-success', 'state-verify-email', 'state-verify-result'].forEach(function (s) {
      var el = document.getElementById(s);
      if (el) el.hidden = (s !== id);
    });
  }

  /* ── Web3Forms ─────────────────────────────────────────── */

  var W3F_KEY = '416f2740-50af-444b-a8ef-bd95471150cb';

  async function submitVerificationEmail(account) {
    if (window.location.protocol === 'file:') return;
    var baseUrl    = window.location.href.split('?')[0].replace(/\/login\.html$/, '');
    var verifyLink = baseUrl + '/login.html?action=verify&token=' + account.verificationToken + '&e=' + encodeURIComponent(account.email);
    var fd = new FormData();
    fd.append('access_key',        W3F_KEY);
    fd.append('subject',           'Verify your MyQuest account — ' + (account.name || account.email));
    fd.append('from_name',         'MyQuest');
    fd.append('email',             account.email);
    fd.append('name',              account.name || account.email);
    fd.append('verification_link', verifyLink);
    fd.append('message',
      'Hi ' + (account.name || account.email) + ',\n\n' +
      'Click the link below to verify your email address and complete your MyQuest account setup:\n\n' +
      verifyLink + '\n\n' +
      'This link expires in 24 hours.\n\n' +
      'If you did not expect this email, please ignore it.'
    );
    try { await fetch('https://api.web3forms.com/submit', { method: 'POST', body: fd }); } catch (e) {}
  }

  /* ── Show/hide password toggle ──────────────────────────── */

  function wireToggle(toggleId, inputId) {
    var btn   = document.getElementById(toggleId);
    var input = document.getElementById(inputId);
    if (!btn || !input) return;
    btn.addEventListener('click', function () {
      var show = input.type === 'password';
      input.type = show ? 'text' : 'password';
      btn.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
    });
  }

  /* ── Error helpers ──────────────────────────────────────── */

  function showError(elId, msg) {
    var el = document.getElementById(elId);
    if (!el) return;
    el.textContent = msg;
    el.hidden = false;
  }

  function clearError(elId) {
    var el = document.getElementById(elId);
    if (el) el.hidden = true;
  }

  /* ══════════════════════════════════════════════════════════
     INIT
  ══════════════════════════════════════════════════════════ */

  window.addEventListener('load', async function () {

    // Already authenticated?
    if (sessionStorage.getItem('mq_session')) {
      window.location.href = 'dashboard/index.html';
      return;
    }

    // Wire password toggles (always — change-pw may show after verification)
    wireToggle('pw-toggle-login',    'login-password');
    wireToggle('pw-toggle-new',      'new-password');
    wireToggle('pw-toggle-confirm',  'confirm-password');

    // Email verification link?
    var params = new URLSearchParams(window.location.search);
    if (params.get('action') === 'verify') {
      showState('state-verify-result');
      await handleVerificationLink(params.get('token'), params.get('e'));
      return;
    }

    showState('state-login');
    initLoginForm();
  });

  /* ══════════════════════════════════════════════════════════
     STATE 1 — Login
  ══════════════════════════════════════════════════════════ */

  var tempSession = null;

  function initLoginForm() {
    var form      = document.getElementById('login-form');
    var emailEl   = document.getElementById('login-email');
    var passwordEl = document.getElementById('login-password');
    var submitBtn  = document.getElementById('login-submit');

    form.addEventListener('submit', async function (e) {
      e.preventDefault();
      clearError('login-error');

      var email    = emailEl.value.trim().toLowerCase();
      var password = passwordEl.value;

      if (!email || !password) {
        showError('login-error', 'Please enter your email and password.');
        return;
      }

      var tsToken = document.querySelector('[name="cf-turnstile-response"]');
      if (!tsToken || !tsToken.value) {
        showError('login-error', 'Please complete the security check.');
        return;
      }

      submitBtn.textContent = 'Signing in…';
      submitBtn.disabled    = true;

      // Artificial delay — prevents timing-based email enumeration
      await sleep(400 + Math.random() * 200);

      var account = getAccount(email);

      // Lockout check
      if (account && account.lockedUntil && Date.now() < account.lockedUntil) {
        var mins = Math.ceil((account.lockedUntil - Date.now()) / 60000);
        showError('login-error', 'Account locked after too many failed attempts. Try again in ' + mins + ' minute' + (mins !== 1 ? 's' : '') + '.');
        reset();
        return;
      }

      // Account must exist and be active — same generic message either way (no info leak)
      if (!account || account.status !== 'active') {
        logEvent(email, 'login_failed_no_account');
        showError('login-error', 'Invalid email or password. Contact your administrator if you believe this is an error.');
        reset();
        return;
      }

      // Verify password
      var hash = await hashPassword(password, account.salt);

      if (hash !== account.passwordHash) {
        account.failedAttempts = (account.failedAttempts || 0) + 1;
        if (account.failedAttempts >= 5) {
          account.lockedUntil    = Date.now() + 30 * 60 * 1000;
          account.failedAttempts = 0;
          updateAccount(account);
          logEvent(email, 'account_locked');
          showError('login-error', 'Too many failed attempts — account locked for 30 minutes.');
        } else {
          var remaining = 5 - account.failedAttempts;
          updateAccount(account);
          logEvent(email, 'login_failed');
          showError('login-error', 'Invalid email or password. ' + remaining + ' attempt' + (remaining !== 1 ? 's' : '') + ' remaining before lockout.');
        }
        reset();
        return;
      }

      // ✓ Password correct — clear failed attempts
      account.failedAttempts = 0;
      account.lockedUntil    = null;
      account.lastLoginAt    = new Date().toISOString();
      updateAccount(account);
      logEvent(email, 'login_success');

      // Email not yet verified?
      if (account.emailVerified === false) {
        showState('state-verify-email');
        initVerifyEmailState(account);
        reset();
        return;
      }

      // Must change password?
      if (account.mustChangePassword) {
        tempSession = { id: account.id, email: account.email, name: account.name, role: account.role };
        showState('state-change-pw');
        initChangePwForm();
        return;
      }

      createSession(account);
      showState('state-success');
      setTimeout(function () { window.location.href = 'dashboard/index.html'; }, 700);

      function reset() {
        submitBtn.textContent = 'Sign In';
        submitBtn.disabled    = false;
        if (typeof turnstile !== 'undefined') turnstile.reset();
      }
    });
  }

  /* ══════════════════════════════════════════════════════════
     STATE 5 — Email Verification Pending
  ══════════════════════════════════════════════════════════ */

  function initVerifyEmailState(account) {
    var emailEl = document.getElementById('verify-email-address');
    if (emailEl) emailEl.textContent = account.email;

    var resendBtn    = document.getElementById('btn-resend-verify');
    var resendStatus = document.getElementById('verify-resend-status');
    if (resendBtn) {
      resendBtn.onclick = async function () {
        resendBtn.disabled    = true;
        resendBtn.textContent = 'Sending…';
        // Refresh token
        var acc = getAccount(account.email);
        if (acc) {
          acc.verificationToken   = randomHex(16);
          acc.verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
          updateAccount(acc);
          await submitVerificationEmail(acc);
        }
        if (resendStatus) resendStatus.style.display = 'block';
        resendBtn.textContent = 'Resend verification email';
        resendBtn.disabled    = false;
      };
    }

    var backBtn = document.getElementById('verify-back-link');
    if (backBtn) {
      backBtn.onclick = function () {
        showState('state-login');
      };
    }
  }

  /* ══════════════════════════════════════════════════════════
     STATE 6 — Verification Link Handler
  ══════════════════════════════════════════════════════════ */

  async function handleVerificationLink(token, rawEmail) {
    var headingEl = document.getElementById('verify-result-heading');
    var subEl     = document.getElementById('verify-result-sub');
    var iconEl    = document.getElementById('verify-result-icon');
    var linkEl    = document.getElementById('verify-result-link');

    function setResult(ok, heading, sub) {
      if (headingEl) headingEl.textContent = heading;
      if (subEl)     subEl.textContent     = sub;
      if (linkEl)    linkEl.hidden         = false;
      if (iconEl) {
        iconEl.innerHTML = ok
          ? '<svg viewBox="0 0 72 72" fill="none" width="56" height="56"><circle cx="36" cy="36" r="32" stroke="#2d6a4f" stroke-width="3"/><path d="M20 36L30 46L52 24" stroke="#2d6a4f" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/></svg>'
          : '<svg viewBox="0 0 72 72" fill="none" width="56" height="56"><circle cx="36" cy="36" r="32" stroke="#ef4444" stroke-width="3"/><path d="M24 24l24 24M48 24L24 48" stroke="#ef4444" stroke-width="3.5" stroke-linecap="round"/></svg>';
      }
    }

    if (!token || !rawEmail) {
      setResult(false, 'Invalid link', 'This verification link is incomplete. Ask your administrator to resend it.');
      return;
    }

    var email   = decodeURIComponent(rawEmail);
    var account = getAccount(email);

    if (!account) {
      setResult(false, 'Account not found', 'No account exists for this email address.');
      return;
    }

    if (account.emailVerified === true) {
      if (headingEl) headingEl.textContent = 'Already verified';
      if (subEl)     subEl.textContent     = 'Signing you in…';
      if (iconEl)    iconEl.innerHTML = '<svg viewBox="0 0 72 72" fill="none" width="56" height="56"><circle cx="36" cy="36" r="32" stroke="#2d6a4f" stroke-width="3"/><path d="M20 36L30 46L52 24" stroke="#2d6a4f" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
      createSession(account);
      setTimeout(function () { window.location.href = 'dashboard/index.html'; }, 900);
      return;
    }

    if (!account.verificationToken || account.verificationToken !== token) {
      setResult(false, 'Link already used', 'This verification link has already been used. Sign in normally, or request a new link.');
      return;
    }

    if (Date.now() > new Date(account.verificationExpires || 0).getTime()) {
      setResult(false, 'Link expired', 'This link has expired (valid for 24 hours). Sign in and use the Resend button to get a new one.');
      return;
    }

    // ✓ Valid — mark verified, clear token
    account.emailVerified       = true;
    account.verificationToken   = null;
    account.verificationExpires = null;
    updateAccount(account);

    // Must change password first?
    if (account.mustChangePassword) {
      if (headingEl) headingEl.textContent = 'Email verified!';
      if (subEl)     subEl.textContent     = 'Set a permanent password to finish setting up your account.';
      if (iconEl)    iconEl.innerHTML = '<svg viewBox="0 0 72 72" fill="none" width="56" height="56"><circle cx="36" cy="36" r="32" stroke="#2d6a4f" stroke-width="3"/><path d="M20 36L30 46L52 24" stroke="#2d6a4f" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
      await sleep(900);
      tempSession = { id: account.id, email: account.email, name: account.name, role: account.role };
      showState('state-change-pw');
      initChangePwForm();
    } else {
      if (headingEl) headingEl.textContent = 'Email verified!';
      if (subEl)     subEl.textContent     = 'Taking you to the dashboard…';
      if (iconEl)    iconEl.innerHTML = '<svg viewBox="0 0 72 72" fill="none" width="56" height="56"><circle cx="36" cy="36" r="32" stroke="#2d6a4f" stroke-width="3"/><path d="M20 36L30 46L52 24" stroke="#2d6a4f" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
      createSession(account);
      setTimeout(function () { window.location.href = 'dashboard/index.html'; }, 900);
    }
  }

  /* ══════════════════════════════════════════════════════════
     STATE 2 — Change Password
  ══════════════════════════════════════════════════════════ */

  var changePwInited = false;
  function initChangePwForm() {
    if (changePwInited) return;
    changePwInited = true;
    var form      = document.getElementById('change-pw-form');
    var newPwEl   = document.getElementById('new-password');
    var submitBtn = form.querySelector('button[type=submit]');

    newPwEl.addEventListener('input', function () {
      updateStrengthUI(newPwEl.value, 'pw-strength-bar', 'pw-strength-label');
      updateRequirements(newPwEl.value);
    });

    form.addEventListener('submit', async function (e) {
      e.preventDefault();
      clearError('change-pw-error');

      if (!tempSession) { showState('state-login'); return; }

      var pw      = document.getElementById('new-password').value;
      var confirm = document.getElementById('confirm-password').value;

      if (pw !== confirm) {
        showError('change-pw-error', 'Passwords do not match.');
        return;
      }

      if (passwordStrength(pw) < 2) {
        showError('change-pw-error', 'Password is too weak. Follow the requirements below.');
        return;
      }

      submitBtn.textContent = 'Saving…';
      submitBtn.disabled    = true;

      var account = getAccount(tempSession.email);
      if (!account) { showState('state-login'); return; }

      var salt = randomHex(16);
      account.passwordHash      = await hashPassword(pw, salt);
      account.salt              = salt;
      account.mustChangePassword = false;
      updateAccount(account);
      logEvent(tempSession.email, 'password_changed');

      createSession(account);
      showState('state-success');
      setTimeout(function () { window.location.href = 'dashboard/index.html'; }, 700);
    });
  }

})();
