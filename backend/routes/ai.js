import { Router } from "express";

const router = Router();

// Word numbers to numeric mapping
const WORD_TO_NUM = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  ek: 1, do: 2, teen: 3, char: 4, paanch: 5, chhe: 6, saath: 7, aath: 8, nau: 9, das: 10
};

const matchItems = (parsed, menu) => {
  const order = [];
  let total = 0;

  for (const item of parsed.items || []) {
    let rawName = (item.name || "").toLowerCase().trim();
    if (!rawName) continue;

    // Normalize plurals (e.g., "burgers" -> "burger", "pizzas" -> "pizza")
    let singularName = rawName.endsWith("s") && !rawName.endsWith("ss") && rawName !== "fries"
      ? rawName.replace(/s$/, "")
      : rawName;

    // Strict exact matching against menu items
    const found = menu.find((m) => {
      const mName = m.name.toLowerCase().trim();
      return mName === rawName || mName === singularName;
    });

    if (found) {
      let qty = parseInt(item.quantity);
      if (isNaN(qty) || qty <= 0) {
        qty = WORD_TO_NUM[String(item.quantity).toLowerCase()] || 1;
      }

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

// ── POST /api/voice-parse ─────────────────────────────────────────────────────
router.post("/voice-parse", async (req, res) => {
  const { transcript, menu = [] } = req.body;
  if (!transcript) return res.status(400).json({ error: "No transcript provided" });

  const GEMINI_KEY = process.env.GEMINI_API_KEY;
  if (!GEMINI_KEY) {
    return res.status(500).json({ error: "GEMINI_API_KEY is missing" });
  }

  const menuStr = menu.map((m) => `"${m.name}"`).join(", ");

  const systemPrompt = `You are a strict food order parser for VoiceBite restaurant.
Available menu items: ${menuStr}

CRITICAL INSTRUCTIONS:
1. Extract ONLY food/drink items explicitly requested in the transcript.
2. Normalize names to the exact singular menu item names (e.g. "burger" for "burgers", "pizza" for "pizzas").
3. Convert word numbers like "two", "three", "do", "teen" into integers (2, 3).
4. NEVER add extra items that were not ordered.
5. Respond strictly in valid raw JSON with this schema:
{
  "intent": "order|greeting|menu_query|non_food|unclear",
  "items": [{"name": "exact menu item name", "quantity": 1}],
  "message": "Short friendly order confirmation"
}`;

  try {
    // Updated endpoint to active gemini-3.6-flash model
    const gemUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${GEMINI_KEY}`;
    const gmRes = await fetch(gemUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: `${systemPrompt}\n\nCustomer said: "${transcript}"` }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 1000,
          responseMimeType: "application/json"
        }
      })
    });

    const gmData = await gmRes.json();
    if (!gmRes.ok) {
      console.error("Gemini API Error:", gmData?.error?.message || JSON.stringify(gmData));
      return res.json({ intent: "no_ai", items: [], message: "" });
    }

    let raw = gmData.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
    raw = raw.replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim();

    let parsed = null;
    try {
      parsed = JSON.parse(raw);
    } catch (err) {
      console.warn("JSON parse error from Gemini output:", raw);
      return res.json({ intent: "no_ai", items: [], message: "" });
    }

    if (parsed?.intent) {
      const { order, total } = matchItems(parsed, menu);
      return res.json({
        intent: parsed.intent,
        items: order,
        total,
        message: parsed.message
      });
    }

    return res.json({ intent: "no_ai", items: [], message: "" });
  } catch (err) {
    console.warn("Gemini service error:", err.message);
    return res.json({ intent: "no_ai", items: [], message: "" });
  }
});

export default router;