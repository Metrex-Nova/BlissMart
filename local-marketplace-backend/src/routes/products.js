// local-marketplace-backend/src/routes/products.js

const express = require('express');
const { PrismaClient } = require('@prisma/client');
const router = express.Router();
const prisma = new PrismaClient();

// ✅ GET /api/products - Get all products for customers
router.get('/', async (req, res) => {
  try {
    console.log('📦 Fetching all products...');
    
    const inventories = await prisma.productInventory.findMany({
      where: {
        stock: { gt: 0 }
      },
      include: {
        product: true,
        shop: {
          include: {
            owner: {
              select: {
                id: true,
                name: true,
                role: true
              }
            }
          }
        }
      },
      orderBy: { updatedAt: 'desc' }
    });

    console.log(`✅ Found ${inventories.length} inventory items`);

    // Transform to simple format with shopId included
    const products = inventories.map(inv => ({
      id: inv.product.id,
      name: inv.product.name,
      description: inv.product.description || 'No description',
      price: inv.price,
      stock: inv.stock,
      category: inv.product.category || 'General',
      shopId: inv.shopId, // ✅ ADDED - Required for order creation
      retailer: {
        id: inv.shop.owner.id,
        name: inv.shop.owner.name,
        shopName: inv.shop.name || inv.shop.owner.name // Use shop name
      }
    }));

    res.json(products);
  } catch (error) {
    console.error('❌ Error fetching products:', error);
    res.status(500).json({
      error: 'Failed to fetch products',
      details: error.message
    });
  }
});

// Keep other routes as they are...
router.get('/:productId', async (req, res) => {
  try {
    const { productId } = req.params;
    const product = await prisma.product.findUnique({
      where: { id: parseInt(productId) },
      include: {
        inventories: {
          where: { stock: { gt: 0 } },
          include: {
            shop: {
              include: {
                owner: {
                  select: { id: true, name: true, role: true }
                }
              }
            }
          }
        }
      }
    });

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const formatted = {
      id: product.id,
      name: product.name,
      description: product.description || '',
      category: product.category || 'General',
      unit: product.unit || 'kg',
      retailers: product.inventories.map(inv => ({
        shopId: inv.shopId, // ✅ ADDED
        price: inv.price,
        stock: inv.stock,
        retailer: {
          id: inv.shop.owner.id,
          name: inv.shop.owner.name,
          shopName: inv.shop.name
        }
      }))
    };

    res.json(formatted);
  } catch (error) {
    console.error('❌ Error fetching product:', error);
    res.status(500).json({
      error: 'Failed to fetch product',
      details: error.message
    });
  }
});

router.get('/category/:category', async (req, res) => {
  try {
    const { category } = req.params;
    const inventories = await prisma.productInventory.findMany({
      where: {
        stock: { gt: 0 },
        product: {
          category: {
            contains: category,
            mode: 'insensitive'
          }
        }
      },
      include: {
        product: true,
        shop: {
          include: {
            owner: {
              select: { id: true, name: true, role: true }
            }
          }
        }
      }
    });

    const products = inventories.map(inv => ({
      id: inv.product.id,
      name: inv.product.name,
      description: inv.product.description || 'No description',
      price: inv.price,
      stock: inv.stock,
      category: inv.product.category || 'General',
      shopId: inv.shopId, // ✅ ADDED
      retailer: {
        id: inv.shop.owner.id,
        name: inv.shop.owner.name,
        shopName: inv.shop.name
      }
    }));

    res.json(products);
  } catch (error) {
    console.error('❌ Error fetching products by category:', error);
    res.status(500).json({
      error: 'Failed to fetch products by category',
      details: error.message
    });
  }
});

router.get('/search/:query', async (req, res) => {
  try {
    const { query } = req.params;
    const inventories = await prisma.productInventory.findMany({
      where: {
        stock: { gt: 0 },
        product: {
          OR: [
            { name: { contains: query, mode: 'insensitive' } },
            { description: { contains: query, mode: 'insensitive' } }
          ]
        }
      },
      include: {
        product: true,
        shop: {
          include: {
            owner: {
              select: { id: true, name: true, role: true }
            }
          }
        }
      }
    });

    const products = inventories.map(inv => ({
      id: inv.product.id,
      name: inv.product.name,
      description: inv.product.description || 'No description',
      price: inv.price,
      stock: inv.stock,
      category: inv.product.category || 'General',
      shopId: inv.shopId, // ✅ ADDED
      retailer: {
        id: inv.shop.owner.id,
        name: inv.shop.owner.name,
        shopName: inv.shop.name
      }
    }));

    res.json(products);
  } catch (error) {
    console.error('❌ Error searching products:', error);
    res.status(500).json({
      error: 'Failed to search products',
      details: error.message
    });
  }
});

module.exports = router;
