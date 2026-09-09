/**
 * VoiceBite Multilingual NLP Parser
 * Handles: Urdu script, Roman Urdu, Hindi, Hinglish, English
 * No API needed — fully offline.
 */

// ── Number recognition ────────────────────────────────────────────────────────
const NUMBERS = {
  // Urdu script
  'ایک': 1, 'دو': 2, 'تین': 3, 'چار': 4, 'پانچ': 5,
  'چھ': 6, 'سات': 7, 'آٹھ': 8, 'نو': 9, 'دس': 10,
  // Roman Urdu / Hindi
  'ek': 1, 'ek aadha': 1, 'do': 2, 'teen': 3, 'char': 4, 'paanch': 5,
  'chhe': 6, 'chay': 6, 'saat': 7, 'aath': 8, 'nau': 9, 'das': 10,
  // English
  'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5,
  'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10,
  'a': 1, 'an': 1, 'couple': 2, 'double': 2, 'single': 1,
};

// ── Urdu script food name aliases → canonical English name ──────────────────
const URDU_ALIASES = {
  'پیزا': 'pizza', 'پزا': 'pizza', 'پیتزا': 'pizza',
  'برگر': 'burger', 'بر گر': 'burger',
  'بریانی': 'biryani', 'برياني': 'biryani',
  'نوڈلز': 'noodles', 'نوڈل': 'noodles',
  'رائس': 'rice', 'چاول': 'rice',
  'فرائز': 'fries', 'فریز': 'fries',
  'سیندوچ': 'sandwich', 'سینڈوچ': 'sandwich',
  'رول': 'roll', 'شاورما': 'shawarma',
  'چکن': 'chicken', 'مرغی': 'chicken',
  'سلاد': 'salad', 'سوپ': 'soup',
  'چائے': 'tea', 'چاے': 'tea',
  'کافی': 'coffee', 'قہوہ': 'coffee',
  'جوس': 'juice', 'مشروب': 'drink', 'کولڈ ڈرنک': 'cold drink',
  'پانی': 'water', 'لسی': 'lassi',
  'کباب': 'kabab', 'ٹکہ': 'tikka', 'کڑاہی': 'karahi',
  'سموسہ': 'samosa', 'سموسے': 'samosa',
  'دال': 'dal', 'سالن': 'curry',
};

// ── Greeting patterns ────────────────────────────────────────────────────────
const GREETING_RX = [
  /\b(hi|hello|hey|howdy|hola)\b/i,
  /\b(assalam|salam|salaam|assalamualaikum)\b/i,
  /(السلام|سلام|ہیلو|ہائے)/,
  /\b(namaste|namaskar|sat sri akal)\b/i,
];

// ── Menu query patterns ───────────────────────────────────────────────────────
const MENU_RX = [
  /\b(menu|what.*(have|got|available|offer)|show.*menu|list.*items?)\b/i,
  /\b(kya hai|kya kya|kya milega|kya available|menu batao|menu dikhao)\b/i,
  /(مینو|کیا ہے|کیا کیا|کیا ملے گا)/,
];

// ── Order intent patterns ─────────────────────────────────────────────────────
const ORDER_RX = [
  // English
  /\b(want|like|order|give|get|bring|need|have|take|can i (get|have|order))\b/i,
  // Roman Urdu / Hinglish
  /\b(chahiye|chaye|mangna|mangta|dena|la[oo]|lena|mujhe|mughay|muje|de do|kar do)\b/i,
  /\b(order karna|order kar|lana|lao|dedo|milega)\b/i,
  // Urdu script
  /(چاہیے|چاہئے|چاہيے|لاؤ|دے دو|مجھے|مجهے|آرڈر|منگوا)/,
];

// ── Non-food patterns ─────────────────────────────────────────────────────────
const NON_FOOD_RX = [
  /\b(weather|time|date|news|music|play|stop|call|message|sms|wifi|battery)\b/i,
  /\b(mausam|waqt|time batao|call karo)\b/i,
];

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Normalize a string: lower-case, strip diacritics, collapse spaces */
const norm = (s) => s.toLowerCase().replace(/[\u064b-\u065f]/g, '').replace(/\s+/g,' ').trim();

/** Translate any Urdu script words in text to English equivalents */
const translateUrdu = (text) => {
  let out = text;
  for (const [urdu, eng] of Object.entries(URDU_ALIASES)) {
    if (out.includes(urdu)) out = out.replaceAll(urdu, eng);
  }
  return out;
};

/** Pick number just before (or after) a keyword */
const extractQty = (words, itemIdx) => {
  // look 1-3 positions before the item name
  for (let offset = 1; offset <= 3; offset++) {
    const candidate = words[itemIdx - offset];
    if (!candidate) continue;
    const parsed = parseInt(candidate);
    if (!isNaN(parsed) && parsed > 0) return parsed;
    const fromMap = NUMBERS[norm(candidate)];
    if (fromMap) return fromMap;
  }
  return 1; // default: 1
};

/** Fuzzy match: does `spoken` match `menuName`? */
const matches = (spoken, menuName) => {
  const s = norm(spoken), m = norm(menuName);
  return s === m || s.includes(m) || m.includes(s) ||
    // Handle plurals: pizza/pizzas, burger/burgers
    s.includes(m.replace(/s$/, '')) || m.includes(s.replace(/s$/, ''));
};

// ── Intent detection ──────────────────────────────────────────────────────────
const detectIntent = (text) => {
  if (GREETING_RX.some(r => r.test(text))) return 'greeting';
  if (MENU_RX.some(r => r.test(text))) return 'menu_query';
  if (NON_FOOD_RX.some(r => r.test(text))) return 'non_food';
  if (ORDER_RX.some(r => r.test(text))) return 'order';
  // If any menu item name is spoken, treat as order attempt
  return 'unknown';
};

// ── Main parser ───────────────────────────────────────────────────────────────
export const parseOrder = (rawText, menuItems = []) => {
  // Step 1: translate Urdu script → English food names
  const translated = translateUrdu(rawText);
  const text = translated;
  const words = norm(translated).split(' ');

  const intent = detectIntent(text);
  const order = [];
  let total = 0;

  // Step 2: find menu items mentioned in the text
  for (const item of menuItems) {
    const itemWords = norm(item.name).split(' ');
    // Check if item name appears anywhere in the words
    const matchIdx = words.findIndex((_, i) =>
      itemWords.every((iw, j) => words[i + j] && matches(words[i + j], iw))
    );
    if (matchIdx === -1) continue;

    const qty = extractQty(words, matchIdx);
    order.push({ name: item.name, quantity: qty, price: item.price });
    total += item.price * qty;
  }

  return { intent: order.length > 0 ? 'order' : intent, order, total };
};

// ── Response generator ────────────────────────────────────────────────────────
const GREET = [
  "Salam! 🌟 Welcome to VoiceBite! What would you like to order today?",
  "Hello! 😊 Great to have you! Ready to take your order — what sounds good?",
  "Assalamualaikum! 🍽️ Welcome! Tell me what you'd like and I'll get it sorted.",
  "Hi there! 👋 I'm your AI waiter. What can I get for you today?",
];

const DONT_KNOW = [
  "I didn't quite catch that. Try saying something like 'I want two burgers' or in Urdu: 'مجھے دو برگر چاہیے'",
  "Hmm, I'm not sure I understood. Could you say what you'd like to order? You can speak Urdu or English.",
  "Sorry, could you repeat that? Try 'ek pizza dena' or 'one pizza please'.",
];

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

export const generateResponse = (result, menuItems = []) => {
  const { intent, order, total } = result;

  if (intent === 'greeting') return pick(GREET);

  if (intent === 'menu_query') {
    const sample = menuItems.slice(0, 5).map(m => `${m.name} (Rs ${m.price})`).join(', ');
    return `Here's what we have: ${sample}${menuItems.length > 5 ? ` and ${menuItems.length - 5} more items` : ''}. What would you like?`;
  }

  if (intent === 'non_food') {
    return "I can only help with food orders! 😄 What would you like to eat or drink today?";
  }

  if (intent === 'order' && order.length > 0) {
    const items = order.map(i => `${i.quantity} × ${i.name}`).join(', ');
    const responses = [
      `Perfect! Got your order: ${items}. Total is Rs ${total}. Anything else?`,
      `Great choice! ${items} coming right up! That'll be Rs ${total}. 🎉`,
      `Noted! ${items} — Rs ${total}. Your order is placed! Shall I add anything?`,
    ];
    return pick(responses);
  }

  return pick(DONT_KNOW);
};