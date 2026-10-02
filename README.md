# Saffron & Spice — Restaurant QR Ordering & Management System

> A complete, modern, frontend-only **Restaurant QR Ordering & Operations Suite** built with **HTML5, CSS3, Bootstrap 5, Vanilla JavaScript, GSAP, and LocalStorage**.

![Status](https://img.shields.io/badge/Status-Complete-success)
![Architecture](https://img.shields.io/badge/Architecture-Frontend--Only-orange)
![Storage](https://img.shields.io/badge/Database-LocalStorage%20Sync-blue)
![License](https://img.shields.io/badge/License-MIT-green)

---

## 🍽️ Overview

**Saffron & Spice** simulates a full-cycle digital restaurant ordering ecosystem without needing a backend server or database. It operates 100% inside any modern browser using LocalStorage with real-time multi-tab synchronization and polling fallbacks.

```
ADMIN CREATES TABLE
      ↓
QR AUTOMATICALLY GENERATED
      ↓
CUSTOMER SCANS / OPENS TABLE QR (?table=11)
      ↓
CUSTOMER BROWSES MENU & CUSTOMIZES FOOD
      ↓
CART & INSTANT ORDER PLACEMENT
      ↓
ADMIN DISPATCH ACCEPTS ORDER
      ↓
KITCHEN KDS PREPARES & MARKS READY
      ↓
WAITER HUB SERVES TO TABLE
      ↓
CUSTOMER UNLOCKS BILL
      ↓
PAY ONLINE (SIMULATED) / PAY AT COUNTER
      ↓
PAYMENT COMPLETE & DIGITAL TAX INVOICE ISSUED
      ↓
DOWNLOAD / PRINT TAX BILL
```

---

## ✨ Key Features & Views

### 1. 📱 Customer Mobile App (`customer.html`)
- **Automatic Table Detection**: Detects `?table=11` or `#table-11` from URL and displays *"TABLE 11 • Ordering here"*.
- **Mobile-First Experience**: Designed for mobile screens (320px–414px) and adapts to 3-column layout on desktop (1200px+).
- **Animated Organic Blobs**: Pure CSS morphing blobs with `prefers-reduced-motion` support.
- **Horizontal Category Pills**: Instant category switching (All, Starters, Indian, Chinese, Pizza, Burger, Desserts, Drinks) and Veg-Only toggle.
- **Food Detail Bottom Sheet**: GSAP animated bottom sheet with spice levels (Mild, Medium, Spicy), customization notes, and quantity selectors.
- **Real-time Order Tracker**: Live timeline showing:
  - ✓ Order Received
  - ✓ Accepted by Restaurant
  - ● Preparing in Kitchen
  - ○ Ready to Serve
  - ○ Food Served to Table
- **Interactive Billing & Payment**:
  - **Pay Online**: Realistic simulated UPI / Card / NetBanking payment modal with processing spinner and success checkmark.
  - **Pay at Counter**: Flags bill for steward cash collection.
- **Fixed Mobile Bottom Navigation**: Home, Menu, Cart badge, Track Orders, and Table Info.

### 2. 💻 SaaS Admin Operations Dashboard (`admin.html`)
- **Key Metrics**: Today's Orders, Total Revenue, In Kitchen, Ready to Serve, Pending Payments.
- **Live Orders**: Filter by status (New, Accepted, Preparing, Ready, Served, Completed). Desktop table and **auto-reflow mobile touch cards**.
- **Table Provisioning & Automatic QR Generator**:
  - Add Table (e.g. Table 11, Capacity 4).
  - Automatically generates unique table ID, binds QR URL (`customer.html?table=11`), and displays interactive preview modal.
  - 1-click **Download Branded Standee PNG** & **Print Table Tent Card**.
- **Menu Catalog Management**: Add dishes, set prices, categories, veg/non-veg tags, and **In Stock / Out of Stock toggle**.
- **Categories CRUD & Billing Archive**: Complete list of tax invoices with GST calculations.
- **Demo Reset & Quick Simulator**: 1-click test order injector and factory reset button.

### 3. 👨‍🍳 Kitchen Display System — KDS (`kitchen.html`)
- **Chef-Optimized Kanban**: 3 live columns (`NEW / ACCEPTED`, `COOKING (PREPARING)`, `READY FOR PICKUP`).
- **Live Cooking Timers**: Tracks elapsed minutes with urgent warnings (>15 mins).
- **Special Cooking Notes**: Prominently highlights custom requests (e.g. "Less spicy, no onion").
- **Audio Chimes**: Synthesizes pleasant bells via the Web Audio API when new tickets arrive.

### 4. 🤵 Floor Steward & Waiter Hub (`waiter.html`)
- **Ready to Serve Dispatch**: Shows hot plated orders ready for immediate table delivery.
- **Serve Order**: 1-tap confirmation transitions customer UI to *Food Served* and unlocks the bill.
- **Counter Collections**: Displays pending cash/card settlements with 1-tap *"Collect & Mark Paid"*.

### 5. 🧾 Digital Tax Invoice & Bill (`bill.html`)
- **GST Compliant Receipt**: Itemized dishes, Subtotal, CGST (2.5%), SGST (2.5%), Grand Total.
- **Print Optimization**: Clean thermal/A4 print layout via `@media print`.

### 6. 🌐 Master Portal (`index.html`)
- Role-based direct navigation hub.
- **Interactive 1-Click QR Table Standee Simulator**: Test any table from Table 01 to Table 10+.
- Multi-Window demo launcher.

---

## 🚀 Getting Started

No installation, build tools, or backend required!

### Option 1: Direct File Launch
Simply double click or open **`index.html`** in any web browser (Chrome, Edge, Firefox, Safari).

### Option 2: Local HTTP Server (Recommended for multi-tab testing)
Run a simple HTTP server in the project directory:

```bash
# Using Python
python -m http.server 8080

# Or using Node
npx serve .
```

Open `http://localhost:8080` in your browser.

---

## 🧪 Step-by-Step Test Scenario

To verify complete end-to-end localStorage synchronization across tabs:

1. Open `admin.html` &rarr; Go to **Tables & QR** &rarr; Click **Add Table**.
2. Enter **Table Number: 11**, **Capacity: 4** &rarr; Click **CREATE TABLE & GENERATE QR**.
3. In the QR modal, click **Open as Customer** (or open `customer.html?table=11`).
4. On `customer.html`, verify it shows **TABLE 11**. Add **Dum Chicken Biryani × 2** to cart &rarr; Click **Place Order**.
5. Switch to `admin.html` &rarr; Order appears under **New Orders** &rarr; Click **Accept**.
6. Switch to `kitchen.html` &rarr; Order appears under **NEW / ACCEPTED** &rarr; Click **Start Preparing** &rarr; Click **Mark Ready**.
7. Switch to `waiter.html` &rarr; Order appears under **Ready to Serve** &rarr; Click **Serve Order**.
8. Switch to `customer.html?table=11` &rarr; Order updates to **Served** and **Bill Ready** appears.
9. Click **Pay Online** &rarr; Click **Pay Now** &rarr; Demo payment succeeds!
10. Click **View & Download Tax Bill** &rarr; Inspect digital tax invoice on `bill.html`.

---

## 🛠️ Technology Stack

- **Markup & Layout**: HTML5, CSS3, Bootstrap 5.3.3
- **Scripting & Logic**: Vanilla JavaScript (ES6+)
- **State & Database**: Browser `localStorage` + `window.addEventListener('storage')`
- **Animations**: GSAP 3.12.5 + CSS3 Keyframe Blobs
- **QR Engine**: QRCode.js CDN + HTML5 Canvas generator
- **Audio Engine**: HTML5 Web Audio API (zero external sound files)
- **Typography**: Playfair Display (Headings) + Inter (UI/Body)
- **Icons**: Bootstrap Icons 1.11.3

---

## 📄 License

This project is licensed under the MIT License.
