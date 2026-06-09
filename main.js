(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', function () {
    initStatsCounter();
    initScrollAnimations();
    initContactForm();
    initCustomSelect();
  });

  /* ---- Stats Counter --------------------------------------- */
  function initStatsCounter() {
    const statsSection = document.getElementById('stats');
    if (!statsSection) return;

    const numbers = statsSection.querySelectorAll('.stats__number[data-target]');
    if (!numbers.length) return;

    let animated = false;

    const observer = new IntersectionObserver(function (entries) {
      if (entries[0].isIntersecting && !animated) {
        animated = true;
        numbers.forEach(animateStat);
        observer.disconnect();
      }
    }, { threshold: 0.3 });

    observer.observe(statsSection);
  }

  function animateStat(el) {
    const target = parseFloat(el.dataset.target);
    const suffix = el.dataset.suffix || '';
    const decimals = parseInt(el.dataset.decimal || '0', 10);
    const duration = 2000;
    const start = performance.now();

    function easeOut(t) {
      return 1 - Math.pow(1 - t, 3);
    }

    function formatNumber(val) {
      if (decimals > 0) return val.toFixed(decimals);
      if (val >= 1000) return Math.round(val).toLocaleString('en-AU');
      return Math.round(val).toString();
    }

    function tick(now) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const current = target * easeOut(progress);
      el.textContent = formatNumber(current) + suffix;
      if (progress < 1) requestAnimationFrame(tick);
    }

    requestAnimationFrame(tick);
  }

  /* ---- Scroll Animations ----------------------------------- */
  function initScrollAnimations() {
    const elements = document.querySelectorAll('.animate-on-scroll');
    if (!elements.length) return;

    const observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });

    elements.forEach(function (el) {
      observer.observe(el);
    });
  }

  /* ---- Contact Form ---------------------------------------- */
  function initContactForm() {
    const form = document.getElementById('contact-form');
    const successEl = document.getElementById('contact-success');
    if (!form) return;

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!validateForm(form)) return;

      var btn = form.querySelector('[type="submit"]');
      var originalText = btn.textContent;
      btn.disabled = true;
      btn.textContent = 'Sending…';

      fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        body: new FormData(form)
      })
        .then(function (res) { return res.json(); })
        .then(function (json) {
          if (json.success) {
            showSuccess(form, successEl);
          } else {
            btn.disabled = false;
            btn.textContent = originalText;
            showFormSubmitError(form, 'Something went wrong — please try again.');
          }
        })
        .catch(function () {
          btn.disabled = false;
          btn.textContent = originalText;
          showFormSubmitError(form, 'Could not send — please call us on 0497 828 838.');
        });
    });

    form.querySelectorAll('.form-input').forEach(function (input) {
      input.addEventListener('input', function () {
        clearError(input);
      });
    });
  }

  function showFormSubmitError(form, msg) {
    var el = form.querySelector('.form-submit-error');
    if (!el) {
      el = document.createElement('p');
      el.className = 'form-submit-error';
      el.style.cssText = 'color:#dc2626;font-size:0.875rem;margin-top:0.5rem;text-align:center;';
      form.querySelector('[type="submit"]').insertAdjacentElement('afterend', el);
    }
    el.textContent = msg;
  }

  function validateForm(form) {
    let valid = true;

    const name = form.querySelector('#name');
    const phone = form.querySelector('#phone');
    const email = form.querySelector('#email');

    if (!name.value.trim()) {
      showError(name, 'name-error');
      valid = false;
    }

    if (!phone.value.trim()) {
      showError(phone, 'phone-error');
      valid = false;
    }

    if (!email.value.trim() || !isValidEmail(email.value)) {
      showError(email, 'email-error');
      valid = false;
    }

    return valid;
  }

  function showError(input, errorId) {
    input.classList.add('form-input--error');
    input.setAttribute('aria-invalid', 'true');
    const errorEl = document.getElementById(errorId);
    if (errorEl) {
      errorEl.classList.add('is-visible');
    }
  }

  function clearError(input) {
    input.classList.remove('form-input--error');
    input.setAttribute('aria-invalid', 'false');
    const errorId = input.id + '-error';
    const errorEl = document.getElementById(errorId);
    if (errorEl) {
      errorEl.classList.remove('is-visible');
    }
  }

  function isValidEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }

  function showSuccess(form, successEl) {
    form.setAttribute('hidden', '');
    if (successEl) {
      successEl.removeAttribute('hidden');
      successEl.focus();
    }
  }

  /* ---- Custom Select Dropdown ------------------------------ */
  function initCustomSelect() {
    var wrap = document.getElementById('service-select');
    if (!wrap) return;
    var trigger = wrap.querySelector('.c-select__trigger');
    var valEl = wrap.querySelector('.c-select__val');
    var nativeSel = document.getElementById('service');
    var options = wrap.querySelectorAll('.c-select__option');

    function open() {
      wrap.classList.add('is-open');
      trigger.setAttribute('aria-expanded', 'true');
    }
    function close() {
      wrap.classList.remove('is-open');
      trigger.setAttribute('aria-expanded', 'false');
    }

    trigger.addEventListener('click', function () {
      wrap.classList.contains('is-open') ? close() : open();
    });

    options.forEach(function (opt) {
      opt.addEventListener('click', function () {
        var val = opt.dataset.value;
        var label = opt.querySelector('.c-select__opt-label').textContent.trim();
        valEl.textContent = label;
        nativeSel.value = val;
        options.forEach(function (o) { o.classList.remove('is-selected'); });
        opt.classList.add('is-selected');
        wrap.classList.add('has-value');
        close();
      });
    });

    document.addEventListener('click', function (e) {
      if (!wrap.contains(e.target)) close();
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && wrap.classList.contains('is-open')) close();
    });
  }

})();
