/* MyQuest — my-profile.js */
(function () {
  'use strict';

  var MAX_FILE_BYTES = 5 * 1024 * 1024;
  var userId = null;
  var token  = '';

  function qs(sel) { return document.querySelector(sel); }
  function sanitize(val, max) { return String(val || '').trim().slice(0, max || 200); }
  function sanitizePhone(val) { return sanitize(val, 20).replace(/[^\d\s\-+().]/g, ''); }

  function setVal(id, val) { var el = qs('#' + id); if (el) el.value = val || ''; }
  function getVal(id)      { var el = qs('#' + id); return el ? el.value : ''; }

  /* ── populate UI from profile ───────────────────────────── */

  function populate(p) {
    var initial = (p.name || '?').charAt(0).toUpperCase();
    var photo   = qs('#mp-photo');
    if (photo) {
      if (p.profile_photo_url) {
        photo.innerHTML = '<img src="' + p.profile_photo_url + '" alt="Profile photo" style="width:100%;height:100%;object-fit:cover;">';
      } else {
        photo.textContent = initial;
        if (p.colour) photo.style.background = p.colour;
      }
    }

    var nameEl = qs('#mp-name');
    if (nameEl) nameEl.textContent = p.name || '';

    var roleEl = qs('#mp-role-badge');
    if (roleEl) roleEl.textContent = (p.role || 'staff').replace(/-/g, ' ');

    // Personal details
    setVal('mp-phone', p.mobile || p.phone || '');

    if (p.date_of_birth) {
      var parts = p.date_of_birth.split('-');
      setVal('mp-dob', (parts[2] || '') + '/' + (parts[1] || '') + '/' + (parts[0] || ''));
    }

    setVal('mp-address',  p.address  || '');
    setVal('mp-suburb',   p.suburb   || '');
    setVal('mp-postcode', p.postcode || '');

    var stateEl = qs('#mp-state');
    if (stateEl && p.state) {
      for (var i = 0; i < stateEl.options.length; i++) {
        if (stateEl.options[i].value === p.state) { stateEl.selectedIndex = i; break; }
      }
    }

    // Emergency contact
    setVal('mp-ec-name',  p.emergency_contact_name   || '');
    setVal('mp-ec-phone', p.emergency_contact_number || '');
    setVal('mp-ec-rel',   p.emergency_relation       || '');
  }

  /* ── load profile ────────────────────────────────────────── */

  async function loadProfile() {
    var res = await fetch('/api/get-staff-profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      body: JSON.stringify({ userId: userId }),
    });
    if (!res.ok) { showLoading('Failed to load profile.'); return; }
    var data = await res.json();
    if (!data.profile) { showLoading('Profile not found.'); return; }

    hideLoading();
    populate(data.profile);
  }

  function hideLoading() {
    var loading = qs('#mp-loading');
    var content = qs('#mp-content');
    if (loading) loading.style.display = 'none';
    if (content) content.style.display = 'block';
  }

  function showLoading(msg) {
    var loading = qs('#mp-loading');
    if (loading) loading.textContent = msg || 'Loading…';
  }

  /* ── parse DOB from DD/MM/YYYY ───────────────────────────── */

  function parseDOB(raw) {
    var parts = (raw || '').split('/');
    if (parts.length !== 3) return null;
    var dd = parts[0].padStart(2,'0'), mm = parts[1].padStart(2,'0'), yyyy = parts[2];
    if (!dd || !mm || !yyyy || yyyy.length !== 4) return null;
    return yyyy + '-' + mm + '-' + dd;
  }

  /* ── save personal details ───────────────────────────────── */

  async function saveDetails() {
    var btn = qs('#mp-save-details');
    var msg = qs('#mp-details-msg');
    if (btn) { btn.textContent = 'Saving…'; btn.disabled = true; }
    if (msg) msg.style.display = 'none';

    var dobISO    = parseDOB(getVal('mp-dob'));
    var phone     = sanitizePhone(getVal('mp-phone'));
    var address   = sanitize(getVal('mp-address'), 100);
    var suburb    = sanitize(getVal('mp-suburb'), 60);
    var addressState = sanitize(getVal('mp-state'), 3);
    var postcode  = sanitize(getVal('mp-postcode'), 4).replace(/\D/g, '');

    var payload = {
      userId:   userId,
      phone:    phone,
      mobile:   phone,
      address:  address,
      suburb:   suburb,
      state:    addressState,
      postcode: postcode,
      residential_address: [address, suburb, addressState, postcode].filter(Boolean).join(', '),
    };
    if (dobISO) payload.date_of_birth = dobISO;

    try {
      var res = await fetch('/api/update-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
        body: JSON.stringify(payload),
      });
      var data = await res.json();
      if (data.error) throw new Error(data.error);
      if (msg) { msg.textContent = 'Saved!'; msg.style.display = 'inline'; setTimeout(function () { msg.style.display = 'none'; }, 2500); }
    } catch (e) {
      if (msg) { msg.textContent = e.message || 'Save failed.'; msg.style.color = '#dc2626'; msg.style.display = 'inline'; }
    } finally {
      if (btn) { btn.textContent = 'Save changes'; btn.disabled = false; }
    }
  }

  /* ── save emergency contact ──────────────────────────────── */

  async function saveEC() {
    var btn = qs('#mp-save-ec');
    var msg = qs('#mp-ec-msg');
    if (btn) { btn.textContent = 'Saving…'; btn.disabled = true; }
    if (msg) msg.style.display = 'none';

    var payload = {
      userId:                   userId,
      emergency_contact_name:   sanitize(getVal('mp-ec-name'), 100),
      emergency_contact_number: sanitizePhone(getVal('mp-ec-phone')),
      emergency_relation:       sanitize(getVal('mp-ec-rel'), 50),
    };

    try {
      var res = await fetch('/api/update-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
        body: JSON.stringify(payload),
      });
      var data = await res.json();
      if (data.error) throw new Error(data.error);
      if (msg) { msg.style.color = '#059669'; msg.textContent = 'Saved!'; msg.style.display = 'inline'; setTimeout(function () { msg.style.display = 'none'; }, 2500); }
    } catch (e) {
      if (msg) { msg.style.color = '#dc2626'; msg.textContent = e.message || 'Save failed.'; msg.style.display = 'inline'; }
    } finally {
      if (btn) { btn.textContent = 'Save changes'; btn.disabled = false; }
    }
  }

  /* ── photo upload ────────────────────────────────────────── */

  function wirePhotoUpload() {
    var input  = qs('#mp-photo-input');
    var status = qs('#mp-photo-status');
    if (!input) return;

    input.addEventListener('change', async function () {
      if (!input.files || !input.files[0]) return;
      var file = input.files[0];
      var ext  = file.name.split('.').pop().toLowerCase();
      if (['jpg','jpeg','png'].indexOf(ext) === -1) { if (status) status.textContent = 'JPG or PNG only.'; return; }
      if (file.size > MAX_FILE_BYTES) { if (status) status.textContent = 'File must be under 5 MB.'; return; }

      if (status) status.textContent = 'Uploading…';

      try {
        // Ensure bucket
        var ensureRes = await fetch('/api/ensure-storage', {
          method: 'POST',
          headers: { 'Authorization': 'Bearer ' + token },
        });
        if (!ensureRes.ok) throw new Error('Storage error.');

        var sb   = window.MQ && MQ.supabase;
        var path = userId + '/profile-photo.' + ext;
        var uploadRes = await sb.storage.from('staff-documents').upload(path, file, { upsert: true });
        if (uploadRes.error) throw new Error(uploadRes.error.message);

        var signed = await sb.storage.from('staff-documents').createSignedUrl(path, 60 * 60 * 24 * 365);
        var url    = signed.data ? signed.data.signedUrl : path;

        // Save URL to profile
        var updateRes = await fetch('/api/update-profile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
          body: JSON.stringify({ userId: userId, profile_photo_url: url }),
        });
        var updateData = await updateRes.json();
        if (updateData.error) throw new Error(updateData.error);

        // Update preview
        var photo  = qs('#mp-photo');
        if (photo) photo.innerHTML = '<img src="' + url + '" alt="Profile photo" style="width:100%;height:100%;object-fit:cover;">';
        if (status) status.textContent = 'Photo updated!';
        setTimeout(function () { if (status) status.textContent = ''; }, 2500);

        // Update sidebar avatar if it's showing initials
        var avatar = qs('.js-user-avatar');
        if (avatar && !avatar.querySelector('img')) {
          avatar.innerHTML = '<img src="' + url + '" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:inherit;">';
        }

      } catch (e) {
        if (status) status.textContent = 'Upload failed: ' + (e.message || 'Please try again.');
      }
    });
  }

  /* ── responsive grid ─────────────────────────────────────── */

  function injectGridStyle() {
    var style = document.createElement('style');
    style.textContent = '@media(max-width:600px){.mp-grid{grid-template-columns:1fr!important}}';
    document.head.appendChild(style);
  }

  /* ── init ────────────────────────────────────────────────── */

  async function doInit() {
    injectGridStyle();

    var sb = window.MQ && MQ.supabase;
    if (!sb) return;

    var sess = await sb.auth.getSession();
    if (!sess.data || !sess.data.session) return;

    userId = sess.data.session.user.id;
    token  = sess.data.session.access_token;

    await loadProfile();
    wirePhotoUpload();

    var saveDetailsBtn = qs('#mp-save-details');
    if (saveDetailsBtn) saveDetailsBtn.addEventListener('click', saveDetails);

    var saveECBtn = qs('#mp-save-ec');
    if (saveECBtn) saveECBtn.addEventListener('click', saveEC);
  }

  MQ.onReady(doInit);

})();
