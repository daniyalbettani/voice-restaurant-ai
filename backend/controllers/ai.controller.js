import { asyncHandler } from "../utils/asyncHandler.js";

// Word numbers → integer (Urdu + Roman Urdu + English)
const WORD_TO_NUM = {
  // English
  one: 1, two: 2, three: 3, four: 4, five: 5,
  six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  a: 1, an: 1, couple: 2, double: 2, single: 1,
  // Roman Urdu / Hindi
  ek: 1, do: 2, teen: 3, char: 4, paanch: 5,
  chhe: 6, chay: 6, saat: 7, aath: 8, nau: 9, das: 10,
  // Urdu script numbers
  "ایک": 1, "دو": 2, "تین": 3, "چار": 4, "پانچ": 5,
  "چھ": 6, "سات": 7, "آٹھ": 8, "نو": 9, "دس": 10,
};

/**
 * Match Gemini-returned items against the real menu.
 * Uses fuzzy matching so "biryani" finds "Chicken Biryani",
 * "burger" finds "Beef Burger", etc.
 */
const matchItems = (parsed, menu) => {
  const order = [];
  let total = 0;

  for (const item of parsed.items || []) {
    const rawName = (item.name || "").toLowerCase().trim();
    if (!rawName) continue;

    // Resolve quantity (Gemini sometimes returns a word string)
    let qty = parseInt(item.quantity);
    if (isNaN(qty) || qty <= 0) {
      qty = WORD_TO_NUM[String(item.quantity).toLowerCase()] || 1;
    }

    // Fuzzy match: try exact first, then substring both ways, then word-overlap
    const found = menu.find((m) => {
      const mName = m.name.toLowerCase().trim();
      const mWords = mName.split(/\s+/);
      const rWords = rawName.split(/\s+/);

      return (
        mName === rawName ||                              // exact
        mName === rawName.replace(/s$/, "") ||           // plural strip
        rawName === mName.replace(/s$/, "") ||
        mName.includes(rawName) ||                       // "Chicken Biryani" includes "biryani"
        rawName.includes(mName) ||                       // spoken name includes menu name
        rWords.some(rw => mWords.some(mw =>              // any word overlap
          mw === rw || mw.startsWith(rw) || rw.startsWith(mw)
        ))
      );
    });

    if (found) {
      const existing = order.find((o) => o.name === found.name);
      if (existing) {
        existing.quantity += qty;
      } else {
        order.push({ name: found.name, quantity: qty, price: found.price });
      }
      total += found.price * qty;
    }
  }

  return { order, total };
};

export const voiceParser = asyncHandler(async (req, res) => {
  const { transcript, menu = [] } = req.body;
  if (!transcript)
    return res.status(400).json({ error: "No transcript provided" });

  const GEMINI_KEY = process.env.GEMINI_API_KEY;
  if (!GEMINI_KEY) {
    return res.status(500).json({ error: "GEMINI_API_KEY is missing" });
  }

  const menuStr = menu.map((m) => `"${m.name}" (Rs ${m.price})`).join(", ");

  const systemPrompt = `You are a food order parser for VoiceBite restaurant in Pakistan.
The customer may speak in English, Roman Urdu (e.g. "mujhe do burger chahiye"), or Urdu script (مجھے دو برگر چاہیے).

Available menu items: ${menuStr}

RULES:
1. Detect intent: "order", "greeting", "menu_query", "non_food", or "unclear".
2. For "order" intent: extract every food/drink item the customer mentioned.
3. Match item names to the closest menu item above — handle plurals, Urdu words, and partial names (e.g. "biryani" → match "Chicken Biryani").
4. Convert word quantities to integers: "do"/"two" → 2, "teen"/"three" → 3, "ek"/"one" → 1, etc.
5. Write a short, friendly confirmation message in English.
6. Respond ONLY with valid raw JSON — no markdown, no explanation.

JSON schema:
{
  "intent": "order",
  "items": [{"name": "exact menu item name from the list above", "quantity": 2}],
  "message": "Got it! 2 Chicken Biryani and 1 Burger coming right up!"
}`;

  try {
    // gemini-2.0-flash is the correct current model name
    const gemUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`;

    const gmRes = await fetch(gemUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: `${systemPrompt}\n\nCustomer said: "${transcript}"` },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 512,
          responseMimeType: "application/json",
        },
      }),
    });

    const gmData = await gmRes.json();

    if (!gmRes.ok) {
      console.error(
        "Gemini API Error:",
        gmData?.error?.message || JSON.stringify(gmData),
      );
      return res.json({ intent: "no_ai", items: [], message: "" });
    }

    let raw =
      gmData.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";

    // Strip any accidental markdown code fences
    raw = raw
      .replace(/^```json\s*/i, "")
      .replace(/```\s*$/i, "")
      .trim();

    let parsed = null;
    try {
      parsed = JSON.parse(raw);
    } catch (err) {
      console.warn("JSON parse error from Gemini output:", raw);
      return res.json({ intent: "no_ai", items: [], message: "" });
    }

    if (parsed?.intent) {
      const { order, total } = matchItems(parsed, menu);

      // If Gemini says "order" but we couldn't match any items, still keep the
      // intent so the offline parser gets a chance in the frontend fallback
      return res.json({
        intent: order.length > 0 ? parsed.intent : "no_ai",
        items: order,
        total,
        message: parsed.message || "",
      });
    }

    return res.json({ intent: "no_ai", items: [], message: "" });
  } catch (err) {
    console.warn("Gemini service error:", err.message);
    return res.json({ intent: "no_ai", items: [], message: "" });
  }
});
