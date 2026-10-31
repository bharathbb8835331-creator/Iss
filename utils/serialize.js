const brief = u => u && ({ id: u._id, username: u.username, name: u.name, photo: u.photo });

const postOut = (p, me) => ({
  id: p._id,
  user: brief(p.user),
  type: p.type,
  mediaUrl: p.mediaUrl,
  isVideo: p.isVideo,
  caption: p.caption,
  likesCount: p.likes.length,
  liked: p.likes.some(i => i.equals(me)),
  saved: p.saves.some(i => i.equals(me)),
  comments: p.comments.map(c => ({ id: c._id, user: brief(c.user), text: c.text, createdAt: c.createdAt })),
  product: p.product ? { id: p.product._id, name: p.product.name, price: p.product.price } : null,
  createdAt: p.createdAt
});

// populate settings reused by every post query
const POPULATE = [
  { path: 'user', select: 'username name photo' },
  { path: 'comments.user', select: 'username name photo' },
  { path: 'product', select: 'name price' }
];

const orderOut = o => ({
  id: o._id, number: o.number, name: o.name, price: o.price, imageUrl: o.imageUrl,
  product: o.product, buyer: brief(o.buyer), seller: brief(o.seller),
  address: o.address, status: o.status, createdAt: o.createdAt
});

module.exports = { brief, postOut, POPULATE, orderOut };
