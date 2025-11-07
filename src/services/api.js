const API_BASE_URL = 'http://localhost:4000/api';

// Mock users for development
const mockUsers = [
  { id: 1, name: 'Test User', phone: '1234567890', email: 'test@example.com', role: 'CUSTOMER', password: 'password123' },
  { id: 2, name: 'John Doe', phone: '9876543210', email: 'john@example.com', role: 'CUSTOMER', password: 'test123' }
];

// Mock orders for development
const mockOrders = [
  {
    id: 1,
    orderNumber: 'ORD-123456789',
    status: 'CONFIRMED',
    totalAmount: 1500,
    paymentMode: 'UPI',
    paymentStatus: 'PAID',
    createdAt: new Date().toISOString(),
    estimatedDelivery: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
    items: [
      {
        id: 1,
        quantity: 2,
        unitPrice: 25,
        subtotal: 50,
        product: { id: 1, name: 'Carrot', unit: 'kg' },
        shop: { id: 1, name: 'Fresh Mart', address: 'MG Road' }
      },
      {
        id: 2,
        quantity: 1,
        unitPrice: 40,
        subtotal: 40,
        product: { id: 2, name: 'Tomato', unit: 'kg' },
        shop: { id: 1, name: 'Fresh Mart', address: 'MG Road' }
      }
    ]
  }
];

export const api = {
  // Authentication with fallback to mock data
  register: async (userData) => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `Registration failed: ${response.status}`);
      }

      return data;
    } catch (error) {
      console.warn('Backend registration failed, using mock data:', error.message);

      // Mock registration
      const existingUser = mockUsers.find(user => user.phone === userData.phone);
      if (existingUser) {
        throw new Error('User with this phone already exists');
      }

      const newUser = {
        id: mockUsers.length + 1,
        name: userData.name,
        phone: userData.phone,
        email: userData.email,
        role: userData.role || 'CUSTOMER',
        password: userData.password
      };

      mockUsers.push(newUser);

      // Return without password
      const { password, ...userWithoutPassword } = newUser;
      return {
        success: true,
        message: 'Registration successful (mock)',
        user: userWithoutPassword
      };
    }
  },

  login: async (credentials) => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials)
      });

      console.log('Login response status:', response.status);

      const data = await response.json();
      console.log('Login response data:', data);

      if (!response.ok) {
        throw new Error(data.error || `Login failed: ${response.status}`);
      }

      // Store user data in localStorage
      localStorage.setItem('user', JSON.stringify(data.user));

      // Redirect based on role
      const role = data.user.role?.toUpperCase();
      if (role === 'RETAILER') {
        window.location.href = '/dashboard/retailer';
      } else if (role === 'WHOLESALER') {
        window.location.href = '/dashboard/wholesaler';
      } else {
        window.location.href = '/dashboard/customer';
      }

      return data;
    } catch (error) {
      console.warn('Backend login failed, using mock data:', error.message);

      // Mock login with immediate redirect
      const user = mockUsers.find(u => u.phone === credentials.phone && u.password === credentials.password);

      if (!user) {
        throw new Error('Invalid phone or password');
      }

      // Store mock user data
      const { password, ...userWithoutPassword } = user;
      localStorage.setItem('user', JSON.stringify(userWithoutPassword));

      // Redirect based on mock user role
      const role = user.role?.toUpperCase();
      if (role === 'RETAILER') {
        window.location.href = '/dashboard/retailer';
      } else if (role === 'WHOLESALER') {
        window.location.href = '/dashboard/wholesaler';
      } else {
        window.location.href = '/dashboard/customer';
      }

      return {
        success: true,
        message: 'Login successful (mock)',
        user: userWithoutPassword
      };
    }
  },

  // Products
  getProducts: async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/products`);
      if (!response.ok) throw new Error(`Failed to fetch products: ${response.status}`);
      return response.json();
    } catch (error) {
      console.warn('Backend products failed, using mock data');
      // Return mock products with proper structure
      return [
        {
          id: 1,
          name: 'Carrot',
          description: 'Fresh carrots',
          price: 25,
          unit: 'kg',
          category: 'Vegetables',
          inventories: [
            { id: 1, price: 25, stock: 50, wholesale: false, shop: { id: 1, name: 'Local Store', address: 'Test Address' } }
          ]
        },
        {
          id: 2,
          name: 'Tomato',
          description: 'Fresh tomatoes',
          price: 40,
          unit: 'kg',
          category: 'Vegetables',
          inventories: [
            { id: 2, price: 40, stock: 30, wholesale: false, shop: { id: 1, name: 'Local Store', address: 'Test Address' } }
          ]
        }
      ];
    }
  },

  // Cart methods
  addToCart: async (userId, item) => {
    try {
      const response = await fetch(`${API_BASE_URL}/cart/${userId}/add`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item)
      });

      if (!response.ok) throw new Error(`Failed to add to cart: ${response.status}`);
      return response.json();
    } catch (error) {
      console.warn('Backend addToCart failed, using mock data');
      return { success: true, message: 'Mock added to cart' };
    }
  },

  getCart: async (userId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/cart/${userId}`);
      if (!response.ok) throw new Error(`Failed to fetch cart: ${response.status}`);
      return response.json();
    } catch (error) {
      console.warn('Backend getCart failed, using mock data');
      return { items: [] };
    }
  },

  // Order methods - COMPLETE ORDER TRACKING
  createOrder: async (orderData) => {
    try {
      const response = await fetch(`${API_BASE_URL}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `Failed to create order: ${response.status}`);
      }

      return data;
    } catch (error) {
      console.warn('Backend createOrder failed, using mock data:', error.message);

      // Mock order creation
      const mockOrder = {
        success: true,
        order: {
          id: Date.now(),
          orderNumber: `ORD-${Date.now()}`,
          customerId: orderData.userId,
          totalAmount: orderData.totalAmount,
          paymentMode: orderData.paymentMode,
          paymentStatus: orderData.paymentStatus || 'PAID',
          status: 'PLACED',
          createdAt: new Date().toISOString(),
          items: orderData.items.map(item => ({
            id: Math.random(),
            product: { id: item.productId, name: item.name, unit: item.unit },
            shop: { id: item.shopId, name: item.shop, address: 'Local Address' },
            quantity: item.quantity,
            unitPrice: item.price,
            subtotal: item.price * item.quantity
          }))
        }
      };

      // Add to mock orders for tracking
      mockOrders.push(mockOrder.order);

      return mockOrder;
    }
  },

  getUserOrders: async (userId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/orders/user/${userId}`);
      if (!response.ok) throw new Error(`Failed to fetch orders: ${response.status}`);
      return response.json();
    } catch (error) {
      console.warn('Backend getUserOrders failed, using mock data');
      // Return mock orders for the specific user
      return mockOrders.filter(order => order.customerId === userId);
    }
  },

  getOrder: async (orderId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/orders/${orderId}`);
      if (!response.ok) throw new Error(`Failed to fetch order: ${response.status}`);
      return response.json();
    } catch (error) {
      console.warn('Backend getOrder failed, using mock data');
      // Find mock order
      const order = mockOrders.find(o => o.id === parseInt(orderId) || o.orderNumber === orderId);
      if (!order) throw new Error('Order not found');
      return order;
    }
  },

  updateOrderStatus: async (orderId, status, trackingNumber, estimatedDelivery) => {
    try {
      const response = await fetch(`${API_BASE_URL}/orders/${orderId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, trackingNumber, estimatedDelivery })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `Failed to update order status: ${response.status}`);
      }

      return data;
    } catch (error) {
      console.warn('Backend updateOrderStatus failed, using mock data');
      // Update mock order
      const orderIndex = mockOrders.findIndex(o => o.id === parseInt(orderId) || o.orderNumber === orderId);
      if (orderIndex !== -1) {
        mockOrders[orderIndex].status = status;
        if (trackingNumber) mockOrders[orderIndex].trackingNumber = trackingNumber;
        if (estimatedDelivery) mockOrders[orderIndex].estimatedDelivery = estimatedDelivery;
      }

      return {
        success: true,
        message: 'Order status updated successfully (mock)',
        order: mockOrders[orderIndex]
      };
    }
  },

  // Additional utility methods
  clearCart: async (userId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/cart/${userId}/clear`, {
        method: 'DELETE'
      });
      if (!response.ok) throw new Error(`Failed to clear cart: ${response.status}`);
      return response.json();
    } catch (error) {
      console.warn('Backend clearCart failed, using mock data');
      return { success: true, message: 'Cart cleared (mock)' };
    }
  },

  // Add these to your api object in src/services/api.js

  // Shop methods for retailers
  getShopProducts: async (shopId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/shops/${shopId}/products`);
      if (!response.ok) throw new Error(`Failed to fetch shop products: ${response.status}`);
      return response.json();
    } catch (error) {
      console.warn('Backend getShopProducts failed, using mock data');
      // Return mock shop products
      return [
        { id: 1, name: 'Carrot', price: 25, stock: 50, unit: 'kg', category: 'Vegetables' },
        { id: 2, name: 'Tomato', price: 40, stock: 30, unit: 'kg', category: 'Vegetables' }
      ];
    }
  },

  addShopProduct: async (shopId, productData) => {
    try {
      const response = await fetch(`${API_BASE_URL}/shops/${shopId}/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(productData)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `Failed to add product: ${response.status}`);
      }

      return data;
    } catch (error) {
      console.warn('Backend addShopProduct failed, using mock data');
      // Mock success response
      return {
        success: true,
        message: 'Product added successfully (mock)',
        product: { id: Date.now(), ...productData }
      };
    }
  },

  // Get or create retailer's shop
  getOrCreateShop: async (userId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/retailer/${userId}/shop`);
      if (!response.ok) throw new Error(`Failed to get shop: ${response.status}`);
      return response.json();
    } catch (error) {
      console.warn('Backend getOrCreateShop failed, using mock data');
      // Return mock shop
      return {
        id: 1,
        name: 'My Retail Store',
        address: '123 Market Street',
        type: 'RETAIL',
        ownerId: userId
      };
    }
  },

  // Retailer methods
  getRetailerOrders: async (retailerId) => {
    try {
      console.log('Fetching retailer orders for:', retailerId);
      const response = await fetch(`${API_BASE_URL}/retailer/${retailerId}/orders`);

      if (!response.ok) {
        // Try to get detailed error message from backend
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.details || errorData.error || `HTTP ${response.status}`;
        throw new Error(`Failed to fetch retailer orders: ${errorMessage}`);
      }

      const data = await response.json();
      console.log('Retailer orders response:', data);
      return data;
    } catch (error) {
      console.error('Backend retailer orders failed:', error);
      // Return empty array as fallback
      return [];
    }
  },
  getRetailerAnalytics: async (retailerId, timeRange = 'week') => {
    try {
      const response = await fetch(`${API_BASE_URL}/retailer/${retailerId}/analytics?range=${timeRange}`);
      if (!response.ok) throw new Error(`Failed to fetch analytics: ${response.status}`);
      return response.json();
    } catch (error) {
      console.warn('Backend analytics failed, using mock data');
      // Return mock analytics data
      return {
        totalSales: 23000,
        totalOrders: 45,
        activeProducts: 12,
        averageOrderValue: 511,
        revenueData: [
          { day: 'Mon', revenue: 3500 },
          { day: 'Tue', revenue: 4200 },
          { day: 'Wed', revenue: 3800 },
          { day: 'Thu', revenue: 5100 },
          { day: 'Fri', revenue: 4800 },
          { day: 'Sat', revenue: 6200 },
          { day: 'Sun', revenue: 5500 }
        ],
        popularProducts: [
          { name: 'Tomato', sales: 150, revenue: 6000 },
          { name: 'Carrot', sales: 120, revenue: 3000 },
          { name: 'Potato', sales: 90, revenue: 2700 }
        ]
      };
    }
  },

  // Add these to your api object:

  // Retailer methods - REAL IMPLEMENTATION
  getRetailerOrders: async (retailerId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/retailer/${retailerId}/orders`);
      if (!response.ok) throw new Error(`Failed to fetch retailer orders: ${response.status}`);
      return response.json();
    } catch (error) {
      console.error('Backend retailer orders failed:', error);
      return []; // Return empty array instead of mock data
    }
  },

  getRetailerAnalytics: async (retailerId, timeRange = 'week') => {
    try {
      const response = await fetch(`${API_BASE_URL}/retailer/${retailerId}/analytics?range=${timeRange}`);
      if (!response.ok) throw new Error(`Failed to fetch analytics: ${response.status}`);
      return response.json();
    } catch (error) {
      console.error('Backend analytics failed:', error);
      // Return empty analytics instead of mock data
      return {
        totalSales: 0,
        totalOrders: 0,
        activeProducts: 0,
        averageOrderValue: 0,
        revenueData: [],
        popularProducts: []
      };
    }
  },

  updateOrderStatus: async (orderId, status) => {
    try {
      const response = await fetch(`${API_BASE_URL}/orders/${orderId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `Failed to update order status: ${response.status}`);
      }

      return data;
    } catch (error) {
      console.error('Update order status failed:', error);
      throw error;
    }
  },

  // Wholesaler methods
  addWholesalerProduct: async (productData) => {
    try {
      const response = await fetch(`${API_BASE_URL}/wholesaler/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(productData)
      });

      if (!response.ok) throw new Error(`Failed to add product: ${response.status}`);
      return response.json();
    } catch (error) {
      console.warn('Backend addWholesalerProduct failed, using mock data');
      // Mock success response
      return {
        success: true,
        message: 'Product added successfully (mock)',
        product: {
          id: Date.now(),
          ...productData
        }
      };
    }
  },

  getWholesalerProducts: async (wholesalerId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/wholesaler/${wholesalerId}/products`);
      if (!response.ok) throw new Error(`Failed to fetch products: ${response.status}`);
      return response.json();
    } catch (error) {
      console.warn('Backend getWholesalerProducts failed, using mock data');
      return [
        { id: 1, name: 'Tomato', wholesalePrice: 25, retailPrice: 40, stock: 500, unit: 'kg', minOrder: 10 },
        { id: 2, name: 'Potato', wholesalePrice: 15, retailPrice: 30, stock: 800, unit: 'kg', minOrder: 20 }
      ];
    }
  },

  // New: fetch all wholesale products (for retailers to browse wholesale catalogs)
  getAllWholesalerProducts: async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/wholesaler/products`);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to fetch wholesale products: ${response.status} - ${errorText}`);
      }

      const products = await response.json();

      // Validate response structure
      if (!Array.isArray(products)) {
        console.warn('Unexpected response format, using mock data');
        throw new Error('Invalid response format');
      }

      return products;

    } catch (error) {
      console.warn('Backend getAllWholesalerProducts failed, using mock data:', error.message);

      // Enhanced mock data with more variety
      return [
        {
          id: 1,
          name: 'Tomato',
          description: 'Fresh bulk tomatoes, premium quality',
          unit: 'kg',
          category: 'Vegetables',
          image: '/images/tomato.jpg', // Optional: add image support
          inventories: [
            {
              id: 101,
              price: 40,
              wholesalePrice: 25,
              stock: 500,
              wholesale: true,
              minOrder: 10,
              available: true,
              shop: {
                id: 11,
                name: 'Big Wholesale Co',
                address: 'Warehouse 1, Industrial Area',
                rating: 4.5 // Optional: add shop rating
              }
            }
          ]
        },
        {
          id: 2,
          name: 'Potato',
          description: 'Fresh potatoes, good for storage',
          unit: 'kg',
          category: 'Vegetables',
          image: '/images/potato.jpg',
          inventories: [
            {
              id: 102,
              price: 30,
              wholesalePrice: 15,
              stock: 800,
              wholesale: true,
              minOrder: 20,
              available: true,
              shop: {
                id: 12,
                name: 'Bulk Supplies',
                address: 'Warehouse 2, Market Complex',
                rating: 4.2
              }
            }
          ]
        },
        {
          id: 3,
          name: 'Onion',
          description: 'Fresh onions, medium size',
          unit: 'kg',
          category: 'Vegetables',
          inventories: [
            {
              id: 103,
              price: 35,
              wholesalePrice: 20,
              stock: 300,
              wholesale: true,
              minOrder: 15,
              available: true,
              shop: {
                id: 11,
                name: 'Big Wholesale Co',
                address: 'Warehouse 1, Industrial Area',
                rating: 4.5
              }
            }
          ]
        }
      ];
    }
  },

  // Add this to handle retailer wholesale orders
  createOrder: async (orderData) => {
    try {
      const response = await fetch(`${API_BASE_URL}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData)
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || `Failed to create order: ${response.status}`);
      }
      return data;
    } catch (error) {
      console.warn('Backend createOrder failed, using mock data');
      return {
        success: true,
        order: {
          id: Date.now(),
          orderNumber: `ORD-${Date.now()}`,
          status: 'PLACED'
        }
      };
    }
  }

};