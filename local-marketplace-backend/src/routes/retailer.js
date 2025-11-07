const express = require('express');
const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');
const router = express.Router();
const prisma = new PrismaClient();

// ✅ AUTHENTICATION MIDDLEWARE
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
};

// ============================================
// SHOP ENDPOINTS
// ============================================

// GET /api/retailer/:userId/shop
router.get('/:userId/shop', async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId || isNaN(parseInt(userId))) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    const user = await prisma.user.findUnique({
      where: { id: parseInt(userId) }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.role !== 'RETAILER') {
      return res.status(403).json({ error: 'User is not a retailer' });
    }

    let shop = await prisma.shop.findFirst({
      where: { ownerId: parseInt(userId), type: 'RETAIL' }
    });

    if (!shop) {
      shop = await prisma.shop.create({
        data: {
          name: `${user.name}'s Retail Store`,
          ownerId: parseInt(userId),
          type: 'RETAIL',
          address: 'Update your address in settings'
        }
      });
    }

    res.json(shop);
  } catch (error) {
    console.error('Get retailer shop error:', error);
    res.status(500).json({
      error: 'Failed to get retailer shop',
      details: error.message
    });
  }
});

// ============================================
// PRODUCT ENDPOINTS
// ============================================

// GET /api/retailer/:userId/my-products
router.get('/:userId/my-products', async (req, res) => {
  try {
    const { userId } = req.params;

    const shop = await prisma.shop.findFirst({
      where: { ownerId: parseInt(userId), type: 'RETAIL' }
    });

    if (!shop) return res.json([]);

    const inventories = await prisma.productInventory.findMany({
      where: { shopId: shop.id },
      include: { product: true }
    });

    const products = inventories.map(inv => ({
      id: inv.product.id,
      name: inv.product.name,
      description: inv.product.description,
      unit: inv.product.unit,
      category: inv.product.category,
      price: inv.price,
      stock: inv.stock
    }));

    res.json(products);
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ error: 'Failed to fetch products: ' + error.message });
  }
});

// POST /api/retailer/:userId/products
router.post('/:userId/products', async (req, res) => {
  try {
    const { userId } = req.params;
    const { name, description, category, price, stock } = req.body;

    if (!name || !price || stock === undefined) {
      return res.status(400).json({
        error: 'Missing required fields: name, price, stock'
      });
    }

    let shop = await prisma.shop.findFirst({
      where: {
        ownerId: parseInt(userId),
        type: 'RETAIL'
      }
    });

    if (!shop) {
      shop = await prisma.shop.create({
        data: {
          name: `Retail Store`,
          ownerId: parseInt(userId),
          type: 'RETAIL',
          address: 'Store Address'
        }
      });
    }

    let product = await prisma.product.findFirst({
      where: { name }
    });

    if (!product) {
      product = await prisma.product.create({
        data: {
          name,
          description: description || '',
          unit: 'kg',
          category: category || 'General'
        }
      });
    }

    const inventory = await prisma.productInventory.upsert({
      where: {
        shopId_productId: {
          shopId: shop.id,
          productId: product.id
        }
      },
      update: {
        price: parseFloat(price),
        stock: parseInt(stock),
        updatedAt: new Date()
      },
      create: {
        shopId: shop.id,
        productId: product.id,
        price: parseFloat(price),
        stock: parseInt(stock),
        wholesale: false
      }
    });

    res.json({
      success: true,
      message: 'Product added successfully',
      inventory: inventory
    });

  } catch (error) {
    console.error('Error adding product:', error);
    res.status(500).json({
      error: 'Failed to add product: ' + error.message
    });
  }
});

// DELETE /api/retailer/:userId/products/:productId
router.delete('/:userId/products/:productId', async (req, res) => {
  try {
    const { userId, productId } = req.params;

    const shop = await prisma.shop.findFirst({
      where: { ownerId: parseInt(userId), type: 'RETAIL' }
    });

    if (!shop) {
      return res.status(404).json({ error: 'Shop not found' });
    }

    await prisma.productInventory.deleteMany({
      where: {
        shopId: shop.id,
        productId: parseInt(productId)
      }
    });

    res.json({ success: true, message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({ error: 'Failed to delete product: ' + error.message });
  }
});

// ============================================
// ORDERS ENDPOINTS - ✅ FIXED
// ============================================

// GET /api/orders/retailer/:userId - Get retailer's orders (FIXED!)
router.get('/retailer/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const parsedUserId = parseInt(userId);

    // ✅ FIXED: Look for orders where customerId matches (retailer is the customer)
    const orders = await prisma.order.findMany({
      where: {
        customerId: parsedUserId
      },
      include: {
        items: {
          include: {
            product: true,
            shop: true
          }
        },
        customer: {
          select: {
            id: true,
            name: true,
            phone: true,
            email: true
          }
        },
        tracking: true
      },
      orderBy: { createdAt: 'desc' }
    });

    // ✅ FIXED ANALYTICS
    const analytics = {
      totalOrders: orders.length,
      totalRevenue: orders.reduce((sum, o) => sum + o.totalAmount, 0),
      pendingOrders: orders.filter(o => 
        ['PLACED', 'CONFIRMED', 'PACKED', 'DISPATCHED', 'OUT_FOR_DELIVERY'].includes(o.status)
      ).length,
      completedOrders: orders.filter(o => o.status === 'DELIVERED').length
    };

    res.json({
      success: true,
      orders: orders,
      analytics: analytics
    });
  } catch (error) {
    console.error('Get retailer orders error:', error);
    res.status(500).json({ error: 'Failed to fetch orders: ' + error.message });
  }
});

// PUT /api/retailer/:userId/orders/:orderId/status
router.put('/:userId/orders/:orderId/status', async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ error: 'Status is required' });
    }

    const validStatuses = [
      'PLACED',
      'CONFIRMED',
      'PACKED',
      'DISPATCHED',
      'OUT_FOR_DELIVERY',
      'DELIVERED',
      'CANCELLED',
      'RETURNED'
    ];

    const normalizedStatus = status.toUpperCase();

    if (!validStatuses.includes(normalizedStatus)) {
      return res.status(400).json({
        error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
      });
    }

    const updatedOrder = await prisma.order.update({
      where: { id: parseInt(orderId) },
      data: {
        status: normalizedStatus,
        updatedAt: new Date()
      },
      include: {
        items: {
          include: {
            product: true
          }
        },
        customer: {
          select: {
            id: true,
            name: true,
            phone: true,
            email: true
          }
        }
      }
    });

    await prisma.tracking.upsert({
      where: { orderId: parseInt(orderId) },
      update: {
        status: normalizedStatus,
        updatedAt: new Date()
      },
      create: {
        orderId: parseInt(orderId),
        status: normalizedStatus
      }
    });

    res.json({
      success: true,
      message: `Order status updated to ${normalizedStatus}`,
      order: updatedOrder
    });

  } catch (error) {
    console.error('Error updating order status:', error);
    res.status(500).json({
      error: 'Failed to update order status: ' + error.message
    });
  }
});

// GET /api/retailer/:userId/orders/:orderId/invoice
router.get('/:userId/orders/:orderId/invoice', async (req, res) => {
  try {
    const { orderId } = req.params;

    const order = await prisma.order.findUnique({
      where: { id: parseInt(orderId) },
      include: {
        items: {
          include: {
            product: true
          }
        },
        customer: {
          select: {
            id: true,
            name: true,
            phone: true,
            email: true,
            address: true
          }
        }
      }
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const invoiceData = {
      orderNumber: order.orderNumber,
      date: new Date(order.createdAt).toLocaleDateString('en-IN'),
      time: new Date(order.createdAt).toLocaleTimeString('en-IN'),
      customer: {
        name: order.customer.name,
        phone: order.customer.phone,
        email: order.customer.email,
        address: order.customer.address || 'N/A'
      },
      items: order.items.map(item => ({
        productName: item.product.name,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        subtotal: item.subtotal
      })),
      subtotal: order.items.reduce((sum, item) => sum + item.subtotal, 0),
      tax: 0,
      totalAmount: order.totalAmount,
      paymentMode: order.paymentMode,
      paymentStatus: order.paymentStatus,
      status: order.status
    };

    res.json({
      success: true,
      invoice: invoiceData
    });

  } catch (error) {
    console.error('Error generating invoice:', error);
    res.status(500).json({
      error: 'Failed to generate invoice: ' + error.message
    });
  }
});

module.exports = router;
