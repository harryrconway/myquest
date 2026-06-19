/* Public site — 4-step quote request modal */

(function () {
  'use strict';

  var state = {};
  var currentStep = 0;
  var totalSteps  = 3;
  var submitting  = false;
  var stepDir     = 1;

  var onNext = function () { next(); };
  var onBack = function () { back(); };
  var currentMobPanel = 'qm-mob-addr'; // which sub-panel is active when on step 1

  var STEPS = [
    { id: 'details',  title: 'Your Details'    },
    { id: 'property', title: 'Your Property'   },
    { id: 'schedule', title: 'Schedule & Notes' },
  ];

  var PROPERTY_TYPES = [
    { value: 'House',     label: 'House'     },
    { value: 'Apartment', label: 'Apartment' },
    { value: 'Townhouse', label: 'Townhouse' },
    { value: 'Office',    label: 'Office'    },
    { value: 'Retail',    label: 'Retail'    },
    { value: 'Medical',   label: 'Medical'   },
    { value: 'Warehouse', label: 'Warehouse' },
    { value: 'Other',     label: 'Other'     },
  ];

  var SERVICES = [
    'General', 'Deep', 'Office', 'Window', 'Other (please specify)',
  ];

  var DAYS      = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  var AU_STATES = ['ACT', 'NSW', 'NT', 'QLD', 'SA', 'TAS', 'VIC', 'WA'];

  /* ─── Open / Close ───────────────────────────────────────────────────── */

  var _savedScrollY = 0;

  function openModal() {
    resetState();
    loadDraft();
    currentStep = 0;
    currentMobPanel = 'qm-mob-addr';
    stepDir = 1;
    renderStep();

    var overlay = document.getElementById('quote-modal');
    overlay.hidden = false;
    overlay.removeAttribute('aria-hidden');

    // Lock body scroll — position:fixed works on iOS (overflow:hidden alone doesn't)
    _savedScrollY = window.scrollY || window.pageYOffset || 0;
    document.body.style.position = 'fixed';
    document.body.style.top      = -_savedScrollY + 'px';
    document.body.style.width    = '100%';

    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        overlay.classList.add('qm--open');
      });
    });
    document.getElementById('qm-close').focus();

    buildSidebar();
  }

  function closeModal() {
    // Restore body scroll
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

  function resetState() {
    state = {
      full_name: '', phone: '', email: '', preferred_contact: '',
      street_address: '', suburb: '', state: '', postcode: '', access_instructions: '',
      property_type: '',
      bedrooms: 1, bathrooms: 1, living_areas: 1,
      services: [], other_service_detail: '', frequency: '', condition: '',
      preferred_days: [], preferred_time: '', flexible_schedule: false,
      notes: '',
    };
  }

  var DRAFT_KEY = 'mq_quote_draft';
  function saveDraft()  { try { localStorage.setItem(DRAFT_KEY, JSON.stringify(state)); } catch(e){} }
  function loadDraft()  { try { var s = localStorage.getItem(DRAFT_KEY); if (s) Object.assign(state, JSON.parse(s)); } catch(e){} }
  function clearDraft() { try { localStorage.removeItem(DRAFT_KEY); } catch(e){} }

  /* ─── Sidebar ─────────────────────────────────────────────────────────── */

  function buildSidebar() {
    var nav = document.getElementById('qm-sidebar-steps');
    if (!nav) return;
    nav.innerHTML = STEPS.map(function (s, i) {
      return '<div class="qm-sn-item" id="qm-sn-' + i + '">' +
        '<div class="qm-sn-item__left">' +
          '<div class="qm-sn-item__circle">' + (i + 1) + '</div>' +
          '<div class="qm-sn-item__connector"></div>' +
        '</div>' +
        '<div class="qm-sn-item__label">' + escHtml(s.title) + '</div>' +
      '</div>';
    }).join('');
    updateSidebar(0);
  }

  function updateSidebar(step) {
    STEPS.forEach(function (_, i) {
      var item = document.getElementById('qm-sn-' + i);
      if (!item) return;
      item.classList.remove('qm-sn-item--active', 'qm-sn-item--done');
      var circle = item.querySelector('.qm-sn-item__circle');
      if (i < step) {
        item.classList.add('qm-sn-item--done');
        if (circle) circle.textContent = '✓';
      } else if (i === step) {
        item.classList.add('qm-sn-item--active');
        if (circle) circle.textContent = i + 1;
      } else {
        if (circle) circle.textContent = i + 1;
      }
    });
  }

  /* ─── Render ──────────────────────────────────────────────────────────── */

  function setProgress() {
    // Derive tab index (0–3) from current step + panel, so counter matches the 4-tab bar
    var tabIdx = currentStep === 0 ? 0
               : currentStep === 1 ? (currentMobPanel === 'qm-mob-prop' ? 2 : 1)
               : 3;
    var totalTabs = 4;
    var pct = Math.round((tabIdx / totalTabs) * 100);
    var bar = document.getElementById('qm-progress-bar');
    var lbl = document.getElementById('qm-step-label');
    if (bar) bar.style.width = pct + '%';
    if (lbl) lbl.textContent = 'Step ' + (tabIdx + 1) + ' of ' + totalTabs;
    updateSidebar(tabIdx);
  }

  function renderStep() {
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();

    var card = document.querySelector('.qm-card');
    if (card) card.classList.remove('qm-card--review');
    var body = document.getElementById('qm-body');
    body.innerHTML = buildStep(currentStep);

    // On step 1 activate correct sub-panel (set by tab or default)
    if (currentStep === 1) {
      body.querySelectorAll('.qm-mob-panel').forEach(function (p) { p.classList.remove('qm-mob-panel--active'); });
      var ap = body.querySelector('#' + currentMobPanel);
      if (ap) ap.classList.add('qm-mob-panel--active');
    }

    // Lock scroll — content is compressed to fit viewport
    body.style.overflowY = 'hidden';
    body.style.webkitOverflowScrolling = '';

    var stepEl = body.firstElementChild;
    if (stepEl) stepEl.classList.add(stepDir > 0 ? 'qm-step--in-right' : 'qm-step--in-left');

    setProgress();
    document.getElementById('qm-title').textContent = STEPS[currentStep].title;

    var footer = document.getElementById('qm-footer');
    // Tab bar replaces Back/Next on all screen sizes
    if (footer) footer.style.display = 'none';
    renderTabBar();

    wireStep(currentStep);

    body.scrollTop = 0;
    requestAnimationFrame(function () {
      body.scrollTop = 0;
      requestAnimationFrame(function () { body.scrollTop = 0; });
    });
  }

  function isMobTabComplete(tabIdx) {
    if (tabIdx === 0) {
      return !!(state.full_name.trim() &&
                state.phone.replace(/\D/g, '').length >= 8 &&
                state.email.trim() && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(state.email));
    }
    if (tabIdx === 1) {
      return !!(state.street_address.trim() && state.suburb.trim() && state.state &&
                /^\d{4}$/.test(state.postcode.trim()));
    }
    if (tabIdx === 2) {
      return !!(state.property_type && state.services.length > 0 && state.frequency && state.condition);
    }
    return false; // Schedule — all optional
  }

  function refreshTabCompletion() {
    var tabBar = document.getElementById('qm-mob-tab-bar');
    if (!tabBar) return;
    tabBar.querySelectorAll('.qm-mob-segtab').forEach(function (btn, i) {
      var done   = isMobTabComplete(i);
      var active = btn.classList.contains('qm-mob-segtab--active');
      btn.classList.toggle('qm-mob-segtab--done', done && !active);
    });
  }

  var GATE_MSGS = [
    'Please fill in your name, phone and email first.',
    'Please complete your address before continuing.',
    'Please complete your property details first.',
  ];

  function showTabGateToast(msg) {
    var existing = document.getElementById('qm-tab-gate-toast');
    if (existing) existing.parentNode.removeChild(existing);
    var card = document.querySelector('.qm-card');
    if (!card) return;
    var toast = document.createElement('div');
    toast.id = 'qm-tab-gate-toast';
    toast.className = 'qm-tab-gate-toast';
    toast.textContent = msg;
    card.appendChild(toast);
    requestAnimationFrame(function () {
      toast.classList.add('qm-tab-gate-toast--show');
      setTimeout(function () {
        toast.classList.remove('qm-tab-gate-toast--show');
        setTimeout(function () { if (toast.parentNode) toast.parentNode.removeChild(toast); }, 300);
      }, 2400);
    });
  }

  function renderTabBar() {
    var tabBar = document.getElementById('qm-mob-tab-bar');
    if (!tabBar) return;

    // 4 tabs: You | Address | Property | Schedule
    var tabs = [
      { label: 'You',      step: 0, panel: null           },
      { label: 'Address',  step: 1, panel: 'qm-mob-addr'  },
      { label: 'Property', step: 1, panel: 'qm-mob-prop'  },
      { label: 'Schedule', step: 2, panel: null           },
    ];

    var activeIdx = currentStep === 0 ? 0
                  : currentStep === 1 ? (currentMobPanel === 'qm-mob-prop' ? 2 : 1)
                  : 3;

    tabBar.innerHTML = tabs.map(function (t, i) {
      var active = i === activeIdx;
      var done   = isMobTabComplete(i);
      var cls    = 'qm-mob-segtab';
      if (active)       cls += ' qm-mob-segtab--active';
      else if (done)    cls += ' qm-mob-segtab--done';
      return '<button type="button" class="' + cls + '"' +
             ' data-step="' + t.step + '" data-panel="' + (t.panel || '') + '">' +
             '<span class="qm-segtab-num">' + (i + 1) + '</span>' +
             '<span class="qm-segtab-lbl">' + escHtml(t.label) + '</span>' +
             '</button>';
    }).join('');
    tabBar.style.display = 'flex';

    tabBar.querySelectorAll('.qm-mob-segtab').forEach(function (btn, btnIdx) {
      btn.addEventListener('click', function () {
        var targetStep  = parseInt(this.dataset.step);
        var targetPanel = this.dataset.panel || null;
        var targetIdx   = btnIdx;

        // Gate: moving forward requires all prior tabs to be complete
        if (targetIdx > activeIdx) {
          for (var g = 0; g < targetIdx && g < 3; g++) {
            if (!isMobTabComplete(g)) {
              showTabGateToast(GATE_MSGS[g]);
              return;
            }
          }
        }

        if (targetStep === currentStep && targetPanel && targetPanel !== currentMobPanel) {
          // Same step 1 — switch Address ↔ Property panel
          currentMobPanel = targetPanel;
          tabBar.querySelectorAll('.qm-mob-segtab').forEach(function (b) {
            b.classList.remove('qm-mob-segtab--active');
          });
          this.classList.add('qm-mob-segtab--active');
          this.classList.remove('qm-mob-segtab--done');
          var body = document.getElementById('qm-body');
          body.querySelectorAll('.qm-mob-panel').forEach(function (p) { p.classList.remove('qm-mob-panel--active'); });
          var panel = body.querySelector('#' + currentMobPanel);
          if (panel) panel.classList.add('qm-mob-panel--active');
          setProgress();
          refreshTabCompletion();
        } else if (targetStep !== currentStep) {
          saveDraft();
          stepDir = targetStep > currentStep ? 1 : -1;
          currentStep     = targetStep;
          currentMobPanel = targetPanel || (targetStep === 1 ? 'qm-mob-addr' : 'qm-mob-addr');
          renderStep();
        }
      });
    });
  }

  function buildStep(n) {
    switch (n) {
      case 0: return stepDetails();
      case 1: return stepProperty();
      case 2: return stepScheduleNotes();
    }
  }

  /* ─── Step builders ───────────────────────────────────────────────────── */

  function stepDetails() {
    return '<div class="qm-step qm-step--details">' +
      '<p class="qm-details-lead">Just a few details so we can reach you.</p>' +
      '<div class="qm-field">' +
        '<label class="qm-label" for="qm-name">Full Name <span class="qm-req">*</span></label>' +
        '<input class="qm-input" type="text" id="qm-name"' +
          ' value="' + escHtml(state.full_name) + '" placeholder="Your full name"' +
          ' autocomplete="name" inputmode="text">' +
      '</div>' +
      field('Mobile', 'qm-phone', 'tel', state.phone, '04XX XXX XXX', true, null, 'tel') +
      field('Email', 'qm-email', 'email', state.email, 'you@example.com', true) +
      '<div class="qm-contact-card">' +
        '<label class="qm-label">How should we reach you?</label>' +
        radioRow('preferred_contact', [
          { value: 'Phone', label: 'Phone' },
          { value: 'SMS',   label: 'SMS'   },
          { value: 'Email', label: 'Email' },
        ], state.preferred_contact) +
      '</div>' +
    '</div>';
  }

  var CONDITION_DISPLAY = {
    'Excellent': 'Excellent', 'Good': 'Good', 'Average': 'Average',
    'Requires Deep Clean': 'Needs Deep Clean',
  };

  function stepProperty() {
    var servicesVal = state.services.length
      ? state.services.map(function (s) { return s === 'Other (please specify)' ? 'Other' : s; }).join(', ')
      : 'Select services…';
    var hasOther = state.services.indexOf('Other (please specify)') !== -1;

    return '<div class="qm-step">' +

      // Left column: Address
      '<div class="qm-step-col qm-mob-panel qm-mob-panel--active" id="qm-mob-addr">' +
        '<p class="qm-step-col-title">Address</p>' +
        field('Street Address', 'qm-street', 'text', state.street_address, '123 Example St', false, 'address-line1') +
        '<div class="qm-row-2">' +
          field('Suburb', 'qm-suburb', 'text', state.suburb, 'Suburb', false, 'address-level2') +
          '<div class="qm-field" style="position:relative">' +
            '<label class="qm-label">State</label>' +
            '<div class="qm-dropdown qm-dropdown--down' + (state.state ? '' : ' qm-dropdown--placeholder') + '" id="qm-state-dd">' +
              '<div class="qm-dropdown__trigger" id="qm-state-trigger">' +
                '<span id="qm-state-val">' + (state.state ? escHtml(state.state) : 'Select…') + '</span>' +
                '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><polyline points="6 9 12 15 18 9"/></svg>' +
              '</div>' +
              '<div class="qm-dropdown__list" id="qm-state-list">' +
                AU_STATES.map(function (s) {
                  return '<div class="qm-dropdown__opt' + (state.state === s ? ' qm-dropdown__opt--sel' : '') + '" data-val="' + s + '">' + s + '</div>';
                }).join('') +
              '</div>' +
            '</div>' +
          '</div>' +
        '</div>' +
        field('Postcode', 'qm-postcode', 'text', state.postcode, '3000', false, 'postal-code', 'tel') +
        field('Access Instructions', 'qm-access', 'text', state.access_instructions, 'Gate code, key location…', false, 'off') +
      '</div>' +

      // Right column: Property Type + Details + Services + Frequency + Condition
      '<div class="qm-step-col qm-mob-panel" id="qm-mob-prop">' +
        '<p class="qm-step-col-title">Property Type</p>' +
        '<div class="qm-grid-type">' +
          PROPERTY_TYPES.map(function (pt) {
            var sel = state.property_type === pt.value ? ' qm-tile--selected' : '';
            return '<button type="button" class="qm-tile' + sel + '" data-value="' + pt.value + '">' +
              '<span class="qm-tile__label">' + pt.label + '</span>' +
            '</button>';
          }).join('') +
        '</div>' +
        '<p class="qm-step-col-title" style="margin-top:6px">Property Details</p>' +
        '<div class="qm-stepper-grid">' +
          stepperField('Bedrooms',     'qm-beds',   'bedrooms',     20) +
          stepperField('Bathrooms',    'qm-baths',  'bathrooms',    20) +
          stepperField('Living Areas', 'qm-living', 'living_areas', 10) +
        '</div>' +
        '<p class="qm-helper">Lounges, dining rooms, studies, etc.</p>' +

        // Services multi-select dropdown
        '<p class="qm-step-col-title" style="margin-top:6px">Services Required</p>' +
        '<div class="qm-field" style="position:relative">' +
          '<div class="qm-dropdown' + (!state.services.length ? ' qm-dropdown--placeholder' : '') + '" id="qm-services-dd">' +
            '<div class="qm-dropdown__trigger" id="qm-services-trigger">' +
              '<span id="qm-services-val">' + escHtml(servicesVal) + '</span>' +
              '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><polyline points="6 9 12 15 18 9"/></svg>' +
            '</div>' +
            '<div class="qm-dropdown__list" id="qm-services-list">' +
              SERVICES.map(function (s) {
                var sel = state.services.indexOf(s) !== -1;
                var lbl = s === 'Other (please specify)' ? 'Other' : s;
                return '<div class="qm-dropdown__opt qm-dropdown__opt--multi' + (sel ? ' qm-dropdown__opt--sel' : '') + '" data-val="' + escHtml(s) + '">' +
                  escHtml(lbl) +
                '</div>';
              }).join('') +
            '</div>' +
          '</div>' +
        '</div>' +
        '<div id="qm-other-service-wrap"' + (!hasOther ? ' hidden' : '') + '>' +
          field('Please describe', 'qm-other-service', 'text', state.other_service_detail, 'Describe what you need…', false) +
        '</div>' +

        // Frequency single-select dropdown
        '<p class="qm-step-col-title" style="margin-top:4px">How Often?</p>' +
        '<div class="qm-field" style="position:relative">' +
          '<div class="qm-dropdown' + (!state.frequency ? ' qm-dropdown--placeholder' : '') + '" id="qm-freq-dd">' +
            '<div class="qm-dropdown__trigger" id="qm-freq-trigger">' +
              '<span id="qm-freq-val">' + escHtml(state.frequency || 'Select frequency…') + '</span>' +
              '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><polyline points="6 9 12 15 18 9"/></svg>' +
            '</div>' +
            '<div class="qm-dropdown__list" id="qm-freq-list">' +
              ['One-Time', 'Weekly', 'Fortnightly', 'Monthly', 'Not sure yet'].map(function (f) {
                return '<div class="qm-dropdown__opt' + (state.frequency === f ? ' qm-dropdown__opt--sel' : '') + '" data-val="' + escHtml(f) + '">' + escHtml(f) + '</div>';
              }).join('') +
            '</div>' +
          '</div>' +
        '</div>' +

        // Condition single-select dropdown
        '<p class="qm-step-col-title" style="margin-top:4px">Property Condition</p>' +
        '<div class="qm-field" style="position:relative">' +
          '<div class="qm-dropdown' + (!state.condition ? ' qm-dropdown--placeholder' : '') + '" id="qm-cond-dd">' +
            '<div class="qm-dropdown__trigger" id="qm-cond-trigger">' +
              '<span id="qm-cond-val">' + escHtml(state.condition ? (CONDITION_DISPLAY[state.condition] || state.condition) : 'Select condition…') + '</span>' +
              '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><polyline points="6 9 12 15 18 9"/></svg>' +
            '</div>' +
            '<div class="qm-dropdown__list" id="qm-cond-list">' +
              [
                { v: 'Excellent',           l: 'Excellent'       },
                { v: 'Good',                l: 'Good'            },
                { v: 'Average',             l: 'Average'         },
                { v: 'Requires Deep Clean', l: 'Needs Deep Clean'},
              ].map(function (c) {
                return '<div class="qm-dropdown__opt' + (state.condition === c.v ? ' qm-dropdown__opt--sel' : '') + '" data-val="' + escHtml(c.v) + '" data-label="' + escHtml(c.l) + '">' + escHtml(c.l) + '</div>';
              }).join('') +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>' +

    '</div>';
  }

  var TIME_OPTIONS = [
    { value: 'Morning (7am–12pm)',   label: 'Morning',   range: '7am – 12pm' },
    { value: 'Afternoon (12pm–5pm)', label: 'Afternoon', range: '12pm – 5pm' },
    { value: 'Evening (5pm–8pm)',    label: 'Evening',   range: '5pm – 8pm'  },
    { value: 'Flexible',             label: 'Flexible',  range: 'Any time'   },
  ];

  function stepScheduleNotes() {
    var wc = countWords(state.notes);
    return '<div class="qm-step">' +
      '<p class="qm-section-title">Preferred Schedule</p>' +
      '<div class="qm-field">' +
        '<label class="qm-label">Preferred Days</label>' +
        '<div class="qm-day-row">' +
          DAYS.map(function (d) {
            var checked = state.preferred_days.indexOf(d) !== -1;
            return '<label class="qm-day' + (checked ? ' qm-day--on' : '') + '">' +
              '<input type="checkbox" class="qm-day__cb" value="' + d + '"' + (checked ? ' checked' : '') + '> ' + d +
            '</label>';
          }).join('') +
        '</div>' +
      '</div>' +
      '<div class="qm-field">' +
        '<label class="qm-label">Preferred Time</label>' +
        '<div class="qm-time-grid">' +
          TIME_OPTIONS.map(function (t) {
            var sel = state.preferred_time === t.value ? ' qm-time-pill--on' : '';
            return '<label class="qm-time-pill' + sel + '">' +
              '<input type="radio" name="preferred_time" value="' + escHtml(t.value) + '"' + (state.preferred_time === t.value ? ' checked' : '') + '>' +
              '<span class="qm-time-pill__label">' + escHtml(t.label) + '</span>' +
              '<span class="qm-time-pill__range">' + escHtml(t.range) + '</span>' +
            '</label>';
          }).join('') +
        '</div>' +
      '</div>' +
      '<label class="qm-check-row">' +
        '<input type="checkbox" id="qm-flexible"' + (state.flexible_schedule ? ' checked' : '') + '> ' +
        '<span>I\'m flexible — contact me to arrange</span>' +
      '</label>' +
      '<p class="qm-section-title">Additional Notes</p>' +
      '<div class="qm-field">' +
        '<label class="qm-label" for="qm-notes">Optional — anything else we should know</label>' +
        '<textarea class="qm-input qm-textarea" id="qm-notes" placeholder="Special requests, parking, pets, access details…" rows="3">' + escHtml(state.notes) + '</textarea>' +
        '<div class="qm-word-count' + (wc >= 100 ? ' qm-word-count--full' : wc >= 80 ? ' qm-word-count--near' : '') + '" id="qm-word-count"><span id="qm-wc-num">' + wc + '</span>/100 words</div>' +
      '</div>' +
      '<div class="qm-mob-review-cta">' +
        '<button type="button" class="btn-primary" id="qm-mob-review-btn" style="width:100%;padding:14px;">Review &amp; Submit →</button>' +
      '</div>' +
    '</div>';
  }

  function countWords(str) {
    var s = (str || '').trim();
    return s ? s.split(/\s+/).length : 0;
  }

  /* ─── Review & Submit ─────────────────────────────────────────────────── */

  var REVIEW_STEP_MAP = {
    'Name': 0, 'Phone': 0, 'Email': 0, 'Preferred contact': 0,
    'Address': 1, 'Access': 1, 'Property type': 1,
    'Bedrooms': 1, 'Bathrooms': 1, 'Living areas': 1,
    'Services': 1, 'Frequency': 1, 'Condition': 1,
    'Preferred days': 2, 'Preferred time': 2, 'Flexible schedule': 2, 'Notes': 2,
  };

  var REVIEW_PANEL_MAP = {
    'Address': 'qm-mob-addr', 'Access': 'qm-mob-addr',
    'Property type': 'qm-mob-prop', 'Bedrooms': 'qm-mob-prop', 'Bathrooms': 'qm-mob-prop',
    'Living areas': 'qm-mob-prop', 'Services': 'qm-mob-prop', 'Frequency': 'qm-mob-prop',
    'Condition': 'qm-mob-prop',
  };

  function renderReview() {
    var body    = document.getElementById('qm-body');
    var backBtn = document.getElementById('qm-back');
    var nextBtn = document.getElementById('qm-next');

    document.getElementById('qm-title').textContent = 'Review Your Request';
    document.getElementById('qm-step-label').textContent = 'Almost done!';
    document.getElementById('qm-progress-bar').style.width = '100%';
    updateSidebar(totalSteps); // mark all steps done

    // Hide tab bar, reveal footer for Review/Submit (all screen sizes)
    var tabBar = document.getElementById('qm-mob-tab-bar');
    var footer = document.getElementById('qm-footer');
    if (tabBar) { tabBar.style.display = 'none'; tabBar.innerHTML = ''; }
    if (footer) footer.style.display = '';

    backBtn.style.display = '';
    backBtn.textContent   = 'Back';
    nextBtn.textContent   = 'Submit Quote Request';
    nextBtn.disabled      = false;

    var rows = [];
    function r(label, val) {
      if (!val) return;
      var step  = REVIEW_STEP_MAP[label];
      var panel = REVIEW_PANEL_MAP[label] || '';
      var stepAttr  = step  !== undefined ? ' data-step="'  + step  + '"' : '';
      var panelAttr = panel ? ' data-panel="' + panel + '"' : '';
      rows.push(
        '<tr class="qm-rv__row"' + stepAttr + panelAttr + ' title="Edit ' + escHtml(label) + '">' +
          '<td class="qm-rv__label">' + escHtml(label) + '</td>' +
          '<td class="qm-rv__val">' + escHtml(String(val)) + '</td>' +
          '<td class="qm-rv__edit">›</td>' +
        '</tr>'
      );
    }

    r('Name', state.full_name);
    r('Phone', state.phone);
    r('Email', state.email);
    r('Preferred contact', state.preferred_contact);
    r('Address', [state.street_address, state.suburb, state.state, state.postcode].filter(Boolean).join(', '));
    r('Access', state.access_instructions);
    r('Property type', state.property_type);
    r('Bedrooms', state.bedrooms);
    r('Bathrooms', state.bathrooms);
    r('Living areas', state.living_areas);

    var serviceDisplay = state.services.map(function (s) {
      return s === 'Other (please specify)' && state.other_service_detail
        ? 'Other: ' + state.other_service_detail : s;
    }).join(', ');
    r('Services', serviceDisplay);

    r('Frequency', state.frequency);
    r('Condition', state.condition);
    r('Preferred days', state.preferred_days.join(', '));
    r('Preferred time', state.preferred_time);
    r('Flexible schedule', state.flexible_schedule ? 'Yes' : '');
    r('Notes', state.notes);

    body.innerHTML =
      '<div class="qm-step qm-review">' +
        '<p class="qm-rv__hint">Tap any row to edit</p>' +
        '<table class="qm-rv">' + rows.join('') + '</table>' +
        '<div id="qm-submit-error" class="qm-error" style="display:none"></div>' +
      '</div>';
    body.scrollTop = 0;
    body.style.overflowY = 'hidden';
    body.style.webkitOverflowScrolling = '';

    var card = document.querySelector('.qm-card');
    if (card) card.classList.add('qm-card--review');

    body.querySelectorAll('.qm-rv__row[data-step]').forEach(function (row) {
      row.addEventListener('click', function () {
        var step  = parseInt(this.dataset.step);
        var panel = this.dataset.panel || '';
        currentStep = step;
        if (panel) currentMobPanel = panel;
        else if (step === 1) currentMobPanel = 'qm-mob-addr';
        onNext = function () { next(); };
        onBack = function () { back(); };
        renderStep();
      });
    });
  }

  function renderSuccess() {
    clearDraft();
    var body   = document.getElementById('qm-body');
    var footer = document.getElementById('qm-footer');
    footer.style.display = 'none';
    document.getElementById('qm-title').textContent = '';
    document.getElementById('qm-step-label').textContent = '';
    document.getElementById('qm-progress-bar').style.width = '100%';

    body.innerHTML =
      '<div class="qm-step qm-success">' +
        '<div class="qm-success__icon">✓</div>' +
        '<h3 class="qm-success__heading">Request submitted!</h3>' +
        '<p class="qm-success__body">We\'ve received your quote request. A member of our team will be in touch within <strong>2 hours</strong>.</p>' +
        '<p class="qm-success__sub">Check your inbox — we\'ve sent a confirmation to <strong>' + escHtml(state.email) + '</strong>.</p>' +
        '<button class="btn-primary qm-success__btn" id="qm-success-close">Close</button>' +
        '<p class="qm-success__countdown">Closing in <span id="qm-countdown-num">5</span>…</p>' +
      '</div>';

    var count = 5;
    var interval = setInterval(function () {
      count--;
      var numEl = document.getElementById('qm-countdown-num');
      if (numEl) numEl.textContent = count;
      if (count <= 0) {
        clearInterval(interval);
        closeModal();
        setTimeout(function () { window.scrollTo({ top: 0, behavior: 'smooth' }); }, 300);
      }
    }, 1000);

    var closeSuccessBtn = document.getElementById('qm-success-close');
    if (closeSuccessBtn) closeSuccessBtn.addEventListener('click', function () {
      clearInterval(interval);
      closeModal();
      setTimeout(function () { window.scrollTo({ top: 0, behavior: 'smooth' }); }, 300);
    });
  }

  /* ─── Wire interactivity ─────────────────────────────────────────────── */

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

  function advanceAfterLen(fromId, toId, len) {
    var el = document.getElementById(fromId);
    if (!el) return;
    el.addEventListener('input', function () {
      if (this.value.length >= len) {
        var nxt = document.getElementById(toId);
        if (nxt) nxt.focus();
      }
    });
  }


  function wireStep(n) {
    switch (n) {
      case 0:
        bind('qm-name',  'input', function () { state.full_name = this.value; refreshTabCompletion(); });
        bind('qm-phone', 'input', function () { state.phone = this.value;     refreshTabCompletion(); });
        bind('qm-email', 'input', function () { state.email = this.value;     refreshTabCompletion(); });
        bindRadios('preferred_contact', function (v) { state.preferred_contact = v; });
        advanceOnEnter('qm-name', 'qm-phone');
        advanceAfterLen('qm-phone', 'qm-email', 10);
        break;

      case 1:
        bind('qm-street', 'input', function () {
          var prev = state.street_address;
          state.street_address = this.value;
          refreshTabCompletion();
          if (this.value.length - prev.length > 4) {
            var suburbEl = document.getElementById('qm-suburb');
            if (suburbEl) suburbEl.focus();
          }
        });
        bind('qm-suburb',  'input', function () { state.suburb   = this.value; refreshTabCompletion(); });
        bind('qm-postcode','input', function () { state.postcode = this.value; refreshTabCompletion(); });
        bind('qm-access',  'input', function () { state.access_instructions = this.value; });
        advanceOnEnter('qm-suburb', 'qm-postcode');
        advanceAfterLen('qm-postcode', 'qm-access', 4);
        // State dropdown
        (function () {
          var dd      = document.getElementById('qm-state-dd');
          var trigger = document.getElementById('qm-state-trigger');
          var list    = document.getElementById('qm-state-list');
          var valEl   = document.getElementById('qm-state-val');
          if (!dd || !trigger || !list || !valEl) return;
          function closeDropdown() {
            dd.classList.remove('qm-dropdown--open');
            document.removeEventListener('click', closeOnOutside, true);
          }
          function closeOnOutside(e) {
            if (!dd.contains(e.target)) closeDropdown();
          }
          trigger.addEventListener('click', function (e) {
            e.stopPropagation();
            if (dd.classList.contains('qm-dropdown--open')) {
              closeDropdown();
            } else {
              dd.classList.add('qm-dropdown--open');
              document.addEventListener('click', closeOnOutside, true);
            }
          });
          list.querySelectorAll('.qm-dropdown__opt').forEach(function (opt) {
            opt.addEventListener('click', function (e) {
              e.stopPropagation();
              state.state = opt.dataset.val;
              valEl.textContent = opt.dataset.val;
              dd.classList.remove('qm-dropdown--placeholder');
              list.querySelectorAll('.qm-dropdown__opt').forEach(function (o) { o.classList.remove('qm-dropdown__opt--sel'); });
              opt.classList.add('qm-dropdown__opt--sel');
              closeDropdown();
              refreshTabCompletion();
            });
          });
        })();
        // Property type tiles
        document.querySelectorAll('.qm-tile').forEach(function (tile) {
          tile.addEventListener('click', function () {
            document.querySelectorAll('.qm-tile').forEach(function (t) { t.classList.remove('qm-tile--selected'); });
            this.classList.add('qm-tile--selected');
            state.property_type = this.dataset.value;
            refreshTabCompletion();
          });
        });
        // Room steppers
        wireStepperField('qm-beds',   'bedrooms',     20);
        wireStepperField('qm-baths',  'bathrooms',    20);
        wireStepperField('qm-living', 'living_areas', 10);
        // Services multi-select dropdown
        (function () {
          var dd      = document.getElementById('qm-services-dd');
          var trigger = document.getElementById('qm-services-trigger');
          var list    = document.getElementById('qm-services-list');
          var valEl   = document.getElementById('qm-services-val');
          if (!dd || !trigger || !list || !valEl) return;
          function updateServicesDisplay() {
            var has = state.services.length > 0;
            dd.classList.toggle('qm-dropdown--placeholder', !has);
            valEl.textContent = has
              ? state.services.map(function (s) { return s === 'Other (please specify)' ? 'Other' : s; }).join(', ')
              : 'Select services…';
          }
          function closeDropdown() {
            dd.classList.remove('qm-dropdown--open');
            document.removeEventListener('click', closeOnOutside, true);
          }
          function closeOnOutside(e) {
            if (!dd.contains(e.target)) closeDropdown();
          }
          trigger.addEventListener('click', function (e) {
            e.stopPropagation();
            if (dd.classList.contains('qm-dropdown--open')) {
              closeDropdown();
            } else {
              dd.classList.add('qm-dropdown--open');
              document.addEventListener('click', closeOnOutside, true);
            }
          });
          list.querySelectorAll('.qm-dropdown__opt--multi').forEach(function (opt) {
            opt.addEventListener('click', function (e) {
              e.stopPropagation();
              var val = opt.dataset.val;
              var idx = state.services.indexOf(val);
              if (idx === -1) {
                state.services.push(val);
                opt.classList.add('qm-dropdown__opt--sel');
              } else {
                state.services.splice(idx, 1);
                opt.classList.remove('qm-dropdown__opt--sel');
              }
              var wrap = document.getElementById('qm-other-service-wrap');
              if (wrap) {
                if (state.services.indexOf('Other (please specify)') !== -1) {
                  wrap.removeAttribute('hidden');
                } else {
                  wrap.setAttribute('hidden', '');
                  state.other_service_detail = '';
                }
              }
              updateServicesDisplay();
              closeDropdown();
              saveDraft();
              refreshTabCompletion();
            });
          });
        })();
        bind('qm-other-service', 'input', function () {
          state.other_service_detail = this.value;
          saveDraft();
        });
        // Frequency single-select dropdown
        (function () {
          var dd      = document.getElementById('qm-freq-dd');
          var trigger = document.getElementById('qm-freq-trigger');
          var list    = document.getElementById('qm-freq-list');
          var valEl   = document.getElementById('qm-freq-val');
          if (!dd || !trigger || !list || !valEl) return;
          function closeDropdown() {
            dd.classList.remove('qm-dropdown--open');
            document.removeEventListener('click', closeOnOutside, true);
          }
          function closeOnOutside(e) {
            if (!dd.contains(e.target)) closeDropdown();
          }
          trigger.addEventListener('click', function (e) {
            e.stopPropagation();
            if (dd.classList.contains('qm-dropdown--open')) {
              closeDropdown();
            } else {
              dd.classList.add('qm-dropdown--open');
              document.addEventListener('click', closeOnOutside, true);
            }
          });
          list.querySelectorAll('.qm-dropdown__opt').forEach(function (opt) {
            opt.addEventListener('click', function (e) {
              e.stopPropagation();
              state.frequency = opt.dataset.val;
              valEl.textContent = opt.dataset.val;
              dd.classList.remove('qm-dropdown--placeholder');
              list.querySelectorAll('.qm-dropdown__opt').forEach(function (o) { o.classList.remove('qm-dropdown__opt--sel'); });
              opt.classList.add('qm-dropdown__opt--sel');
              closeDropdown();
              saveDraft();
              refreshTabCompletion();
            });
          });
        })();
        // Condition single-select dropdown
        (function () {
          var dd      = document.getElementById('qm-cond-dd');
          var trigger = document.getElementById('qm-cond-trigger');
          var list    = document.getElementById('qm-cond-list');
          var valEl   = document.getElementById('qm-cond-val');
          if (!dd || !trigger || !list || !valEl) return;
          function closeDropdown() {
            dd.classList.remove('qm-dropdown--open');
            document.removeEventListener('click', closeOnOutside, true);
          }
          function closeOnOutside(e) {
            if (!dd.contains(e.target)) closeDropdown();
          }
          trigger.addEventListener('click', function (e) {
            e.stopPropagation();
            if (dd.classList.contains('qm-dropdown--open')) {
              closeDropdown();
            } else {
              dd.classList.add('qm-dropdown--open');
              document.addEventListener('click', closeOnOutside, true);
            }
          });
          list.querySelectorAll('.qm-dropdown__opt').forEach(function (opt) {
            opt.addEventListener('click', function (e) {
              e.stopPropagation();
              state.condition = opt.dataset.val;
              valEl.textContent = opt.dataset.label || opt.dataset.val;
              dd.classList.remove('qm-dropdown--placeholder');
              list.querySelectorAll('.qm-dropdown__opt').forEach(function (o) { o.classList.remove('qm-dropdown__opt--sel'); });
              opt.classList.add('qm-dropdown__opt--sel');
              closeDropdown();
              saveDraft();
              refreshTabCompletion();
            });
          });
        })();
        break;

      case 2:
        document.querySelectorAll('.qm-day__cb').forEach(function (cb) {
          cb.addEventListener('change', function () {
            var lbl = this.closest('.qm-day');
            if (this.checked) {
              lbl.classList.add('qm-day--on');
              if (state.preferred_days.indexOf(this.value) === -1) state.preferred_days.push(this.value);
            } else {
              lbl.classList.remove('qm-day--on');
              state.preferred_days = state.preferred_days.filter(function (v) { return v !== cb.value; });
            }
          });
        });
        document.querySelectorAll('input[name="preferred_time"]').forEach(function (r) {
          r.addEventListener('change', function () {
            document.querySelectorAll('.qm-time-pill').forEach(function (l) { l.classList.remove('qm-time-pill--on'); });
            this.closest('.qm-time-pill').classList.add('qm-time-pill--on');
            state.preferred_time = this.value;
          });
        });
        bind('qm-flexible', 'change', function () { state.flexible_schedule = this.checked; });
        bind('qm-notes', 'input', function () {
          var words = (this.value.trim() === '') ? [] : this.value.trim().split(/\s+/);
          if (words.length > 100) this.value = words.slice(0, 100).join(' ');
          state.notes = this.value;
          var wc    = this.value.trim() ? this.value.trim().split(/\s+/).length : 0;
          var numEl = document.getElementById('qm-wc-num');
          var ctrEl = document.getElementById('qm-word-count');
          if (numEl) numEl.textContent = wc;
          if (ctrEl) ctrEl.className = 'qm-word-count' + (wc >= 100 ? ' qm-word-count--full' : wc >= 80 ? ' qm-word-count--near' : '');
        });
        // Mobile: "Review & Submit" button within Schedule content
        var mobReviewBtn = document.getElementById('qm-mob-review-btn');
        if (mobReviewBtn) {
          mobReviewBtn.addEventListener('click', function () {
            saveDraft();
            onNext = submit;
            onBack = function () {
              stepDir = -1;
              currentStep = totalSteps - 1;
              onNext = function () { next(); };
              onBack = function () { back(); };
              renderStep();
            };
            renderReview();
          });
        }
        break;
    }
  }

  /* ─── Navigation ──────────────────────────────────────────────────────── */

  function next() {
    if (submitting) return;

    var err = validateStep(currentStep);
    if (err) { showStepError(err); return; }

    stepDir = 1;
    if (currentStep < totalSteps - 1) {
      currentStep++;
      saveDraft();
      renderStep();
    } else {
      saveDraft();
      onNext = submit;
      onBack = function () {
        stepDir = -1;
        currentStep = totalSteps - 1;
        onNext = function () { next(); };
        onBack = function () { back(); };
        renderStep();
      };
      renderReview();
    }
  }

  function back() {
    if (currentStep > 0) { stepDir = -1; currentStep--; saveDraft(); renderStep(); }
  }

  function validateStep(n) {
    switch (n) {
      case 0:
        if (!state.full_name.trim()) return 'Please enter your name.';
        if (!state.phone.trim() || state.phone.replace(/\D/g, '').length < 8)
          return 'Please enter a valid phone number.';
        if (!state.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(state.email))
          return 'Please enter a valid email address.';
        break;
      case 1:
        if (!state.street_address.trim()) return 'Please enter your street address.';
        if (!state.suburb.trim())         return 'Please enter your suburb.';
        if (!state.state)                 return 'Please select your state.';
        if (!state.postcode.trim())       return 'Please enter your postcode.';
        if (!/^\d{4}$/.test(state.postcode.trim())) return 'Please enter a valid 4-digit postcode.';
        if (!state.property_type)         return 'Please select a property type.';
        if (!state.services.length) return 'Please select at least one service.';
        if (state.services.indexOf('Other (please specify)') !== -1 && !state.other_service_detail.trim()) return 'Please describe the service.';
        if (!state.frequency) return 'Please select a cleaning frequency.';
        if (!state.condition) return 'Please select the property condition.';
        break;
      // case 2: schedule and notes are all optional
    }
    return null;
  }

  function showStepError(msg) {
    var existing = document.getElementById('qm-step-error');
    if (existing) existing.remove();
    var el = document.createElement('div');
    el.id = 'qm-step-error';
    el.className = 'qm-error';
    el.textContent = msg;
    document.getElementById('qm-body').appendChild(el);
  }

  /* ─── Submit ──────────────────────────────────────────────────────────── */

  function submit() {
    if (submitting) return;
    submitting = true;
    var btn = document.getElementById('qm-next');
    btn.innerHTML = '<span class="qm-spinner"></span>Submitting…';
    btn.disabled  = true;

    var payload = Object.assign({}, state);
    if (payload.bedrooms)     payload.bedrooms     = parseInt(payload.bedrooms)     || null;
    if (payload.bathrooms)    payload.bathrooms    = parseInt(payload.bathrooms)    || null;
    if (payload.living_areas) payload.living_areas = parseInt(payload.living_areas) || null;
    payload.services = state.services.map(function (s) {
      return s === 'Other (please specify)' ? 'Other: ' + state.other_service_detail : s;
    });
    delete payload.other_service_detail;

    fetch('/api/submit-quote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    .then(function (res) { return res.json(); })
    .then(function (data) {
      submitting = false;
      if (data.success) {
        renderSuccess();
      } else {
        btn.innerHTML = 'Submit Quote Request';
        btn.disabled  = false;
        var errEl = document.getElementById('qm-submit-error');
        if (errEl) { errEl.textContent = data.error || 'Something went wrong. Please try again.'; errEl.style.display = ''; }
      }
    })
    .catch(function () {
      submitting = false;
      btn.textContent = 'Submit Quote Request';
      btn.disabled    = false;
      var errEl = document.getElementById('qm-submit-error');
      if (errEl) { errEl.textContent = 'Network error. Please check your connection and try again.'; errEl.style.display = ''; }
    });
  }

  /* ─── HTML helpers ────────────────────────────────────────────────────── */

  function field(label, id, type, val, placeholder, required, autocomplete, inputmode, helper) {
    return '<div class="qm-field">' +
      '<label class="qm-label" for="' + id + '">' + label + (required ? ' <span class="qm-req">*</span>' : '') + '</label>' +
      '<input class="qm-input" type="' + type + '" id="' + id + '" value="' + escHtml(val || '') + '" placeholder="' + escHtml(placeholder || '') + '"' +
      (required ? ' required' : '') +
      (autocomplete ? ' autocomplete="' + autocomplete + '"' : '') +
      (inputmode ? ' inputmode="' + inputmode + '"' : '') +
      '>' +
      (helper ? '<p class="qm-helper">' + helper + '</p>' : '') +
    '</div>';
  }

  function stepperField(label, id, stateKey, max) {
    var val = parseInt(state[stateKey]) || 0;
    return '<div class="qm-field">' +
      '<label class="qm-label">' + label + '</label>' +
      '<div class="qm-stepper" id="' + id + '">' +
        '<button type="button" class="qm-stepper__btn qm-stepper__btn--dec" aria-label="Decrease"' + (val <= 0 ? ' disabled' : '') + '>−</button>' +
        '<span class="qm-stepper__val">' + val + '</span>' +
        '<button type="button" class="qm-stepper__btn qm-stepper__btn--inc" aria-label="Increase">+</button>' +
      '</div>' +
    '</div>';
  }

  function wireStepperField(id, stateKey, max) {
    var container = document.getElementById(id);
    if (!container) return;
    var valEl  = container.querySelector('.qm-stepper__val');
    var decBtn = container.querySelector('.qm-stepper__btn--dec');
    var incBtn = container.querySelector('.qm-stepper__btn--inc');
    function update() {
      var v = parseInt(state[stateKey]) || 0;
      valEl.textContent = v;
      decBtn.disabled = v <= 0;
      incBtn.disabled = v >= max;
    }
    incBtn.addEventListener('click', function () {
      var v = parseInt(state[stateKey]) || 0;
      if (v < max) { state[stateKey] = v + 1; update(); saveDraft(); }
    });
    decBtn.addEventListener('click', function () {
      var v = parseInt(state[stateKey]) || 0;
      if (v > 0) { state[stateKey] = v - 1; update(); saveDraft(); }
    });
  }

  function radioRow(name, opts, current) {
    return '<div class="qm-radio-row">' +
      opts.map(function (o) {
        return '<label class="qm-radio-pill' + (current === o.value ? ' qm-radio-pill--on' : '') + '">' +
          '<input type="radio" name="' + name + '" value="' + o.value + '"' + (current === o.value ? ' checked' : '') + '> ' + o.label +
        '</label>';
      }).join('') +
    '</div>';
  }

  function radioCards(name, opts, current) {
    return '<div class="qm-radio-cards">' +
      opts.map(function (o) {
        return '<label class="qm-rcard' + (current === o.value ? ' qm-rcard--on' : '') + '">' +
          '<input type="radio" name="' + name + '" value="' + o.value + '"' + (current === o.value ? ' checked' : '') + '>' +
          '<span class="qm-rcard__label">' + o.label + '</span>' +
          (o.desc ? '<span class="qm-rcard__desc">' + o.desc + '</span>' : '') +
        '</label>';
      }).join('') +
    '</div>';
  }

  function checkTile(value, label, checked, cls) {
    return '<label class="qm-ctile' + (checked ? ' qm-ctile--on' : '') + '">' +
      '<input type="checkbox" class="' + cls + '" value="' + escHtml(value) + '"' + (checked ? ' checked' : '') + '> ' +
      escHtml(label) +
    '</label>';
  }

  /* ─── Wire helpers ────────────────────────────────────────────────────── */

  function bind(id, event, fn) {
    var el = document.getElementById(id);
    if (el) el.addEventListener(event, fn);
  }

  function bindRadios(name, cb) {
    document.querySelectorAll('input[name="' + name + '"]').forEach(function (r) {
      r.addEventListener('change', function () {
        document.querySelectorAll('input[name="' + name + '"]').forEach(function (o) {
          var pill = o.closest('.qm-radio-pill');
          if (pill) pill.classList.remove('qm-radio-pill--on');
        });
        this.closest('.qm-radio-pill').classList.add('qm-radio-pill--on');
        cb(this.value);
      });
    });
  }

  function escHtml(str) {
    return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  /* ─── Boot ────────────────────────────────────────────────────────────── */

  document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('[data-open-quote]').forEach(function (btn) {
      btn.addEventListener('click', openModal);
    });

    document.addEventListener('click', function (e) {
      if (e.target.id === 'qm-close')    closeModal();
      if (e.target.id === 'quote-modal') closeModal();
    });

    document.addEventListener('keydown', function (e) {
      var overlay = document.getElementById('quote-modal');
      if (!overlay || overlay.hidden) return;
      if (e.key === 'Escape') closeModal();
    });

    document.getElementById('qm-next').addEventListener('click', function () { onNext(); });
    document.getElementById('qm-back').addEventListener('click', function () { onBack(); });
  });

  window.QuoteModal = { open: openModal, close: closeModal };
})();
