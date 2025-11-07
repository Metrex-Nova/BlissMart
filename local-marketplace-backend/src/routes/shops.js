const express = require('express');
const { PrismaClient } = require('@prisma/client');

const router = express.Router();
const prisma = new PrismaClient();

// GET /api/shops/:shopId/products - Get all products for a shop
router.get('/:shopId/products', async (req, res) => {
  try {
    const { shopId } = req.params;

    const products = await prisma.productInventory.findMany({
      where: { shopId: parseInt(shopId) },
      include: {
        product: true,
        shop: true
      }
    });

    // Transform the data to match what frontend expects
    const transformedProducts = products.map(inventory => ({
      id: inventory.id,
      name: inventory.product.name,
      price: inventory.price,
      stock: inventory.stock,
      unit: inventory.product.unit,
      category: inventory.product.category,
      description: inventory.product.description
    }));

    res.json(transformedProducts);
  } catch (error) {
    console.error('Get shop products error:', error);
    res.status(500).json({ error: 'Failed to fetch shop products' });
  }
});

// POST /api/shops/:shopId/products - Add product to shop inventory
router.post('/:shopId/products', async (req, res) => {
  try {
    const { shopId } = req.params;
    const { name, price, stock, unit, category, description } = req.body;

    // First create the product
    const product = await prisma.product.create({
      data: {
        name,
        unit,
        category: category || 'General',
        description: description || `Fresh ${name}`
      }
    });

    // Then create the inventory entry
    const inventory = await prisma.productInventory.create({
      data: {
        shopId: parseInt(shopId),
        productId: product.id,
        price: parseFloat(price),
        stock: parseInt(stock)
      },
      include: {
        product: true,
        shop: true
      }
    });

    res.json({
      success: true,
      message: 'Product added successfully',
      product: {
        id: inventory.id,
        name: inventory.product.name,
        price: inventory.price,
        stock: inventory.stock,
        unit: inventory.product.unit,
        category: inventory.product.category
      }
    });

  } catch (error) {
    console.error('Add shop product error:', error);
    res.status(500).json({ error: 'Failed to add product: ' + error.message });
  }
});

// DELETE /api/shops/:shopId/products/:productId - Delete product from shop inventory
router.delete('/:shopId/products/:productId', async (req, res) => {
  try {
    const { shopId, productId } = req.params;

    // Find the inventory entry
    const inventory = await prisma.productInventory.findFirst({
      where: {
        id: parseInt(productId),
        shopId: parseInt(shopId)
      },
      include: {
        product: true
      }
    });

    if (!inventory) {
      return res.status(404).json({ error: 'Product not found in shop inventory' });
    }

    // Delete the inventory entry
    await prisma.productInventory.delete({
      where: { id: parseInt(productId) }
    });

    res.json({
      success: true,
      message: 'Product deleted successfully'
    });

  } catch (error) {
    console.error('Delete shop product error:', error);
    res.status(500).json({ error: 'Failed to delete product: ' + error.message });
  }
});

module.exports = router;