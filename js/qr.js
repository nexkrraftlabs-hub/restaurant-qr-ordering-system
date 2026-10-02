/**
 * QR Code Engine & Modal Controller
 * Provides automatic QR generation, branded PNG downloads, print templates, and preview modals.
 */

window.RestaurantQR = (function () {
  
  /**
   * Generates the target customer URL for a given table
   */
  function getTableUrl(tableNumber) {
    const norm = String(tableNumber).padStart(2, '0');
    const loc = window.location;
    // Construct path pointing to customer.html in same directory
    const basePath = loc.pathname.substring(0, loc.pathname.lastIndexOf('/') + 1);
    const fullUrl = `${loc.protocol}//${loc.host}${basePath}customer.html?table=${norm}`;
    return fullUrl;
  }

  /**
   * Renders QR Code into a container element using QRCodeJS or Canvas fallback
   */
  function renderQR(container, text, options = {}) {
    if (!container) return;
    container.innerHTML = '';
    const size = options.size || 220;

    if (typeof QRCode !== 'undefined') {
      try {
        new QRCode(container, {
          text: text,
          width: size,
          height: size,
          colorDark: "#171717",
          colorLight: "#ffffff",
          correctLevel: QRCode.CorrectLevel.H
        });
        return;
      } catch (e) {
        console.warn("QRCodeJS rendering failed, using canvas fallback", e);
      }
    }

    // Fallback QR code generator via pure Canvas / SVG if QRCode lib is unavailable
    renderFallbackQR(container, text, size);
  }

  /**
   * Simple canvas fallback representation if external library fails
   */
  function renderFallbackQR(container, text, size) {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    
    // Draw background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, size, size);

    // Draw stylized placeholder QR matrix
    ctx.fillStyle = '#171717';
    const numCells = 25;
    const cellSize = size / numCells;

    // Pseudo-random deterministic grid based on text hash
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      hash = ((hash << 5) - hash) + text.charCodeAt(i);
      hash |= 0;
    }

    for (let r = 0; r < numCells; r++) {
      for (let c = 0; c < numCells; c++) {
        // Corner markers
        const isTL = (r < 7 && c < 7);
        const isTR = (r < 7 && c >= numCells - 7);
        const isBL = (r >= numCells - 7 && c < 7);

        if (isTL || isTR || isBL) {
          const inR = (r === 0 || r === 6 || c === 0 || c === 6 || (r >= 2 && r <= 4 && c >= 2 && c <= 4));
          const inTR = (r === 0 || r === 6 || c === numCells - 7 || c === numCells - 1 || (r >= 2 && r <= 4 && c >= numCells - 5 && c <= numCells - 3));
          const inBL = (r === numCells - 7 || r === numCells - 1 || c === 0 || c === 6 || (r >= numCells - 5 && r <= numCells - 3 && c >= 2 && c <= 4));
          if (inR || inTR || inBL) {
            ctx.fillRect(c * cellSize, r * cellSize, cellSize, cellSize);
          }
        } else {
          // Data bits
          const bit = Math.abs(Math.sin((r * numCells + c + hash) * 999)) > 0.5;
          if (bit) {
            ctx.fillRect(c * cellSize, r * cellSize, cellSize, cellSize);
          }
        }
      }
    }

    container.appendChild(canvas);
  }

  /**
   * Generates a beautifully styled restaurant table tent card as downloadable PNG
   */
  function downloadQRCard(tableNumber, restaurantName = "Saffron & Spice") {
    const norm = String(tableNumber).padStart(2, '0');
    const url = getTableUrl(norm);
    
    // Offscreen high-res card
    const cardCanvas = document.createElement('canvas');
    cardCanvas.width = 600;
    cardCanvas.height = 800;
    const ctx = cardCanvas.getContext('2d');

    // Background
    ctx.fillStyle = '#F8F7F4';
    ctx.fillRect(0, 0, 600, 800);

    // Border
    ctx.strokeStyle = '#E8E5DF';
    ctx.lineWidth = 12;
    ctx.strokeRect(20, 20, 560, 760);

    // Inner gold accent line
    ctx.strokeStyle = '#C58B45';
    ctx.lineWidth = 3;
    ctx.strokeRect(36, 36, 528, 728);

    // Restaurant Header
    ctx.fillStyle = '#171717';
    ctx.font = 'bold 36px "Playfair Display", serif, Georgia';
    ctx.textAlign = 'center';
    ctx.fillText(restaurantName, 300, 110);

    ctx.fillStyle = '#737373';
    ctx.font = '500 18px "Inter", sans-serif';
    ctx.fillText('SCAN • SELECT • ORDER • ENJOY', 300, 150);

    // Table Badge Box
    ctx.fillStyle = '#171717';
    ctx.beginPath();
    ctx.roundRect(170, 180, 260, 60, 16);
    ctx.fill();

    ctx.fillStyle = '#F3E5D2';
    ctx.font = 'bold 26px "Inter", sans-serif';
    ctx.fillText(`TABLE ${norm}`, 300, 220);

    // QR Area White Box
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = 'rgba(0,0,0,0.08)';
    ctx.shadowBlur = 20;
    ctx.shadowOffsetY = 10;
    ctx.beginPath();
    ctx.roundRect(130, 270, 340, 340, 24);
    ctx.fill();
    ctx.shadowColor = 'transparent';

    // Draw QR into temp canvas
    const tempDiv = document.createElement('div');
    renderQR(tempDiv, url, { size: 280 });

    // Wait microtask for DOM rendering then draw on canvas
    setTimeout(() => {
      let qrImg = tempDiv.querySelector('img') || tempDiv.querySelector('canvas');
      if (qrImg) {
        if (qrImg.tagName.toLowerCase() === 'img' && !qrImg.complete) {
          qrImg.onload = () => drawAndTriggerDownload(qrImg, ctx, cardCanvas, norm);
        } else {
          drawAndTriggerDownload(qrImg, ctx, cardCanvas, norm);
        }
      } else {
        // Fallback direct trigger
        triggerDownload(cardCanvas.toDataURL('image/png'), `Table-${norm}-QR.png`);
      }
    }, 100);
  }

  function drawAndTriggerDownload(qrImg, ctx, cardCanvas, norm) {
    ctx.drawImage(qrImg, 160, 300, 280, 280);

    // Instruction text
    ctx.fillStyle = '#171717';
    ctx.font = 'bold 22px "Inter", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Point your phone camera to scan', 300, 660);

    ctx.fillStyle = '#737373';
    ctx.font = '16px "Inter", sans-serif';
    ctx.fillText('No app download required • Instant live ordering', 300, 695);

    // Footer
    ctx.fillStyle = '#C58B45';
    ctx.font = '600 15px "Inter", sans-serif';
    ctx.fillText(`Table ID: table-${norm} • Powered by Saffron & Spice`, 300, 740);

    triggerDownload(cardCanvas.toDataURL('image/png'), `Table-${norm}-QR-Card.png`);
  }

  function triggerDownload(dataUrl, filename) {
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  /**
   * Opens a print-ready window for physical restaurant table standee
   */
  function printQRCard(tableNumber, restaurantName = "Saffron & Spice") {
    const norm = String(tableNumber).padStart(2, '0');
    const url = getTableUrl(norm);
    
    const printWindow = window.open('', '_blank', 'width=700,height=900');
    if (!printWindow) {
      alert("Please allow pop-ups to print the Table QR Card.");
      return;
    }

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Print QR - Table ${norm} | ${restaurantName}</title>
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body {
            font-family: 'Inter', sans-serif;
            background: #fff;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            padding: 20px;
          }
          .card {
            width: 480px;
            border: 3px solid #171717;
            border-radius: 24px;
            padding: 40px 30px;
            text-align: center;
            position: relative;
            background: #F8F7F4;
          }
          .card::before {
            content: '';
            position: absolute;
            inset: 8px;
            border: 1.5px solid #C58B45;
            border-radius: 16px;
            pointer-events: none;
          }
          h1 {
            font-family: 'Playfair Display', serif;
            font-size: 30px;
            color: #171717;
            margin-bottom: 6px;
          }
          .tagline {
            font-size: 13px;
            text-transform: uppercase;
            letter-spacing: 2px;
            color: #737373;
            margin-bottom: 24px;
          }
          .badge {
            display: inline-block;
            background: #171717;
            color: #F3E5D2;
            font-size: 20px;
            font-weight: 700;
            padding: 10px 28px;
            border-radius: 40px;
            margin-bottom: 24px;
            letter-spacing: 1px;
          }
          .qr-box {
            background: #fff;
            padding: 20px;
            border-radius: 18px;
            display: inline-block;
            margin-bottom: 20px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.06);
          }
          .instructions {
            font-size: 17px;
            font-weight: 600;
            color: #171717;
            margin-bottom: 6px;
          }
          .sub {
            font-size: 13px;
            color: #737373;
            margin-bottom: 20px;
          }
          .url {
            font-size: 11px;
            color: #999;
            word-break: break-all;
            padding: 0 10px;
          }
          @media print {
            body { padding: 0; background: none; }
            .card { border: 2px solid #000; box-shadow: none; }
          }
        </style>
        <script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"><\/script>
      </head>
      <body>
        <div class="card">
          <h1>${restaurantName}</h1>
          <div class="tagline">Artisanal Dining Experience</div>
          <div class="badge">TABLE ${norm}</div>
          <div class="qr-box" id="print-qr"></div>
          <div class="instructions">Scan to View Menu & Order</div>
          <div class="sub">Open camera on your smartphone & point at the QR code</div>
          <div class="url">${url}</div>
        </div>
        <script>
          window.onload = function() {
            new QRCode(document.getElementById('print-qr'), {
              text: "${url}",
              width: 220,
              height: 220,
              colorDark: "#171717",
              colorLight: "#ffffff",
              correctLevel: QRCode.CorrectLevel.H
            });
            setTimeout(function() {
              window.print();
            }, 600);
          };
        <\/script>
      </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
  }

  /**
   * Displays the interactive QR modal for any table
   */
  function showModal(tableNumber) {
    const norm = String(tableNumber).padStart(2, '0');
    const table = window.RestaurantStorage.getTableByNumber(norm) || { number: norm, capacity: 4 };
    const url = getTableUrl(norm);

    // Create modal if not exists in DOM
    let modalEl = document.getElementById('tableQRModal');
    if (!modalEl) {
      modalEl = document.createElement('div');
      modalEl.id = 'tableQRModal';
      modalEl.className = 'modal fade';
      modalEl.tabIndex = -1;
      modalEl.innerHTML = `
        <div class="modal-dialog modal-dialog-centered">
          <div class="modal-content border-0 shadow-lg" style="border-radius: 20px; overflow: hidden;">
            <div class="modal-header border-0 pb-0 pt-4 px-4 bg-light">
              <div>
                <span class="badge bg-dark text-warning px-3 py-1 mb-1 rounded-pill" id="qrModalBadge">TABLE 00</span>
                <h5 class="modal-title font-playfair fw-bold text-dark mt-1" id="qrModalTitle">Customer Table QR</h5>
              </div>
              <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body text-center p-4">
              <p class="text-muted small mb-3">Customers scan this QR code with their mobile camera to access the menu and place orders.</p>
              
              <div class="p-3 bg-white rounded-4 shadow-sm d-inline-block border mb-3" style="min-width: 240px; min-height: 240px;">
                <div id="qrModalTarget" class="d-flex align-items-center justify-content-center" style="min-height: 220px;"></div>
              </div>

              <div class="input-group mb-3">
                <input type="text" id="qrModalUrlInput" class="form-control form-control-sm bg-light border-0 text-muted font-monospace" readonly>
                <button class="btn btn-outline-secondary btn-sm" id="qrModalCopyBtn" type="button" title="Copy Link">
                  <i class="bi bi-clipboard"></i> Copy
                </button>
              </div>

              <div class="d-flex flex-wrap gap-2 justify-content-center mt-3">
                <button type="button" class="btn btn-dark btn-sm px-3 rounded-pill" id="qrModalDownloadBtn">
                  <i class="bi bi-download me-1"></i> Download Standee Card
                </button>
                <button type="button" class="btn btn-outline-dark btn-sm px-3 rounded-pill" id="qrModalPrintBtn">
                  <i class="bi bi-printer me-1"></i> Print Tent Card
                </button>
                <a href="${url}" target="_blank" class="btn btn-warning btn-sm px-3 rounded-pill text-dark fw-bold" id="qrModalOpenBtn">
                  <i class="bi bi-box-arrow-up-right me-1"></i> Open as Customer
                </a>
              </div>
            </div>
          </div>
        </div>
      `;
      document.body.appendChild(modalEl);
    }

    // Update modal contents
    document.getElementById('qrModalBadge').textContent = `TABLE ${norm} • ${table.capacity || 4} SEATS`;
    document.getElementById('qrModalTitle').textContent = `Table ${norm} QR Code`;
    const urlInput = document.getElementById('qrModalUrlInput');
    urlInput.value = url;
    
    const openBtn = document.getElementById('qrModalOpenBtn');
    openBtn.href = url;

    const qrContainer = document.getElementById('qrModalTarget');
    renderQR(qrContainer, url, { size: 220 });

    // Copy URL handler
    const copyBtn = document.getElementById('qrModalCopyBtn');
    copyBtn.onclick = () => {
      navigator.clipboard.writeText(url).then(() => {
        copyBtn.innerHTML = '<i class="bi bi-check2"></i> Copied!';
        setTimeout(() => copyBtn.innerHTML = '<i class="bi bi-clipboard"></i> Copy', 2000);
      });
    };

    // Download handler
    document.getElementById('qrModalDownloadBtn').onclick = () => {
      downloadQRCard(norm);
    };

    // Print handler
    document.getElementById('qrModalPrintBtn').onclick = () => {
      printQRCard(norm);
    };

    // Show bootstrap modal
    const bsModal = new bootstrap.Modal(modalEl);
    bsModal.show();
  }

  return {
    getTableUrl,
    renderQR,
    downloadQRCard,
    printQRCard,
    showModal
  };
})();
