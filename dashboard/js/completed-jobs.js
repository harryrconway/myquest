/* ============================================================
   MYQUEST — completed-jobs.js
   ============================================================ */
(function () {
  'use strict';
  var escHtml = window.escHtml || function (s) { return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); };

  var jobs         = [];
  var filteredJobs = [];
  var invoicingId  = null;



  function fmtDate(str) {
    if (!str) return '—';
    try {
      var d = new Date(str);
      return d.toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
    } catch (e) { return str; }
  }

  function fmtTime(str) {
    if (!str) return '';
    var parts = str.split(':');
    var h = parseInt(parts[0]);
    var m = parts[1] || '00';
    var ampm = h >= 12 ? 'pm' : 'am';
    h = h % 12 || 12;
    return h + ':' + m + ' ' + ampm;
  }

  function fmtServices(arr) {
    if (!arr || !arr.length) return '—';
    return arr.join(', ');
  }

  function completedOn(str) {
    if (!str) return '';
    try {
      var d = new Date(str);
      return d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch (e) { return str; }
  }

  /* ─── Search / Count ────────────────────────────────────────── */

  function updateCount() {
    var el = document.getElementById('cj-count');
    if (el) el.textContent = filteredJobs.length;
  }

  function filterAndRender(query) {
    var q = (query || '').toLowerCase().trim();
    filteredJobs = q ? jobs.filter(function (j) {
      return (j.full_name     || '').toLowerCase().indexOf(q) !== -1 ||
             (j.suburb        || '').toLowerCase().indexOf(q) !== -1 ||
             (j.state         || '').toLowerCase().indexOf(q) !== -1 ||
             (j.services      || []).join(' ').toLowerCase().indexOf(q) !== -1 ||
             (j.property_type || '').toLowerCase().indexOf(q) !== -1;
    }) : jobs.slice();
    updateCount();
    render(filteredJobs);
  }

  /* ─── Load ─────────────────────────────────────────────────── */

  async function load() {
    var wrap = document.getElementById('cj-table-wrap');
    wrap.innerHTML = '<div style="padding:60px;text-align:center;color:var(--color-light);">Loading…</div>';

    try {
      var { data, error } = await MQ.supabase
        .from('quote_requests')
        .select('*')
        .eq('status', 'completed')
        .order('updated_at', { ascending: false });

      if (error) throw error;
      jobs = data || [];
      var searchEl = document.getElementById('cj-search');
      filterAndRender(searchEl ? searchEl.value : '');
    } catch (err) {
      wrap.innerHTML = '<div style="padding:60px;text-align:center;color:var(--color-error);">Failed to load: ' + escHtml(err.message) + '</div>';
    }
  }

  /* ─── Render ────────────────────────────────────────────────── */

  function render(list) {
    var wrap = document.getElementById('cj-table-wrap');

    if (!list.length) {
      wrap.innerHTML = MQ.ui.emptyState(
        'M20 6 9 17 4 12',
        jobs.length ? 'No results found' : 'No completed jobs yet',
        jobs.length ? 'Try a different search term' : 'Jobs marked as complete will appear here'
      );
      return;
    }

    var html = list.map(function (j) {
      var initial    = (j.full_name || '?')[0].toUpperCase();
      var location   = [j.suburb, j.state].filter(Boolean).join(', ');
      var chips      = (j.services || []).slice(0, 3).map(function (s) {
        return '<span class="req-chip req-chip--green">' + escHtml(s) + '</span>';
      }).join('');
      var doneOn     = completedOn(j.updated_at);
      var invoiceSent = !!j.invoice_sent_at;
      var invoiceBadge = invoiceSent
        ? '<div class="job-card__invoice-badge">' +
            '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>' +
            ' Invoice Sent' +
          '</div>'
        : '';

      return '<div class="job-card job-card--completed' + (invoiceSent ? ' job-card--invoice-sent' : '') + '">' +
        invoiceBadge +
        '<div class="job-card__done-badge"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg></div>' +
        '<div class="req-card__avatar req-card__avatar--green">' + initial + '</div>' +
        '<div class="req-card__body">' +
          '<div class="req-card__row1">' +
            '<span class="req-card__name">' + escHtml(j.full_name) + '</span>' +
            (doneOn ? '<span class="req-card__ago">' + doneOn + '</span>' : '') +
          '</div>' +
          (location ? '<div class="req-card__meta"><span>' + escHtml(location) + '</span>' +
            (j.property_type ? '<span class="req-card__dot"></span><span class="badge badge--green" style="font-size:11px;">' + escHtml(j.property_type) + '</span>' : '') +
          '</div>' : '') +
          (chips ? '<div class="req-card__chips">' + chips + '</div>' : '') +
        '</div>' +
        '<div class="req-card__actions">' +
          '<button class="action-btn action-btn--view" onclick="CJPage.view(\'' + j.id + '\')">View</button>' +
        '</div>' +
      '</div>';
    }).join('');

    wrap.innerHTML = '<div class="req-list">' + html + '</div>';
  }

  /* ─── View details ──────────────────────────────────────────── */

  function view(id) {
    var j = jobs.find(function (x) { return x.id === id; });
    if (!j) return;

    var initial = (j.full_name || '?').charAt(0).toUpperCase();
    var address = [j.street_address, j.suburb, j.state, j.postcode].filter(Boolean).join(', ');

    function field(label, val, full) {
      if (!val && val !== 0) return '';
      return '<div class="job-detail__field' + (full ? ' job-detail__field--full' : '') + '">' +
        '<div class="job-detail__label">' + label + '</div>' +
        '<div class="job-detail__value">' + val + '</div>' +
        '</div>';
    }

    var chips = (j.services || []).map(function (s) {
      return '<span class="req-chip req-chip--green">' + escHtml(s) + '</span>';
    }).join('');

    var phoneIcon = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.15 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.06 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21 16.92z"/></svg>';
    var emailIcon = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>';

    var contactsHtml = '';
    if (j.phone) contactsHtml += '<a href="tel:' + escHtml(j.phone) + '">' + phoneIcon + ' ' + escHtml(j.phone) + '</a>';
    if (j.email) contactsHtml += '<a href="mailto:' + escHtml(j.email) + '">' + emailIcon + ' ' + escHtml(j.email) + '</a>';

    document.getElementById('cj-view-body').innerHTML =
      '<div class="job-detail">' +
        '<div class="job-detail__hero job-detail__hero--green">' +
          '<div class="job-detail__hero-avatar">' + initial + '</div>' +
          '<div class="job-detail__hero-body">' +
            '<div class="job-detail__hero-name">' + escHtml(j.full_name || '') + '</div>' +
            (contactsHtml ? '<div class="job-detail__hero-contacts">' + contactsHtml + '</div>' : '') +
          '</div>' +
          '<div class="job-detail__hero-badge"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg> Completed</div>' +
        '</div>' +

        '<div class="job-detail__section">' +
          '<div class="job-detail__section-title">Property</div>' +
          '<div class="job-detail__grid">' +
            (address ? field('Address', escHtml(address), true) : '') +
            field('Type', escHtml(j.property_type)) +
            (j.bedrooms  ? field('Bedrooms',  j.bedrooms)  : '') +
            (j.bathrooms ? field('Bathrooms', j.bathrooms) : '') +
          '</div>' +
        '</div>' +

        '<div class="job-detail__section">' +
          '<div class="job-detail__section-title">Service</div>' +
          (chips ? '<div class="job-detail__chips">' + chips + '</div>' : '') +
          '<div class="job-detail__grid" style="margin-top:' + (chips ? '10px' : '0') + ';">' +
            field('Frequency', escHtml(j.frequency)) +
          '</div>' +
        '</div>' +

        '<div class="job-detail__section">' +
          '<div class="job-detail__section-title">Schedule</div>' +
          '<div class="job-detail__grid">' +
            field('Date', escHtml(fmtDate(j.scheduled_date))) +
            field('Time', escHtml(fmtTime(j.scheduled_time))) +
            field('Completed on', escHtml(completedOn(j.updated_at))) +
          '</div>' +
        '</div>' +

        ((j.notes || j.internal_notes) ?
          '<div class="job-detail__section">' +
            '<div class="job-detail__section-title">Notes</div>' +
            (j.notes ? '<div class="job-detail__note">' + escHtml(j.notes) + '</div>' : '') +
            (j.internal_notes ? '<div class="job-detail__note" style="margin-top:6px;border-left:3px solid #FFD400;">' + escHtml(j.internal_notes) + '</div>' : '') +
          '</div>'
        : '') +
      '</div>';

    MQ.ui.modal.open('modal-cj-view');

    var footer = document.querySelector('#modal-cj-view .modal-footer');
    if (footer && MQ.hasRole('owner')) {
      if (j.invoice_sent_at) {
        footer.innerHTML =
          '<div style="display:flex;align-items:center;gap:8px;flex:1;">' +
            '<span style="background:#d1fae5;color:#065f46;font-size:12px;font-weight:700;padding:4px 10px;border-radius:20px;">' +
              '✓ Invoice Sent' + (j.invoice_reference ? ' · ' + escHtml(j.invoice_reference) : '') +
            '</span>' +
          '</div>' +
          '<button class="btn-outline" onclick="MQ.ui.modal.close(\'modal-cj-view\')">Close</button>';
      } else {
        footer.innerHTML =
          '<button class="btn-outline" style="margin-right:auto;" onclick="CJPage.openInvoice(\'' + escHtml(j.id) + '\')">Mark Invoice Sent</button>' +
          '<button class="btn-outline" onclick="MQ.ui.modal.close(\'modal-cj-view\')">Close</button>';
      }
    } else if (footer) {
      footer.innerHTML = '<button class="btn-outline" onclick="MQ.ui.modal.close(\'modal-cj-view\')">Close</button>';
    }
  }

  /* ─── Invoice ───────────────────────────────────────────────── */

  function openInvoice(id) {
    invoicingId = id;
    document.getElementById('cj-invoice-ref').value = '';
    document.getElementById('cj-invoice-error').style.display = 'none';
    MQ.ui.modal.close('modal-cj-view');
    MQ.ui.modal.open('modal-cj-invoice');
  }

  async function saveInvoice() {
    var ref   = document.getElementById('cj-invoice-ref').value.trim();
    var errEl = document.getElementById('cj-invoice-error');
    if (!ref) { errEl.textContent = 'Please enter an invoice reference.'; errEl.style.display = ''; return; }

    var btn = document.getElementById('cj-invoice-submit');
    btn.disabled = true; btn.textContent = 'Saving…';
    MQ.ui.saving();

    try {
      var { error } = await MQ.supabase
        .from('quote_requests')
        .update({ invoice_reference: ref, invoice_sent_at: new Date().toISOString() })
        .eq('id', invoicingId);
      if (error) throw error;

      MQ.ui.modal.close('modal-cj-invoice');
      MQ.ui.toast('Invoice marked as sent · ' + ref);
      load();
    } catch (err) {
      errEl.textContent = err.message; errEl.style.display = '';
    } finally {
      btn.disabled = false; btn.textContent = 'Save';
      MQ.ui.saved();
    }
  }

  /* ─── Init ──────────────────────────────────────────────────── */

  document.addEventListener('mq:ready', function () {
    load();
    document.getElementById('btn-refresh').addEventListener('click', load);
    document.getElementById('cj-invoice-submit').addEventListener('click', saveInvoice);

    var searchEl = document.getElementById('cj-search');
    if (searchEl) searchEl.addEventListener('input', function () { filterAndRender(this.value); });

    MQ.supabase
      .channel('cj-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'quote_requests' },
        function () { load(); })
      .subscribe();
  });

  document.addEventListener('mq:pageshow', function () { load(); });

  window.CJPage = { view: view, openInvoice: openInvoice };
})();
