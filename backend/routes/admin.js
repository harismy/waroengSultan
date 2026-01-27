const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const { all, get, run } = require('../database/database');

// Middleware untuk autentikasi
const isAuthenticated = (req, res, next) => {
  if (req.session.admin) {
    next();
  } else {
    res.status(401).json({ message: 'Unauthorized' });
  }
};

// Konfigurasi upload gambar
const uploadDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'cake-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|webp/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Hanya file gambar yang diperbolehkan!'));
    }
  }
});

// Login admin
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    const admin = await get(
      'SELECT * FROM admins WHERE username = ?',
      [username]
    );
    
    if (!admin) {
      return res.status(401).json({ 
        success: false, 
        message: 'Username atau password salah' 
      });
    }
    
    const isValidPassword = await bcrypt.compare(password, admin.password);
    
    if (!isValidPassword) {
      return res.status(401).json({ 
        success: false, 
        message: 'Username atau password salah' 
      });
    }
    
    req.session.admin = {
      id: admin.id,
      username: admin.username
    };
    
    res.json({ 
      success: true, 
      message: 'Login berhasil',
      user: { username: admin.username }
    });
    
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
});

// Logout
router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ success: false, message: 'Logout failed' });
    }
    res.json({ success: true, message: 'Logout berhasil' });
  });
});

// Check session
router.get('/check-session', (req, res) => {
  if (req.session.admin) {
    res.json({ 
      authenticated: true, 
      user: { username: req.session.admin.username } 
    });
  } else {
    res.json({ authenticated: false });
  }
});

// Get all cakes for admin
router.get('/cakes', isAuthenticated, async (req, res) => {
  try {
    const cakes = await all(
      'SELECT * FROM cakes ORDER BY created_at DESC'
    );
    res.json(cakes);
  } catch (error) {
    console.error('Error fetching cakes:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Add new cake
router.post('/cakes', isAuthenticated, upload.single('image'), async (req, res) => {
  try {
    const { name, description, price, category, stock } = req.body;
    
    if (!req.file) {
      return res.status(400).json({ message: 'Gambar diperlukan' });
    }
    
    const result = await run(
      `INSERT INTO cakes (name, description, price, category, image, stock) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [name, description, parseFloat(price), category, req.file.filename, parseInt(stock || 1)]
    );
    
    const newCake = await get('SELECT * FROM cakes WHERE id = ?', [result.id]);
    res.status(201).json(newCake);
    
  } catch (error) {
    console.error('Error adding cake:', error);
    res.status(400).json({ message: error.message });
  }
});

// Update cake
router.put('/cakes/:id', isAuthenticated, upload.single('image'), async (req, res) => {
  try {
    const { name, description, price, category, stock, is_available } = req.body;
    const cakeId = req.params.id;
    
    // Cek apakah kue ada
    const existingCake = await get('SELECT * FROM cakes WHERE id = ?', [cakeId]);
    if (!existingCake) {
      return res.status(404).json({ message: 'Kue tidak ditemukan' });
    }
    
    let imageFilename = existingCake.image;
    if (req.file) {
      imageFilename = req.file.filename;
    }
    
    await run(
      `UPDATE cakes SET 
        name = ?, 
        description = ?, 
        price = ?, 
        category = ?, 
        image = ?, 
        stock = ?, 
        is_available = ?
       WHERE id = ?`,
      [
        name || existingCake.name,
        description || existingCake.description,
        price ? parseFloat(price) : existingCake.price,
        category || existingCake.category,
        imageFilename,
        stock ? parseInt(stock) : existingCake.stock,
        is_available !== undefined ? (is_available === 'true' || is_available === true ? 1 : 0) : existingCake.is_available,
        cakeId
      ]
    );
    
    const updatedCake = await get('SELECT * FROM cakes WHERE id = ?', [cakeId]);
    res.json(updatedCake);
    
  } catch (error) {
    console.error('Error updating cake:', error);
    res.status(400).json({ message: error.message });
  }
});

// Delete cake
router.delete('/cakes/:id', isAuthenticated, async (req, res) => {
  try {
    const cakeId = req.params.id;
    
    // Cek apakah kue ada
    const existingCake = await get('SELECT * FROM cakes WHERE id = ?', [cakeId]);
    if (!existingCake) {
      return res.status(404).json({ message: 'Kue tidak ditemukan' });
    }
    
    await run('DELETE FROM cakes WHERE id = ?', [cakeId]);
    
    res.json({ 
      success: true, 
      message: 'Kue berhasil dihapus' 
    });
    
  } catch (error) {
    console.error('Error deleting cake:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get statistics
router.get('/stats', isAuthenticated, async (req, res) => {
  try {
    const totalCakes = await get('SELECT COUNT(*) as count FROM cakes');
    const availableCakes = await get('SELECT COUNT(*) as count FROM cakes WHERE is_available = 1');
    const totalStock = await get('SELECT SUM(stock) as total FROM cakes');
    const totalOrders = await get('SELECT COUNT(*) as count FROM orders');
    
    res.json({
      totalCakes: totalCakes.count,
      availableCakes: availableCakes.count,
      totalStock: totalStock.total || 0,
      totalOrders: totalOrders.count
    });
    
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get recent orders
router.get('/orders/recent', isAuthenticated, async (req, res) => {
  try {
    const orders = await all(
      `SELECT o.*, 
              GROUP_CONCAT(c.name || ' x' || oi.quantity, ', ') AS items_summary
       FROM orders o
       LEFT JOIN order_items oi ON oi.order_id = o.id
       LEFT JOIN cakes c ON c.id = oi.cake_id
       GROUP BY o.id
       ORDER BY o.created_at DESC
       LIMIT 5`
    );
    res.json(orders);
  } catch (error) {
    console.error('Error fetching recent orders:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get all orders
router.get('/orders', isAuthenticated, async (req, res) => {
  try {
    const orders = await all(
      `SELECT o.*, 
              GROUP_CONCAT(c.name || ' x' || oi.quantity, ', ') AS items_summary
       FROM orders o
       LEFT JOIN order_items oi ON oi.order_id = o.id
       LEFT JOIN cakes c ON c.id = oi.cake_id
       GROUP BY o.id
       ORDER BY o.created_at DESC`
    );
    res.json(orders);
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Create order
router.post('/orders', isAuthenticated, async (req, res) => {
  let transactionStarted = false;
  try {
    const { customer_name, customer_phone, items } = req.body;

    if (!customer_name || !customer_phone) {
      return res.status(400).json({ message: 'Nama dan telepon pelanggan wajib diisi' });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'Item pesanan wajib diisi' });
    }

    const normalizedItems = items
      .map((item) => ({
        cake_id: parseInt(item.cake_id, 10),
        quantity: parseInt(item.quantity, 10)
      }))
      .filter((item) => Number.isInteger(item.cake_id) && Number.isInteger(item.quantity) && item.quantity > 0);

    if (normalizedItems.length === 0) {
      return res.status(400).json({ message: 'Item pesanan tidak valid' });
    }

    const cakeIds = [...new Set(normalizedItems.map((item) => item.cake_id))];
    const placeholders = cakeIds.map(() => '?').join(',');
    const cakes = await all(
      `SELECT id, name, price, stock, is_available FROM cakes WHERE id IN (${placeholders})`,
      cakeIds
    );

    if (cakes.length !== cakeIds.length) {
      return res.status(400).json({ message: 'Beberapa kue tidak ditemukan' });
    }

    const cakeMap = new Map(cakes.map((cake) => [cake.id, cake]));

    // Validate stock and calculate total
    let totalPrice = 0;
    for (const item of normalizedItems) {
      const cake = cakeMap.get(item.cake_id);
      if (!cake) {
        return res.status(400).json({ message: 'Kue tidak ditemukan' });
      }
      if (cake.stock < item.quantity) {
        return res.status(400).json({
          message: `Stok tidak cukup untuk ${cake.name}`
        });
      }
      totalPrice += cake.price * item.quantity;
    }

    await run('BEGIN TRANSACTION');
    transactionStarted = true;

    const orderResult = await run(
      'INSERT INTO orders (customer_name, customer_phone, total_price, status) VALUES (?, ?, ?, ?)',
      [customer_name, customer_phone, totalPrice, 'pending']
    );

    for (const item of normalizedItems) {
      const cake = cakeMap.get(item.cake_id);
      await run(
        'INSERT INTO order_items (order_id, cake_id, quantity, price) VALUES (?, ?, ?, ?)',
        [orderResult.id, item.cake_id, item.quantity, cake.price]
      );

      const newStock = cake.stock - item.quantity;
      const isAvailable = newStock > 0 ? 1 : 0;
      await run(
        'UPDATE cakes SET stock = ?, is_available = ? WHERE id = ?',
        [newStock, isAvailable, item.cake_id]
      );

      cake.stock = newStock;
      cake.is_available = isAvailable;
    }

    await run('COMMIT');
    transactionStarted = false;

    const newOrder = await get('SELECT * FROM orders WHERE id = ?', [orderResult.id]);
    res.status(201).json(newOrder);
  } catch (error) {
    if (transactionStarted) {
      await run('ROLLBACK');
    }
    console.error('Error creating order:', error);
    res.status(400).json({ message: error.message });
  }
});

// Update order status
router.put('/orders/:id/status', isAuthenticated, async (req, res) => {
  try {
    const orderId = req.params.id;
    const { status } = req.body;
    const allowedStatuses = ['pending', 'processing', 'completed', 'cancelled'];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ message: 'Status tidak valid' });
    }

    const existingOrder = await get('SELECT * FROM orders WHERE id = ?', [orderId]);
    if (!existingOrder) {
      return res.status(404).json({ message: 'Pesanan tidak ditemukan' });
    }

    await run('UPDATE orders SET status = ? WHERE id = ?', [status, orderId]);
    const updatedOrder = await get('SELECT * FROM orders WHERE id = ?', [orderId]);
    res.json(updatedOrder);
  } catch (error) {
    console.error('Error updating order status:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Delete order
router.delete('/orders/:id', isAuthenticated, async (req, res) => {
  let transactionStarted = false;
  try {
    const orderId = req.params.id;
    const existingOrder = await get('SELECT * FROM orders WHERE id = ?', [orderId]);
    if (!existingOrder) {
      return res.status(404).json({ message: 'Pesanan tidak ditemukan' });
    }

    await run('BEGIN TRANSACTION');
    transactionStarted = true;

    await run('DELETE FROM order_items WHERE order_id = ?', [orderId]);
    await run('DELETE FROM orders WHERE id = ?', [orderId]);

    await run('COMMIT');
    transactionStarted = false;

    res.json({ success: true, message: 'Pesanan berhasil dihapus' });
  } catch (error) {
    if (transactionStarted) {
      await run('ROLLBACK');
    }
    console.error('Error deleting order:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;
