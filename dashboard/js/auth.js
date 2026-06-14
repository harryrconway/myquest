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
    var displayName = (session && (session.name || session.email)) || '';
    var displayRole = (session && session.role) || 'staff';
    document.querySelectorAll('.js-user-name').forEach(function (el) {
      el.textContent = displayName;
    });
    document.querySelectorAll('.js-user-role').forEach(function (el) {
      el.textContent = displayRole.charAt(0).toUpperCase() + displayRole.slice(1);
    });
    document.querySelectorAll('.js-user-avatar').forEach(function (el) {
      el.textContent = displayName ? displayName.charAt(0).toUpperCase() : '?';
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

  function syncRatesToStore(rows) {
    if (!rows || !rows.length) return;
    rows.forEach(function (row) {
      if (row.key === 'rates' && row.value && typeof row.value === 'object') {
        var current = MQ.store.rates.get();
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

  function syncProfilesToStore(profiles) {
    if (!profiles || !profiles.length) return;
    profiles.forEach(function (p) {
      MQ.store.accounts.save({
        id: p.id, name: p.name || '', email: p.email || '',
        role: p.role || 'staff', cleaningLevel: p.cleaning_level || 1,
        status: p.status === 'suspended' ? 'suspended' : (p.status || 'active'),
      });
      var existing = MQ.store.staff.getById(p.id);
      MQ.store.staff.save(Object.assign({}, existing || {}, {
        id: p.id, name: p.name || '', email: p.email || '',
        mobile:    p.mobile     || (existing && existing.mobile)    || '',
        role:      p.role       || 'staff',
        level:     parseInt(p.cleaning_level) || 1,
        startDate: p.start_date || (existing && existing.startDate) || '',
        active:    p.status !== 'suspended',
        colour:    p.colour     || (existing && existing.colour)    || '',
      }));
    });
  }

  async function init() {
    try {
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
        var _fastResults = await Promise.all([
          sb.from('profiles').select('id, name, email, role, cleaning_level, colour, status, mobile, start_date').catch(function () { return { data: null }; }),
          sb.from('company_settings').select('key, value').in('key', ['rates', 'checklist_template']).catch(function () { return { data: null }; }),
        ]);
        syncProfilesToStore(_fastResults[0].data || []);
        syncRatesToStore(_fastResults[1].data || []);
        function doReady() {
          applyRoleGating(cached);
          populateUserInfo(cached);
          initLogout(sb);
          startIdleMonitor(sb);
          fireReady();
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

    // Three parallel queries:
    // [0] Current user's own profile — targeted, immune to RLS / schema issues on other rows
    // [1] All profiles — best-effort, used only to populate the in-memory store for display
    // [2] Company settings — rates + checklist template
    var _slowResults = await Promise.all([
      sb.from('profiles').select('name, role, status').eq('id', userId).single().catch(function () { return { data: null }; }),
      sb.from('profiles').select('id, name, email, role, cleaning_level, colour, status, mobile, start_date').catch(function () { return { data: null }; }),
      sb.from('company_settings').select('key, value').in('key', ['rates', 'checklist_template']).catch(function () { return { data: null }; }),
    ]);
    var myProfile   = _slowResults[0].data; // authoritative for this user's role
    var allProfiles = _slowResults[1].data || [];
    // If all-profiles query returned nothing (RLS / failure), seed store with at least own profile
    if (!allProfiles.length && myProfile) {
      allProfiles = [Object.assign({ id: userId }, myProfile)];
    }
    syncProfilesToStore(allProfiles);
    syncRatesToStore((_slowResults[2] && _slowResults[2].data) || []);

    var name = email;
    var role = 'staff';
    if (myProfile) {
      name = myProfile.name || email;
      role = myProfile.role || 'staff';
      if (myProfile.status === 'invited' && role !== 'owner') {
        if (!window.location.pathname.includes('onboarding')) {
          window.location.href = 'onboarding.html';
          return;
        }
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
      fireReady();
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', onDomReady, { once: true });
    } else {
      onDomReady();
    }
    } catch (err) {
      console.error('[MyQuest] Auth init error:', err);
      window.location.href = '../login.html';
    }
  }

  function fireReady() {
    MQ._ready = true;
    var q = MQ._readyQueue || [];
    MQ._readyQueue = [];
    q.forEach(function (fn) { setTimeout(fn, 0); });
    var _orig = document.addEventListener.bind(document);
    document.addEventListener = function (type, fn, opts) {
      if (type === 'mq:ready' && MQ._ready) { setTimeout(fn, 0); return; }
      _orig(type, fn, opts);
    };
    document.dispatchEvent(new CustomEvent('mq:ready'));
  }

  MQ._readyQueue = [];
  MQ.onReady = function (fn) {
    if (MQ._ready) { setTimeout(fn, 0); return; }
    MQ._readyQueue.push(fn);
  };

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
