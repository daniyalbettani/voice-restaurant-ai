import { Order } from "../models/OrderSchema.model.js";
import { Cart } from "../models/CartSchema.model.js";
import { Menu } from "../models/MenuSchema.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { formatOrderHistoryForAI } from "../utils/aiContextFormatter.js";
import { generateGeminiJSON } from "../utils/gemini.js";

// Word numbers → integer (English + Roman Urdu + Urdu script support)
const WORD_TO_NUM = {
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  a: 1,
  an: 1,
  single: 1,
  double: 2,
  couple: 2,
  ek: 1,
  do: 2,
  teen: 3,
  char: 4,
  paanch: 5,
  chhe: 6,
  chay: 6,
  saat: 7,
  aath: 8,
  nau: 9,
  das: 10,
  ایک: 1,
  دو: 2,
  تین: 3,
  چار: 4,
  پانچ: 5,
  چھ: 6,
  سات: 7,
  آٹھ: 8,
  نو: 9,
  دس: 10,
};

/**
 * Helper 1: Fuzzy matches AI-returned dish name against live MongoDB Menu
 * (e.g., "biryani" matches "Chicken Biryani", "burger" matches "Zesty Cheese Burger")
 */
const findMatchingDish = (rawName, availableMenu) => {
  const cleanName = (rawName || "").toLowerCase().trim();
  if (!cleanName) return null;

  const rWords = cleanName.split(/\s+/);

  return availableMenu.find((m) => {
    const mName = m.name.toLowerCase().trim();
    const mWords = mName.split(/\s+/);

    return (
      mName === cleanName ||
      mName === cleanName.replace(/s$/, "") ||
      cleanName === mName.replace(/s$/, "") ||
      mName.includes(cleanName) ||
      cleanName.includes(mName) ||
      rWords.some((rw) =>
        mWords.some(
          (mw) => mw === rw || mw.startsWith(rw) || rw.startsWith(mw),
        ),
      )
    );
  });
};

/**
 * Helper 2: Recalculates cart total price using live Menu pricing
 */
const recalculateCartTotal = async (cart) => {
  let total = 0;
  for (const item of cart.items) {
    const dish = await Menu.findById(item.menuItem);
    if (dish) {
      total += Number(dish.price) * item.quantity;
    }
  }
  return total;
};

/**
 * @desc    Process user voice transcript with Gemini AI & execute DB + Socket actions
 * @route   POST /api/v1/ai/process-voice
 * @access  Private (Authenticated Users)
 */
export const processVoiceCommand = asyncHandler(async (req, res) => {
  const { transcript } = req.body;

  if (!transcript || transcript.trim() === "") {
    throw new ApiError(400, "Voice transcript is required.");
  }

  // =========================================================================
  // 1. CONTEXT GATHERING (Order History + Live Available Menu)
  // =========================================================================
  const userOrders = await Order.find({ user: req.user._id }).sort({
    createdAt: -1,
  });
  const formattedOrderHistory = formatOrderHistoryForAI(userOrders, 3);

  const availableMenu = await Menu.find({ isAvailable: true }).select(
    "name price category description",
  );
  const menuListString = availableMenu
    .map(
      (item) =>
        `- ${item.name} ($${Number(item.price).toFixed(2)}) [Category: ${item.category}]`,
    )
    .join("\n");

  // =========================================================================
  // 2. SYSTEM PROMPT FOR GEMINI AI
  // =========================================================================
  const systemPrompt = `
You are VoiceBite AI, an intelligent voice ordering assistant for a restaurant.
The customer may speak in English, Roman Urdu (e.g. "mujhe do burger chahiye"), or Urdu script.

LIVE AVAILABLE MENU:
${menuListString}

USER RECENT ORDER HISTORY:
${formattedOrderHistory}

USER VOICE TRANSCRIPT:
"${transcript}"

RULES:
1. Analyze the transcript and classify the user's intent into one of these exact values:
   - "ADD_TO_CART": User wants to add food/drinks to their cart.
   - "REORDER_LAST_MEAL": User wants to repeat or re-order their previous order.
   - "CHECK_STATUS": User is asking where their order is or checking order status.
   - "PLACE_ORDER": User wants to checkout, confirm, or place their current cart as an order.
   - "GENERAL_QUERY": Greetings, menu questions, or anything else.
2. For "ADD_TO_CART", match item names to the closest dish in LIVE AVAILABLE MENU and extract integer quantities.
3. Write a short, natural, friendly "speechResponse" in the same language style the user spoke (Roman Urdu or English).
4. Respond ONLY with valid raw JSON — no markdown, no backticks, no extra text.

JSON Structure:
{
  "intent": "ADD_TO_CART" | "REORDER_LAST_MEAL" | "CHECK_STATUS" | "PLACE_ORDER" | "GENERAL_QUERY",
  "items": [
    { "name": "Exact Dish Name from Menu", "quantity": 1 }
  ],
  "speechResponse": "Friendly spoken confirmation for the user"
}
`;

  // =========================================================================
  // 3. CALL GEMINI API (With Automatic Model Fallback)
  // =========================================================================
  let aiResponse;
  try {
    aiResponse = await generateGeminiJSON(systemPrompt);
  } catch (error) {
    throw new ApiError(500, `Gemini AI Error: ${error.message}`);
  }

  const { intent = "GENERAL_QUERY", items = [], speechResponse } = aiResponse;

  let actionTaken = intent;
  let voiceResponse = speechResponse || "Command processed.";
  let updatedCart = null;
  let placedOrder = null;

  // =========================================================================
  // 4. DATABASE EXECUTION BASED ON DETECTED INTENT
  // =========================================================================

  // --- INTENT A: REORDER_LAST_MEAL ---
  if (intent === "REORDER_LAST_MEAL") {
    if (userOrders.length === 0) {
      voiceResponse = "Aap ka koi purana order record nahi mila.";
    } else {
      const lastOrder = userOrders[0];

      let cart = await Cart.findOne({ user: req.user._id });
      if (!cart) {
        cart = new Cart({ user: req.user._id, items: [] });
      }

      for (const item of lastOrder.items) {
        if (!item.menuItem) continue;

        const existingIndex = cart.items.findIndex(
          (cItem) => cItem.menuItem.toString() === item.menuItem.toString(),
        );

        if (existingIndex > -1) {
          cart.items[existingIndex].quantity += item.quantity;
        } else {
          cart.items.push({ menuItem: item.menuItem, quantity: item.quantity });
        }
      }

      cart.totalAmount = await recalculateCartTotal(cart);
      await cart.save();
      await cart.populate("items.menuItem");

      updatedCart = cart;
    }
  }

  // --- INTENT B: ADD_TO_CART (With Fuzzy Matching & Word-to-Num) ---
  else if (intent === "ADD_TO_CART") {
    let cart = await Cart.findOne({ user: req.user._id });
    if (!cart) {
      cart = new Cart({ user: req.user._id, items: [] });
    }

    let matchedCount = 0;

    for (const aiItem of items) {
      const dish = findMatchingDish(aiItem.name, availableMenu);

      if (dish) {
        matchedCount++;
        let qty = parseInt(aiItem.quantity, 10);
        if (isNaN(qty) || qty <= 0) {
          qty = WORD_TO_NUM[String(aiItem.quantity).toLowerCase()] || 1;
        }

        const existingIndex = cart.items.findIndex(
          (cItem) => cItem.menuItem.toString() === dish._id.toString(),
        );

        if (existingIndex > -1) {
          cart.items[existingIndex].quantity += qty;
        } else {
          cart.items.push({ menuItem: dish._id, quantity: qty });
        }
      }
    }

    if (matchedCount === 0) {
      voiceResponse =
        "Mujhe aap ke bole hue items live menu mein nahi mile. Meherbani karke menu ke mutabiq dobara bolein.";
    } else {
      cart.totalAmount = await recalculateCartTotal(cart);
      await cart.save();
      await cart.populate("items.menuItem");
      updatedCart = cart;
    }
  }

  // --- INTENT C: CHECK_STATUS ---
  else if (intent === "CHECK_STATUS") {
    if (userOrders.length === 0) {
      voiceResponse = "Aap ne abhi tak koi order place nahi kiya hai.";
    } else {
      const latestOrder = userOrders[0];
      const lockNote = latestOrder.locked
        ? " aur chef cooking kar rahe hain"
        : "";
      voiceResponse = `Aap ke aakhri order ka status filhal ${latestOrder.orderStatus}${lockNote}.`;
    }
  }

  // --- INTENT D: PLACE_ORDER (Voice Checkout + Real-time Kitchen Socket) ---
  else if (intent === "PLACE_ORDER") {
    const cart = await Cart.findOne({ user: req.user._id }).populate(
      "items.menuItem",
    );

    if (!cart || cart.items.length === 0) {
      voiceResponse =
        "Aap ka cart abhi khaali hai! Pehle menu se items add karein.";
    } else {
      const orderItems = cart.items.map((item) => ({
        menuItem: item.menuItem._id,
        name: item.menuItem.name,
        price: Number(item.menuItem.price),
        quantity: item.quantity,
      }));

      const newOrder = await Order.create({
        user: req.user._id,
        items: orderItems,
        totalAmount: cart.totalAmount,
        source: "VOICE",
        paymentMethod: "COD",
        paymentStatus: "PENDING",
        orderStatus: "PENDING",
      });

      // Clear cart after order creation
      cart.items = [];
      cart.totalAmount = 0;
      await cart.save();

      // ⚡ REAL-TIME: Kitchen Dashboard par live notification bhejna
      const io = req.app.get("io");
      if (io) io.emit("newOrder", newOrder);

      updatedCart = cart;
      placedOrder = newOrder;
      voiceResponse = `Zabardast! Aap ka voice order place ho gaya hai. Total bill $${newOrder.totalAmount.toFixed(2)} hai.`;
    }
  }

  // =========================================================================
  // 5. RETURN UNIFIED RESPONSE TO FRONTEND
  // =========================================================================
  return res.status(200).json(
    new ApiResponse(
      200,
      {
        transcript,
        actionTaken,
        voiceResponse,
        cart: updatedCart,
        order: placedOrder,
        rawAIIntent: aiResponse,
      },
      "Voice command processed successfully",
    ),
  );
});
