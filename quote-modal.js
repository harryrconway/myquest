/* Public site — 10-step quote request modal */
(function () {
  'use strict';

  var state = {};
  var currentStep = 0;
  var totalSteps  = 10;
  var submitting  = false;

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
    { value: 'House',       label: 'House',       icon: '🏠' },
    { value: 'Apartment',   label: 'Apartment',   icon: '🏢' },
    { value: 'Townhouse',   label: 'Townhouse',   icon: '🏘️' },
    { value: 'Office',      label: 'Office',      icon: '🖥️' },
    { value: 'Retail',      label: 'Retail',      icon: '🛍️' },
    { value: 'Medical',     label: 'Medical',     icon: '🏥' },
    { value: 'Warehouse',   label: 'Warehouse',   icon: '🏭' },
    { value: 'Other',       label: 'Other',       icon: '📋' },
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
    currentStep = 0;
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

  /* ─── Render ──────────────────────────────────────────────────────────── */

  function setProgress(step) {
    var pct = Math.round((step / totalSteps) * 100);
    document.getElementById('qm-progress-bar').style.width = pct + '%';
    document.getElementById('qm-step-label').textContent = 'Step ' + (step + 1) + ' of ' + totalSteps;
  }

  function renderStep() {
    var body = document.getElementById('qm-body');
    var html = buildStep(currentStep);
    body.innerHTML = html;
    body.scrollTop  = 0;

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
      field('Street Address', 'qm-street', 'text', state.street_address, '123 Example St') +
      '<div class="qm-row-2">' +
        field('Suburb', 'qm-suburb', 'text', state.suburb, 'Suburb') +
        '<div class="qm-field">' +
          '<label class="qm-label" for="qm-state">State</label>' +
          '<select class="qm-input" id="qm-state">' +
            '<option value="">Select…</option>' +
            AU_STATES.map(function (s) {
              return '<option value="' + s + '"' + (state.state === s ? ' selected' : '') + '>' + s + '</option>';
            }).join('') +
          '</select>' +
        '</div>' +
      '</div>' +
      field('Postcode', 'qm-postcode', 'text', state.postcode, '3000') +
      field('Access Instructions', 'qm-access', 'text', state.access_instructions, 'Gate code, key location…') +
    '</div>';
  }

  function stepType() {
    return '<div class="qm-step">' +
      '<div class="qm-grid-type">' +
        PROPERTY_TYPES.map(function (pt) {
          var sel = state.property_type === pt.value ? ' qm-tile--selected' : '';
          return '<button type="button" class="qm-tile' + sel + '" data-value="' + pt.value + '">' +
            '<span class="qm-tile__icon">' + pt.icon + '</span>' +
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
          numberField('Bedrooms', 'qm-beds', state.bedrooms, 1, 20) +
          numberField('Bathrooms', 'qm-baths', state.bathrooms, 1, 20) +
          numberField('Living Areas', 'qm-living', state.living_areas, 1, 10) +
        '</div>' +
      '</div>';
    }
    return '<div class="qm-step">' +
      '<div class="qm-row-2">' +
        numberField('Floor Area (sqm)', 'qm-sqm', state.floor_area_sqm, 1, 99999) +
        numberField('Number of Staff', 'qm-staff', state.staff_count, 1, 500) +
      '</div>' +
      numberField('Bathrooms', 'qm-baths', state.bathrooms, 1, 20) +
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
        '<label class="qm-label" for="qm-time">Preferred Time</label>' +
        '<select class="qm-input" id="qm-time">' +
          '<option value="">No preference</option>' +
          ['Morning (7am–12pm)', 'Afternoon (12pm–5pm)', 'Evening (5pm–8pm)', 'Flexible'].map(function (t) {
            return '<option value="' + t + '"' + (state.preferred_time === t ? ' selected' : '') + '>' + t + '</option>';
          }).join('') +
        '</select>' +
      '</div>' +
      '<label class="qm-check-row">' +
        '<input type="checkbox" id="qm-flexible"' + (state.flexible_schedule ? ' checked' : '') + '> ' +
        '<span>I\'m flexible — contact me to arrange</span>' +
      '</label>' +
    '</div>';
  }

  function stepNotes() {
    return '<div class="qm-step">' +
      '<div class="qm-field">' +
        '<label class="qm-label" for="qm-notes">Additional Notes <span style="color:#9ca3af;font-weight:400">(optional)</span></label>' +
        '<textarea class="qm-input qm-textarea" id="qm-notes" placeholder="Anything else we should know — special requests, parking, pets, access details…" rows="5">' + escHtml(state.notes) + '</textarea>' +
      '</div>' +
    '</div>';
  }

  /* ─── Review & Submit ─────────────────────────────────────────────────── */

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
    function r(label, val) { if (val) rows.push('<tr><td class="qm-rv__label">' + escHtml(label) + '</td><td class="qm-rv__val">' + escHtml(String(val)) + '</td></tr>'); }

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
      r('Staff', state.staff_count);
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
  }

  function renderSuccess() {
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

  function wireStep(n) {
    switch (n) {
      case 0:
        bind('qm-name',  'input',  function () { state.full_name = this.value; });
        bind('qm-phone', 'input',  function () { state.phone = this.value; });
        bind('qm-email', 'input',  function () { state.email = this.value; });
        bindRadios('preferred_contact', function (v) { state.preferred_contact = v; });
        break;
      case 1:
        bind('qm-street',  'input', function () { state.street_address = this.value; });
        bind('qm-suburb',  'input', function () { state.suburb = this.value; });
        bind('qm-state',   'change', function () { state.state = this.value; });
        bind('qm-postcode','input', function () { state.postcode = this.value; });
        bind('qm-access',  'input', function () { state.access_instructions = this.value; });
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
        bind('qm-beds',   'input', function () { state.bedrooms = this.value; });
        bind('qm-baths',  'input', function () { state.bathrooms = this.value; });
        bind('qm-living', 'input', function () { state.living_areas = this.value; });
        bind('qm-sqm',    'input', function () { state.floor_area_sqm = this.value; });
        bind('qm-staff',  'input', function () { state.staff_count = this.value; });
        break;
      case 4:
        document.querySelectorAll('.qm-service').forEach(function (cb) {
          cb.addEventListener('change', function () {
            if (this.checked) { if (state.services.indexOf(this.value) === -1) state.services.push(this.value); }
            else { state.services = state.services.filter(function (v) { return v !== cb.value; }); }
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
            if (this.checked) { if (state.extras.indexOf(this.value) === -1) state.extras.push(this.value); }
            else { state.extras = state.extras.filter(function (v) { return v !== cb.value; }); }
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
        bind('qm-time',     'change', function () { state.preferred_time = this.value; });
        bind('qm-flexible', 'change', function () { state.flexible_schedule = this.checked; });
        break;
      case 9:
        bind('qm-notes', 'input', function () { state.notes = this.value; });
        break;
    }
  }

  /* ─── Navigation ──────────────────────────────────────────────────────── */

  function next() {
    if (submitting) return;

    var err = validateStep(currentStep);
    if (err) { showStepError(err); return; }

    if (currentStep < totalSteps - 1) {
      currentStep++;
      renderStep();
    } else {
      // Last step → show review
      renderReview();
      document.getElementById('qm-next').onclick = submit;
      document.getElementById('qm-back').onclick = function () {
        currentStep = totalSteps - 1;
        renderStep();
        document.getElementById('qm-next').onclick = next;
        document.getElementById('qm-back').onclick = back;
      };
    }
  }

  function back() {
    if (currentStep > 0) { currentStep--; renderStep(); }
  }

  function validateStep(n) {
    switch (n) {
      case 0:
        if (!state.full_name.trim()) return 'Please enter your name.';
        if (!state.phone.trim())     return 'Please enter your phone number.';
        if (!state.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(state.email)) return 'Please enter a valid email address.';
        break;
      case 2:
        if (!state.property_type) return 'Please select a property type.';
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

  function field(label, id, type, val, placeholder, required) {
    return '<div class="qm-field">' +
      '<label class="qm-label" for="' + id + '">' + label + (required ? ' <span class="qm-req">*</span>' : '') + '</label>' +
      '<input class="qm-input" type="' + type + '" id="' + id + '" value="' + escHtml(val || '') + '" placeholder="' + escHtml(placeholder || '') + '"' + (required ? ' required' : '') + '>' +
    '</div>';
  }

  function numberField(label, id, val, min, max) {
    return '<div class="qm-field">' +
      '<label class="qm-label" for="' + id + '">' + label + '</label>' +
      '<input class="qm-input" type="number" id="' + id + '" value="' + (val || '') + '" min="' + min + '" max="' + max + '">' +
    '</div>';
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

    // Footer nav
    document.getElementById('qm-next').addEventListener('click', next);
    document.getElementById('qm-back').addEventListener('click', back);
  });

  window.QuoteModal = { open: openModal, close: closeModal };
})();
