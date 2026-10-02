/**
 * Saffron & Spice - Customer Mobile-First Controller
 * Handles table session, food filtering, interactive bottom sheet, cart, live order tracking, and demo payment.
 */

document.addEventListener('DOMContentLoaded', () => {
  // Current session state
  let currentTable = RestaurantApp.getTableFromUrl() || '07';
  let activeCategory = 'all';
  let searchQuery = '';
  let vegOnlyFilter = false;
  let activeTab = 'menu';
  let bsPaymentModal = null;

  // Initialize UI
  initTableSession();
  initNavigation();
  initCategoryBars();
  renderFoodMenu();
  renderCart();
  renderLiveOrderTracker();
  populateTableSwitcher();

  // Listen to cross-tab and local storage events
  RestaurantApp.subscribeSync((event) => {
    // Re-render live order status and cart if changed
    renderLiveOrderTracker();
    renderCart();
    updateActiveOrderNotice();
  }, 1500);

  // Check initial active order notice on menu screen
  updateActiveOrderNotice();

  // ==========================================
  // TABLE SESSION SETUP
  // ==========================================
  function initTableSession() {
    const tableData = RestaurantStorage.getTableByNumber(currentTable);
    const displayNum = String(currentTable).padStart(2, '0');

    // Update UI table indicators
    const headerTableBadge = document.getElementById('headerTableNumber');
    if (headerTableBadge) headerTableBadge.textContent = `TABLE ${displayNum}`;

    const heroTableStatusText = document.getElementById('heroTableStatusText');
    if (heroTableStatusText) heroTableStatusText.textContent = `Table ${displayNum} • Instant Table Service`;

    const desktopTableBadge = document.getElementById('desktopTableBadge');
    if (desktopTableBadge) desktopTableBadge.textContent = `Table ${displayNum}`;

    const sheetTableLabel = document.getElementById('sheetTableLabel');
    if (sheetTableLabel) sheetTableLabel.textContent = `Table ${displayNum}`;

    const trackingTableBadge = document.getElementById('trackingTableBadge');
    if (trackingTableBadge) trackingTableBadge.textContent = `TABLE ${displayNum}`;

    const infoTableTitle = document.getElementById('infoTableTitle');
    if (infoTableTitle) infoTableTitle.textContent = `Table ${displayNum}`;

    const infoTableStatus = document.getElementById('infoTableStatus');
    if (infoTableStatus && tableData) {
      infoTableStatus.textContent = tableData.status.toUpperCase();
      infoTableStatus.className = `fw-bold ${tableData.status === 'occupied' ? 'text-danger' : 'text-success'}`;
    }

    const infoTableCapacity = document.getElementById('infoTableCapacity');
    if (infoTableCapacity && tableData) {
      infoTableCapacity.textContent = `${tableData.capacity || 4} Guests`;
    }

    // Quick click on header table badge jumps to Info & Switcher view
    document.getElementById('tableHeaderBadge').onclick = () => switchView('info');
  }

  // ==========================================
  // VIEW NAVIGATION & TABS
  // ==========================================
  function initNavigation() {
    const navItems = document.querySelectorAll('.bottom-nav-item');
    navItems.forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        const targetView = item.getAttribute('data-nav');
        if (targetView === 'cart') {
          openCartSheet();
        } else {
          switchView(targetView);
        }
      });
    });

    // Header Cart click opens cart sheet
    document.getElementById('btnHeaderCart').addEventListener('click', openCartSheet);

    // Mobile Sticky Cart Bar click opens cart sheet
    document.getElementById('mobileStickyCartBar').addEventListener('click', openCartSheet);

    // Track active order button from hero notice
    document.getElementById('btnTrackActiveOrder').addEventListener('click', () => switchView('orders'));

    // Go back to menu button on empty orders screen
    document.getElementById('btnGoBackToMenu').addEventListener('click', () => switchView('menu'));

    // Close mobile cart sheet
    document.getElementById('btnCloseCartSheet').addEventListener('click', closeCartSheet);
    document.getElementById('cartSheetBackdrop').addEventListener('click', closeCartSheet);

    // Food detail sheet backdrop click
    document.getElementById('foodDetailBackdrop').addEventListener('click', closeFoodDetailSheet);

    // Search input handlers
    const searchInput = document.getElementById('menuSearchInput');
    const clearSearchBtn = document.getElementById('clearSearchBtn');

    searchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value.trim().toLowerCase();
      clearSearchBtn.style.display = searchQuery ? 'block' : 'none';
      renderFoodMenu();
    });

    clearSearchBtn.addEventListener('click', () => {
      searchInput.value = '';
      searchQuery = '';
      clearSearchBtn.style.display = 'none';
      renderFoodMenu();
      searchInput.focus();
    });

    document.getElementById('resetSearchFilterBtn').addEventListener('click', () => {
      searchInput.value = '';
      searchQuery = '';
      clearSearchBtn.style.display = 'none';
      activeCategory = 'all';
      vegOnlyFilter = false;
      document.getElementById('vegOnlySwitch').checked = false;
      document.getElementById('mobileVegOnlySwitch').checked = false;
      updateActiveCategoryPills();
      renderFoodMenu();
    });

    // Veg Switches
    const desktopVegSwitch = document.getElementById('vegOnlySwitch');
    const mobileVegSwitch = document.getElementById('mobileVegOnlySwitch');

    desktopVegSwitch.addEventListener('change', (e) => {
      vegOnlyFilter = e.target.checked;
      mobileVegSwitch.checked = vegOnlyFilter;
      renderFoodMenu();
    });

    mobileVegSwitch.addEventListener('change', (e) => {
      vegOnlyFilter = e.target.checked;
      desktopVegSwitch.checked = vegOnlyFilter;
      renderFoodMenu();
    });

    // Desktop Place Order button
    document.getElementById('btnDesktopPlaceOrder').addEventListener('click', () => {
      const instructions = document.getElementById('desktopSpecialInstructions').value;
      handlePlaceOrder(instructions);
    });

    // Mobile Place Order button
    document.getElementById('btnMobilePlaceOrder').addEventListener('click', () => {
      const instructions = document.getElementById('mobileSpecialInstructions').value;
      handlePlaceOrder(instructions);
    });

    // Steward & Water Call buttons
    document.getElementById('btnCallSteward').addEventListener('click', () => {
      RestaurantStorage.addServiceRequest({
        tableNumber: currentTable,
        type: 'STEWARD',
        note: `Table ${currentTable} requested a Floor Steward`
      });
      RestaurantApp.playSound('ready');
      RestaurantApp.showToast(`Floor Steward notified for Table ${currentTable}! Admin & Waiter alerted.`, 'info', 'bi-bell-fill');
    });

    document.getElementById('btnRequestWater').addEventListener('click', () => {
      RestaurantStorage.addServiceRequest({
        tableNumber: currentTable,
        type: 'WATER',
        note: `Table ${currentTable} requested water refill`
      });
      RestaurantApp.playSound('ready');
      RestaurantApp.showToast(`Water refill requested for Table ${currentTable}! Waiter & Admin alerted.`, 'info', 'bi-droplet-fill');
    });
  }

  function switchView(viewName) {
    activeTab = viewName;
    document.querySelectorAll('.view-section').forEach(sec => sec.classList.remove('active'));
    const targetSection = document.getElementById(`section-${viewName}`);
    if (targetSection) targetSection.classList.add('active');

    // Update bottom nav active state
    document.querySelectorAll('.bottom-nav-item').forEach(item => {
      if (item.getAttribute('data-nav') === viewName) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // GSAP entrance
    if (typeof gsap !== 'undefined' && targetSection) {
      gsap.fromTo(targetSection, { opacity: 0, y: 15 }, { opacity: 1, y: 0, duration: 0.3 });
    }
  }

  // ==========================================
  // CATEGORIES BAR & SIDEBAR
  // ==========================================
  function initCategoryBars() {
    const categories = RestaurantStorage.getCategories().filter(c => c.enabled);
    const mobileContainer = document.getElementById('mobileCategoryScroll');
    const desktopContainer = document.getElementById('desktopCategoryList');

    // All Pill
    let mobileHtml = `<button class="category-pill active" data-cat="all">All Dishes</button>`;
    let desktopHtml = `<button class="btn btn-sm text-start py-2 px-3 rounded-pill fw-bold border-0 bg-dark text-white mb-1 d-flex align-items-center gap-2 category-desktop-btn active" data-cat="all"><i class="bi bi-grid-fill"></i> All Dishes</button>`;

    categories.forEach(cat => {
      mobileHtml += `<button class="category-pill" data-cat="${cat.name}">${cat.name}</button>`;
      desktopHtml += `
        <button class="btn btn-sm text-start py-2 px-3 rounded-pill fw-semibold border-0 text-dark mb-1 d-flex align-items-center gap-2 category-desktop-btn" data-cat="${cat.name}" style="transition: all 0.2s;">
          <i class="bi ${cat.icon || 'bi-tag'} text-muted"></i> ${cat.name}
        </button>
      `;
    });

    mobileContainer.innerHTML = mobileHtml;
    desktopContainer.innerHTML = desktopHtml;

    // Attach click events
    mobileContainer.querySelectorAll('.category-pill').forEach(btn => {
      btn.addEventListener('click', () => {
        activeCategory = btn.getAttribute('data-cat');
        updateActiveCategoryPills();
        renderFoodMenu();
      });
    });

    desktopContainer.querySelectorAll('.category-desktop-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        activeCategory = btn.getAttribute('data-cat');
        updateActiveCategoryPills();
        renderFoodMenu();
      });
    });
  }

  function updateActiveCategoryPills() {
    document.querySelectorAll('.category-pill').forEach(btn => {
      if (btn.getAttribute('data-cat') === activeCategory) {
        btn.classList.add('active');
        btn.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      } else {
        btn.classList.remove('active');
      }
    });

    document.querySelectorAll('.category-desktop-btn').forEach(btn => {
      if (btn.getAttribute('data-cat') === activeCategory) {
        btn.classList.add('bg-dark', 'text-white', 'active');
        btn.classList.remove('text-dark');
      } else {
        btn.classList.remove('bg-dark', 'text-white', 'active');
        btn.classList.add('text-dark');
      }
    });
  }

  // ==========================================
  // FOOD MENU RENDERING
  // ==========================================
  function renderFoodMenu() {
    const allMenu = RestaurantStorage.getMenu();
    const cart = RestaurantStorage.getCart(currentTable);
    const grid = document.getElementById('foodGrid');
    const emptyState = document.getElementById('noItemsFoundState');
    const itemsCountLabel = document.getElementById('itemsCountLabel');

    // Filter by Category, Veg switch, and Search
    const filtered = allMenu.filter(item => {
      if (activeCategory !== 'all' && item.category !== activeCategory) return false;
      if (vegOnlyFilter && !item.isVeg) return false;
      if (searchQuery) {
        const text = `${item.name} ${item.description} ${item.category}`.toLowerCase();
        if (!text.includes(searchQuery)) return false;
      }
      return true;
    });

    if (itemsCountLabel) {
      itemsCountLabel.textContent = `Showing ${filtered.length} dishes`;
    }

    if (filtered.length === 0) {
      grid.innerHTML = '';
      emptyState.style.display = 'block';
      return;
    }
    emptyState.style.display = 'none';

    let html = '';
    filtered.forEach(item => {
      const cartItem = cart.find(c => c.id === item.id);
      const inCartQty = cartItem ? cartItem.quantity : 0;

      html += `
        <div class="col-12 col-sm-6 col-lg-6 col-xxl-4">
          <div class="food-card" data-item-id="${item.id}">
            
            <div class="food-image-wrapper" onclick="window.CustomerView.openFoodDetail('${item.id}')">
              <img src="${item.image}" alt="${item.name}" loading="lazy" onerror="this.src='https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80'">
              <div class="position-absolute top-0 start-0 m-2 d-flex gap-2">
                <span class="diet-icon ${item.isVeg ? 'veg' : 'non-veg'}" title="${item.isVeg ? 'Vegetarian' : 'Non-Vegetarian'}"></span>
                ${item.isBestseller ? '<span class="badge-bestseller"><i class="bi bi-star-fill text-warning"></i> Bestseller</span>' : ''}
              </div>
              <div class="position-absolute bottom-0 end-0 m-2 badge bg-dark bg-opacity-75 rounded-pill text-white small px-2 py-1">
                <i class="bi bi-clock me-1"></i>${item.prepTime || '15 mins'}
              </div>
            </div>

            <div class="food-card-body">
              <div class="cursor-pointer" onclick="window.CustomerView.openFoodDetail('${item.id}')">
                <div class="food-name">${item.name}</div>
                <div class="food-desc">${item.description}</div>
              </div>

              <div class="d-flex align-items-center justify-content-between mt-auto pt-2">
                <div class="food-price">${RestaurantApp.formatCurrency(item.price)}</div>

                <div class="food-action-container">
                  ${!item.inStock ? `
                    <span class="badge bg-secondary-subtle text-secondary rounded-pill px-3 py-2">Out of Stock</span>
                  ` : inCartQty > 0 ? `
                    <div class="qty-stepper">
                      <button class="qty-stepper-btn" onclick="window.CustomerView.updateQty('${item.id}', -1)" aria-label="Decrease quantity">−</button>
                      <span class="qty-stepper-val">${inCartQty}</span>
                      <button class="qty-stepper-btn" onclick="window.CustomerView.updateQty('${item.id}', 1)" aria-label="Increase quantity">+</button>
                    </div>
                  ` : `
                    <button class="btn btn-add-food d-flex align-items-center gap-1" onclick="window.CustomerView.addToCart('${item.id}')">
                      <i class="bi bi-plus-lg"></i>
                      <span>ADD</span>
                    </button>
                  `}
                </div>
              </div>
            </div>

          </div>
        </div>
      `;
    });

    grid.innerHTML = html;

    // Fast subtle reveal via GSAP
    if (typeof gsap !== 'undefined') {
      gsap.fromTo('.food-card', 
        { opacity: 0, y: 12 }, 
        { opacity: 1, y: 0, duration: 0.25, stagger: 0.03, ease: 'power1.out' }
      );
    }
  }

  // ==========================================
  // FOOD DETAIL BOTTOM SHEET
  // ==========================================
  window.CustomerView = window.CustomerView || {};

  window.CustomerView.openFoodDetail = function (itemId) {
    const item = RestaurantStorage.getMenuItem(itemId);
    if (!item) return;

    const cart = RestaurantStorage.getCart(currentTable);
    const existing = cart.find(c => c.id === itemId);
    const defaultQty = existing ? existing.quantity : 1;

    const sheetContent = document.getElementById('foodDetailContent');
    sheetContent.innerHTML = `
      <div class="position-relative rounded-4 overflow-hidden mb-3" style="height: 220px;">
        <img src="${item.image}" alt="${item.name}" style="width: 100%; height: 100%; object-fit: cover;">
        <div class="position-absolute top-0 start-0 m-3 d-flex gap-2">
          <span class="diet-icon ${item.isVeg ? 'veg' : 'non-veg'}"></span>
          ${item.isBestseller ? '<span class="badge-bestseller"><i class="bi bi-star-fill text-warning"></i> Bestseller</span>' : ''}
        </div>
      </div>

      <div class="d-flex align-items-center justify-content-between mb-2">
        <h4 class="font-serif fw-bold text-dark m-0">${item.name}</h4>
        <h4 class="fw-bold text-primary m-0">${RestaurantApp.formatCurrency(item.price)}</h4>
      </div>

      <p class="text-muted small mb-3">${item.description}</p>

      <div class="mb-3">
        <label class="form-label small fw-bold text-muted text-uppercase" style="letter-spacing: 0.5px;">Spice Preference</label>
        <div class="d-flex gap-2">
          <input type="radio" class="btn-check" name="spicePref" id="spiceMild" value="Mild" checked>
          <label class="btn btn-outline-secondary btn-sm rounded-pill flex-fill py-2" for="spiceMild">Mild 🌿</label>

          <input type="radio" class="btn-check" name="spicePref" id="spiceMedium" value="Medium">
          <label class="btn btn-outline-secondary btn-sm rounded-pill flex-fill py-2" for="spiceMedium">Medium 🌶️</label>

          <input type="radio" class="btn-check" name="spicePref" id="spiceHot" value="Extra Spicy">
          <label class="btn btn-outline-secondary btn-sm rounded-pill flex-fill py-2" for="spiceHot">Spicy 🔥</label>
        </div>
      </div>

      <div class="mb-3">
        <label for="detailItemNote" class="form-label small fw-bold text-muted text-uppercase" style="letter-spacing: 0.5px;">Customization Note</label>
        <input type="text" id="detailItemNote" class="form-control form-control-sm" placeholder="e.g. No onions, less oil, well done...">
      </div>

      <div class="d-flex align-items-center justify-content-between pt-2 border-top">
        <div class="qty-stepper">
          <button class="qty-stepper-btn" id="btnDetailMinus">−</button>
          <span class="qty-stepper-val" id="detailQtyVal">${defaultQty}</span>
          <button class="qty-stepper-btn" id="btnDetailPlus">+</button>
        </div>

        <button class="btn btn-primary-dark rounded-pill px-4 py-2 fw-bold" id="btnDetailAddToCart">
          Add • <span id="detailTotalVal">${RestaurantApp.formatCurrency(item.price * defaultQty)}</span>
        </button>
      </div>
    `;

    // Local sheet state
    let sheetQty = defaultQty;
    const qtyValEl = document.getElementById('detailQtyVal');
    const totalValEl = document.getElementById('detailTotalVal');

    document.getElementById('btnDetailMinus').onclick = () => {
      if (sheetQty > 1) {
        sheetQty--;
        qtyValEl.textContent = sheetQty;
        totalValEl.textContent = RestaurantApp.formatCurrency(item.price * sheetQty);
      }
    };

    document.getElementById('btnDetailPlus').onclick = () => {
      sheetQty++;
      qtyValEl.textContent = sheetQty;
      totalValEl.textContent = RestaurantApp.formatCurrency(item.price * sheetQty);
    };

    document.getElementById('btnDetailAddToCart').onclick = () => {
      const spice = document.querySelector('input[name="spicePref"]:checked')?.value || 'Regular';
      const customNote = document.getElementById('detailItemNote').value.trim();
      const combinedInstructions = [spice !== 'Regular' ? `${spice} spice` : '', customNote].filter(Boolean).join(', ');

      window.CustomerView.setItemInCart(item.id, sheetQty, combinedInstructions);
      closeFoodDetailSheet();
    };

    // Open sheet
    document.getElementById('foodDetailBackdrop').classList.add('active');
    document.getElementById('foodDetailSheet').classList.add('active');
  };

  function closeFoodDetailSheet() {
    document.getElementById('foodDetailBackdrop').classList.remove('active');
    document.getElementById('foodDetailSheet').classList.remove('active');
  }

  // ==========================================
  // CART OPERATIONS & SYNC
  // ==========================================
  window.CustomerView.addToCart = function (itemId) {
    window.CustomerView.setItemInCart(itemId, 1);
  };

  window.CustomerView.updateQty = function (itemId, delta) {
    const cart = RestaurantStorage.getCart(currentTable);
    const existing = cart.find(c => c.id === itemId);
    if (!existing) return;

    const newQty = existing.quantity + delta;
    if (newQty <= 0) {
      window.CustomerView.removeFromCart(itemId);
    } else {
      window.CustomerView.setItemInCart(itemId, newQty, existing.instructions);
    }
  };

  window.CustomerView.setItemInCart = function (itemId, quantity, instructions = '') {
    const item = RestaurantStorage.getMenuItem(itemId);
    if (!item) return;

    let cart = RestaurantStorage.getCart(currentTable);
    const existingIndex = cart.findIndex(c => c.id === itemId);

    if (existingIndex !== -1) {
      cart[existingIndex].quantity = quantity;
      if (instructions) cart[existingIndex].instructions = instructions;
    } else {
      cart.push({
        id: item.id,
        name: item.name,
        price: item.price,
        quantity: quantity,
        instructions: instructions,
        isVeg: item.isVeg,
        image: item.image
      });
    }

    RestaurantStorage.saveCart(currentTable, cart);
    RestaurantApp.playSound('add-to-cart');
    RestaurantApp.showToast(`Added ${quantity}× ${item.name} to order`, 'success', 'bi-bag-check');
    renderFoodMenu();
    renderCart();
  };

  window.CustomerView.removeFromCart = function (itemId) {
    let cart = RestaurantStorage.getCart(currentTable);
    cart = cart.filter(c => c.id !== itemId);
    RestaurantStorage.saveCart(currentTable, cart);
    renderFoodMenu();
    renderCart();
  };

  function openCartSheet() {
    renderCart();
    document.getElementById('cartSheetBackdrop').classList.add('active');
    document.getElementById('cartSheet').classList.add('active');
  }

  function closeCartSheet() {
    document.getElementById('cartSheetBackdrop').classList.remove('active');
    document.getElementById('cartSheet').classList.remove('active');
  }

  function renderCart() {
    const cart = RestaurantStorage.getCart(currentTable);
    const settings = RestaurantStorage.getSettings();
    const taxRate = settings.taxRate || 5.0;

    let totalCount = 0;
    let subtotal = 0;

    cart.forEach(item => {
      totalCount += item.quantity;
      subtotal += item.price * item.quantity;
    });

    const tax = Math.round((subtotal * (taxRate / 100)) * 100) / 100;
    const grandTotal = Math.round((subtotal + tax) * 100) / 100;

    // Badges update
    const headerCartBadge = document.getElementById('headerCartBadge');
    const bottomNavCartBadge = document.getElementById('bottomNavCartBadge');
    const stickyCartBar = document.getElementById('mobileStickyCartBar');

    if (totalCount > 0) {
      headerCartBadge.textContent = totalCount;
      headerCartBadge.style.display = 'inline-block';
      headerCartBadge.classList.add('badge-pop');

      bottomNavCartBadge.textContent = totalCount;
      bottomNavCartBadge.style.display = 'inline-block';

      stickyCartBar.classList.add('visible');
      document.getElementById('stickyCartCount').textContent = `${totalCount} ${totalCount === 1 ? 'item' : 'items'}`;
      document.getElementById('stickyCartTotal').textContent = RestaurantApp.formatCurrency(grandTotal);
    } else {
      headerCartBadge.style.display = 'none';
      bottomNavCartBadge.style.display = 'none';
      stickyCartBar.classList.remove('visible');
    }

    // Render Desktop Cart Sidebar
    renderCartListDOM(
      cart,
      document.getElementById('desktopCartItemsList'),
      document.getElementById('desktopEmptyCartMessage'),
      document.getElementById('desktopCartSummaryBox'),
      document.getElementById('desktopSubtotalVal'),
      document.getElementById('desktopTaxVal'),
      document.getElementById('desktopTotalVal'),
      subtotal, tax, grandTotal
    );

    // Render Mobile Sheet Cart
    renderCartListDOM(
      cart,
      document.getElementById('mobileCartItemsList'),
      document.getElementById('mobileCartEmptyMsg'),
      document.getElementById('mobileCartSummarySection'),
      document.getElementById('mobileSubtotalVal'),
      document.getElementById('mobileTaxVal'),
      document.getElementById('mobileTotalVal'),
      subtotal, tax, grandTotal
    );
  }

  function renderCartListDOM(cart, listEl, emptyEl, summaryEl, subtotalEl, taxEl, totalEl, subtotal, tax, grandTotal) {
    if (!listEl) return;

    if (cart.length === 0) {
      listEl.innerHTML = '';
      if (emptyEl) emptyEl.style.display = 'block';
      if (summaryEl) summaryEl.style.display = 'none';
      return;
    }

    if (emptyEl) emptyEl.style.display = 'none';
    if (summaryEl) summaryEl.style.display = 'block';

    let html = '';
    cart.forEach(item => {
      html += `
        <div class="d-flex align-items-center justify-content-between py-2 border-bottom">
          <div style="flex: 1; padding-right: 10px;">
            <div class="d-flex align-items-center gap-1">
              <span class="diet-icon ${item.isVeg ? 'veg' : 'non-veg'}" style="width: 14px; height: 14px;"></span>
              <span class="fw-bold small text-dark">${item.name}</span>
            </div>
            ${item.instructions ? `<div class="text-muted" style="font-size: 11px;">Note: ${item.instructions}</div>` : ''}
            <div class="text-muted small">${RestaurantApp.formatCurrency(item.price)} × ${item.quantity} = <strong class="text-dark">${RestaurantApp.formatCurrency(item.price * item.quantity)}</strong></div>
          </div>

          <div class="d-flex align-items-center gap-2">
            <div class="qty-stepper" style="min-height: 32px; padding: 2px 4px;">
              <button class="qty-stepper-btn" style="width: 24px; height: 24px; font-size: 14px;" onclick="window.CustomerView.updateQty('${item.id}', -1)">−</button>
              <span class="qty-stepper-val" style="font-size: 13px; min-width: 16px;">${item.quantity}</span>
              <button class="qty-stepper-btn" style="width: 24px; height: 24px; font-size: 14px;" onclick="window.CustomerView.updateQty('${item.id}', 1)">+</button>
            </div>
          </div>
        </div>
      `;
    });

    listEl.innerHTML = html;
    if (subtotalEl) subtotalEl.textContent = RestaurantApp.formatCurrency(subtotal);
    if (taxEl) taxEl.textContent = RestaurantApp.formatCurrency(tax);
    if (totalEl) totalEl.textContent = RestaurantApp.formatCurrency(grandTotal);
  }

  // ==========================================
  // PLACE ORDER HANDLER
  // ==========================================
  function handlePlaceOrder(instructions = '') {
    const cart = RestaurantStorage.getCart(currentTable);
    if (cart.length === 0) {
      RestaurantApp.showToast('Please add items to your cart before placing order.', 'warning');
      return;
    }

    try {
      const newOrder = RestaurantStorage.createOrder({
        tableNumber: currentTable,
        items: cart,
        specialInstructions: instructions
      });

      closeCartSheet();
      RestaurantApp.playSound('new-order');
      RestaurantApp.showToast(`Order #${newOrder.id} placed! Kitchen will start cooking shortly.`, 'success', 'bi-check-circle-fill');

      // Switch to order tracking view
      switchView('orders');
      renderFoodMenu();
      renderCart();
      renderLiveOrderTracker();
      updateActiveOrderNotice();
    } catch (e) {
      console.error("Order placement failed:", e);
      RestaurantApp.showToast('Unable to place order. Please try again.', 'warning');
    }
  }

  // ==========================================
  // LIVE ORDER TRACKER & STATUS PROGRESSION
  // ==========================================
  function updateActiveOrderNotice() {
    const activeOrder = RestaurantStorage.getActiveOrderByTable(currentTable);
    const notice = document.getElementById('activeOrderNotice');
    const bottomNavDot = document.getElementById('bottomNavOrderDot');

    if (activeOrder) {
      if (notice) {
        notice.style.setProperty('display', 'flex', 'important');
        document.getElementById('noticeOrderTitle').textContent = `Order #${activeOrder.id} is active`;
        document.getElementById('noticeOrderStatus').textContent = `Current status: ${activeOrder.status}`;
      }
      if (bottomNavDot) bottomNavDot.style.display = 'inline-block';
    } else {
      if (notice) notice.style.setProperty('display', 'none', 'important');
      if (bottomNavDot) bottomNavDot.style.display = 'none';
    }
  }

  function renderLiveOrderTracker() {
    const container = document.getElementById('liveOrderContainer');
    const noOrderEl = document.getElementById('noActiveOrderState');
    const pastContainer = document.getElementById('pastOrdersContainer');
    const pastList = document.getElementById('pastOrdersList');
    if (!container) return;

    const allTableOrders = RestaurantStorage.getOrdersByTable(currentTable);
    const activeOrder = RestaurantStorage.getActiveOrderByTable(currentTable);

    if (!activeOrder) {
      container.innerHTML = '';
      noOrderEl.style.display = 'block';
    } else {
      noOrderEl.style.display = 'none';
      container.innerHTML = generateOrderTrackerCardHTML(activeOrder);
    }

    // Past completed orders
    const completedOrders = allTableOrders.filter(o => o.status === 'COMPLETED' || o.status === 'CANCELLED');
    if (completedOrders.length > 0) {
      pastContainer.style.display = 'block';
      let pastHtml = '';
      completedOrders.slice(0, 5).forEach(o => {
        pastHtml += `
          <div class="d-flex align-items-center justify-content-between p-3 bg-white rounded-3 border">
            <div>
              <div class="fw-bold small text-dark">${o.id} • ${RestaurantApp.formatCurrency(o.total)}</div>
              <div class="text-muted" style="font-size: 11px;">${RestaurantApp.formatDate(o.createdAt)} • <span class="badge bg-success-subtle text-success">${o.paymentStatus}</span></div>
            </div>
            <a href="bill.html?orderId=${o.id}" class="btn btn-outline-custom btn-sm rounded-pill py-1 px-3">
              <i class="bi bi-receipt me-1"></i> Bill
            </a>
          </div>
        `;
      });
      pastList.innerHTML = pastHtml;
    } else {
      pastContainer.style.display = 'none';
    }
  }

  function generateOrderTrackerCardHTML(order) {
    const statusMap = {
      'NEW': { step: 1, title: 'Order Received', desc: 'Sent to restaurant terminal' },
      'ACCEPTED': { step: 2, title: 'Order Accepted', desc: 'Approved by restaurant manager' },
      'PREPARING': { step: 3, title: 'In Kitchen Cooking', desc: 'Chef is preparing your delicacies' },
      'READY': { step: 4, title: 'Ready to Serve', desc: 'Plated and ready for steward pickup' },
      'SERVED': { step: 5, title: 'Served to Table', desc: 'Enjoy your hot meal!' },
      'COMPLETED': { step: 6, title: 'Completed & Paid', desc: 'Dining session concluded' }
    };

    const currentStep = (statusMap[order.status] || { step: 1 }).step;
    const isServed = order.status === 'SERVED' || order.status === 'COMPLETED';
    const isPaid = order.paymentStatus === 'PAID';

    return `
      <div class="order-tracker-card mb-3">
        
        <!-- Header Info -->
        <div class="d-flex align-items-center justify-content-between pb-3 border-bottom mb-3">
          <div>
            <span class="badge bg-dark rounded-pill px-3 py-1 mb-1 fw-bold">${order.id}</span>
            <div class="text-muted small">Placed ${RestaurantApp.formatTimeAgo(order.createdAt)}</div>
          </div>
          <div class="text-end">
            <div class="fw-bold fs-5 text-dark">${RestaurantApp.formatCurrency(order.total)}</div>
            <span class="badge ${isPaid ? 'bg-success' : 'bg-warning text-dark'} rounded-pill px-2 py-1" style="font-size: 11px;">
              ${order.paymentStatus || 'UNPAID'}
            </span>
          </div>
        </div>

        <!-- Timeline Steps -->
        <div class="mb-4">
          
          <div class="timeline-step ${currentStep > 1 ? 'completed' : currentStep === 1 ? 'current pulse-indicator' : ''}">
            <div class="timeline-icon"><i class="bi ${currentStep > 1 ? 'bi-check-lg' : 'bi-receipt'}"></i></div>
            <div>
              <div class="fw-bold text-dark small">1. Order Received</div>
              <div class="text-muted" style="font-size: 12px;">Kitchen queue ticket generated</div>
            </div>
          </div>

          <div class="timeline-step ${currentStep > 2 ? 'completed' : currentStep === 2 ? 'current pulse-indicator' : ''}">
            <div class="timeline-icon"><i class="bi ${currentStep > 2 ? 'bi-check-lg' : 'bi-check2-circle'}"></i></div>
            <div>
              <div class="fw-bold text-dark small">2. Accepted by Restaurant</div>
              <div class="text-muted" style="font-size: 12px;">Sent directly to head chef</div>
            </div>
          </div>

          <div class="timeline-step ${currentStep > 3 ? 'completed' : currentStep === 3 ? 'current pulse-indicator' : ''}">
            <div class="timeline-icon"><i class="bi ${currentStep > 3 ? 'bi-check-lg' : 'bi-fire'}"></i></div>
            <div>
              <div class="fw-bold text-dark small">3. Preparing in Kitchen</div>
              <div class="text-muted" style="font-size: 12px;">Fresh ingredients cooked to order</div>
            </div>
          </div>

          <div class="timeline-step ${currentStep > 4 ? 'completed' : currentStep === 4 ? 'current pulse-indicator' : ''}">
            <div class="timeline-icon"><i class="bi ${currentStep > 4 ? 'bi-check-lg' : 'bi-bell'}"></i></div>
            <div>
              <div class="fw-bold text-dark small">4. Ready for Service</div>
              <div class="text-muted" style="font-size: 12px;">Steward is picking up your tray</div>
            </div>
          </div>

          <div class="timeline-step ${currentStep >= 5 ? 'completed' : ''}">
            <div class="timeline-icon"><i class="bi ${currentStep >= 5 ? 'bi-check2-all' : 'bi-cup-hot'}"></i></div>
            <div>
              <div class="fw-bold text-dark small">5. Food Served to Table</div>
              <div class="text-muted" style="font-size: 12px;">Delivered hot to Table ${order.tableNumber}</div>
            </div>
          </div>

        </div>

        <!-- Ordered Items Summary -->
        <div class="bg-light p-3 rounded-3 mb-3 border">
          <div class="fw-bold small text-muted text-uppercase mb-2" style="letter-spacing: 0.5px;">Ordered Dishes</div>
          ${order.items.map(i => `
            <div class="d-flex justify-content-between small py-1">
              <span>${i.quantity}× ${i.name}</span>
              <span class="text-muted">${RestaurantApp.formatCurrency(i.price * i.quantity)}</span>
            </div>
          `).join('')}
          ${order.specialInstructions ? `
            <div class="small text-muted mt-2 pt-2 border-top fst-italic">
              <i class="bi bi-chat-left-text me-1"></i> "${order.specialInstructions}"
            </div>
          ` : ''}
        </div>

        <!-- BILLING & PAYMENT BLOCK -->
        ${isServed && !isPaid ? `
          <div class="p-3 bg-white rounded-3 border-2 border-warning border mb-2 shadow-sm">
            <div class="d-flex align-items-center gap-2 mb-2">
              <i class="bi bi-receipt text-warning fs-4"></i>
              <div>
                <div class="fw-bold text-dark">Your Meal is Served • Bill Ready</div>
                <div class="text-muted small">Total amount due: <strong>${RestaurantApp.formatCurrency(order.total)}</strong></div>
              </div>
            </div>

            <div class="row g-2 mt-2">
              <div class="col-6">
                <button class="btn btn-primary-dark w-100 rounded-pill py-2 btn-sm fw-bold" onclick="window.CustomerView.openDemoPayment('${order.id}')">
                  <i class="bi bi-credit-card me-1"></i> Pay Online
                </button>
              </div>
              <div class="col-6">
                <button class="btn btn-outline-custom w-100 rounded-pill py-2 btn-sm fw-bold" onclick="window.CustomerView.payAtCounter('${order.id}')">
                  <i class="bi bi-cash-stack me-1"></i> Pay at Counter
                </button>
              </div>
            </div>
          </div>
        ` : isPaid ? `
          <div class="p-3 bg-success-subtle text-success rounded-3 border border-success d-flex align-items-center justify-content-between">
            <div class="d-flex align-items-center gap-2">
              <i class="bi bi-check-circle-fill fs-4"></i>
              <div>
                <div class="fw-bold">Payment Completed (${order.paymentMethod || 'ONLINE'})</div>
                <div class="small text-success-emphasis">Invoice issued • Table ready</div>
              </div>
            </div>
            <a href="bill.html?orderId=${order.id}" class="btn btn-success btn-sm rounded-pill px-3 fw-bold">
              View Bill
            </a>
          </div>
        ` : `
          <div class="text-center text-muted small py-2">
            <i class="bi bi-hourglass-split me-1"></i> Bill payment unlocks once food is served to your table.
          </div>
        `}

      </div>
    `;
  }

  // ==========================================
  // PAYMENT ACTIONS
  // ==========================================
  window.CustomerView.openDemoPayment = function (orderId) {
    const order = RestaurantStorage.getOrderById(orderId);
    if (!order) return;

    document.getElementById('modalPaymentAmount').textContent = RestaurantApp.formatCurrency(order.total);
    document.getElementById('modalPaymentOrderBadge').textContent = order.id;

    // Reset payment modal steps
    document.getElementById('paymentSelectionStep').style.display = 'block';
    document.getElementById('paymentProcessingStep').style.display = 'none';
    document.getElementById('paymentSuccessStep').style.display = 'none';

    // Set digital invoice target
    document.getElementById('btnViewDigitalInvoice').href = `bill.html?orderId=${order.id}`;

    // Confirm button event
    document.getElementById('btnConfirmPayOnline').onclick = () => {
      // Step 1 to Step 2: Processing spinner
      document.getElementById('paymentSelectionStep').style.display = 'none';
      document.getElementById('paymentProcessingStep').style.display = 'block';

      setTimeout(() => {
        // Step 2 to Step 3: Success
        document.getElementById('paymentProcessingStep').style.display = 'none';
        document.getElementById('paymentSuccessStep').style.display = 'block';

        // Update database
        RestaurantStorage.updateOrderPayment(order.id, 'ONLINE', 'PAID');
        RestaurantApp.playSound('ready');
        RestaurantApp.showToast(`Payment of ${RestaurantApp.formatCurrency(order.total)} successful!`, 'success');

        renderLiveOrderTracker();
        updateActiveOrderNotice();
      }, 1200);
    };

    if (!bsPaymentModal) {
      bsPaymentModal = new bootstrap.Modal(document.getElementById('paymentModal'));
    }
    bsPaymentModal.show();
  };

  window.CustomerView.payAtCounter = function (orderId) {
    RestaurantStorage.updateOrderPayment(orderId, 'COUNTER', 'PENDING');
    RestaurantApp.showToast('Selected "Pay at Counter". Floor Steward / Cashier notified!', 'info', 'bi-cash-coin');
    renderLiveOrderTracker();
  };

  // ==========================================
  // TABLE SWITCHER
  // ==========================================
  function populateTableSwitcher() {
    const select = document.getElementById('switchTableSelect');
    if (!select) return;

    const tables = RestaurantStorage.getTables();
    let html = '';
    tables.forEach(t => {
      const isSelected = String(t.number).padStart(2, '0') === String(currentTable).padStart(2, '0');
      html += `<option value="${t.number}" ${isSelected ? 'selected' : ''}>Table ${t.number} (${t.capacity} Seats - ${t.status})</option>`;
    });
    select.innerHTML = html;

    document.getElementById('btnConfirmSwitchTable').onclick = () => {
      const chosen = select.value;
      if (chosen) {
        window.location.href = `customer.html?table=${chosen}`;
      }
    };
  }

});
