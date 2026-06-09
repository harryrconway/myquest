/* ============================================================
   MYQUEST — store.js
   localStorage CRUD layer for all entities.
   Exposes window.MQ.store
   ============================================================ */
(function () {
  'use strict';

  window.MQ = window.MQ || {};

  const KEYS = {
    permissions:   'mq_permissions',
    session:       'mq_session',
    clients:       'mq_clients',
    properties:    'mq_properties',
    quotes:        'mq_quotes',
    jobs:          'mq_jobs',
    staff:         'mq_staff',
    roster:        'mq_roster',
    timeLogs:      'mq_time_logs',
    checklists:    'mq_checklists',
    inventory:     'mq_inventory',
    issues:        'mq_issues',
    announcements: 'mq_announcements',
    rates:         'mq_rates',
    xpEvents:      'mq_xp_events',
    accounts:      'mq_accounts',
    authLog:       'mq_auth_log',
  };

  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  function entity(key) {
    return {
      getAll() {
        try {
          return JSON.parse(localStorage.getItem(key) || '[]');
        } catch { return []; }
      },
      getById(id) {
        return this.getAll().find(function (r) { return r.id === id; }) || null;
      },
      save(obj) {
        const all = this.getAll();
        if (obj.id) {
          const idx = all.findIndex(function (r) { return r.id === obj.id; });
          if (idx > -1) {
            all[idx] = Object.assign({}, all[idx], obj, { updatedAt: new Date().toISOString() });
          } else {
            all.push(Object.assign({}, obj, { updatedAt: new Date().toISOString() }));
          }
        } else {
          obj = Object.assign({}, obj, { id: uid(), createdAt: new Date().toISOString() });
          all.push(obj);
        }
        localStorage.setItem(key, JSON.stringify(all));
        return obj;
      },
      delete(id) {
        const all = this.getAll().filter(function (r) { return r.id !== id; });
        localStorage.setItem(key, JSON.stringify(all));
      },
      clear() {
        localStorage.removeItem(key);
      }
    };
  }

  /* ---- Quote rate defaults --------------------------------- */
  const DEFAULT_RATES = {
    res: {
      baseBedroom:  35,
      baseBathroom: 25,
      baseFlat:     40,
      conditionMultiplier: { standard: 1, poor: 1.3, heavy: 1.6 },
      extras: {
        oven: 40, windows: 30, balcony: 25,
        garage: 20, fridge: 20, walls: 50
      },
      hourlyRate: 45,
      staffPerHours: 3,
    },
    com: {
      baseRatePerSqm: 0.12,
      frequencyMultiplier: { daily: 22, 'three-week': 12, weekly: 4.3, fortnightly: 2.15 },
      complexityMultiplier: { low: 1, medium: 1.25, high: 1.6 },
      hourlyRate: 50,
    }
  };

  function getRates() {
    try {
      return JSON.parse(localStorage.getItem(KEYS.rates)) || DEFAULT_RATES;
    } catch { return DEFAULT_RATES; }
  }

  function saveRates(r) {
    localStorage.setItem(KEYS.rates, JSON.stringify(r));
  }

  /* ---- Seed Data ------------------------------------------- */
  function seed() {}

  /* ---- Permissions default seed ---------------------------- */
  function seedPermissions() {
    // Permissions are set up via first login or Settings — no demo accounts seeded here.
  }

  /* ---- Auth log — append-only, capped at 200 entries ------- */
  var authLog = {
    append: function (entry) {
      try {
        var logs = JSON.parse(localStorage.getItem(KEYS.authLog) || '[]');
        logs.unshift(Object.assign({ id: uid(), at: new Date().toISOString() }, entry));
        localStorage.setItem(KEYS.authLog, JSON.stringify(logs.slice(0, 200)));
      } catch {}
    },
    getAll: function () {
      try { return JSON.parse(localStorage.getItem(KEYS.authLog) || '[]'); }
      catch { return []; }
    },
    clear: function () { localStorage.removeItem(KEYS.authLog); }
  };

  /* ---- Public API ------------------------------------------ */
  MQ.store = {
    clients:       entity(KEYS.clients),
    properties:    entity(KEYS.properties),
    quotes:        entity(KEYS.quotes),
    jobs:          entity(KEYS.jobs),
    staff:         entity(KEYS.staff),
    roster:        entity(KEYS.roster),
    timeLogs:      entity(KEYS.timeLogs),
    checklists:    entity(KEYS.checklists),
    inventory:     entity(KEYS.inventory),
    issues:        entity(KEYS.issues),
    announcements: entity(KEYS.announcements),
    permissions:   entity(KEYS.permissions),
    xpEvents:      entity(KEYS.xpEvents),
    accounts:      entity(KEYS.accounts),
    authLog:       authLog,
    rates: { get: getRates, save: saveRates, defaults: DEFAULT_RATES },
    seed: seed,
    seedPermissions: seedPermissions,
    clearAll: function () {
      Object.values(KEYS).forEach(function (k) { localStorage.removeItem(k); });
      try { sessionStorage.removeItem('mq_session'); } catch {}
    }
  };

  seedPermissions();

  // Returns jobs the current user is allowed to see.
  // Owner / manager → all jobs. Staff → only their assigned jobs.
  // Safe to call from any page after auth.js has run.
  MQ.store.visibleJobs = function () {
    var all = MQ.store.jobs.getAll();
    if (!MQ.hasRole) return all;
    if (MQ.hasRole('manager')) return all;
    if (!MQ.session) return all;
    var staffRecord = MQ.store.staff.getAll().find(function (s) {
      return s.email.toLowerCase() === (MQ.session.email || '').toLowerCase();
    });
    if (!staffRecord) return [];
    return all.filter(function (j) {
      return Array.isArray(j.staffIds) && j.staffIds.indexOf(staffRecord.id) !== -1;
    });
  };

})();
