(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', function () {
    initStatsCounter();
    initScrollAnimations();
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

})();
