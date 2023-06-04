require('dotenv').config();
const { Telegraf, Markup, Extra, Scenes, session } = require('telegraf');
const sharp = require('sharp');
const sizeOf = require('image-size');
const path = require('path');
const mongoose = require('mongoose');
// const { Telegraf } = require('telegraf');
// const botToken = '6076125294:AAG3sEl6ZzuHAo_VoHiunCnS4TdQmMX5yZQ';
// const bot = new Telegraf(botToken);
// const  ={Telegraf};
const { enter } = Scenes;
const sceneManager = new Scenes.Stage();
const startScene = new Scenes.BaseScene('startScene');
const axios = require('axios');
const express = require('express');
const { application } = require('express');
const serverApp = express();

const categoriesUrl = process.env.CATEGORY_URL;
const productUrl = process.env.MERCHANT_PRODUCT;
const api_token = process.env.API_TOKEN;
const merchant_id = process.env.MERCHANT_ID;
const token = process.env.TOKEN;
const db_url = process.env.DB_URL;
const request_payment = process.env.REQUEST_PAYEMENT;
const merchant_token = process.env.MERCHANT_TOKEN;
const transaction_status = process.env.TRANSACTION_STATUS;
// const checkout_init = process.env.CHECKOUT_INIT;


// Connect to your MongoDB database
mongoose.connect(db_url, { useNewUrlParser: true, useUnifiedTopology: true });
const db = mongoose.connection;

// Define the Customer schema
// Define the customer schema
const customerSchema = new mongoose.Schema({
  chatId: { type: Number, required: true },
  firstName: { type: String },
  lastName: { type: String },
  username: { type: String },
  address1: { type: String },
  postalCode: { type: String },
  country: { type: String },
  email: { type: String },
  phoneNumber: { type: String },
});
// Create the Customer model
const Customer = mongoose.model('Customer', customerSchema);

// const TELEGRAM_API = `https://api.telegram.org/bot6087799569:AAFZf8ghEowgTA-1ULAYUp6MlkVHx7c9-8g`
// const { webApp } = require('telegraf/typings/button');
// const { InlineKeyboardButton, InlineKeyboardMarkup } = require('node-telegram-bot-api');

// const Markup = require('telegraf/markup');
// const Extra = require('telegraf/extra');

const app = new Telegraf(token);

const apiUrl = `${productUrl}=${merchant_id}`;

axios.get(apiUrl, {
  headers: {
    'Authorization': `Bearer ${api_token}`
  }
})
  .then(response => {
    global.products = response.data.data.records.data;
    // console.log(products);
  })
  .catch(error => {
    console.log(error);
  });



// Construct the payment payload with the updated properties

// const webhookUrl = 'https://77da-102-88-35-192.ngrok-free.app/payment-callback'; // Replace with your actual webhook URL


// Define a map to store user carts
const userCarts = new Map();

// Enable session support
app.use(session());

app.use(async (ctx, next) => {
  const { id, first_name, last_name, username } = ctx.from;

  // Check if the customer already exists in the database
  const existingCustomer = await Customer.findOne({ chatId: id });

  // If the customer doesn't exist, create a new entry in the database
  if (!existingCustomer) {
    const newCustomer = new Customer({
      chatId: id,
      firstName: first_name,
      lastName: last_name,
      username: username,

    });
    await newCustomer.save();
  }

  // Proceed to the next middleware
  next();
});

// Create a Mongoose model based on the customer schema
// const Customer = mongoose.model('Customer', customerSchema);

// Function to save customer data to the database
async function saveCustomerData(customerData) {
  try {
    // Create a new instance of the Customer model with the customerData
    const customer = new Customer(customerData);

    // Save the customer data to the database
    const savedCustomer = await customer.save();
    console.log('Customer data saved:', savedCustomer);
  } catch (error) {
    console.error('Error saving customer data:', error);
  }
}

// Create a new Scenes manager
const stage = new Scenes.Stage();
console.log(startScene)
startScene.enter((ctx) => ctx.reply('Welcome to QOSPAY!\n Check product list here /catalog'));

stage.register(startScene);

// Set the Scenes middleware for the bot
app.use(stage.middleware());

sceneManager.register(startScene);
app.use(sceneManager.middleware());

// Define your commands
const commands =
  ['/start',
    '/help',
    '/list',
    '/cart',];


// Create an array of button texts
const buttonTexts = commands.map((command) => command.command);

const menu = {
  reply_markup: {
    inline_keyboard: commands
  }
};

app.command('menu', (ctx) => {
  // send the menu as a reply to the user
  ctx.reply('Please select a command:', menu);
});


// console.log(buttonGroups);

async function savePhoneNumberToCustomerTable(chatId, phoneNumber) {
  try {
    // Find the customer by chatId
    const existingCustomer = await Customer.findOne({ chatId });

    if (existingCustomer) {
      // Update the customer's phoneNumber field
      existingCustomer.phoneNumber = phoneNumber;
      await existingCustomer.save();
      console.log('Customer phone number updated:', existingCustomer);
    } else {
      console.log('Customer not found with chatId:', chatId);
    }
  } catch (error) {
    console.error('Error saving phone number to customer table:', error.message);
    // Handle the error accordingly
  }
}


app.command('start', async (ctx) => {
  const chatId = ctx.chat.id;

  // Check if the customer already has a phone number
  const existingCustomer = await Customer.findOne({ chatId });

  if (existingCustomer && existingCustomer.phoneNumber) {
    // If the customer already has a phone number, send a catalog button
    await ctx.reply('Qospay Shop\n============================================\n' +
      'Welcome to QOSPAY.\n\n' +
      'Please select a category:', {
      reply_markup: {
        keyboard: [['/catalog']],
        resize_keyboard: true,
        one_time_keyboard: true,
        selective: true,
      },
    });
  } else {
    // Prompt the user to enter their phone number
    await ctx.reply('Qospay Shop\n============================================\n' +
      'Welcome to QOSPAY.\n\n' +
      'To have a personalized experience, please enter your phone number:');

    // Create a listener for the user's response
    app.on('text', async (ctx) => {
      const phoneNumber = ctx.message.text;

      // Save the phone number in the Customer table (assuming you have a database connection)
      try {
        // Perform the database operation to save the phone number
        await savePhoneNumberToCustomerTable(chatId, phoneNumber);
        console.log('Phone number saved:', phoneNumber);

        // Send a confirmation message to the user
        await ctx.reply('Thank you for providing your phone number. You will now have a personalized experience.');

        // Remove the listener after the phone number is saved
        app.removeMiddleware();

        // Send a catalog button that opens the /catalog command
        await ctx.reply('Please select a category:', {
          reply_markup: {
            keyboard: [['/catalog']],
            resize_keyboard: true,
            one_time_keyboard: true,
            selective: true,
          },
        });
      } catch (error) {
        console.error('Error saving phone number:', error);
        await ctx.reply('Sorry, an error occurred while saving your phone number. Please try again.');
      }
    });
  }
});

commands.forEach((callback) => {
  app.action(callback, (ctx) => {
    // Handle the button press
    ctx.reply(`You pressed the ${callback} button.`);
  });
});

app.command('catalog', async (ctx) => {
  try {
    // Make API request to retrieve categories
    console.log(categoriesUrl);
    const response = await axios.get(categoriesUrl, {
      headers: {
        'Authorization': `Bearer ${api_token}`
      }
    });

    const { data } = response.data;
    const categories = data.records.data;

    // Create an array of buttons for each category
    const categoryButtons = categories.map((category) => ({
      text: category.name,
      callback_data: `category_${category.id}`
    }));

    // Create the rows with three buttons each
    const rows = [];
    for (let i = 0; i < categoryButtons.length; i += 3) {
      rows.push(categoryButtons.slice(i, i + 3));
    }

    // Create the reply markup with inline keyboard buttons
    const replyMarkup = {
      inline_keyboard: rows
    };

    // Create the modal message
    const modalMessage = {
      text: 'Please select a category:',
      reply_markup: replyMarkup,
      parse_mode: 'HTML',
      reply_to_message_id: ctx.message.message_id,
    };

    // Send the message with the category buttons as a modal
    await ctx.telegram.sendMessage(ctx.chat.id, modalMessage);
  } catch (error) {
    console.error('Error retrieving categories:', error);
    await ctx.reply('Sorry, an error occurred while retrieving the categories.');
  }
});

let messageId = null;
const cartItems = [];
const cartButton = {
  text: `Cart (${cartItems.length})`,
  callback_data: 'showcart',
};

app.on('callback_query', async (ctx) => {

  const callbackData = ctx.callbackQuery.data;
  function generateTransref() {
    const timestamp = Date.now();
    const randomNum = Math.floor(Math.random() * 1000000);
    return `${timestamp}-${randomNum}`;
  };



  // Function to get the transaction status
  async function getTransactionStatus(transref) {
    // Create the request data
    const requestData = {
      transref,
      clientid: "MTNTEST"
    };

    try {
      // Make the request to get the transaction status
      const response = await fetch(transaction_status, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': merchant_token
        },
        body: JSON.stringify(requestData),
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Transaction Status:', result.responsemsg);
        return result.responsemsg; // Return the transaction status
      } else {
        console.error(`Failed to get transaction status: ${response.status} ${response.statusText}`);
        return 'UNKNOWN'; // Return unknown status in case of an error
      }
    } catch (error) {
      console.error('Error getting transaction status:', error.message);
      return 'UNKNOWN'; // Return unknown status in case of an error
    }
  }

  function generateInvoice(result, name, amount, transactionStatus) {
    let invoiceMessage = '';

    // Check the transaction status
    if (transactionStatus === 'SUCCESSFUL') {
      invoiceMessage += '<b>Invoice Details:</b>\n';
      invoiceMessage += `<b>Transaction Reference:</b> ${result.transref}\n`;
      invoiceMessage += `<b>Transaction Status:</b> ${transactionStatus}\n`;
      invoiceMessage += '------------------------\n';
      invoiceMessage += '<b>Order Items:</b>\n';

      // Add the order items to the invoice

      invoiceMessage += `<b>Item:</b> ${name}\n`;
      invoiceMessage += `<b>Price:</b> ${amount}\n`;
      invoiceMessage += '------------------------\n';


      invoiceMessage += `<b>Total Amount:</b> ${amount}\n`;
      invoiceMessage += '<b>Payment Status:</b> Payment successful\n';
    } else if (transactionStatus === 'FAILED') {
      invoiceMessage += '<b>Invoice Details:</b>\n';
      invoiceMessage += `<b>Transaction Reference:</b> ${result.transref}\n`;
      invoiceMessage += `<b>Transaction Status:</b> ${transactionStatus}\n`;
      invoiceMessage += '------------------------\n';
      invoiceMessage += '<b>Order Items:</b>\n';

      // Add the order items to the invoice
      for (const item of result.orderItems || []) {
        invoiceMessage += `<b>Item:</b> ${name}\n`;
        invoiceMessage += `<b>Price:</b> ${amount}\n`;
        invoiceMessage += '------------------------\n';
      }

      invoiceMessage += `<b>Total Amount:</b> ${amount}\n`;
      invoiceMessage += '<b>Payment Status:</b> Payment failed\n';
    } else {
      invoiceMessage += '<b>Invoice Details:</b>\n';
      invoiceMessage += `<b>Transaction Reference:</b> ${result.transref}\n`;
      invoiceMessage += `<b>Transaction Status:</b> ${transactionStatus}\n`;
      invoiceMessage += '------------------------\n';
      invoiceMessage += 'Unknown payment status\n';
    }

    return invoiceMessage;
  }

  function generateInvoiceForCart(result, price, prodName, transactionStatus) {
    let invoiceMessage = '';

    // Check the transaction status
    if (transactionStatus === 'SUCCESSFUL') {
      invoiceMessage += '<b>Invoice Details:</b>\n';
      invoiceMessage += `<b>Transaction Reference:</b> ${result.transref}\n`;
      invoiceMessage += `<b>Transaction Status:</b> ${transactionStatus}\n`;
      invoiceMessage += '------------------------\n';
      invoiceMessage += '<b>Order Items:</b>\n';

      // Add the order items to the invoice

      invoiceMessage += `<b>Item:</b> ${prodName}\n`;
      invoiceMessage += `<b>Price:</b> ${price}\n`;
      invoiceMessage += '------------------------\n';


      invoiceMessage += `<b>Total Amount:</b> ${price}\n`;
      invoiceMessage += '<b>Payment Status:</b> Payment successful\n';
    } else if (transactionStatus === 'FAILED') {
      invoiceMessage += '<b>Invoice Details:</b>\n';
      invoiceMessage += `<b>Transaction Reference:</b> ${result.transref}\n`;
      invoiceMessage += `<b>Transaction Status:</b> ${transactionStatus}\n`;
      invoiceMessage += '------------------------\n';
      invoiceMessage += '<b>Order Items:</b>\n';

      // Add the order items to the invoice

      invoiceMessage += `<b>Item:</b> ${prodName}\n`;
      invoiceMessage += `<b>Price:</b> ${price}\n`;
      invoiceMessage += '------------------------\n';


      invoiceMessage += `<b>Total Amount:</b> ${price}\n`;
      invoiceMessage += '<b>Payment Status:</b> Payment failed\n';
    } else {
      invoiceMessage += '<b>Invoice Details:</b>\n';
      invoiceMessage += `<b>Transaction Reference:</b> ${result.transref}\n`;
      invoiceMessage += `<b>Transaction Status:</b> ${transactionStatus}\n`;
      invoiceMessage += '------------------------\n';
      invoiceMessage += 'Unknown payment status\n';
    }

    return invoiceMessage;
  }



  if (callbackData.startsWith('buy_')) {
    const dataParts = callbackData.split('_');
    const price = dataParts[1];
    const prodName = dataParts[2];
    const chatId = ctx.chat.id;

    // Check if the customer already has a phone number
    const existingCustomer = await Customer.findOne({ chatId });

    if (existingCustomer && existingCustomer.phoneNumber) {
      // Create the payment data
      const data = {
        msisdn: existingCustomer.phoneNumber,
        amount: parseInt(price),
        firstName: existingCustomer.firstName,
        lastName: existingCustomer.lastName,
        transref: generateTransref(),
        clientid: "MTNTEST"
      };

      // console.log('Data:', data);

      try {
        // Make the request to initiate the transaction
        const response = await fetch(request_payment, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': merchant_token
          },
          body: JSON.stringify(data),
        });

        if (response.ok) {
          const result = await response.json();
          console.log(`This is the response:`, result);

          // Check the transaction status
          const transactionStatus = await getTransactionStatus(result.transref);
          console.log('Transaction Status:', transactionStatus);

          // Generate the invoice based on the transaction status
          const invoice = generateInvoiceForCart(result, price, prodName, transactionStatus);

          // Send the invoice to the user
          await ctx.replyWithHTML(invoice);
        } else {
          console.error(`Failed to initiate transaction: ${response.status} ${response.statusText}`);
          await ctx.reply('Sorry, an error occurred while initiating the transaction.');
        }
      } catch (error) {
        console.error('Error initiating transaction:', error.message);
        await ctx.reply('Sorry, an error occurred while initiating the transaction.');
      }
    } else {
      // Handle the case when the user does not have a phone number
      await ctx.reply('Please share your contact information to proceed with the transaction.');
    }
  }

  if (callbackData.startsWith('singleproductbuy_')) {
    const dataParts = callbackData.split('_');
    const amount = dataParts[1];
    const name = dataParts[2];

    // Access the amount and name variables
    console.log('Amount:', amount);
    console.log('Name:', name);
    const chatId = ctx.chat.id;

    // Check if the customer already has a phone number
    const existingCustomer = await Customer.findOne({ chatId });

    if (existingCustomer && existingCustomer.phoneNumber) {
      // Create the payment data
      const data = {
        msisdn: existingCustomer.phoneNumber,
        amount: parseInt(amount),
        firstName: existingCustomer.firstName,
        lastName: existingCustomer.lastName,
        transref: generateTransref(),
        clientid: "MTNTEST"
      };

      // console.log('Data:', data);

      try {
        // Make the request to initiate the transaction
        const response = await fetch('http://staging.qosic.net:9010/QosicBridge/user/requestpayment', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Basic VVNSMDE6WUc3MzlHNVhGVlBZWVY0QURKVlc='
          },
          body: JSON.stringify(data),
        });

        if (response.ok) {
          const result = await response.json();
          console.log(`This is the response:`, result);

          // Check the transaction status
          const transactionStatus = await getTransactionStatus(result.transref);
          console.log('Transaction Status:', transactionStatus);

          // Generate the invoice based on the transaction status
          const invoice = generateInvoice(result, name, amount, transactionStatus);

          // Send the invoice to the user
          await ctx.replyWithHTML(invoice);
        } else {
          console.error(`Failed to initiate transaction: ${response.status} ${response.statusText}`);
          await ctx.reply('Sorry, an error occurred while initiating the transaction.');
        }
      } catch (error) {
        console.error('Error initiating transaction:', error.message);
        await ctx.reply('Sorry, an error occurred while initiating the transaction.');
      }
    } else {
      // Handle the case when the user does not have a phone number
      await ctx.reply('Please share your contact information to proceed with the transaction.');
    }
  }
  else if (callbackData.startsWith('increase_')) {
    const productId = callbackData.split('_')[1];
    console.log(`From increase_ ${productId}`);


    // Increase product quantity in the cart or handle as needed
    // Add your code here

  } else if (callbackData.startsWith('decrease_')) {
    const productId = callbackData.split('_')[1];
    console.log(`From decrease_ ${productId}`);


    // Decrease product quantity in the cart or handle as needed
    // Add your code here

  }
  else if (callbackData.startsWith('addproducttocart_')) {
    const productId = parseInt(callbackData.split('_')[1]);
    console.log(`From addtocart ${productId}`);

    const selectedProduct = products.find(p => p.id === productId);

    if (selectedProduct) {

      // Add the selected product to the cart
      cartItems.push(selectedProduct);
      // Update the cart button with the updated cart items count
      cartButton.text = `Cart (${cartItems.length})`;

      // Create the buttons for the product
      const plusButton = { text: '➕', callback_data: `increase_${productId}` };
      const minusButton = { text: '➖', callback_data: `decrease_${productId}` };
      const addButton = { text: '🛒 Add to cart', callback_data: `addproducttocart_${productId}` };
      // const buyButton = { text: `💰 Buy ${selectedProduct.amount}`, callback_data: `singleproductbuy_${JSON.stringify(selectedProduct)}`,}; // Use cartItems.length as the totalPrice
      // const buyButton = { text: `💰 Buy ${selectedProduct.price}`, callback_data: `buy_${selectedProduct.price}` };
      const encodedProductData = encodeURIComponent(JSON.stringify(selectedProduct));
      console.log(selectedProduct);
      const buyButton = {
        text: `💰 Buy ${selectedProduct.amount}`,
        callback_data: `singleproductbuy_${selectedProduct.amount}_${selectedProduct.name}`,
      };
      // Create the inline keyboard rows
      const productReplies = [
        [plusButton, minusButton],
        [addButton],

      ];

      // Add the cart button to the last row
      productReplies.push([cartButton]);
      productReplies.push([buyButton]);

      // Update the inline keyboard using the edited message
      await ctx.telegram.editMessageReplyMarkup(ctx.chat.id, ctx.callbackQuery.message.message_id, null, {
        inline_keyboard: productReplies,
      });
    } else {
      console.log('Selected product not found. Product ID:', productId);
      ctx.reply('Selected product not found. Product out of stock');
      // Handle the case when the product is not found
    }
  }
  else if (callbackData === 'showcart') {
    console.log('Showing cart', callbackData);
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
    let prodName = [];
    let itemimg = '';

    if (cartItems.length === 0) {
      await ctx.reply('Your cart is empty.');
    } else {
      const uniqueItems = Array.from(productQuantityMap.keys());
      for (const item of uniqueItems) {
        prodName.push(item);
        console.log(`Items in the cart`, item);
        const quantity = productQuantityMap.get(item);
        const product = cartItems.find((product) => product.name === item);
        const itemTotalPrice = product.amount * quantity;
        const maxTabWidth = 100;
        const itemText = `${item} ${quantity}x $${itemTotalPrice}`;
        const numSpaces = maxTabWidth - itemText.length;
        const indentation = ' '.repeat(numSpaces);
        const image = product.image;
        const imageSource = cartItems.find((product) => product.name === item).image;
        const imageWidth = 20; // Width in pixels
        const imageHeight = 20;
        const imageResponse = await axios.get(image, { responseType: 'arraybuffer' });
        const imageBuffer = imageResponse.data;

        // Resize the image using sharp
        const resizedImageBuffer = await sharp(imageBuffer)
          .resize(imageWidth, imageHeight)
          .toBuffer();
        // const caption = `**Item ${index + 1}:** (Quantity: ${quantity})\n`
        const cartMessage = ` ${item} ${quantity}x\n`
          + `${product.description}\n`
          // + `**Price per item:** $${product.amount}\n`
          // + `**Total Price:** $${itemTotalPrice}`;

       

        // await ctx.replyWithPhoto({ source: resizedImageBuffer }, {
        //   caption : cartMessage
        // });


        totalPrice += itemTotalPrice;
        itemimg += resizedImageBuffer;
      }

      // Add the total price to the cart message
      const cartMessage = `**Total Price:** $${totalPrice}\n\n`;
      const image = itemimg;
      

      // Add the buttons to the cart message
      const buyButton = {
        text: `💰 Buy $${totalPrice} XOF`,
        callback_data: `buy_${totalPrice}_${prodName}`,
      };

      const clearCartButton = {
        text: '🗑️ Clear Cart',
        callback_data: 'clearcart',
      };

      const continueShoppingButton = {
        text: '🛒 Continue Ordering',
        callback_data: 'continueshopping',
      };

      const buttonRows = [];

      if (cartItems.length > 0) {
        buttonRows.push([clearCartButton]);
      }

      buttonRows.push([continueShoppingButton], [buyButton]);

      const cartMessageOptions = {
        reply_markup: {
          inline_keyboard: buttonRows,
        },
      };
      // await ctx.replyWithPhoto({ source: image }, { 
      
      //   cartMessage, cartMessageOptions
        
      // });
      await ctx.reply(cartMessage, cartMessageOptions);
    }
  }








  else if (callbackData === 'continueshopping') {
    // Redirect the user to the "/catalog" page
    ctx.answerCbQuery();
    ctx.reply('/catalog');
    // ctx.replyWithHTML('<a href="/catalog">Continue Shopping</a>');
  }
  else if (callbackData === 'cart') {
    // Handle the cart button or show the cart contents
    // Handle the cart button or show the cart contents
    if (ctx.session.cart) {

      console.log("ctx.session.cart", ctx.session.cart);
      // If the cart exists in the session, retrieve its contents
      const cartContents = ctx.session.cart;
      console.log(cartContents);

      if (cartContents.length === 0) {
        console.log(`less than zero ${cartContents}`);

        // If the cart is empty, display a message to the user
        await ctx.reply('Your cart is empty.');
      } else {
        const categoryId = callbackData.split('_')[1];

        try {
          // Make API request to retrieve products for the selected category
          const response = await axios.get(`https://ecom-prod.qosic.com/api/v1/products?merchant_id=2&max_amount=&min_amount=&category_id=${categoryId}`, {
            headers: {
              'Authorization': 'Bearer vbAEdpkdet3s2KFu95TH7MJLr6cwrkG6ynG'
            }
          });

          const { data } = response.data;
          const products = data.records.data;

          let cartTotal = 0;
          if (ctx.session.cart) {
            cartTotal = ctx.session.cart.reduce((acc, product) => {
              return acc + product.amount * product.quantity;
            }, 0);
          }

          const cartButton = { text: `🛒 Cart (${cartTotal} XOF)`, callback_data: 'cart' };
          const productReplies = [];

          for (const p of products) {
            if (productReplies.length >= 50) {
              break;
            }

            const photoUrl = p.image;
            const caption = `*${p.name}*\nPrice: ${p.amount || 'N/A'} XOF`;

            const plusButton = { text: '➕', callback_data: `increase_${p.id}` };
            const minusButton = { text: '➖', callback_data: `decrease_${p.id}` };
            const addButton = { text: '🛒 Add to cart', callback_data: `addproducttocart_${p.id}` };
            const buyButton = { text: '💰 Buy', callback_data: `buy_${p.id}` };

            productReplies.push([
              plusButton,
              minusButton,
            ]);
            productReplies.push([
              addButton,
            ]);
            productReplies.push([
              buyButton,
            ]);

            const message = await ctx.replyWithPhoto(
              { url: photoUrl },
              {
                caption: caption,
                reply_markup: {
                  inline_keyboard: productReplies,
                },
                parse_mode: 'Markdown',
              }
            ).catch(error => {
              console.log(error);
            });

            if (message) {
              messageId = message.message_id;
            } else {
              console.log('Failed to send the message.');
            }
          }

          // Add the cart button at the end of the product list
          // productReplies.push([{ text: `🛒 Cart (${cartTotal} XOF)`, callback_data: 'cart' }]);
          productReplies.push([cartButton]);

          await ctx.telegram.editMessageReplyMarkup(ctx.chat.id, ctx.callbackQuery.message.message_id, null, {
            inline_keyboard: productReplies,
          });
        } catch (error) {
          console.log(error.message);
        }
      }
    } else {
      // If the cart doesn't exist in the session, display a message to the user
      await ctx.reply('Your cart is empty.');
    }

  } else {
    // Handle other callback data (categories, add to cart, etc.)
    const categoryId = callbackData.split('_')[1];

    try {
      // Make API request to retrieve products for the selected category
      const response = await axios.get(`https://ecom-prod.qosic.com/api/v1/products?merchant_id=2&max_amount=&min_amount=&category_id=${categoryId}`, {
        headers: {
          'Authorization': 'Bearer vbAEdpkdet3s2KFu95TH7MJLr6cwrkG6ynG'
        }
      });

      const { data } = response.data;
      const products = data.records.data;

      let cartTotal = 0;
      if (ctx.session.cart) {
        cartTotal = ctx.session.cart.reduce((acc, product) => {
          console.log("HEREE");
          return acc + product.amount * product.quantity;
        }, 0);
      }
      const cartButton = { text: `🛒 Cart (${cartTotal} XOF)`, callback_data: 'cart' };
      // const productReplies = products.map((p, index) => {
      const productReplies = products.map(async (p, index) => {
        console.log(`Product: ${p}`);

        if (index < 50) {
          const photoUrl = p.image;
          const caption = `*${p.name}*\nPrice: ${p.amount || 'N/A'} XOF`;

          const plusButton = { text: '➕', callback_data: `increase_${p.id}` };
          const minusButton = { text: '➖', callback_data: `decrease_${p.id}` };
          const addButton = { text: '🛒 Add to cart', callback_data: `addproducttocart_${p.id}` };
          const buyButton = { text: `💰 Buy ${p.price}`, callback_data: `buy_${p.price}` };

          // const buyButton = { text: '💰 Buy', callback_data: `buy_${p.id}` };

          const keyboard = [
            [plusButton, minusButton],
            [addButton],
            // [buyButton],
          ];

          const message = await ctx.replyWithPhoto(
            { url: photoUrl },
            {
              caption: caption,
              reply_markup: {
                inline_keyboard: keyboard,
              },
              parse_mode: 'Markdown',
            }
          ).catch(error => {
            console.log(error);
          });

          if (message) {
            messageId = message.message_id;
          } else {
            console.log('Failed to send the message.');
          }
        }
      });

      // Add the cart button at the end of the product list
      const keyboard = [...productReplies, [cartButton]];
      await ctx.telegram.editMessageReplyMarkup(ctx.chat.id, ctx.callbackQuery.message.message_id, null, {
        inline_keyboard: keyboard,
      });
    } catch (error) {
      console.log(error);
    }
  }
});

// app.action('buy', async (ctx) => {
//   const price = ctx.match[1];
//   const chatId = ctx.chat.id;

//   // Generate a unique transaction reference (transref) function
//   function generateTransref() {
//     // Implement your logic to generate a unique transref
//     // For example, you can use a combination of timestamp and a random number
//     const timestamp = Date.now();
//     const randomNum = Math.floor(Math.random() * 1000000);
//     return `${timestamp}-${randomNum}`;
//   };

//   // Function to retrieve address from context or session
//   function getAddressFromContext(ctx) {
//     // Retrieve the address from the context or session
//     // Example implementation:
//     return ctx.session.address;
//   }

//   // Function to retrieve postal code from context or session
//   function getPostalCodeFromContext(ctx) {
//     // Retrieve the postal code from the context or session
//     // Example implementation:
//     return ctx.session.postalCode;
//   }

//   // Function to retrieve country from context or session
//   function getCountryFromContext(ctx) {
//     // Retrieve the country from the context or session
//     // Example implementation:
//     return ctx.session.country;
//   }

//   // Function to retrieve email from context or session
//   function getEmailFromContext(ctx) {
//     // Retrieve the email from the context or session
//     // Example implementation:
//     return ctx.session.email;
//   }

//   // Function to retrieve phone number from context or session
//   function getPhoneNumberFromContext(ctx) {
//     // Retrieve the phone number from the context or session
//     // Example implementation:
//     return ctx.session.phoneNumber;
//   }

//   // Retrieve the necessary information from the Telegram bot's context
//   const firstName = ctx.from.first_name;
//   const lastName = ctx.from.last_name;
//   const address1 = getAddressFromContext(ctx);
//   const postalCode = getPostalCodeFromContext(ctx);
//   const country = getCountryFromContext(ctx);
//   const email = getEmailFromContext(ctx);
//   const phoneNumber = getPhoneNumberFromContext(ctx);



//   // Construct the returnUrl by replacing the placeholder values with the actual values
//   const returnUrl = `https://4229-102-88-62-76.ngrok-free.app/payment-callback?callbackData=${encodeURIComponent(callbackData)}&chatId=${chatId}&status=`;


//   // Create the payment data
//   const data = {
//     type: 'all',
//     transref: generateTransref(), // You may implement a function to generate a unique transref
//     qosKey: 'QCBJ137',
//     returnUrl,
//     amountDetails: {
//       totalAmount: parseInt(price),
//       currency: 'XOF',
//     },
//     saleDetails: {
//       firstName,
//       lastName,
//       address1,
//       postalCode,
//       country,
//       email,
//       phoneNumber,
//     },
//   };
//   console.log("Data: ", data);

//   // Make the request to initiate the transaction
//   const response = await fetch('https://b-card.qosic.net/public/v1/initTransaction', {
//     method: 'POST',
//     headers: { 'Content-Type': 'application/json' },
//     body: JSON.stringify(data),
//   });

//   // Get the URL from the response
//   const result = await response.json();
//   console.log(`This is the URL: ${result.url}`);
//   console.log(`This is the chatid: ${chatId}`);

//   // Construct the callback URL with the payment status command and parameters
//   const callbackUrl = `https://t.me/QosPAymentBot/payment_status?transref=${result.transref}&status=${result.status}`;

//   // Save the transaction reference to retrieve later
//   const transref = data.transref;

//   // Acknowledge the callback query
//   await ctx.answerCbQuery();

//   // Redirect the user to the payment page
//   await ctx.reply('Redirecting to the payment page...');
//   await ctx.replyWithHTML(`<a href="${result.url}">Click here to make the payment</a>`);
// });


serverApp.get("/", (req, res) => {
  res.send("Hello, world!"); // Replace this with the desired response
});


// serverApp.get('/payment-callback', async (req, res) => {
//   // Extract the query parameters from the request URL
//   const { chatId, status, transref } = req.query;

//   const [buyAction, itemCount, encodedCartItems] = callbackData.split('_');
//   const decodedCartItems = JSON.parse(decodeURIComponent(encodedCartItems));

//   // Access the cartItems array in the payment callback
//   console.log('Cart Items:', decodedCartItems);

//   // Extract only the value of the status parameter
//   const extractedStatus = status ? status.replace('?status=', '') : undefined;

//   // Log the extracted parameters
//   console.log('Status:', extractedStatus);
//   console.log('Transref:', transref);
//   console.log('CHAT_ID:', chatId);

//   let orderStatus = '';
//   if (extractedStatus === 'SUCCESS') {
//     orderStatus = `Message: Payment was successful.\nStatus: ${extractedStatus}\nTransref: ${transref}`;

//     // Generate the invoice ID
//     const invoiceId = generateInvoiceId();

//     // Retrieve customer details
//     const customerDetails = await getCustomerDetails(chatId);

//     // Create the invoice object
//     const invoice = {
//       invoiceId,
//       customer: customerDetails,
//       orderItems: orderItems,
//       totalAmount: totalPrice,
//     };

//     // Save the invoice
//     saveInvoice(invoice);

//     // Send the invoice to the chat
//     // const invoiceMessage = generateInvoiceMessage(invoice);
//     let invoiceMessage = generateInvoiceMessage(invoice);
//     invoiceMessage += `\nOrder Status: ${orderStatus}`;
//     app.telegram.sendMessage(chatId, invoiceMessage);
//   } else if (extractedStatus === 'FAILED') {
//     orderStatus = `Message: Payment failed. Please try again.\nStatus: ${extractedStatus}\nTransref: ${transref}`;
//     // Generate the invoice ID
//     const invoiceId = generateInvoiceId();

//     // Retrieve customer details
//     const customerDetails = await getCustomerDetails(chatId);

//     // Create the invoice object
//     const invoice = {
//       invoiceId,
//       customer: customerDetails,
//       orderItems: orderItems,
//       totalAmount: totalPrice,
//     };

//     // Save the invoice
//     saveInvoice(invoice);

//     // Send the invoice to the chat
//     // const invoiceMessage = generateInvoiceMessage(invoice, orderStatus);
//     let invoiceMessage = generateInvoiceMessage(invoice);
//     invoiceMessage += `\nOrder Status: ${orderStatus}`;
//     app.telegram.sendMessage(chatId, invoiceMessage);
//   } else {
//     orderStatus = 'Message: Unknown payment status.';
//   }

//   // Send the order status message back to the chat
//   // app.telegram.sendMessage(chatId, orderStatus);

//   const deepLinkURL = `https://telegram.me/QosPAymentBot?start=${chatId}`;
//   res.redirect(deepLinkURL);
// });



// serverApp.get('/payment-callback', async (req, res) => {
//   // Extract the query parameters from the request URL
//   let orderStatus = '';

//   const { transref, clientid } = req.body;

//   try {
//     // Make the request to get the transaction status
//     const response = await fetch('http://staging.qosic.net:9010/QosicBridge/user/gettransactionstatus', {
//       method: 'POST',
//       headers: {
//         'Content-Type': 'application/json',
//         'Authorization': 'Basic VVNSMDE6WUc3MzlHNVhGVlBZWVY0QURKVlc=',
//       },
//       body: JSON.stringify({
//         transref,
//         clientid,
//       }),
//     });
//     if (response.ok) {
//       const result = await response.json();
//       console.log('Payment Status:', result.responsemsg);
//   if (result.responsemsg === 'SUCCESSFUL') {
//     orderStatus = `Message: Payment was successful.\nStatus: ${extractedStatus}\nTransref: ${transref}`;

//     // Generate the invoice ID
//     const invoiceId = generateInvoiceId();

//     // Retrieve customer details
//     const customerDetails = await getCustomerDetails(chatId);

//     // Create the invoice object
//     const invoice = {
//       invoiceId,
//       customer: customerDetails,
//       orderItems: orderItems,
//       totalAmount: totalPrice,
//     };

//     // Save the invoice
//     saveInvoice(invoice);

//     // Send the invoice to the chat
//     let invoiceMessage = generateInvoiceMessage(invoice);
//     invoiceMessage += `\nOrder Status: ${orderStatus}`;
//     app.telegram.sendMessage(chatId, invoiceMessage);
//   } else if (result.responsemsg === 'FAILED') {
//     orderStatus = `Message: Payment failed. Please try again.\nStatus: ${extractedStatus}\nTransref: ${transref}`;

//     // Generate the invoice ID
//     const invoiceId = generateInvoiceId();

//     // Retrieve customer details
//     const customerDetails = await getCustomerDetails(chatId);

//     // Create the invoice object
//     const invoice = {
//       invoiceId,
//       customer: customerDetails,
//       orderItems: orderItems,
//       totalAmount: totalPrice,
//     };

//     // Save the invoice
//     saveInvoice(invoice);

//     // Send the invoice to the chat
//     let invoiceMessage = generateInvoiceMessage(invoice);
//     invoiceMessage += `\nOrder Status: ${orderStatus}`;
//     app.telegram.sendMessage(chatId, invoiceMessage);
//   } else {
//     orderStatus = 'Message: Unknown payment status.';
//   }

//   // Send the order status message back to the chat
//   const deepLinkURL = `https://telegram.me/QosPAymentBot?start=${chatId}`;
//   res.redirect(deepLinkURL);
// });

// // Endpoint for checking the payment status
// serverApp.post('/check-payment-status', async (req, res) => {
//   const { transref, clientid } = req.body;

//   try {
//     // Make the request to get the transaction status
//     const response = await fetch('http://staging.qosic.net:9010/QosicBridge/user/gettransactionstatus', {
//       method: 'POST',
//       headers: {
//         'Content-Type': 'application/json',
//         'Authorization': 'Basic VVNSMDE6WUc3MzlHNVhGVlBZWVY0QURKVlc=',
//       },
//       body: JSON.stringify({
//         transref,
//         clientid,
//       }),
//     });

//     if (response.ok) {
//       const result = await response.json();
//       console.log('Payment Status:', result.responsemsg);
//       // Handle the payment status accordingly
//       // ...
//     } else {
//       console.error(`Failed to get transaction status: ${response.status} ${response.statusText}`);
//       // Handle the error case
//       // ...
//     }
//   } catch (error) {
//     console.error('Error checking payment status:', error.message);
//     // Handle the error case
//     // ...
//   }

//   res.end();
// });



app.action(/addtofavorites_(.+)/, (ctx) => {
  const productName = ctx.match[1];
  // Perform add to favorites action
  return ctx.reply(`You clicked the Add to favorites button for "${productName}"`);
});


app.launch();

// Start the server
serverApp.listen(3000, async () => {
  console.log('Server started on port 3000');
  // await init()
});
