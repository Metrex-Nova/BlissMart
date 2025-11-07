'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut, Plus, Trash2, Package, BarChart3, ChevronRight } from 'lucide-react';
import NotificationCenter from '@/components/NotificationCenter';

interface Product {
  id: number;
  name: string;
  category: string;
  price: number;
  wholesalerPrice: number;
  stock: number;
  description: string;
  unit: string;
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

interface Analytics {
  totalSales: number;
  totalOrders: number;
  activeProducts: number;
  averageOrderValue: number;
}

interface User {
  id: number;
  name: string;
  phone: string;
  role: string;
  email?: string;
}

export default function WholesalerDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [analytics, setAnalytics] = useState<Analytics>({
    totalSales: 0,
    totalOrders: 0,
    activeProducts: 0,
    averageOrderValue: 0
  });

  const [currentTab, setCurrentTab] = useState<'analytics' | 'products' | 'orders'>('analytics');
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    category: 'General',
    unit: 'kg',
    price: '',
    wholesalerPrice: '',
    stock: '',
    description: ''
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (!userData) {
      router.push('/login');
      return;
    }

    try {
      const parsedUser = JSON.parse(userData);
      if (parsedUser.role !== 'WHOLESALER') {
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

  const fetchProducts = async () => {
    if (!user) return;
    try {
      const url = `${API_URL}/api/wholesaler/${user.id}/my-products`;
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setProducts(data);
      } else {
        console.error('Products fetch failed:', response.status);
      }
    } catch (error) {
      console.error('Failed to fetch products:', error);
    }
  };

  const fetchOrdersAndAnalytics = async () => {
    if (!user) return;
    try {
      const url = `${API_URL}/api/wholesaler/${user.id}/orders`;
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setOrders(data.orders);
        setAnalytics(data.analytics);
        setLastRefresh(new Date());
      } else {
        console.error('Orders fetch failed:', response.status);
      }
    } catch (error) {
      console.error('Failed to fetch orders:', error);
    }
  };

  useEffect(() => {
    if (!user) return;

    fetchProducts();
    fetchOrdersAndAnalytics();

    const interval = setInterval(() => {
      fetchProducts();
      fetchOrdersAndAnalytics();
    }, 5000);

    return () => clearInterval(interval);
  }, [user]);

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!user) {
      setError('User not loaded');
      return;
    }

    if (!formData.name || !formData.price || !formData.wholesalerPrice || !formData.stock) {
      setError('Please fill in all required fields');
      return;
    }

    try {
      const url = `${API_URL}/api/wholesaler/${user.id}/products`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          name: formData.name,
          category: formData.category,
          unit: formData.unit,
          price: parseFloat(formData.price),
          wholesalerPrice: parseFloat(formData.wholesalerPrice),
          stock: parseInt(formData.stock),
          description: formData.description
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to add product (${response.status})`);
      }

      setSuccess('Product added successfully');
      setFormData({ 
        name: '', 
        category: 'General', 
        unit: 'kg',
        price: '', 
        wholesalerPrice: '',
        stock: '', 
        description: '' 
      });
      setShowAddProduct(false);
      fetchProducts();
      setTimeout(() => setSuccess(null), 3000);
    } catch (error: any) {
      console.error('Add product error:', error);
      setError(error.message);
      setTimeout(() => setError(null), 5000);
    }
  };

  const handleDeleteProduct = async (productId: number) => {
    if (!confirm('Are you sure you want to delete this product?')) return;

    if (!user) {
      setError('User not loaded');
      return;
    }

    try {
      const url = `${API_URL}/api/wholesaler/${user.id}/products/${productId}`;
      const response = await fetch(url, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        setSuccess('Product deleted successfully');
        fetchProducts();
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(`Failed to delete product (${response.status})`);
      }
    } catch (error) {
      console.error('Delete error:', error);
      setError('Failed to delete product');
      setTimeout(() => setError(null), 3000);
    }
  };

  const updateOrderStatus = async (orderId: number, newStatus: string) => {
    if (!user) {
      setError('User not loaded');
      return;
    }

    try {
      const url = `${API_URL}/api/wholesaler/${user.id}/orders/${orderId}/status`;
      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (response.ok) {
        setSuccess(`Order status updated to ${newStatus}`);
        fetchOrdersAndAnalytics();
        setTimeout(() => setSuccess(null), 3000);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to update status');
        setTimeout(() => setError(null), 3000);
      }
    } catch (error: any) {
      console.error('Status update error:', error);
      setError(`Failed to update status: ${error.message}`);
      setTimeout(() => setError(null), 3000);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    router.push('/login');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DELIVERED':
        return 'bg-emerald-50 text-emerald-700';
      case 'PLACED':
        return 'bg-blue-50 text-blue-700';
      case 'CONFIRMED':
      case 'PACKED':
      case 'DISPATCHED':
      case 'OUT_FOR_DELIVERY':
        return 'bg-amber-50 text-amber-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border border-purple-300 border-t-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600 font-light">Loading dashboard</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-5">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">Wholesaler Dashboard</h1>
              <p className="text-sm text-gray-500 mt-1">Manage products & orders</p>
            </div>

            <div className="flex items-center gap-6">
              <NotificationCenter 
                userId={user?.id || 0} 
                token={localStorage.getItem('token') || ''} 
              />
              
              <div className="text-right border-r border-gray-200 pr-6">
                <p className="text-sm text-gray-500">Wholesaler</p>
                <p className="font-medium text-gray-900">{user?.name}</p>
              </div>

              <button
                onClick={handleLogout}
                className="text-gray-600 hover:text-gray-900 transition flex items-center gap-2"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Alerts */}
        {success && (
          <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg flex justify-between items-center animate-in fade-in">
            <span className="text-sm font-medium">{success}</span>
            <button onClick={() => setSuccess(null)} className="text-emerald-600 hover:text-emerald-700">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg flex justify-between items-center animate-in fade-in">
            <span className="text-sm font-medium">{error}</span>
            <button onClick={() => setError(null)} className="text-red-600 hover:text-red-700">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex gap-8 mb-8 border-b border-gray-200 -mx-6 px-6">
          {['analytics', 'products', 'orders'].map((tab) => (
            <button
              key={tab}
              onClick={() => setCurrentTab(tab as any)}
              className={`py-4 px-0 font-medium text-sm transition border-b-2 -mb-0.5 capitalize ${
                currentTab === tab
                  ? 'border-purple-600 text-purple-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              {tab} {tab === 'products' && `(${products.length})`} {tab === 'orders' && `(${orders.length})`}
            </button>
          ))}
        </div>

        {/* Analytics Tab */}
        {currentTab === 'analytics' && (
          <div>
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-xl font-semibold text-gray-900">Overview</h2>
              <p className="text-xs text-gray-500">Last updated: {lastRefresh.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {[
                { label: 'Total Sales', value: `₹${(analytics?.totalSales || 0).toLocaleString('en-IN')}`, color: 'purple' },
                { label: 'Total Orders', value: analytics?.totalOrders || 0, color: 'blue' },
                { label: 'Active Products', value: analytics?.activeProducts || 0, color: 'amber' },
                { label: 'Avg Order Value', value: `₹${(analytics?.averageOrderValue || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`, color: 'emerald' }
              ].map((stat, idx) => (
                <div key={idx} className="bg-white rounded-lg p-6 border border-gray-200 hover:border-gray-300 transition">
                  <p className="text-sm text-gray-600 font-medium mb-3">{stat.label}</p>
                  <p className={`text-3xl font-semibold text-${stat.color}-600`}>{stat.value}</p>
                </div>
              ))}
            </div>

            {/* Recent Orders */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">Recent Orders</h3>
              {orders.length === 0 ? (
                <p className="text-gray-500 text-center py-12 text-sm">No orders yet</p>
              ) : (
                <div className="space-y-1">
                  {orders.slice(0, 5).map(order => (
                    <div key={order.id} className="flex justify-between items-center p-4 hover:bg-gray-50 rounded-lg transition">
                      <div>
                        <p className="font-medium text-gray-900">Order #{order.orderNumber}</p>
                        <p className="text-xs text-gray-500 mt-1">{order.customer.name}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-gray-900">₹{order.totalAmount}</p>
                        <span className={`text-xs font-medium px-2.5 py-1 rounded mt-2 inline-block ${getStatusColor(order.status)}`}>
                          {order.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Products Tab */}
        {currentTab === 'products' && (
          <div>
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-xl font-semibold text-gray-900">Products</h2>
              <button
                onClick={() => setShowAddProduct(!showAddProduct)}
                className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2 transition"
              >
                <Plus className="w-4 h-4" /> Add Product
              </button>
            </div>

            {showAddProduct && (
              <div className="bg-white rounded-lg border border-gray-200 p-6 mb-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-6">New Product</h3>
                <form onSubmit={handleAddProduct} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Product Name</label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="Fresh Apples"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Unit</label>
                      <select
                        value={formData.unit}
                        onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none text-sm"
                      >
                        <option>kg</option>
                        <option>box</option>
                        <option>dozen</option>
                        <option>piece</option>
                        <option>liter</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                      <select
                        value={formData.category}
                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none text-sm"
                      >
                        <option>General</option>
                        <option>Vegetables</option>
                        <option>Fruits</option>
                        <option>Dairy</option>
                        <option>Grains</option>
                        <option>Other</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Retail Price (₹)</label>
                      <input
                        type="number"
                        value={formData.price}
                        onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                        placeholder="0.00"
                        step="0.01"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Wholesale Price (₹)</label>
                      <input
                        type="number"
                        value={formData.wholesalerPrice}
                        onChange={(e) => setFormData({ ...formData, wholesalerPrice: e.target.value })}
                        placeholder="0.00"
                        step="0.01"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Stock</label>
                      <input
                        type="number"
                        value={formData.stock}
                        onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                        placeholder="0"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none text-sm"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Product details and specifications"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none text-sm"
                      rows={3}
                    />
                  </div>
                  <div className="flex gap-3">
                    <button
                      type="submit"
                      className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2 rounded-lg font-medium text-sm transition"
                    >
                      Add Product
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowAddProduct(false)}
                      className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-6 py-2 rounded-lg font-medium text-sm transition"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}

            {products.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-lg border border-gray-200">
                <Package className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-600 font-medium">No products yet</p>
                <p className="text-gray-500 text-sm mt-1">Add your first wholesale product</p>
              </div>
            ) : (
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wide">Name</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wide">Category</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wide">Retail</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wide">Wholesale</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wide">Stock</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wide">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {products.map(product => (
                      <tr key={product.id} className="hover:bg-gray-50 transition">
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">{product.name}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{product.category}</td>
                        <td className="px-6 py-4 text-sm font-semibold text-gray-900">₹{product.price}</td>
                        <td className="px-6 py-4 text-sm font-semibold text-purple-600">₹{product.wholesalerPrice}</td>
                        <td className="px-6 py-4 text-sm">
                          <span className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold ${
                            product.stock > 100
                              ? 'bg-emerald-50 text-emerald-700'
                              : product.stock > 0
                              ? 'bg-amber-50 text-amber-700'
                              : 'bg-red-50 text-red-700'
                          }`}>
                            {product.stock}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <button
                            onClick={() => handleDeleteProduct(product.id)}
                            className="text-red-600 hover:text-red-700 font-medium transition"
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

        {/* Orders Tab */}
        {currentTab === 'orders' && (
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-8">Orders</h2>

            {orders.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-lg border border-gray-200">
                <Package className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-600 font-medium">No orders yet</p>
                <p className="text-gray-500 text-sm mt-1">Orders from retailers will appear here</p>
              </div>
            ) : (
              <div className="space-y-4">
                {orders.map(order => (
                  <div key={order.id} className="bg-white rounded-lg border border-gray-200 p-6 hover:border-gray-300 transition">
                    <div className="flex justify-between items-start mb-5">
                      <div>
                        <h3 className="font-semibold text-gray-900">Order #{order.orderNumber}</h3>
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(order.createdAt).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-semibold text-gray-900">₹{order.totalAmount}</p>
                        <span className={`inline-block text-xs font-semibold px-3 py-1 rounded mt-2 ${getStatusColor(order.status)}`}>
                          {order.status}
                        </span>
                      </div>
                    </div>

                    <div className="border-t border-gray-200 pt-5 mb-5 space-y-2">
                      <p className="text-sm text-gray-700">
                        <strong>Retailer:</strong> {order.customer.name} ({order.customer.phone})
                      </p>
                      <p className="text-sm text-gray-700">
                        <strong>Payment:</strong> {order.paymentMode} - 
                        <span className={` font-semibold ml-1 ${order.paymentStatus === 'PAID' ? 'text-emerald-600' : 'text-red-600'}`}>
                          {order.paymentStatus}
                        </span>
                      </p>
                    </div>

                    <div className="bg-gray-50 rounded-lg p-4 mb-5">
                      <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-3">Items ({order.items.length})</p>
                      <div className="space-y-2">
                        {order.items.map(item => (
                          <div key={item.id} className="flex justify-between text-sm text-gray-700">
                            <span>{item.product.name} × {item.quantity}</span>
                            <span className="font-medium">₹{item.subtotal}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-3">Update Status</p>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        {['PLACED', 'CONFIRMED', 'PACKED', 'DISPATCHED', 'OUT_FOR_DELIVERY', 'DELIVERED'].map(status => (
                          <button
                            key={status}
                            onClick={() => updateOrderStatus(order.id, status)}
                            disabled={order.status === status}
                            className={`px-3 py-2 rounded text-xs font-medium transition ${
                              order.status === status
                                ? 'bg-purple-600 text-white'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            } disabled:opacity-50 disabled:cursor-not-allowed`}
                          >
                            {status === 'OUT_FOR_DELIVERY' ? 'Out 4 Del' : status.replace('_', ' ')}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
