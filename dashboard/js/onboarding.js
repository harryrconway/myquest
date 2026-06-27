/* MyQuest — onboarding.js — 2-step simplified onboarding */
(function () {
  'use strict';

  var TOTAL_STEPS  = 2;
  var MAX_FILE_BYTES = 5 * 1024 * 1024;

  var state = {
    userId: null,
    name: '',
    phone: '', dob: '',
    address: '', suburb: '', stateVal: 'QLD', postcode: '',
    emergencyName: '', emergencyPhone: '', emergencyRel: '',
    photoFile: null, photoUrl: null,
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
    dd.addEventListener('input', function () { if (dd.value.length >= 2) { mm.focus(); mm.select(); } });
    mm.addEventListener('input', function () { if (mm.value.length >= 2) { yyyy.focus(); yyyy.select(); } });
    mm.addEventListener('keydown', function (e) {
      if (e.key === 'Backspace' && mm.value === '') { dd.focus(); dd.setSelectionRange(2, 2); }
    });
    yyyy.addEventListener('keydown', function (e) {
      if (e.key === 'Backspace' && yyyy.value === '') { mm.focus(); mm.setSelectionRange(2, 2); }
    });
  }

  /* ── photo upload ────────────────────────────────────────── */

  function wirePhotoUpload() {
    var input   = document.getElementById('ob-photo-input');
    var preview = document.getElementById('ob-photo-preview');
    var label   = document.getElementById('ob-photo-label');
    if (!input || !preview) return;
    input.addEventListener('change', function () {
      if (!input.files || !input.files[0]) return;
      var file = input.files[0];
      var ext  = file.name.split('.').pop().toLowerCase();
      if (['jpg','jpeg','png'].indexOf(ext) === -1) return;
      if (file.size > MAX_FILE_BYTES) {
        showError('Photo must be under 5 MB.');
        return;
      }
      state.photoFile = file;
      var reader = new FileReader();
      reader.onload = function (e) {
        preview.innerHTML = '<img src="' + e.target.result + '" alt="Your photo" style="width:100%;height:100%;object-fit:cover;">';
      };
      reader.readAsDataURL(file);
      if (label) label.textContent = 'Change photo';
    });
  }

  /* ── step renders ────────────────────────────────────────── */

  function renderS1() {
    var dobDD = '', dobMM = '', dobYYYY = '';
    if (state.dob) {
      var parts = state.dob.split('-');
      dobYYYY = parts[0] || ''; dobMM = parts[1] || ''; dobDD = parts[2] || '';
    }
    var stateOpts = ['ACT','NSW','NT','QLD','SA','TAS','VIC','WA'].map(function (s) {
      return '<option value="' + s + '"' + (s === state.stateVal ? ' selected' : '') + '>' + s + '</option>';
    }).join('');

    var photoInitial = state.name ? state.name.charAt(0).toUpperCase() : '?';
    var photoContent = state.photoUrl
      ? '<img src="' + esc(state.photoUrl) + '" alt="Your photo" style="width:100%;height:100%;object-fit:cover;">'
      : photoInitial;

    return [
      '<div class="ob-photo-wrap">',
        '<div class="ob-photo-preview" id="ob-photo-preview">' + photoContent + '</div>',
        '<div>',
          '<p class="ob-photo-name">' + esc(state.name) + '</p>',
          '<label class="btn-outline" for="ob-photo-input" id="ob-photo-label" style="display:inline-block;cursor:pointer;margin-bottom:0;font-size:13px;padding:8px 16px;">Upload photo</label>',
          '<input type="file" id="ob-photo-input" accept=".jpg,.jpeg,.png" style="display:none">',
          '<p style="font-size:12px;color:#94a3b8;margin-top:6px;">Optional · JPG or PNG · max 5 MB</p>',
        '</div>',
      '</div>',
      '<hr class="ob-divider">',
      '<div class="ob-field"><label class="ob-label" for="ob-phone">Mobile number</label>',
        '<input class="ob-input" id="ob-phone" type="tel" inputmode="tel" autocomplete="tel" placeholder="0400 000 000" maxlength="20" value="' + esc(state.phone) + '"></div>',
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
      '<p class="ob-section-label" style="margin-top:4px;">Home address</p>',
      '<div class="ob-field"><label class="ob-label" for="ob-address">Street address</label>',
        '<input class="ob-input" id="ob-address" type="text" autocomplete="street-address" placeholder="123 Main Street" maxlength="100" value="' + esc(state.address) + '"></div>',
      '<div class="ob-row-2">',
        '<div class="ob-field"><label class="ob-label" for="ob-suburb">Suburb</label>',
          '<input class="ob-input" id="ob-suburb" type="text" autocomplete="address-level2" placeholder="Currumbin" maxlength="60" value="' + esc(state.suburb) + '"></div>',
        '<div class="ob-field"><label class="ob-label" for="ob-state">State</label>',
          '<select class="ob-input" id="ob-state">' + stateOpts + '</select></div>',
      '</div>',
      '<div class="ob-field" style="max-width:160px"><label class="ob-label" for="ob-postcode">Postcode</label>',
        '<input class="ob-input" id="ob-postcode" type="text" inputmode="numeric" placeholder="4000" maxlength="4" value="' + esc(state.postcode) + '"></div>',
    ].join('');
  }

  function collectS1() {
    state.phone    = sanitizePhone((qs('#ob-phone')    || {}).value);
    state.address  = sanitize((qs('#ob-address')  || {}).value, 100);
    state.suburb   = sanitize((qs('#ob-suburb')   || {}).value, 60);
    state.stateVal = sanitize((qs('#ob-state')    || {}).value, 3);
    state.postcode = sanitize((qs('#ob-postcode') || {}).value, 4).replace(/\D/g, '');
    var dd   = sanitize((qs('#ob-dob-dd')   || {}).value, 2);
    var mm   = sanitize((qs('#ob-dob-mm')   || {}).value, 2);
    var yyyy = sanitize((qs('#ob-dob-yyyy') || {}).value, 4);
    state.dob = (dd && mm && yyyy) ? yyyy + '-' + mm.padStart(2,'0') + '-' + dd.padStart(2,'0') : '';
  }

  function validateS1() {
    collectS1();
    if (!state.phone)     return 'Please enter your mobile number.';
    if (!state.dob) return 'Please enter your date of birth.';
    var parts = state.dob.split('-');
    var yy = parseInt(parts[0]), mo = parseInt(parts[1]), dd = parseInt(parts[2]);
    if (dd < 1 || dd > 31 || mo < 1 || mo > 12) return 'Please enter a valid date of birth.';
    if (yy < 1920 || yy > new Date().getFullYear() - 14) return 'Please enter a valid year.';
    if (!state.address)  return 'Please enter your street address.';
    if (!state.suburb)   return 'Please enter your suburb.';
    if (!state.postcode || state.postcode.length < 4) return 'Please enter a valid 4-digit postcode.';
    return null;
  }

  function renderS2() {
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

  function collectS2() {
    state.emergencyName  = sanitize((qs('#ob-ec-name')  || {}).value, 100);
    state.emergencyPhone = sanitizePhone((qs('#ob-ec-phone') || {}).value);
    state.emergencyRel   = sanitize((qs('#ob-ec-rel')   || {}).value, 50);
  }

  function validateS2() {
    collectS2();
    if (!state.emergencyName)  return 'Please enter an emergency contact name.';
    if (!state.emergencyPhone) return 'Please enter their phone number.';
    if (!state.emergencyRel)   return 'Please enter your relationship to them.';
    return null;
  }

  var STEPS = [
    { title: 'Your details',       subtitle: "Let's get your profile set up.",         render: renderS1, collect: collectS1, validate: validateS1 },
    { title: 'Emergency contact',  subtitle: 'Who should we contact in an emergency?', render: renderS2, collect: collectS2, validate: validateS2 },
  ];

  /* ── step dots ───────────────────────────────────────────── */

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
          '<button type="button" class="btn-primary" id="ob-next">' + nextLabel + '</button>',
        '</div>',
      '</div>',
    ].join('');

    if (n === 1) { wireDOB(); wirePhotoUpload(); }

    var backEl = document.getElementById('ob-back');
    if (backEl) backEl.addEventListener('click', function () { showStep(n - 1); });

    var nextEl = document.getElementById('ob-next');
    if (nextEl) nextEl.addEventListener('click', function () {
      var err = s.validate();
      if (err) { showError(err); return; }
      if (n < TOTAL_STEPS) showStep(n + 1); else submitAll();
    });

    currentStep = n;
    window.scrollTo(0, 0);
    requestAnimationFrame(function () { window.scrollTo(0, 0); });
  }

  function showError(msg) {
    var el = document.getElementById('ob-step-error');
    if (!el) return;
    el.textContent = msg;
    el.style.display = 'block';
    el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  /* ── Supabase Storage upload ─────────────────────────────── */

  async function uploadDoc(file, filename) {
    var sb  = window.MQ && MQ.supabase;
    if (!sb) throw new Error('Not authenticated.');
    var ext  = file.name.split('.').pop().toLowerCase();
    var path = state.userId + '/' + filename + '.' + ext;
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
    var nextEl = document.getElementById('ob-next');
    if (nextEl) { nextEl.textContent = 'Saving…'; nextEl.disabled = true; }

    try {
      var sb = window.MQ && MQ.supabase;
      var token = '';
      if (sb) {
        var sess = await sb.auth.getSession();
        if (sess.data && sess.data.session) token = sess.data.session.access_token;
      }
      if (!token) throw new Error('Session expired. Please refresh and try again.');

      if (state.photoFile) {
        await ensureStorageBucket(token);
        state.photoUrl = await uploadDoc(state.photoFile, 'profile-photo');
      }

      var payload = {
        userId:                   state.userId,
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
        profile_photo_url:        state.photoUrl || null,
        onboarding_complete:      true,
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
      if (nextEl) { nextEl.textContent = 'Complete setup'; nextEl.disabled = false; }
      showError('Something went wrong: ' + (e.message || 'Please try again.'));
    }
  }

  /* ── init ────────────────────────────────────────────────── */

  async function doInit() {
    var sb = window.MQ && MQ.supabase;
    if (!sb) { window.location.href = '../login.html'; return; }

    var sess = await sb.auth.getSession();
    if (!sess.data || !sess.data.session) { window.location.href = '../login.html'; return; }

    state.userId = sess.data.session.user.id;

    var profile = await sb.from('profiles').select('name, mobile, phone').eq('id', state.userId).single();
    if (profile.data) {
      state.name  = profile.data.name  || '';
      state.phone = profile.data.mobile || profile.data.phone || '';
    }

    showStep(1);
  }

  MQ.onReady(doInit);

})();
