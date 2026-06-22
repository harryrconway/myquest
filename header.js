(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', function () {
    initScrollBehavior();
    initActiveNavLink();
    initMobileMenu();
  });

  function initScrollBehavior() {
    const header = document.querySelector('.site-header');
    if (!header) return;

    function onScroll() {
      header.classList.toggle('is-scrolled', window.scrollY > 10);
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  function initActiveNavLink() {
    const links = document.querySelectorAll('.header-nav__link');
    if (!links.length) return;

    const hash = window.location.hash;
    const path = window.location.pathname;

    links.forEach(function (link) {
      const href = link.getAttribute('href');
      if (!href) return;

      const isHome = !hash && (path.endsWith('index.html') || path === '/' || path.endsWith('/')) && (href === 'index.html' || href === '/');
      const isHashMatch = hash && href === hash;

      if (isHome || isHashMatch) {
        link.classList.add('is-active');
      }
    });
  }

  function initMobileMenu() {
    const hamburger = document.querySelector('.hamburger');
    const menu = document.getElementById('mobile-menu');
    const closeBtn = document.querySelector('.mobile-menu__close');
    const backdrop = document.getElementById('mobile-menu-backdrop');
    const menuLinks = document.querySelectorAll('.mobile-menu__list a, .mobile-menu__footer a, .mobile-menu__staff-login');

    if (!hamburger || !menu) return;

    function openMenu() {
      menu.classList.add('is-open');
      menu.setAttribute('aria-hidden', 'false');
      hamburger.setAttribute('aria-expanded', 'true');
      document.body.classList.add('menu-open');
      if (closeBtn) closeBtn.focus();
      trapFocus(menu);
    }

    function closeMenu() {
      menu.classList.remove('is-open');
      menu.setAttribute('aria-hidden', 'true');
      hamburger.setAttribute('aria-expanded', 'false');
      document.body.classList.remove('menu-open');
      hamburger.focus();
    }

    function trapFocus(container) {
      const focusable = container.querySelectorAll(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      if (!focusable.length) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      function handleTab(e) {
        if (e.key !== 'Tab') return;
        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }

      container.addEventListener('keydown', handleTab);
    }

    hamburger.addEventListener('click', openMenu);

    if (closeBtn) {
      closeBtn.addEventListener('click', closeMenu);
    }

    if (backdrop) {
      backdrop.addEventListener('click', closeMenu);
    }

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && menu.classList.contains('is-open')) {
        closeMenu();
      }
    });

    menuLinks.forEach(function (link) {
      link.addEventListener('click', closeMenu);
    });
  }

})();
