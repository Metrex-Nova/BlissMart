const express = require('express');
const { PrismaClient } = require('@prisma/client');

const router = express.Router();
const prisma = new PrismaClient();

// POST /api/reviews - Add review for a product
router.post('/', async (req, res) => {
  try {
    const { productId, userId, rating, comment } = req.body;

    // Check if user already reviewed this product
    const existingReview = await prisma.review.findFirst({
      where: {
        productId: parseInt(productId),
        userId: parseInt(userId)
      }
    });

    if (existingReview) {
      return res.status(400).json({ error: 'You have already reviewed this product' });
    }

    const review = await prisma.review.create({
      data: {
        productId: parseInt(productId),
        userId: parseInt(userId),
        rating: parseInt(rating),
        comment: comment
      },
      include: {
        product: true,
        user: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    res.status(201).json({ message: 'Review added successfully', review });
  } catch (error) {
    console.error('Review error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/reviews/product/:productId - Get reviews for a product
router.get('/product/:productId', async (req, res) => {
  try {
    const reviews = await prisma.review.findMany({
      where: {
        productId: parseInt(req.params.productId)
      },
      include: {
        user: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Calculate average rating
    const averageRating = reviews.length > 0 
      ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length 
      : 0;

    res.json({
      reviews,
      averageRating: Math.round(averageRating * 10) / 10,
      totalReviews: reviews.length
    });
  } catch (error) {
    console.error('Get reviews error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;