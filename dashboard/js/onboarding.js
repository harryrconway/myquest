(function () {
  'use strict';

  var state = {
    name: '', mobile: '', residential_address: '',
    emergency_contact_name: '', emergency_contact_number: '',
    profile_photo_url: '', police_check_url: '', drivers_licence_url: '',
    vehicle_make: '', vehicle_model: '', vehicle_registration: '',
    right_to_work_url: '',
    availability: { days: [], time: '' },
    employment_agreed: false, privacy_agreed: false, company_agreed: false,
  };

  var currentStep = 0;
  var userId = null;

  var STEPS = [
    { id: 'welcome',      title: 'Welcome!',            subtitle: 'Let\'s get your profile set up. This only takes a few minutes.' },
    { id: 'contact',      title: 'Your Contact Info',   subtitle: 'How can we reach you?' },
    { id: 'emergency',    title: 'Emergency Contact',   subtitle: 'Who should we call in an emergency?' },
    { id: 'documents',    title: 'Documents',           subtitle: 'Please upload your compliance documents.' },
    { id: 'driving',      title: 'Driving & Vehicle',   subtitle: 'Do you drive to jobs? Upload your licence and vehicle details.' },
    { id: 'availability', title: 'Availability',        subtitle: 'When are you generally available to work?' },
    { id: 'agreements',   title: 'Agreements',          subtitle: 'Please read and sign the following agreements.' },
  ];

  var DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  var TIMES = ['Morning (7am–12pm)', 'Afternoon (12pm–5pm)', 'Evening (5pm–8pm)', 'Flexible'];

  function esc(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function setProgress(step) {
    document.getElementById('ob-progress').style.width = Math.round((step / STEPS.length) * 100) + '%';
  }

  /* ── Render helpers ──────────────────────────────────────── */

  function field(label, id, type, value, placeholder, optional) {
    return '<div class="ob-field">' +
      '<label class="ob-label" for="' + id + '">' + label +
        (optional ? '<span>(optional)</span>' : '') +
      '</label>' +
      '<input class="ob-input" type="' + type + '" id="' + id + '" value="' + esc(value) + '" placeholder="' + esc(placeholder) + '">' +
    '</div>';
  }

  function uploadField(label, id, filename, optional) {
    var hasFile = !!filename;
    return '<div class="ob-field">' +
      '<label class="ob-label">' + label + (optional ? '<span>(optional)</span>' : '') + '</label>' +
      '<div class="ob-upload-area' + (hasFile ? ' has-file' : '') + '" id="' + id + '-area">' +
        '<input type="file" id="' + id + '" accept=".pdf,.jpg,.jpeg,.png" aria-label="' + label + '">' +
        '<div class="ob-upload-icon">' +
          '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">' +
          '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>' +
        '</div>' +
        '<p class="ob-upload-text">Click to upload or drag & drop</p>' +
        '<p class="ob-upload-text" style="font-size:11px;color:#cbd5e1;">PDF, JPG or PNG · max 5MB</p>' +
        (hasFile ? '<p class="ob-upload-filename" id="' + id + '-name">✓ File uploaded</p>' : '<p class="ob-upload-filename" id="' + id + '-name" style="display:none;"></p>') +
      '</div>' +
    '</div>';
  }

  /* ── Step renderers ──────────────────────────────────────── */

  function renderStep(n) {
    var s = STEPS[n];
    var html = '<div class="ob-header">' +
      '<div class="ob-step-label">Step ' + (n + 1) + ' of ' + STEPS.length + '</div>' +
      '<h1 class="ob-title">' + s.title + '</h1>' +
      '<p class="ob-subtitle">' + s.subtitle + '</p>' +
    '</div>' +
    '<div class="ob-body">' + renderBody(n) + '<div class="ob-error" id="ob-error"></div></div>' +
    '<div class="ob-footer">' + renderFooter(n) + '</div>';
    document.getElementById('ob-step-wrap').innerHTML = html;
    setProgress(n);
    wireStep(n);
  }

  function renderBody(n) {
    switch (n) {
      case 0: return renderWelcome();
      case 1: return renderContact();
      case 2: return renderEmergency();
      case 3: return renderDocuments();
      case 4: return renderDriving();
      case 5: return renderAvailability();
      case 6: return renderAgreements();
      default: return '';
    }
  }

  function renderFooter(n) {
    var back = n > 0 ? '<button class="btn-outline" id="ob-back">Back</button>' : '<div></div>';
    var next = n < STEPS.length - 1
      ? '<button class="btn-primary" id="ob-next">Continue</button>'
      : '<button class="btn-primary" id="ob-submit">Complete Profile</button>';
    var skip = (n === 4)
      ? '<button class="btn-skip" id="ob-skip">Skip this step</button>'
      : '';
    return back + '<div style="display:flex;gap:10px;align-items:center;">' + skip + next + '</div>';
  }

  function renderWelcome() {
    var initials = (state.name || '?').charAt(0).toUpperCase();
    return '<div class="ob-photo-wrap">' +
        '<div class="ob-photo-preview" id="ob-photo-circle">' +
          (state.profile_photo_url
            ? '<img src="' + esc(state.profile_photo_url) + '" alt="Profile photo">'
            : initials) +
        '</div>' +
        '<div>' +
          '<p style="font-size:15px;font-weight:700;color:#0f172a;margin-bottom:4px;">' + esc(state.name || 'Welcome') + '</p>' +
          '<label class="btn-outline" style="font-size:13px;cursor:pointer;display:inline-block;padding:7px 14px;">' +
            '<input type="file" id="ob-photo-input" accept="image/*" style="display:none;">Upload Photo' +
          '</label>' +
        '</div>' +
      '</div>' +
      field('Full Name', 'ob-name', 'text', state.name, 'Your full name');
  }

  function renderContact() {
    return field('Mobile Number', 'ob-mobile', 'tel', state.mobile, '04XX XXX XXX') +
      field('Residential Address', 'ob-address', 'text', state.residential_address, '123 Example St, Suburb NSW 2000');
  }

  function renderEmergency() {
    return field('Emergency Contact Name', 'ob-ec-name', 'text', state.emergency_contact_name, 'Full name') +
      field('Emergency Contact Number', 'ob-ec-number', 'tel', state.emergency_contact_number, '04XX XXX XXX');
  }

  function renderDocuments() {
    return uploadField('Police Check', 'ob-police', state.police_check_url ? 'uploaded' : '') +
      uploadField('Right to Work Documentation', 'ob-rtw', state.right_to_work_url ? 'uploaded' : '', true);
  }

  function renderDriving() {
    return uploadField('Driver\'s Licence', 'ob-licence', state.drivers_licence_url ? 'uploaded' : '', true) +
      '<hr class="ob-divider">' +
      '<p style="font-size:13px;font-weight:600;color:#374151;margin-bottom:14px;">Vehicle Details <span style="font-weight:400;color:#94a3b8;">(optional)</span></p>' +
      '<div class="ob-row-2">' +
        field('Make', 'ob-v-make', 'text', state.vehicle_make, 'e.g. Toyota', true) +
        field('Model', 'ob-v-model', 'text', state.vehicle_model, 'e.g. Corolla', true) +
      '</div>' +
      field('Registration', 'ob-v-rego', 'text', state.vehicle_registration, 'e.g. ABC123', true);
  }

  function renderAvailability() {
    var days = (state.availability.days || []);
    var dayBtns = DAYS.map(function (d) {
      return '<div class="ob-day-btn' + (days.indexOf(d) > -1 ? ' selected' : '') + '" data-day="' + d + '">' + d + '</div>';
    }).join('');

    var timePills = TIMES.map(function (t) {
      return '<span class="ob-pill' + (state.availability.time === t ? ' selected' : '') + '" data-time="' + esc(t) + '">' + esc(t) + '</span>';
    }).join('');

    return '<p style="font-size:13px;font-weight:600;color:#374151;margin-bottom:10px;">Available Days</p>' +
      '<div class="ob-day-grid">' + dayBtns + '</div>' +
      '<hr class="ob-divider">' +
      '<p style="font-size:13px;font-weight:600;color:#374151;margin-bottom:10px;">Preferred Time</p>' +
      '<div class="ob-time-pills">' + timePills + '</div>';
  }

  function renderAgreements() {
    return '<div class="ob-agreement-box">' +
        '<h4>Employment / Contractor Agreement</h4>' +
        '<p>This agreement sets out the terms under which you provide cleaning services to MyQuest. You will be engaged as an independent contractor, responsible for your own tax obligations. MyQuest will provide work opportunities but does not guarantee hours. You agree to attend scheduled jobs on time, maintain professional conduct, protect client privacy, and comply with WHS obligations. This agreement is governed by the laws of New South Wales, Australia.</p>' +
      '</div>' +
      '<label class="ob-agree-row' + (state.employment_agreed ? ' checked' : '') + '" id="ob-agree-row-emp">' +
        '<input type="checkbox" id="ob-agree-emp"' + (state.employment_agreed ? ' checked' : '') + '>' +
        '<label for="ob-agree-emp">I have read and agree to the <strong>Employment / Contractor Agreement</strong></label>' +
      '</label>' +

      '<div class="ob-agreement-box" style="margin-top:16px;">' +
        '<h4>Company Policies</h4>' +
        '<p><strong>Punctuality</strong> — Arrive on time for all scheduled jobs. Contact management immediately if you cannot attend.</p>' +
        '<p><strong>Presentation</strong> — Maintain a professional appearance at all times while on the job.</p>' +
        '<p><strong>Client Property</strong> — Treat all client property with care. Report any damage immediately.</p>' +
        '<p><strong>Communication</strong> — Respond to scheduling messages within 2 hours during business hours.</p>' +
        '<p><strong>Health &amp; Safety</strong> — Do not attend if unwell. Report any workplace hazards promptly.</p>' +
        '<p><strong>Confidentiality</strong> — Do not share client contact details or property access codes with anyone outside MyQuest.</p>' +
      '</div>' +
      '<label class="ob-agree-row' + (state.company_agreed ? ' checked' : '') + '" id="ob-agree-row-co">' +
        '<input type="checkbox" id="ob-agree-co"' + (state.company_agreed ? ' checked' : '') + '>' +
        '<label for="ob-agree-co">I have read and agree to the <strong>Company Policies</strong></label>' +
      '</label>' +

      '<label class="ob-agree-row' + (state.privacy_agreed ? ' checked' : '') + '" id="ob-agree-row-priv" style="margin-top:8px;">' +
        '<input type="checkbox" id="ob-agree-priv"' + (state.privacy_agreed ? ' checked' : '') + '>' +
        '<label for="ob-agree-priv">I have read and agree to the <a href="https://myquest.au/#privacy" target="_blank" rel="noopener">Privacy Policy</a></label>' +
      '</label>';
  }

  /* ── Wire step interactions ──────────────────────────────── */

  function wireStep(n) {
    var nextBtn   = document.getElementById('ob-next');
    var backBtn   = document.getElementById('ob-back');
    var submitBtn = document.getElementById('ob-submit');
    var skipBtn   = document.getElementById('ob-skip');

    if (backBtn)   backBtn.addEventListener('click',   function () { goTo(n - 1); });
    if (nextBtn)   nextBtn.addEventListener('click',   function () { tryAdvance(n); });
    if (submitBtn) submitBtn.addEventListener('click', function () { trySubmit(); });
    if (skipBtn)   skipBtn.addEventListener('click',   function () { goTo(n + 1); });

    switch (n) {
      case 0:
        bind('ob-name', 'input', function () { state.name = this.value; });
        var photoInput = document.getElementById('ob-photo-input');
        if (photoInput) {
          photoInput.addEventListener('change', async function () {
            if (!this.files || !this.files[0]) return;
            var file = this.files[0];
            if (file.size > 5 * 1024 * 1024) { showError('Photo must be under 5MB.'); return; }
            try {
              var url = await uploadDoc(file, 'profile-photo');
              state.profile_photo_url = url;
              var circle = document.getElementById('ob-photo-circle');
              if (circle) circle.innerHTML = '<img src="' + esc(url) + '" alt="Profile photo">';
            } catch (e) { showError('Photo upload failed. You can add it later.'); }
          });
        }
        break;

      case 1:
        bind('ob-mobile',  'input', function () { state.mobile               = this.value; });
        bind('ob-address', 'input', function () { state.residential_address  = this.value; });
        break;

      case 2:
        bind('ob-ec-name',   'input', function () { state.emergency_contact_name   = this.value; });
        bind('ob-ec-number', 'input', function () { state.emergency_contact_number = this.value; });
        break;

      case 3:
        wireUpload('ob-police',  'police-check',  function (url) { state.police_check_url   = url; });
        wireUpload('ob-rtw',     'right-to-work', function (url) { state.right_to_work_url  = url; });
        break;

      case 4:
        wireUpload('ob-licence', 'drivers-licence', function (url) { state.drivers_licence_url = url; });
        bind('ob-v-make',  'input', function () { state.vehicle_make         = this.value; });
        bind('ob-v-model', 'input', function () { state.vehicle_model        = this.value; });
        bind('ob-v-rego',  'input', function () { state.vehicle_registration = this.value; });
        break;

      case 5:
        document.querySelectorAll('.ob-day-btn').forEach(function (btn) {
          btn.addEventListener('click', function () {
            var day = this.dataset.day;
            var days = state.availability.days || [];
            var idx = days.indexOf(day);
            if (idx > -1) days.splice(idx, 1);
            else days.push(day);
            state.availability.days = days;
            this.classList.toggle('selected', idx === -1);
          });
        });
        document.querySelectorAll('.ob-pill').forEach(function (pill) {
          pill.addEventListener('click', function () {
            state.availability.time = this.dataset.time;
            document.querySelectorAll('.ob-pill').forEach(function (p) { p.classList.remove('selected'); });
            this.classList.add('selected');
          });
        });
        break;

      case 6:
        wireAgree('ob-agree-emp',  'ob-agree-row-emp',  function (v) { state.employment_agreed = v; });
        wireAgree('ob-agree-co',   'ob-agree-row-co',   function (v) { state.company_agreed    = v; });
        wireAgree('ob-agree-priv', 'ob-agree-row-priv', function (v) { state.privacy_agreed    = v; });
        break;
    }
  }

  function bind(id, evt, fn) {
    var el = document.getElementById(id);
    if (el) el.addEventListener(evt, fn);
  }

  function wireAgree(cbId, rowId, setter) {
    var cb  = document.getElementById(cbId);
    var row = document.getElementById(rowId);
    if (!cb) return;
    cb.addEventListener('change', function () {
      setter(this.checked);
      if (row) row.classList.toggle('checked', this.checked);
    });
  }

  function wireUpload(inputId, filename, setter) {
    var input = document.getElementById(inputId);
    var nameEl = document.getElementById(inputId + '-name');
    var area   = document.getElementById(inputId + '-area');
    if (!input) return;
    input.addEventListener('change', async function () {
      if (!this.files || !this.files[0]) return;
      var file = this.files[0];
      if (file.size > 5 * 1024 * 1024) { showError('File must be under 5MB.'); return; }
      if (nameEl) nameEl.textContent = '⏳ Uploading…';
      if (area)   area.classList.add('has-file');
      try {
        var url = await uploadDoc(file, filename);
        setter(url);
        if (nameEl) { nameEl.textContent = '✓ ' + file.name; nameEl.style.display = ''; }
      } catch (e) {
        showError('Upload failed — please try again.');
        if (nameEl) nameEl.textContent = '';
        if (area)   area.classList.remove('has-file');
      }
    });
  }

  /* ── Navigation & validation ─────────────────────────────── */

  function showError(msg) {
    var el = document.getElementById('ob-error');
    if (!el) return;
    el.textContent = msg;
    el.style.display = '';
    el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function hideError() {
    var el = document.getElementById('ob-error');
    if (el) el.style.display = 'none';
  }

  function tryAdvance(n) {
    hideError();
    switch (n) {
      case 0:
        state.name = (document.getElementById('ob-name') || {}).value || state.name;
        if (!state.name.trim()) { showError('Please enter your full name.'); return; }
        break;
      case 1:
        state.mobile              = (document.getElementById('ob-mobile')  || {}).value || '';
        state.residential_address = (document.getElementById('ob-address') || {}).value || '';
        if (!state.mobile.trim())              { showError('Mobile number is required.'); return; }
        if (!state.residential_address.trim()) { showError('Residential address is required.'); return; }
        break;
      case 2:
        state.emergency_contact_name   = (document.getElementById('ob-ec-name')   || {}).value || '';
        state.emergency_contact_number = (document.getElementById('ob-ec-number') || {}).value || '';
        if (!state.emergency_contact_name.trim())   { showError('Emergency contact name is required.'); return; }
        if (!state.emergency_contact_number.trim()) { showError('Emergency contact number is required.'); return; }
        break;
      case 3:
        if (!state.police_check_url) { showError('Police check upload is required.'); return; }
        break;
    }
    goTo(n + 1);
  }

  function goTo(n) {
    if (n < 0 || n >= STEPS.length) return;
    currentStep = n;
    renderStep(n);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /* ── File upload ─────────────────────────────────────────── */

  async function uploadDoc(file, filename) {
    var session = await MQ.supabase.auth.getSession();
    var uid = session.data && session.data.session && session.data.session.user.id;
    if (!uid) throw new Error('Not authenticated');
    var ext = file.name.split('.').pop().toLowerCase();
    var path = uid + '/' + filename + '.' + ext;
    var { error } = await MQ.supabase.storage.from('staff-documents').upload(path, file, { upsert: true });
    if (error) throw error;
    var { data: signed } = await MQ.supabase.storage.from('staff-documents').createSignedUrl(path, 60 * 60 * 24 * 365);
    return signed ? signed.signedUrl : path;
  }

  /* ── Final submit ────────────────────────────────────────── */

  async function trySubmit() {
    hideError();
    if (!state.employment_agreed) { showError('Please agree to the Employment / Contractor Agreement.'); return; }
    if (!state.company_agreed)    { showError('Please agree to the Company Policies.'); return; }
    if (!state.privacy_agreed)    { showError('Please agree to the Privacy Policy.'); return; }

    var submitBtn = document.getElementById('ob-submit');
    if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Saving…'; }

    var now = new Date().toISOString();
    var payload = {
      userId:               userId,
      name:                 state.name,
      mobile:               state.mobile,
      residential_address:  state.residential_address,
      emergency_contact_name:   state.emergency_contact_name,
      emergency_contact_number: state.emergency_contact_number,
      profile_photo_url:    state.profile_photo_url  || null,
      police_check_url:     state.police_check_url   || null,
      drivers_licence_url:  state.drivers_licence_url || null,
      vehicle_make:         state.vehicle_make        || null,
      vehicle_model:        state.vehicle_model       || null,
      vehicle_registration: state.vehicle_registration || null,
      right_to_work_url:    state.right_to_work_url   || null,
      availability:         state.availability,
      employment_agreement_signed_at: state.employment_agreed ? now : null,
      privacy_policy_signed_at:       state.privacy_agreed    ? now : null,
      company_policy_signed_at:       state.company_agreed    ? now : null,
      onboarding_complete:  true,
    };

    try {
      var session = await MQ.supabase.auth.getSession();
      var token   = session.data && session.data.session && session.data.session.access_token;
      if (!token) throw new Error('Session expired. Please refresh and try again.');

      var res  = await fetch('/api/update-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
        body: JSON.stringify(payload),
      });
      var data = await res.json();
      if (data.error) throw new Error(data.error);

      // Mark status active in Supabase
      await MQ.supabase.from('profiles').update({ status: 'active' }).eq('id', userId);

      document.getElementById('ob-step-wrap').hidden = true;
      document.getElementById('ob-success').hidden   = false;
      document.getElementById('ob-progress').style.width = '100%';
      setTimeout(function () { window.location.href = 'index.html'; }, 2500);

    } catch (e) {
      if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Complete Profile'; }
      showError(e.message || 'Something went wrong. Please try again.');
    }
  }

  /* ── Init ────────────────────────────────────────────────── */

  document.addEventListener('mq:ready', async function () {
    var session = await MQ.supabase.auth.getSession();
    if (!session.data || !session.data.session) {
      window.location.href = '../login.html';
      return;
    }
    userId = session.data.session.user.id;

    var { data: profile } = await MQ.supabase
      .from('profiles')
      .select('name, mobile, status')
      .eq('id', userId)
      .single();

    if (profile) {
      state.name   = profile.name   || '';
      state.mobile = profile.mobile || '';
    }

    renderStep(0);
  });

})();
