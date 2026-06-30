/* ============================================================
   MYQUEST — login.js  (Supabase Auth via /api/login proxy)
   ============================================================ */
(function () {
  'use strict';

  var DASHBOARD_URL = '/dashboard/';

  function showState(id) {
    ['state-login', 'state-success'].forEach(function (s) {
      var el = document.getElementById(s);
      if (el) el.hidden = (s !== id);
    });
  }

  function showError(msg) {
    var el = document.getElementById('login-error');
    if (!el) return;
    el.textContent = msg;
    el.hidden = false;
  }

  function clearError() {
    var el = document.getElementById('login-error');
    if (el) el.hidden = true;
  }

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

  window.addEventListener('load', async function () {
    var sb = window.MQ && MQ.supabase;
    if (!sb) {
      showError('Configuration error. Please contact your administrator.');
      return;
    }

    // Already signed in?
    var existing = await sb.auth.getSession();
    if (existing.data && existing.data.session) {
      window.location.href = DASHBOARD_URL;
      return;
    }

    wireToggle('pw-toggle-login', 'login-password');
    showState('state-login');
    initLoginForm(sb);
  });

  function initLoginForm(sb) {
    var form       = document.getElementById('login-form');
    var emailEl    = document.getElementById('login-email');
    var passwordEl = document.getElementById('login-password');
    var submitBtn  = document.getElementById('login-submit');

    form.addEventListener('submit', async function (e) {
      e.preventDefault();
      clearError();

      var email    = emailEl.value.trim().toLowerCase();
      var password = passwordEl.value;

      if (!email || !password) {
        showError('Please enter your email and password.');
        return;
      }

      // UX guard: if the Turnstile widget rendered but the user hasn't completed it, warn immediately.
      // The real validation happens server-side in /api/login.
      var tsInput = document.querySelector('[name="cf-turnstile-response"]');
      if (tsInput && !tsInput.value) {
        showError('Please complete the security check.');
        return;
      }

      submitBtn.textContent = 'Signing in…';
      submitBtn.disabled    = true;

      var res;
      try {
        res = await fetch('/api/login', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({
            email:           email,
            password:        password,
            turnstile_token: tsInput ? tsInput.value : null,
          }),
        });
      } catch (networkErr) {
        showError('Could not connect to the server. Please check your connection.');
        submitBtn.textContent = 'Sign In';
        submitBtn.disabled    = false;
        return;
      }

      var data = await res.json().catch(function () { return {}; });

      if (!res.ok) {
        showError(data.error || 'Sign in failed. Please try again.');
        submitBtn.textContent = 'Sign In';
        submitBtn.disabled    = false;
        if (typeof turnstile !== 'undefined') turnstile.reset();
        return;
      }

      // Establish the Supabase session client-side from the tokens the Worker returned.
      await sb.auth.setSession({
        access_token:  data.access_token,
        refresh_token: data.refresh_token,
      });

      // Fetch profile for name/role to pre-populate the session cache.
      var userId        = data.user.id;
      var profileResult = await sb.from('profiles').select('name, role').eq('id', userId).single();

      var name = email;
      var role = 'staff';
      if (profileResult.data) {
        name = profileResult.data.name || email;
        role = profileResult.data.role || 'staff';
      }

      var session = {
        id:           userId,
        email:        email,
        name:         name,
        role:         role,
        loginTime:    new Date().toISOString(),
        lastActivity: new Date().toISOString(),
      };
      sessionStorage.setItem('mq_session', JSON.stringify(session));

      showState('state-success');
      setTimeout(function () { window.location.href = DASHBOARD_URL; }, 700);
    });
  }

})();
