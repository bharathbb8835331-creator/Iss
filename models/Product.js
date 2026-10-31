const mongoose = require('mongoose');
const { Schema } = mongoose;

module.exports = mongoose.model('Product', new Schema({
  seller: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  name: { type: String, required: true, trim: true },
  price: { type: Number, required: true, min: 1 },
  description: { type: String, default: '' },
  imageUrl: { type: String, required: true }
}, { timestamps: true }));
