/**
 * Saffron & Spice - SaaS Admin Operations Controller
 * Handles live order processing, auto QR table provisioning, menu management, billing, and analytics.
 */

document.addEventListener('DOMContentLoaded', () => {
  let activeTab = 'dashboard';
  let orderStatusFilter = 'ALL';
  let bsAddTableModal = null;
  let bsFoodModal = null;
  let bsResetModal = null;

  initNavigation();
  initModals();
  refreshAllDashboardData();

  // Storage synchronization listener
  RestaurantApp.subscribeSync((e) => {
    refreshAllDashboardData();
  }, 1500);

  // ==========================================
  // NAVIGATION & MOBILE SIDEBAR DRAWER
  // ==========================================
  function initNavigation() {
    const sidebar = document.getElementById('adminSidebar');
    const backdrop = document.getElementById('sidebarBackdrop');
    const toggleBtn = document.getElementById('btnToggleSidebar');

    function openSidebar() {
      sidebar.classList.add('show');
      backdrop.classList.add('show');
    }

    function closeSidebar() {
      sidebar.classList.remove('show');
      backdrop.classList.remove('show');
    }

    if (toggleBtn) toggleBtn.addEventListener('click', openSidebar);
    if (backdrop) backdrop.addEventListener('click', closeSidebar);

    // Sidebar tab clicks
    document.querySelectorAll('.sidebar-link[data-target]').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const target = link.getAttribute('data-target');
        navigateToTab(target);
        if (window.innerWidth < 992) closeSidebar();
      });
    });

    // Order status filter buttons
    document.querySelectorAll('#orderStatusFilters button').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('#orderStatusFilters button').forEach(b => {
          b.classList.remove('btn-dark', 'active');
          b.classList.add('btn-outline-secondary');
        });
        btn.classList.add('btn-dark', 'active');
        btn.classList.remove('btn-outline-secondary');

        orderStatusFilter = btn.getAttribute('data-filter');
        renderOrders();
      });
    });

    // Settings form submit
    const settingsForm = document.getElementById('restaurantSettingsForm');
    if (settingsForm) {
      settingsForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const settings = RestaurantStorage.getSettings();
        settings.restaurantName = document.getElementById('settingRestName').value;
        settings.taxRate = parseFloat(document.getElementById('settingTaxRate').value) || 5.0;
        settings.gstin = document.getElementById('settingGSTIN').value;
        settings.address = document.getElementById('settingAddress').value;
        settings.phone = document.getElementById('settingPhone').value;
        RestaurantStorage.saveSettings(settings);
        RestaurantApp.showToast('Restaurant settings updated successfully!', 'success');
      });
    }

    // Populate current settings
    loadSettingsForm();
  }

  function navigateToTab(tabId) {
    activeTab = tabId;

    // Update sidebar link styles
    document.querySelectorAll('.sidebar-link[data-target]').forEach(link => {
      if (link.getAttribute('data-target') === tabId) {
        link.classList.add('active');
      } else {
        link.classList.remove('active');
      }
    });

    // Update desktop header title
    const titles = {
      dashboard: 'Operations Dashboard',
      orders: 'Live Order Dispatch & Management',
      tables: 'Dining Room Tables & Instant QR Standees',
      menu: 'Food Catalog & Inventory Control',
      categories: 'Menu Categories',
      invoices: 'Tax Invoices & Billing Archive',
      analytics: 'Sales Insights & Financial Performance',
      settings: 'Restaurant Configuration & Demo Utilities'
    };
    const headingEl = document.getElementById('desktopPageHeading');
    const mobileHeadingEl = document.getElementById('mobileHeaderTitle');
    if (headingEl) headingEl.textContent = titles[tabId] || 'Dashboard';
    if (mobileHeadingEl) mobileHeadingEl.textContent = titles[tabId] || 'Dashboard';

    // Show active section
    document.querySelectorAll('.admin-section').forEach(sec => sec.classList.remove('active'));
    const targetSection = document.getElementById(`section-${tabId}`);
    if (targetSection) {
      targetSection.classList.add('active');
      if (typeof gsap !== 'undefined') {
        gsap.fromTo(targetSection, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.25 });
      }
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // ==========================================
  // DATA REFRESH CONTROLLER
  // ==========================================
  function refreshAllDashboardData() {
    renderMetrics();
    renderDashboardTables();
    renderOrders();
    renderTablesManagement();
    renderMenuManagement();
    renderCategoriesManagement();
    renderInvoices();
    renderAnalytics();
  }

  // ==========================================
  // METRICS & DASHBOARD CARDS
  // ==========================================
  function renderMetrics() {
    const orders = RestaurantStorage.getOrders();
    const invoices = RestaurantStorage.getInvoices();

    let totalRevenue = 0;
    invoices.forEach(inv => {
      if (inv.paymentStatus === 'PAID') {
        totalRevenue += inv.total || 0;
      }
    });

    const newOrders = orders.filter(o => o.status === 'NEW');
    const inKitchen = orders.filter(o => o.status === 'PREPARING' || o.status === 'ACCEPTED');
    const readyOrders = orders.filter(o => o.status === 'READY');

    document.getElementById('metricTotalOrders').textContent = orders.length;
    document.getElementById('metricTotalRevenue').textContent = RestaurantApp.formatCurrency(totalRevenue);
    document.getElementById('metricInKitchen').textContent = inKitchen.length;
    document.getElementById('metricReadyOrders').textContent = readyOrders.length;

    // Sidebar & Banner badges for NEW orders
    const sidebarBadge = document.getElementById('sidebarNewOrdersBadge');
    const alertBanner = document.getElementById('dashboardNewOrdersAlert');
    const alertCountText = document.getElementById('newOrdersAlertCount');

    if (newOrders.length > 0) {
      if (sidebarBadge) {
        sidebarBadge.textContent = newOrders.length;
        sidebarBadge.style.display = 'inline-block';
      }
      if (alertBanner) {
        alertBanner.style.display = 'block';
        alertCountText.textContent = `${newOrders.length} New Customer ${newOrders.length === 1 ? 'Order' : 'Orders'} Awaiting Acceptance`;
      }
    } else {
      if (sidebarBadge) sidebarBadge.style.display = 'none';
      if (alertBanner) alertBanner.style.display = 'none';
    }

    // Table Assistance Requests (Water Refill / Steward Calls)
    const requests = typeof RestaurantStorage.getServiceRequests === 'function' 
      ? RestaurantStorage.getServiceRequests().filter(r => r.status === 'PENDING') 
      : [];
    const assistSidebarBadge = document.getElementById('sidebarAssistanceBadge');
    const assistAlert = document.getElementById('dashboardAssistanceAlert');
    const assistActions = document.getElementById('assistanceAlertActions');

    if (assistSidebarBadge) {
      if (requests.length > 0) {
        assistSidebarBadge.textContent = `${requests.length} Call${requests.length > 1 ? 's' : ''}`;
        assistSidebarBadge.style.display = 'inline-block';
      } else {
        assistSidebarBadge.style.display = 'none';
      }
    }

    if (assistAlert && assistActions) {
      if (requests.length > 0) {
        assistAlert.style.display = 'block';
        document.getElementById('assistanceAlertTitle').textContent = `${requests.length} Table Assistance Request${requests.length > 1 ? 's' : ''} Active`;
        document.getElementById('assistanceAlertDesc').textContent = 'Guests requested water refills or table service.';

        let actionsHtml = '';
        requests.forEach(req => {
          const isWater = req.type === 'WATER';
          actionsHtml += `
            <div class="d-flex align-items-center gap-2 bg-white px-3 py-2 rounded-pill shadow-sm border">
              <span class="badge ${isWater ? 'bg-primary' : 'bg-warning text-dark'} rounded-pill">
                ${isWater ? '💧 Water Refill' : '🛎️ Steward Call'}
              </span>
              <strong class="text-dark small">Table ${req.tableNumber}</strong>
              <small class="text-muted">(${RestaurantApp.formatTimeAgo(req.createdAt)})</small>
              <button class="btn btn-sm btn-success rounded-pill py-0 px-2 fw-bold" onclick="window.AdminController.resolveAssistance('${req.id}')" title="Mark fulfilled">
                <i class="bi bi-check2"></i> Done
              </button>
            </div>
          `;
        });
        assistActions.innerHTML = actionsHtml;
      } else {
        assistAlert.style.display = 'none';
        assistActions.innerHTML = '';
      }
    }

    // Recent orders stream on Dashboard
    const recentOrdersTable = document.getElementById('dashboardRecentOrdersTable');
    if (recentOrdersTable) {
      if (orders.length === 0) {
        recentOrdersTable.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-muted">No orders recorded yet.</td></tr>`;
      } else {
        let html = '';
        orders.slice(0, 6).forEach(o => {
          const itemsSummary = o.items.map(i => `${i.quantity}× ${i.name}`).join(', ');
          html += `
            <tr>
              <td><span class="badge bg-dark rounded-pill">${o.id}</span></td>
              <td><strong class="text-dark">Table ${o.tableNumber}</strong></td>
              <td class="text-truncate" style="max-width: 200px;">${itemsSummary}</td>
              <td><strong>${RestaurantApp.formatCurrency(o.total)}</strong></td>
              <td><span class="badge ${getStatusBadgeClass(o.status)} rounded-pill">${o.status}</span></td>
              <td><span class="badge ${o.paymentStatus === 'PAID' ? 'bg-success' : 'bg-warning text-dark'} rounded-pill">${o.paymentStatus}</span></td>
              <td>
                ${o.status === 'NEW' ? `
                  <button class="btn btn-dark btn-sm rounded-pill py-1 px-3 fw-bold" onclick="window.AdminController.acceptOrder('${o.id}')">Accept</button>
                ` : `
                  <a href="bill.html?orderId=${o.id}" class="btn btn-outline-custom btn-sm rounded-pill py-1 px-2">Bill</a>
                `}
              </td>
            </tr>
          `;
        });
        recentOrdersTable.innerHTML = html;
      }
    }
  }

  function getStatusBadgeClass(status) {
    switch (status) {
      case 'NEW': return 'bg-danger';
      case 'ACCEPTED': return 'bg-primary';
      case 'PREPARING': return 'bg-warning text-dark';
      case 'READY': return 'bg-info text-dark';
      case 'SERVED': return 'bg-success';
      case 'COMPLETED': return 'bg-secondary';
      default: return 'bg-dark';
    }
  }

  // ==========================================
  // DASHBOARD DINING ROOM TABLES
  // ==========================================
  function renderDashboardTables() {
    const container = document.getElementById('dashboardTablesGrid');
    if (!container) return;

    const tables = RestaurantStorage.getTables();
    let html = '';
    tables.forEach(t => {
      const isOcc = t.status === 'occupied';
      html += `
        <div class="col-6 col-sm-4 col-md-3 col-xl-2">
          <div class="p-3 bg-light rounded-3 border text-center ${isOcc ? 'border-danger bg-danger bg-opacity-10' : ''}" style="cursor: pointer;" onclick="RestaurantQR.showModal('${t.number}')">
            <div class="small text-muted mb-1">TABLE</div>
            <div class="fs-4 fw-bold text-dark lh-1 mb-2">${t.number}</div>
            <span class="badge ${isOcc ? 'bg-danger' : 'bg-success'} rounded-pill" style="font-size: 11px;">
              ${t.status.toUpperCase()}
            </span>
          </div>
        </div>
      `;
    });
    container.innerHTML = html;
  }

  // ==========================================
  // ORDERS MANAGEMENT (DESKTOP TABLE + MOBILE CARDS)
  // ==========================================
  function renderOrders() {
    const orders = RestaurantStorage.getOrders();
    const tableBody = document.getElementById('adminOrdersTableBody');
    const cardsContainer = document.getElementById('adminOrdersCardsContainer');
    const emptyState = document.getElementById('noOrdersFoundState');

    const filtered = orders.filter(o => {
      if (orderStatusFilter === 'ALL') return true;
      return o.status === orderStatusFilter;
    });

    if (filtered.length === 0) {
      if (tableBody) tableBody.innerHTML = '';
      if (cardsContainer) cardsContainer.innerHTML = '';
      if (emptyState) emptyState.style.display = 'block';
      return;
    }
    if (emptyState) emptyState.style.display = 'none';

    // 1. Desktop Table Rows
    let tableHtml = '';
    filtered.forEach(o => {
      const itemsList = o.items.map(i => `<div class="small">${i.quantity}× ${i.name}</div>`).join('');
      tableHtml += `
        <tr>
          <td class="ps-4">
            <strong class="text-dark">${o.id}</strong>
            <div class="text-muted" style="font-size: 11px;">${RestaurantApp.formatTimeAgo(o.createdAt)}</div>
          </td>
          <td>
            <span class="badge bg-dark rounded-pill px-3 py-1">Table ${o.tableNumber}</span>
          </td>
          <td>${itemsList}</td>
          <td><strong class="text-dark">${RestaurantApp.formatCurrency(o.total)}</strong></td>
          <td><small class="text-muted fst-italic">${o.specialInstructions || '—'}</small></td>
          <td><span class="badge ${getStatusBadgeClass(o.status)} rounded-pill">${o.status}</span></td>
          <td>
            <span class="badge ${o.paymentStatus === 'PAID' ? 'bg-success' : 'bg-warning text-dark'} rounded-pill">${o.paymentStatus}</span>
            ${o.paymentMethod ? `<div class="text-muted" style="font-size: 11px;">${o.paymentMethod}</div>` : ''}
          </td>
          <td class="text-end pe-4">
            <div class="d-inline-flex gap-1">
              ${o.status === 'NEW' ? `
                <button class="btn btn-dark btn-sm rounded-pill px-3 fw-bold" onclick="window.AdminController.acceptOrder('${o.id}')">
                  <i class="bi bi-check2"></i> Accept
                </button>
                <button class="btn btn-outline-danger btn-sm rounded-pill" onclick="window.AdminController.cancelOrder('${o.id}')">
                  Reject
                </button>
              ` : ''}
              
              ${o.paymentStatus === 'PENDING' ? `
                <button class="btn btn-success btn-sm rounded-pill px-2 fw-bold" onclick="window.AdminController.markCounterPaid('${o.id}')">
                  Mark Paid
                </button>
              ` : ''}

              <a href="bill.html?orderId=${o.id}" class="btn btn-outline-custom btn-sm rounded-pill" title="View Digital Receipt">
                <i class="bi bi-receipt"></i> Bill
              </a>
            </div>
          </td>
        </tr>
      `;
    });
    if (tableBody) tableBody.innerHTML = tableHtml;

    // 2. Mobile Orders Cards (Mandatory requirement from UI/UX Prompt)
    let cardsHtml = '';
    filtered.forEach(o => {
      const itemsList = o.items.map(i => `${i.quantity}× ${i.name}`).join(', ');
      cardsHtml += `
        <div class="card border-0 shadow-sm rounded-4 p-3 bg-white">
          <div class="d-flex align-items-center justify-content-between mb-2 pb-2 border-bottom">
            <div>
              <span class="badge bg-dark rounded-pill">${o.id}</span>
              <span class="fw-bold text-dark ms-2">TABLE ${o.tableNumber}</span>
            </div>
            <span class="badge ${getStatusBadgeClass(o.status)} rounded-pill">${o.status}</span>
          </div>

          <div class="small text-dark mb-2">
            <strong>Dishes:</strong> ${itemsList}
          </div>

          ${o.specialInstructions ? `
            <div class="small text-muted fst-italic mb-2">
              <i class="bi bi-chat-left-text me-1"></i> "${o.specialInstructions}"
            </div>
          ` : ''}

          <div class="d-flex align-items-center justify-content-between pt-2 border-top">
            <div>
              <div class="fs-6 fw-bold text-dark">${RestaurantApp.formatCurrency(o.total)}</div>
              <span class="badge ${o.paymentStatus === 'PAID' ? 'bg-success' : 'bg-warning text-dark'} rounded-pill" style="font-size: 10px;">${o.paymentStatus}</span>
            </div>

            <div class="d-flex gap-2">
              ${o.status === 'NEW' ? `
                <button class="btn btn-dark btn-sm rounded-pill px-3 fw-bold" onclick="window.AdminController.acceptOrder('${o.id}')">
                  Accept
                </button>
              ` : ''}

              ${o.paymentStatus === 'PENDING' ? `
                <button class="btn btn-success btn-sm rounded-pill px-2 fw-bold" onclick="window.AdminController.markCounterPaid('${o.id}')">
                  Mark Paid
                </button>
              ` : ''}

              <a href="bill.html?orderId=${o.id}" class="btn btn-outline-custom btn-sm rounded-pill">
                <i class="bi bi-receipt"></i> Bill
              </a>
            </div>
          </div>
        </div>
      `;
    });
    if (cardsContainer) cardsContainer.innerHTML = cardsHtml;
  }

  // ==========================================
  // TABLE MANAGEMENT & AUTO QR CREATION
  // ==========================================
  function renderTablesManagement() {
    const container = document.getElementById('adminTablesGrid');
    if (!container) return;

    const tables = RestaurantStorage.getTables();
    let html = '';

    tables.forEach(t => {
      const isOcc = t.status === 'occupied';
      const orderTag = t.activeOrderId ? `<span class="badge bg-danger rounded-pill px-2 py-1">Active: ${t.activeOrderId}</span>` : '';

      html += `
        <div class="col-12 col-sm-6 col-lg-4 col-xxl-3">
          <div class="restaurant-table-card ${t.status}">
            <div class="d-flex align-items-center justify-content-between mb-2">
              <h5 class="fw-bold font-serif m-0 text-dark">TABLE ${t.number}</h5>
              <span class="badge ${isOcc ? 'bg-danger' : 'bg-success'} rounded-pill">
                ${t.status.toUpperCase()}
              </span>
            </div>

            <div class="small text-muted mb-3 d-flex align-items-center justify-content-between">
              <span><i class="bi bi-people me-1"></i> ${t.capacity} Guests</span>
              ${orderTag}
            </div>

            <div class="d-flex gap-2 pt-2 border-top">
              <button class="btn btn-primary-dark btn-sm rounded-pill flex-fill" onclick="RestaurantQR.showModal('${t.number}')">
                <i class="bi bi-qr-code me-1"></i> View QR
              </button>
              <a href="customer.html?table=${t.number}" target="_blank" class="btn btn-outline-custom btn-sm rounded-pill" title="Open customer interface">
                <i class="bi bi-box-arrow-up-right"></i>
              </a>
              <button class="btn btn-outline-danger btn-sm rounded-pill" onclick="window.AdminController.deleteTable('${t.id}')" title="Delete table">
                <i class="bi bi-trash"></i>
              </button>
            </div>
          </div>
        </div>
      `;
    });

    container.innerHTML = html;
  }

  // ==========================================
  // MENU MANAGEMENT
  // ==========================================
  function renderMenuManagement() {
    const menuBody = document.getElementById('adminMenuTableBody');
    if (!menuBody) return;

    const menu = RestaurantStorage.getMenu();
    let html = '';

    menu.forEach(item => {
      html += `
        <tr>
          <td class="ps-4">
            <div class="d-flex align-items-center gap-3">
              <img src="${item.image}" alt="${item.name}" class="rounded-3" style="width: 48px; height: 48px; object-fit: cover;" onerror="this.src='https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80'">
              <div>
                <strong class="text-dark">${item.name}</strong>
                <div class="text-muted small text-truncate" style="max-width: 250px;">${item.description}</div>
              </div>
            </div>
          </td>
          <td><span class="badge bg-light text-dark border">${item.category}</span></td>
          <td><span class="diet-icon ${item.isVeg ? 'veg' : 'non-veg'}"></span></td>
          <td><strong>${RestaurantApp.formatCurrency(item.price)}</strong></td>
          <td>
            <div class="form-check form-switch">
              <input class="form-check-input" type="checkbox" id="stock-${item.id}" ${item.inStock ? 'checked' : ''} onchange="window.AdminController.toggleStock('${item.id}', this.checked)">
              <label class="form-check-label small ${item.inStock ? 'text-success' : 'text-danger'}" for="stock-${item.id}">
                ${item.inStock ? 'In Stock' : 'Out of Stock'}
              </label>
            </div>
          </td>
          <td class="text-end pe-4">
            <div class="d-inline-flex gap-1">
              <button class="btn btn-outline-dark btn-sm rounded-circle p-1" style="width: 32px; height: 32px;" onclick="window.AdminController.openEditFoodModal('${item.id}')" title="Edit Dish">
                <i class="bi bi-pencil"></i>
              </button>
              <button class="btn btn-outline-danger btn-sm rounded-circle p-1" style="width: 32px; height: 32px;" onclick="window.AdminController.deleteFoodItem('${item.id}')" title="Delete Dish">
                <i class="bi bi-trash"></i>
              </button>
            </div>
          </td>
        </tr>
      `;
    });

    menuBody.innerHTML = html;
  }

  // ==========================================
  // CATEGORIES MANAGEMENT
  // ==========================================
  function renderCategoriesManagement() {
    const container = document.getElementById('adminCategoriesGrid');
    if (!container) return;

    const cats = RestaurantStorage.getCategories();
    const menu = RestaurantStorage.getMenu();
    let html = '';

    cats.forEach(c => {
      const count = menu.filter(m => m.category === c.name).length;
      html += `
        <div class="col-6 col-md-4 col-xl-3">
          <div class="card border-0 shadow-sm rounded-4 p-3 bg-white">
            <div class="d-flex align-items-center justify-content-between mb-2">
              <div class="bg-light rounded-circle d-flex align-items-center justify-content-center text-dark" style="width: 42px; height: 42px;">
                <i class="bi ${c.icon || 'bi-tag'} fs-5"></i>
              </div>
              <span class="badge bg-secondary rounded-pill">${count} Dishes</span>
            </div>
            <h5 class="fw-bold text-dark m-0">${c.name}</h5>
          </div>
        </div>
      `;
    });

    container.innerHTML = html;
  }

  // ==========================================
  // INVOICES & BILLING
  // ==========================================
  function renderInvoices() {
    const invoicesBody = document.getElementById('adminInvoicesTableBody');
    if (!invoicesBody) return;

    const invoices = RestaurantStorage.getInvoices();
    if (invoices.length === 0) {
      invoicesBody.innerHTML = `<tr><td colspan="8" class="text-center py-4 text-muted">No invoices generated yet.</td></tr>`;
      return;
    }

    let html = '';
    invoices.forEach(inv => {
      html += `
        <tr>
          <td class="ps-4"><strong class="font-monospace text-dark">${inv.id}</strong></td>
          <td><span class="badge bg-dark rounded-pill">${inv.orderId}</span></td>
          <td>Table ${inv.tableNumber}</td>
          <td><strong class="text-dark">${RestaurantApp.formatCurrency(inv.total)}</strong></td>
          <td>${inv.paymentMethod || 'ONLINE'}</td>
          <td><span class="badge ${inv.paymentStatus === 'PAID' ? 'bg-success' : 'bg-warning text-dark'} rounded-pill">${inv.paymentStatus}</span></td>
          <td><small class="text-muted">${RestaurantApp.formatDate(inv.createdAt)}</small></td>
          <td class="text-end pe-4">
            <a href="bill.html?orderId=${inv.orderId}" class="btn btn-outline-custom btn-sm rounded-pill px-3">
              <i class="bi bi-receipt me-1"></i> View Receipt
            </a>
          </td>
        </tr>
      `;
    });

    invoicesBody.innerHTML = html;
  }

  // ==========================================
  // ANALYTICS & CHARTS
  // ==========================================
  function renderAnalytics() {
    const orders = RestaurantStorage.getOrders();
    const invoices = RestaurantStorage.getInvoices();
    const topListEl = document.getElementById('analyticsTopItemsList');
    if (!topListEl) return;

    // Count dish frequencies
    const itemMap = {};
    orders.forEach(o => {
      (o.items || []).forEach(i => {
        itemMap[i.name] = (itemMap[i.name] || 0) + i.quantity;
      });
    });

    const sortedItems = Object.entries(itemMap).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const maxQty = sortedItems.length > 0 ? sortedItems[0][1] : 1;

    let itemsHtml = '';
    sortedItems.forEach(([name, qty]) => {
      const pct = Math.round((qty / maxQty) * 100);
      itemsHtml += `
        <div>
          <div class="d-flex justify-content-between small fw-bold mb-1">
            <span>${name}</span>
            <span>${qty} orders</span>
          </div>
          <div class="progress" style="height: 8px;">
            <div class="progress-bar bg-warning" role="progressbar" style="width: ${pct}%"></div>
          </div>
        </div>
      `;
    });

    topListEl.innerHTML = itemsHtml || '<p class="text-muted small">No order items recorded yet.</p>';

    // Financial settlements
    let onlineRev = 0;
    let counterRev = 0;
    let pendingCounter = 0;

    invoices.forEach(inv => {
      if (inv.paymentStatus === 'PAID') {
        if (inv.paymentMethod === 'ONLINE') onlineRev += inv.total;
        else counterRev += inv.total;
      }
    });

    orders.forEach(o => {
      if (o.paymentStatus === 'PENDING') {
        pendingCounter += o.total;
      }
    });

    document.getElementById('analyticsOnlineRevenue').textContent = RestaurantApp.formatCurrency(onlineRev);
    document.getElementById('analyticsCounterRevenue').textContent = RestaurantApp.formatCurrency(counterRev);
    document.getElementById('analyticsPendingCounter').textContent = RestaurantApp.formatCurrency(pendingCounter);
  }

  // ==========================================
  // MODALS & ACTIONS CONTROLLER
  // ==========================================
  function initModals() {
    // Add Table Modal
    const addTableModalEl = document.getElementById('addTableModal');
    if (addTableModalEl) {
      bsAddTableModal = new bootstrap.Modal(addTableModalEl);

      document.getElementById('addTableForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const rawNum = document.getElementById('tableNumberInput').value.trim();
        const capacity = document.getElementById('tableCapacityInput').value;
        const status = document.getElementById('tableStatusInput').value;

        try {
          // 1. Create table in localStorage
          // 2. Generate unique ID
          // 3. Generate QR automatically
          // 4. Associate QR with that table
          const newTable = RestaurantStorage.addTable({
            number: rawNum,
            capacity: capacity,
            status: status
          });

          bsAddTableModal.hide();
          document.getElementById('addTableForm').reset();
          RestaurantApp.showToast(`Table ${newTable.number} created! QR automatically generated.`, 'success', 'bi-qr-code');

          // Refresh tables
          renderTablesManagement();
          renderDashboardTables();

          // 5. Show QR preview immediately in modal with download & print buttons
          setTimeout(() => {
            RestaurantQR.showModal(newTable.number);
          }, 350);

        } catch (err) {
          alert(err.message);
        }
      });
    }

    // Add / Edit Food Modal
    const foodModalEl = document.getElementById('foodItemModal');
    if (foodModalEl) {
      bsFoodModal = new bootstrap.Modal(foodModalEl);

      document.getElementById('foodItemForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const editId = document.getElementById('editFoodId').value;
        const name = document.getElementById('foodNameInput').value.trim();
        const category = document.getElementById('foodCategorySelect').value;
        const price = parseFloat(document.getElementById('foodPriceInput').value);
        const description = document.getElementById('foodDescInput').value.trim();
        const image = document.getElementById('foodImageInput').value.trim();
        const isVeg = document.getElementById('foodIsVegCheck').checked;
        const isBestseller = document.getElementById('foodIsBestsellerCheck').checked;

        if (editId) {
          RestaurantStorage.updateMenuItem(editId, {
            name, category, price, description, image, isVeg, isBestseller
          });
          RestaurantApp.showToast(`Updated dish "${name}" successfully!`, 'success');
        } else {
          RestaurantStorage.addMenuItem({
            name, category, price, description, image, isVeg, isBestseller, inStock: true
          });
          RestaurantApp.showToast(`Added "${name}" to food catalog!`, 'success');
        }

        bsFoodModal.hide();
        document.getElementById('foodItemForm').reset();
        document.getElementById('editFoodId').value = '';
        renderMenuManagement();
      });
    }

    // Reset Confirm Modal
    const resetModalEl = document.getElementById('resetConfirmModal');
    if (resetModalEl) {
      bsResetModal = new bootstrap.Modal(resetModalEl);

      document.getElementById('btnExecuteReset').addEventListener('click', () => {
        RestaurantStorage.resetDemoData();
        bsResetModal.hide();
        RestaurantApp.showToast('Demo data reset to factory state!', 'info', 'bi-arrow-counterclockwise');
        refreshAllDashboardData();
        loadSettingsForm();
      });
    }
  }

  function loadSettingsForm() {
    const s = RestaurantStorage.getSettings();
    document.getElementById('settingRestName').value = s.restaurantName || '';
    document.getElementById('settingTaxRate').value = s.taxRate || 5.0;
    document.getElementById('settingGSTIN').value = s.gstin || '';
    document.getElementById('settingAddress').value = s.address || '';
    document.getElementById('settingPhone').value = s.phone || '';
  }

  // ==========================================
  // EXPORTED WINDOW ACTIONS (AdminController)
  // ==========================================
  window.AdminController = {
    navigateToTab,
    
    openAddTableModal: () => {
      if (bsAddTableModal) bsAddTableModal.show();
    },

    openAddFoodModal: () => {
      document.getElementById('foodItemForm').reset();
      document.getElementById('editFoodId').value = '';
      document.getElementById('foodModalTitle').textContent = 'Add New Dish';
      // Populate category options
      const catSelect = document.getElementById('foodCategorySelect');
      const cats = RestaurantStorage.getCategories();
      catSelect.innerHTML = cats.map(c => `<option value="${c.name}">${c.name}</option>`).join('');
      if (bsFoodModal) bsFoodModal.show();
    },

    openEditFoodModal: (itemId) => {
      const item = RestaurantStorage.getMenuItem(itemId);
      if (!item) return;

      const catSelect = document.getElementById('foodCategorySelect');
      const cats = RestaurantStorage.getCategories();
      catSelect.innerHTML = cats.map(c => `<option value="${c.name}" ${c.name === item.category ? 'selected' : ''}>${c.name}</option>`).join('');

      document.getElementById('editFoodId').value = item.id;
      document.getElementById('foodModalTitle').textContent = `Edit Dish: ${item.name}`;
      document.getElementById('foodNameInput').value = item.name;
      document.getElementById('foodPriceInput').value = item.price;
      document.getElementById('foodDescInput').value = item.description || '';
      document.getElementById('foodImageInput').value = item.image || '';
      document.getElementById('foodIsVegCheck').checked = Boolean(item.isVeg);
      document.getElementById('foodIsBestsellerCheck').checked = Boolean(item.isBestseller);

      if (bsFoodModal) bsFoodModal.show();
    },

    resolveAssistance: (requestId) => {
      if (typeof RestaurantStorage.resolveServiceRequest === 'function') {
        const req = RestaurantStorage.resolveServiceRequest(requestId);
        if (req) {
          RestaurantApp.playSound('ready');
          RestaurantApp.showToast(`Table ${req.tableNumber} request marked resolved!`, 'success');
          refreshAllDashboardData();
        }
      }
    },

    confirmResetDemo: () => {
      if (bsResetModal) bsResetModal.show();
    },

    acceptOrder: (orderId) => {
      const updated = RestaurantStorage.updateOrderStatus(orderId, 'ACCEPTED');
      if (updated) {
        RestaurantApp.playSound('ready');
        RestaurantApp.showToast(`Order #${orderId} accepted! Kitchen notified.`, 'success', 'bi-check2-circle');
        refreshAllDashboardData();
      }
    },

    cancelOrder: (orderId) => {
      if (confirm(`Cancel and reject order ${orderId}?`)) {
        RestaurantStorage.updateOrderStatus(orderId, 'CANCELLED');
        RestaurantApp.showToast(`Order #${orderId} cancelled.`, 'warning');
        refreshAllDashboardData();
      }
    },

    markCounterPaid: (orderId) => {
      RestaurantStorage.updateOrderPayment(orderId, 'COUNTER', 'PAID');
      RestaurantApp.showToast(`Order #${orderId} counter payment collected and marked PAID!`, 'success', 'bi-check2-all');
      refreshAllDashboardData();
    },

    toggleStock: (itemId, inStock) => {
      RestaurantStorage.updateMenuItem(itemId, { inStock });
      RestaurantApp.showToast(`Dish stock updated to ${inStock ? 'In Stock' : 'Out of Stock'}.`, 'info');
      renderMenuManagement();
    },

    deleteFoodItem: (itemId) => {
      if (confirm('Delete this dish from the restaurant catalog?')) {
        RestaurantStorage.deleteMenuItem(itemId);
        RestaurantApp.showToast('Dish removed from catalog.', 'info');
        renderMenuManagement();
      }
    },

    deleteTable: (tableId) => {
      if (confirm(`Remove ${tableId} from restaurant?`)) {
        RestaurantStorage.deleteTable(tableId);
        RestaurantApp.showToast('Table deleted.', 'info');
        renderTablesManagement();
        renderDashboardTables();
      }
    },

    quickSimulateOrder: () => {
      const menu = RestaurantStorage.getMenu();
      const sampleItem1 = menu.find(m => m.id === 'item-chicken-biryani') || menu[0];
      const sampleItem2 = menu.find(m => m.id === 'item-butter-naan') || menu[1];

      const newOrder = RestaurantStorage.createOrder({
        tableNumber: "11",
        items: [
          { ...sampleItem1, quantity: 2 },
          { ...sampleItem2, quantity: 2 }
        ],
        specialInstructions: "Demo simulated order from Admin quick-tester"
      });

      RestaurantApp.playSound('new-order');
      RestaurantApp.showToast(`Simulated Order #${newOrder.id} for Table 11 created!`, 'success', 'bi-lightning-fill');
      refreshAllDashboardData();
    }
  };

});
