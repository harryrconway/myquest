/* ============================================================
   MYQUEST — clients.js  (clients + properties + quotes merged)
   ============================================================ */
(function () {
  'use strict';

  var editingClientId    = null;
  var editingPropertyId  = null;
  var activePropTab      = 'residential';
  var activeQuoteTab     = 'residential';
  var quoteCalcResult    = null;
  var quoteClientId      = null;

  // ── SVG icons ──────────────────────────────────────────────
  var IEDIT  = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>';
  var IDEL   = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/></svg>';
  var IJOB   = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></svg>';
  var IQUOTE = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>';
  var IPLUS  = '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>';
  var IPHONE = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 9.73a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.62 1h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 8.91a16 16 0 0 0 6.29 6.29l.75-.75a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>';
  var IMAIL  = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>';
  var IPIN   = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>';

  // ── Helpers ────────────────────────────────────────────────
  function escHtml(str) {
    return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function propertyLabel(p) {
    if (p.type === 'commercial') {
      var parts = [];
      if (p.subtype) parts.push(p.subtype.charAt(0).toUpperCase() + p.subtype.slice(1));
      if (p.offices) parts.push(p.offices + ' offices');
      if (p.frequency) parts.push(p.frequency);
      return parts.join(' · ') || 'Commercial';
    } else {
      var parts2 = [];
      if (p.subtype) parts2.push(p.subtype.charAt(0).toUpperCase() + p.subtype.slice(1));
      if (p.bedrooms) parts2.push(p.bedrooms + ' bed');
      if (p.bathrooms) parts2.push(p.bathrooms + ' bath');
      return parts2.join(' · ') || 'Residential';
    }
  }

  var STATUS_LABEL = { draft: 'Draft', sent: 'Sent', accepted: 'Accepted', declined: 'Declined' };
  var STATUS_CLASS = { draft: 'badge--grey', sent: 'badge--blue', accepted: 'badge--green', declined: '' };

  // ── Search ─────────────────────────────────────────────────
  function getFilteredClients() {
    var q = document.getElementById('client-search').value.trim().toLowerCase();
    var all = MQ.store.clients.getAll();
    if (!q) return all;
    return all.filter(function (c) {
      return (c.name || '').toLowerCase().includes(q) ||
             (c.email || '').toLowerCase().includes(q) ||
             (c.phone || '').toLowerCase().includes(q);
    });
  }

  // ── Render client cards ────────────────────────────────────
  function renderList() {
    var list = document.getElementById('clients-list');
    var clients = getFilteredClients();
    var countEl = document.getElementById('client-count');
    if (countEl) countEl.textContent = clients.length + ' client' + (clients.length === 1 ? '' : 's');

    if (!clients.length) {
      list.innerHTML = MQ.ui.emptyState(
        'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
        'No clients yet',
        'Add your first client to get started'
      );
      return;
    }

    list.innerHTML = clients.map(function (c) {
      var initial    = (c.name || '?').charAt(0).toUpperCase();
      var props      = MQ.store.properties.getAll().filter(function (p) { return p.clientId === c.id; });
      var quotes     = MQ.store.quotes.getAll().filter(function (q) { return q.clientId === c.id; });
      var typeClass  = (c.cleaningType === 'Commercial') ? 'client-card--commercial' : 'client-card--residential';
      var badgeClass = (c.cleaningType === 'Commercial') ? 'badge--amber' : 'badge--blue';

      // Contact lines — stacked, phone/email as links
      var contactLines = [];
      if (c.phone)   contactLines.push('<a class="client-card__contact-line" href="tel:' + escHtml(c.phone) + '">' + IPHONE + escHtml(c.phone) + '</a>');
      if (c.email)   contactLines.push('<a class="client-card__contact-line" href="mailto:' + escHtml(c.email) + '">' + IMAIL + escHtml(c.email) + '</a>');

      // Property rows
      var propRows = props.map(function (p) {
        var pTypeClass = p.type === 'commercial' ? 'badge--amber' : 'badge--blue';
        var pTypeLabel = p.type === 'commercial' ? 'Commercial' : 'Residential';
        var sqm        = p.sqm || p.comSqm;
        return '<div class="client-card__prop-row">' +
          '<span class="badge ' + pTypeClass + '">' + pTypeLabel + '</span>' +
          '<span class="client-card__prop-row__label">' + escHtml(propertyLabel(p)) + '</span>' +
          (sqm ? '<span class="client-card__prop-row__sqm">' + sqm + ' sqm</span>' : '') +
          '<div class="prop-row__actions">' +
            '<button class="btn-icon" onclick="event.stopPropagation();ClientsPage.editProperty(\'' + p.id + '\')" title="Edit">' + IEDIT + '</button>' +
            '<button class="btn-icon btn-icon--danger" onclick="event.stopPropagation();ClientsPage.removeProperty(\'' + p.id + '\')" title="Delete">' + IDEL + '</button>' +
          '</div>' +
        '</div>';
      }).join('');

      // Quote rows
      var quoteRows = quotes.map(function (q) {
        var qTypeClass = q.type === 'commercial' ? 'badge--amber' : 'badge--blue';
        var qTypeLabel = q.type === 'commercial' ? 'Commercial' : 'Residential';
        var priceStr   = MQ.ui.formatCurrency(q.price) + (q.type === 'commercial' ? '/mo' : '');
        var statusOpts = ['draft','sent','accepted','declined'].map(function (s) {
          return '<option value="' + s + '"' + (q.status === s ? ' selected' : '') + '>' + (STATUS_LABEL[s] || s) + '</option>';
        }).join('');
        return '<div class="client-card__quote-row">' +
          '<span class="quote-row__date">' + MQ.ui.formatDate(q.createdAt) + '</span>' +
          '<span class="badge ' + qTypeClass + '" style="flex-shrink:0;">' + qTypeLabel + '</span>' +
          '<span class="quote-row__price">' + priceStr + '</span>' +
          '<select class="form-input quote-row__status" onchange="event.stopPropagation();ClientsPage.updateQuoteStatus(\'' + q.id + '\',this.value)" onclick="event.stopPropagation()">' + statusOpts + '</select>' +
          (q.status === 'accepted' && !q.jobCreated
            ? '<a href="jobs.html?quoteId=' + q.id + '" class="btn-outline" style="font-size:0.7rem;padding:0.25rem 0.6rem;white-space:nowrap;text-decoration:none;flex-shrink:0;" onclick="event.stopPropagation()">+ Job</a>'
            : (q.jobCreated ? '<span style="font-size:var(--text-xs);color:var(--color-mid);flex-shrink:0;">Job created</span>' : '')) +
          '<button class="btn-icon btn-icon--danger" onclick="event.stopPropagation();ClientsPage.removeQuote(\'' + q.id + '\')" title="Delete">' + IDEL + '</button>' +
        '</div>';
      }).join('');

      return '<div class="client-card ' + typeClass + '">' +

        // ── Header ──
        '<div class="client-card__header">' +
          '<div class="client-card__avatar">' + initial + '</div>' +
          '<div class="client-card__info">' +
            '<div class="client-card__name-row">' +
              '<span class="client-card__name">' + escHtml(c.name || '') + '</span>' +
              (c.cleaningType ? '<span class="badge ' + badgeClass + '">' + escHtml(c.cleaningType) + '</span>' : '') +
            '</div>' +
            (contactLines.length ? '<div class="client-card__contacts">' + contactLines.join('') + '</div>' : '') +
          '</div>' +
          '<div class="client-card__actions">' +
            '<a href="jobs.html?clientId=' + c.id + '" class="client-card__job-btn">' + IJOB + ' Add Job</a>' +
            '<div class="client-card__sep"></div>' +
            '<button class="btn-icon" onclick="ClientsPage.editClient(\'' + c.id + '\')" title="Edit client">' + IEDIT + '</button>' +
            '<button class="btn-icon btn-icon--danger" onclick="ClientsPage.removeClient(\'' + c.id + '\')" title="Delete client">' + IDEL + '</button>' +
          '</div>' +
        '</div>' +

        // ── Properties section ──
        '<div class="client-card__section">' +
          '<div class="client-card__section-hd">' +
            '<span class="client-card__section-title">Properties</span>' +
            (props.length ? '<span class="client-card__section-count">' + props.length + '</span>' : '') +
            '<button class="client-card__section-btn" onclick="ClientsPage.addProperty(\'' + c.id + '\')">' + IPLUS + ' Add Property</button>' +
          '</div>' +
          (propRows
            ? '<div class="client-card__prop-list">' + propRows + '</div>'
            : '<p class="client-card__section-empty">No properties yet</p>') +
        '</div>' +

        // ── Quotes section ──
        '<div class="client-card__section">' +
          '<div class="client-card__section-hd">' +
            '<span class="client-card__section-title">Quotes</span>' +
            (quotes.length ? '<span class="client-card__section-count">' + quotes.length + '</span>' : '') +
            '<button class="client-card__section-btn" onclick="ClientsPage.openQuoteModal(\'' + c.id + '\')">' + IQUOTE + ' New Quote</button>' +
          '</div>' +
          (quoteRows
            ? '<div class="client-card__quote-list">' + quoteRows + '</div>'
            : '<p class="client-card__section-empty">No quotes yet</p>') +
        '</div>' +

      '</div>';
    }).join('');
  }

  // ── Client: open add modal ─────────────────────────────────
  function openAddClientModal() {
    editingClientId = null;
    document.getElementById('client-modal-title').textContent = 'Add Client';
    document.getElementById('client-form').reset();
    document.getElementById('client-id').value = '';
    MQ.ui.modal.open('modal-add-client');
  }

  // ── Client: edit ───────────────────────────────────────────
  function editClient(id) {
    var c = MQ.store.clients.getById(id);
    if (!c) return;
    editingClientId = id;
    document.getElementById('client-modal-title').textContent = 'Edit Client';
    document.getElementById('client-id').value = c.id;
    document.getElementById('client-name').value = c.name || '';
    document.getElementById('client-phone').value = c.phone || '';
    document.getElementById('client-email').value = c.email || '';
    MQ.ui.modal.open('modal-add-client');
  }

  // ── Client: remove ─────────────────────────────────────────
  function removeClient(id) {
    if (!MQ.hasRole('manager')) { MQ.ui.toast('Only managers and owners can delete', 'error'); return; }
    var props  = MQ.store.properties.getAll().filter(function (p) { return p.clientId === id; });
    var jobs   = MQ.store.jobs.getAll().filter(function (j) { return j.clientId === id; });
    var quotes = MQ.store.quotes.getAll().filter(function (q) { return q.clientId === id; });

    var parts = [];
    if (props.length)  parts.push(props.length  + ' propert' + (props.length  === 1 ? 'y' : 'ies'));
    if (jobs.length)   parts.push(jobs.length   + ' job'     + (jobs.length   === 1 ? ''  : 's'));
    if (quotes.length) parts.push(quotes.length + ' quote'   + (quotes.length === 1 ? ''  : 's'));

    var msg = 'Delete this client' + (parts.length ? ' and their ' + parts.join(', ') : '') + '? This cannot be undone.';
    MQ.ui.confirmDelete(msg, function () {
      props.forEach(function (p)  { MQ.store.properties.delete(p.id); });
      jobs.forEach(function (j)   { MQ.store.jobs.delete(j.id); });
      quotes.forEach(function (q) { MQ.store.quotes.delete(q.id); });
      MQ.store.clients.delete(id);
      renderList();
      MQ.ui.toast('Client and all related data deleted', 'info');
    });
  }

  // ── Property: tab switching ────────────────────────────────
  function switchPropTab(type) {
    activePropTab = type;
    document.getElementById('tab-residential').style.display = type === 'residential' ? '' : 'none';
    document.getElementById('tab-commercial').style.display  = type === 'commercial'  ? '' : 'none';
    document.getElementById('prop-tab-res').classList.toggle('is-active', type === 'residential');
    document.getElementById('prop-tab-com').classList.toggle('is-active', type === 'commercial');
  }

  // ── Property: reset form ───────────────────────────────────
  function resetPropForm() {
    document.getElementById('prop-subtype').value = 'house';
    document.getElementById('prop-sqm').value = '';
    document.getElementById('prop-bedrooms').value = '3';
    document.getElementById('prop-bathrooms').value = '1';
    document.getElementById('prop-toilets').value = '1';
    document.getElementById('prop-stories').value = '1';
    document.getElementById('prop-carpet').value = '';
    document.getElementById('prop-hardfloor').value = '';
    document.getElementById('prop-balcony').checked = false;
    document.getElementById('prop-garage').checked = false;
    document.getElementById('prop-com-subtype').value = 'office';
    document.getElementById('prop-com-sqm').value = '';
    document.getElementById('prop-offices').value = '';
    document.getElementById('prop-com-bathrooms').value = '';
    document.getElementById('prop-com-kitchens').value = '';
    document.getElementById('prop-staff-count').value = '';
    document.getElementById('prop-frequency').value = 'weekly';
    document.getElementById('prop-clean-type').value = 'Standard';
    document.getElementById('prop-pets').value = '';
    document.getElementById('prop-access').value = '';
    document.getElementById('prop-alarm').value = '';
    document.getElementById('prop-parking').value = '';
    document.getElementById('prop-fragile').value = '';
    document.getElementById('prop-special').value = '';
  }

  // ── Property: add ──────────────────────────────────────────
  function addProperty(clientId) {
    var client = MQ.store.clients.getById(clientId);
    if (!client) return;
    editingPropertyId = null;
    document.getElementById('property-modal-title').textContent = 'Add Property';
    document.getElementById('property-id').value = '';
    document.getElementById('property-client-id').value = clientId;
    document.getElementById('property-client-label').textContent = 'Client: ' + client.name;
    resetPropForm();
    switchPropTab('residential');
    MQ.ui.modal.open('modal-add-property');
  }

  // ── Property: edit ─────────────────────────────────────────
  function editProperty(id) {
    var p = MQ.store.properties.getById(id);
    if (!p) return;
    var client = MQ.store.clients.getById(p.clientId);
    editingPropertyId = id;
    document.getElementById('property-modal-title').textContent = 'Edit Property';
    document.getElementById('property-id').value = p.id;
    document.getElementById('property-client-id').value = p.clientId;
    document.getElementById('property-client-label').textContent = client ? 'Client: ' + client.name : '';
    resetPropForm();

    if (p.type === 'commercial') {
      switchPropTab('commercial');
      document.getElementById('prop-com-subtype').value = p.subtype || 'office';
      document.getElementById('prop-com-sqm').value = p.sqm || '';
      document.getElementById('prop-offices').value = p.offices || '';
      document.getElementById('prop-com-bathrooms').value = p.bathrooms || '';
      document.getElementById('prop-com-kitchens').value = p.kitchens || '';
      document.getElementById('prop-staff-count').value = p.staffCount || '';
      document.getElementById('prop-frequency').value = p.frequency || 'weekly';
    } else {
      switchPropTab('residential');
      document.getElementById('prop-subtype').value = p.subtype || 'house';
      document.getElementById('prop-sqm').value = p.sqm || '';
      document.getElementById('prop-bedrooms').value = p.bedrooms || '';
      document.getElementById('prop-bathrooms').value = p.bathrooms || '';
      document.getElementById('prop-toilets').value = p.toilets || '';
      document.getElementById('prop-stories').value = p.stories || '1';
      document.getElementById('prop-carpet').value = p.carpetAreas || '';
      document.getElementById('prop-hardfloor').value = p.hardFloorAreas || '';
      document.getElementById('prop-balcony').checked = !!p.balcony;
      document.getElementById('prop-garage').checked = !!p.garage;
    }

    document.getElementById('prop-clean-type').value = p.cleanType || 'Standard';
    document.getElementById('prop-pets').value = p.pets || '';
    document.getElementById('prop-access').value = p.accessNotes || '';
    document.getElementById('prop-alarm').value = p.alarmInfo || '';
    document.getElementById('prop-parking').value = p.parkingNotes || '';
    document.getElementById('prop-fragile').value = p.fragile || '';
    document.getElementById('prop-special').value = p.specialRequests || '';

    MQ.ui.modal.open('modal-add-property');
  }

  // ── Property: remove ───────────────────────────────────────
  function removeProperty(id) {
    if (!MQ.hasRole('manager')) { MQ.ui.toast('Only managers and owners can delete', 'error'); return; }
    var linkedJobs = MQ.store.jobs.getAll().filter(function (j) { return j.propertyId === id; });
    var msg = 'Delete this property' + (linkedJobs.length ? ' (' + linkedJobs.length + ' job' + (linkedJobs.length === 1 ? '' : 's') + ' will be unlinked)' : '') + '? This cannot be undone.';
    MQ.ui.confirmDelete(msg, function () {
      linkedJobs.forEach(function (j) {
        j.propertyId = null;
        MQ.store.jobs.save(j);
      });
      MQ.store.properties.delete(id);
      renderList();
      MQ.ui.toast('Property deleted', 'info');
    });
  }

  // ── Property: save ─────────────────────────────────────────
  function saveProperty() {
    var clientId = document.getElementById('property-client-id').value;
    if (!clientId) { MQ.ui.toast('Client not set', 'error'); return; }

    var obj;
    var sharedFields = {
      cleanType:       document.getElementById('prop-clean-type').value,
      pets:            document.getElementById('prop-pets').value.trim(),
      accessNotes:     document.getElementById('prop-access').value.trim(),
      alarmInfo:       document.getElementById('prop-alarm').value.trim(),
      parkingNotes:    document.getElementById('prop-parking').value.trim(),
      fragile:         document.getElementById('prop-fragile').value.trim(),
      specialRequests: document.getElementById('prop-special').value.trim(),
    };

    if (activePropTab === 'commercial') {
      obj = Object.assign({
        clientId:   clientId,
        type:       'commercial',
        subtype:    document.getElementById('prop-com-subtype').value,
        sqm:        parseInt(document.getElementById('prop-com-sqm').value) || 0,
        offices:    parseInt(document.getElementById('prop-offices').value) || 0,
        bathrooms:  parseInt(document.getElementById('prop-com-bathrooms').value) || 0,
        kitchens:   parseInt(document.getElementById('prop-com-kitchens').value) || 0,
        staffCount: parseInt(document.getElementById('prop-staff-count').value) || 0,
        frequency:  document.getElementById('prop-frequency').value,
      }, sharedFields);
    } else {
      obj = Object.assign({
        clientId:       clientId,
        type:           'residential',
        subtype:        document.getElementById('prop-subtype').value,
        sqm:            parseInt(document.getElementById('prop-sqm').value) || 0,
        bedrooms:       parseInt(document.getElementById('prop-bedrooms').value) || 0,
        bathrooms:      parseInt(document.getElementById('prop-bathrooms').value) || 0,
        toilets:        parseInt(document.getElementById('prop-toilets').value) || 0,
        stories:        parseInt(document.getElementById('prop-stories').value) || 1,
        carpetAreas:    document.getElementById('prop-carpet').value.trim(),
        hardFloorAreas: document.getElementById('prop-hardfloor').value.trim(),
        balcony:        document.getElementById('prop-balcony').checked,
        garage:         document.getElementById('prop-garage').checked,
      }, sharedFields);
    }

    if (editingPropertyId) obj.id = editingPropertyId;
    MQ.store.properties.save(obj);
    MQ.ui.modal.close('modal-add-property');
    renderList();
    MQ.ui.toast('Property saved');
  }

  // ── Quote: open modal ──────────────────────────────────────
  function openQuoteModal(clientId) {
    var client = MQ.store.clients.getById(clientId);
    if (!client) return;
    quoteClientId   = clientId;
    quoteCalcResult = null;
    document.getElementById('quote-client-id').value = clientId;
    document.getElementById('quote-modal-title').textContent = 'New Quote';
    document.getElementById('quote-modal-sub').textContent   = 'Client: ' + client.name;
    // Reset inputs
    document.getElementById('quote-beds').value          = '3';
    document.getElementById('quote-baths').value         = '1';
    document.getElementById('quote-condition').value     = 'standard';
    document.getElementById('quote-sqm').value           = '';
    document.getElementById('quote-sqm-rate').value      = '';
    document.getElementById('quote-com-sqm').value       = '200';
    document.getElementById('quote-com-complexity').value = 'medium';
    document.getElementById('quote-com-frequency').value  = 'weekly';
    document.querySelectorAll('.qres-extra').forEach(function (cb) { cb.checked = false; });
    document.getElementById('quote-result').style.display   = 'none';
    document.getElementById('quote-save-btn').style.display = 'none';
    // Populate property dropdowns for both tabs
    populateQuotePropDropdown('residential');
    populateQuotePropDropdown('commercial');
    switchQuoteTab('residential');
    MQ.ui.modal.open('modal-quote');
  }

  // ── Quote: populate property dropdown ─────────────────────
  function populateQuotePropDropdown(type) {
    var selId = type === 'residential' ? 'quote-res-prop' : 'quote-com-prop';
    var sel   = document.getElementById(selId);
    var props = MQ.store.properties.getAll().filter(function (p) {
      return p.clientId === quoteClientId && p.type === type;
    });
    sel.innerHTML = '<option value="">— No property —</option>' + props.map(function (p) {
      var label = p.subtype ? (p.subtype.charAt(0).toUpperCase() + p.subtype.slice(1)) : (p.type || 'Property');
      if (p.bedrooms) label += ' · ' + p.bedrooms + 'bd/' + (p.bathrooms || 0) + 'ba';
      if (p.sqm)      label += ' · ' + p.sqm + ' sqm';
      return '<option value="' + p.id + '">' + escHtml(label) + '</option>';
    }).join('');
    if (props.length === 1) {
      sel.value = props[0].id;
      prefillQuoteFromProp(props[0], type);
    }
  }

  function prefillQuoteFromProp(p, type) {
    if (!p) return;
    if (type === 'residential') {
      if (p.bedrooms)  document.getElementById('quote-beds').value  = p.bedrooms;
      if (p.bathrooms) document.getElementById('quote-baths').value = p.bathrooms;
      if (p.sqm)       document.getElementById('quote-sqm').value   = p.sqm;
    } else {
      if (p.sqm)       document.getElementById('quote-com-sqm').value       = p.sqm;
      if (p.frequency) document.getElementById('quote-com-frequency').value = p.frequency;
    }
  }

  function onQuotePropChange(type) {
    var selId = type === 'residential' ? 'quote-res-prop' : 'quote-com-prop';
    var p     = MQ.store.properties.getById(document.getElementById(selId).value);
    prefillQuoteFromProp(p, type);
  }

  // ── Quote: tab switching ───────────────────────────────────
  function switchQuoteTab(type) {
    activeQuoteTab = type;
    document.getElementById('quote-panel-res').style.display = type === 'residential' ? '' : 'none';
    document.getElementById('quote-panel-com').style.display = type === 'commercial'  ? '' : 'none';
    document.getElementById('quote-result').style.display    = 'none';
    document.getElementById('quote-save-btn').style.display  = 'none';
    quoteCalcResult = null;
    document.getElementById('quote-tab-res').classList.toggle('is-active', type === 'residential');
    document.getElementById('quote-tab-com').classList.toggle('is-active', type === 'commercial');
  }

  // ── Quote: calculate ───────────────────────────────────────
  function calcQuote() {
    if (activeQuoteTab === 'residential') {
      calcResQuote();
    } else {
      calcComQuote();
    }
    document.getElementById('quote-result').style.display   = '';
    document.getElementById('quote-save-btn').style.display = '';
  }

  function calcResQuote() {
    var rates = MQ.store.rates.get();
    var r     = rates.res;
    var beds  = parseInt(document.getElementById('quote-beds').value) || 0;
    var baths = parseInt(document.getElementById('quote-baths').value) || 0;
    var condition = document.getElementById('quote-condition').value;
    var extras    = Array.from(document.querySelectorAll('.qres-extra:checked')).map(function (el) { return el.value; });
    var sqm       = parseFloat(document.getElementById('quote-sqm').value) || 0;
    var sqmRate   = parseFloat(document.getElementById('quote-sqm-rate').value) || 0;

    var extrasTotal = extras.reduce(function (sum, key) { return sum + (r.extras[key] || 0); }, 0);
    var base, total, breakdown;

    if (sqm > 0 && sqmRate > 0) {
      base      = sqm * sqmRate;
      total     = base + extrasTotal;
      breakdown = sqm + ' sqm × $' + sqmRate.toFixed(2) + ' = $' + base.toFixed(2) + (extrasTotal ? ' + $' + extrasTotal + ' extras' : '');
    } else {
      base = (beds * r.baseBedroom) + (baths * r.baseBathroom) + r.baseFlat;
      var mult = r.conditionMultiplier[condition] || 1;
      base  = base * mult;
      total = base + extrasTotal;
      var condLabel = condition === 'poor' ? ' (poor ×1.3)' : condition === 'heavy' ? ' (heavy ×1.6)' : '';
      breakdown = beds + ' bed + ' + baths + ' bath' + condLabel + ' = $' + base.toFixed(2) + (extrasTotal ? ' + $' + extrasTotal + ' extras' : '');
    }

    var hours = total / r.hourlyRate;
    var staff = Math.ceil(hours / r.staffPerHours);

    quoteCalcResult = { type: 'residential', total: total, hours: hours, staff: staff, beds: beds, baths: baths, condition: condition, extras: extras, sqm: sqm, sqmRate: sqmRate };

    document.getElementById('qr-stat1-val').textContent = MQ.ui.formatCurrency(total);
    document.getElementById('qr-stat1-lbl').textContent = 'Total Price';
    document.getElementById('qr-stat2-val').textContent = hours.toFixed(1) + ' hrs';
    document.getElementById('qr-stat2-lbl').textContent = 'Labour Hours';
    document.getElementById('qr-stat3-val').textContent = staff;
    document.getElementById('qr-stat3-lbl').textContent = 'Staff Required';
    document.getElementById('qr-breakdown').textContent = breakdown;
  }

  function calcComQuote() {
    var rates      = MQ.store.rates.get();
    var r          = rates.com;
    var sqm        = parseFloat(document.getElementById('quote-com-sqm').value) || 0;
    var complexity = document.getElementById('quote-com-complexity').value;
    var frequency  = document.getElementById('quote-com-frequency').value;

    var freqMult    = r.frequencyMultiplier[frequency] || 4.3;
    var complexMult = r.complexityMultiplier[complexity] || 1;
    var perVisit    = sqm * r.baseRatePerSqm * complexMult;
    var monthly     = perVisit * freqMult;
    var annual      = monthly * 12;

    quoteCalcResult = { type: 'commercial', perVisit: perVisit, monthly: monthly, annual: annual, sqm: sqm, complexity: complexity, frequency: frequency };

    document.getElementById('qr-stat1-val').textContent = MQ.ui.formatCurrency(monthly);
    document.getElementById('qr-stat1-lbl').textContent = 'Monthly';
    document.getElementById('qr-stat2-val').textContent = MQ.ui.formatCurrency(perVisit);
    document.getElementById('qr-stat2-lbl').textContent = 'Per Visit';
    document.getElementById('qr-stat3-val').textContent = MQ.ui.formatCurrency(annual);
    document.getElementById('qr-stat3-lbl').textContent = 'Annual';
    document.getElementById('qr-breakdown').textContent = sqm + ' sqm · ' + complexity + ' complexity · ' + frequency;
  }

  // ── Quote: save ────────────────────────────────────────────
  function saveQuote() {
    if (!quoteCalcResult) { MQ.ui.toast('Calculate first', 'error'); return; }
    var clientId = document.getElementById('quote-client-id').value;
    var propId   = activeQuoteTab === 'residential'
      ? document.getElementById('quote-res-prop').value
      : document.getElementById('quote-com-prop').value;

    var obj;
    if (activeQuoteTab === 'residential') {
      obj = {
        clientId:      clientId || null,
        propertyId:    propId   || null,
        type:          'residential',
        inputs: {
          bedrooms:   quoteCalcResult.beds,
          bathrooms:  quoteCalcResult.baths,
          condition:  quoteCalcResult.condition,
          extras:     quoteCalcResult.extras,
        },
        labourHours:   parseFloat(quoteCalcResult.hours.toFixed(2)),
        staffRequired: quoteCalcResult.staff,
        price:         Math.round(quoteCalcResult.total),
        status:        'draft',
      };
    } else {
      obj = {
        clientId:      clientId || null,
        propertyId:    propId   || null,
        type:          'commercial',
        inputs: {
          sqm:        quoteCalcResult.sqm,
          complexity: quoteCalcResult.complexity,
          frequency:  quoteCalcResult.frequency,
        },
        price:         Math.round(quoteCalcResult.monthly),
        priceAnnual:   Math.round(quoteCalcResult.annual),
        pricePerVisit: Math.round(quoteCalcResult.perVisit),
        status:        'draft',
      };
    }

    MQ.store.quotes.save(obj);
    MQ.ui.modal.close('modal-quote');
    renderList();
    MQ.ui.toast('Quote saved');
  }

  // ── Quote: update status ───────────────────────────────────
  function updateQuoteStatus(id, status) {
    var q = MQ.store.quotes.getById(id);
    if (!q) return;
    q.status = status;
    MQ.store.quotes.save(q);
    renderList();
    MQ.ui.toast('Quote updated');
  }

  // ── Quote: remove ──────────────────────────────────────────
  function removeQuote(id) {
    if (!MQ.hasRole('manager')) { MQ.ui.toast('Only managers and owners can delete', 'error'); return; }
    MQ.ui.confirmDelete('Delete this quote?', function () {
      MQ.store.quotes.delete(id);
      renderList();
      MQ.ui.toast('Quote deleted', 'info');
    });
  }

  // ── Init ───────────────────────────────────────────────────
  document.addEventListener('mq:ready', function () {
    MQ.store.seed();
    renderList();

    document.getElementById('client-search').addEventListener('input', renderList);
    document.getElementById('btn-add-client').addEventListener('click', openAddClientModal);

    document.getElementById('client-form').addEventListener('submit', function (e) {
      e.preventDefault();
      var name = document.getElementById('client-name').value.trim();
      if (!name) { MQ.ui.toast('Name is required', 'error'); return; }

      var obj = {
        name:    name,
        phone:   document.getElementById('client-phone').value.trim(),
        email:   document.getElementById('client-email').value.trim(),
      };
      if (editingClientId) obj.id = editingClientId;

      MQ.store.clients.save(obj);
      MQ.ui.modal.close('modal-add-client');
      renderList();
      MQ.ui.toast('Client saved');
    });

    document.getElementById('property-save-btn').addEventListener('click', saveProperty);
  });

  window.ClientsPage = {
    editClient:        editClient,
    removeClient:      removeClient,
    addProperty:       addProperty,
    editProperty:      editProperty,
    removeProperty:    removeProperty,
    switchPropTab:     switchPropTab,
    openQuoteModal:    openQuoteModal,
    switchQuoteTab:    switchQuoteTab,
    onQuotePropChange: onQuotePropChange,
    calcQuote:         calcQuote,
    saveQuote:         saveQuote,
    updateQuoteStatus: updateQuoteStatus,
    removeQuote:       removeQuote,
  };
})();
