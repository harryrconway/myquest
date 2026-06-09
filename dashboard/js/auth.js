/* ============================================================
   MYQUEST — auth.js
   Session management, role checking, UI gating.
   Load this script FIRST (no defer) on every dashboard page.
   ============================================================ */
(function () {
  'use strict';

  window.MQ = window.MQ || {};

  var ROLES      = { owner: 3, manager: 2, staff: 1 };
  var SESSION_KEY = 'mq_session';
  var SESSION_TTL = 12 * 60 * 60 * 1000;  // 12 hours
  var IDLE_TTL    = 30 * 60 * 1000;        // 30 minutes

  function getSession() {
    try {
      var raw = sessionStorage.getItem(SESSION_KEY);
      if (!raw) return null;
      var s = JSON.parse(raw);
      var now = Date.now();

      // Hard expiry
      if (s.expiresAt && now > new Date(s.expiresAt).getTime()) {
        sessionStorage.removeItem(SESSION_KEY);
        return null;
      }

      // Idle timeout
      if (s.lastActivity && now - new Date(s.lastActivity).getTime() > IDLE_TTL) {
        sessionStorage.removeItem(SESSION_KEY);
        return null;
      }

      // Touch activity timestamp
      s.lastActivity = new Date().toISOString();
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(s));
      return s;
    } catch { return null; }
  }

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

  function initLogout() {
    document.querySelectorAll('.js-logout').forEach(function (btn) {
      btn.addEventListener('click', function () {
        sessionStorage.removeItem(SESSION_KEY);
        window.location.href = '../login.html';
      });
    });
  }

  // Touch lastActivity on user interaction so idle timer resets correctly
  function startIdleMonitor() {
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

    // Poll every 60s — redirect if idle or expired
    setInterval(function () {
      var raw = sessionStorage.getItem(SESSION_KEY);
      if (!raw) { window.location.href = '../login.html'; return; }
      try {
        var s = JSON.parse(raw);
        var now = Date.now();
        var expired = s.expiresAt && now > new Date(s.expiresAt).getTime();
        var idle    = s.lastActivity && now - new Date(s.lastActivity).getTime() > IDLE_TTL;
        if (expired || idle) {
          sessionStorage.removeItem(SESSION_KEY);
          window.location.href = '../login.html';
        }
      } catch {}
    }, 60000);
  }

  function init() {
    var session = getSession();
    if (!session) {
      window.location.href = '../login.html';
      return;
    }

    MQ.session = session;
    MQ.hasRole = function (minRole) {
      return roleLevel(session.role) >= roleLevel(minRole);
    };

    document.addEventListener('DOMContentLoaded', function () {
      applyRoleGating(session);
      populateUserInfo(session);
      initLogout();
      startIdleMonitor();
    });
  }

  init();

})();
