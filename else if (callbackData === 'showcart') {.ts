else if (callbackData === 'showcart') {
  console.log('Showing cart');
  console.log("THEREE");

  // Create a map to track the quantity of each product
  const productQuantityMap = new Map();

  for (const product of cartItems) {
    if (productQuantityMap.has(product.name)) {
      productQuantityMap.set(product.name, productQuantityMap.get(product.name) + 1);
    } else {
      productQuantityMap.set(product.name, 1);
    }
  }

  let totalPrice = 0;

  // Prepare the cart items for display
  let cartMessage = '🍔 **Burger King Cart** 🛒\n\n';

  if (cartItems.length === 0) {
    cartMessage += 'Your cart is empty.';
  } else {
    const uniqueItems = Array.from(productQuantityMap.keys());
    uniqueItems.forEach((item, index) => {
      const quantity = productQuantityMap.get(item);
      const product = cartItems.find((product) => product.name === item);
      const itemTotalPrice = product.amount * quantity;

      cartMessage += `🍔 **Item ${index + 1}:** (Quantity: ${quantity})\n`;
      cartMessage += `   **Name:** ${item}\n`;
      cartMessage += `   **Description:** ${product.description}\n`;
      cartMessage += `   **Price per item:** $${product.amount}\n`;
      cartMessage += `   **Total Price:** $${itemTotalPrice}\n`;
      cartMessage += `   **Image:** [Link](${product.image})\n\n`;

      totalPrice += itemTotalPrice;
    });

    // Add the total price to the cart message
    cartMessage += `**Total Price:** $${totalPrice}\n\n`;

    // Add the buttons to the cart message
    cartMessage += 'Click the **Buy** button to complete your purchase.\n\n';
  }

  // Define the buttons
  const buyButton = {
    text: `💰 Buy $${totalPrice} XOF`,
    callback_data: `buy_${totalPrice}`, // Include the total price in the callback data
  };

  const clearCartButton = {
    text: '🗑️ Clear Cart',
    callback_data: 'clearcart',
  };

  const continueShoppingButton = {
    text: '🛒 Continue Ordering',
    callback_data: 'continueshopping',
  };

  // Create an array of button rows
  const buttonRows = [];

  if (cartItems.length > 0) {
    buttonRows.push([clearCartButton]);
  }

  buttonRows.push([continueShoppingButton], [buyButton]);

  const cartMessageOptions = {
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: buttonRows,
    },
  };

  // Send the cart message with the buttons
  await ctx.replyWithPhoto({ url: cartItems[0].image }, { caption: cartMessage, ...cartMessageOptions });
}
