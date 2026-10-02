/**
 * Saffron & Spice - Floor Steward & Waiter Controller
 * Manages dish service delivery, table alerts, and cash/card counter settlements.
 */

document.addEventListener('DOMContentLoaded', () => {
  renderWaiterHub();

  // Storage synchronization listener
  RestaurantApp.subscribeSync((e) => {
    renderWaiterHub();
  }, 1500);

  function renderWaiterHub() {
    const orders = RestaurantStorage.getOrders();
    const tables = RestaurantStorage.getTables();

    const readyOrders = orders.filter(o => o.status === 'READY');
    const counterPayments = orders.filter(o => o.paymentStatus === 'PENDING');

    // Badges update
    document.getElementById('waiterReadyCountBadge').textContent = `${readyOrders.length} Ready`;
    document.getElementById('tabReadyBadge').textContent = readyOrders.length;
    document.getElementById('tabCounterBadge').textContent = counterPayments.length;

    renderReadyOrders(readyOrders);
    renderCounterPayments(counterPayments);
    renderFloorTables(tables);
  }

  function renderReadyOrders(readyOrders) {
    const container = document.getElementById('waiterReadyList');
    const emptyState = document.getElementById('noReadyOrdersState');
    if (!container) return;

    if (readyOrders.length === 0) {
      container.innerHTML = '';
      emptyState.style.display = 'block';
      return;
    }
    emptyState.style.display = 'none';

    let html = '';
    readyOrders.forEach(o => {
      const itemsList = o.items.map(i => `<div class="fw-semibold text-dark small">• ${i.quantity}× ${i.name}</div>`).join('');
      html += `
        <div class="waiter-card ready-card">
          <div class="d-flex align-items-center justify-content-between pb-2 mb-2 border-bottom">
            <div>
              <span class="badge bg-dark rounded-pill px-3 py-1 fw-bold">${o.id}</span>
              <span class="fs-4 fw-bold font-serif text-dark ms-2">TABLE ${o.tableNumber}</span>
            </div>
            <span class="badge bg-success rounded-pill px-3 py-1">READY TO SERVE</span>
          </div>

          <div class="bg-light p-3 rounded-3 mb-3 border">
            <div class="small text-muted text-uppercase fw-bold mb-1" style="font-size: 11px;">Kitchen Plated Items:</div>
            ${itemsList}
            ${o.specialInstructions ? `
              <div class="small text-muted mt-2 pt-2 border-top fst-italic">
                <i class="bi bi-chat-left-text me-1"></i> "${o.specialInstructions}"
              </div>
            ` : ''}
          </div>

          <div class="d-flex align-items-center justify-content-between pt-2">
            <div>
              <div class="text-muted small">Total Due</div>
              <div class="fs-5 fw-bold text-dark">${RestaurantApp.formatCurrency(o.total)}</div>
            </div>

            <button class="btn btn-success rounded-pill px-4 py-3 fw-bold fs-6 shadow-sm" onclick="window.WaiterController.serveOrder('${o.id}')">
              <i class="bi bi-check2-circle me-1"></i> SERVE ORDER TO TABLE
            </button>
          </div>
        </div>
      `;
    });

    container.innerHTML = html;
  }

  function renderCounterPayments(counterPayments) {
    const container = document.getElementById('waiterCounterList');
    const emptyState = document.getElementById('noCounterPaymentsState');
    if (!container) return;

    if (counterPayments.length === 0) {
      container.innerHTML = '';
      emptyState.style.display = 'block';
      return;
    }
    emptyState.style.display = 'none';

    let html = '';
    counterPayments.forEach(o => {
      html += `
        <div class="waiter-card payment-card">
          <div class="d-flex align-items-center justify-content-between pb-2 mb-2 border-bottom">
            <div>
              <span class="badge bg-dark rounded-pill px-3 py-1">${o.id}</span>
              <span class="fs-4 fw-bold font-serif text-dark ms-2">TABLE ${o.tableNumber}</span>
            </div>
            <span class="badge bg-warning text-dark rounded-pill px-3 py-1">PAYMENT PENDING</span>
          </div>

          <p class="text-muted small mb-3">Customer requested counter settlement (Cash / Card / POS terminal).</p>

          <div class="d-flex align-items-center justify-content-between pt-2">
            <div>
              <div class="text-muted small">Payable Amount</div>
              <div class="display-6 fw-bold text-dark">${RestaurantApp.formatCurrency(o.total)}</div>
            </div>

            <button class="btn btn-primary-dark rounded-pill px-4 py-3 fw-bold fs-6 shadow-sm" onclick="window.WaiterController.collectPayment('${o.id}')">
              <i class="bi bi-cash-coin me-1"></i> COLLECT & MARK PAID
            </button>
          </div>
        </div>
      `;
    });

    container.innerHTML = html;
  }

  function renderFloorTables(tables) {
    const container = document.getElementById('waiterFloorGrid');
    if (!container) return;

    let html = '';
    tables.forEach(t => {
      const isOcc = t.status === 'occupied';
      html += `
        <div class="col-6 col-sm-4 col-md-3">
          <div class="p-3 bg-white rounded-4 border text-center ${isOcc ? 'border-danger' : ''}">
            <div class="small text-muted mb-1">TABLE</div>
            <div class="fs-4 fw-bold text-dark lh-1 mb-2">${t.number}</div>
            <span class="badge ${isOcc ? 'bg-danger' : 'bg-success'} rounded-pill" style="font-size: 11px;">
              ${t.status.toUpperCase()}
            </span>
            <div class="small text-muted mt-2">${t.capacity} Seats</div>
          </div>
        </div>
      `;
    });

    container.innerHTML = html;
  }

  // ==========================================
  // EXPORTED ACTIONS (WaiterController)
  // ==========================================
  window.WaiterController = {
    serveOrder: (orderId) => {
      const updated = RestaurantStorage.updateOrderStatus(orderId, 'SERVED');
      if (updated) {
        RestaurantApp.playSound('success');
        RestaurantApp.showToast(`Order #${orderId} served to Table ${updated.tableNumber}!`, 'success', 'bi-check2-all');
        renderWaiterHub();
      }
    },

    collectPayment: (orderId) => {
      const updated = RestaurantStorage.updateOrderPayment(orderId, 'COUNTER', 'PAID');
      if (updated) {
        RestaurantApp.playSound('ready');
        RestaurantApp.showToast(`Bill collected for Order #${orderId}. Marked PAID!`, 'success', 'bi-cash-coin');
        renderWaiterHub();
      }
    }
  };

});
