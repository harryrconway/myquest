/* ============================================================
   MYQUEST — auth.js  (Supabase Auth)
   Load FIRST (no defer) on every dashboard page.
   Maintains the MQ.session / MQ.hasRole interface so all
   dashboard pages continue to work without changes.
   ============================================================ */
(function () {
  'use strict';

  window.MQ = window.MQ || {};

  var ROLES       = { owner: 3, manager: 2, staff: 1 };
  var SESSION_KEY = 'mq_session';
  var IDLE_TTL    = 30 * 60 * 1000; // 30 minutes

  function roleLevel(role) {
    return ROLES[role] || 0;
  }

  function applyRoleGating(session) {
    var userLevel = roleLevel(session.role);
    document.querySelectorAll('[data-min-role]').forEach(function (el) {
      var required = roleLevel(el.dataset.minRole);
      if (userLevel < required) {
        el.style.display = 'none';
        el.setAttribute('aria-hidden', 'true');
        el.setAttribute('tabindex', '-1');
      }
    });
  }

  function populateUserInfo(session) {
    document.querySelectorAll('.js-user-name').forEach(function (el) {
      el.textContent = session.name || session.email;
    });
    document.querySelectorAll('.js-user-role').forEach(function (el) {
      el.textContent = session.role.charAt(0).toUpperCase() + session.role.slice(1);
    });
    document.querySelectorAll('.js-user-avatar').forEach(function (el) {
      var name = session.name || session.email;
      el.textContent = name.charAt(0).toUpperCase();
    });
  }

  function initLogout(sb) {
    document.querySelectorAll('.js-logout').forEach(function (btn) {
      btn.addEventListener('click', async function () {
        sessionStorage.removeItem(SESSION_KEY);
        await sb.auth.signOut();
        window.location.href = '../login.html';
      });
    });
  }

  function startIdleMonitor(sb) {
    var EVENTS = ['mousedown', 'keydown', 'touchstart', 'scroll', 'click'];

    function touch() {
      var raw = sessionStorage.getItem(SESSION_KEY);
      if (!raw) return;
      try {
        var s = JSON.parse(raw);
        s.lastActivity = new Date().toISOString();
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(s));
      } catch {}
    }

    EVENTS.forEach(function (e) {
      document.addEventListener(e, touch, { passive: true });
    });

    setInterval(function () {
      var raw = sessionStorage.getItem(SESSION_KEY);
      if (!raw) {
        sb.auth.signOut();
        window.location.href = '../login.html';
        return;
      }
      try {
        var s = JSON.parse(raw);
        var idle = s.lastActivity && Date.now() - new Date(s.lastActivity).getTime() > IDLE_TTL;
        if (idle) {
          sessionStorage.removeItem(SESSION_KEY);
          sb.auth.signOut();
          window.location.href = '../login.html';
        }
      } catch {}
    }, 60000);
  }

  async function init() {
    var sb = window.MQ && MQ.supabase;
    if (!sb) {
      window.location.href = '../login.html';
      return;
    }

    // Fast path: cached session — confirm Supabase client has live session, then fire mq:ready
    var cached = null;
    try { cached = JSON.parse(sessionStorage.getItem(SESSION_KEY)); } catch (e) {}
    if (cached && cached.role) {
      MQ.session = cached;
      MQ.hasRole = function (minRole) { return roleLevel(cached.role) >= roleLevel(minRole); };
      var fastCheck = await sb.auth.getSession();
      if (fastCheck.data && fastCheck.data.session) {
        function doReady() {
          applyRoleGating(cached);
          populateUserInfo(cached);
          initLogout(sb);
          startIdleMonitor(sb);
          document.dispatchEvent(new CustomEvent('mq:ready'));
        }
        if (document.readyState === 'loading') {
          document.addEventListener('DOMContentLoaded', doReady, { once: true });
        } else {
          doReady();
        }
        return;
      }
      // getSession() null — Supabase still initialising from localStorage; fall to slow path.
      sessionStorage.removeItem(SESSION_KEY);
    }

    // Slow path: full auth + profile fetch (first load / after logout)
    var result = await sb.auth.getSession();
    if (!result.data || !result.data.session) {
      sessionStorage.removeItem(SESSION_KEY);
      window.location.href = '../login.html';
      return;
    }

    var sbSession = result.data.session;
    var userId    = sbSession.user.id;
    var email     = sbSession.user.email;

    // Load profile (name + role)
    var profileResult = await sb.from('profiles').select('name, role, status').eq('id', userId).single();

    var name = email;
    var role = 'staff';
    if (profileResult.data) {
      name = profileResult.data.name || email;
      role = profileResult.data.role || 'staff';
      if (profileResult.data.status === 'invited') {
        sb.from('profiles').update({ status: 'active' }).eq('id', userId).then(function () {});
      }
    }

    // Build / refresh MQ.session (same shape as before)
    var session = {
      email:        email,
      name:         name,
      role:         role,
      loginTime:    new Date().toISOString(),
      lastActivity: new Date().toISOString(),
    };
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));

    MQ.session = session;
    MQ.hasRole = function (minRole) {
      return roleLevel(session.role) >= roleLevel(minRole);
    };

    function onDomReady() {
      applyRoleGating(session);
      populateUserInfo(session);
      initLogout(sb);
      startIdleMonitor(sb);
      document.dispatchEvent(new CustomEvent('mq:ready'));
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', onDomReady, { once: true });
    } else {
      onDomReady();
    }
  }

  init();

  // On bfcache restoration, confirm session is still live then let pages reload data
  window.addEventListener('pageshow', function (event) {
    if (!event.persisted) return;
    var sb = window.MQ && MQ.supabase;
    if (!sb) return;
    sb.auth.getSession().then(function (r) {
      if (!r.data || !r.data.session) {
        sessionStorage.removeItem(SESSION_KEY);
        window.location.href = '../login.html';
        return;
      }
      document.dispatchEvent(new CustomEvent('mq:pageshow'));
    });
  });

})();
