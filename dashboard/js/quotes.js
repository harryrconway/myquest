(function () {
  'use strict';

  var sb;
  var quotes       = [];
  var activeFilter = 'all';
  var searchTerm   = '';
  var view         = 'list'; // 'list' | 'new' | 'edit'
  var currentQuoteId = null;

  var sv = { beds: 3, baths: 2, rooms: 2, floors: 1, comFloors: 1, restrooms: 2 };
  var jobType   = null;
  var cleanType = null;
  var map       = null;
  var marker    = null;
  var geocodeTimer = null;

  /* ── callApi ────────────────────────────────────────────────── */
  async function callApi(path, body) {
    var sess = await sb.auth.getSession();
    var jwt  = sess.data && sess.data.session && sess.data.session.access_token;
    if (!jwt) return { error: 'Not authenticated.' };
    var res = await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + jwt },
      body: JSON.stringify(body),
    });
    return res.json();
  }

  /* ── Helpers ────────────────────────────────────────────────── */
  function esc(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function fmtDate(str) {
    if (!str) return '—';
    var d = new Date(str);
    return d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  function fmtDateTime(str) {
    if (!str) return '—';
    var d = new Date(str);
    return d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' }) +
           ' — ' + d.toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit', hour12: true });
  }

  function statusChip(s) {
    var map = {
      draft:    '<span class="qchip qchip--draft"><span class="qdot qdot--draft"></span> Draft</span>',
      sent:     '<span class="qchip qchip--sent"><span class="qdot qdot--sent"></span> Sent</span>',
      accepted: '<span class="qchip qchip--accepted"><span class="qdot qdot--accepted"></span> Accepted</span>',
      declined: '<span class="qchip qchip--declined"><span class="qdot qdot--declined"></span> Declined</span>',
    };
    return map[s] || '';
  }

  function typeChip(t) {
    if (t === 'residential') return '<span class="qchip qchip--res">Residential</span>';
    if (t === 'commercial')  return '<span class="qchip qchip--com">Commercial</span>';
    return '—';
  }

  function serviceLabel(svc) {
    var m = { regular: 'Regular clean', eol: 'End of lease', custom: 'Custom', deep: 'Deep clean', builders: 'Builders clean' };
    return m[svc] || (svc || '—');
  }

  /* ── List ───────────────────────────────────────────────────── */
  async function loadQuotes() {
    var res = await sb.from('quote_requests')
      .select('id, full_name, email, quote_type, client_type, quote_status, quoted_price, service_type, frequency, is_recurring, created_at, quote_sent_at')
      .not('quote_type', 'is', null)
      .order('created_at', { ascending: false });

    quotes = res.data || [];
    renderList();
  }

  function renderList() {
    var filtered = quotes.filter(function (q) {
      if (activeFilter !== 'all' && q.quote_status !== activeFilter) return false;
      if (searchTerm) {
        var hay = ((q.full_name || '') + ' ' + (q.email || '') + ' ' + (q.quote_type || '')).toLowerCase();
        if (hay.indexOf(searchTerm) === -1) return false;
      }
      return true;
    });

    var counts = { draft: 0, sent: 0, accepted: 0, declined: 0 };
    quotes.forEach(function (q) { if (counts[q.quote_status] !== undefined) counts[q.quote_status]++; });

    document.querySelectorAll('#qStatPills .qsp').forEach(function (btn) {
      var f = btn.dataset.filter;
      if (f === 'all') {
        btn.innerHTML = 'All <strong>' + quotes.length + '</strong>';
      } else if (counts[f] !== undefined) {
        btn.innerHTML = f.charAt(0).toUpperCase() + f.slice(1) + (counts[f] ? ' <strong>' + counts[f] + '</strong>' : '');
      }
    });

    var tbody = document.getElementById('q-tbody');
    if (filtered.length === 0) {
      tbody.innerHTML = '<tr><td colspan="8" class="q-empty" style="padding:3rem;text-align:center;color:#94a3b8;">No quotes found</td></tr>';
      return;
    }

    tbody.innerHTML = filtered.map(function (q) {
      var clientCell = q.full_name
        ? '<span class="qcn">' + esc(q.full_name) + '</span>' + (q.email ? '<span class="qce">' + esc(q.email) + '</span>' : '')
        : '<span class="qnc">No client yet</span>';
      var freq = q.is_recurring && q.frequency ? q.frequency : 'One-off';
      var price = q.quoted_price ? '$' + parseFloat(q.quoted_price).toFixed(0) : '—';

      var actBtns = '<button class="q-btn" onclick="QuotesPage.openQuote(\'' + q.id + '\')">View</button>';
      if (q.quote_status === 'sent') {
        actBtns += '<button class="q-btn q-btn--yellow" onclick="QuotesPage.acceptQuote(\'' + q.id + '\');event.stopPropagation()">Accept</button>';
      }
      if (q.quote_status === 'accepted') {
        actBtns += '<button class="q-btn q-btn--green" disabled style="cursor:default;">Accepted</button>';
      }

      return '<tr onclick="QuotesPage.openQuote(\'' + q.id + '\')">'
        + '<td>' + clientCell + '</td>'
        + '<td>' + typeChip(q.quote_type) + '</td>'
        + '<td>' + esc(serviceLabel(q.service_type)) + '</td>'
        + '<td>' + esc(freq) + '</td>'
        + '<td class="q-price">' + esc(price) + '</td>'
        + '<td>' + statusChip(q.quote_status) + '</td>'
        + '<td>' + fmtDate(q.created_at) + '</td>'
        + '<td><div class="q-acts" onclick="event.stopPropagation()">' + actBtns + '</div></td>'
        + '</tr>';
    }).join('');
  }

  /* ── View switching ─────────────────────────────────────────── */
  function showListView() {
    view = 'list';
    currentQuoteId = null;
    document.getElementById('q-list-wrap').style.display = '';
    document.getElementById('q-form-wrap').classList.remove('on');
    document.body.style.overflow = '';
  }

  function openNewQuote() {
    view = 'new';
    currentQuoteId = null;
    resetForm();
    document.getElementById('qPageTitle').textContent = 'New Quote';
    document.getElementById('qHeaderBadge').innerHTML = '';
    document.getElementById('btnViewQuote').style.display = 'none';
    document.getElementById('btnCalcViewQuote').style.display = '';
    document.getElementById('btnHeaderSave').textContent = 'Save Draft';
    document.getElementById('btnHeaderEmail').textContent = 'Save & Email Quote';
    document.getElementById('btnCalcSave').textContent = 'Save Draft';
    document.getElementById('ehSection').classList.remove('on');
    document.getElementById('ehCard').classList.remove('on');
    document.getElementById('q-list-wrap').style.display = 'none';
    document.getElementById('q-form-wrap').classList.add('on');
    document.body.style.overflow = 'hidden';
    setTimeout(initMap, 100);
  }

  async function openQuote(id) {
    var res = await sb.from('quote_requests')
      .select('id, quote_type, client_type, quote_status, quoted_price, quote_source, suburb, postcode, street_address, state, parking_type, access_instructions, service_type, bedrooms, bathrooms, living_areas, num_floors, floor_area_sqm, restroom_count, condition, furnished_status, pet_info, property_size_tag, extras, urgency, vacate_date, is_recurring, frequency, recurrence, preferred_days, preferred_time, lead_source, full_name, phone, email, internal_notes, email_log, hours, hourly_rate, created_at')
      .eq('id', id)
      .single();

    if (res.error || !res.data) { MQ.ui.toast('Failed to load quote.', 'error'); return; }
    var q = res.data;

    view = 'edit';
    currentQuoteId = id;
    resetForm();

    var statusBadgeMap = {
      draft:    '<span class="qchip qchip--draft"><span class="qdot qdot--draft"></span> Draft</span>',
      sent:     '<span class="qchip qchip--sent"><span class="qdot qdot--sent"></span> Sent</span>',
      accepted: '<span class="qchip qchip--accepted"><span class="qdot qdot--accepted"></span> Accepted</span>',
      declined: '<span class="qchip qchip--declined"><span class="qdot qdot--declined"></span> Declined</span>',
    };

    var shortId = id.slice(0, 8).toUpperCase();
    document.getElementById('qPageTitle').textContent = 'QT-' + shortId + (q.full_name ? ' — ' + q.full_name : '');
    document.getElementById('qHeaderBadge').innerHTML = statusBadgeMap[q.quote_status] || '';
    document.getElementById('btnViewQuote').style.display = '';
    document.getElementById('btnCalcViewQuote').style.display = '';
    document.getElementById('btnHeaderSave').textContent = 'Save Changes';
    document.getElementById('btnHeaderEmail').textContent = 'Email Quote';
    document.getElementById('btnCalcSave').textContent = 'Save Changes';

    // Job type
    if (q.quote_type) {
      var t = q.quote_type === 'residential' ? 'res' : 'com';
      setType(t);
    }

    // Client sub-type
    if (q.client_type) {
      var subWrap = document.querySelector(q.quote_type === 'residential' ? '#res-sub .qpg' : '#com-sub .qpg');
      if (subWrap) {
        subWrap.querySelectorAll('.qpill').forEach(function (p) {
          if (p.dataset.v === q.client_type) { p.classList.add('on'); setCondById(q.client_type, true); }
        });
      }
    }

    // Location
    document.getElementById('iSuburb').value   = q.suburb || '';
    document.getElementById('iPostcode').value = q.postcode || '';
    document.getElementById('iStreet').value   = q.street_address || '';

    // Parking + access
    setPillByVal('parkPills', q.parking_type);
    setPillByVal('accessPills', q.access_instructions);

    // Quote source
    if (q.quote_source) {
      document.querySelectorAll('#srcRow .qsrc').forEach(function (b) {
        b.classList.toggle('on', b.dataset.v === q.quote_source);
      });
    }

    if (q.quote_type === 'residential') {
      if (q.service_type) {
        setPillByDataV('cleanTypePills', q.service_type);
        setCleanType(q.service_type);
      }
      setSteppers({ beds: q.bedrooms || 0, baths: q.bathrooms || 0, rooms: q.living_areas || 0, floors: q.num_floors || 1 });
      if (q.property_size_tag) setPillByText('sizePills', q.property_size_tag);
      if (q.condition) setPillByDataV('condPills', q.condition);
      if (q.furnished_status) setPillByDataV('furnPills', q.furnished_status);
      if (q.pet_info) {
        var petBase = q.pet_info.split(':')[0].trim();
        setPillByText('petPills', petBase);
        var petNote = q.pet_info.indexOf(':') !== -1 ? q.pet_info.split(':').slice(1).join(':').trim() : '';
        if (petBase !== 'No pets') {
          document.getElementById('petNote').style.display = '';
          document.getElementById('petNote').value = petNote;
        }
      }
      if (q.extras && q.extras.length) {
        var extraNames  = q.extras.map(function (e) { return typeof e === 'string' ? e : e.name; });
        var extraPrices = {};
        q.extras.forEach(function (e) { if (typeof e !== 'string') extraPrices[e.name] = e.price; });

        var pillNames = [];
        document.querySelectorAll('#extrasPills .qpill, #comExtrasPills .qpill').forEach(function (p) {
          pillNames.push(p.textContent.trim());
        });

        document.querySelectorAll('#extrasPills .qpill, #comExtrasPills .qpill').forEach(function (p) {
          if (extraNames.indexOf(p.textContent.trim()) !== -1) p.classList.add('on');
        });
        updateExtrasInCalc();
        Object.keys(extraPrices).forEach(function (name) {
          var inp = document.getElementById('ep-' + name.replace(/[^a-zA-Z0-9]/g, '-'));
          if (inp) inp.value = extraPrices[name];
        });

        var ctr = document.getElementById('calcExtrasList');
        extraNames.forEach(function (name) {
          if (pillNames.indexOf(name) === -1) {
            var row = document.createElement('div');
            row.className = 'calc-extra-row';
            row.dataset.custom = 'true';
            row.innerHTML = '<input class="ri calc-extra-name-input" type="text" value="' + esc(name) + '" placeholder="Description">'
              + '<input class="ri" type="number" min="0" step="1" placeholder="$" value="' + (extraPrices[name] || 0) + '">'
              + '<button class="calc-extra-remove" title="Remove">&times;</button>';
            ctr.appendChild(row);
            document.getElementById('calcExtras').style.display = '';
          }
        });
        calcTotal();
      }
    } else {
      if (q.service_type) setPillByDataV('comCleanPills', q.service_type);
      if (q.floor_area_sqm) document.getElementById('comSqm').value = q.floor_area_sqm;
      setSteppers({ comFloors: q.num_floors || 1, restrooms: q.restroom_count || 1 });
    }

    // Urgency
    if (q.urgency) {
      setPillByDataV('urgencyPills', q.urgency);
      if (q.urgency === 'specific') document.getElementById('specDate').style.display = '';
    }
    if (q.vacate_date) { document.getElementById('vacateDate').value = q.vacate_date; }

    // Recurring
    if (q.is_recurring) {
      document.getElementById('recurToggle').classList.add('on');
      document.getElementById('freqCard').style.display = '';
      if (q.frequency) setPillByText('freqPills', q.frequency);
    }

    // Preferred days
    if (q.preferred_days && q.preferred_days.length) {
      document.querySelectorAll('#prefDays .dp').forEach(function (b) {
        if (q.preferred_days.indexOf(b.textContent.trim()) !== -1) b.classList.add('on');
      });
    }

    // Preferred time — stored as "Morning — 8:00 AM"
    if (q.preferred_time) {
      var tp = parsePreferredTime(q.preferred_time);
      if (tp.tod) setPillByText('calcTimePills', tp.tod);
      if (tp.hour) document.getElementById('tHour').value = tp.hour;
      if (tp.min) document.getElementById('tMin').value = tp.min;
      if (tp.ampm) setPillByText('ampmPills', tp.ampm);
    }

    // Calculator
    if (q.hours)       document.getElementById('rHours').value  = q.hours;
    if (q.hourly_rate) document.getElementById('rHourly').value = q.hourly_rate;
    if (q.hours || q.hourly_rate) calcTotal();

    // Lead source
    if (q.lead_source) setPillByText('leadPills', q.lead_source);

    // Client
    document.getElementById('iClientName').value   = q.full_name || '';
    document.getElementById('iClientMobile').value = q.phone || '';
    document.getElementById('iClientEmail').value  = q.email || '';
    document.getElementById('iClientNotes').value  = q.internal_notes || '';

    // Email history
    renderEmailHistory(Array.isArray(q.email_log) ? q.email_log : []);
    document.getElementById('ehSection').classList.add('on');
    document.getElementById('ehCard').classList.add('on');

    document.getElementById('q-list-wrap').style.display = 'none';
    document.getElementById('q-form-wrap').classList.add('on');
    document.body.style.overflow = 'hidden';
    setTimeout(function () { initMap(); if (q.suburb) geocode(); }, 100);
  }

  function parsePreferredTime(str) {
    if (!str) return {};
    var parts = str.split(' — ');
    var tod = parts[0] || '';
    var rest = parts[1] || '';
    var timeParts = rest.split(' ');
    var clockStr = timeParts[0] || '';
    var ampm = timeParts[1] || '';
    var hm = clockStr.split(':');
    return { tod: tod, hour: hm[0] || '', min: hm[1] || '00', ampm: ampm };
  }

  /* ── Email history ──────────────────────────────────────────── */
  function renderEmailHistory(emailLog) {
    var body = document.getElementById('ehBody');
    if (!emailLog.length) {
      body.innerHTML = '<div class="eh-empty">No emails sent yet — use the button above to send this quote</div>';
      return;
    }
    body.innerHTML = emailLog.map(function (e) {
      return '<div class="eh-item">'
        + '<div class="eh-icon"></div>'
        + '<div class="eh-meta">'
        +   '<div class="eh-date">' + esc(fmtDateTime(e.sent_at)) + '</div>'
        +   '<div class="eh-sender">Sent by: ' + esc(e.sent_by_name || 'Staff') + '</div>'
        +   '<div class="eh-subject">"' + esc(e.subject) + '"</div>'
        + '</div>'
        + '<button class="eh-resend" onclick="QuotesPage.emailQuote()">Resend</button>'
        + '</div>';
    }).join('');
  }

  /* ── Save quote ─────────────────────────────────────────────── */
  function collectFormData(asDraft) {
    var isRecurring = document.getElementById('recurToggle').classList.contains('on');
    var freq = getPillText('freqPills');

    var prefDays = [];
    document.querySelectorAll('#prefDays .dp.on').forEach(function (b) { prefDays.push(b.textContent.trim()); });

    var tod   = getPillText('calcTimePills');
    var tHour = document.getElementById('tHour').value;
    var tMin  = document.getElementById('tMin').value || '00';
    var ampm  = getPillText('ampmPills');
    var prefTime = '';
    if (tod) { prefTime = tod; if (tHour) prefTime += ' — ' + tHour + ':' + tMin + (ampm ? ' ' + ampm : ''); }

    var extras = [];
    document.querySelectorAll('#calcExtrasList .calc-extra-row').forEach(function (row) {
      var nameEl  = row.querySelector('.calc-extra-name');
      var nameInp = row.querySelector('.calc-extra-name-input');
      var priceInp = row.querySelector('input[type="number"]');
      var name  = nameEl ? nameEl.textContent.trim() : (nameInp ? nameInp.value.trim() : '');
      var price = priceInp ? (parseFloat(priceInp.value) || 0) : 0;
      if (name) extras.push({ name: name, price: price });
    });

    var petPillSel = document.querySelector('#petPills .qpill.on');
    var petVal = petPillSel ? petPillSel.textContent.trim() : null;
    var petNote = document.getElementById('petNote').value.trim();
    var petInfo = petVal ? (petNote ? petVal + ': ' + petNote : petVal) : null;

    var srcSel = document.querySelector('#srcRow .qsrc.on');
    var src = srcSel ? (srcSel.dataset.v || 'phone') : 'phone';

    var rawPrice = document.getElementById('cPrice').value.replace(/[^0-9.]/g, '');
    var quotedPrice = rawPrice ? parseFloat(rawPrice) : null;

    var urgencyPill = document.querySelector('#urgencyPills .qpill.on');
    var urgency = urgencyPill ? (urgencyPill.dataset.v || null) : null;

    var condPill = document.querySelector('#condPills .qpill.on');
    var condition = condPill ? (condPill.dataset.v || null) : null;

    var furnPill = document.querySelector('#furnPills .qpill.on');
    var furnished = furnPill ? (furnPill.dataset.v || null) : null;

    var isRes = (jobType === 'res');
    var svcType = null;
    if (isRes) {
      var ctPill = document.querySelector('#cleanTypePills .qpill.on');
      svcType = ctPill ? (ctPill.dataset.v || null) : null;
    } else {
      var comCtPill = document.querySelector('#comCleanPills .qpill.on');
      svcType = comCtPill ? (comCtPill.dataset.v || null) : null;
    }

    var subtypePill = document.querySelector('#res-sub .qpill.on, #com-sub .qpill.on');
    var clientType = subtypePill ? (subtypePill.dataset.v || null) : null;

    var parkPill = document.querySelector('#parkPills .qpill.on');
    var accessPill = document.querySelector('#accessPills .qpill.on');

    return {
      id:               currentQuoteId || undefined,
      quote_type:       isRes ? 'residential' : (jobType === 'com' ? 'commercial' : null),
      client_type:      clientType,
      quote_status:     asDraft ? 'draft' : (currentQuoteId ? undefined : 'draft'),
      quoted_price:     quotedPrice,
      quote_source:     src,
      suburb:           document.getElementById('iSuburb').value.trim() || null,
      postcode:         document.getElementById('iPostcode').value.trim() || null,
      street_address:   document.getElementById('iStreet').value.trim() || null,
      parking_type:     parkPill ? parkPill.textContent.trim() : null,
      access_instructions: accessPill ? accessPill.textContent.trim() : null,
      service_type:     svcType,
      bedrooms:         isRes ? sv.beds : null,
      bathrooms:        isRes ? sv.baths : null,
      living_areas:     isRes ? sv.rooms : null,
      num_floors:       isRes ? sv.floors : sv.comFloors,
      floor_area_sqm:   !isRes ? (parseFloat(document.getElementById('comSqm').value) || null) : null,
      restroom_count:   !isRes ? sv.restrooms : null,
      condition:        isRes ? condition : null,
      furnished_status: isRes ? furnished : null,
      pet_info:         isRes ? petInfo : null,
      property_size_tag: isRes ? getPillText('sizePills') : null,
      extras:           extras,
      urgency:          urgency,
      vacate_date:      document.getElementById('vacateDate').value || null,
      is_recurring:     isRecurring,
      frequency:        isRecurring ? freq : null,
      recurrence:       isRecurring ? (freq || '').toLowerCase() : 'none',
      preferred_days:   prefDays,
      preferred_time:   prefTime || null,
      lead_source:      getPillText('leadPills') || null,
      full_name:        document.getElementById('iClientName').value.trim() || null,
      phone:            document.getElementById('iClientMobile').value.trim() || null,
      email:            document.getElementById('iClientEmail').value.trim() || null,
      internal_notes:   document.getElementById('iClientNotes').value.trim() || null,
      hours:            parseFloat(document.getElementById('rHours').value)  || null,
      hourly_rate:      parseFloat(document.getElementById('rHourly').value) || null,
    };
  }

  async function saveQuote(asDraft) {
    var payload = collectFormData(asDraft !== false);
    if (!payload.quote_type) { MQ.ui.toast('Please select a job type first.', 'error'); return; }

    var btn = asDraft !== false ? document.getElementById('btnCalcSave') : document.getElementById('btnCalcEmail');
    if (btn) { btn.disabled = true; btn.textContent = 'Saving…'; }

    var result = await callApi('/api/save-quote', payload);

    if (result.error) {
      MQ.ui.toast(result.error, 'error');
      if (btn) { btn.disabled = false; btn.textContent = asDraft !== false ? '' + (view === 'edit' ? 'Save Changes' : 'Save Draft') : 'Email Quote'; }
      return;
    }

    if (!currentQuoteId && result.id) {
      currentQuoteId = result.id;
      view = 'edit';
      var shortId = result.id.slice(0, 8).toUpperCase();
      document.getElementById('qPageTitle').textContent = 'QT-' + shortId + (payload.full_name ? ' — ' + payload.full_name : '');
      document.getElementById('btnViewQuote').style.display = '';
      document.getElementById('btnCalcViewQuote').style.display = '';
      document.getElementById('btnHeaderSave').textContent = 'Save Changes';
      document.getElementById('btnHeaderEmail').textContent = 'Email Quote';
      document.getElementById('btnCalcEmail').textContent = 'Email Quote';
      document.getElementById('btnCalcSave').textContent = 'Save Changes';
      document.getElementById('ehSection').classList.add('on');
      document.getElementById('ehCard').classList.add('on');
      renderEmailHistory([]);
    }

    MQ.ui.toast(asDraft !== false ? 'Draft saved.' : 'Quote saved.');
    if (btn) { btn.disabled = false; btn.textContent = asDraft !== false ? 'Save Changes' : 'Email Quote'; }
    loadQuotes();
  }

  /* ── Email quote ────────────────────────────────────────────── */
  async function emailQuote() {
    if (!currentQuoteId) {
      MQ.ui.toast('Save the quote first before emailing.', 'error');
      return;
    }
    var email = document.getElementById('iClientEmail').value.trim();
    if (!email) { MQ.ui.toast('Add a client email address before sending.', 'error'); return; }

    var btn = document.getElementById('btnCalcEmail');
    if (btn) { btn.disabled = true; btn.textContent = 'Sending…'; }

    await saveQuote(false);

    var result = await callApi('/api/email-quote', { id: currentQuoteId });
    if (result.error) {
      MQ.ui.toast(result.error, 'error');
      if (btn) { btn.disabled = false; btn.textContent = 'Email Quote'; }
      return;
    }

    MQ.ui.toast('Quote emailed successfully!');
    if (btn) { btn.disabled = false; btn.textContent = 'Email Quote'; }

    var quoteRes = await sb.from('quote_requests')
      .select('email_log, quote_status')
      .eq('id', currentQuoteId)
      .single();
    if (quoteRes.data) {
      renderEmailHistory(Array.isArray(quoteRes.data.email_log) ? quoteRes.data.email_log : []);
      document.getElementById('qHeaderBadge').innerHTML =
        '<span class="qchip qchip--sent"><span class="qdot qdot--sent"></span> Sent</span>';
    }
    loadQuotes();
    closePreviewModal();
  }

  /* ── Accept quote ───────────────────────────────────────────── */
  async function acceptQuote(id) {
    var result = await callApi('/api/save-quote', { id: id, quote_status: 'accepted' });
    if (result.error) { MQ.ui.toast(result.error, 'error'); return; }
    MQ.ui.toast('Quote accepted.');
    loadQuotes();
  }

  /* ── Preview modal ──────────────────────────────────────────── */
  function showPreviewModal() {
    var name     = document.getElementById('iClientName').value.trim() || 'Valued Client';
    var email    = document.getElementById('iClientEmail').value.trim() || '';
    var suburb   = document.getElementById('iSuburb').value.trim();
    var street   = document.getElementById('iStreet').value.trim();
    var postcode = document.getElementById('iPostcode').value.trim();
    var rawPrice = document.getElementById('cPrice').value;
    var price    = rawPrice && rawPrice !== '—' ? rawPrice : '—';
    var shortId  = currentQuoteId ? 'QT-' + currentQuoteId.slice(0, 8).toUpperCase() : 'QT-NEW';

    var today  = new Date().toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' });
    var expiry = new Date(Date.now() + 30 * 86400000).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' });

    var svcLabel = '—';
    var svcDetail = '';
    var isRes = (jobType === 'res');
    if (isRes) {
      var ctLabels = { regular: 'Regular clean', eol: 'End of lease / Bond clean', custom: 'Custom clean' };
      svcLabel  = ctLabels[cleanType] || 'Cleaning service';
      svcDetail = sv.beds + ' bed, ' + sv.baths + ' bath';
      var xtr = [];
      document.querySelectorAll('#extrasPills .qpill.on').forEach(function (p) { xtr.push(p.textContent.trim()); });
      if (xtr.length) svcDetail += '<br>Includes: ' + xtr.join(', ');
    } else {
      svcLabel  = 'Commercial cleaning service';
      var sqm   = document.getElementById('comSqm').value || '—';
      svcDetail = sqm + ' sqm';
    }

    var isRecur = document.getElementById('recurToggle').classList.contains('on');
    var freqTxt = isRecur ? (getPillText('freqPills') || 'Ongoing') + ' service' : 'One-off service';

    var dayBtns = [];
    document.querySelectorAll('#prefDays .dp.on').forEach(function (b) { dayBtns.push(b.textContent.trim()); });
    var tod   = getPillText('calcTimePills');
    var tH    = document.getElementById('tHour').value;
    var tM    = document.getElementById('tMin').value;
    var tAP   = getPillText('ampmPills');
    var prefStr = '';
    if (dayBtns.length) prefStr += '<strong>Preferred days:</strong> ' + dayBtns.join(', ') + '<br>';
    if (tod) { prefStr += '<strong>Preferred time:</strong> ' + tod; if (tH) prefStr += ' — ' + tH + ':' + (tM || '00') + (tAP ? ' ' + tAP : ''); }

    var addrLine = [street, suburb ? suburb + (postcode ? ' SA ' + postcode : '') : ''].filter(Boolean).join('<br>');

    document.getElementById('previewDoc').innerHTML =
      '<div class="pq-header">'
      + '<div><div class="pq-logo">My<span>Quest</span></div><div class="pq-tagline">Professional Cleaning Services</div></div>'
      + '<div class="pq-title"><h2>QUOTE</h2><div class="pq-id">' + esc(shortId) + '</div><div class="pq-date">Prepared: ' + today + ' · Valid until: ' + expiry + '</div></div>'
      + '</div>'
      + '<div class="pq-parties">'
      +   '<div><div class="pq-party-lbl">From</div><div class="pq-party-name">MyQuest Cleaning</div><div class="pq-party-line">Adelaide, SA<br>hello@myquest.au<br>0497 828 838</div></div>'
      +   '<div><div class="pq-party-lbl">Prepared for</div><div class="pq-party-name">' + esc(name) + '</div>'
      +     (addrLine ? '<div class="pq-party-line">' + addrLine + '</div>' : '')
      +     (email ? '<div class="pq-party-line">' + esc(email) + '</div>' : '')
      +   '</div>'
      + '</div>'
      + '<table class="pq-table"><thead><tr><th>Service</th><th>Amount</th></tr></thead>'
      + '<tbody><tr>'
      +   '<td><div class="pq-item-name">' + esc(svcLabel) + '</div><div class="pq-item-sub">' + esc(freqTxt) + '<br>' + svcDetail + '</div></td>'
      +   '<td>' + esc(price) + '</td>'
      + '</tr></tbody></table>'
      + '<div class="pq-total-row"><div><div class="pq-total-lbl">Total quoted price</div><div class="pq-total-note">Per service · Includes GST</div></div><div class="pq-total-price">' + esc(price) + '</div></div>'
      + (prefStr ? '<div class="pq-prefs">' + prefStr + '</div>' : '')
      + '<div class="pq-footer"><div class="pq-footer-text">This quote is valid for 30 days from the date above. Pricing is based on the property details provided and may be adjusted after an on-site assessment.</div>'
      + '<button class="pq-accept">✓ Accept this quote</button>'
      + '</div>';

    document.getElementById('previewModal').classList.add('on');
  }

  function closePreviewModal() {
    document.getElementById('previewModal').classList.remove('on');
  }

  /* ── Form reset ─────────────────────────────────────────────── */
  function resetForm() {
    jobType = null; cleanType = null;
    sv = { beds: 3, baths: 2, rooms: 2, floors: 1, comFloors: 1, restrooms: 2 };

    document.getElementById('tc-res').classList.remove('on');
    document.getElementById('tc-com').classList.remove('on');
    document.getElementById('res-sub').classList.remove('on');
    document.getElementById('com-sub').classList.remove('on');
    document.getElementById('det-placeholder').style.display = '';
    document.getElementById('resDet').classList.remove('on');
    document.getElementById('comDet').classList.remove('on');
    document.getElementById('resExtras').style.display = 'none';
    document.getElementById('comExtras').style.display = 'none';

    var pillGroups = ['condPills','furnPills','petPills','cleanTypePills','comCleanPills',
      'sizePills','urgencyPills','freqPills','leadPills','parkPills','accessPills',
      'cleanTimePills','calcTimePills','ampmPills','extrasPills','comExtrasPills'];
    pillGroups.forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.querySelectorAll('.qpill').forEach(function (p) { p.classList.remove('on'); });
    });
    document.querySelectorAll('#res-sub .qpill, #com-sub .qpill').forEach(function (p) { p.classList.remove('on'); });

    var condDef = document.querySelector('#condPills .qpill');
    if (condDef) condDef.classList.add('on');

    var stepDefaults = { bedsV: 3, bathsV: 2, roomsV: 2, floorsV: 1, comFloorsV: 1, restroomsV: 2 };
    Object.keys(stepDefaults).forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.textContent = stepDefaults[id];
    });

    ['iSuburb','iPostcode','iStreet','iClientName','iClientMobile','iClientEmail'].forEach(function (id) {
      var el = document.getElementById(id); if (el) el.value = '';
    });
    document.getElementById('iClientNotes').value = '';
    document.getElementById('specDate').style.display = 'none';
    document.getElementById('specDate').value = '';
    document.getElementById('petNote').style.display = 'none';
    document.getElementById('petNote').value = '';
    document.getElementById('recurToggle').classList.remove('on');
    document.getElementById('freqCard').style.display = 'none';
    document.getElementById('cond-vacate').classList.remove('on');
    document.getElementById('vacateDate').value = '';
    ['cond-ndis','cond-dva','cond-construction','cond-real-estate','cond-aged-care'].forEach(function (id) {
      var el = document.getElementById(id); if (el) el.classList.remove('on');
    });

    document.querySelectorAll('#prefDays .dp').forEach(function (b) { b.classList.remove('on'); });
    document.getElementById('tHour').value = '';
    document.getElementById('tMin').value = '00';
    document.getElementById('comSqm').value = 200;

    document.getElementById('rHours').value = '';
    document.getElementById('cPrice').value = '—';
    document.getElementById('calcExtrasList').innerHTML = '';
    document.getElementById('calcExtras').style.display = 'none';
    document.getElementById('calcBreakdown').textContent = '';

    document.querySelectorAll('#srcRow .qsrc').forEach(function (b) { b.classList.remove('on'); });
    var phoneSrc = document.querySelector('#srcRow .qsrc[data-v="phone"]');
    if (phoneSrc) phoneSrc.classList.add('on');
  }

  /* ── Job type ────────────────────────────────────────────────── */
  function setType(t) {
    jobType = t;
    document.getElementById('tc-res').classList.toggle('on', t === 'res');
    document.getElementById('tc-com').classList.toggle('on', t === 'com');
    document.getElementById('res-sub').classList.toggle('on', t === 'res');
    document.getElementById('com-sub').classList.toggle('on', t === 'com');
    document.getElementById('det-placeholder').style.display = 'none';
    toggleCond('resDet', t === 'res');
    toggleCond('comDet', t === 'com');
    document.getElementById('resExtras').style.display = t === 'res' ? '' : 'none';
    document.getElementById('comExtras').style.display = t === 'com' ? '' : 'none';
    if (view !== 'edit') {
      document.querySelectorAll('#res-sub .qpill, #com-sub .qpill').forEach(function (p) { p.classList.remove('on'); });
      clearCondFields();
    }
  }

  function toggleCond(id, on) {
    var el = document.getElementById(id);
    if (!el) return;
    if (on) { el.classList.add('on'); } else { el.classList.remove('on'); }
  }

  /* ── Sub-type ────────────────────────────────────────────────── */
  function setSubtype(el) {
    var parent = el.closest('.qpg');
    if (parent) parent.querySelectorAll('.qpill').forEach(function (p) { p.classList.remove('on'); });
    el.classList.add('on');
    clearCondFields();
    var v = el.dataset.v;
    if (v) setCondById(v, true);
  }

  function setCondById(v, on) {
    clearCondFields();
    var cf = document.getElementById('cond-' + v);
    if (cf && on) cf.classList.add('on');
  }

  function clearCondFields() {
    ['cond-ndis','cond-dva','cond-construction','cond-real-estate','cond-aged-care'].forEach(function (id) {
      var el = document.getElementById(id); if (el) el.classList.remove('on');
    });
  }

  /* ── Clean type ─────────────────────────────────────────────── */
  function setCleanType(v) {
    cleanType = v;
    var cv = document.getElementById('cond-vacate');
    if (cv) { if (v === 'eol') { cv.classList.add('on'); } else { cv.classList.remove('on'); } }
  }

  /* ── Map ─────────────────────────────────────────────────────── */
  function initMap() {
    if (map) { map.invalidateSize(); return; }
    var el = document.getElementById('quoteMap');
    if (!el) return;
    map = L.map('quoteMap').setView([-34.9285, 138.6007], 11);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);
    marker = L.marker([-34.9285, 138.6007]).addTo(map);
  }

  function geocode() {
    clearTimeout(geocodeTimer);
    geocodeTimer = setTimeout(function () {
      if (!map) return;
      var suburb = document.getElementById('iSuburb').value.trim();
      var post   = document.getElementById('iPostcode').value.trim();
      var q = (suburb + ' ' + post + ' Australia').trim();
      if (q.length < 4) return;
      fetch('https://nominatim.openstreetmap.org/search?q=' + encodeURIComponent(q) + '&format=json&limit=1')
        .then(function (r) { return r.json(); })
        .then(function (data) {
          if (data && data[0]) {
            var lat = +data[0].lat, lng = +data[0].lon;
            map.setView([lat, lng], 14);
            marker.setLatLng([lat, lng]);
          }
        }).catch(function () {});
    }, 700);
  }

  /* ── Pill helpers ───────────────────────────────────────────── */
  function selPill(el) {
    var g = el.closest('.qpg');
    if (g) g.querySelectorAll('.qpill').forEach(function (p) { p.classList.remove('on'); });
    el.classList.add('on');
  }

  function setPillByText(groupId, text) {
    if (!text) return;
    var g = document.getElementById(groupId);
    if (!g) return;
    g.querySelectorAll('.qpill').forEach(function (p) {
      p.classList.toggle('on', p.textContent.trim() === text);
    });
  }

  function setPillByDataV(groupId, val) {
    if (!val) return;
    var g = document.getElementById(groupId);
    if (!g) return;
    g.querySelectorAll('.qpill').forEach(function (p) {
      p.classList.toggle('on', p.dataset.v === val);
    });
  }

  function setPillByVal(groupId, val) {
    setPillByText(groupId, val);
  }

  function getPillText(groupId) {
    var el = document.querySelector('#' + groupId + ' .qpill.on');
    return el ? el.textContent.trim() : null;
  }

  function getPillDataV(groupId) {
    var el = document.querySelector('#' + groupId + ' .qpill.on');
    return el ? (el.dataset.v || el.textContent.trim()) : null;
  }

  /* ── Steppers ───────────────────────────────────────────────── */
  var STEP_IDS = { beds: 'bedsV', baths: 'bathsV', rooms: 'roomsV', floors: 'floorsV', comFloors: 'comFloorsV', restrooms: 'restroomsV' };

  function step(key, d) {
    sv[key] = Math.max(0, (sv[key] || 0) + d);
    var el = document.getElementById(STEP_IDS[key]);
    if (el) el.textContent = sv[key];
  }

  function setSteppers(vals) {
    Object.keys(vals).forEach(function (k) {
      sv[k] = vals[k];
      var el = document.getElementById(STEP_IDS[k]);
      if (el) el.textContent = vals[k];
    });
  }

  /* ── Calculator ─────────────────────────────────────────────── */
  function calcTotal() {
    var hours = parseFloat(document.getElementById('rHours').value) || 0;
    var rate  = parseFloat(document.getElementById('rHourly').value) || 0;
    var base  = hours * rate;

    var extrasTotal = 0;
    document.querySelectorAll('#calcExtrasList .calc-extra-row input').forEach(function (inp) {
      extrasTotal += parseFloat(inp.value) || 0;
    });

    var total = base + extrasTotal;
    var pi = document.getElementById('cPrice');
    var bd = document.getElementById('calcBreakdown');
    if (total > 0) {
      if (document.activeElement !== pi) pi.value = '$' + Math.round(total);
      var parts = [];
      if (base > 0) parts.push(hours + 'h × $' + rate);
      if (extrasTotal > 0) parts.push('+ $' + Math.round(extrasTotal) + ' add-ons');
      if (bd) bd.textContent = parts.join(' ');
    } else {
      if (document.activeElement !== pi) pi.value = '—';
      if (bd) bd.textContent = '';
    }
  }

  function updateExtrasInCalc() {
    var container = document.getElementById('calcExtrasList');
    var existing = {};
    container.querySelectorAll('.calc-extra-row').forEach(function (row) {
      var inp = row.querySelector('input');
      if (inp) existing[row.dataset.name] = inp.value;
    });

    var selected = [];
    document.querySelectorAll('#extrasPills .qpill.on, #comExtrasPills .qpill.on').forEach(function (p) {
      selected.push(p.textContent.trim());
    });

    container.innerHTML = selected.map(function (name) {
      var safeId = 'ep-' + name.replace(/[^a-zA-Z0-9]/g, '-');
      return '<div class="calc-extra-row" data-name="' + esc(name) + '">'
        + '<div class="calc-extra-name">' + esc(name) + '</div>'
        + '<input class="ri" id="' + safeId + '" type="number" min="0" step="1" placeholder="$" value="' + (existing[name] || '') + '">'
        + '</div>';
    }).join('');

    var hasRows = selected.length || container.querySelectorAll('[data-custom]').length;
    document.getElementById('calcExtras').style.display = hasRows ? '' : 'none';
    calcTotal();
  }

  /* ── Event binding ──────────────────────────────────────────── */
  function bindEvents() {
    // List page
    document.getElementById('btnNewQuote').addEventListener('click', openNewQuote);
    document.getElementById('q-search').addEventListener('input', function () {
      searchTerm = this.value.toLowerCase().trim();
      renderList();
    });
    document.querySelectorAll('#qStatPills .qsp').forEach(function (btn) {
      btn.addEventListener('click', function () {
        document.querySelectorAll('#qStatPills .qsp').forEach(function (b) { b.classList.remove('on'); });
        btn.classList.add('on');
        activeFilter = btn.dataset.filter;
        renderList();
      });
    });

    // Form navigation
    document.getElementById('btnBackToList').addEventListener('click', function () {
      showListView();
    });

    // Save / email buttons
    document.getElementById('btnHeaderSave').addEventListener('click',  function () { saveQuote(true); });
    document.getElementById('btnCalcSave').addEventListener('click',    function () { saveQuote(true); });
    document.getElementById('btnHeaderEmail').addEventListener('click', function () { emailQuote(); });
    document.getElementById('btnCalcEmail').addEventListener('click',   function () { emailQuote(); });
    document.getElementById('btnSendEmailFromHistory').addEventListener('click', function () { emailQuote(); });

    // View quote / preview
    document.getElementById('btnViewQuote').addEventListener('click',     showPreviewModal);
    document.getElementById('btnCalcViewQuote').addEventListener('click', showPreviewModal);
    document.getElementById('btnClosePreview').addEventListener('click',  closePreviewModal);
    document.getElementById('btnEmailFromPreview').addEventListener('click', function () { closePreviewModal(); emailQuote(); });

    // Job type tiles
    document.getElementById('tc-res').addEventListener('click', function () { setType('res'); });
    document.getElementById('tc-com').addEventListener('click', function () { setType('com'); });

    // Sub-type pills
    document.querySelectorAll('#res-sub .qpill, #com-sub .qpill').forEach(function (p) {
      p.addEventListener('click', function () { setSubtype(p); });
    });

    // Clean type pills
    document.querySelectorAll('#cleanTypePills .qpill').forEach(function (p) {
      p.addEventListener('click', function () {
        selPill(p);
        setCleanType(p.dataset.v || null);
      });
    });
    document.querySelectorAll('#comCleanPills .qpill').forEach(function (p) {
      p.addEventListener('click', function () { selPill(p); calcTotal(); });
    });

    // Generic single-select pill groups
    var singlePillGroups = ['condPills','furnPills','sizePills','urgencyPills','freqPills',
      'leadPills','parkPills','accessPills','cleanTimePills','calcTimePills','ampmPills'];
    singlePillGroups.forEach(function (gid) {
      var g = document.getElementById(gid);
      if (!g) return;
      g.querySelectorAll('.qpill').forEach(function (p) {
        p.addEventListener('click', function () { selPill(p); });
      });
    });

    // Urgency — show/hide specific date
    document.querySelectorAll('#urgencyPills .qpill').forEach(function (p) {
      p.addEventListener('click', function () {
        document.getElementById('specDate').style.display = (p.dataset.v === 'specific') ? '' : 'none';
      });
    });

    // Pet pills — show/hide note
    document.querySelectorAll('#petPills .qpill').forEach(function (p) {
      p.addEventListener('click', function () {
        selPill(p);
        document.getElementById('petNote').style.display = (p.textContent.trim() !== 'No pets') ? '' : 'none';
      });
    });

    // Extras (toggle)
    document.querySelectorAll('#extrasPills .qpill, #comExtrasPills .qpill').forEach(function (p) {
      p.addEventListener('click', function () { p.classList.toggle('on'); updateExtrasInCalc(); });
    });

    // Recurring toggle
    document.getElementById('recurToggle').addEventListener('click', function () {
      this.classList.toggle('on');
      document.getElementById('freqCard').style.display = this.classList.contains('on') ? '' : 'none';
      calcTotal();
    });

    // Source buttons
    document.querySelectorAll('#srcRow .qsrc').forEach(function (b) {
      b.addEventListener('click', function () {
        document.querySelectorAll('#srcRow .qsrc').forEach(function (x) { x.classList.remove('on'); });
        b.classList.add('on');
      });
    });

    // Preferred days
    document.querySelectorAll('#prefDays .dp').forEach(function (b) {
      b.addEventListener('click', function () { b.classList.toggle('on'); });
    });

    // Steppers
    document.querySelectorAll('.qst-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        step(btn.dataset.step, parseInt(btn.dataset.dir, 10));
      });
    });

    // Geocode on suburb/postcode change
    document.getElementById('iSuburb').addEventListener('input', geocode);
    document.getElementById('iPostcode').addEventListener('input', geocode);

    // Rate inputs trigger recalc
    ['rHours','rHourly'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.addEventListener('input', calcTotal);
    });

    // Extras list — event delegation for price inputs and remove buttons
    var extrasList = document.getElementById('calcExtrasList');
    extrasList.addEventListener('input', calcTotal);
    extrasList.addEventListener('click', function (e) {
      if (e.target.classList.contains('calc-extra-remove')) {
        e.target.closest('.calc-extra-row').remove();
        if (!extrasList.querySelector('.calc-extra-row')) {
          document.getElementById('calcExtras').style.display = 'none';
        }
        calcTotal();
      }
    });

    // Add custom extra
    document.getElementById('btnAddCustomExtra').addEventListener('click', function () {
      var row = document.createElement('div');
      row.className = 'calc-extra-row';
      row.dataset.custom = 'true';
      row.innerHTML = '<input class="ri calc-extra-name-input" type="text" placeholder="Description">'
        + '<input class="ri" type="number" min="0" step="1" placeholder="$">'
        + '<button class="calc-extra-remove" title="Remove">&times;</button>';
      extrasList.appendChild(row);
      document.getElementById('calcExtras').style.display = '';
      row.querySelector('input').focus();
    });
  }

  /* ── Init ───────────────────────────────────────────────────── */
  function init() {
    sb = MQ.supabase;
    bindEvents();
    loadQuotes();
  }

  document.addEventListener('mq:ready', function () { init(); });
  document.addEventListener('mq:pageshow', function () { if (view === 'list') loadQuotes(); });

  window.QuotesPage = {
    openQuote:   openQuote,
    acceptQuote: acceptQuote,
    emailQuote:  emailQuote,
  };
})();
