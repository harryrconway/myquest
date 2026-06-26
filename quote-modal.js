/* Public site — single-step quote modal */

(function () {
  'use strict';

  var submitting = false;
  var selectedService = '';
  var formDirty = false;
  var _savedScrollY = 0;

  var SERVICES = ['General Clean', 'Deep Clean', 'Commercial', 'Other'];

  /* ─── Open / Close ─────────────────────────────────────────────────── */

  function openModal() {
    selectedService = '';
    submitting = false;
    formDirty = false;

    var overlay = document.getElementById('quote-modal');
    overlay.hidden = false;
    overlay.removeAttribute('aria-hidden');

    _savedScrollY = window.scrollY || window.pageYOffset || 0;
    document.body.style.position = 'fixed';
    document.body.style.top      = -_savedScrollY + 'px';
    document.body.style.width    = '100%';

    renderForm();

    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        overlay.classList.add('qm--open');
        var nameEl = document.getElementById('qm-name');
        if (nameEl) nameEl.focus();
      });
    });
  }

  function closeModal() {
    document.body.style.position = '';
    document.body.style.top      = '';
    document.body.style.width    = '';
    window.scrollTo(0, _savedScrollY);

    var overlay = document.getElementById('quote-modal');
    if (overlay) {
      overlay.classList.remove('qm--open');
      setTimeout(function () {
        overlay.hidden = true;
        overlay.setAttribute('aria-hidden', 'true');
      }, 280);
    }

  }

  function requestCloseModal() {
    if (submitting) return;
    if (formDirty && !window.confirm('Are you sure you want to leave? Your quote details will be lost.')) {
      return;
    }
    closeModal();
  }

  /* ─── Submit state ──────────────────────────────────────────────────── */

  function setSubmitReady(ready) {
    var btn = document.getElementById('qm-submit');
    if (!btn) return;
    btn.disabled = !ready;
    btn.style.opacity = ready ? '' : '0.55';
  }

  /* ─── Render ─────────────────────────────────────────────────────────── */

  function renderForm() {
    var card = document.querySelector('.qm-card');
    if (card) card.className = 'qm-card qm-card--simple';

    document.getElementById('qm-title').textContent       = 'Get a Free Quote';
    document.getElementById('qm-step-label').textContent  = "We'll call you ASAP";
    document.getElementById('qm-progress-bar').style.width = '0%';

    var footer = document.getElementById('qm-footer');
    if (footer) footer.style.display = 'none';
    var tabBar = document.getElementById('qm-mob-tab-bar');
    if (tabBar) tabBar.style.display = 'none';

    var body = document.getElementById('qm-body');
    body.style.overflowY = 'auto';
    body.innerHTML =
      '<div class="qm-simple-form">' +
        inputField('Name',   'qm-name',   'text',  'Your name',         true,  'name',           100) +
        inputField('Mobile', 'qm-phone',  'tel',   '04XX XXX XXX',      true,  'tel',             20) +
        inputField('Email',  'qm-email',  'email', 'you@example.com',   true,  'email',          254) +
        inputField('Suburb', 'qm-suburb', 'text',  'e.g. Kingscliff',   true,  'address-level2', 100) +
        '<div class="qm-field">' +
          '<label class="qm-label">Service Needed</label>' +
          '<div class="qm-svc-row">' +
            SERVICES.map(function (s) {
              return '<button type="button" class="qm-svc-pill" data-value="' + s + '">' + s + '</button>';
            }).join('') +
          '</div>' +
        '</div>' +
        '<div class="qm-field">' +
          '<label class="qm-label" for="qm-notes">Anything else? <span style="font-weight:400;opacity:0.5">(optional)</span></label>' +
          '<textarea class="qm-input qm-textarea" id="qm-notes" placeholder="e.g. pets, access details, special requests…" rows="2" maxlength="500"></textarea>' +
          '<p style="font-size:0.78rem;color:rgba(0,0,0,0.45);margin:6px 0 0;line-height:1.5;">As soon as we receive your details we\'ll put together a quote and give you a call.</p>' +
        '</div>' +
        '<div id="qm-form-error" class="qm-error" style="display:none"></div>' +
        '<button type="button" class="btn-primary qm-submit-btn" id="qm-submit">Get My Free Quote</button>' +
      '</div>';

    // Service pills
    body.querySelectorAll('.qm-svc-pill').forEach(function (btn) {
      btn.addEventListener('click', function () {
        body.querySelectorAll('.qm-svc-pill').forEach(function (b) { b.classList.remove('qm-svc-pill--on'); });
        this.classList.add('qm-svc-pill--on');
        selectedService = this.dataset.value;
        formDirty = true;
      });
    });

    body.querySelectorAll('input, textarea').forEach(function (field) {
      field.addEventListener('input', function () {
        formDirty = true;
      });
    });

    // Enter key advances focus through fields
    advanceOnEnter('qm-name',  'qm-phone');
    advanceOnEnter('qm-phone', 'qm-email');
    advanceOnEnter('qm-email', 'qm-suburb');

    document.getElementById('qm-submit').addEventListener('click', handleSubmit);
  }

  function renderSuccess(email) {
    document.getElementById('qm-title').textContent      = '';
    document.getElementById('qm-step-label').textContent = '';
    document.getElementById('qm-progress-bar').style.width = '100%';

    var body = document.getElementById('qm-body');
    body.style.overflowY = 'hidden';
    body.innerHTML =
      '<div class="qm-success">' +
        '<div class="qm-success__icon">✓</div>' +
        '<h3 class="qm-success__heading">You\'re all set!</h3>' +
        '<p class="qm-success__body">We\'ll call you back <strong>as soon as possible</strong>.</p>' +
        '<p class="qm-success__sub">A confirmation has been sent to <strong>' + escHtml(email) + '</strong>.</p>' +
        '<button class="btn-primary qm-success__btn" id="qm-success-close">Close</button>' +
        '<p class="qm-success__countdown">Closing in <span id="qm-countdown-num">5</span>…</p>' +
      '</div>';

    var count = 5;
    var interval = setInterval(function () {
      count--;
      var el = document.getElementById('qm-countdown-num');
      if (el) el.textContent = count;
      if (count <= 0) { clearInterval(interval); closeModal(); }
    }, 1000);

    var closeBtn = document.getElementById('qm-success-close');
    if (closeBtn) closeBtn.addEventListener('click', function () { clearInterval(interval); closeModal(); });
  }

  /* ─── Submit ─────────────────────────────────────────────────────────── */

  function handleSubmit() {
    if (submitting) return;

    var name   = val('qm-name');
    var phone  = val('qm-phone');
    var email  = val('qm-email');
    var suburb = val('qm-suburb');

    var err = validate(name, phone, email, suburb);
    if (err) { showError(err); return; }

    submitting = true;
    hideError();

    var btn = document.getElementById('qm-submit');
    if (btn) { btn.innerHTML = '<span class="qm-spinner"></span>Sending…'; btn.disabled = true; }

    var notes = val('qm-notes');

    fetch('/api/submit-quote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        full_name:               name.trim(),
        phone:                   phone.trim(),
        email:                   email.trim(),
        suburb:                  suburb.trim(),
        services:                selectedService ? [selectedService] : [],
        notes:                   notes.trim() || null,
      }),
    })
    .then(function (res) {
      return res.json()
        .catch(function () { return { error: 'Server returned an invalid response.' }; })
        .then(function (data) {
          data._httpOk = res.ok;
          data._status = res.status;
          return data;
        });
    })
    .then(function (data) {
      submitting = false;
      if (data._httpOk && data.success) {
        formDirty = false;
        renderSuccess(email.trim());
      } else {
        resetSubmitBtn(btn);
        showError(data.error || 'Something went wrong. Please try again.');
      }
    })
    .catch(function () {
      submitting = false;
      resetSubmitBtn(btn);
      showError('Network error. Please check your connection and try again.');
    });
  }

  /* ─── Validation ─────────────────────────────────────────────────────── */

  function validate(name, phone, email, suburb) {
    if (!name.trim())   return 'Please enter your name.';
    if (!phone.trim())  return 'Please enter your phone number.';
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Please enter a valid email address.';
    if (!suburb.trim()) return 'Please enter your suburb.';
    return null;
  }

  /* ─── Helpers ─────────────────────────────────────────────────────────── */

  function inputField(label, id, type, placeholder, required, autocomplete, maxlength) {
    return '<div class="qm-field">' +
      '<label class="qm-label" for="' + id + '">' + label + (required ? ' <span class="qm-req">*</span>' : '') + '</label>' +
      '<input class="qm-input" type="' + type + '" id="' + id + '"' +
        ' placeholder="' + escHtml(placeholder || '') + '"' +
        (required      ? ' required'                               : '') +
        (autocomplete  ? ' autocomplete="' + autocomplete + '"'   : '') +
        (type === 'tel' ? ' inputmode="tel"'                      : '') +
        (maxlength     ? ' maxlength="' + maxlength + '"'         : '') +
      '>' +
    '</div>';
  }

  function advanceOnEnter(fromId, toId) {
    var el = document.getElementById(fromId);
    if (!el) return;
    el.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.keyCode === 13) {
        e.preventDefault();
        var nxt = document.getElementById(toId);
        if (nxt) nxt.focus();
      }
    });
  }

  function val(id) {
    var el = document.getElementById(id);
    return el ? el.value : '';
  }

  function resetSubmitBtn(btn) {
    if (btn) { btn.textContent = 'Get My Free Quote'; btn.disabled = false; }
  }

  function showError(msg) {
    var el = document.getElementById('qm-form-error');
    if (el) { el.textContent = msg; el.style.display = ''; }
  }

  function hideError() {
    var el = document.getElementById('qm-form-error');
    if (el) el.style.display = 'none';
  }

  function escHtml(str) {
    return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  /* ─── Boot ───────────────────────────────────────────────────────────── */

  document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('[data-open-quote]').forEach(function (btn) {
      btn.addEventListener('click', openModal);
    });

    document.addEventListener('click', function (e) {
      if (e.target.id === 'qm-close')    requestCloseModal();
      if (e.target.id === 'quote-modal') requestCloseModal();
    });

    document.addEventListener('keydown', function (e) {
      var overlay = document.getElementById('quote-modal');
      if (!overlay || overlay.hidden) return;
      if (e.key === 'Escape') requestCloseModal();
    });
  });

  window.QuoteModal = { open: openModal, close: requestCloseModal };
})();
