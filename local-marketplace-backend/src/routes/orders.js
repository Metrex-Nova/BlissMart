const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { sendNotification } = require('../utils/notificationService');

const router = express.Router();
const prisma = new PrismaClient();

// POST /api/orders - Create new order
router.post('/', async (req, res) => {
  try {
    console.log('=== ORDER REQUEST RECEIVED ===');
    console.log('Body:', JSON.stringify(req.body, null, 2));

    const { userId, items, paymentMode, totalAmount, paymentStatus = 'PAID' } = req.body;

    // Validate required fields
    if (!userId || !items || !paymentMode || !totalAmount) {
      return res.status(400).json({
        error: 'Missing required fields: userId, items, paymentMode, totalAmount'
      });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Items must be a non-empty array' });
    }

    console.log(`✅ Validation passed - ${items.length} items`);

    // ✅ Validate all shopIds exist before creating order
    console.log('Validating shops...');
    const uniqueShopIds = [...new Set(items.map(item => parseInt(item.shopId)))];
    const shops = await prisma.shop.findMany({
      where: { id: { in: uniqueShopIds } }
    });

    console.log(`Found ${shops.length} shops, need ${uniqueShopIds.length}`);

    if (shops.length !== uniqueShopIds.length) {
      const foundIds = shops.map(s => s.id);
      const missingIds = uniqueShopIds.filter(id => !foundIds.includes(id));
      return res.status(400).json({
        error: `Shop IDs not found: ${missingIds.join(', ')}. Please check wholesaler shop IDs.`
      });
    }

    console.log('✅ All shops validated');

    // ✅ Validate all productIds exist
    console.log('Validating products...');
    const uniqueProductIds = [...new Set(items.map(item => parseInt(item.productId)))];
    const products = await prisma.product.findMany({
      where: { id: { in: uniqueProductIds } }
    });

    if (products.length !== uniqueProductIds.length) {
      const foundIds = products.map(p => p.id);
      const missingIds = uniqueProductIds.filter(id => !foundIds.includes(id));
      return res.status(400).json({
        error: `Product IDs not found: ${missingIds.join(', ')}`
      });
    }

    console.log('✅ All products validated');

    // Generate order number
    const orderNumber = `ORD-${Date.now()}`;

    console.log('Creating order with items:');
    items.forEach((item, idx) => {
      console.log(`  ${idx + 1}. Product ${item.productId} x${item.quantity} @ ₹${item.price} from Shop ${item.shopId}`);
    });

    // Create order with items
    const order = await prisma.order.create({
      data: {
        orderNumber,
        customerId: parseInt(userId),
        totalAmount: parseFloat(totalAmount),
        paymentMode,
        paymentStatus: paymentStatus || 'PAID',
        status: 'PLACED',
        items: {
          create: items.map(item => ({
            productId: parseInt(item.productId),
            quantity: parseInt(item.quantity),
            unitPrice: parseFloat(item.price),
            subtotal: parseFloat(item.price) * parseInt(item.quantity),
            shopId: parseInt(item.shopId)
          }))
        },
        tracking: {
          create: {
            status: 'PLACED'
          }
        }
      },
      include: {
        items: {
          include: {
            product: true,
            shop: true
          }
        },
        tracking: true,
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

    console.log('✅ Order created successfully:', order.id);

    // Update product inventory stock
    console.log('Updating inventory...');
    for (const item of items) {
      const updated = await prisma.productInventory.updateMany({
        where: {
          productId: parseInt(item.productId),
          shopId: parseInt(item.shopId)
        },
        data: {
          stock: {
            decrement: parseInt(item.quantity)
          }
        }
      });
      console.log(`  Updated ${updated.count} inventory records for product ${item.productId} at shop ${item.shopId}`);
    }

    // ✅ Send notification to customer
    await sendNotification({
      userId: parseInt(userId),
      title: '🎉 Order Placed Successfully!',
      message: `Your order #${orderNumber} for ₹${totalAmount} has been placed. Total items: ${items.length}`,
      type: 'ORDER_PLACED',
      actionUrl: `/orders/${order.id}`,
      metadata: { orderId: order.id, orderNumber }
    }).catch(err => console.error('Failed to send customer notification:', err));

    console.log('✅ Customer notification sent');

    // ✅ Send notification to retailers/wholesalers
    const uniqueShops = [...new Set(items.map(item => parseInt(item.shopId)))];
    for (const shopId of uniqueShops) {
      const shop = await prisma.shop.findUnique({
        where: { id: shopId },
        select: { ownerId: true, name: true }
      });

      if (shop) {
        const shopItems = items.filter(item => parseInt(item.shopId) === shopId);
        const shopTotal = shopItems.reduce((sum, item) => sum + (parseFloat(item.price) * parseInt(item.quantity)), 0);

        await sendNotification({
          userId: shop.ownerId,
          title: '📦 New Order Received!',
          message: `You have a new order #${orderNumber} with ${shopItems.length} items for ₹${shopTotal.toFixed(2)}`,
          type: 'ORDER_PLACED',
          actionUrl: `/wholesaler/orders/${order.id}`,
          metadata: { orderId: order.id, orderNumber, shopId }
        }).catch(err => console.error(`Failed to send shop notification for shop ${shopId}:`, err));

        console.log(`✅ Notification sent to shop owner ${shop.ownerId} for shop ${shop.name}`);
      }
    }

    console.log('=== ORDER CREATION COMPLETE ===\n');

    res.json({
      success: true,
      message: 'Order created successfully',
      order: order
    });

  } catch (error) {
    console.error('❌ Create order error:', error);
    res.status(500).json({
      error: 'Failed to create order: ' + error.message,
      details: error.stack
    });
  }
});

// GET /api/orders/user/:userId - Get user's orders
router.get('/user/:userId', async (req, res) => {
  try {
    const orders = await prisma.order.findMany({
      where: { customerId: parseInt(req.params.userId) },
      include: {
        items: {
          include: {
            product: true,
            shop: true
          }
        },
        tracking: true
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(orders);
  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// GET /api/orders/retailer/:retailerId - Get retailer's orders with analytics
router.get('/retailer/:retailerId', async (req, res) => {
  try {
    const retailerId = parseInt(req.params.retailerId);

    const shop = await prisma.shop.findFirst({
      where: { ownerId: retailerId }
    });

    if (!shop) {
      return res.json({
        success: true,
        orders: [],
        analytics: {
          totalOrders: 0,
          totalRevenue: 0,
          pendingOrders: 0,
          completedOrders: 0
        }
      });
    }

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

    // Calculate analytics
    const analytics = {
      totalOrders: orders.length,
      totalRevenue: orders.reduce((sum, order) => {
        const orderTotal = order.items.reduce((itemSum, item) => 
          itemSum + (parseFloat(item.unitPrice) * parseInt(item.quantity)), 0
        );
        return sum + orderTotal;
      }, 0),
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
    res.status(500).json({ error: 'Failed to fetch retailer orders' });
  }
});

// GET /api/orders/:orderId - Get specific order details
router.get('/:orderId', async (req, res) => {
  try {
    const order = await prisma.order.findUnique({
      where: { id: parseInt(req.params.orderId) },
      include: {
        items: {
          include: {
            product: true,
            shop: true
          }
        },
        tracking: true,
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

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json(order);
  } catch (error) {
    console.error('Get order error:', error);
    res.status(500).json({ error: 'Failed to fetch order' });
  }
});

// PUT /api/orders/:orderId/status - Update order status
router.put('/:orderId/status', async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status, trackingNumber, estimatedDelivery } = req.body;

    if (!status) {
      return res.status(400).json({ error: 'Status is required' });
    }

    const updatedOrder = await prisma.order.update({
      where: { id: parseInt(orderId) },
      data: {
        status,
        ...(trackingNumber && { trackingNumber }),
        ...(estimatedDelivery && { estimatedDelivery: new Date(estimatedDelivery) })
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
        }
      }
    });

    // Update tracking
    await prisma.tracking.upsert({
      where: { orderId: parseInt(orderId) },
      update: { status, updatedAt: new Date() },
      create: {
        orderId: parseInt(orderId),
        status
      }
    });

    // ✅ Send status update notification to customer
    await sendNotification({
      userId: updatedOrder.customerId,
      title: `📦 Order ${status}!`,
      message: `Your order #${updatedOrder.orderNumber} status has been updated to ${status}`,
      type: 'ORDER_UPDATE',
      actionUrl: `/orders/${updatedOrder.id}`,
      metadata: { orderId: updatedOrder.id, orderNumber: updatedOrder.orderNumber, status }
    }).catch(err => console.error('Failed to send status update notification:', err));

    res.json({
      success: true,
      message: 'Order status updated successfully',
      order: updatedOrder
    });

  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({ error: 'Failed to update order status' });
  }
});

module.exports = router;
