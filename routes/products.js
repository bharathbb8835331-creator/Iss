const router = require('express').Router();
const Product = require('../models/Product');
const Post = require('../models/Post');
const User = require('../models/User');
const auth = require('../middleware/auth');
const upload = require('../middleware/upload');
const { brief } = require('../utils/serialize');

router.use(auth);

const out = p => ({
  id: p._id, name: p.name, price: p.price, description: p.description,
  imageUrl: p.imageUrl, seller: brief(p.seller), createdAt: p.createdAt
});

// list a product (photo + name + price + description); it also appears in the feed as a post
router.post('/', upload.single('image'), async (req, res) => {
  if (!req.file || !req.file.mimetype.startsWith('image/')) return res.status(400).json({ error: 'Select a product photo' });
  const name = String(req.body.name || '').trim();
  const price = parseInt(req.body.price, 10);
  const description = String(req.body.description || '').trim();
  if (!name) return res.status(400).json({ error: 'Enter the product name' });
  if (!price || price < 1) return res.status(400).json({ error: 'Enter a valid price' });

  const imageUrl = '/uploads/' + req.file.filename;
  const product = await Product.create({ seller: req.user.id, name, price, description, imageUrl });
  await Post.create({
    user: req.user.id, type: 'post', mediaUrl: imageUrl, isVideo: false,
    caption: name + (description ? ' - ' + description : ''), product: product._id
  });
  await product.populate('seller', 'username name photo');
  res.status(201).json(out(product));
});

router.get('/', async (req, res) => {
  const items = await Product.find().sort({ createdAt: -1 }).limit(100).populate('seller', 'username name photo');
  res.json(items.map(out));
});

router.get('/user/:username', async (req, res) => {
  const u = await User.findOne({ username: req.params.username.toLowerCase() });
  if (!u) return res.status(404).json({ error: 'User not found' });
  const items = await Product.find({ seller: u._id }).sort({ createdAt: -1 }).populate('seller', 'username name photo');
  res.json(items.map(out));
});

router.get('/:id', async (req, res) => {
  const p = await Product.findById(req.params.id).populate('seller', 'username name photo');
  if (!p) return res.status(404).json({ error: 'Product not found' });
  res.json(out(p));
});

router.delete('/:id', async (req, res) => {
  const p = await Product.findById(req.params.id);
  if (!p) return res.status(404).json({ error: 'Product not found' });
  if (!p.seller.equals(req.user.id)) return res.status(403).json({ error: 'Not your product' });
  await Post.deleteMany({ product: p._id });
  await p.deleteOne();
  res.json({ ok: true });
});

module.exports = router;
