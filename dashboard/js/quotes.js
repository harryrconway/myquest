/* ============================================================
   MYQUEST — quotes.js
   ============================================================ */
(function () {
  'use strict';

  var resCalcResult = null;
  var comCalcResult = null;

  function escHtml(str) {
    return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  function getClientName(id) {
    var c = MQ.store.clients.getById(id);
    return c ? c.name : '—';
  }

  function populateClientDropdowns() {
    var clients = MQ.store.clients.getAll();
    var opts = '<option value="">— Select client —</option>' + clients.map(function (c) {
      return '<option value="' + c.id + '">' + escHtml(c.name) + '</option>';
    }).join('');
    document.getElementById('res-client').innerHTML = opts;
    document.getElementById('com-client').innerHTML = opts;
  }

  function populatePropertyDropdown(clientId, selId, type) {
    var sel = document.getElementById(selId);
    if (!clientId) { sel.innerHTML = '<option value="">Select client first</option>'; return; }
    var props = MQ.store.properties.getAll().filter(function (p) {
      return p.clientId === clientId && (!type || p.type === type);
    });
    sel.innerHTML = '<option value="">— No property —</option>' + props.map(function (p) {
      var label = p.subtype ? (p.subtype.charAt(0).toUpperCase() + p.subtype.slice(1)) : (p.type || 'Property');
      if (p.bedrooms) label += ' · ' + p.bedrooms + 'bd/' + (p.bathrooms || 0) + 'ba';
      if (p.sqm)      label += ' · ' + p.sqm + ' sqm';
      return '<option value="' + p.id + '">' + escHtml(label) + '</option>';
    }).join('');
    // Auto-select if only one property
    if (props.length === 1) {
      sel.value = props[0].id;
      prefillFromProperty(props[0], type);
    }
  }

  function prefillFromProperty(p, tab) {
    if (!p) return;
    if (tab === 'residential') {
      if (p.bedrooms) document.getElementById('res-beds').value  = p.bedrooms;
      if (p.bathrooms) document.getElementById('res-baths').value = p.bathrooms;
      if (p.sqm)      document.getElementById('res-sqm').value   = p.sqm;
    } else if (tab === 'commercial') {
      if (p.sqm)       document.getElementById('com-sqm').value       = p.sqm;
      if (p.frequency) document.getElementById('com-frequency').value = p.frequency;
    }
  }

  /* ----------- Residential Calc ----------- */
  function calcResidential() {
    var rates = MQ.store.rates.get();
    var r = rates.res;
    var beds = parseInt(document.getElementById('res-beds').value) || 0;
    var baths = parseInt(document.getElementById('res-baths').value) || 0;
    var condition = document.getElementById('res-condition').value;
    var extras = Array.from(document.querySelectorAll('.res-extra:checked')).map(function (el) { return el.value; });

    var sqm = parseFloat((document.getElementById('res-sqm') || {}).value) || 0;
    var sqmRate = parseFloat((document.getElementById('res-sqm-rate') || {}).value) || 0;

    var extrasTotal = extras.reduce(function (sum, key) { return sum + (r.extras[key] || 0); }, 0);
    var breakdown = '';
    var base, total;

    if (sqm > 0 && sqmRate > 0) {
      base = sqm * sqmRate;
      total = base + extrasTotal;
      breakdown = sqm + ' sqm × $' + sqmRate.toFixed(2) + '/sqm = $' + base.toFixed(2) +
        (extrasTotal ? ' + $' + extrasTotal + ' extras' : '');
    } else {
      base = (beds * r.baseBedroom) + (baths * r.baseBathroom) + r.baseFlat;
      var multiplier = r.conditionMultiplier[condition] || 1;
      base = base * multiplier;
      total = base + extrasTotal;
      var condLabel = condition === 'poor' ? ' (poor ×1.3)' : condition === 'heavy' ? ' (heavy ×1.6)' : '';
      breakdown = beds + ' bed + ' + baths + ' bath + base fee' + condLabel + ' = $' + base.toFixed(2) +
        (extrasTotal ? ' + $' + extrasTotal + ' extras' : '');
    }

    var hours = total / r.hourlyRate;
    var staff = Math.ceil(hours / r.staffPerHours);

    resCalcResult = { total: total, hours: hours, staff: staff, beds: beds, baths: baths, condition: condition, extras: extras, sqm: sqm, sqmRate: sqmRate };

    document.getElementById('res-price').textContent = MQ.ui.formatCurrency(total);
    document.getElementById('res-hours').textContent = hours.toFixed(1) + ' hrs';
    document.getElementById('res-staff').textContent = staff;
    var breakdownEl = document.getElementById('res-breakdown');
    if (breakdownEl) breakdownEl.textContent = breakdown;
    document.getElementById('res-result').style.display = '';
  }

  function saveResQuote() {
    if (!resCalcResult) { MQ.ui.toast('Calculate first', 'error'); return; }
    var clientId = document.getElementById('res-client').value;
    var propertyId = document.getElementById('res-property').value;
    var obj = {
      clientId: clientId || null,
      propertyId: propertyId || null,
      type: 'residential',
      inputs: {
        bedrooms: resCalcResult.beds,
        bathrooms: resCalcResult.baths,
        condition: resCalcResult.condition,
        extras: resCalcResult.extras,
      },
      labourHours: parseFloat(resCalcResult.hours.toFixed(2)),
      staffRequired: resCalcResult.staff,
      price: Math.round(resCalcResult.total),
      status: 'draft',
    };
    MQ.store.quotes.save(obj);
    renderQuotesTable();
    MQ.ui.toast('Residential quote saved');
    document.getElementById('res-result').style.display = 'none';
    resCalcResult = null;
  }

  /* ----------- Commercial Calc ----------- */
  function calcCommercial() {
    var rates = MQ.store.rates.get();
    var r = rates.com;
    var sqm = parseFloat(document.getElementById('com-sqm').value) || 0;
    var complexity = document.getElementById('com-complexity').value;
    var frequency = document.getElementById('com-frequency').value;

    var freqMult = r.frequencyMultiplier[frequency] || 4.3;
    var complexMult = r.complexityMultiplier[complexity] || 1;

    var perVisit = sqm * r.baseRatePerSqm * complexMult;
    var monthly = perVisit * freqMult;
    var annual = monthly * 12;

    comCalcResult = { perVisit: perVisit, monthly: monthly, annual: annual, sqm: sqm, complexity: complexity, frequency: frequency };

    document.getElementById('com-per-visit').textContent = MQ.ui.formatCurrency(perVisit);
    document.getElementById('com-monthly').textContent = MQ.ui.formatCurrency(monthly);
    document.getElementById('com-annual').textContent = MQ.ui.formatCurrency(annual);
    document.getElementById('com-result').style.display = '';
  }

  function saveComQuote() {
    if (!comCalcResult) { MQ.ui.toast('Calculate first', 'error'); return; }
    var clientId = document.getElementById('com-client').value;
    var propertyId = document.getElementById('com-property').value;
    var obj = {
      clientId: clientId || null,
      propertyId: propertyId || null,
      type: 'commercial',
      inputs: {
        sqm: comCalcResult.sqm,
        complexity: comCalcResult.complexity,
        frequency: comCalcResult.frequency,
      },
      price: Math.round(comCalcResult.monthly),
      priceAnnual: Math.round(comCalcResult.annual),
      pricePerVisit: Math.round(comCalcResult.perVisit),
      status: 'draft',
    };
    MQ.store.quotes.save(obj);
    renderQuotesTable();
    MQ.ui.toast('Commercial quote saved');
    document.getElementById('com-result').style.display = 'none';
    comCalcResult = null;
  }

  /* ----------- Quotes Table ----------- */
  function renderQuotesTable() {
    var tbody = document.getElementById('quotes-tbody');
    var quotes = MQ.store.quotes.getAll().slice().reverse();
    if (!quotes.length) {
      tbody.innerHTML = '<tr><td colspan="7">' + MQ.ui.emptyState('M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6', 'No quotes yet', 'Use the calculator above to create a quote') + '</td></tr>';
      return;
    }
    tbody.innerHTML = quotes.map(function (q) {
      return '<tr>' +
        '<td>' + MQ.ui.formatDate(q.createdAt) + '</td>' +
        '<td>' + escHtml(getClientName(q.clientId)) + '</td>' +
        '<td>' + (q.type === 'commercial' ? 'Commercial' : 'Residential') + '</td>' +
        '<td>' + MQ.ui.formatCurrency(q.price) + (q.type === 'commercial' ? '/mo' : '') + '</td>' +
        '<td>' + (q.labourHours ? q.labourHours + ' hrs' : '—') + '</td>' +
        '<td>' +
          '<select class="form-input" style="padding:0.25rem 0.5rem;font-size:var(--text-sm);" onchange="QuotesPage.updateStatus(\'' + q.id + '\', this.value)">' +
            ['draft','sent','accepted','declined'].map(function (s) {
              return '<option value="' + s + '"' + (q.status === s ? ' selected' : '') + '>' + s.charAt(0).toUpperCase() + s.slice(1) + '</option>';
            }).join('') +
          '</select>' +
        '</td>' +
        '<td class="table-actions">' +
          (q.status === 'accepted' && !q.jobCreated
            ? '<a class="btn-outline" style="padding:0.35rem 0.65rem;font-size:0.72rem;white-space:nowrap;text-decoration:none;" href="jobs.html?quoteId=' + q.id + '">+ Create Job</a> '
            : (q.jobCreated ? '<span style="font-size:var(--text-xs);color:var(--color-mid);">Job created</span> ' : '')) +
          '<button class="btn-icon btn-icon--danger" onclick="QuotesPage.remove(\'' + q.id + '\')" title="Delete"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/></svg></button>' +
        '</td>' +
        '</tr>';
    }).join('');
  }

  function updateStatus(id, status) {
    var q = MQ.store.quotes.getById(id);
    if (!q) return;
    q.status = status;
    MQ.store.quotes.save(q);
    MQ.ui.toast('Quote updated');
  }

  function remove(id) {
    if (!MQ.hasRole('manager')) { MQ.ui.toast('Only managers and owners can delete', 'error'); return; }
    MQ.ui.confirmDelete('Delete this quote?', function () {
      MQ.store.quotes.delete(id);
      renderQuotesTable();
      MQ.ui.toast('Quote deleted', 'info');
    });
  }

  document.addEventListener('mq:ready', function () {
    MQ.store.seed();
    populateClientDropdowns();
    renderQuotesTable();

    document.getElementById('res-client').addEventListener('change', function () {
      populatePropertyDropdown(this.value, 'res-property', 'residential');
    });
    document.getElementById('com-client').addEventListener('change', function () {
      populatePropertyDropdown(this.value, 'com-property', 'commercial');
    });

    document.getElementById('res-property').addEventListener('change', function () {
      var p = MQ.store.properties.getById(this.value);
      prefillFromProperty(p, 'residential');
    });
    document.getElementById('com-property').addEventListener('change', function () {
      var p = MQ.store.properties.getById(this.value);
      prefillFromProperty(p, 'commercial');
    });

    document.getElementById('res-calc-btn').addEventListener('click', calcResidential);
    document.getElementById('res-save-btn').addEventListener('click', saveResQuote);
    document.getElementById('com-calc-btn').addEventListener('click', calcCommercial);
    document.getElementById('com-save-btn').addEventListener('click', saveComQuote);

    /* Pre-select client from ?clientId= URL param (e.g. linked from clients page) */
    var params   = new URLSearchParams(location.search);
    var clientId = params.get('clientId');
    if (clientId && MQ.store.clients.getById(clientId)) {
      var resClient = document.getElementById('res-client');
      resClient.value = clientId;
      populatePropertyDropdown(clientId, 'res-property', 'residential');
      // Also pre-select on commercial tab in case user switches
      document.getElementById('com-client').value = clientId;
      populatePropertyDropdown(clientId, 'com-property', 'commercial');
    }
  });

  window.QuotesPage = { updateStatus: updateStatus, remove: remove };
})();
