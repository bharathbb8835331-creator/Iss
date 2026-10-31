const mongoose = require('mongoose');
const { Schema } = mongoose;

// status: 0 = Placed, 1 = Confirmed, 2 = Shipped, 3 = Delivered
module.exports = mongoose.model('Order', new Schema({
  number: { type: Number, unique: true },
  product: { type: Schema.Types.ObjectId, ref: 'Product' },
  name: String,            // snapshot, so the order survives if the product is removed
  price: Number,
  imageUrl: String,
  buyer: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  seller: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  address: { type: String, required: true },
  status: { type: Number, default: 0, min: 0, max: 3 },
  sellerSeen: { type: Boolean, default: false },
  buyerSeen: { type: Boolean, default: true }
}, { timestamps: true }));
