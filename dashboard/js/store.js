/* ============================================================
   MYQUEST — store.js
   In-memory data layer. Supabase is the source of truth;
   these stores hold the current page-session cache only.
   Exposes window.MQ.store
   ============================================================ */
(function () {
  'use strict';

  window.MQ = window.MQ || {};

  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  function entity() {
    var _data = [];
    return {
      getAll: function () { return _data.slice(); },
      getById: function (id) {
        return _data.find(function (r) { return r.id === id; }) || null;
      },
      save: function (obj) {
        if (obj.id) {
          var idx = _data.findIndex(function (r) { return r.id === obj.id; });
          if (idx > -1) {
            _data[idx] = Object.assign({}, _data[idx], obj, { updatedAt: new Date().toISOString() });
            return _data[idx];
          }
          var updated = Object.assign({}, obj, { updatedAt: new Date().toISOString() });
          _data.push(updated);
          return updated;
        }
        obj = Object.assign({}, obj, { id: uid(), createdAt: new Date().toISOString() });
        _data.push(obj);
        return obj;
      },
      delete: function (id) {
        _data = _data.filter(function (r) { return r.id !== id; });
      },
      clear: function () { _data = []; },
    };
  }

  /* ---- Quote rate defaults --------------------------------- */
  var DEFAULT_RATES = {
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

  var _rates = JSON.parse(JSON.stringify(DEFAULT_RATES));

  function getRates() { return _rates; }
  function saveRates(r) { _rates = r; }

  /* ---- Auth log — in-memory, capped at 200 entries --------- */
  var _authLog = [];
  var authLog = {
    append: function (entry) {
      _authLog.unshift(Object.assign({ id: uid(), at: new Date().toISOString() }, entry));
      if (_authLog.length > 200) _authLog = _authLog.slice(0, 200);
    },
    getAll: function () { return _authLog.slice(); },
    clear:  function () { _authLog = []; },
  };

  /* ---- Public API ------------------------------------------ */
  var stores = {
    clients:       entity(),
    properties:    entity(),
    quotes:        entity(),
    jobs:          entity(),
    staff:         entity(),
    roster:        entity(),
    timeLogs:      entity(),
    checklists:    entity(),
    inventory:     entity(),
    issues:        entity(),
    announcements: entity(),
    permissions:   entity(),
    xpEvents:      entity(),
    accounts:      entity(),
    authLog:       authLog,
    rates: { get: getRates, save: saveRates, defaults: DEFAULT_RATES },
    seed: function () {},
    seedPermissions: function () {},
    clearAll: function () {
      ['clients','properties','quotes','jobs','staff','roster','timeLogs',
       'checklists','inventory','issues','announcements','permissions',
       'xpEvents','accounts'].forEach(function (k) { stores[k].clear(); });
      _authLog = [];
      _rates = JSON.parse(JSON.stringify(DEFAULT_RATES));
      try { sessionStorage.removeItem('mq_session'); } catch {}
    },
  };

  MQ.store = stores;

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
