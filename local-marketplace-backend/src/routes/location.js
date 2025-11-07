const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { findNearbyShops, calculateDistance } = require('../utils/locationService');

const router = express.Router();
const prisma = new PrismaClient();

// GET nearby retailers
router.get('/nearby-retailers', async (req, res) => {
  try {
    const { lat, lng, radius = 10 } = req.query;

    if (!lat || !lng) {
      return res.status(400).json({ error: 'Latitude and longitude required' });
    }

    const shops = await prisma.shop.findMany({
      where: {
        type: 'RETAIL',
        lat: { not: null },
        lng: { not: null }
      },
      include: {
        owner: {
          select: { id: true, name: true, phone: true }
        },
        products: {
          where: { stock: { gt: 0 } },
          take: 5
        }
      }
    });

    const nearbyShops = findNearbyShops(shops, parseFloat(lat), parseFloat(lng), parseFloat(radius));

    res.json(nearbyShops);
  } catch (error) {
    console.error('Error fetching nearby retailers:', error);
    res.status(500).json({ error: 'Failed to fetch nearby retailers' });
  }
});

// POST update shop location
router.post('/update-location', async (req, res) => {
  try {
    const { shopId, lat, lng, address } = req.body;

    const shop = await prisma.shop.update({
      where: { id: parseInt(shopId) },
      data: { lat: parseFloat(lat), lng: parseFloat(lng), address }
    });

    res.json({ success: true, shop });
  } catch (error) {
    console.error('Error updating location:', error);
    res.status(500).json({ error: 'Failed to update location' });
  }
});

module.exports = router;
