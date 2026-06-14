/* MyQuest — onboarding.js */
(function () {
  'use strict';

  var TOTAL_STEPS   = 6;
  var ALLOWED_EXTS  = ['pdf', 'jpg', 'jpeg', 'png'];
  var MAX_FILE_BYTES = 5 * 1024 * 1024;

  /* ── state ───────────────────────────────────────────────── */

  var state = {
    userId: null,
    firstName: '', lastName: '', phone: '', dob: '',
    address: '', suburb: '', stateVal: '', postcode: '',
    emergencyName: '', emergencyPhone: '', emergencyRel: '',
    photoFile: null,   photoUrl:   null,
    policeFile: null,  policeUrl:  null,
    licenceFile: null, licenceUrl: null,
    rtwFile: null,     rtwUrl:     null,
    agreedEmployment: false, agreedCompany: false, agreedPrivacy: false,
  };

  /* ── helpers ─────────────────────────────────────────────── */

  function sanitize(val, maxLen) { return String(val || '').trim().slice(0, maxLen || 200); }
  function sanitizePhone(val)    { return sanitize(val, 20).replace(/[^\d\s\-+().]/g, ''); }
  function esc(s) {
    return String(s || '')
      .replace(/&/g,'&amp;').replace(/</g,'&lt;')
      .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }
  function qs(sel, ctx) { return (ctx || document).querySelector(sel); }
  function isAdmin() {
    return window.MQ && MQ.session &&
      (MQ.session.role === 'owner' || MQ.session.role === 'manager');
  }

  /* ── upload area ─────────────────────────────────────────── */

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

  /* ── DOB picker wiring ───────────────────────────────────── */

  function wireDOB() {
    var dd   = document.getElementById('ob-dob-dd');
    var mm   = document.getElementById('ob-dob-mm');
    var yyyy = document.getElementById('ob-dob-yyyy');
    if (!dd || !mm || !yyyy) return;

    function digitsOnly(input) {
      input.addEventListener('input', function () {
        var pos = input.selectionStart;
        input.value = input.value.replace(/\D/g, '');
        try { input.setSelectionRange(pos, pos); } catch(e) {}
      });
    }
    digitsOnly(dd); digitsOnly(mm); digitsOnly(yyyy);

    // Auto-advance when field full
    dd.addEventListener('input', function () {
      if (dd.value.length >= 2) { mm.focus(); mm.select(); }
    });
    mm.addEventListener('input', function () {
      if (mm.value.length >= 2) { yyyy.focus(); yyyy.select(); }
    });

    // Backspace on empty field goes back
    mm.addEventListener('keydown', function (e) {
      if (e.key === 'Backspace' && mm.value === '') { dd.focus(); dd.setSelectionRange(2, 2); }
    });
    yyyy.addEventListener('keydown', function (e) {
      if (e.key === 'Backspace' && yyyy.value === '') { mm.focus(); mm.setSelectionRange(2, 2); }
    });
  }

  /* ── step HTML ───────────────────────────────────────────── */

  var STEPS = [
    { title: 'Personal details',  subtitle: 'Tell us a bit about yourself.',              render: renderS1, collect: collectS1, validate: validateS1 },
    { title: 'Address',           subtitle: 'Where are you currently living?',            render: renderS2, collect: collectS2, validate: validateS2 },
    { title: 'Emergency contact', subtitle: 'Who should we contact in an emergency?',     render: renderS3, collect: collectS3, validate: validateS3 },
    { title: 'Profile photo',     subtitle: 'Add a photo so your team can recognise you.',render: renderS5, collect: function(){}, validate: function(){ return null; } },
    { title: 'Documents',         subtitle: 'Upload your compliance documents.',          render: renderS6, collect: function(){}, validate: validateS6 },
    { title: 'Agreements',        subtitle: 'Please review and agree to the following.',  render: renderS7, collect: collectS7, validate: validateS7 },
  ];

  function renderS1() {
    // Pre-populate DOB fields from stored ISO date (YYYY-MM-DD)
    var dobDD = '', dobMM = '', dobYYYY = '';
    if (state.dob) {
      var parts = state.dob.split('-');
      dobYYYY = parts[0] || ''; dobMM = parts[1] || ''; dobDD = parts[2] || '';
    }
    return [
      '<div class="ob-row-2">',
        '<div class="ob-field"><label class="ob-label" for="ob-first">First name</label>',
          '<input class="ob-input" id="ob-first" type="text" autocomplete="given-name" placeholder="Jane" maxlength="50" value="' + esc(state.firstName) + '"></div>',
        '<div class="ob-field"><label class="ob-label" for="ob-last">Last name</label>',
          '<input class="ob-input" id="ob-last" type="text" autocomplete="family-name" placeholder="Smith" maxlength="50" value="' + esc(state.lastName) + '"></div>',
      '</div>',
      '<div class="ob-field"><label class="ob-label" for="ob-phone">Mobile number</label>',
        '<input class="ob-input" id="ob-phone" type="tel" autocomplete="tel" placeholder="0400 000 000" maxlength="20" value="' + esc(state.phone) + '"></div>',
      '<div class="ob-field">',
        '<label class="ob-label">Date of birth</label>',
        '<div class="ob-dob-wrap">',
          '<input class="ob-input ob-dob-part" id="ob-dob-dd" type="text" inputmode="numeric" placeholder="DD" maxlength="2" value="' + esc(dobDD) + '">',
          '<span class="ob-dob-sep">/</span>',
          '<input class="ob-input ob-dob-part" id="ob-dob-mm" type="text" inputmode="numeric" placeholder="MM" maxlength="2" value="' + esc(dobMM) + '">',
          '<span class="ob-dob-sep">/</span>',
          '<input class="ob-input ob-dob-part ob-dob-yyyy" id="ob-dob-yyyy" type="text" inputmode="numeric" placeholder="YYYY" maxlength="4" value="' + esc(dobYYYY) + '">',
        '</div>',
      '</div>',
    ].join('');
  }

  function collectS1() {
    state.firstName = sanitize((qs('#ob-first') || {}).value, 50);
    state.lastName  = sanitize((qs('#ob-last')  || {}).value, 50);
    state.phone     = sanitizePhone((qs('#ob-phone') || {}).value);
    var dd   = sanitize((qs('#ob-dob-dd')   || {}).value, 2);
    var mm   = sanitize((qs('#ob-dob-mm')   || {}).value, 2);
    var yyyy = sanitize((qs('#ob-dob-yyyy') || {}).value, 4);
    state.dob = (dd && mm && yyyy) ? yyyy + '-' + mm.padStart(2,'0') + '-' + dd.padStart(2,'0') : '';
  }

  function validateS1() {
    collectS1();
    if (!state.firstName) return 'Please enter your first name.';
    if (!state.lastName)  return 'Please enter your last name.';
    if (!state.phone)     return 'Please enter your mobile number.';
    if (!state.dob) return 'Please enter your date of birth.';
    var parts = state.dob.split('-');
    var yy = parseInt(parts[0]), mo = parseInt(parts[1]), dd = parseInt(parts[2]);
    if (dd < 1 || dd > 31 || mo < 1 || mo > 12) return 'Please enter a valid date of birth.';
    if (yy < 1920 || yy > new Date().getFullYear() - 14) return 'Please enter a valid year.';
    return null;
  }

  function renderS2() {
    var stateOpts = ['ACT','NSW','NT','QLD','SA','TAS','VIC','WA'].map(function (s) {
      return '<option value="' + s + '"' + (s === state.stateVal ? ' selected' : '') + '>' + s + '</option>';
    }).join('');
    return [
      '<div class="ob-field"><label class="ob-label" for="ob-address">Street address</label>',
        '<input class="ob-input" id="ob-address" type="text" autocomplete="street-address" placeholder="123 Main Street" maxlength="100" value="' + esc(state.address) + '"></div>',
      '<div class="ob-row-2">',
        '<div class="ob-field"><label class="ob-label" for="ob-suburb">Suburb</label>',
          '<input class="ob-input" id="ob-suburb" type="text" autocomplete="address-level2" placeholder="Melbourne" maxlength="60" value="' + esc(state.suburb) + '"></div>',
        '<div class="ob-field"><label class="ob-label" for="ob-state">State</label>',
          '<select class="ob-input" id="ob-state">' + stateOpts + '</select></div>',
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

  function renderS5() {
    var preview = state.photoUrl
      ? '<img src="' + esc(state.photoUrl) + '" alt="Your photo">'
      : (state.firstName || '?').charAt(0).toUpperCase();
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
      if (['jpg','jpeg','png'].indexOf(file.name.split('.').pop().toLowerCase()) === -1) return;
      if (file.size > MAX_FILE_BYTES) return;
      state.photoFile = file;
      var reader = new FileReader();
      reader.onload = function (e) { preview.innerHTML = '<img src="' + e.target.result + '" alt="Your photo">'; };
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

  /* Agreement rows use <div> not <label> so the link inside can be clicked independently */
  function agreeRow(rowId, chkId, text, checked) {
    return [
      '<div class="ob-agree-row' + (checked ? ' checked' : '') + '" id="' + rowId + '" role="checkbox" aria-checked="' + checked + '" tabindex="0">',
        '<input type="checkbox" id="' + chkId + '"' + (checked ? ' checked' : '') + '>',
        '<span>' + text + '</span>',
      '</div>',
    ].join('');
  }

  function renderS7() {
    return [
      '<p class="ob-label">Employment / Contractor Agreement</p>',
      '<div class="ob-agreement-box">',
        '<h4>Employment / Contractor Agreement</h4>',
        '<p>You will be engaged as an independent contractor, responsible for your own tax obligations. MyQuest will provide work opportunities but does not guarantee hours. You agree to attend scheduled jobs on time, maintain professional conduct, protect client privacy, and comply with WHS obligations.</p>',
      '</div>',
      agreeRow('ob-row-emp', 'ob-chk-emp', 'I have read and agree to the <strong>Employment / Contractor Agreement</strong>', state.agreedEmployment),

      '<p class="ob-label" style="margin-top:18px;">Company Policies</p>',
      '<div class="ob-agreement-box">',
        '<h4>Company Policies</h4>',
        '<p><strong>Punctuality</strong> — Arrive on time. Contact management immediately if you cannot attend.</p>',
        '<p><strong>Presentation</strong> — Maintain a professional appearance at all times on the job.</p>',
        '<p><strong>Client Property</strong> — Treat all client property with care. Report any damage immediately.</p>',
        '<p><strong>Communication</strong> — Respond to scheduling messages within 2 hours during business hours.</p>',
        '<p><strong>Health &amp; Safety</strong> — Do not attend if unwell. Report any workplace hazards promptly.</p>',
        '<p><strong>Confidentiality</strong> — Do not share client details or access codes outside MyQuest.</p>',
      '</div>',
      agreeRow('ob-row-co', 'ob-chk-co', 'I have read and agree to the <strong>Company Policies</strong>', state.agreedCompany),

      agreeRow('ob-row-priv', 'ob-chk-priv',
        'I have read and agree to the <a href="https://myquest.au/privacy" target="_blank" rel="noopener" style="color:#16a34a;">Privacy Policy</a>',
        state.agreedPrivacy),
    ].join('');
  }

  function wireS7() {
    function wireRow(rowId, chkId, setter) {
      var row = document.getElementById(rowId);
      var chk = document.getElementById(chkId);
      if (!row || !chk) return;

      function toggle() {
        chk.checked = !chk.checked;
        setter(chk.checked);
        row.classList.toggle('checked', chk.checked);
        row.setAttribute('aria-checked', String(chk.checked));
      }

      row.addEventListener('click', function (e) {
        if (e.target.tagName === 'A' || e.target.tagName === 'INPUT') return;
        toggle();
      });
      row.addEventListener('keydown', function (e) {
        if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); toggle(); }
      });
      chk.addEventListener('change', function () {
        setter(chk.checked);
        row.classList.toggle('checked', chk.checked);
        row.setAttribute('aria-checked', String(chk.checked));
      });
    }
    wireRow('ob-row-emp',  'ob-chk-emp',  function (v) { state.agreedEmployment = v; });
    wireRow('ob-row-co',   'ob-chk-co',   function (v) { state.agreedCompany    = v; });
    wireRow('ob-row-priv', 'ob-chk-priv', function (v) { state.agreedPrivacy    = v; });
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
    var s    = STEPS[n - 1];
    var wrap = document.getElementById('ob-step-wrap');
    if (!wrap) return;

    var prog = document.getElementById('ob-progress');
    if (prog) prog.style.width = Math.round(((n - 1) / TOTAL_STEPS) * 100) + '%';

    var backBtn   = n > 1 ? '<button type="button" class="btn-outline" id="ob-back">Back</button>' : '<span></span>';
    var nextLabel = n < TOTAL_STEPS ? 'Continue' : 'Complete setup';
    var skipNote  = n === 4 ? '<button type="button" class="btn-skip" id="ob-skip-photo">Skip for now</button>' : '';
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

    if (n === 1) wireDOB();
    if (n === 4) wireS5();
    if (n === 5) wireS6();
    if (n === 6) wireS7();

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

  /* ── Supabase Storage upload ─────────────────────────────── */

  async function uploadDoc(file, filename, token) {
    var sb  = window.MQ && MQ.supabase;
    if (!sb) throw new Error('Not authenticated.');
    var uid = state.userId;
    if (!uid) throw new Error('No user session.');
    var ext  = file.name.split('.').pop().toLowerCase();
    var path = uid + '/' + filename + '.' + ext;
    var res  = await sb.storage.from('staff-documents').upload(path, file, { upsert: true });
    if (res.error) throw new Error(res.error.message);
    var signed = await sb.storage.from('staff-documents').createSignedUrl(path, 60 * 60 * 24 * 365);
    return signed.data ? signed.data.signedUrl : path;
  }

  async function ensureStorageBucket(token) {
    var res = await fetch('/api/ensure-storage', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + token },
    });
    if (!res.ok) {
      var body;
      try { body = await res.json(); } catch (e) { body = {}; }
      throw new Error(body.error || 'Could not initialise storage. Please try again.');
    }
  }

  /* ── final submit ────────────────────────────────────────── */

  async function submitAll() {
    var nextEl  = document.getElementById('ob-next');
    var adminEl = document.getElementById('ob-admin-fwd');
    if (nextEl)  { nextEl.textContent = 'Saving…'; nextEl.disabled = true; }
    if (adminEl) adminEl.disabled = true;

    try {
      var sb = window.MQ && MQ.supabase;
      var token = '';
      if (sb) {
        var sess = await sb.auth.getSession();
        if (sess.data && sess.data.session) token = sess.data.session.access_token;
      }
      if (!token) throw new Error('Session expired. Please refresh and try again.');

      // Ensure the bucket exists before any uploads
      if (state.policeFile || state.licenceFile || state.rtwFile || state.photoFile) {
        await ensureStorageBucket(token);
      }

      if (state.policeFile)  state.policeUrl  = await uploadDoc(state.policeFile,  'police-check', token);
      if (state.licenceFile) state.licenceUrl = await uploadDoc(state.licenceFile, 'drivers-licence', token);
      if (state.rtwFile)     state.rtwUrl     = await uploadDoc(state.rtwFile,     'right-to-work', token);
      if (state.photoFile)   state.photoUrl   = await uploadDoc(state.photoFile,   'profile-photo', token);

      var now = new Date().toISOString();
      var payload = {
        userId:                   state.userId,
        name:                     (state.firstName + ' ' + state.lastName).trim(),
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
        profile_photo_url:        state.photoUrl   || null,
        police_check_url:         state.policeUrl  || null,
        drivers_licence_url:      state.licenceUrl || null,
        right_to_work_url:        state.rtwUrl     || null,
        onboarding_complete:      true,
        employment_agreement_signed_at: state.agreedEmployment ? now : null,
        company_policy_signed_at:       state.agreedCompany    ? now : null,
        privacy_policy_signed_at:       state.agreedPrivacy    ? now : null,
      };

      var res = await fetch('/api/update-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
        body: JSON.stringify(payload),
      });
      var result;
      try { result = await res.json(); } catch (e) { result = { error: 'Unexpected server response.' }; }
      if (result && result.error) throw new Error(result.error);

      var stepWrap = document.getElementById('ob-step-wrap');
      var success  = document.getElementById('ob-success');
      if (stepWrap) stepWrap.hidden = true;
      if (success)  success.hidden  = false;
      var pp = document.getElementById('ob-progress');
      if (pp) pp.style.width = '100%';
      setTimeout(function () { window.location.href = 'index.html'; }, 2400);

    } catch (e) {
      if (nextEl)  { nextEl.textContent = 'Complete setup'; nextEl.disabled = false; }
      if (adminEl) adminEl.disabled = false;
      showError('Something went wrong: ' + (e.message || 'Please try again.'));
    }
  }

  /* ── init ────────────────────────────────────────────────── */

  var _inited = false;
  async function doInit() {
    if (_inited) return;
    _inited = true;

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
  }

  document.addEventListener('mq:ready', doInit);

  // Safari fallback: mq:ready fires before deferred scripts can register listeners
  document.addEventListener('DOMContentLoaded', function () {
    if (window.MQ && MQ._ready) doInit();
  });

})();
