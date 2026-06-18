/* ============================================================
   MYQUEST — ui.js
   Shared UI utilities: modals, toasts, sidebar, formatters.
   ============================================================ */

function escHtml(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

(function () {
  'use strict';

  window.MQ = window.MQ || {};

  /* ---- Modal ----------------------------------------------- */
  var _scrollY = 0;

  const modal = {
    open: function (id) {
      const el = document.getElementById(id);
      if (!el) return;
      el.classList.add('is-open');
      el.removeAttribute('hidden');
      _scrollY = window.scrollY;
      document.body.style.position = 'fixed';
      document.body.style.top = '-' + _scrollY + 'px';
      document.body.style.width = '100%';
      const firstInput = el.querySelector('input, select, textarea, button');
      if (firstInput) setTimeout(function () { firstInput.focus(); }, 50);
      el.addEventListener('keydown', modal._trapFocus);
      document.addEventListener('keydown', modal._docEsc);
      el.addEventListener('click', function (e) {
        if (e.target === el) modal.close(id);
      });
    },
    close: function (id) {
      const el = document.getElementById(id);
      if (!el) return;
      el.classList.remove('is-open');
      el.setAttribute('hidden', '');
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      window.scrollTo(0, _scrollY);
      el.removeEventListener('keydown', modal._trapFocus);
      document.removeEventListener('keydown', modal._docEsc);
    },
    closeAll: function () {
      document.querySelectorAll('.modal-overlay.is-open').forEach(function (el) {
        modal.close(el.id);
      });
    },
    _docEsc: function (e) {
      if (e.key === 'Escape') modal.closeAll();
    },
    _trapFocus: function (e) {
      if (e.key === 'Escape') {
        modal.closeAll();
        return;
      }
      if (e.key !== 'Tab') return;
      const focusable = e.currentTarget.querySelectorAll(
        'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  };

  function initModalTriggers() {
    document.addEventListener('click', function (e) {
      var openBtn = e.target.closest('[data-modal-open]');
      if (openBtn) { modal.open(openBtn.dataset.modalOpen); return; }
      var closeBtn = e.target.closest('[data-modal-close]');
      if (closeBtn) {
        var id = closeBtn.dataset.modalClose || (closeBtn.closest('.modal-overlay') || {}).id;
        if (id) modal.close(id);
      }
    });
  }

  /* ---- Toast ----------------------------------------------- */
  function ensureContainer() {
    let c = document.getElementById('toast-container');
    if (!c) {
      c = document.createElement('div');
      c.id = 'toast-container';
      c.className = 'toast-container';
      c.setAttribute('aria-live', 'polite');
      document.body.appendChild(c);
    }
    return c;
  }

  function toast(message, type, action) {
    type = type || 'success';
    const container = ensureContainer();
    const el = document.createElement('div');
    el.className = 'toast toast--' + type;
    el.textContent = message;
    if (action && action.href) {
      const link = document.createElement('a');
      link.href = action.href;
      link.textContent = ' ' + action.label;
      link.style.cssText = 'color:inherit;text-decoration:underline;margin-left:0.35rem;font-weight:600;white-space:nowrap;';
      el.appendChild(link);
    }
    container.appendChild(el);
    setTimeout(function () {
      el.classList.add('is-hiding');
      setTimeout(function () { el.remove(); }, 300);
    }, action ? 6000 : 3000);
  }

  /* ---- Confirm Delete --------------------------------------- */
  function confirmDelete(message, callback) {
    if (window.confirm(message || 'Are you sure you want to delete this? This cannot be undone.')) {
      callback();
    }
  }

  /* ---- Sidebar Active State --------------------------------- */
  function setSidebarActive() {
    const current = document.body.dataset.page;
    if (!current) return;
    document.querySelectorAll('.dash-sidebar__nav a[data-page]').forEach(function (a) {
      a.classList.toggle('is-active', a.dataset.page === current);
    });
  }

  /* ---- Mobile Sidebar Toggle -------------------------------- */
  function initMobileSidebar() {
    var hamburger = document.getElementById('dash-hamburger');
    var sidebar   = document.getElementById('dash-sidebar');
    var backdrop  = document.getElementById('dash-backdrop');
    if (!hamburger || !sidebar) return;

    function openSidebar() {
      sidebar.classList.add('is-open');
      hamburger.classList.add('is-open');
      if (backdrop) backdrop.classList.add('is-open');
      document.body.style.overflow = 'hidden';
    }

    function closeSidebar() {
      sidebar.classList.remove('is-open');
      hamburger.classList.remove('is-open');
      if (backdrop) backdrop.classList.remove('is-open');
      document.body.style.overflow = '';
    }

    hamburger.addEventListener('click', function () {
      sidebar.classList.contains('is-open') ? closeSidebar() : openSidebar();
    });
    if (backdrop) backdrop.addEventListener('click', closeSidebar);

    document.querySelectorAll('.dash-sidebar__nav a').forEach(function (a) {
      a.addEventListener('click', closeSidebar);
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && sidebar.classList.contains('is-open')) closeSidebar();
    });

    var touchStartX = 0;
    sidebar.addEventListener('touchstart', function (e) {
      touchStartX = e.touches[0].clientX;
    }, { passive: true });
    sidebar.addEventListener('touchend', function (e) {
      if (e.changedTouches[0].clientX - touchStartX > 60) closeSidebar();
    }, { passive: true });
  }

  /* ---- Tabs ------------------------------------------------ */
  function initTabs(containerEl) {
    const container = containerEl || document;
    container.querySelectorAll('.dash-tabs').forEach(function (tabBar) {
      tabBar.querySelectorAll('.dash-tab').forEach(function (tab) {
        tab.addEventListener('click', function () {
          const panelId = tab.dataset.tab;
          tabBar.querySelectorAll('.dash-tab').forEach(function (t) { t.classList.remove('is-active'); });
          tab.classList.add('is-active');
          const section = tab.closest('.dash-card__body') || tab.closest('.dash-content') || document;
          section.querySelectorAll('.dash-tab-panel').forEach(function (p) { p.classList.remove('is-active'); });
          const panel = document.getElementById(panelId);
          if (panel) panel.classList.add('is-active');
        });
      });
    });
  }

  /* ---- Formatters ------------------------------------------ */
  function formatDate(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    return d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  function formatTime(time24) {
    if (!time24) return '—';
    const [h, m] = time24.split(':').map(Number);
    const ampm = h >= 12 ? 'pm' : 'am';
    const hour = h % 12 || 12;
    return hour + ':' + String(m).padStart(2, '0') + ' ' + ampm;
  }

  function formatCurrency(n) {
    if (n == null || n === '') return '—';
    return '$' + parseFloat(n).toLocaleString('en-AU', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  }

  function statusBadge(status) {
    const map = {
      scheduled:   'badge--blue',
      'in-progress': 'badge--amber',
      completed:   'badge--green',
      cancelled:   'badge--grey',
      draft:       'badge--grey',
      sent:        'badge--blue',
      accepted:    'badge--green',
      declined:    'badge--red',
      ok:          'badge--green',
      low:         'badge--yellow',
      out:         'badge--red',
      pass:        'badge--green',
      'needs-revisit': 'badge--red',
      pending:     'badge--yellow',
      resolved:    'badge--green',
    };
    const cls = map[status] || 'badge--grey';
    const label = status ? status.replace(/-/g, ' ').replace(/\b\w/g, function (c) { return c.toUpperCase(); }) : '—';
    return '<span class="badge ' + cls + '">' + label + '</span>';
  }

  /* ---- Star Rating Widget ---------------------------------- */
  function initStarRating(container, onChange) {
    const stars = container.querySelectorAll('.star-rating__star');
    let current = 0;

    function setRating(val) {
      current = val;
      stars.forEach(function (s, i) {
        s.classList.toggle('is-active', i < val);
        s.textContent = i < val ? '★' : '☆';
      });
      if (onChange) onChange(val);
    }

    stars.forEach(function (s, i) {
      s.addEventListener('click', function () { setRating(i + 1); });
      s.addEventListener('mouseenter', function () {
        stars.forEach(function (x, j) { x.textContent = j <= i ? '★' : '☆'; });
      });
    });

    container.addEventListener('mouseleave', function () { setRating(current); });

    return { getValue: function () { return current; }, setValue: setRating };
  }

  /* ---- DOM helpers ----------------------------------------- */
  function el(tag, cls, html) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html) e.innerHTML = html;
    return e;
  }

  function emptyState(icon, title, sub) {
    return '<div class="empty-state">' +
      '<svg class="empty-state__icon" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="' + icon + '"/></svg>' +
      '<p class="empty-state__title">' + title + '</p>' +
      '<p class="empty-state__sub">' + sub + '</p>' +
      '</div>';
  }

  /* ---- Sidebar logo → main site (with confirm) ------------- */
  function initLogoLink() {
    document.querySelectorAll('.dash-sidebar__logo a').forEach(function (link) {
      link.addEventListener('click', function (e) {
        e.preventDefault();
        showExitConfirm();
      });
    });
  }

  function showExitConfirm() {
    var overlay = document.getElementById('dash-exit-modal');
    if (overlay) { overlay.classList.add('is-open'); overlay.removeAttribute('hidden'); return; }

    overlay = document.createElement('div');
    overlay.id = 'dash-exit-modal';
    overlay.className = 'modal-overlay is-open';
    overlay.innerHTML = [
      '<div class="modal-card" style="max-width:420px;text-align:center;">',
        '<div class="modal-body" style="align-items:center;gap:1.25rem;padding:2.5rem 2rem 1.5rem;">',
          '<div style="width:56px;height:56px;border-radius:50%;background:#FFF9CC;display:flex;align-items:center;justify-content:center;margin:0 auto;">',
            '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#FFD400" stroke-width="2" stroke-linecap="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>',
          '</div>',
          '<h2 style="font-size:var(--text-xl);font-weight:700;color:var(--color-dark);">Back to website?</h2>',
          '<p style="font-size:var(--text-sm);color:var(--color-mid);line-height:1.6;">You\'re about to leave the dashboard and return to the MyQuest public website.</p>',
        '</div>',
        '<div class="modal-footer" style="justify-content:center;gap:0.75rem;">',
          '<button id="dash-exit-cancel" class="btn-outline" style="min-width:120px;">Stay here</button>',
          '<button id="dash-exit-confirm" class="btn-primary" style="min-width:120px;">Go to website</button>',
        '</div>',
      '</div>'
    ].join('');

    document.body.appendChild(overlay);

    document.getElementById('dash-exit-cancel').addEventListener('click', function () {
      overlay.classList.remove('is-open');
      overlay.setAttribute('hidden', '');
    });
    document.getElementById('dash-exit-confirm').addEventListener('click', function () {
      window.location.href = '../index.html';
    });
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) { overlay.classList.remove('is-open'); overlay.setAttribute('hidden', ''); }
    });
    document.addEventListener('keydown', function onEsc(e) {
      if (e.key === 'Escape') { overlay.classList.remove('is-open'); overlay.setAttribute('hidden', ''); document.removeEventListener('keydown', onEsc); }
    });
  }

  /* ---- DOMContentLoaded init ------------------------------- */
  document.addEventListener('DOMContentLoaded', function () {
    initModalTriggers();
    setSidebarActive();
    initMobileSidebar();
    initTabs();
    initLogoLink();
  });

  /* ---- Save overlay ---------------------------------------- */
  var _saveOverlay = (function () {
    var el = document.createElement('div');
    el.className = 'mq-save-overlay';
    el.id        = 'mq-save-overlay';
    el.innerHTML = '<p class="mq-save-text">Saving…</p>';
    document.addEventListener('DOMContentLoaded', function () { document.body.appendChild(el); });
    return el;
  }());

  var _saveTimerDone = false;
  var _saveOpDone    = false;

  function _hideSaveOverlay() {
    _saveOverlay.classList.remove('is-visible');
    _saveOverlay.classList.remove('is-saved');
  }

  function _completeSave() {
    var t = _saveOverlay.querySelector('.mq-save-text');
    if (t) t.textContent = 'Saved ✓';
    _saveOverlay.classList.add('is-saved');
    setTimeout(_hideSaveOverlay, 800);
  }

  function saving(minMs) {
    minMs = (minMs === undefined) ? 1000 : minMs;
    _saveTimerDone = false;
    _saveOpDone    = false;
    var t = _saveOverlay.querySelector('.mq-save-text');
    if (t) t.textContent = 'Saving…';
    _saveOverlay.classList.remove('is-saved');
    _saveOverlay.classList.add('is-visible');
    setTimeout(function () { _saveTimerDone = true; if (_saveOpDone) _completeSave(); }, minMs);
    // Safety net — auto-hide after 10s if saved() is never called
    setTimeout(function () { if (!_saveOpDone) { _saveOpDone = true; _hideSaveOverlay(); } }, 10000);
  }

  function saved() {
    _saveOpDone = true;
    if (_saveTimerDone) _completeSave();
  }

  /* ---- Public API ------------------------------------------ */
  MQ.ui = {
    modal: modal,
    toast: toast,
    confirmDelete: confirmDelete,
    setSidebarActive: setSidebarActive,
    initTabs: initTabs,
    initStarRating: initStarRating,
    formatDate: formatDate,
    formatTime: formatTime,
    formatCurrency: formatCurrency,
    statusBadge: statusBadge,
    el: el,
    emptyState: emptyState,
    saving: saving,
    saved: saved,
  };

})();
