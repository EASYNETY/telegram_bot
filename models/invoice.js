const mongoose = require('mongoose');

// Define the invoice schema
const invoiceSchema = new mongoose.Schema({
  invoiceId: {
    type: String,
    required: true,
  },
  customer: {
    type: mongoose.Schema.Types.Mixed,
    required: true,
  },
  orderItems: {
    type: mongoose.Schema.Types.Mixed,
    required: true,
  },
  totalAmount: {
    type: Number,
    required: true,
  },
  orderStatus: {
    type: String,
    required: true,
  },
  invoiceMessage: {
    type: String,
    required: true,
  },
});

// Create the Invoice model
const Invoice = mongoose.model('Invoice', invoiceSchema);

module.exports = Invoice;
