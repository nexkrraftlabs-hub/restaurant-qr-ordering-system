/**
 * Saffron & Spice - Kitchen Display System (KDS) Controller
 * Real-time order dispatching, cooking stage progression, elapsed timers, and sound chimes.
 */

document.addEventListener('DOMContentLoaded', () => {
  let prevNewCount = -1;

  initClock();
  renderKDS();

  // Storage sync listener
  RestaurantApp.subscribeSync((e) => {
    renderKDS();
  }, 1500);

  // Update elapsed timers every 10 seconds
  setInterval(renderKDS, 10000);

  function initClock() {
    function update() {
      const clockEl = document.getElementById('kdsClock');
      if (clockEl) {
        const now = new Date();
        clockEl.textContent = now.toLocaleTimeString('en-IN', { hour12: false });
      }
    }
    update();
    setInterval(update, 1000);
  }

  function renderKDS() {
    const orders = RestaurantStorage.getOrders();
    const colNewEl = document.getElementById('colNewCards');
    const colPrepEl = document.getElementById('colPrepCards');
    const colReadyEl = document.getElementById('colReadyCards');

    // Categorize
    const newOrders = orders.filter(o => o.status === 'NEW' || o.status === 'ACCEPTED');
    const prepOrders = orders.filter(o => o.status === 'PREPARING');
    const readyOrders = orders.filter(o => o.status === 'READY');

    // Check for incoming sound chime
    if (prevNewCount !== -1 && newOrders.length > prevNewCount) {
      RestaurantApp.playSound('new-order');
      RestaurantApp.showToast('Ding! New order received in kitchen!', 'warning', 'bi-bell-fill');
    }
    prevNewCount = newOrders.length;

    // Badges update
    document.getElementById('countNewCol').textContent = newOrders.length;
    document.getElementById('countPrepCol').textContent = prepOrders.length;
    document.getElementById('countReadyCol').textContent = readyOrders.length;
    document.getElementById('kdsActiveCountBadge').textContent = `${newOrders.length + prepOrders.length + readyOrders.length} Active Tickets`;

    // Render columns
    colNewEl.innerHTML = renderTicketList(newOrders, 'NEW');
    colPrepEl.innerHTML = renderTicketList(prepOrders, 'PREPARING');
    colReadyEl.innerHTML = renderTicketList(readyOrders, 'READY');
  }

  function renderTicketList(orderList, stage) {
    if (orderList.length === 0) {
      return `
        <div class="text-center py-5 text-secondary opacity-50">
          <i class="bi bi-cup-hot fs-1 mb-2"></i>
          <p class="small m-0">No tickets in this station.</p>
        </div>
      `;
    }

    let html = '';
    orderList.forEach(o => {
      const elapsedMins = Math.floor((Date.now() - new Date(o.createdAt).getTime()) / 60000);
      const isUrgent = elapsedMins >= 15;

      html += `
        <div class="kds-card ${stage === 'NEW' ? 'border-new' : stage === 'PREPARING' ? 'border-prep' : 'border-ready'}">
          
          <!-- Header -->
          <div class="d-flex align-items-center justify-content-between pb-2 mb-2 border-bottom border-secondary border-opacity-25">
            <div>
              <span class="badge bg-dark border border-secondary text-warning fw-bold fs-6">${o.id}</span>
              <span class="fw-bold text-white fs-5 ms-2">TABLE ${o.tableNumber}</span>
            </div>
            <div class="text-end">
              <span class="badge ${isUrgent ? 'bg-danger' : 'bg-secondary'} rounded-pill" style="font-size: 11px;">
                <i class="bi bi-clock me-1"></i>${elapsedMins}m ago
              </span>
            </div>
          </div>

          <!-- Items List -->
          <div class="mb-3">
            ${o.items.map(item => `
              <div class="d-flex justify-content-between align-items-center py-1 border-bottom border-dark">
                <div class="d-flex align-items-center gap-2">
                  <span class="badge bg-warning text-dark fw-bold rounded-pill px-2">${item.quantity}×</span>
                  <span class="fw-bold text-white fs-6">${item.name}</span>
                </div>
                ${item.instructions ? `<span class="badge bg-danger bg-opacity-25 text-danger border border-danger border-opacity-50 small">${item.instructions}</span>` : ''}
              </div>
            `).join('')}
          </div>

          <!-- Special Instruction Note -->
          ${o.specialInstructions ? `
            <div class="p-2 bg-black bg-opacity-40 rounded border border-warning border-opacity-50 text-warning small mb-3">
              <i class="bi bi-exclamation-circle-fill me-1"></i> <strong>Note:</strong> ${o.specialInstructions}
            </div>
          ` : ''}

          <!-- Action Buttons -->
          <div class="pt-2">
            ${stage === 'NEW' ? `
              <button class="btn kds-btn-start w-100 rounded-pill fs-6" onclick="window.KitchenController.startPreparing('${o.id}')">
                <i class="bi bi-play-circle-fill me-1"></i> START PREPARING
              </button>
            ` : stage === 'PREPARING' ? `
              <button class="btn kds-btn-ready w-100 rounded-pill fs-6" onclick="window.KitchenController.markReady('${o.id}')">
                <i class="bi bi-check-circle-fill me-1"></i> MARK READY TO SERVE
              </button>
            ` : `
              <div class="d-flex gap-2">
                <button class="btn btn-outline-success w-100 rounded-pill fs-6 fw-bold" onclick="window.KitchenController.markServed('${o.id}')">
                  <i class="bi bi-send-check-fill me-1"></i> SERVE ORDER
                </button>
              </div>
            `}
          </div>

        </div>
      `;
    });

    return html;
  }

  // ==========================================
  // EXPORTED ACTIONS (KitchenController)
  // ==========================================
  window.KitchenController = {
    startPreparing: (orderId) => {
      RestaurantStorage.updateOrderStatus(orderId, 'PREPARING');
      RestaurantApp.showToast(`Order #${orderId} moved to PREPARING line.`, 'info', 'bi-fire');
      renderKDS();
    },

    markReady: (orderId) => {
      RestaurantStorage.updateOrderStatus(orderId, 'READY');
      RestaurantApp.playSound('ready');
      RestaurantApp.showToast(`Order #${orderId} marked READY! Steward notified.`, 'success', 'bi-bell-fill');
      renderKDS();
    },

    markServed: (orderId) => {
      RestaurantStorage.updateOrderStatus(orderId, 'SERVED');
      RestaurantApp.showToast(`Order #${orderId} marked SERVED to table!`, 'success', 'bi-check2-all');
      renderKDS();
    }
  };

});
