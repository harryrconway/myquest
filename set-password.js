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
      setTimeout(function () { window.location.href = 'dashboard/index.html'; }, 2000);
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

    // Subscribe to auth changes — Supabase processes the invite token from the URL
    // and fires SIGNED_IN once the session is established
    sb.auth.onAuthStateChange(function (event, session) {
      if ((event === 'SIGNED_IN' || event === 'USER_UPDATED') && session) {
        initForm(sb);
      }
    });

    // Also check if the session was already established before this listener
    var result = await sb.auth.getSession();
    if (result.data && result.data.session) {
      initForm(sb);
      return;
    }

    // If no token params in URL at all, there's nothing to do here
    if (!hash.includes('access_token') && !hash.includes('type=invite')) {
      // Give Supabase a moment to process — if still nothing, show invalid
      setTimeout(async function () {
        var r = await sb.auth.getSession();
        if (!r.data || !r.data.session) show('state-invalid');
      }, 3000);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
