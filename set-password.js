(function () {
  'use strict';

  function show(id) {
    ['state-loading', 'state-form', 'state-done', 'state-invalid'].forEach(function (s) {
      var el = document.getElementById(s);
      if (el) el.hidden = (s !== id);
    });
  }

  function initPwToggle(btnId, inputId) {
    var btn   = document.getElementById(btnId);
    var input = document.getElementById(inputId);
    if (!btn || !input) return;
    btn.addEventListener('click', function () {
      var show = input.type === 'password';
      input.type = show ? 'text' : 'password';
      btn.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
    });
  }

  function initForm(sb) {
    show('state-form');
    initPwToggle('pw-toggle-sp',      'sp-password');
    initPwToggle('pw-toggle-confirm', 'sp-confirm');

    var form      = document.getElementById('sp-form');
    var errorEl   = document.getElementById('sp-error');
    var submitBtn = document.getElementById('sp-submit');

    form.addEventListener('submit', async function (e) {
      e.preventDefault();
      errorEl.hidden = true;

      var password = document.getElementById('sp-password').value;
      var confirm  = document.getElementById('sp-confirm').value;

      if (password.length < 8) {
        errorEl.textContent = 'Password must be at least 8 characters.';
        errorEl.hidden = false;
        return;
      }
      if (password !== confirm) {
        errorEl.textContent = 'Passwords do not match.';
        errorEl.hidden = false;
        return;
      }

      submitBtn.textContent = 'Setting password…';
      submitBtn.disabled    = true;

      var result = await sb.auth.updateUser({ password: password });

      if (result.error) {
        errorEl.textContent = result.error.message || 'Something went wrong. Please try again.';
        errorEl.hidden      = false;
        submitBtn.textContent = 'Set Password';
        submitBtn.disabled    = false;
        return;
      }

      show('state-done');
      setTimeout(function () { window.location.href = 'dashboard/onboarding.html'; }, 2000);
    });
  }

  async function init() {
    var sb = window.MQ && MQ.supabase;
    if (!sb) { show('state-invalid'); return; }

    // If the URL contains an error fragment, the link is expired/invalid
    var hash = window.location.hash;
    if (hash.includes('error=')) {
      show('state-invalid');
      return;
    }

    // Guard: prevent initForm from being called more than once
    var done = false;
    function resolve(fn) {
      if (done) return;
      done = true;
      fn();
    }

    // Handle Supabase PKCE flow — invite redirect arrives as ?code=xxx
    var code = new URLSearchParams(window.location.search).get('code');
    if (code) {
      var ex = await sb.auth.exchangeCodeForSession(code);
      if (ex.error || !ex.data || !ex.data.session) {
        show('state-invalid');
      } else {
        initForm(sb);
      }
      return;
    }

    // Listen for auth state changes (handles implicit / hash-fragment flow)
    sb.auth.onAuthStateChange(function (event, session) {
      if (event === 'PASSWORD_RECOVERY' && session) {
        resolve(function () { initForm(sb); });
      } else if ((event === 'SIGNED_IN' || event === 'USER_UPDATED' || event === 'INITIAL_SESSION') && session) {
        resolve(function () { initForm(sb); });
      }
    });

    // Session may already be established before the listener registered
    var result = await sb.auth.getSession();
    if (result.data && result.data.session) {
      resolve(function () { initForm(sb); });
      return;
    }

    // Universal fallback — show invalid if nothing resolves within 30 s
    setTimeout(function () {
      resolve(function () { show('state-invalid'); });
    }, 30000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
