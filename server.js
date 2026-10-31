require('dns').setServers(['8.8.8.8', '8.8.4.4']);
require('dotenv').config();
require('express-async-errors');
const path = require('path');
const fs = require('fs');
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const auth = require('./middleware/auth');
const Order = require('./models/Order');
const Message = require('./models/Message');

const app = express();
fs.mkdirSync(path.join(__dirname, 'uploads'), { recursive: true });

app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.static(path.join(__dirname, 'public')));   // put socialshop.html here as index.html

app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/posts', require('./routes/posts'));
app.use('/api/products', require('./routes/products'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/messages', require('./routes/messages'));

// header badges: new orders + unread messages
app.get('/api/badges', auth, async (req, res) => {
  const me = req.user.id;
  const [orders, messages] = await Promise.all([
    Order.countDocuments({ $or: [{ seller: me, sellerSeen: false }, { buyer: me, buyerSeen: false }] }),
    Message.countDocuments({ to: me, read: false })
  ]);
  res.json({ orders, messages });
});

app.use('/api', (req, res) => res.status(404).json({ error: 'Not found' }));

// central error handler
app.use((err, req, res, next) => {
  console.error(err);
  if (err.name === 'MulterError') return res.status(400).json({ error: err.message });
  if (err.name === 'CastError') return res.status(400).json({ error: 'Invalid id' });
  if (err.code === 11000) return res.status(409).json({ error: 'Already exists' });
  res.status(err.status || 500).json({ error: err.message || 'Server error' });
});

mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('MongoDB connected');
    app.listen(process.env.PORT || 5000, () => console.log('Server running on port ' + (process.env.PORT || 5000)));
  })
  .catch(e => { console.error('MongoDB connection failed:', e.message); process.exit(1); });
