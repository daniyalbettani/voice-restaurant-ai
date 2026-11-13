// The aiContextFormatter is simply a translator. It takes messy database objects and translates them into clean, human-readable text that the AI can understand instantly.

/**
 * Formats a user's recent order history into a structured text string
 * optimized for the Voice AI prompt context.
 *
 * @param {Array} orders - Array of Mongoose Order documents (sorted newest first)
 * @param {number} limit - Maximum number of recent orders to include (default: 3)
 * @returns {string} Formatted prompt-ready string
 */
export const formatOrderHistoryForAI = (orders = [], limit = 3) => {
  if (!orders || orders.length === 0) {
    return "USER ORDER HISTORY: No previous orders found.";
  }

  // Take only the N most recent orders to optimize token usage
  const recentOrders = orders.slice(0, limit);

  const formattedOrders = recentOrders
    .map((order, index) => {
      // Format timestamp (e.g., "Nov 8, 2026")
      const orderDate = new Date(order.createdAt).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });

      // Format individual item line items
      const itemsList = order.items
        .map(
          (item) =>
            `    * ${item.quantity}x ${item.name} ($${item.price.toFixed(2)} each)`,
        )
        .join("\n");

      return `ORDER #${index + 1}
  * Order ID: ${order._id}
  * Date: ${orderDate}
  * Status: ${order.orderStatus}
  * Payment Status: ${order.paymentStatus}
  * Total Amount: $${order.totalAmount.toFixed(2)}
  * Items:
${itemsList}`;
    })
    .join("\n\n");

  return `=== RECENT ORDER HISTORY (NEWEST FIRST) ===\n${formattedOrders}\n===========================================`;
};
