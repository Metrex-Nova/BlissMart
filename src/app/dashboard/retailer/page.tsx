'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut, Plus, Edit2, Trash2, Package, TrendingUp, AlertCircle, BarChart3 } from 'lucide-react';
import NotificationCenter from '@/components/NotificationCenter';

interface Product {
  id: number;
  name: string;
  category: string;
  price: number;
  stock: number;
  description: string;
}

interface OrderItem {
  id: number;
  productId: number;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  product: { name: string };
}

interface Order {
  id: number;
  orderNumber: string;
  totalAmount: number;
  status: string;
  paymentMode: string;
  paymentStatus: string;
  createdAt: string;
  items: OrderItem[];
  customer: {
    name: string;
    phone: string;
    email: string;
  };
}

interface WholesaleProduct {
  id: number;
  name: string;
  description: string;
  unit: string;
  category: string;
  inventories: Array<{
    id: number;
    price: number;
    wholesalerPrice: number;
    stock: number;
    minOrder: number;
    available: boolean;
    wholesaler: {
      id: number;
      name: string;
      shopName: string;
      shopId: number;
    };
  }>;
}

interface Analytics {
  totalOrders: number;
  totalRevenue: number;
  pendingOrders: number;
  completedOrders: number;
}

interface User {
  id: number;
  name: string;
  phone: string;
  role: string;
  email?: string;
}

export default function RetailerDashboard() {
  const router = useRouter();

const API_URL = 'https://blissmart-1.onrender.com';

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [analytics, setAnalytics] = useState<Analytics>({
    totalOrders: 0,
    totalRevenue: 0,
    pendingOrders: 0,
    completedOrders: 0
  });

  const [currentTab, setCurrentTab] = useState<'analytics' | 'products' | 'orders' | 'wholesale'>('analytics');

  const [wholesaleProducts, setWholesaleProducts] = useState<WholesaleProduct[]>([]);
  const [wholesaleCart, setWholesaleCart] = useState<Array<{
    id: number;
    quantity: number;
    wholesalerId: number;
    price: number;
  }>>([]);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    category: 'General',
    price: '',
    stock: '',
    description: ''
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  // ✅ FIX #2: Debug logging
  useEffect(() => {
    console.log('🔵 API_URL:', API_URL);
    console.log('🔵 Environment:', {
      apiUrl: process.env.NEXT_PUBLIC_API_URL,
      appName: process.env.NEXT_PUBLIC_APP_NAME
    });
  }, [API_URL]);

  // Auth Check
  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (!userData) {
      router.push('/login');
      return;
    }

    try {
      const parsedUser = JSON.parse(userData);
      if (parsedUser.role !== 'RETAILER') {
        router.push('/login');
        return;
      }
      setUser(parsedUser);
    } catch (error) {
      console.error('Auth error:', error);
      router.push('/login');
    } finally {
      setLoading(false);
    }
  }, [router]);

  // ✅ FIX #3: Use API_URL in all fetches
  const fetchProducts = async () => {
    if (!user) return;

    try {
      const url = `${API_URL}/api/retailer/${user.id}/my-products`;
      console.log('📍 Fetching products from:', url);

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setProducts(data);
      }
    } catch (error) {
      console.error('Failed to fetch products:', error);
    }
  };

  const fetchOrdersAndAnalytics = async () => {
    if (!user) return;

    try {
      const url = `${API_URL}/api/orders/retailer/${user.id}`;
      console.log('📍 Fetching orders from:', url);

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('📊 Analytics data:', data.analytics);
        setOrders(data.orders);
        setAnalytics(data.analytics);
        setLastRefresh(new Date());
      }
    } catch (error) {
      console.error('Failed to fetch orders:', error);
    }
  };

  const fetchWholesaleProducts = async () => {
    try {
      const url = `${API_URL}/api/wholesaler/public/products`;
      console.log('📍 Fetching wholesale products from:', url);

      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setWholesaleProducts(data);
      }
    } catch (error) {
      console.error('Failed to fetch wholesale products:', error);
    }
  };

  // Initial Load
  useEffect(() => {
    if (!user) return;

    fetchProducts();
    fetchOrdersAndAnalytics();
    fetchWholesaleProducts();

    const interval = setInterval(() => {
      fetchProducts();
      fetchOrdersAndAnalytics();
      fetchWholesaleProducts();
    }, 5000);

    return () => clearInterval(interval);
  }, [user]);

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!formData.name || !formData.price || !formData.stock) {
      setError('Please fill in all required fields');
      return;
    }

    try {
      const url = `${API_URL}/api/retailer/${user?.id}/products`;
      console.log('📍 Adding product to:', url);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          name: formData.name,
          category: formData.category,
          price: parseFloat(formData.price),
          stock: parseInt(formData.stock),
          description: formData.description
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to add product');
      }

      setSuccess('✅ Product added successfully!');
      setFormData({ name: '', category: 'General', price: '', stock: '', description: '' });
      setShowAddProduct(false);
      fetchProducts();

      setTimeout(() => setSuccess(null), 3000);
    } catch (error: any) {
      setError(`❌ ${error.message}`);
      setTimeout(() => setError(null), 3000);
    }
  };

  const handleDeleteProduct = async (productId: number) => {
    if (!confirm('Are you sure you want to delete this product?')) return;

    try {
      const url = `${API_URL}/api/retailer/${user?.id}/products/${productId}`;
      console.log('📍 Deleting product from:', url);

      const response = await fetch(url, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        setSuccess('✅ Product deleted successfully!');
        fetchProducts();
        setTimeout(() => setSuccess(null), 3000);
      }
    } catch (error) {
      console.error('Delete error:', error);
      setError('Failed to delete product');
      setTimeout(() => setError(null), 3000);
    }
  };

  const updateOrderStatus = async (orderId: number, newStatus: string) => {
    try {
      const url = `${API_URL}/api/retailer/${user?.id}/orders/${orderId}/status`;
      console.log('📍 Updating order status to:', url);

      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (response.ok) {
        setSuccess(`✅ Order status updated to ${newStatus}!`);
        fetchOrdersAndAnalytics();
        setTimeout(() => setSuccess(null), 3000);
      } else {
        const errorData = await response.json();
        setError(`❌ ${errorData.error}`);
        setTimeout(() => setError(null), 3000);
      }
    } catch (error: any) {
      setError(`❌ Failed to update status: ${error.message}`);
      setTimeout(() => setError(null), 3000);
    }
  };

  const handlePrintInvoice = async (orderId: number, orderNumber: string) => {
    try {
      const url = `${API_URL}/api/retailer/${user?.id}/orders/${orderId}/invoice`;
      console.log('📍 Fetching invoice from:', url);

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch invoice');
      }

      const data = await response.json();
      const invoice = data.invoice;

      let itemsHTML = '';
      invoice.items.forEach((item: any) => {
        itemsHTML += `
          <tr>
            <td>${item.productName}</td>
            <td style="text-align: center;">${item.quantity}</td>
            <td style="text-align: right;">₹${item.unitPrice.toFixed(2)}</td>
            <td style="text-align: right;">₹${item.subtotal.toFixed(2)}</td>
          </tr>
        `;
      });

      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>Invoice-${orderNumber}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: Arial, sans-serif; background: #f5f5f5; padding: 20px; }
            .container { background: white; max-width: 900px; margin: 0 auto; padding: 40px; box-shadow: 0 0 10px rgba(0,0,0,0.1); }
            .header { text-align: center; margin-bottom: 40px; border-bottom: 2px solid #333; padding-bottom: 20px; }
            .header h1 { font-size: 36px; margin-bottom: 5px; }
            .details-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-bottom: 40px; }
            .detail-section { }
            .detail-section h3 { font-size: 14px; margin-bottom: 10px; border-bottom: 1px solid #ccc; padding-bottom: 8px; }
            .detail-section p { margin: 5px 0; font-size: 13px; line-height: 1.6; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            table th { padding: 12px; text-align: left; border-bottom: 2px solid #333; font-weight: 600; font-size: 13px; }
            table td { padding: 12px; border-bottom: 1px solid #ddd; font-size: 13px; }
            .summary-row { display: flex; justify-content: flex-end; margin-bottom: 8px; width: 50%; margin-left: 50%; }
            .summary-label { flex: 1; font-size: 13px; }
            .summary-value { width: 150px; text-align: right; font-weight: 600; font-size: 13px; }
            .total-row { border-top: 2px solid #333; border-bottom: 2px solid #333; padding-top: 8px; padding-bottom: 8px; margin-top: 10px; }
            .payment-info { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; }
            .payment-box { background: #f9f9f9; padding: 15px; border: 1px solid #ddd; }
            .footer { text-align: center; font-size: 12px; margin-top: 40px; padding-top: 20px; border-top: 1px solid #ccc; }
            @media print { body { padding: 0; background: white; } .container { box-shadow: none; } }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>INVOICE</h1>
              <div>Order #${invoice.orderNumber}</div>
            </div>

            <div class="details-grid">
              <div class="detail-section">
                <h3>Order Information</h3>
                <p><strong>Date:</strong> ${invoice.date}</p>
                <p><strong>Time:</strong> ${invoice.time}</p>
                <p><strong>Status:</strong> ${invoice.status}</p>
              </div>
              <div class="detail-section">
                <h3>Customer Information</h3>
                <p><strong>Name:</strong> ${invoice.customer.name}</p>
                <p><strong>Email:</strong> ${invoice.customer.email}</p>
                <p><strong>Phone:</strong> ${invoice.customer.phone}</p>
              </div>
            </div>

            <h3>Order Items</h3>
            <table>
              <thead>
                <tr>
                  <th>Product</th>
                  <th style="text-align: center;">Qty</th>
                  <th style="text-align: right;">Price</th>
                  <th style="text-align: right;">Amount</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHTML}
              </tbody>
            </table>

            <div class="summary-row">
              <span class="summary-label">Subtotal:</span>
              <span class="summary-value">₹${invoice.subtotal.toFixed(2)}</span>
            </div>
            <div class="summary-row total-row">
              <span class="summary-label" style="font-size: 16px; font-weight: bold;">Total:</span>
              <span class="summary-value" style="font-size: 16px; font-weight: bold;">₹${invoice.totalAmount.toFixed(2)}</span>
            </div>

            <div class="payment-info">
              <div class="payment-box">
                <strong>Payment Mode</strong><br>${invoice.paymentMode}
              </div>
              <div class="payment-box">
                <strong>Status</strong><br>${invoice.paymentStatus}
              </div>
            </div>

            <div class="footer">
              <p>Thank you for your business!</p>
            </div>
          </div>
        </body>
        </html>
      `;

      const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
      const url2 = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url2;
      link.download = `Invoice-${orderNumber}.html`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url2);

      setSuccess('✅ Invoice downloaded!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (error: any) {
      setError(`❌ ${error.message}`);
      setTimeout(() => setError(null), 3000);
    }
  };

  const addToWholesaleCart = (inventoryId: number, wholesalerId: number, price: number, shopId: number) => {
    const quantity = prompt('Enter quantity (minimum 10):', '10');
    if (!quantity || parseInt(quantity) < 10) {
      setError('Minimum order quantity is 10');
      setTimeout(() => setError(null), 3000);
      return;
    }

    setWholesaleCart([...wholesaleCart, {
      id: inventoryId,
      quantity: parseInt(quantity),
      wholesalerId: shopId,
      price: price
    }]);

    setSuccess('✅ Added to cart!');
    setTimeout(() => setSuccess(null), 3000);
  };

  const placeWholesaleOrder = async () => {
    if (wholesaleCart.length === 0) {
      setError('Cart is empty');
      return;
    }

    try {
      const totalAmount = wholesaleCart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      const YOUR_UPI_ID = 'parasbalani748@okhdfcbank';

      const qrWindow = window.open('', 'UPI Payment', 'width=400,height=500');

      if (!qrWindow) {
        alert('Please allow popups for payment');
        return;
      }

      qrWindow.document.write(`
      <html>
        <head><title>UPI Payment - ₹${totalAmount}</title></head>
        <body style="font-family: Arial; text-align: center; padding: 20px;">
          <h2>Pay ₹${totalAmount}</h2>
          <img src="/QRcode.png" alt="UPI QR" style="width: 250px; height: 250px; border: 1px solid #ccc; margin: 20px 0;">
          <p><strong>UPI ID:</strong> ${YOUR_UPI_ID}</p>
          <div style="margin: 20px 0;">
            <button onclick="window.opener.postMessage('payment_success', '*'); window.close();" 
                    style="background: #22c55e; color: white; border: none; padding: 12px 24px; border-radius: 8px; cursor: pointer; font-size: 16px; margin: 5px;">
              Paid
            </button>
            <br>
            <button onclick="window.close()" 
                    style="background: #dc3545; color: white; border: none; padding: 10px 20px; border-radius: 8px; cursor: pointer; font-size: 14px; margin: 5px;">
              Cancel
            </button>
          </div>
        </body>
      </html>
    `);

      const paymentConfirmed = await new Promise((resolve) => {
        const handleMessage = (event: MessageEvent) => {
          if (event.data === 'payment_success') {
            window.removeEventListener('message', handleMessage);
            resolve(true);
          }
        };
        window.addEventListener('message', handleMessage);

        const checkClosed = setInterval(() => {
          if (qrWindow.closed) {
            clearInterval(checkClosed);
            window.removeEventListener('message', handleMessage);
            resolve(false);
          }
        }, 500);
      });

      if (!paymentConfirmed) {
        setError('Payment cancelled');
        setTimeout(() => setError(null), 3000);
        return;
      }

      const ordersByWholesaler: { [key: number]: typeof wholesaleCart } = {};
      wholesaleCart.forEach(item => {
        if (!ordersByWholesaler[item.wholesalerId]) {
          ordersByWholesaler[item.wholesalerId] = [];
        }
        ordersByWholesaler[item.wholesalerId].push(item);
      });

      for (const wholesalerId in ordersByWholesaler) {
        const items = ordersByWholesaler[wholesalerId];
        const shopTotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

        const url = `${API_URL}/api/orders`;
        console.log('📍 Creating order at:', url);

        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({
            userId: user?.id,
            items: items.map(item => ({
              productId: item.id,
              quantity: item.quantity,
              price: item.price,
              shopId: parseInt(wholesalerId)
            })),
            paymentMode: 'UPI',
            paymentStatus: 'PAID',
            totalAmount: shopTotal
          })
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to create order');
        }
      }

      setSuccess('✅ Wholesale orders placed!');
      setWholesaleCart([]);
      fetchOrdersAndAnalytics();
      setTimeout(() => setSuccess(null), 3000);
    } catch (error: any) {
      setError(`❌ ${error.message}`);
      setTimeout(() => setError(null), 3000);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    router.push('/login');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-800 mx-auto mb-4"></div>
          <p className="text-gray-700 font-semibold">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-gray-900 text-white shadow-lg sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold">Retailer Dashboard</h1>
              <p className="text-gray-400 text-sm">Manage your products & orders</p>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm text-gray-400">Retailer</p>
                <p className="font-bold">{user?.name}</p>
              </div>

              <NotificationCenter
                userId={user?.id || 0}
                token={localStorage.getItem('token') || ''}
              />

              <button
                onClick={handleLogout}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-semibold flex items-center gap-2 transition"
              >
                <LogOut className="w-4 h-4" /> Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {success && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg mb-6 flex justify-between items-center">
            <span>{success}</span>
            <button onClick={() => setSuccess(null)} className="font-bold">✕</button>
          </div>
        )}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-6 flex justify-between items-center">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="font-bold">✕</button>
          </div>
        )}

        <div className="flex gap-4 mb-8 border-b-2 border-gray-300 sticky top-20 bg-gray-50 py-4 -mx-4 px-4 z-30">
          {['analytics', 'products', 'orders', 'wholesale'].map(tab => (
            <button
              key={tab}
              onClick={() => setCurrentTab(tab as any)}
              className={`px-6 py-3 font-semibold transition border-b-4 ${currentTab === tab
                ? 'border-gray-900 text-gray-900'
                : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {currentTab === 'analytics' && (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Sales Analytics</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-white rounded-lg shadow p-6 border-l-4 border-gray-900">
                <p className="text-gray-600 text-sm font-semibold mb-2">Total Orders</p>
                <p className="text-4xl font-bold text-gray-900">{analytics.totalOrders}</p>
              </div>

              <div className="bg-white rounded-lg shadow p-6 border-l-4 border-gray-600">
                <p className="text-gray-600 text-sm font-semibold mb-2">Total Revenue</p>
                <p className="text-4xl font-bold text-gray-900">₹{analytics.totalRevenue.toLocaleString('en-IN')}</p>
              </div>

              <div className="bg-white rounded-lg shadow p-6 border-l-4 border-gray-400">
                <p className="text-gray-600 text-sm font-semibold mb-2">Pending Orders</p>
                <p className="text-4xl font-bold text-gray-900">{analytics.pendingOrders}</p>
              </div>

              <div className="bg-white rounded-lg shadow p-6 border-l-4 border-gray-200">
                <p className="text-gray-600 text-sm font-semibold mb-2">Completed Orders</p>
                <p className="text-4xl font-bold text-gray-900">{analytics.completedOrders}</p>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Recent Orders</h3>
              {orders.length === 0 ? (
                <p className="text-gray-600 text-center py-8">No orders yet</p>
              ) : (
                <div className="space-y-3">
                  {orders.slice(0, 5).map(order => (
                    <div key={order.id} className="flex justify-between items-center p-3 bg-gray-100 rounded-lg">
                      <div>
                        <p className="font-semibold text-gray-900">Order #{order.orderNumber}</p>
                        <p className="text-sm text-gray-600">{order.customer.name}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-gray-900">₹{order.totalAmount}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {currentTab === 'products' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">My Products</h2>
              <button
                onClick={() => setShowAddProduct(!showAddProduct)}
                className="bg-gray-900 hover:bg-gray-800 text-white px-4 py-2 rounded-lg font-semibold flex items-center gap-2 transition"
              >
                <Plus className="w-5 h-5" /> Add Product
              </button>
            </div>

            {showAddProduct && (
              <div className="bg-white rounded-lg shadow p-6 mb-8">
                <h3 className="text-xl font-bold text-gray-900 mb-4">Add New Product</h3>
                <form onSubmit={handleAddProduct} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Product Name"
                      className="px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-gray-900 outline-none"
                    />
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-gray-900 outline-none"
                    >
                      <option>General</option>
                      <option>Vegetables</option>
                      <option>Fruits</option>
                      <option>Dairy</option>
                    </select>
                    <input
                      type="number"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                      placeholder="Price"
                      className="px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-gray-900 outline-none"
                    />
                    <input
                      type="number"
                      value={formData.stock}
                      onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                      placeholder="Stock"
                      className="px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-gray-900 outline-none"
                    />
                  </div>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Description"
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-gray-900 outline-none"
                    rows={2}
                  />
                  <div className="flex gap-3">
                    <button type="submit" className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-semibold">
                      Add
                    </button>
                    <button type="button" onClick={() => setShowAddProduct(false)} className="bg-gray-400 text-white px-6 py-2 rounded-lg">
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}

            {products.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-lg">
                <p className="text-xl text-gray-600 font-semibold">No products yet</p>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left font-semibold text-gray-900">Name</th>
                      <th className="px-6 py-3 text-left font-semibold text-gray-900">Category</th>
                      <th className="px-6 py-3 text-left font-semibold text-gray-900">Price</th>
                      <th className="px-6 py-3 text-left font-semibold text-gray-900">Stock</th>
                      <th className="px-6 py-3 text-left font-semibold text-gray-900">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.map(product => (
                      <tr key={product.id} className="border-b border-gray-200 hover:bg-gray-50">
                        <td className="px-6 py-4 text-gray-900 font-semibold">{product.name}</td>
                        <td className="px-6 py-4 text-gray-700">{product.category}</td>
                        <td className="px-6 py-4 font-bold text-gray-900">₹{product.price}</td>
                        <td className="px-6 py-4 font-semibold text-gray-900">{product.stock}</td>
                        <td className="px-6 py-4 flex gap-2">
                          <button
                            onClick={() => handleDeleteProduct(product.id)}
                            className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded text-sm"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {currentTab === 'orders' && (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">My Orders</h2>
            {orders.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-lg">
                <p className="text-xl text-gray-600">No orders yet</p>
              </div>
            ) : (
              <div className="space-y-4">
                {orders.map(order => (
                  <div key={order.id} className="bg-white rounded-lg shadow p-6 border-l-4 border-gray-900">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-lg font-bold text-gray-900">Order #{order.orderNumber}</h3>
                        <p className="text-sm text-gray-600">{new Date(order.createdAt).toLocaleDateString()}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-gray-900">₹{order.totalAmount}</p>
                        <p className="text-sm font-semibold text-gray-700 mt-1">{order.status}</p>
                      </div>
                    </div>

                    <div className="border-t pt-4 mb-4">
                      <p className="text-sm text-gray-700 mb-2"><strong>Customer:</strong> {order.customer.name}</p>
                      <div className="bg-gray-100 rounded p-3">
                        <p className="font-semibold text-gray-900 mb-2">Items:</p>
                        {order.items.map(item => (
                          <p key={item.id} className="text-sm text-gray-700">
                            {item.product.name} × {item.quantity} = ₹{item.subtotal}
                          </p>
                        ))}
                      </div>
                    </div>

                    {/* ✅ ORDER TRACKING SECTION */}
                    <div className="mb-6 border-t pt-4">
                      <p className="font-semibold text-gray-900 mb-3">Order Progress</p>
                      <div className="flex items-center justify-between">
                        {['PLACED', 'CONFIRMED', 'PACKED', 'DISPATCHED', 'OUT_FOR_DELIVERY', 'DELIVERED'].map((status, index) => {
                          const isCompleted = ['PLACED', 'CONFIRMED', 'PACKED', 'DISPATCHED', 'OUT_FOR_DELIVERY', 'DELIVERED'].indexOf(order.status) >= index;
                          const isCurrent = order.status === status;

                          return (
                            <div key={status} className="flex flex-col items-center flex-1">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-white text-xs mb-2 ${isCompleted ? 'bg-gray-900' : 'bg-gray-300'
                                }`}>
                                {index + 1}
                              </div>
                              <p className={`text-xs text-center font-semibold ${isCurrent ? 'text-gray-900' : isCompleted ? 'text-gray-700' : 'text-gray-500'
                                }`}>
                                {status === 'OUT_FOR_DELIVERY' ? 'Out for Delivery' : status}
                              </p>
                              {index < 5 && (
                                <div className={`h-1 flex-1 my-2 ${isCompleted ? 'bg-gray-900' : 'bg-gray-300'
                                  }`} style={{ width: '100%' }}></div>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {/* Status Update Buttons */}
                      <div className="mt-4 border-t pt-4">
                        <p className="text-sm font-semibold text-gray-700 mb-2">Update Status:</p>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                          {['PLACED', 'CONFIRMED', 'PACKED', 'DISPATCHED', 'OUT_FOR_DELIVERY', 'DELIVERED'].map(status => (
                            <button
                              key={status}
                              onClick={() => updateOrderStatus(order.id, status)}
                              disabled={order.status === status}
                              className={`px-3 py-2 rounded text-xs font-semibold transition ${order.status === status
                                  ? 'bg-gray-900 text-white'
                                  : 'bg-gray-200 text-gray-900 hover:bg-gray-300'
                                } disabled:opacity-50 disabled:cursor-not-allowed`}
                            >
                              {status === 'OUT_FOR_DELIVERY' ? 'OUT_4_DEL' : status}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => handlePrintInvoice(order.id, order.orderNumber)}
                        className="flex-1 bg-gray-900 hover:bg-gray-800 text-white px-4 py-2 rounded-lg font-semibold"
                      >
                        Download Invoice
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}


        {currentTab === 'wholesale' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Buy from Wholesalers</h2>
              {wholesaleCart.length > 0 && (
                <div className="flex gap-3 items-center">
                  <span className="bg-gray-200 text-gray-900 px-4 py-2 rounded-lg font-semibold">
                    Cart: {wholesaleCart.length} items
                  </span>
                  <button
                    onClick={placeWholesaleOrder}
                    className="bg-gray-900 hover:bg-gray-800 text-white px-6 py-2 rounded-lg font-semibold"
                  >
                    Place Order
                  </button>
                </div>
              )}
            </div>

            {wholesaleProducts.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-lg">
                <p className="text-xl text-gray-600">No wholesale products</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {wholesaleProducts.map(product => (
                  product.inventories.map(inventory => (
                    <div key={inventory.id} className="bg-white rounded-lg shadow p-6">
                      <h3 className="text-lg font-bold text-gray-900">{product.name}</h3>
                      <p className="text-gray-600 text-sm mb-3">{product.category}</p>
                      <p className="text-sm text-gray-700 mb-2">
                        <strong>Wholesaler:</strong> {inventory.wholesaler.name}
                      </p>
                      <div className="grid grid-cols-2 gap-2 mb-4">
                        <div>
                          <p className="text-xs text-gray-600">Retail</p>
                          <p className="font-bold text-gray-900">₹{inventory.price}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600">Wholesale</p>
                          <p className="font-bold text-gray-900">₹{inventory.wholesalerPrice}</p>
                        </div>
                      </div>
                      <p className="text-xs text-gray-600 mb-3">Stock: {inventory.stock}</p>
                      <button
                        onClick={() => addToWholesaleCart(inventory.id, inventory.wholesaler.id, inventory.wholesalerPrice, inventory.wholesaler.shopId)}
                        className="w-full bg-gray-900 hover:bg-gray-800 text-white py-2 rounded-lg font-semibold"
                      >
                        Add to Cart
                      </button>
                    </div>
                  ))
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
