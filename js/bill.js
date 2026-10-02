/**
 * Saffron & Spice - Digital Tax Invoice Controller
 * Renders official tax receipt, itemized dishes, GST tax breakdowns, and handles print dispatch.
 */

document.addEventListener('DOMContentLoaded', () => {
  renderBill();

  function renderBill() {
    const params = new URLSearchParams(window.location.search);
    const orderIdParam = params.get('orderId');
    const invoiceIdParam = params.get('invoiceId');

    let order = null;
    let invoice = null;

    if (invoiceIdParam) {
      invoice = RestaurantStorage.getInvoiceById(invoiceIdParam);
      if (invoice) {
        order = RestaurantStorage.getOrderById(invoice.orderId);
      }
    }

    if (!order && orderIdParam) {
      order = RestaurantStorage.getOrderById(orderIdParam);
      if (order) {
        invoice = RestaurantStorage.getInvoiceByOrderId(order.id);
      }
    }

    // Fallback: pick the latest available order
    if (!order) {
      const allOrders = RestaurantStorage.getOrders();
      if (allOrders.length > 0) {
        order = allOrders[0];
        invoice = RestaurantStorage.getInvoiceByOrderId(order.id);
      }
    }

    if (!order) {
      document.getElementById('invoiceReceiptContainer').innerHTML = `
        <div class="text-center py-5">
          <i class="bi bi-file-earmark-x fs-1 text-muted"></i>
          <h4 class="fw-bold mt-2">No Bill Found</h4>
          <p class="text-muted small">Please place an order from the customer menu first.</p>
          <a href="customer.html" class="btn btn-primary-dark rounded-pill px-4">Open Customer Menu</a>
        </div>
      `;
      return;
    }

    // If invoice not created yet, create derived invoice preview
    if (!invoice) {
      invoice = {
        id: `INV-${new Date().getFullYear()}-00${order.id.replace('ORD-', '')}`,
        orderId: order.id,
        tableNumber: order.tableNumber,
        items: order.items,
        subtotal: order.subtotal,
        tax: order.tax,
        total: order.total,
        paymentMethod: order.paymentMethod || 'ONLINE',
        paymentStatus: order.paymentStatus || 'PAID',
        createdAt: order.updatedAt || order.createdAt
      };
    }

    // Settings
    const settings = RestaurantStorage.getSettings();
    document.getElementById('receiptRestName').textContent = settings.restaurantName || "Saffron & Spice Dining";
    document.getElementById('receiptTagline').textContent = settings.tagline || "Artisanal Flavors • Modern Craft Cuisine";
    document.getElementById('receiptAddress').textContent = settings.address || "Plot 42, Heritage Boulevard, Indiranagar, Bengaluru";
    document.getElementById('receiptGSTIN').textContent = settings.gstin || "29AABCU9603R1ZM";
    document.getElementById('receiptPhone').textContent = settings.phone || "+91 98765 43210";

    // Metadata
    document.getElementById('receiptInvoiceId').textContent = invoice.id;
    document.getElementById('receiptDate').textContent = RestaurantApp.formatDate(invoice.createdAt);
    document.getElementById('receiptTableNum').textContent = `TABLE ${order.tableNumber}`;
    document.getElementById('receiptOrderId').textContent = order.id;

    // Items list
    const itemsBody = document.getElementById('receiptItemsBody');
    let itemsHtml = '';
    (order.items || []).forEach(item => {
      const lineTotal = item.price * item.quantity;
      itemsHtml += `
        <tr>
          <td>
            <div class="fw-semibold text-dark">${item.name}</div>
            ${item.instructions ? `<div class="text-muted" style="font-size: 11px;">Note: ${item.instructions}</div>` : ''}
          </td>
          <td class="text-center">${item.quantity}</td>
          <td class="text-end text-muted">${RestaurantApp.formatCurrency(item.price)}</td>
          <td class="text-end fw-bold text-dark">${RestaurantApp.formatCurrency(lineTotal)}</td>
        </tr>
      `;
    });
    itemsBody.innerHTML = itemsHtml;

    // Taxes
    const subtotal = order.subtotal || 0;
    const tax = order.tax || 0;
    const cgst = Math.round((tax / 2) * 100) / 100;
    const sgst = Math.round((tax - cgst) * 100) / 100;

    document.getElementById('receiptSubtotal').textContent = RestaurantApp.formatCurrency(subtotal);
    document.getElementById('receiptCGST').textContent = RestaurantApp.formatCurrency(cgst);
    document.getElementById('receiptSGST').textContent = RestaurantApp.formatCurrency(sgst);
    document.getElementById('receiptGrandTotal').textContent = RestaurantApp.formatCurrency(order.total);

    // Payment banner
    const isPaid = order.paymentStatus === 'PAID';
    const statusEl = document.getElementById('receiptPaymentStatus');
    const methodEl = document.getElementById('receiptPaymentMethod');

    statusEl.textContent = order.paymentStatus || 'UNPAID';
    statusEl.className = `badge ${isPaid ? 'bg-success' : 'bg-warning text-dark'} rounded-pill px-3 py-2 fs-6`;
    methodEl.textContent = order.paymentMethod ? `${order.paymentMethod} (SETTLED)` : 'PENDING SETTLEMENT';
  }
});
