const express = require('express');
const { PrismaClient } = require('@prisma/client');

const router = express.Router();
const prisma = new PrismaClient();

// POST /api/payments/cod - Cash on Delivery
router.post('/cod', async (req, res) => {
  try {
    const { orderId } = req.body;
    
    // Update order status for COD
    await prisma.order.update({
      where: { id: parseInt(orderId) },
      data: {
        status: 'CONFIRMED',
        paymentMode: 'COD'
      }
    });

    res.json({
      success: true,
      message: 'Order confirmed with Cash on Delivery'
    });
  } catch (error) {
    console.error('COD error:', error);
    res.status(500).json({ error: 'Failed to process COD order' });
  }
});

// POST /api/payments/create-razorpay-order - Create Razorpay order
router.post('/create-razorpay-order', async (req, res) => {
  try {
    const { amount, orderId } = req.body;

    // For now, return mock Razorpay order (we'll add real integration next)
    const mockOrder = {
      id: `order_${Date.now()}`,
      amount: amount * 100,
      currency: "INR",
      receipt: `receipt_${orderId}`
    };

    res.json({
      success: true,
      order: mockOrder
    });
  } catch (error) {
    console.error('Create Razorpay order error:', error);
    res.status(500).json({ error: 'Failed to create payment order' });
  }
});

// POST /api/payments/verify - Verify payment (mock for now)
router.post('/verify', async (req, res) => {
  try {
    console.log('Payment verification called:', req.body);
    
    const { razorpay_payment_id, orderId } = req.body;

    if (!orderId) {
      return res.status(400).json({ error: 'Order ID is required' });
    }

    // Mock verification - update order status
    const updatedOrder = await prisma.order.update({
      where: { id: parseInt(orderId) },
      data: {
        status: 'CONFIRMED',
        paymentMode: 'UPI'
      }
    });

    console.log('Order updated successfully:', updatedOrder.id);

    res.json({
      success: true,
      message: 'Payment verified successfully',
      paymentId: razorpay_payment_id || 'mock_payment_id'
    });
  } catch (error) {
    console.error('Verify payment error:', error);
    res.status(500).json({ error: 'Payment verification failed: ' + error.message });
  }
});

// UPI PAYMENT ROUTES

// POST /api/payments/track-upi-attempt - Track UPI payment attempt
router.post('/track-upi-attempt', async (req, res) => {
  try {
    const { orderId, amount } = req.body;
    
    console.log(`UPI payment attempted for order ${orderId}, amount: ${amount}`);
    
    // Update order status to indicate payment is pending
    const updatedOrder = await prisma.order.update({
      where: { id: parseInt(orderId) },
      data: {
        status: 'PAYMENT_PENDING',
        paymentMode: 'UPI',
        totalAmount: parseFloat(amount)
      }
    });

    res.json({ 
      success: true, 
      message: 'UPI payment attempt logged',
      orderId: updatedOrder.id,
      status: updatedOrder.status
    });
  } catch (error) {
    console.error('Error tracking UPI payment:', error);
    res.status(500).json({ error: 'Failed to track payment: ' + error.message });
  }
});

// POST /api/payments/verify-upi-payment - Verify UPI payment manually
router.post('/verify-upi-payment', async (req, res) => {
  try {
    const { orderId, transactionId } = req.body;
    
    if (!orderId || !transactionId) {
      return res.status(400).json({ 
        error: 'Order ID and Transaction ID are required' 
      });
    }

    console.log(`Manual UPI payment verification for order ${orderId}, transaction: ${transactionId}`);
    
    // Update order status to confirmed/paid
    const updatedOrder = await prisma.order.update({
      where: { id: parseInt(orderId) },
      data: {
        status: 'CONFIRMED',
        paymentMode: 'UPI',
        paymentStatus: 'PAID',
        transactionId: transactionId
      }
    });

    // Here you could also:
    // 1. Send confirmation email
    // 2. Update inventory
    // 3. Send notification to admin/retailer

    res.json({ 
      success: true, 
      message: 'UPI payment verified successfully',
      orderId: updatedOrder.id,
      transactionId: transactionId,
      status: updatedOrder.status
    });
  } catch (error) {
    console.error('Error verifying UPI payment:', error);
    res.status(500).json({ error: 'Failed to verify payment: ' + error.message });
  }
});

// POST /api/payments/cancel-upi-payment - Cancel pending UPI payment
router.post('/cancel-upi-payment', async (req, res) => {
  try {
    const { orderId } = req.body;
    
    const updatedOrder = await prisma.order.update({
      where: { id: parseInt(orderId) },
      data: {
        status: 'CANCELLED',
        paymentStatus: 'FAILED'
      }
    });

    res.json({ 
      success: true, 
      message: 'UPI payment cancelled',
      orderId: updatedOrder.id,
      status: updatedOrder.status
    });
  } catch (error) {
    console.error('Error cancelling UPI payment:', error);
    res.status(500).json({ error: 'Failed to cancel payment: ' + error.message });
  }
});

// GET /api/payments/order-status/:orderId - Check order payment status
router.get('/order-status/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;
    
    const order = await prisma.order.findUnique({
      where: { id: parseInt(orderId) },
      select: {
        id: true,
        status: true,
        paymentMode: true,
        paymentStatus: true,
        totalAmount: true,
        transactionId: true,
        createdAt: true
      }
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json({
      success: true,
      order: order
    });
  } catch (error) {
    console.error('Error fetching order status:', error);
    res.status(500).json({ error: 'Failed to fetch order status: ' + error.message });
  }
});

module.exports = router;