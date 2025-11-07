const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkProducts() {
  try {
    console.log('📦 Checking all products in database...');
    
    const inventories = await prisma.productInventory.findMany({
      include: {
        product: true,
        shop: {
          include: {
            owner: true
          }
        }
      }
    });

    console.log(`Found ${inventories.length} product inventories:`);
    inventories.forEach(inv => {
      console.log(`- ${inv.product.name} | Price: ${inv.price} | Wholesale: ${inv.wholesale} | Stock: ${inv.stock} | Shop: ${inv.shop.name} (${inv.shop.owner.role})`);
    });
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkProducts();