const router = require('express').Router();
const Order = require('../models/Order');
const Product = require('../models/Product');
const Message = require('../models/Message');
const auth = require('../middleware/auth');
const { orderOut } = require('../utils/serialize');

router.use(auth);

const STAT = ['Placed', 'Confirmed', 'Shipped', 'Delivered'];
const populate = q => q.populate('buyer', 'username name photo').populate('seller', 'username name photo');

async function nextNumber() {
  const last = await Order.findOne().sort({ number: -1 });
  return last ? last.number + 1 : 1001;
}

// place order(s): { items: [productId, ...], address }
router.post('/', async (req, res) => {
  const ids = Array.isArray(req.body.items) ? req.body.items : [];
  const address = String(req.body.address || '').trim();
  if (!ids.length) return res.status(400).json({ error: 'Your cart is empty' });
  if (!address) return res.status(400).json({ error: 'Please enter a delivery address' });

  const created = [];
  for (const id of ids) {
    const p = await Product.findById(id);
    if (!p) continue;
    if (p.seller.equals(req.user.id)) return res.status(400).json({ error: "You can't buy your own product" });
    const order = await Order.create({
      number: await nextNumber(), product: p._id, name: p.name, price: p.price, imageUrl: p.imageUrl,
      buyer: req.user.id, seller: p.seller, address, status: 0, sellerSeen: false, buyerSeen: true
    });
    await Message.create({ from: req.user.id, to: p.seller, text: `Hi! I just ordered your ${p.name} (order #${order.number}).` });
    created.push(order._id);
  }
  const orders = await populate(Order.find({ _id: { $in: created } }));
  res.status(201).json(orders.map(orderOut));
});

router.get('/mine', async (req, res) => {
  const orders = await populate(Order.find({ buyer: req.user.id }).sort({ createdAt: -1 }));
  res.json(orders.map(orderOut));
});

router.get('/received', async (req, res) => {
  const orders = await populate(Order.find({ seller: req.user.id }).sort({ createdAt: -1 }));
  res.json(orders.map(orderOut));
});

// clear the badge for a tab: { tab: 'mine' | 'received' }
router.post('/seen', async (req, res) => {
  if (req.body.tab === 'received') await Order.updateMany({ seller: req.user.id, sellerSeen: false }, { sellerSeen: true });
  else await Order.updateMany({ buyer: req.user.id, buyerSeen: false }, { buyerSeen: true });
  res.json({ ok: true });
});

// seller moves the order forward: Placed -> Confirmed -> Shipped -> Delivered
router.patch('/:id/status', async (req, res) => {
  const o = await Order.findById(req.params.id);
  if (!o) return res.status(404).json({ error: 'Order not found' });
  if (!o.seller.equals(req.user.id)) return res.status(403).json({ error: 'Only the seller can update this order' });
  if (o.status >= 3) return res.status(400).json({ error: 'Order already delivered' });
  o.status += 1;
  o.buyerSeen = false;
  await o.save();
  await Message.create({ from: req.user.id, to: o.buyer, text: `Your order #${o.number} (${o.name}) is now ${STAT[o.status]}.` });
  res.json(orderOut(await populate(Order.findById(o._id))));
});

module.exports = router;
