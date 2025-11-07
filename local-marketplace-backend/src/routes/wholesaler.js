const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { sendNotification } = require('../utils/notificationService');

const router = express.Router();
const prisma = new PrismaClient();

// ============================================
// SHOP ENDPOINTS
// ============================================

// GET /api/wholesaler/:userId/shop
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

    if (user.role !== 'WHOLESALER') {
      return res.status(403).json({ error: 'User is not a wholesaler' });
    }

    let shop = await prisma.shop.findFirst({
      where: { 
        ownerId: parseInt(userId),
        type: 'WHOLESALE'
      }
    });

    if (!shop) {
      shop = await prisma.shop.create({
        data: {
          name: `${user.name}'s Wholesale Store`,
          ownerId: parseInt(userId),
          type: 'WHOLESALE',
          address: 'Update your warehouse address'
        }
      });
    }

    res.json(shop);
  } catch (error) {
    console.error('Get wholesaler shop error:', error);
    res.status(500).json({
      error: 'Failed to get wholesaler shop',
      details: error.message
    });
  }
});

// ============================================
// PRODUCT ENDPOINTS
// ============================================

// GET /api/wholesaler/:wholesalerId/my-products
router.get('/:wholesalerId/my-products', async (req, res) => {
  try {
    const { wholesalerId } = req.params;

    const shop = await prisma.shop.findFirst({
      where: { 
        ownerId: parseInt(wholesalerId), 
        type: 'WHOLESALE' 
      }
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
      wholesalerPrice: inv.wholesalerPrice,
      stock: inv.stock,
      wholesale: inv.wholesale
    }));

    res.json(products);
  } catch (error) {
    console.error('Error fetching wholesaler products:', error);
    res.status(500).json({ 
      error: 'Failed to fetch products: ' + error.message 
    });
  }
});

// POST /api/wholesaler/:wholesalerId/products
router.post('/:wholesalerId/products', async (req, res) => {
  try {
    const { wholesalerId } = req.params;
    const { name, description, unit, category, price, wholesalerPrice, stock } = req.body;

    console.log('Adding wholesale product:', { name, wholesalerId });

    if (!name || !price || !wholesalerPrice || stock === undefined) {
      return res.status(400).json({
        error: 'Missing required fields: name, price, wholesalerPrice, stock'
      });
    }

    const wholesaler = await prisma.user.findUnique({
      where: { id: parseInt(wholesalerId) }
    });

    if (!wholesaler || wholesaler.role !== 'WHOLESALER') {
      return res.status(403).json({ error: 'User is not a wholesaler' });
    }

    let shop = await prisma.shop.findFirst({
      where: {
        ownerId: parseInt(wholesalerId),
        type: 'WHOLESALE'
      }
    });

    if (!shop) {
      shop = await prisma.shop.create({
        data: {
          name: `${wholesaler.name}'s Wholesale Store`,
          ownerId: parseInt(wholesalerId),
          type: 'WHOLESALE',
          address: 'Wholesale warehouse address'
        }
      });
      console.log('✅ Created new wholesale shop:', shop.id);
    }

    console.log('Using shop ID:', shop.id);

    let product = await prisma.product.findFirst({
      where: {
        name: name,
        unit: unit || 'kg'
      }
    });

    if (!product) {
      product = await prisma.product.create({
        data: {
          name,
          description: description || '',
          unit: unit || 'kg',
          category: category || 'General'
        }
      });
      console.log('✅ Created new product:', product.id);
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
        wholesalerPrice: parseFloat(wholesalerPrice),
        stock: parseInt(stock),
        wholesale: true,
        updatedAt: new Date()
      },
      create: {
        shopId: shop.id,
        productId: product.id,
        price: parseFloat(price),
        wholesalerPrice: parseFloat(wholesalerPrice),
        stock: parseInt(stock),
        wholesale: true
      }
    });

    console.log('✅ Wholesale product inventory created/updated:', inventory.id);
    console.log('Shop ID for this product:', shop.id);

    res.json({
      success: true,
      message: 'Wholesale product added successfully',
      product: {
        id: product.id,
        name: product.name,
        shopId: shop.id,
        inventory: inventory
      }
    });

  } catch (error) {
    console.error('Error adding wholesale product:', error);
    res.status(500).json({ 
      error: 'Failed to add wholesale product: ' + error.message 
    });
  }
});

// DELETE /api/wholesaler/:wholesalerId/products/:productId
router.delete('/:wholesalerId/products/:productId', async (req, res) => {
  try {
    const { wholesalerId, productId } = req.params;

    const shop = await prisma.shop.findFirst({
      where: { 
        ownerId: parseInt(wholesalerId), 
        type: 'WHOLESALE' 
      }
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
    res.status(500).json({ 
      error: 'Failed to delete product: ' + error.message 
    });
  }
});

// ============================================
// ORDERS & ANALYTICS ENDPOINTS
// ============================================

// GET /api/wholesaler/:wholesalerId/orders - Get wholesaler's orders with analytics
router.get('/:wholesalerId/orders', async (req, res) => {
  try {
    const wholesalerId = parseInt(req.params.wholesalerId);

    const shop = await prisma.shop.findFirst({
      where: {
        ownerId: wholesalerId,
        type: 'WHOLESALE'
      }
    });

    if (!shop) {
      return res.json({
        success: true,
        orders: [],
        analytics: {
          totalOrders: 0,
          totalSales: 0,
          activeProducts: 0,
          averageOrderValue: 0,
          pendingOrders: 0,
          completedOrders: 0
        }
      });
    }

    // Get all orders containing items from this wholesaler's shop
    const orders = await prisma.order.findMany({
      where: {
        items: {
          some: {
            shopId: shop.id
          }
        }
      },
      include: {
        items: {
          where: {
            shopId: shop.id
          },
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
        },
        tracking: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Get count of active products
    const activeProducts = await prisma.productInventory.count({
      where: {
        shopId: shop.id,
        stock: { gt: 0 }
      }
    });

    // ✅ FIXED ANALYTICS CALCULATION
    let totalRevenue = 0;
    orders.forEach(order => {
      order.items.forEach(item => {
        const itemPrice = parseFloat(item.unitPrice) || 0;
        const itemQty = parseInt(item.quantity) || 0;
        totalRevenue += (itemPrice * itemQty);
      });
    });

    const analytics = {
      totalOrders: orders.length,
      totalSales: totalRevenue,
      activeProducts: activeProducts,
      averageOrderValue: orders.length > 0 ? (totalRevenue / orders.length) : 0
    };

    console.log('Analytics breakdown:');
    console.log('- Total Orders:', analytics.totalOrders);
    console.log('- Total Sales:', analytics.totalSales);
    console.log('- Average Order Value:', analytics.averageOrderValue);
    console.log('- Active Products:', analytics.activeProducts);

    res.json({
      success: true,
      orders: orders,
      analytics: analytics
    });

  } catch (error) {
    console.error('Get wholesaler orders error:', error);
    res.status(500).json({ error: 'Failed to fetch wholesaler orders' });
  }
});

// GET /api/wholesaler/:wholesalerId/orders/:orderId
router.get('/:wholesalerId/orders/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;

    const order = await prisma.order.findUnique({
      where: { id: parseInt(orderId) },
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
      }
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json(order);
  } catch (error) {
    console.error('Get order error:', error);
    res.status(500).json({ error: 'Failed to fetch order' });
  }
});

// PUT /api/wholesaler/:wholesalerId/orders/:orderId/status
router.put('/:wholesalerId/orders/:orderId/status', async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ error: 'Status is required' });
    }

    const validStatuses = ['PLACED', 'CONFIRMED', 'PACKED', 'DISPATCHED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED', 'RETURNED'];
    const normalizedStatus = status.toUpperCase();

    if (!validStatuses.includes(normalizedStatus)) {
      return res.status(400).json({
        error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
      });
    }

    console.log(`Updating order ${orderId} to status ${normalizedStatus}`);

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

    // Update tracking
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

    // Send notification to customer (retailer)
    await sendNotification({
      userId: updatedOrder.customerId,
      title: `📦 Your Wholesale Order ${normalizedStatus}!`,
      message: `Your wholesale order #${updatedOrder.orderNumber} status has been updated to ${normalizedStatus}`,
      type: 'ORDER_UPDATE',
      actionUrl: `/orders/${updatedOrder.id}`,
      metadata: { orderId: updatedOrder.id, orderNumber: updatedOrder.orderNumber, status: normalizedStatus }
    }).catch(err => console.error('Failed to send notification:', err));

    console.log(`✅ Order ${orderId} updated to ${normalizedStatus}`);

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

// ============================================
// PUBLIC ENDPOINTS (For retailers to browse wholesale products)
// ============================================

// GET /api/wholesaler/public/products - Get all wholesale products
// ✅ FIXED: Added shopId to response!
router.get('/public/products', async (req, res) => {
  try {
    const products = await prisma.product.findMany({
      where: {
        inventories: {
          some: {
            wholesale: true,
            stock: { gt: 0 }
          }
        }
      },
      include: {
        inventories: {
          where: {
            wholesale: true,
            stock: { gt: 0 }
          },
          include: {
            shop: {
              include: {
                owner: {
                  select: {
                    id: true,
                    name: true
                  }
                }
              }
            }
          }
        }
      }
    });

    const transformedProducts = products.map(product => ({
      id: product.id,
      name: product.name,
      description: product.description,
      unit: product.unit,
      category: product.category,
      inventories: product.inventories.map(inv => ({
        id: inv.id,
        price: inv.price,
        wholesalerPrice: inv.wholesalerPrice,
        stock: inv.stock,
        minOrder: 10,
        available: inv.stock > 0,
        wholesaler: {
          id: inv.shop.owner.id,
          name: inv.shop.owner.name,
          shopName: inv.shop.name,
          shopId: inv.shop.id  // ✅ ADDED: shopId from shop!
        }
      }))
    }));

    console.log('Public wholesale products:', transformedProducts.length);
    res.json(transformedProducts);
  } catch (error) {
    console.error('Error fetching public wholesale products:', error);
    res.status(500).json({ error: 'Failed to fetch wholesale products' });
  }
});

module.exports = router;
