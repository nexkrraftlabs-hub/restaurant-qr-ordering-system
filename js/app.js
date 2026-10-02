/**
 * Saffron & Spice - Shared Application Utilities
 * Includes Audio chimes via Web Audio API, Toast system, Formatting, and Storage synchronizer.
 */

window.RestaurantApp = (function () {

  // ==========================================
  // AUDIO SYNTHESIZER (Web Audio API)
  // ==========================================
  let audioCtx = null;

  function getAudioContext() {
    if (!audioCtx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        audioCtx = new AudioContext();
      }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    return audioCtx;
  }

  function playSound(type = 'success') {
    try {
      const ctx = getAudioContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === 'new-order') {
        // High attention pleasant double chime
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(587.33, now); // D5
        osc.frequency.setValueAtTime(880.00, now + 0.12); // A5
        gain.gain.setValueAtTime(0.18, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
        osc.start(now);
        osc.stop(now + 0.5);
      } else if (type === 'ready') {
        // Upward chord
        osc.type = 'sine';
        osc.frequency.setValueAtTime(523.25, now); // C5
        osc.frequency.setValueAtTime(659.25, now + 0.1); // E5
        osc.frequency.setValueAtTime(783.99, now + 0.2); // G5
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
        osc.start(now);
        osc.stop(now + 0.6);
      } else if (type === 'add-to-cart') {
        // Soft click pop
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.08);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
        osc.start(now);
        osc.stop(now + 0.1);
      } else {
        // General success chime
        osc.type = 'sine';
        osc.frequency.setValueAtTime(523.25, now); // C5
        osc.frequency.setValueAtTime(659.25, now + 0.15); // E5
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
        osc.start(now);
        osc.stop(now + 0.4);
      }
    } catch (e) {
      // Audio not permitted or supported, silent fallback
    }
  }

  // ==========================================
  // TOAST NOTIFICATIONS
  // ==========================================
  function showToast(message, type = 'info', icon = null) {
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `custom-toast toast-${type}`;

    let iconClass = icon;
    if (!iconClass) {
      if (type === 'success') iconClass = 'bi-check-circle-fill text-success';
      else if (type === 'warning') iconClass = 'bi-exclamation-triangle-fill text-warning';
      else iconClass = 'bi-info-circle-fill text-info';
    }

    toast.innerHTML = `
      <i class="bi ${iconClass} fs-5"></i>
      <span>${message}</span>
    `;

    container.appendChild(toast);

    // Trigger animation via GSAP or class
    requestAnimationFrame(() => {
      toast.classList.add('show');
    });

    if (type === 'success') playSound('success');

    // Auto dismiss after 3.2s
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
      }, 350);
    }, 3200);
  }

  // ==========================================
  // FORMATTING UTILITIES
  // ==========================================
  function formatCurrency(amount) {
    const num = parseFloat(amount) || 0;
    return `₹${num.toFixed(num % 1 === 0 ? 0 : 2)}`;
  }

  function formatDate(isoString) {
    if (!isoString) return '';
    const date = new Date(isoString);
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  }

  function formatTimeAgo(isoString) {
    if (!isoString) return '';
    const diffMs = Date.now() - new Date(isoString).getTime();
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return 'Just now';
    if (mins === 1) return '1 min ago';
    if (mins < 60) return `${mins} mins ago`;
    const hours = Math.floor(mins / 60);
    return `${hours} hr ${mins % 60}m ago`;
  }

  // ==========================================
  // URL & TABLE RESOLVER
  // ==========================================
  function getTableFromUrl() {
    const params = new URLSearchParams(window.location.search);
    const tableParam = params.get('table');
    if (tableParam) {
      return String(tableParam).padStart(2, '0');
    }
    // Check hash as fallback (e.g. #table-11)
    const hash = window.location.hash;
    const match = hash.match(/table-(\d+)/i);
    if (match && match[1]) {
      return String(match[1]).padStart(2, '0');
    }
    return null;
  }

  // ==========================================
  // MULTI-TAB & LOCAL SYNC SUBSCRIBER
  // ==========================================
  function subscribeSync(callback, pollIntervalMs = 1500) {
    // 1. Cross-tab storage event
    window.addEventListener('storage', (e) => {
      callback({ source: 'cross-tab', key: e.key, newValue: e.newValue });
    });

    // 2. Same-tab custom event
    window.addEventListener('restaurant_storage_change', (e) => {
      callback({ source: 'same-tab', key: e.detail.key, data: e.detail.data });
    });

    // 3. Fallback polling
    let timer = null;
    function runPoll() {
      if (!document.hidden) {
        callback({ source: 'poll' });
      }
    }

    if (pollIntervalMs > 0) {
      timer = setInterval(runPoll, pollIntervalMs);
      document.addEventListener('visibilitychange', () => {
        if (!document.hidden) runPoll();
      });
    }

    return () => {
      if (timer) clearInterval(timer);
    };
  }

  return {
    playSound,
    showToast,
    formatCurrency,
    formatDate,
    formatTimeAgo,
    getTableFromUrl,
    subscribeSync
  };
})();
