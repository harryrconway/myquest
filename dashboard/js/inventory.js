/* ============================================================
   MYQUEST — inventory.js
   ============================================================ */
(function () {
  'use strict';

  var editingId = null;

  function escHtml(str) {
    return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  function getStatus(item) {
    var qty = item.quantity || 0;
    var min = item.minStock || 0;
    if (qty === 0) return 'out';
    if (qty <= min) return 'low';
    return 'ok';
  }

  function sortItems(items) {
    return items.slice().sort(function (a, b) {
      var sa = getStatus(a);
      var sb = getStatus(b);
      var order = { out: 0, low: 1, ok: 2 };
      if (order[sa] !== order[sb]) return order[sa] - order[sb];
      return (a.name || '').localeCompare(b.name || '');
    });
  }

  function stockBarPct(item) {
    var qty = item.quantity || 0;
    var min = item.minStock || 1;
    return Math.min(100, Math.round((qty / min) * 100));
  }

  function stockBarColor(status) {
    if (status === 'out') return '#ef4444';
    if (status === 'low') return '#f59e0b';
    return '#22c55e';
  }

  function renderTable() {
    var tbody = document.getElementById('inventory-tbody');
    var items = sortItems(MQ.store.inventory.getAll());

    if (!items.length) {
      tbody.innerHTML = '<tr><td colspan="8">' + MQ.ui.emptyState('M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z', 'No items yet', 'Add your first inventory item') + '</td></tr>';
      return;
    }

    tbody.innerHTML = items.map(function (item) {
      var status = getStatus(item);
      var pct = stockBarPct(item);
      var color = stockBarColor(status);

      return '<tr>' +
        '<td><strong>' + escHtml(item.name) + '</strong></td>' +
        '<td>' + escHtml(item.category || '—') + '</td>' +
        '<td>' + (item.quantity || 0) + '</td>' +
        '<td>' + escHtml(item.unit || '—') + '</td>' +
        '<td>' + (item.minStock || 0) + '</td>' +
        '<td>' + MQ.ui.statusBadge(status) + '</td>' +
        '<td style="width:120px;">' +
          '<div style="background:#e5e7eb;border-radius:4px;height:8px;overflow:hidden;">' +
            '<div style="background:' + color + ';height:100%;width:' + pct + '%;transition:width 0.3s;"></div>' +
          '</div>' +
        '</td>' +
        '<td class="table-actions">' +
          '<button class="btn-sm btn-secondary" onclick="InventoryPage.updateStock(\'' + item.id + '\')" title="Update stock">📦 Update</button> ' +
          '<button class="btn-icon" onclick="InventoryPage.edit(\'' + item.id + '\')" title="Edit"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button> ' +
          '<button class="btn-icon btn-icon--danger" onclick="InventoryPage.remove(\'' + item.id + '\')" title="Delete"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/></svg></button>' +
        '</td>' +
        '</tr>';
    }).join('');
  }

  function openAddModal() {
    editingId = null;
    document.getElementById('item-modal-title').textContent = 'Add Item';
    document.getElementById('item-id').value = '';
    document.getElementById('item-form').reset();
    document.getElementById('item-qty').value = '0';
    document.getElementById('item-min').value = '5';
    MQ.ui.modal.open('modal-add-item');
  }

  function edit(id) {
    var item = MQ.store.inventory.getById(id);
    if (!item) return;
    editingId = id;
    document.getElementById('item-modal-title').textContent = 'Edit Item';
    document.getElementById('item-id').value = item.id;
    document.getElementById('item-name').value = item.name || '';
    document.getElementById('item-category').value = item.category || 'Chemicals';
    document.getElementById('item-unit').value = item.unit || '';
    document.getElementById('item-qty').value = item.quantity || 0;
    document.getElementById('item-min').value = item.minStock || 5;
    MQ.ui.modal.open('modal-add-item');
  }

  function updateStock(id) {
    var item = MQ.store.inventory.getById(id);
    if (!item) return;
    document.getElementById('stock-item-id').value = item.id;
    document.getElementById('stock-item-name').textContent = item.name;
    document.getElementById('stock-current').textContent = (item.quantity || 0) + ' ' + (item.unit || '');
    document.getElementById('stock-new-qty').value = item.quantity || 0;
    MQ.ui.modal.open('modal-update-stock');
  }

  function remove(id) {
    if (!MQ.hasRole('manager')) { MQ.ui.toast('Only managers and owners can delete', 'error'); return; }
    MQ.ui.confirmDelete('Delete this item?', function () {
      MQ.store.inventory.delete(id);
      renderTable();
      MQ.ui.toast('Item deleted', 'info');
    });
  }

  document.addEventListener('mq:ready', function () {
    MQ.store.seed();
    renderTable();

    document.getElementById('btn-add-item').addEventListener('click', openAddModal);

    document.getElementById('item-form').addEventListener('submit', function (e) {
      e.preventDefault();
      var name = document.getElementById('item-name').value.trim();
      if (!name) { MQ.ui.toast('Name is required', 'error'); return; }

      var obj = {
        name: name,
        category: document.getElementById('item-category').value,
        unit: document.getElementById('item-unit').value.trim(),
        quantity: parseInt(document.getElementById('item-qty').value) || 0,
        minStock: parseInt(document.getElementById('item-min').value) || 5,
      };
      if (editingId) obj.id = editingId;

      MQ.store.inventory.save(obj);
      MQ.ui.modal.close('modal-add-item');
      renderTable();
      MQ.ui.toast('Item saved');
    });

    // Update stock modal
    document.getElementById('stock-minus').addEventListener('click', function () {
      var input = document.getElementById('stock-new-qty');
      var val = parseInt(input.value) || 0;
      if (val > 0) input.value = val - 1;
    });

    document.getElementById('stock-plus').addEventListener('click', function () {
      var input = document.getElementById('stock-new-qty');
      var val = parseInt(input.value) || 0;
      input.value = val + 1;
    });

    document.getElementById('stock-save-btn').addEventListener('click', function () {
      var id = document.getElementById('stock-item-id').value;
      var qty = parseInt(document.getElementById('stock-new-qty').value) || 0;
      var item = MQ.store.inventory.getById(id);
      if (!item) return;
      item.quantity = qty;
      MQ.store.inventory.save(item);
      MQ.ui.modal.close('modal-update-stock');
      renderTable();
      MQ.ui.toast('Stock updated');
    });
  });

  window.InventoryPage = { edit: edit, remove: remove, updateStock: updateStock };
})();
