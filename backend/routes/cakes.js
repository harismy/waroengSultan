const express = require('express');
const router = express.Router();
const { all, get } = require('../database/database');

// Get all cakes
router.get('/', async (req, res) => {
  try {
    const cakes = await all(
      'SELECT * FROM cakes WHERE is_available = 1 ORDER BY created_at DESC'
    );
    res.json(cakes);
  } catch (error) {
    console.error('Error fetching cakes:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get cake by ID
router.get('/:id', async (req, res) => {
  try {
    const cake = await get(
      'SELECT * FROM cakes WHERE id = ? AND is_available = 1',
      [req.params.id]
    );
    
    if (cake) {
      res.json(cake);
    } else {
      res.status(404).json({ message: 'Cake not found' });
    }
  } catch (error) {
    console.error('Error fetching cake:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get cake by category
router.get('/category/:category', async (req, res) => {
  try {
    const cakes = await all(
      'SELECT * FROM cakes WHERE category = ? AND is_available = 1 ORDER BY name',
      [req.params.category]
    );
    res.json(cakes);
  } catch (error) {
    console.error('Error fetching cakes by category:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Search cakes
router.get('/search/:query', async (req, res) => {
  try {
    const cakes = await all(
      `SELECT * FROM cakes 
       WHERE (name LIKE ? OR description LIKE ?) 
       AND is_available = 1 
       ORDER BY name`,
      [`%${req.params.query}%`, `%${req.params.query}%`]
    );
    res.json(cakes);
  } catch (error) {
    console.error('Error searching cakes:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;