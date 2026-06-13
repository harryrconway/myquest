/* MyQuest — onboarding.js */
(function () {
  'use strict';

  var TOTAL_STEPS   = 7;
  var ALLOWED_EXTS  = ['pdf', 'jpg', 'jpeg', 'png'];
  var MAX_FILE_BYTES = 5 * 1024 * 1024;

  var DAYS  = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  var TIMES = ['Morning', 'Afternoon', 'Evening', 'Flexible'];

  /* ── collected data ──────────────────────────────────────── */

  var state = {
    userId: null,
    firstName: '', lastName: '', phone: '', dob: '',
    address: '', suburb: '', stateVal: '', postcode: '',
    emergencyName: '', emergencyPhone: '', emergencyRel: '',
    vehicleMake: '', vehicleModel: '', vehicleRego: '',
    availDays: [], availStart: '', availEnd: '',
    photoFile: null,     photoUrl:       null,
    policeFile: null,    policeUrl:      null,
    licenceFile: null,   licenceUrl:     null,
    rtwFile: null,       rtwUrl:         null,
    agreedEmployment: false, agreedCompany: false, agreedPrivacy: false,
  };

  /* ── helpers ─────────────────────────────────────────────── */

  function sanitize(val, maxLen) {
    return String(val || '').trim().slice(0, maxLen || 200);
  }
  function sanitizePhone(val) {
    return sanitize(val, 20).replace(/[^\d\s\-+().]/g, '');
  }
  function esc(s) {
    return String(s || '')
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function qs(sel, ctx) { return (ctx || document).querySelector(sel); }
  function isAdmin() {
    return window.MQ && MQ.session &&
      (MQ.session.role === 'owner' || MQ.session.role === 'manager');
  }

  /* ── upload area (label wrapping hidden input — works on iOS) */

  function uploadField(labelText, inputId, optional) {
    var optTag = optional ? '<span class="ob-label-opt">(optional)</span>' : '';
    return [
      '<div class="ob-field">',
        '<p class="ob-label">' + labelText + optTag + '</p>',
        '<label class="ob-upload-area" for="' + inputId + '" id="' + inputId + '-area">',
          '<span class="ob-upload-icon">',
            '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">',
              '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>',
              '<polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>',
            '</svg>',
          '</span>',
          '<span class="ob-upload-text">Click to upload</span>',
          '<span class="ob-upload-hint">PDF, JPG or PNG — max 5 MB</span>',
          '<span class="ob-upload-filename" id="' + inputId + '-name" hidden></span>',
          '<input type="file" id="' + inputId + '" accept=".pdf,.jpg,.jpeg,.png" style="display:none">',
        '</label>',
        '<p class="ob-error" id="' + inputId + '-err" style="display:none;"></p>',
      '</div>',
    ].join('');
  }

  function wireUpload(inputId, setter) {
    var input  = document.getElementById(inputId);
    var area   = document.getElementById(inputId + '-area');
    var nameEl = document.getElementById(inputId + '-name');
    var errEl  = document.getElementById(inputId + '-err');
    if (!input || !area) return;

    function handleFile(file) {
      if (!file) return;
      if (errEl) { errEl.textContent = ''; errEl.style.display = 'none'; }
      var ext = file.name.split('.').pop().toLowerCase();
      if (ALLOWED_EXTS.indexOf(ext) === -1) {
        if (errEl) { errEl.textContent = 'Please upload a PDF, JPG or PNG file.'; errEl.style.display = 'block'; }
        return;
      }
      if (file.size > MAX_FILE_BYTES) {
        if (errEl) { errEl.textContent = 'File must be under 5 MB.'; errEl.style.display = 'block'; }
        return;
      }
      setter(file);
      if (nameEl) { nameEl.textContent = file.name; nameEl.hidden = false; }
      area.classList.add('has-file');
      var txt = qs('.ob-upload-text', area);
      if (txt) txt.textContent = 'File selected';
    }

    input.addEventListener('change', function () {
      if (input.files && input.files[0]) handleFile(input.files[0]);
    });
    area.addEventListener('dragover',  function (e) { e.preventDefault(); area.classList.add('drag-over'); });
    area.addEventListener('dragleave', function ()  { area.classList.remove('drag-over'); });
    area.addEventListener('drop', function (e) {
      e.preventDefault(); area.classList.remove('drag-over');
      var f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
      if (f) handleFile(f);
    });
  }

  /* ── step HTML ───────────────────────────────────────────── */

  var STEPS = [
    { title: 'Personal details',   subtitle: 'Tell us a bit about yourself.',                 render: renderS1, collect: collectS1, validate: validateS1 },
    { title: 'Address',            subtitle: 'Where are you currently living?',               render: renderS2, collect: collectS2, validate: validateS2 },
    { title: 'Emergency contact',  subtitle: 'Who should we contact in an emergency?',        render: renderS3, collect: collectS3, validate: validateS3 },
    { title: 'Availability',       subtitle: 'When are you available to work?',               render: renderS4, collect: function(){}, validate: validateS4 },
    { title: 'Profile photo',      subtitle: 'Add a photo so your team can recognise you.',   render: renderS5, collect: function(){}, validate: function(){ return null; } },
    { title: 'Documents',          subtitle: 'Upload your compliance documents.',             render: renderS6, collect: function(){}, validate: validateS6 },
    { title: 'Agreements',         subtitle: 'Please review and agree to the following.',     render: renderS7, collect: collectS7, validate: validateS7 },
  ];

  function renderS1() {
    return [
      '<div class="ob-row-2">',
        '<div class="ob-field"><label class="ob-label" for="ob-first">First name</label>',
          '<input class="ob-input" id="ob-first" type="text" autocomplete="given-name" placeholder="Jane" maxlength="50" value="' + esc(state.firstName) + '"></div>',
        '<div class="ob-field"><label class="ob-label" for="ob-last">Last name</label>',
          '<input class="ob-input" id="ob-last" type="text" autocomplete="family-name" placeholder="Smith" maxlength="50" value="' + esc(state.lastName) + '"></div>',
      '</div>',
      '<div class="ob-row-2">',
        '<div class="ob-field"><label class="ob-label" for="ob-phone">Mobile number</label>',
          '<input class="ob-input" id="ob-phone" type="tel" autocomplete="tel" placeholder="0400 000 000" maxlength="20" value="' + esc(state.phone) + '"></div>',
        '<div class="ob-field"><label class="ob-label" for="ob-dob">Date of birth</label>',
          '<input class="ob-input" id="ob-dob" type="date" autocomplete="bday" value="' + esc(state.dob) + '"></div>',
      '</div>',
    ].join('');
  }
  function collectS1() {
    state.firstName = sanitize((qs('#ob-first') || {}).value, 50);
    state.lastName  = sanitize((qs('#ob-last')  || {}).value, 50);
    state.phone     = sanitizePhone((qs('#ob-phone') || {}).value);
    state.dob       = sanitize((qs('#ob-dob')   || {}).value, 10);
  }
  function validateS1() {
    collectS1();
    if (!state.firstName) return 'Please enter your first name.';
    if (!state.lastName)  return 'Please enter your last name.';
    if (!state.phone)     return 'Please enter your mobile number.';
    if (!state.dob)       return 'Please enter your date of birth.';
    return null;
  }

  function renderS2() {
    var states = ['ACT','NSW','NT','QLD','SA','TAS','VIC','WA'].map(function (s) {
      return '<option value="' + s + '"' + (s === state.stateVal ? ' selected' : '') + '>' + s + '</option>';
    }).join('');
    return [
      '<div class="ob-field"><label class="ob-label" for="ob-address">Street address</label>',
        '<input class="ob-input" id="ob-address" type="text" autocomplete="street-address" placeholder="123 Main Street" maxlength="100" value="' + esc(state.address) + '"></div>',
      '<div class="ob-row-2">',
        '<div class="ob-field"><label class="ob-label" for="ob-suburb">Suburb</label>',
          '<input class="ob-input" id="ob-suburb" type="text" autocomplete="address-level2" placeholder="Melbourne" maxlength="60" value="' + esc(state.suburb) + '"></div>',
        '<div class="ob-field"><label class="ob-label" for="ob-state">State</label>',
          '<select class="ob-input" id="ob-state" autocomplete="address-level1">' + states + '</select></div>',
      '</div>',
      '<div class="ob-field" style="max-width:160px"><label class="ob-label" for="ob-postcode">Postcode</label>',
        '<input class="ob-input" id="ob-postcode" type="text" inputmode="numeric" placeholder="3000" maxlength="4" value="' + esc(state.postcode) + '"></div>',
    ].join('');
  }
  function collectS2() {
    state.address  = sanitize((qs('#ob-address')  || {}).value, 100);
    state.suburb   = sanitize((qs('#ob-suburb')   || {}).value, 60);
    state.stateVal = sanitize((qs('#ob-state')    || {}).value, 3);
    state.postcode = sanitize((qs('#ob-postcode') || {}).value, 4).replace(/\D/g, '');
  }
  function validateS2() {
    collectS2();
    if (!state.address)  return 'Please enter your street address.';
    if (!state.suburb)   return 'Please enter your suburb.';
    if (!state.stateVal) return 'Please select your state.';
    if (!state.postcode || state.postcode.length < 4) return 'Please enter a valid 4-digit postcode.';
    return null;
  }

  function renderS3() {
    return [
      '<div class="ob-field"><label class="ob-label" for="ob-ec-name">Full name</label>',
        '<input class="ob-input" id="ob-ec-name" type="text" placeholder="Jane Smith" maxlength="100" value="' + esc(state.emergencyName) + '"></div>',
      '<div class="ob-row-2">',
        '<div class="ob-field"><label class="ob-label" for="ob-ec-phone">Phone number</label>',
          '<input class="ob-input" id="ob-ec-phone" type="tel" placeholder="0400 000 000" maxlength="20" value="' + esc(state.emergencyPhone) + '"></div>',
        '<div class="ob-field"><label class="ob-label" for="ob-ec-rel">Relationship</label>',
          '<input class="ob-input" id="ob-ec-rel" type="text" placeholder="e.g. Partner, Parent" maxlength="50" value="' + esc(state.emergencyRel) + '"></div>',
      '</div>',
    ].join('');
  }
  function collectS3() {
    state.emergencyName  = sanitize((qs('#ob-ec-name')  || {}).value, 100);
    state.emergencyPhone = sanitizePhone((qs('#ob-ec-phone') || {}).value);
    state.emergencyRel   = sanitize((qs('#ob-ec-rel')   || {}).value, 50);
  }
  function validateS3() {
    collectS3();
    if (!state.emergencyName)  return 'Please enter an emergency contact name.';
    if (!state.emergencyPhone) return 'Please enter their phone number.';
    if (!state.emergencyRel)   return 'Please enter your relationship to them.';
    return null;
  }

  function renderS4() {
    var dayBtns = DAYS.map(function (d) {
      var sel = state.availDays.indexOf(d) !== -1 ? ' selected' : '';
      return '<button type="button" class="ob-day-btn' + sel + '" data-day="' + d + '">' + d + '</button>';
    }).join('');
    var startPills = TIMES.map(function (t) {
      var sel = state.availStart === t ? ' selected' : '';
      return '<button type="button" class="ob-pill' + sel + '" data-time-type="start" data-time="' + esc(t) + '">' + esc(t) + '</button>';
    }).join('');
    var endPills = TIMES.map(function (t) {
      var sel = state.availEnd === t ? ' selected' : '';
      return '<button type="button" class="ob-pill' + sel + '" data-time-type="end" data-time="' + esc(t) + '">' + esc(t) + '</button>';
    }).join('');
    return [
      '<p class="ob-section-label">Days available</p>',
      '<div class="ob-day-grid">' + dayBtns + '</div>',
      '<hr class="ob-divider">',
      '<p class="ob-section-label">Preferred start time</p>',
      '<div class="ob-time-pills">' + startPills + '</div>',
      '<hr class="ob-divider">',
      '<p class="ob-section-label">Preferred end time</p>',
      '<div class="ob-time-pills">' + endPills + '</div>',
    ].join('');
  }
  function validateS4() {
    if (!state.availDays.length) return 'Please select at least one available day.';
    if (!state.availStart)       return 'Please select a preferred start time.';
    if (!state.availEnd)         return 'Please select a preferred end time.';
    return null;
  }
  function wireS4() {
    document.querySelectorAll('.ob-day-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var d = btn.dataset.day;
        var idx = state.availDays.indexOf(d);
        if (idx === -1) { state.availDays.push(d); btn.classList.add('selected'); }
        else            { state.availDays.splice(idx, 1); btn.classList.remove('selected'); }
      });
    });
    document.querySelectorAll('.ob-pill[data-time-type="start"]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        state.availStart = btn.dataset.time;
        document.querySelectorAll('.ob-pill[data-time-type="start"]').forEach(function (b) { b.classList.remove('selected'); });
        btn.classList.add('selected');
      });
    });
    document.querySelectorAll('.ob-pill[data-time-type="end"]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        state.availEnd = btn.dataset.time;
        document.querySelectorAll('.ob-pill[data-time-type="end"]').forEach(function (b) { b.classList.remove('selected'); });
        btn.classList.add('selected');
      });
    });
  }

  function renderS5() {
    var initLetter = (state.firstName || '?').charAt(0).toUpperCase();
    var preview = state.photoUrl
      ? '<img src="' + esc(state.photoUrl) + '" alt="Your photo">'
      : initLetter;
    return [
      '<div class="ob-photo-wrap">',
        '<div class="ob-photo-preview" id="ob-photo-preview">' + preview + '</div>',
        '<div>',
          '<p class="ob-photo-name">' + esc(state.firstName) + ' ' + esc(state.lastName) + '</p>',
          '<label class="btn-outline" for="ob-photo-input" style="display:inline-block;cursor:pointer;margin-bottom:0;">Choose photo</label>',
          '<input type="file" id="ob-photo-input" accept=".jpg,.jpeg,.png" style="display:none">',
          '<p style="font-size:12px;color:#94a3b8;margin-top:6px;">JPG or PNG — max 5 MB</p>',
        '</div>',
      '</div>',
    ].join('');
  }
  function wireS5() {
    var input   = document.getElementById('ob-photo-input');
    var preview = document.getElementById('ob-photo-preview');
    if (!input || !preview) return;
    input.addEventListener('change', function () {
      if (!input.files || !input.files[0]) return;
      var file = input.files[0];
      var ext = file.name.split('.').pop().toLowerCase();
      if (['jpg','jpeg','png'].indexOf(ext) === -1) return;
      if (file.size > MAX_FILE_BYTES) return;
      state.photoFile = file;
      var reader = new FileReader();
      reader.onload = function (e) {
        preview.innerHTML = '<img src="' + e.target.result + '" alt="Your photo">';
      };
      reader.readAsDataURL(file);
    });
  }

  function renderS6() {
    return [
      uploadField('National Police Check', 'ob-police'),
      '<hr class="ob-divider">',
      uploadField("Driver's Licence", 'ob-licence'),
      '<hr class="ob-divider">',
      uploadField('Right to Work', 'ob-rtw', true),
    ].join('');
  }
  function wireS6() {
    wireUpload('ob-police',  function (f) { state.policeFile  = f; });
    wireUpload('ob-licence', function (f) { state.licenceFile = f; });
    wireUpload('ob-rtw',     function (f) { state.rtwFile     = f; });
  }
  function validateS6() {
    if (!state.policeFile  && !state.policeUrl)  return 'Please upload your National Police Check.';
    if (!state.licenceFile && !state.licenceUrl) return "Please upload your Driver's Licence.";
    return null;
  }

  function renderS7() {
    return [
      '<p class="ob-label">Employment / Contractor Agreement</p>',
      '<div class="ob-agreement-box">',
        '<h4>Employment / Contractor Agreement</h4>',
        '<p>This agreement sets out the terms under which you provide cleaning services to MyQuest. You will be engaged as an independent contractor, responsible for your own tax obligations. MyQuest will provide work opportunities but does not guarantee hours. You agree to attend scheduled jobs on time, maintain professional conduct, protect client privacy, and comply with WHS obligations. This agreement is governed by the laws of New South Wales, Australia.</p>',
      '</div>',
      '<label class="ob-agree-row' + (state.agreedEmployment ? ' checked' : '') + '" id="ob-row-emp">',
        '<input type="checkbox" id="ob-chk-emp"' + (state.agreedEmployment ? ' checked' : '') + '>',
        '<span>I have read and agree to the <strong>Employment / Contractor Agreement</strong></span>',
      '</label>',

      '<p class="ob-label" style="margin-top:18px;">Company Policies</p>',
      '<div class="ob-agreement-box">',
        '<h4>Company Policies</h4>',
        '<p><strong>Punctuality</strong> — Arrive on time for all scheduled jobs. Contact management immediately if you cannot attend.</p>',
        '<p><strong>Presentation</strong> — Maintain a professional appearance at all times while on the job.</p>',
        '<p><strong>Client Property</strong> — Treat all client property with care. Report any damage immediately.</p>',
        '<p><strong>Communication</strong> — Respond to scheduling messages within 2 hours during business hours.</p>',
        '<p><strong>Health &amp; Safety</strong> — Do not attend if unwell. Report any workplace hazards promptly.</p>',
        '<p><strong>Confidentiality</strong> — Do not share client contact details or access codes with anyone outside MyQuest.</p>',
      '</div>',
      '<label class="ob-agree-row' + (state.agreedCompany ? ' checked' : '') + '" id="ob-row-co">',
        '<input type="checkbox" id="ob-chk-co"' + (state.agreedCompany ? ' checked' : '') + '>',
        '<span>I have read and agree to the <strong>Company Policies</strong></span>',
      '</label>',

      '<label class="ob-agree-row' + (state.agreedPrivacy ? ' checked' : '') + '" id="ob-row-priv" style="margin-top:8px;">',
        '<input type="checkbox" id="ob-chk-priv"' + (state.agreedPrivacy ? ' checked' : '') + '>',
        '<span>I have read and agree to the <a href="https://myquest.au/#privacy" target="_blank" rel="noopener">Privacy Policy</a></span>',
      '</label>',
    ].join('');
  }
  function wireS7() {
    function wireChk(chkId, rowId, setter) {
      var chk = document.getElementById(chkId);
      var row = document.getElementById(rowId);
      if (!chk) return;
      chk.addEventListener('change', function () {
        setter(chk.checked);
        if (row) row.classList.toggle('checked', chk.checked);
      });
    }
    wireChk('ob-chk-emp',  'ob-row-emp',  function (v) { state.agreedEmployment = v; });
    wireChk('ob-chk-co',   'ob-row-co',   function (v) { state.agreedCompany    = v; });
    wireChk('ob-chk-priv', 'ob-row-priv', function (v) { state.agreedPrivacy    = v; });
  }
  function collectS7() {
    state.agreedEmployment = !!(document.getElementById('ob-chk-emp')  || {}).checked;
    state.agreedCompany    = !!(document.getElementById('ob-chk-co')   || {}).checked;
    state.agreedPrivacy    = !!(document.getElementById('ob-chk-priv') || {}).checked;
  }
  function validateS7() {
    collectS7();
    if (!state.agreedEmployment) return 'Please agree to the Employment / Contractor Agreement.';
    if (!state.agreedCompany)    return 'Please agree to the Company Policies.';
    if (!state.agreedPrivacy)    return 'Please agree to the Privacy Policy.';
    return null;
  }

  /* ── render step shell ───────────────────────────────────── */

  function dotsHtml(n) {
    var out = '<div class="ob-dots-row">';
    for (var i = 1; i <= TOTAL_STEPS; i++) {
      if (i < n)        out += '<span class="ob-dot ob-dot--done"></span>';
      else if (i === n) out += '<span class="ob-dot ob-dot--active"></span>';
      else              out += '<span class="ob-dot"></span>';
    }
    return out + '</div>';
  }

  var currentStep = 1;

  function showStep(n) {
    if (n < 1 || n > TOTAL_STEPS) return;
    var s = STEPS[n - 1];
    var wrap = document.getElementById('ob-step-wrap');
    if (!wrap) return;

    var pct = Math.round(((n - 1) / TOTAL_STEPS) * 100);
    var prog = document.getElementById('ob-progress');
    if (prog) prog.style.width = pct + '%';

    var backBtn  = n > 1 ? '<button type="button" class="btn-outline" id="ob-back">Back</button>' : '<span></span>';
    var nextLabel = n < TOTAL_STEPS ? 'Continue' : 'Complete setup';
    var skipNote  = n === 5 ? '<button type="button" class="btn-skip" id="ob-skip-photo">Skip for now</button>' : '';
    var adminBar  = isAdmin()
      ? '<div class="ob-admin-bar"><span class="ob-admin-label">&#9889; Dev / Testing</span><button type="button" class="ob-admin-skip" id="ob-admin-fwd">Skip step</button></div>'
      : '';

    wrap.innerHTML = [
      '<div class="ob-header">',
        dotsHtml(n),
        '<p class="ob-step-label">Step ' + n + ' of ' + TOTAL_STEPS + '</p>',
        '<h1 class="ob-title">' + s.title + '</h1>',
        '<p class="ob-subtitle">' + s.subtitle + '</p>',
      '</div>',
      '<div class="ob-body" id="ob-body">',
        s.render(),
        '<p class="ob-error" id="ob-step-error" style="display:none;margin-top:14px;"></p>',
      '</div>',
      '<div class="ob-footer">',
        backBtn,
        '<div class="ob-footer-right">',
          skipNote,
          '<button type="button" class="btn-primary" id="ob-next">' + nextLabel + '</button>',
        '</div>',
      '</div>',
      adminBar,
    ].join('');

    // per-step wiring
    if (n === 4) wireS4();
    if (n === 5) wireS5();
    if (n === 6) wireS6();
    if (n === 7) wireS7();

    var backEl = document.getElementById('ob-back');
    if (backEl) backEl.addEventListener('click', function () { showStep(n - 1); });

    var skipPhoto = document.getElementById('ob-skip-photo');
    if (skipPhoto) skipPhoto.addEventListener('click', function () { showStep(n + 1); });

    var adminSkip = document.getElementById('ob-admin-fwd');
    if (adminSkip) adminSkip.addEventListener('click', function () {
      try { s.collect(); } catch (e) {}
      if (n < TOTAL_STEPS) showStep(n + 1); else submitAll();
    });

    var nextEl = document.getElementById('ob-next');
    if (nextEl) nextEl.addEventListener('click', function () {
      var err = s.validate();
      if (err) { showError(err); return; }
      if (n < TOTAL_STEPS) showStep(n + 1); else submitAll();
    });

    currentStep = n;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function showError(msg) {
    var el = document.getElementById('ob-step-error');
    if (!el) return;
    el.textContent = msg;
    el.style.display = 'block';
    el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  /* ── upload to Supabase Storage ──────────────────────────── */

  async function uploadDoc(file, filename) {
    var sb  = window.MQ && MQ.supabase;
    if (!sb) throw new Error('Not authenticated.');
    var uid = state.userId;
    if (!uid) {
      var u = await sb.auth.getUser();
      uid = u.data && u.data.user && u.data.user.id;
    }
    if (!uid) throw new Error('No user session.');
    var ext  = file.name.split('.').pop().toLowerCase();
    var path = uid + '/' + filename + '.' + ext;
    var res  = await sb.storage.from('staff-documents').upload(path, file, { upsert: true });
    if (res.error) throw new Error(res.error.message);
    var signed = await sb.storage.from('staff-documents').createSignedUrl(path, 60 * 60 * 24 * 365);
    return signed.data ? signed.data.signedUrl : path;
  }

  /* ── final submit ────────────────────────────────────────── */

  async function submitAll() {
    var nextEl  = document.getElementById('ob-next');
    var adminEl = document.getElementById('ob-admin-fwd');
    if (nextEl)  { nextEl.textContent = 'Saving…'; nextEl.disabled = true; }
    if (adminEl) adminEl.disabled = true;

    try {
      if (state.policeFile)  state.policeUrl  = await uploadDoc(state.policeFile,  'police-check');
      if (state.licenceFile) state.licenceUrl = await uploadDoc(state.licenceFile, 'drivers-licence');
      if (state.rtwFile)     state.rtwUrl     = await uploadDoc(state.rtwFile,     'right-to-work');
      if (state.photoFile)   state.photoUrl   = await uploadDoc(state.photoFile,   'profile-photo');

      var now = new Date().toISOString();
      var payload = {
        userId:                   state.userId,
        name:                     (state.firstName + ' ' + state.lastName).trim(),
        first_name:               state.firstName,
        last_name:                state.lastName,
        phone:                    state.phone,
        mobile:                   state.phone,
        date_of_birth:            state.dob,
        address:                  state.address,
        suburb:                   state.suburb,
        state:                    state.stateVal,
        postcode:                 state.postcode,
        residential_address:      [state.address, state.suburb, state.stateVal, state.postcode].filter(Boolean).join(', '),
        emergency_contact_name:   state.emergencyName,
        emergency_contact_number: state.emergencyPhone,
        emergency_relation:       state.emergencyRel,
        available_days:           state.availDays,
        available_start:          state.availStart,
        available_end:            state.availEnd,
        availability:             { days: state.availDays, start: state.availStart, end: state.availEnd },
        profile_photo_url:        state.photoUrl  || null,
        police_check_url:         state.policeUrl || null,
        drivers_licence_url:      state.licenceUrl || null,
        right_to_work_url:        state.rtwUrl    || null,
        onboarding_complete:      true,
        employment_agreement_signed_at: state.agreedEmployment ? now : null,
        company_policy_signed_at:       state.agreedCompany    ? now : null,
        privacy_policy_signed_at:       state.agreedPrivacy    ? now : null,
      };

      var sb = window.MQ && MQ.supabase;
      var token = '';
      if (sb) {
        var sess = await sb.auth.getSession();
        if (sess.data && sess.data.session) token = sess.data.session.access_token;
      }

      var res = await fetch('/api/update-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
        body: JSON.stringify(payload),
      });
      var result;
      try { result = await res.json(); } catch (e) { result = { error: 'Unexpected server response.' }; }
      if (result && result.error) throw new Error(result.error);

      if (sb && state.userId) {
        await sb.from('profiles').update({ status: 'active' }).eq('id', state.userId);
      }

      // Show success
      var stepWrap = document.getElementById('ob-step-wrap');
      var success  = document.getElementById('ob-success');
      if (stepWrap) stepWrap.hidden = true;
      if (success)  success.hidden  = false;
      if (document.getElementById('ob-progress')) document.getElementById('ob-progress').style.width = '100%';
      setTimeout(function () { window.location.href = 'index.html'; }, 2400);

    } catch (e) {
      if (nextEl)  { nextEl.textContent = 'Complete setup'; nextEl.disabled = false; }
      if (adminEl) adminEl.disabled = false;
      showError('Something went wrong: ' + (e.message || 'Please try again.'));
    }
  }

  /* ── init ────────────────────────────────────────────────── */

  document.addEventListener('mq:ready', async function () {
    var sb = window.MQ && MQ.supabase;
    if (!sb) { window.location.href = '../login.html'; return; }

    var sess = await sb.auth.getSession();
    if (!sess.data || !sess.data.session) { window.location.href = '../login.html'; return; }

    state.userId = sess.data.session.user.id;

    var profile = await sb.from('profiles').select('name, mobile').eq('id', state.userId).single();
    if (profile.data) {
      var parts = (profile.data.name || '').split(' ');
      state.firstName = parts[0] || '';
      state.lastName  = parts.slice(1).join(' ') || '';
      state.phone     = profile.data.mobile || '';
    }

    showStep(1);
  });

})();
