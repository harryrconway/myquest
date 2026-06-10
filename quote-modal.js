/* Public site — 10-step quote request modal */
(function () {
  'use strict';

  var state = {};
  var currentStep = 0;
  var totalSteps  = 10;
  var submitting  = false;
  var stepDir     = 1;

  // Single handlers — changed by switching these variables (avoids mixed addEventListener+onclick)
  var onNext = function () { next(); };
  var onBack = function () { back(); };

  var STEPS = [
    { id: 'details',    title: 'Your Details' },
    { id: 'address',    title: 'Property Address' },
    { id: 'type',       title: 'Property Type' },
    { id: 'propdetail', title: 'Property Details' },
    { id: 'services',   title: 'Services Required' },
    { id: 'frequency',  title: 'Frequency' },
    { id: 'condition',  title: 'Property Condition' },
    { id: 'extras',     title: 'Additional Requirements' },
    { id: 'schedule',   title: 'Preferred Schedule' },
    { id: 'notes',      title: 'Anything Else?' },
  ];

  var PROPERTY_TYPES = [
    { value: 'House',       label: 'House'      },
    { value: 'Apartment',   label: 'Apartment'  },
    { value: 'Townhouse',   label: 'Townhouse'  },
    { value: 'Office',      label: 'Office'     },
    { value: 'Retail',      label: 'Retail'     },
    { value: 'Medical',     label: 'Medical'    },
    { value: 'Warehouse',   label: 'Warehouse'  },
    { value: 'Other',       label: 'Other'      },
  ];

  var SERVICES = [
    'Regular Cleaning', 'Deep Cleaning', 'End of Lease', 'Commercial',
    'Office', 'Airbnb', 'Move In', 'Move Out', 'Construction', 'Custom Request',
  ];

  var EXTRAS = [
    'Inside Windows', 'Oven', 'Fridge', 'Garage',
    'Balcony', 'Laundry', 'Carpet Cleaning', 'Pet Hair Removal',
  ];

  var DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  var AU_STATES = ['ACT', 'NSW', 'NT', 'QLD', 'SA', 'TAS', 'VIC', 'WA'];

  /* ─── Open / Close ───────────────────────────────────────────────────── */

  function openModal() {
    resetState();
    loadDraft();
    currentStep = 0;
    stepDir = 1;
    renderStep();
    var overlay = document.getElementById('quote-modal');
    overlay.hidden = false;
    overlay.removeAttribute('aria-hidden');
    document.body.style.overflow = 'hidden';
    requestAnimationFrame(function () {
      overlay.classList.add('qm--open');
    });
    document.getElementById('qm-close').focus();
  }

  function closeModal() {
    var overlay = document.getElementById('quote-modal');
    overlay.classList.remove('qm--open');
    setTimeout(function () {
      overlay.hidden = true;
      overlay.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
    }, 280);
  }

  function resetState() {
    state = {
      full_name: '', phone: '', email: '', preferred_contact: '',
      street_address: '', suburb: '', state: '', postcode: '', access_instructions: '',
      property_type: '',
      bedrooms: '', bathrooms: '', living_areas: '', floor_area_sqm: '', staff_count: '',
      services: [], frequency: '', condition: '', extras: [],
      preferred_days: [], preferred_time: '', flexible_schedule: false,
      notes: '',
    };
  }

  var DRAFT_KEY = 'mq_quote_draft';
  function saveDraft()  { try { localStorage.setItem(DRAFT_KEY, JSON.stringify(state)); } catch(e){} }
  function loadDraft()  { try { var s = localStorage.getItem(DRAFT_KEY); if (s) Object.assign(state, JSON.parse(s)); } catch(e){} }
  function clearDraft() { try { localStorage.removeItem(DRAFT_KEY); } catch(e){} }

  /* ─── Render ──────────────────────────────────────────────────────────── */

  function setProgress(step) {
    var pct = Math.round((step / totalSteps) * 100);
    document.getElementById('qm-progress-bar').style.width = pct + '%';
    document.getElementById('qm-step-label').textContent = 'Step ' + (step + 1) + ' of ' + totalSteps;
  }

  function renderStep() {
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();

    var card = document.querySelector('.qm-card');
    if (card) card.classList.remove('qm-card--review');
    var body = document.getElementById('qm-body');
    var html = buildStep(currentStep);
    body.innerHTML = html;
    body.scrollTop  = 0;

    // Slide animation
    var stepEl = body.querySelector('.qm-step');
    if (stepEl) stepEl.classList.add(stepDir > 0 ? 'qm-step--in-right' : 'qm-step--in-left');

    setProgress(currentStep);
    document.getElementById('qm-title').textContent = STEPS[currentStep].title;

    // Back button
    var backBtn = document.getElementById('qm-back');
    backBtn.style.display  = currentStep === 0 ? 'none' : '';
    backBtn.textContent    = 'Back';

    // Next button
    var nextBtn = document.getElementById('qm-next');
    nextBtn.textContent = currentStep === totalSteps - 1 ? 'Review' : 'Next';
    nextBtn.disabled    = false;

    wireStep(currentStep);

    // Auto-focus first text input on steps that have one
    var firstInput = body.querySelector('input[type="text"], input[type="tel"], input[type="email"], textarea');
    if (firstInput) firstInput.focus();
  }

  function buildStep(n) {
    switch (n) {
      case 0: return stepDetails();
      case 1: return stepAddress();
      case 2: return stepType();
      case 3: return stepPropDetail();
      case 4: return stepServices();
      case 5: return stepFrequency();
      case 6: return stepCondition();
      case 7: return stepExtras();
      case 8: return stepSchedule();
      case 9: return stepNotes();
    }
  }

  /* ─── Step builders ───────────────────────────────────────────────────── */

  function stepDetails() {
    return '<div class="qm-step">' +
      field('Full Name', 'qm-name', 'text', state.full_name, 'Your name', true) +
      field('Mobile', 'qm-phone', 'tel', state.phone, '04XX XXX XXX', true) +
      field('Email', 'qm-email', 'email', state.email, 'you@example.com', true) +
      '<div class="qm-field">' +
        '<label class="qm-label">Preferred Contact Method</label>' +
        radioRow('preferred_contact', [
          { value: 'Phone', label: 'Phone' },
          { value: 'SMS',   label: 'SMS'   },
          { value: 'Email', label: 'Email' },
        ], state.preferred_contact) +
      '</div>' +
    '</div>';
  }

  function stepAddress() {
    return '<div class="qm-step">' +
      field('Street Address', 'qm-street', 'text', state.street_address, '123 Example St', false, 'address-line1') +
      '<div class="qm-row-2">' +
        field('Suburb', 'qm-suburb', 'text', state.suburb, 'Suburb', false, 'address-level2') +
        '<div class="qm-field" style="position:relative">' +
          '<label class="qm-label">State</label>' +
          '<div class="qm-dropdown' + (state.state ? '' : ' qm-dropdown--placeholder') + '" id="qm-state-dd">' +
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
    '</div>';
  }

  function stepType() {
    return '<div class="qm-step">' +
      '<div class="qm-grid-type">' +
        PROPERTY_TYPES.map(function (pt) {
          var sel = state.property_type === pt.value ? ' qm-tile--selected' : '';
          return '<button type="button" class="qm-tile' + sel + '" data-value="' + pt.value + '">' +
            '<span class="qm-tile__label">' + pt.label + '</span>' +
          '</button>';
        }).join('') +
      '</div>' +
    '</div>';
  }

  function isResidential() {
    return ['House', 'Apartment', 'Townhouse'].indexOf(state.property_type) !== -1;
  }

  function stepPropDetail() {
    if (isResidential()) {
      return '<div class="qm-step">' +
        '<div class="qm-row-3">' +
          stepperField('Bedrooms',     'qm-beds',   'bedrooms',     20) +
          stepperField('Bathrooms',    'qm-baths',  'bathrooms',    20) +
          stepperField('Living Areas', 'qm-living', 'living_areas', 10) +
        '</div>' +
      '</div>';
    }
    return '<div class="qm-step">' +
      '<div class="qm-row-2">' +
        field('Floor Area (sqm)', 'qm-sqm', 'text', state.floor_area_sqm, 'e.g. 150', false, null, 'tel') +
        stepperField('Bathrooms', 'qm-baths', 'bathrooms', 20) +
      '</div>' +
    '</div>';
  }

  function stepServices() {
    return '<div class="qm-step">' +
      '<div class="qm-grid-check">' +
        SERVICES.map(function (s) {
          var checked = state.services.indexOf(s) !== -1;
          return checkTile(s, s, checked, 'qm-service');
        }).join('') +
      '</div>' +
    '</div>';
  }

  function stepFrequency() {
    return '<div class="qm-step">' +
      radioCards('frequency', [
        { value: 'One-Time',     label: 'One-Time',     desc: 'Single visit'             },
        { value: 'Weekly',       label: 'Weekly',       desc: 'Every week'               },
        { value: 'Fortnightly',  label: 'Fortnightly',  desc: 'Every two weeks'          },
        { value: 'Monthly',      label: 'Monthly',      desc: 'Once a month'             },
        { value: 'Unsure',       label: 'Not sure yet', desc: "I'll decide later"        },
      ], state.frequency) +
    '</div>';
  }

  function stepCondition() {
    return '<div class="qm-step">' +
      radioCards('condition', [
        { value: 'Excellent',         label: 'Excellent',          desc: 'Clean and well maintained'   },
        { value: 'Good',              label: 'Good',               desc: 'Some light cleaning needed'  },
        { value: 'Average',           label: 'Average',            desc: 'Moderate cleaning required'  },
        { value: 'Requires Deep Clean', label: 'Needs Deep Clean', desc: 'Heavy clean required'         },
      ], state.condition) +
    '</div>';
  }

  function stepExtras() {
    return '<div class="qm-step">' +
      '<p class="qm-hint">Select anything that needs special attention:</p>' +
      '<div class="qm-grid-check">' +
        EXTRAS.map(function (e) {
          var checked = state.extras.indexOf(e) !== -1;
          return checkTile(e, e, checked, 'qm-extra');
        }).join('') +
      '</div>' +
    '</div>';
  }

  var TIME_OPTIONS = [
    { value: 'Morning (7am–12pm)',   label: 'Morning',   range: '7am – 12pm' },
    { value: 'Afternoon (12pm–5pm)', label: 'Afternoon', range: '12pm – 5pm' },
    { value: 'Evening (5pm–8pm)',    label: 'Evening',   range: '5pm – 8pm'  },
    { value: 'Flexible',             label: 'Flexible',  range: 'Any time'   },
  ];

  function stepSchedule() {
    return '<div class="qm-step">' +
      '<div class="qm-field">' +
        '<label class="qm-label">Preferred Days</label>' +
        '<div class="qm-day-row">' +
          DAYS.map(function (d) {
            var checked = state.preferred_days.indexOf(d) !== -1;
            return '<label class="qm-day' + (checked ? ' qm-day--on' : '') + '" data-day="' + d + '">' +
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
    '</div>';
  }

  function countWords(str) {
    var s = (str || '').trim();
    return s ? s.split(/\s+/).length : 0;
  }

  function stepNotes() {
    var wc = countWords(state.notes);
    return '<div class="qm-step">' +
      '<div class="qm-field">' +
        '<label class="qm-label" for="qm-notes">Additional Notes <span style="color:rgba(255,255,255,0.5);font-weight:400">(optional)</span></label>' +
        '<textarea class="qm-input qm-textarea" id="qm-notes" placeholder="Anything else we should know — special requests, parking, pets, access details…" rows="5">' + escHtml(state.notes) + '</textarea>' +
        '<div class="qm-word-count' + (wc >= 100 ? ' qm-word-count--full' : wc >= 80 ? ' qm-word-count--near' : '') + '" id="qm-word-count"><span id="qm-wc-num">' + wc + '</span>/100 words</div>' +
      '</div>' +
    '</div>';
  }

  /* ─── Review & Submit ─────────────────────────────────────────────────── */

  var REVIEW_STEP_MAP = {
    'Name': 0, 'Phone': 0, 'Email': 0, 'Preferred contact': 0,
    'Address': 1, 'Access': 1,
    'Property type': 2,
    'Bedrooms': 3, 'Bathrooms': 3, 'Living areas': 3, 'Floor area': 3,
    'Services': 4, 'Frequency': 5, 'Condition': 6, 'Extras': 7,
    'Preferred days': 8, 'Preferred time': 8, 'Flexible schedule': 8,
    'Notes': 9,
  };

  function renderReview() {
    var body    = document.getElementById('qm-body');
    var backBtn = document.getElementById('qm-back');
    var nextBtn = document.getElementById('qm-next');

    document.getElementById('qm-title').textContent = 'Review Your Request';
    document.getElementById('qm-step-label').textContent = 'Almost done!';
    document.getElementById('qm-progress-bar').style.width = '100%';

    backBtn.style.display = '';
    backBtn.textContent   = 'Back';
    nextBtn.textContent   = 'Submit Quote Request';
    nextBtn.disabled      = false;

    var rows = [];
    function r(label, val) {
      if (!val) return;
      var step = REVIEW_STEP_MAP[label];
      var stepAttr = step !== undefined ? ' data-step="' + step + '"' : '';
      rows.push(
        '<tr class="qm-rv__row"' + stepAttr + ' title="Edit ' + escHtml(label) + '">' +
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
    if (isResidential()) {
      r('Bedrooms', state.bedrooms);
      r('Bathrooms', state.bathrooms);
      r('Living areas', state.living_areas);
    } else {
      r('Floor area', state.floor_area_sqm ? state.floor_area_sqm + ' sqm' : '');
      r('Bathrooms', state.bathrooms);
    }
    r('Services', state.services.join(', '));
    r('Frequency', state.frequency);
    r('Condition', state.condition);
    r('Extras', state.extras.join(', '));
    r('Preferred days', state.preferred_days.join(', '));
    r('Preferred time', state.preferred_time);
    r('Flexible schedule', state.flexible_schedule ? 'Yes' : '');
    r('Notes', state.notes);

    body.innerHTML =
      '<div class="qm-step qm-review">' +
        '<table class="qm-rv">' + rows.join('') + '</table>' +
        '<div id="qm-submit-error" class="qm-error" style="display:none"></div>' +
      '</div>';
    body.scrollTop = 0;

    var card = document.querySelector('.qm-card');
    if (card) card.classList.add('qm-card--review');

    body.querySelectorAll('.qm-rv__row[data-step]').forEach(function (row) {
      row.addEventListener('click', function () {
        var step = parseInt(this.dataset.step);
        currentStep = step;
        onNext = function () { next(); };
        onBack = function () { back(); };
        renderStep();
      });
    });
  }

  function renderSuccess() {
    clearDraft();
    var body    = document.getElementById('qm-body');
    var footer  = document.getElementById('qm-footer');
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
        '<button class="btn-primary qm-success__btn" id="qm-done">Done</button>' +
      '</div>';

    document.getElementById('qm-done').addEventListener('click', closeModal);
  }

  /* ─── Wire interactivity ─────────────────────────────────────────────── */

  function advanceOnEnter(fromId, toId) {
    var el = document.getElementById(fromId);
    if (!el) return;
    el.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.keyCode === 13) {
        e.preventDefault();
        var next = document.getElementById(toId);
        if (next) next.focus();
      }
    });
  }

  function advanceAfterLen(fromId, toId, len) {
    var el = document.getElementById(fromId);
    if (!el) return;
    el.addEventListener('input', function () {
      if (this.value.length >= len) {
        var next = document.getElementById(toId);
        if (next) next.focus();
      }
    });
  }

  function wireStep(n) {
    switch (n) {
      case 0:
        bind('qm-name',  'input',  function () { state.full_name = this.value; });
        bind('qm-phone', 'input',  function () { state.phone = this.value; });
        bind('qm-email', 'input',  function () { state.email = this.value; });
        bindRadios('preferred_contact', function (v) { state.preferred_contact = v; });
        advanceOnEnter('qm-name', 'qm-phone');
        advanceAfterLen('qm-phone', 'qm-email', 10);
        advanceOnEnter('qm-email', 'qm-phone');
        break;
      case 1:
        bind('qm-street',  'input', function () {
          var prev = state.street_address;
          state.street_address = this.value;
          // Value jumped by >4 chars = autofill or paste → advance to suburb immediately
          if (this.value.length - prev.length > 4) {
            var suburbEl = document.getElementById('qm-suburb');
            if (suburbEl) suburbEl.focus();
          }
        });
        bind('qm-suburb',  'input', function () { state.suburb = this.value; });
        bind('qm-postcode','input', function () { state.postcode = this.value; });
        bind('qm-access',  'input', function () { state.access_instructions = this.value; });
        advanceOnEnter('qm-suburb', 'qm-postcode');
        advanceAfterLen('qm-postcode', 'qm-access', 4);
        (function () {
          var dd     = document.getElementById('qm-state-dd');
          var trigger = document.getElementById('qm-state-trigger');
          var list   = document.getElementById('qm-state-list');
          var valEl  = document.getElementById('qm-state-val');
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
            });
          });
        })();
        break;
      case 2:
        document.querySelectorAll('.qm-tile').forEach(function (tile) {
          tile.addEventListener('click', function () {
            document.querySelectorAll('.qm-tile').forEach(function (t) { t.classList.remove('qm-tile--selected'); });
            this.classList.add('qm-tile--selected');
            state.property_type = this.dataset.value;
          });
        });
        break;
      case 3:
        if (isResidential()) {
          wireStepperField('qm-beds',   'bedrooms',     20);
          wireStepperField('qm-baths',  'bathrooms',    20);
          wireStepperField('qm-living', 'living_areas', 10);
        } else {
          bind('qm-sqm', 'input', function () { state.floor_area_sqm = this.value; });
          wireStepperField('qm-baths', 'bathrooms', 20);
        }
        break;
      case 4:
        document.querySelectorAll('.qm-service').forEach(function (cb) {
          cb.addEventListener('change', function () {
            var tile = this.closest('.qm-ctile');
            if (this.checked) {
              if (state.services.indexOf(this.value) === -1) state.services.push(this.value);
              if (tile) tile.classList.add('qm-ctile--on');
            } else {
              state.services = state.services.filter(function (v) { return v !== cb.value; });
              if (tile) tile.classList.remove('qm-ctile--on');
            }
          });
        });
        break;
      case 5:
        bindRadioCards('frequency', function (v) { state.frequency = v; });
        break;
      case 6:
        bindRadioCards('condition', function (v) { state.condition = v; });
        break;
      case 7:
        document.querySelectorAll('.qm-extra').forEach(function (cb) {
          cb.addEventListener('change', function () {
            var tile = this.closest('.qm-ctile');
            if (this.checked) {
              if (state.extras.indexOf(this.value) === -1) state.extras.push(this.value);
              if (tile) tile.classList.add('qm-ctile--on');
            } else {
              state.extras = state.extras.filter(function (v) { return v !== cb.value; });
              if (tile) tile.classList.remove('qm-ctile--on');
            }
          });
        });
        break;
      case 8:
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
        break;
      case 9:
        bind('qm-notes', 'input', function () {
          var words = (this.value.trim() === '') ? [] : this.value.trim().split(/\s+/);
          if (words.length > 100) {
            this.value = words.slice(0, 100).join(' ');
          }
          state.notes = this.value;
          var wc = this.value.trim() ? this.value.trim().split(/\s+/).length : 0;
          var numEl = document.getElementById('qm-wc-num');
          var ctrEl = document.getElementById('qm-word-count');
          if (numEl) numEl.textContent = wc;
          if (ctrEl) {
            ctrEl.className = 'qm-word-count' + (wc >= 100 ? ' qm-word-count--full' : wc >= 80 ? ' qm-word-count--near' : '');
          }
        });
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
      // Last step → show review
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
        if (!state.phone.trim())     return 'Please enter your phone number.';
        if (!state.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(state.email)) return 'Please enter a valid email address.';
        break;
      case 1:
        if (!state.street_address.trim()) return 'Please enter your street address.';
        if (!state.suburb.trim())         return 'Please enter your suburb.';
        if (!state.state)                 return 'Please select your state.';
        if (!state.postcode.trim())       return 'Please enter your postcode.';
        break;
      case 2:
        if (!state.property_type) return 'Please select a property type.';
        break;
      case 3:
        if (isResidential()) {
          if (!state.bedrooms)  return 'Please enter the number of bedrooms.';
          if (!state.bathrooms) return 'Please enter the number of bathrooms.';
        } else {
          if (!state.floor_area_sqm) return 'Please enter the floor area.';
        }
        break;
      case 4:
        if (!state.services.length) return 'Please select at least one service.';
        break;
      case 5:
        if (!state.frequency) return 'Please select a cleaning frequency.';
        break;
      case 6:
        if (!state.condition) return 'Please select the property condition.';
        break;
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
    btn.textContent = 'Submitting…';
    btn.disabled    = true;

    var payload = Object.assign({}, state);
    if (payload.bedrooms)      payload.bedrooms      = parseInt(payload.bedrooms)      || null;
    if (payload.bathrooms)     payload.bathrooms     = parseInt(payload.bathrooms)     || null;
    if (payload.living_areas)  payload.living_areas  = parseInt(payload.living_areas)  || null;
    if (payload.floor_area_sqm) payload.floor_area_sqm = parseInt(payload.floor_area_sqm) || null;
    if (payload.staff_count)   payload.staff_count   = parseInt(payload.staff_count)   || null;

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
        btn.textContent = 'Submit Quote Request';
        btn.disabled    = false;
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

  function field(label, id, type, val, placeholder, required, autocomplete, inputmode) {
    return '<div class="qm-field">' +
      '<label class="qm-label" for="' + id + '">' + label + (required ? ' <span class="qm-req">*</span>' : '') + '</label>' +
      '<input class="qm-input" type="' + type + '" id="' + id + '" value="' + escHtml(val || '') + '" placeholder="' + escHtml(placeholder || '') + '"' +
      (required ? ' required' : '') +
      (autocomplete ? ' autocomplete="' + autocomplete + '"' : '') +
      (inputmode ? ' inputmode="' + inputmode + '"' : '') +
      '>' +
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
        document.querySelectorAll('.qm-radio-pill').forEach(function (l) { l.classList.remove('qm-radio-pill--on'); });
        this.closest('.qm-radio-pill').classList.add('qm-radio-pill--on');
        cb(this.value);
      });
    });
  }

  function bindRadioCards(name, cb) {
    document.querySelectorAll('input[name="' + name + '"]').forEach(function (r) {
      r.addEventListener('change', function () {
        document.querySelectorAll('.qm-rcard').forEach(function (l) { l.classList.remove('qm-rcard--on'); });
        this.closest('.qm-rcard').classList.add('qm-rcard--on');
        cb(this.value);
      });
    });
  }

  function escHtml(str) {
    return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  /* ─── Boot ────────────────────────────────────────────────────────────── */

  document.addEventListener('DOMContentLoaded', function () {
    // Wire all open-modal buttons
    document.querySelectorAll('[data-open-quote]').forEach(function (btn) {
      btn.addEventListener('click', openModal);
    });

    // Close button + overlay click
    document.addEventListener('click', function (e) {
      if (e.target.id === 'qm-close')    closeModal();
      if (e.target.id === 'quote-modal') closeModal();
    });

    // Keyboard
    document.addEventListener('keydown', function (e) {
      var overlay = document.getElementById('quote-modal');
      if (!overlay || overlay.hidden) return;
      if (e.key === 'Escape') closeModal();
    });

    // Footer nav — single listeners that delegate to onNext/onBack variables
    document.getElementById('qm-next').addEventListener('click', function () { onNext(); });
    document.getElementById('qm-back').addEventListener('click', function () { onBack(); });
  });

  window.QuoteModal = { open: openModal, close: closeModal };
})();
