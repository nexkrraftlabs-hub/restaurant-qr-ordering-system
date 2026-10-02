/**
 * Saffron & Spice - LocalStorage Database Layer
 * Handles all CRUD operations, seed data, and reactive synchronization.
 */

const STORAGE_KEYS = {
  TABLES: 'restaurant_tables',
  MENU: 'restaurant_menu',
  CATEGORIES: 'restaurant_categories',
  ORDERS: 'restaurant_orders',
  PAYMENTS: 'restaurant_payments',
  INVOICES: 'restaurant_invoices',
  SETTINGS: 'restaurant_settings',
  CART_PREFIX: 'restaurant_cart_',
  STAFF: 'restaurant_staff',
  SESSION: 'restaurant_auth_session'
};

// Dispatch local event for same-tab reactive updates
function notifyStorageChange(key, data) {
  window.dispatchEvent(new CustomEvent('restaurant_storage_change', {
    detail: { key, data, timestamp: Date.now() }
  }));
}

// ==========================================
// SEED DATA DEFINITIONS
// ==========================================

const DEFAULT_SETTINGS = {
  restaurantName: "Saffron & Spice Dining",
  tagline: "Artisanal Flavors • Modern Craft Cuisine",
  currency: "₹",
  taxRate: 5.0, // 5% GST (2.5% CGST + 2.5% SGST)
  address: "Plot 42, Heritage Boulevard, Indiranagar, Bengaluru - 560038",
  phone: "+91 98765 43210",
  email: "dining@saffronspice.com",
  gstin: "29AABCU9603R1ZM",
  serviceCharge: 0
};

const DEFAULT_CATEGORIES = [
  { id: "cat-starters", name: "Starters", icon: "bi-fire", order: 1, enabled: true },
  { id: "cat-main", name: "Main Course", icon: "bi-pie-chart", order: 2, enabled: true },
  { id: "cat-indian", name: "Indian", icon: "bi-sun", order: 3, enabled: true },
  { id: "cat-chinese", name: "Chinese", icon: "bi-box", order: 4, enabled: true },
  { id: "cat-pizza", name: "Pizza", icon: "bi-disc", order: 5, enabled: true },
  { id: "cat-burger", name: "Burger", icon: "bi-circle", order: 6, enabled: true },
  { id: "cat-desserts", name: "Desserts", icon: "bi-cake2", order: 7, enabled: true },
  { id: "cat-drinks", name: "Drinks", icon: "bi-cup-straw", order: 8, enabled: true }
];

const DEFAULT_TABLES = [
  { id: "table-01", number: "01", capacity: 2, status: "available", activeOrderId: null, createdAt: new Date().toISOString() },
  { id: "table-02", number: "02", capacity: 2, status: "available", activeOrderId: null, createdAt: new Date().toISOString() },
  { id: "table-03", number: "03", capacity: 4, status: "available", activeOrderId: null, createdAt: new Date().toISOString() },
  { id: "table-04", number: "04", capacity: 4, status: "available", activeOrderId: null, createdAt: new Date().toISOString() },
  { id: "table-05", number: "05", capacity: 6, status: "available", activeOrderId: null, createdAt: new Date().toISOString() },
  { id: "table-06", number: "06", capacity: 6, status: "available", activeOrderId: null, createdAt: new Date().toISOString() },
  { id: "table-07", number: "07", capacity: 4, status: "occupied", activeOrderId: "ORD-1040", createdAt: new Date().toISOString() },
  { id: "table-08", number: "08", capacity: 8, status: "available", activeOrderId: null, createdAt: new Date().toISOString() },
  { id: "table-09", number: "09", capacity: 2, status: "available", activeOrderId: null, createdAt: new Date().toISOString() },
  { id: "table-10", number: "10", capacity: 10, status: "available", activeOrderId: null, createdAt: new Date().toISOString() }
];

const DEFAULT_MENU = [
  // Starters
  {
    id: "item-paneer-tikka",
    name: "Paneer Tikka",
    category: "Starters",
    categoryId: "cat-starters",
    price: 240,
    description: "Charcoal-grilled cottage cheese cubes marinated in yogurt and Kashmiri red chili spices.",
    isVeg: true,
    isBestseller: true,
    inStock: true,
    prepTime: "15 mins",
    image: "https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?auto=format&fit=crop&w=600&q=80"
  },
  {
    id: "item-chilli-paneer",
    name: "Chilli Paneer Dry",
    category: "Starters",
    categoryId: "cat-starters",
    price: 220,
    description: "Wok-tossed paneer tossed with crunchy bell peppers, scallions, and spicy oriental glaze.",
    isVeg: true,
    isBestseller: false,
    inStock: true,
    prepTime: "12 mins",
    image: "https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?auto=format&fit=crop&w=600&q=80"
  },
  {
    id: "item-french-fries",
    name: "Crispy Truffle Fries",
    category: "Starters",
    categoryId: "cat-starters",
    price: 150,
    description: "Golden hand-cut potato fries lightly tossed with herb salt and house garlic aioli.",
    isVeg: true,
    isBestseller: false,
    inStock: true,
    prepTime: "10 mins",
    image: "https://images.unsplash.com/photo-1576107232684-1279f3908594?auto=format&fit=crop&w=600&q=80"
  },
  {
    id: "item-manchurian",
    name: "Veg Manchurian Balls",
    category: "Starters",
    categoryId: "cat-starters",
    price: 190,
    description: "Crispy vegetable dumplings smothered in a fragrant ginger, garlic, and coriander sauce.",
    isVeg: true,
    isBestseller: true,
    inStock: true,
    prepTime: "14 mins",
    image: "https://images.unsplash.com/photo-1541832676-9b763b0239ab?auto=format&fit=crop&w=600&q=80"
  },

  // Indian & Main Course
  {
    id: "item-chicken-biryani",
    name: "Dum Chicken Biryani",
    category: "Indian",
    categoryId: "cat-indian",
    price: 280,
    description: "Fragrant long-grain aged basmati rice cooked on slow dum with tender spiced chicken pieces and saffron.",
    isVeg: false,
    isBestseller: true,
    inStock: true,
    prepTime: "20 mins",
    image: "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=600&q=80"
  },
  {
    id: "item-butter-chicken",
    name: "Old Delhi Butter Chicken",
    category: "Indian",
    categoryId: "cat-indian",
    price: 320,
    description: "Tandoori chicken shredded and simmered in a velvety tomato, cashew, and farm-fresh butter gravy.",
    isVeg: false,
    isBestseller: true,
    inStock: true,
    prepTime: "18 mins",
    image: "https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?auto=format&fit=crop&w=600&q=80"
  },
  {
    id: "item-dal-makhani",
    name: "Dal Makhani Grand",
    category: "Indian",
    categoryId: "cat-indian",
    price: 210,
    description: "Black lentils slow-cooked overnight over charcoal, finished with white butter and fresh cream.",
    isVeg: true,
    isBestseller: true,
    inStock: true,
    prepTime: "12 mins",
    image: "https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=600&q=80"
  },
  {
    id: "item-paneer-butter-masala",
    name: "Paneer Butter Masala",
    category: "Indian",
    categoryId: "cat-indian",
    price: 240,
    description: "Soft cottage cheese chunks cooked in rich mildly sweet onion tomato gravy with fenugreek leaves.",
    isVeg: true,
    isBestseller: false,
    inStock: true,
    prepTime: "15 mins",
    image: "https://images.unsplash.com/photo-1631452180519-c014fe946bc7?auto=format&fit=crop&w=600&q=80"
  },
  {
    id: "item-veg-biryani",
    name: "Royal Veg Dum Biryani",
    category: "Indian",
    categoryId: "cat-indian",
    price: 220,
    description: "Layered basmati rice with seasonal garden vegetables, mint, caramelized onions, and fried cashews.",
    isVeg: true,
    isBestseller: false,
    inStock: true,
    prepTime: "18 mins",
    image: "https://images.unsplash.com/photo-1589302168068-964664d93dc0?auto=format&fit=crop&w=600&q=80"
  },
  {
    id: "item-butter-naan",
    name: "Artisan Butter Naan",
    category: "Main Course",
    categoryId: "cat-main",
    price: 50,
    description: "Traditional tandoor clay-oven leavened flatbread brushed with whipped cultured butter.",
    isVeg: true,
    isBestseller: true,
    inStock: true,
    prepTime: "8 mins",
    image: "https://images.unsplash.com/photo-1626074353765-517a681e40be?auto=format&fit=crop&w=600&q=80"
  },
  {
    id: "item-garlic-naan",
    name: "Tandoori Garlic Naan",
    category: "Main Course",
    categoryId: "cat-main",
    price: 65,
    description: "Soft tandoor flatbread infused with roasted minced garlic, cilantro, and golden butter.",
    isVeg: true,
    isBestseller: false,
    inStock: true,
    prepTime: "8 mins",
    image: "https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=600&q=80"
  },

  // Chinese
  {
    id: "item-hakka-noodles",
    name: "Veg Hakka Noodles",
    category: "Chinese",
    categoryId: "cat-chinese",
    price: 190,
    description: "Classic stir-fried thin noodles tossed with crunchy vegetables, soy sauce, and white pepper.",
    isVeg: true,
    isBestseller: true,
    inStock: true,
    prepTime: "12 mins",
    image: "https://images.unsplash.com/photo-1585032226651-759b368d7246?auto=format&fit=crop&w=600&q=80"
  },
  {
    id: "item-fried-rice",
    name: "Wok Egg / Veg Fried Rice",
    category: "Chinese",
    categoryId: "cat-chinese",
    price: 190,
    description: "Fluffy steamed rice stir-fried in smoking wok with spring onions, julienned carrots, and sesame oil.",
    isVeg: true,
    isBestseller: false,
    inStock: true,
    prepTime: "12 mins",
    image: "https://images.unsplash.com/photo-1603133872878-684f208fb84b?auto=format&fit=crop&w=600&q=80"
  },

  // Pizza
  {
    id: "item-margherita-pizza",
    name: "Margherita Basilico Pizza",
    category: "Pizza",
    categoryId: "cat-pizza",
    price: 270,
    description: "Hand-stretched sourdough crust with San Marzano tomato sugo, fresh buffalo mozzarella, and fresh basil.",
    isVeg: true,
    isBestseller: false,
    inStock: true,
    prepTime: "16 mins",
    image: "https://images.unsplash.com/photo-1604382355076-af4b0eb60143?auto=format&fit=crop&w=600&q=80"
  },
  {
    id: "item-farmhouse-pizza",
    name: "Farmhouse Truffle Pizza",
    category: "Pizza",
    categoryId: "cat-pizza",
    price: 340,
    description: "Loaded with button mushrooms, kalamata olives, sweet corn, roasted peppers, and mozzarella blend.",
    isVeg: true,
    isBestseller: true,
    inStock: true,
    prepTime: "18 mins",
    image: "https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=600&q=80"
  },

  // Burger
  {
    id: "item-chicken-burger",
    name: "Smoky Crispy Chicken Burger",
    category: "Burger",
    categoryId: "cat-burger",
    price: 220,
    description: "Double-fried crunchy buttermilk chicken thigh, melted cheddar, pickled gherkins, and brioche bun.",
    isVeg: false,
    isBestseller: true,
    inStock: true,
    prepTime: "14 mins",
    image: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=600&q=80"
  },
  {
    id: "item-veg-burger",
    name: "Gourmet Garden Veg Burger",
    category: "Burger",
    categoryId: "cat-burger",
    price: 170,
    description: "Crispy herb potato and quinoa patty, smashed avocado, fresh lettuce, tomato, and chipotle mayo.",
    isVeg: true,
    isBestseller: false,
    inStock: true,
    prepTime: "12 mins",
    image: "https://images.unsplash.com/photo-1586190848861-99aa4a171e90?auto=format&fit=crop&w=600&q=80"
  },

  // Desserts
  {
    id: "item-gulab-jamun",
    name: "Warm Saffron Gulab Jamun",
    category: "Desserts",
    categoryId: "cat-desserts",
    price: 110,
    description: "Two melt-in-mouth milk dumplings steeped in rose and cardamom saffron syrup with pistachios.",
    isVeg: true,
    isBestseller: true,
    inStock: true,
    prepTime: "5 mins",
    image: "https://images.unsplash.com/photo-1589119908995-c6837fa14d48?auto=format&fit=crop&w=600&q=80"
  },
  {
    id: "item-brownie",
    name: "Warm Belgian Fudge Brownie",
    category: "Desserts",
    categoryId: "cat-desserts",
    price: 160,
    description: "Dense 70% dark Belgian chocolate brownie served warm with a drizzle of hot chocolate ganache.",
    isVeg: true,
    isBestseller: true,
    inStock: true,
    prepTime: "6 mins",
    image: "https://images.unsplash.com/photo-1606313564200-e75d5e30476c?auto=format&fit=crop&w=600&q=80"
  },
  {
    id: "item-ice-cream",
    name: "Madagascar Vanilla Bean Ice Cream",
    category: "Desserts",
    categoryId: "cat-desserts",
    price: 100,
    description: "Double scoop of artisanal real vanilla bean ice cream garnished with roasted almond slivers.",
    isVeg: true,
    isBestseller: false,
    inStock: true,
    prepTime: "3 mins",
    image: "https://images.unsplash.com/photo-1570197788417-0e82375c9371?auto=format&fit=crop&w=600&q=80"
  },

  // Drinks
  {
    id: "item-mojito",
    name: "Mint Virgin Mojito",
    category: "Drinks",
    categoryId: "cat-drinks",
    price: 130,
    description: "Muddled fresh garden mint leaves, Persian lime juice, raw cane sugar, and sparkling soda.",
    isVeg: true,
    isBestseller: true,
    inStock: true,
    prepTime: "5 mins",
    image: "https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=600&q=80"
  },
  {
    id: "item-cold-coffee",
    name: "Creamy Frosted Cold Coffee",
    category: "Drinks",
    categoryId: "cat-drinks",
    price: 140,
    description: "Espresso blended with chilled whole milk, rich vanilla ice cream, and Hershey's chocolate swirls.",
    isVeg: true,
    isBestseller: true,
    inStock: true,
    prepTime: "5 mins",
    image: "https://images.unsplash.com/photo-1517701604599-bb29b565090c?auto=format&fit=crop&w=600&q=80"
  },
  {
    id: "item-lime-soda",
    name: "Fresh Lime Soda Sweet & Salt",
    category: "Drinks",
    categoryId: "cat-drinks",
    price: 80,
    description: "Refreshing freshly squeezed lemon juice over crushed ice with rock salt and light syrup.",
    isVeg: true,
    isBestseller: false,
    inStock: true,
    prepTime: "4 mins",
    image: "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=600&q=80"
  },
  {
    id: "item-masala-tea",
    name: "Kullad Masala Chai",
    category: "Drinks",
    categoryId: "cat-drinks",
    price: 50,
    description: "Aromatic Assam tea simmered with fresh crushed ginger, green cardamom, cloves, and whole milk.",
    isVeg: true,
    isBestseller: false,
    inStock: true,
    prepTime: "6 mins",
    image: "https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&w=600&q=80"
  },
  {
    id: "item-coke",
    name: "Coca Cola Chilled (330ml)",
    category: "Drinks",
    categoryId: "cat-drinks",
    price: 45,
    description: "Chilled can served with sliced lemon and ice cubes.",
    isVeg: true,
    isBestseller: false,
    inStock: true,
    prepTime: "2 mins",
    image: "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=600&q=80"
  }
];

const DEFAULT_ORDERS = [
  {
    id: "ORD-1040",
    tableId: "table-07",
    tableNumber: "07",
    items: [
      { id: "item-chicken-biryani", name: "Dum Chicken Biryani", price: 280, quantity: 2, instructions: "Less spicy, extra raita", isVeg: false },
      { id: "item-butter-naan", name: "Artisan Butter Naan", price: 50, quantity: 2, instructions: "Well cooked", isVeg: true },
      { id: "item-mojito", name: "Mint Virgin Mojito", price: 130, quantity: 1, instructions: "Less ice", isVeg: true }
    ],
    subtotal: 790,
    tax: 39.50,
    total: 829.50,
    status: "PREPARING", // NEW -> ACCEPTED -> PREPARING -> READY -> SERVED -> COMPLETED
    specialInstructions: "Please serve naans fresh and hot with the biryani.",
    paymentMethod: null,
    paymentStatus: "UNPAID",
    createdAt: new Date(Date.now() - 12 * 60 * 1000).toISOString(), // 12 mins ago
    updatedAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    history: [
      { status: "NEW", time: new Date(Date.now() - 12 * 60 * 1000).toISOString() },
      { status: "ACCEPTED", time: new Date(Date.now() - 10 * 60 * 1000).toISOString() },
      { status: "PREPARING", time: new Date(Date.now() - 5 * 60 * 1000).toISOString() }
    ]
  },
  {
    id: "ORD-1039",
    tableId: "table-03",
    tableNumber: "03",
    items: [
      { id: "item-paneer-tikka", name: "Paneer Tikka", price: 240, quantity: 1, instructions: "", isVeg: true },
      { id: "item-dal-makhani", name: "Dal Makhani Grand", price: 210, quantity: 1, instructions: "", isVeg: true },
      { id: "item-garlic-naan", name: "Tandoori Garlic Naan", price: 65, quantity: 3, instructions: "", isVeg: true }
    ],
    subtotal: 645,
    tax: 32.25,
    total: 677.25,
    status: "COMPLETED",
    specialInstructions: "Mild spice",
    paymentMethod: "ONLINE",
    paymentStatus: "PAID",
    createdAt: new Date(Date.now() - 75 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    history: [
      { status: "NEW", time: new Date(Date.now() - 75 * 60 * 1000).toISOString() },
      { status: "ACCEPTED", time: new Date(Date.now() - 70 * 60 * 1000).toISOString() },
      { status: "PREPARING", time: new Date(Date.now() - 65 * 60 * 1000).toISOString() },
      { status: "READY", time: new Date(Date.now() - 50 * 60 * 1000).toISOString() },
      { status: "SERVED", time: new Date(Date.now() - 45 * 60 * 1000).toISOString() },
      { status: "COMPLETED", time: new Date(Date.now() - 30 * 60 * 1000).toISOString() }
    ]
  }
];

const DEFAULT_INVOICES = [
  {
    id: "INV-2026-001039",
    orderId: "ORD-1039",
    tableNumber: "03",
    subtotal: 645,
    tax: 32.25,
    total: 677.25,
    paymentMethod: "ONLINE",
    paymentStatus: "PAID",
    items: DEFAULT_ORDERS[1].items,
    createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString()
  }
];

const DEFAULT_STAFF = [
  { email: "admin@demo.com", role: "admin", name: "Restaurant Manager" },
  { email: "kitchen@demo.com", role: "kitchen", name: "Head Chef" },
  { email: "waiter@demo.com", role: "waiter", name: "Lead Floor Steward" }
];

// ==========================================
// INITIALIZATION & RESET
// ==========================================

function seedInitialData(force = false) {
  if (force || !localStorage.getItem(STORAGE_KEYS.TABLES)) {
    localStorage.setItem(STORAGE_KEYS.TABLES, JSON.stringify(DEFAULT_TABLES));
  }
  if (force || !localStorage.getItem(STORAGE_KEYS.CATEGORIES)) {
    localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(DEFAULT_CATEGORIES));
  }
  if (force || !localStorage.getItem(STORAGE_KEYS.MENU)) {
    localStorage.setItem(STORAGE_KEYS.MENU, JSON.stringify(DEFAULT_MENU));
  }
  if (force || !localStorage.getItem(STORAGE_KEYS.ORDERS)) {
    localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(DEFAULT_ORDERS));
  }
  if (force || !localStorage.getItem(STORAGE_KEYS.INVOICES)) {
    localStorage.setItem(STORAGE_KEYS.INVOICES, JSON.stringify(DEFAULT_INVOICES));
  }
  if (force || !localStorage.getItem(STORAGE_KEYS.SETTINGS)) {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(DEFAULT_SETTINGS));
  }
  if (force || !localStorage.getItem(STORAGE_KEYS.STAFF)) {
    localStorage.setItem(STORAGE_KEYS.STAFF, JSON.stringify(DEFAULT_STAFF));
  }
}

function resetDemoData() {
  localStorage.removeItem(STORAGE_KEYS.TABLES);
  localStorage.removeItem(STORAGE_KEYS.CATEGORIES);
  localStorage.removeItem(STORAGE_KEYS.MENU);
  localStorage.removeItem(STORAGE_KEYS.ORDERS);
  localStorage.removeItem(STORAGE_KEYS.INVOICES);
  localStorage.removeItem(STORAGE_KEYS.PAYMENTS);
  localStorage.removeItem(STORAGE_KEYS.SETTINGS);
  localStorage.removeItem(STORAGE_KEYS.STAFF);
  // Clear any table carts
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith(STORAGE_KEYS.CART_PREFIX)) {
      localStorage.removeItem(k);
    }
  }
  seedInitialData(true);
  notifyStorageChange('RESET_ALL', null);
}

// Automatically seed on script load if uninitialized
seedInitialData();

// ==========================================
// TABLES REPO
// ==========================================

function getTables() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.TABLES)) || [];
  } catch (e) {
    console.error("Error reading tables from storage:", e);
    return [];
  }
}

function saveTables(tables) {
  localStorage.setItem(STORAGE_KEYS.TABLES, JSON.stringify(tables));
  notifyStorageChange(STORAGE_KEYS.TABLES, tables);
}

function getTableById(id) {
  return getTables().find(t => t.id === id) || null;
}

function getTableByNumber(num) {
  if (!num) return null;
  const normalized = String(num).padStart(2, '0');
  return getTables().find(t => String(t.number).padStart(2, '0') === normalized) || null;
}

/**
 * Creates table, generates unique ID, and creates QR link
 */
function addTable(tableData) {
  const tables = getTables();
  const rawNum = String(tableData.number || "").trim();
  const formattedNum = rawNum.length === 1 ? '0' + rawNum : rawNum;
  
  // Check duplicate
  if (tables.some(t => String(t.number).padStart(2, '0') === formattedNum.padStart(2, '0'))) {
    throw new Error(`Table ${formattedNum} already exists!`);
  }

  const id = `table-${formattedNum}`;
  const newTable = {
    id,
    number: formattedNum,
    capacity: parseInt(tableData.capacity, 10) || 4,
    status: tableData.status || "available",
    activeOrderId: null,
    createdAt: new Date().toISOString()
  };

  tables.push(newTable);
  saveTables(tables);
  return newTable;
}

function updateTable(id, updates) {
  const tables = getTables();
  const idx = tables.findIndex(t => t.id === id);
  if (idx !== -1) {
    tables[idx] = { ...tables[idx], ...updates, updatedAt: new Date().toISOString() };
    saveTables(tables);
    return tables[idx];
  }
  return null;
}

function deleteTable(id) {
  const tables = getTables().filter(t => t.id !== id);
  saveTables(tables);
}

// ==========================================
// CATEGORIES REPO
// ==========================================

function getCategories() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.CATEGORIES)) || [];
  } catch (e) {
    return [];
  }
}

function saveCategories(cats) {
  localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(cats));
  notifyStorageChange(STORAGE_KEYS.CATEGORIES, cats);
}

function addCategory(cat) {
  const cats = getCategories();
  const id = `cat-${cat.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${Date.now().toString(36)}`;
  const newCat = {
    id,
    name: cat.name,
    icon: cat.icon || "bi-tag",
    order: cats.length + 1,
    enabled: true
  };
  cats.push(newCat);
  saveCategories(cats);
  return newCat;
}

function updateCategory(id, updates) {
  const cats = getCategories();
  const idx = cats.findIndex(c => c.id === id);
  if (idx !== -1) {
    cats[idx] = { ...cats[idx], ...updates };
    saveCategories(cats);
    return cats[idx];
  }
  return null;
}

function deleteCategory(id) {
  const cats = getCategories().filter(c => c.id !== id);
  saveCategories(cats);
}

// ==========================================
// MENU REPO
// ==========================================

function getMenu() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.MENU)) || [];
  } catch (e) {
    return [];
  }
}

function saveMenu(menu) {
  localStorage.setItem(STORAGE_KEYS.MENU, JSON.stringify(menu));
  notifyStorageChange(STORAGE_KEYS.MENU, menu);
}

function getMenuItem(id) {
  return getMenu().find(i => i.id === id) || null;
}

function addMenuItem(item) {
  const menu = getMenu();
  const id = `item-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
  const newItem = {
    id,
    name: item.name,
    category: item.category,
    categoryId: item.categoryId || "cat-starters",
    price: parseFloat(item.price) || 0,
    description: item.description || "",
    isVeg: Boolean(item.isVeg),
    isBestseller: Boolean(item.isBestseller),
    inStock: item.inStock !== false,
    prepTime: item.prepTime || "15 mins",
    image: item.image || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80"
  };
  menu.push(newItem);
  saveMenu(menu);
  return newItem;
}

function updateMenuItem(id, updates) {
  const menu = getMenu();
  const idx = menu.findIndex(i => i.id === id);
  if (idx !== -1) {
    menu[idx] = { ...menu[idx], ...updates };
    saveMenu(menu);
    return menu[idx];
  }
  return null;
}

function deleteMenuItem(id) {
  const menu = getMenu().filter(i => i.id !== id);
  saveMenu(menu);
}

// ==========================================
// ORDERS REPO
// ==========================================

function getOrders() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.ORDERS)) || [];
  } catch (e) {
    return [];
  }
}

function saveOrders(orders) {
  localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(orders));
  notifyStorageChange(STORAGE_KEYS.ORDERS, orders);
}

function getOrderById(id) {
  return getOrders().find(o => o.id === id) || null;
}

function getOrdersByTable(tableNum) {
  const norm = String(tableNum).padStart(2, '0');
  return getOrders().filter(o => String(o.tableNumber).padStart(2, '0') === norm);
}

function getActiveOrderByTable(tableNum) {
  const norm = String(tableNum).padStart(2, '0');
  const activeStatuses = ['NEW', 'ACCEPTED', 'PREPARING', 'READY', 'SERVED'];
  return getOrders().find(o => String(o.tableNumber).padStart(2, '0') === norm && activeStatuses.includes(o.status)) || null;
}

function generateOrderId() {
  const orders = getOrders();
  let maxNum = 1042;
  orders.forEach(o => {
    if (o.id && o.id.startsWith("ORD-")) {
      const num = parseInt(o.id.replace("ORD-", ""), 10);
      if (!isNaN(num) && num > maxNum) maxNum = num;
    }
  });
  return `ORD-${maxNum + 1}`;
}

/**
 * Creates a new order in localStorage
 */
function createOrder(orderPayload) {
  const settings = getSettings();
  const taxRate = settings.taxRate || 5.0;
  const orderId = generateOrderId();
  const tableNum = String(orderPayload.tableNumber || "01").padStart(2, '0');
  const table = getTableByNumber(tableNum);
  const tableId = table ? table.id : `table-${tableNum}`;

  let subtotal = 0;
  const sanitizedItems = (orderPayload.items || []).map(item => {
    const qty = Math.max(1, parseInt(item.quantity, 10) || 1);
    const itemPrice = parseFloat(item.price) || 0;
    subtotal += itemPrice * qty;
    return {
      id: item.id,
      name: item.name,
      price: itemPrice,
      quantity: qty,
      instructions: item.instructions || "",
      isVeg: Boolean(item.isVeg)
    };
  });

  const tax = Math.round((subtotal * (taxRate / 100)) * 100) / 100;
  const total = Math.round((subtotal + tax) * 100) / 100;

  const newOrder = {
    id: orderId,
    tableId,
    tableNumber: tableNum,
    items: sanitizedItems,
    subtotal,
    tax,
    total,
    status: "NEW", // NEW -> ACCEPTED -> PREPARING -> READY -> SERVED -> COMPLETED
    specialInstructions: orderPayload.specialInstructions || "",
    paymentMethod: null,
    paymentStatus: "UNPAID",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    history: [
      { status: "NEW", time: new Date().toISOString() }
    ]
  };

  const orders = getOrders();
  orders.unshift(newOrder); // newest first
  saveOrders(orders);

  // Update table status to occupied and associate active order
  if (table) {
    updateTable(table.id, {
      status: "occupied",
      activeOrderId: orderId
    });
  }

  // Clear customer cart for this table
  clearCart(tableNum);

  return newOrder;
}

function updateOrderStatus(orderId, newStatus) {
  const orders = getOrders();
  const idx = orders.findIndex(o => o.id === orderId);
  if (idx !== -1) {
    const order = orders[idx];
    order.status = newStatus;
    order.updatedAt = new Date().toISOString();
    order.history = order.history || [];
    order.history.push({ status: newStatus, time: new Date().toISOString() });

    // If completed or cancelled, free table
    if (newStatus === "COMPLETED" || newStatus === "CANCELLED") {
      const table = getTableByNumber(order.tableNumber);
      if (table && table.activeOrderId === orderId) {
        updateTable(table.id, {
          status: "available",
          activeOrderId: null
        });
      }
    }

    saveOrders(orders);
    return order;
  }
  return null;
}

function updateOrderPayment(orderId, paymentMethod, paymentStatus) {
  const orders = getOrders();
  const idx = orders.findIndex(o => o.id === orderId);
  if (idx !== -1) {
    const order = orders[idx];
    order.paymentMethod = paymentMethod;
    order.paymentStatus = paymentStatus;
    order.updatedAt = new Date().toISOString();

    if (paymentStatus === "PAID") {
      // Auto create or update tax invoice
      createInvoice(order, paymentMethod);
      // If served, mark as COMPLETED
      if (order.status === "SERVED") {
        order.status = "COMPLETED";
        order.history = order.history || [];
        order.history.push({ status: "COMPLETED", time: new Date().toISOString() });
        const table = getTableByNumber(order.tableNumber);
        if (table && table.activeOrderId === orderId) {
          updateTable(table.id, { status: "available", activeOrderId: null });
        }
      }
    }

    saveOrders(orders);
    return order;
  }
  return null;
}

// ==========================================
// INVOICES & PAYMENTS REPO
// ==========================================

function getInvoices() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.INVOICES)) || [];
  } catch (e) {
    return [];
  }
}

function saveInvoices(invoices) {
  localStorage.setItem(STORAGE_KEYS.INVOICES, JSON.stringify(invoices));
  notifyStorageChange(STORAGE_KEYS.INVOICES, invoices);
}

function getInvoiceById(id) {
  return getInvoices().find(i => i.id === id) || null;
}

function getInvoiceByOrderId(orderId) {
  return getInvoices().find(i => i.orderId === orderId) || null;
}

function generateInvoiceId(orderId) {
  const cleanId = orderId ? orderId.replace("ORD-", "") : Date.now().toString().slice(-4);
  const year = new Date().getFullYear();
  return `INV-${year}-00${cleanId}`;
}

function createInvoice(order, paymentMethod = "ONLINE") {
  const invoices = getInvoices();
  const existing = invoices.find(inv => inv.orderId === order.id);
  if (existing) {
    existing.paymentStatus = "PAID";
    existing.paymentMethod = paymentMethod;
    existing.paidAt = new Date().toISOString();
    saveInvoices(invoices);
    return existing;
  }

  const invoiceId = generateInvoiceId(order.id);
  const newInvoice = {
    id: invoiceId,
    orderId: order.id,
    tableNumber: order.tableNumber,
    items: order.items,
    subtotal: order.subtotal,
    tax: order.tax,
    total: order.total,
    paymentMethod,
    paymentStatus: "PAID",
    createdAt: new Date().toISOString(),
    paidAt: new Date().toISOString()
  };

  invoices.unshift(newInvoice);
  saveInvoices(invoices);
  return newInvoice;
}

// ==========================================
// CART REPO (Per table number)
// ==========================================

function getCartKey(tableNum) {
  const norm = String(tableNum || "01").padStart(2, '0');
  return `${STORAGE_KEYS.CART_PREFIX}${norm}`;
}

function getCart(tableNum) {
  try {
    const raw = localStorage.getItem(getCartKey(tableNum));
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function saveCart(tableNum, cartItems) {
  const key = getCartKey(tableNum);
  localStorage.setItem(key, JSON.stringify(cartItems));
  notifyStorageChange(key, cartItems);
}

function clearCart(tableNum) {
  const key = getCartKey(tableNum);
  localStorage.removeItem(key);
  notifyStorageChange(key, []);
}

// ==========================================
// SETTINGS REPO
// ==========================================

function getSettings() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.SETTINGS)) || DEFAULT_SETTINGS;
  } catch (e) {
    return DEFAULT_SETTINGS;
  }
}

function saveSettings(settings) {
  localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  notifyStorageChange(STORAGE_KEYS.SETTINGS, settings);
}

// Export functions to window for global access
window.RestaurantStorage = {
  getTables,
  saveTables,
  getTableById,
  getTableByNumber,
  addTable,
  updateTable,
  deleteTable,
  getCategories,
  saveCategories,
  addCategory,
  updateCategory,
  deleteCategory,
  getMenu,
  saveMenu,
  getMenuItem,
  addMenuItem,
  updateMenuItem,
  deleteMenuItem,
  getOrders,
  saveOrders,
  getOrderById,
  getOrdersByTable,
  getActiveOrderByTable,
  createOrder,
  updateOrderStatus,
  updateOrderPayment,
  getInvoices,
  saveInvoices,
  getInvoiceById,
  getInvoiceByOrderId,
  createInvoice,
  getCart,
  saveCart,
  clearCart,
  getSettings,
  saveSettings,
  seedInitialData,
  resetDemoData
};
