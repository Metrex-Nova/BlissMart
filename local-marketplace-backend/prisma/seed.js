const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // --- USERS ---
  const usersData = [];

  // 20 customers
  for (let i = 1; i <= 20; i++) {
    usersData.push({ name: `Customer${i}`, phone: `9000000${i.toString().padStart(3,'0')}`, role: 'CUSTOMER' });
  }

  // 10 retailers
  for (let i = 1; i <= 10; i++) {
    usersData.push({ name: `Retailer${i}`, phone: `9010000${i.toString().padStart(3,'0')}`, role: 'RETAILER' });
  }

  // 5 wholesalers
  for (let i = 1; i <= 5; i++) {
    usersData.push({ name: `Wholesaler${i}`, phone: `9020000${i.toString().padStart(3,'0')}`, role: 'WHOLESALER' });
  }

  const users = [];
  for (const u of usersData) {
    const user = await prisma.user.create({ data: u });
    users.push(user);
  }

  // --- SHOPS ---
  const shopsData = [];
  // 10 retailers each have a shop
  users.filter(u => u.role === 'RETAILER').forEach((r, idx) => {
    shopsData.push({
      name: `${r.name} Shop`,
      ownerId: r.id,
      type: 'RETAIL',
      address: `${100 + idx} Market Road`,
      lat: 17.4 + idx * 0.01,
      lng: 78.5 + idx * 0.01
    });
  });
  // 5 wholesalers each have a shop
  users.filter(u => u.role === 'WHOLESALER').forEach((w, idx) => {
    shopsData.push({
      name: `${w.name} Hub`,
      ownerId: w.id,
      type: 'WHOLESALE',
      address: `${200 + idx} Wholesale Lane`,
      lat: 17.6 + idx * 0.01,
      lng: 78.7 + idx * 0.01
    });
  });

  const shops = [];
  for (const s of shopsData) {
    const shop = await prisma.shop.create({ data: s });
    shops.push(shop);
  }

  // --- PRODUCTS ---
  const productNames = [
    'Tomato', 'Potato', 'Onion', 'Carrot', 'Cabbage',
    'Apple', 'Banana', 'Mango', 'Orange', 'Grapes',
    'Milk', 'Eggs', 'Bread', 'Rice', 'Wheat'
  ];

  const products = [];
  for (const name of productNames) {
    const p = await prisma.product.create({ data: { name, unit: 'kg', category: name.match(/Milk|Eggs|Bread|Rice|Wheat/) ? 'Grocery' : 'Vegetable/Fruit' } });
    products.push(p);
  }

  // --- INVENTORY ---
  const inventoryData = [];
  // Assign 3–5 random products to each shop
  for (const shop of shops) {
    const shuffled = products.sort(() => 0.5 - Math.random());
    const itemsCount = Math.floor(Math.random() * 5) + 3; // 3–7 products
    for (let i = 0; i < itemsCount; i++) {
      const product = shuffled[i];
      inventoryData.push({
        shopId: shop.id,
        productId: product.id,
        price: Math.floor(Math.random() * 100) + 10, // 10–110
        stock: Math.floor(Math.random() * 500) + 50,
        wholesale: shop.type === 'WHOLESALE',
        wholesalerPrice: shop.type === 'WHOLESALE' ? Math.floor(Math.random() * 90) + 5 : null
      });
    }
  }

  for (const inv of inventoryData) {
    await prisma.productInventory.create({ data: inv });
  }

  console.log(`✅ Seed complete! Users: ${users.length}, Shops: ${shops.length}, Products: ${products.length}, Inventory items: ${inventoryData.length}`);
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
