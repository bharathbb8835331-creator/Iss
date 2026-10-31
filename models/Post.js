const mongoose = require('mongoose');
const { Schema } = mongoose;

const postSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  type: { type: String, enum: ['post', 'reel'], default: 'post' },
  mediaUrl: { type: String, required: true },
  isVideo: { type: Boolean, default: false },
  caption: { type: String, default: '' },
  likes: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  saves: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  comments: [{
    user: { type: Schema.Types.ObjectId, ref: 'User' },
    text: String,
    createdAt: { type: Date, default: Date.now }
  }],
  product: { type: Schema.Types.ObjectId, ref: 'Product', default: null }   // set when the post is a product listing
}, { timestamps: true });

module.exports = mongoose.model('Post', postSchema);
