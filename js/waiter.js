/**
 * Saffron & Spice - Floor Steward & Waiter Controller
 * Manages dish service delivery, table alerts, and cash/card counter settlements.
 */

let prevAssistanceCount = -1;

document.addEventListener('DOMContentLoaded', () => {
  renderWaiterHub();

  // Storage synchronization listener
  RestaurantApp.subscribeSync((e) => {
    renderWaiterHub();
  }, 1500);

  function renderWaiterHub() {
    const orders = RestaurantStorage.getOrders();
    const tables = RestaurantStorage.getTables();
    const requests = typeof RestaurantStorage.getServiceRequests === 'function'
      ? RestaurantStorage.getServiceRequests().filter(r => r.status === 'PENDING')
      : [];

    const readyOrders = orders.filter(o => o.status === 'READY');
    const counterPayments = orders.filter(o => o.paymentStatus === 'PENDING');

    // Chime if new assistance request arrives
    if (prevAssistanceCount !== -1 && requests.length > prevAssistanceCount) {
      RestaurantApp.playSound('new-order');
      const latestReq = requests[0];
      const title = latestReq.type === 'WATER' ? `Table ${latestReq.tableNumber} requested Water Refill!` : `Table ${latestReq.tableNumber} called a Steward!`;
      RestaurantApp.showToast(title, 'info', 'bi-bell-fill');
    }
    prevAssistanceCount = requests.length;

    // Badges update
    document.getElementById('waiterReadyCountBadge').textContent = `${readyOrders.length} Ready`;
    document.getElementById('tabReadyBadge').textContent = readyOrders.length;
    document.getElementById('tabCounterBadge').textContent = counterPayments.length;

    const assistCountBadge = document.getElementById('waiterAssistanceCountBadge');
    const tabAssistanceBadge = document.getElementById('tabAssistanceBadge');
    const assistBanner = document.getElementById('waiterAssistanceBanner');

    if (assistCountBadge) {
      if (requests.length > 0) {
        assistCountBadge.textContent = `${requests.length} Call${requests.length > 1 ? 's' : ''}`;
        assistCountBadge.style.display = 'inline-block';
      } else {
        assistCountBadge.style.display = 'none';
      }
    }

    if (tabAssistanceBadge) {
      tabAssistanceBadge.textContent = requests.length;
    }

    if (assistBanner) {
      if (requests.length > 0) {
        assistBanner.style.setProperty('display', 'flex', 'important');
        const latest = requests[0];
        document.getElementById('waiterBannerTitle').textContent = latest.type === 'WATER' ? `Water Refill Alert: Table ${latest.tableNumber}` : `Steward Call: Table ${latest.tableNumber}`;
        document.getElementById('waiterBannerDesc').textContent = `${requests.length} active assistance call${requests.length > 1 ? 's' : ''} waiting on the floor.`;
      } else {
        assistBanner.style.setProperty('display', 'none', 'important');
      }
    }

    renderReadyOrders(readyOrders);
    renderAssistanceRequests(requests);
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

  function renderAssistanceRequests(requests) {
    const container = document.getElementById('waiterAssistanceList');
    const emptyState = document.getElementById('noAssistanceState');
    if (!container) return;

    if (requests.length === 0) {
      container.innerHTML = '';
      emptyState.style.display = 'block';
      return;
    }
    emptyState.style.display = 'none';

    let html = '';
    requests.forEach(req => {
      const isWater = req.type === 'WATER';
      html += `
        <div class="waiter-card" style="border-top: 6px solid ${isWater ? '#4F7CAC' : '#C58B45'};">
          <div class="d-flex align-items-center justify-content-between pb-2 mb-2 border-bottom">
            <div>
              <span class="badge ${isWater ? 'bg-primary' : 'bg-warning text-dark'} rounded-pill px-3 py-1 fw-bold">
                ${isWater ? '💧 WATER REFILL' : '🛎️ STEWARD CALL'}
              </span>
              <span class="fs-4 fw-bold font-serif text-dark ms-2">TABLE ${req.tableNumber}</span>
            </div>
            <span class="text-muted small">${RestaurantApp.formatTimeAgo(req.createdAt)}</span>
          </div>

          <p class="text-dark small mb-3"><strong>Guest Note:</strong> ${req.note}</p>

          <div class="d-flex justify-content-end">
            <button class="btn ${isWater ? 'btn-primary' : 'btn-dark'} rounded-pill px-4 py-2 fw-bold" onclick="window.WaiterController.resolveAssistance('${req.id}')">
              <i class="bi bi-check2-circle me-1"></i> ${isWater ? 'DELIVER WATER & COMPLETE' : 'ATTEND GUEST & COMPLETE'}
            </button>
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
    },

    resolveAssistance: (requestId) => {
      if (typeof RestaurantStorage.resolveServiceRequest === 'function') {
        const req = RestaurantStorage.resolveServiceRequest(requestId);
        if (req) {
          RestaurantApp.playSound('success');
          RestaurantApp.showToast(`Table ${req.tableNumber} request fulfilled!`, 'success', 'bi-check-circle-fill');
          renderWaiterHub();
        }
      }
    }
  };

});
