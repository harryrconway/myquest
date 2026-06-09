(function () {
  'use strict';

  var editingId = null;

  var ICON_EDIT   = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>';
  var ICON_DELETE = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/></svg>';
  var ICON_EMAIL  = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>';
  var ICON_PHONE  = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.15 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.06 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21 16.92z"/></svg>';

  function esc(str) {
    return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  function roleBadge(role) {
    var map = { owner: 'badge--green', manager: 'badge--blue', staff: 'badge--grey' };
    var label = role ? role.charAt(0).toUpperCase() + role.slice(1) : 'Staff';
    return '<span class="badge ' + (map[role] || 'badge--grey') + '">' + label + '</span>';
  }

  function initials(name) {
    if (!name) return '?';
    return (name || '').split(' ').map(function (w) { return w[0] || ''; }).join('').slice(0, 2).toUpperCase() || name[0].toUpperCase();
  }

  function renderList() {
    var container = document.getElementById('staff-list');
    if (!container) return;

    var q = (document.getElementById('staff-search') || {}).value || '';
    q = q.trim().toLowerCase();

    var all = MQ.store.staff.getAll();
    var members = q
      ? all.filter(function (s) { return (s.name || '').toLowerCase().indexOf(q) > -1; })
      : all;

    members = members.slice().sort(function (a, b) {
      if (!!a.active !== !!b.active) return a.active ? -1 : 1;
      return (a.name || '').localeCompare(b.name || '');
    });

    if (!members.length) {
      container.innerHTML = '<div class="empty-state" style="padding:3rem 2rem;">' +
        '<p class="empty-state__title">' + (q ? 'No results for "' + esc(q) + '"' : 'No staff members yet') + '</p>' +
        '<p class="empty-state__sub">' + (q ? 'Try a different name' : 'Add your first team member to get started') + '</p>' +
      '</div>';
      return;
    }

    var isOwner = MQ.hasRole('owner');

    container.innerHTML = members.map(function (s) {
      var inactive = !s.active;
      var startDate = s.startDate ? 'Since ' + MQ.ui.formatDate(s.startDate) : '';

      var metaItems = [];
      if (s.email)   metaItems.push(ICON_EMAIL + ' ' + esc(s.email));
      if (s.phone)   metaItems.push(ICON_PHONE + ' ' + esc(s.phone));
      if (startDate) metaItems.push(esc(startDate));

      var toggleLabel = inactive ? 'Activate' : 'Deactivate';

      return '<div class="staff-row' + (inactive ? ' staff-row--inactive' : '') + '">' +

        '<div class="staff-row__avatar' + (inactive ? ' staff-row__avatar--inactive' : '') + '">' +
          esc(initials(s.name)) +
        '</div>' +

        '<div class="staff-row__info">' +
          '<div class="staff-row__name"><a href="profile.html?id=' + s.id + '" style="color:inherit;text-decoration:none;" onmouseover="this.style.color=\'var(--color-forest-green)\'" onmouseout="this.style.color=\'inherit\'">' + esc(s.name || '—') + '</a></div>' +
          '<div class="staff-row__meta">' + metaItems.join('<span style="opacity:.3">·</span>') + '</div>' +
        '</div>' +

        '<div class="staff-row__badges">' +
          '<span class="level-badge level-badge--' + (s.level || 1) + '">L' + (s.level || 1) + '</span>' +
          roleBadge(s.role) +
          (inactive
            ? '<span class="badge badge--grey">Inactive</span>'
            : '<span class="badge badge--green">Active</span>') +
        '</div>' +

        '<div class="staff-row__actions">' +
          '<select class="form-input" style="padding:0.25rem 0.4rem;font-size:0.72rem;height:auto;width:auto;min-width:7rem;" ' +
            'title="Level" onchange="StaffPage.setLevel(\'' + s.id + '\', this.value)">' +
            [1,2,3,4,5,6,7,8,9,10,11].map(function (n) {
              var labels = {1:'Trainee',2:'Cleaner',3:'Mid Cleaner',4:'Senior',5:'Team Leader',6:'Supervisor',7:'Sr Supervisor',8:'Ops Lead',9:'Area Manager',10:'Regional Mgr',11:'Director'};
              return '<option value="' + n + '"' + (s.level === n ? ' selected' : '') + '>' + n + ' — ' + labels[n] + '</option>';
            }).join('') +
          '</select>' +
          '<select class="form-input" style="padding:0.25rem 0.4rem;font-size:0.72rem;height:auto;width:auto;min-width:6rem;" ' +
            'title="Role" onchange="StaffPage.setRole(\'' + s.id + '\', this.value)">' +
            ['staff','manager','owner'].map(function (r) {
              var lbl = r.charAt(0).toUpperCase() + r.slice(1);
              return '<option value="' + r + '"' + (s.role === r ? ' selected' : '') + '>' + lbl + '</option>';
            }).join('') +
          '</select>' +
          '<button class="btn-outline" style="padding:0.375rem 0.75rem;font-size:0.75rem;white-space:nowrap;" ' +
            'onclick="StaffPage.toggleActive(\'' + s.id + '\')">' + toggleLabel + '</button>' +
          '<button class="btn-icon" onclick="StaffPage.edit(\'' + s.id + '\')" title="Edit">' + ICON_EDIT + '</button>' +
          (isOwner
            ? '<button class="btn-icon btn-icon--danger" onclick="StaffPage.remove(\'' + s.id + '\')" title="Delete">' + ICON_DELETE + '</button>'
            : '') +
        '</div>' +

      '</div>';
    }).join('');
  }

  var LEVEL_NAMES = {
    1:'Trainee', 2:'Cleaner', 3:'Mid Cleaner', 4:'Senior Cleaner',
    5:'Team Leader', 6:'Supervisor', 7:'Senior Supervisor',
    8:'Operations Lead', 9:'Area Manager', 10:'Regional Manager', 11:'Director'
  };

  function getAvailableAccounts() {
    var existingEmails = MQ.store.staff.getAll().map(function (s) { return s.email.toLowerCase(); });
    return MQ.store.accounts.getAll().filter(function (a) {
      return a.status === 'active' && !existingEmails.includes(a.email.toLowerCase());
    });
  }

  function updateAddButton() {
    var btn = document.getElementById('btn-add-staff');
    if (!btn) return;
    var available = getAvailableAccounts();
    btn.disabled = available.length === 0;
    btn.title    = available.length === 0 ? 'No accounts available — create one in Settings first' : '';
  }

  function openAddModal() {
    var available = getAvailableAccounts();
    if (!available.length) return;

    var ROLE_COLOR = { owner: 'background:#dcfce7;color:#16a34a', manager: 'background:#dbeafe;color:#1d4ed8', staff: 'background:#f1f5f9;color:#475569' };

    var list = document.getElementById('staff-account-list');
    list.innerHTML = available.map(function (acc) {
      var initial   = (acc.name || acc.email).charAt(0).toUpperCase();
      var levelName = LEVEL_NAMES[parseInt(acc.cleaningLevel)] || '';
      var roleStyle = ROLE_COLOR[acc.role] || ROLE_COLOR.staff;
      return '<button type="button" onclick="StaffPage.addFromAccount(\'' + acc.id + '\')" style="' +
        'display:flex;align-items:center;gap:14px;width:100%;padding:14px 16px;' +
        'background:#f8fafc;border:1.5px solid #e2e8f0;border-radius:14px;cursor:pointer;' +
        'font-family:inherit;text-align:left;transition:border-color 0.15s,background 0.15s;" ' +
        'onmouseover="this.style.borderColor=\'#0f172a\';this.style.background=\'#fff\'" ' +
        'onmouseout="this.style.borderColor=\'#e2e8f0\';this.style.background=\'#f8fafc\'">' +
        '<div style="width:40px;height:40px;border-radius:12px;background:linear-gradient(135deg,#0f172a,#334155);' +
        'display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:800;color:#fff;flex-shrink:0;">' +
        esc(initial) + '</div>' +
        '<div style="flex:1;min-width:0;">' +
          '<div style="font-size:14px;font-weight:700;color:#0f172a;margin-bottom:3px;">' + esc(acc.name || acc.email) + '</div>' +
          '<div style="font-size:12px;color:#94a3b8;">' + esc(acc.email) + '</div>' +
        '</div>' +
        '<div style="display:flex;flex-direction:column;align-items:flex-end;gap:5px;flex-shrink:0;">' +
          '<span style="font-size:11px;font-weight:700;padding:3px 8px;border-radius:6px;' + roleStyle + ';">' + esc(acc.role) + '</span>' +
          (levelName ? '<span style="font-size:11px;color:#94a3b8;font-weight:500;">' + esc(levelName) + '</span>' : '') +
        '</div>' +
        '</button>';
    }).join('');

    MQ.ui.modal.open('modal-add-staff');
  }

  function addFromAccount(accountId) {
    var acc = MQ.store.accounts.getById(accountId);
    if (!acc) return;
    MQ.store.staff.save({
      name:      acc.name  || '',
      email:     acc.email || '',
      phone:     '',
      role:      acc.role  || 'staff',
      level:     parseInt(acc.cleaningLevel) || 1,
      startDate: '',
      active:    true,
    });
    MQ.ui.modal.close('modal-add-staff');
    renderList();
    updateAddButton();
    MQ.ui.toast((acc.name || acc.email) + ' added to staff');
  }

  function edit(id) {
    var s = MQ.store.staff.getById(id);
    if (!s) return;
    editingId = id;
    document.getElementById('staff-id').value = s.id;
    document.getElementById('staff-name').value = s.name || '';
    document.getElementById('staff-email').value = s.email || '';
    document.getElementById('staff-phone').value = s.phone || '';
    document.getElementById('staff-role').value = s.role || 'staff';
    document.getElementById('staff-level').value = String(s.level || 1);
    document.getElementById('staff-start').value = s.startDate || '';
    document.getElementById('staff-active').value = s.active ? 'true' : 'false';
    MQ.ui.modal.open('modal-edit-staff');
  }

  function toggleActive(id) {
    var s = MQ.store.staff.getById(id);
    if (!s) return;
    s.active = !s.active;
    MQ.store.staff.save(s);
    renderList();
    MQ.ui.toast(s.active ? 'Staff member activated' : 'Staff member deactivated', 'info');
  }

  function syncAccountFromStaff(s) {
    var acc = MQ.store.accounts.getAll().find(function (a) {
      return a.email.toLowerCase() === (s.email || '').toLowerCase();
    });
    if (!acc) return;
    acc.role          = s.role;
    acc.cleaningLevel = s.level;
    MQ.store.accounts.save(acc);
  }

  function setLevel(id, val) {
    var s = MQ.store.staff.getById(id);
    if (!s) return;
    s.level = parseInt(val) || 1;
    MQ.store.staff.save(s);
    syncAccountFromStaff(s);
    renderList();
  }

  function setRole(id, val) {
    var s = MQ.store.staff.getById(id);
    if (!s) return;
    s.role = val;
    MQ.store.staff.save(s);
    syncAccountFromStaff(s);
    renderList();
  }

  function syncAllStaffFromAccounts() {
    MQ.store.staff.getAll().forEach(function (s) {
      var acc = MQ.store.accounts.getAll().find(function (a) {
        return a.email.toLowerCase() === (s.email || '').toLowerCase();
      });
      if (!acc) return;
      var level = parseInt(acc.cleaningLevel) || 1;
      if (s.role !== acc.role || s.level !== level) {
        s.role  = acc.role;
        s.level = level;
        MQ.store.staff.save(s);
      }
    });
  }

  function remove(id) {
    if (!MQ.hasRole('manager')) { MQ.ui.toast('Only managers and owners can delete', 'error'); return; }
    MQ.ui.confirmDelete('Delete this staff member? This cannot be undone.', function () {
      MQ.store.staff.delete(id);
      renderList();
      updateAddButton();
      MQ.ui.toast('Staff member deleted', 'info');
    });
  }

  document.addEventListener('mq:ready', function () {
    if (!MQ.hasRole('manager')) {
      window.location.href = 'index.html';
      return;
    }

    MQ.store.seed();
    syncAllStaffFromAccounts();
    renderList();
    updateAddButton();

    var search = document.getElementById('staff-search');
    if (search) search.addEventListener('input', renderList);

    var addBtn = document.getElementById('btn-add-staff');
    if (addBtn) addBtn.addEventListener('click', openAddModal);

    document.getElementById('staff-form').addEventListener('submit', function (e) {
      e.preventDefault();
      var name  = document.getElementById('staff-name').value.trim();
      var email = document.getElementById('staff-email').value.trim();
      if (!name || !email) {
        MQ.ui.toast('Name and email are required', 'error');
        return;
      }
      var obj = {
        name:      name,
        email:     email,
        phone:     document.getElementById('staff-phone').value.trim(),
        role:      document.getElementById('staff-role').value,
        level:     parseInt(document.getElementById('staff-level').value) || 1,
        startDate: document.getElementById('staff-start').value,
        active:    document.getElementById('staff-active').value === 'true',
      };
      if (editingId) obj.id = editingId;
      MQ.store.staff.save(obj);
      MQ.ui.modal.close('modal-edit-staff');
      renderList();
      updateAddButton();
      MQ.ui.toast(editingId ? 'Staff member updated' : 'Staff member added');
    });
  });

  window.StaffPage = { edit: edit, remove: remove, toggleActive: toggleActive, setLevel: setLevel, setRole: setRole, addFromAccount: addFromAccount };
})();
