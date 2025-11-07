const express = require('express');
const { PrismaClient } = require('@prisma/client');

const router = express.Router();
const prisma = new PrismaClient();

// GET /api/cart/:userId - Get user's cart
router.get('/:userId', async (req, res) => {
  try {
    let cart = await prisma.cart.findUnique({
      where: { userId: parseInt(req.params.userId) },
      include: { 
        items: { 
          include: { 
            product: true
          } 
        } 
      }
    });

    if (!cart) {
      // Create empty cart if doesn't exist
      cart = await prisma.cart.create({
        data: {
          userId: parseInt(req.params.userId)
        },
        include: {
          items: {
            include: {
              product: true
            }
          }
        }
      });
    }

    res.json(cart);
  } catch (error) {
    console.error('Cart error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/cart/:userId/add - Add item to cart
router.post('/:userId/add', async (req, res) => {
  try {
    const { productId, quantity, shopId } = req.body;
    const userId = parseInt(req.params.userId);

    // Get or create cart
    let cart = await prisma.cart.findUnique({
      where: { userId }
    });

    if (!cart) {
      cart = await prisma.cart.create({
        data: { userId }
      });
    }

    // Get current price from inventory
    const inventory = await prisma.productInventory.findFirst({
      where: {
        productId: parseInt(productId),
        shopId: parseInt(shopId)
      }
    });

    if (!inventory) {
      return res.status(404).json({ error: 'Product not found in this shop' });
    }

    if (inventory.stock < quantity) {
      return res.status(400).json({ error: 'Insufficient stock' });
    }

    // Add item to cart
    const cartItem = await prisma.cartItem.upsert({
      where: {
        cartId_productId_shopId: {
          cartId: cart.id,
          productId: parseInt(productId),
          shopId: parseInt(shopId)
        }
      },
      update: {
        quantity: { increment: quantity },
        price: inventory.price
      },
      create: {
        cartId: cart.id,
        productId: parseInt(productId),
        shopId: parseInt(shopId),
        quantity: quantity,
        price: inventory.price
      },
      include: {
        product: true
      }
    });

    res.json({ message: 'Item added to cart', cartItem });
  } catch (error) {
    console.error('Add to cart error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;