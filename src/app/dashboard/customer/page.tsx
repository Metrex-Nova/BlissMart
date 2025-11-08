

'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut, ShoppingCart, Search, Loader, RefreshCw, Package, MapPin, X, Minus, Plus } from 'lucide-react';
import NotificationCenter from '@/components/NotificationCenter';


const API_URL = process.env.NODE_ENV === 'production' 
  ? 'https://blissmart-1.onrender.com'
  : 'http://localhost:4000';

interface Product {
    id: number;
    name: string;
    description: string;
    price: number;
    stock: number;
    category: string;
    shopId?: number;
    retailer?: {
        id: number;
        name: string;
        shopName: string;
    };
}

interface CartItem {
    productId: number;
    name: string;
    price: number;
    quantity: number;
    retailerId?: number;
    shopId?: number;
}

interface User {
    id: number;
    name: string;
    phone: string;
    role: string;
    email?: string;
}

interface Order {
    id: number;
    orderNumber: string;
    totalAmount: number;
    status: string;
    paymentMode: string;
    paymentStatus: string;
    createdAt: string;
    items: any[];
}

export default function CustomerDashboard() {
    const router = useRouter();
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [products, setProducts] = useState<Product[]>([]);
    const [cart, setCart] = useState<CartItem[]>([]);
    const [orders, setOrders] = useState<Order[]>([]);
    const [showCart, setShowCart] = useState(false);
    const [currentView, setCurrentView] = useState<'products' | 'orders'>('products');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [error, setError] = useState<string | null>(null);
    const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
    const [isCheckingOut, setIsCheckingOut] = useState(false);

    useEffect(() => {
        const userData = localStorage.getItem('user');
        const savedCart = localStorage.getItem('cart');

        if (!userData) {
            router.push('/login');
            return;
        }

        try {
            const parsedUser = JSON.parse(userData);
            if (parsedUser.role !== 'CUSTOMER') {
                router.push('/login');
                return;
            }
            setUser(parsedUser);

            if (savedCart) {
                setCart(JSON.parse(savedCart));
            }
        } catch (error) {
            console.error('Auth error:', error);
            router.push('/login');
        } finally {
            setLoading(false);
        }
    }, [router]);

    const fetchProducts = async () => {
        try {
            setError(null);
            const response = await fetch(`${API_URL}/api/products`);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            console.log('✅ Products loaded:', data.length);
            setProducts(Array.isArray(data) ? data : []);
            setLastRefresh(new Date());
        } catch (error) {
            console.error('❌ Error fetching products:', error);
            setError('Failed to load products. Please refresh.');
        }
    };

    const fetchOrders = async () => {
        if (!user) return;

        try {
            const response = await fetch(`${API_URL}/api/orders/user/${user.id}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                setOrders(data);
            }
        } catch (error) {
            console.error('Failed to fetch orders:', error);
        }
    };

    useEffect(() => {
        if (!user) return;

        fetchProducts();
        fetchOrders();

        const interval = setInterval(fetchProducts, 5000);
        return () => clearInterval(interval);
    }, [user]);

    useEffect(() => {
        if (cart.length > 0) {
            localStorage.setItem('cart', JSON.stringify(cart));
        } else {
            localStorage.removeItem('cart');
        }
    }, [cart]);

    const handleRefresh = () => {
        fetchProducts();
        fetchOrders();
    };

    const handleAddToCart = (product: Product) => {
        setCart(prev => {
            const existing = prev.find(item => item.productId === product.id);
            if (existing) {
                return prev.map(item =>
                    item.productId === product.id
                        ? { ...item, quantity: item.quantity + 1 }
                        : item
                );
            }
            return [...prev, {
                productId: product.id,
                name: product.name,
                price: product.price,
                quantity: 1,
                retailerId: product.retailer?.id || 0,
                shopId: product.shopId || product.retailer?.id || 1
            }];
        });

        const button = document.activeElement as HTMLElement;
        if (button) {
            button.classList.add('animate-pulse');
            setTimeout(() => button.classList.remove('animate-pulse'), 300);
        }
    };

    const updateCartQuantity = (productId: number, change: number) => {
        setCart(prev => {
            return prev.map(item => {
                if (item.productId === productId) {
                    const newQuantity = item.quantity + change;
                    return newQuantity > 0 ? { ...item, quantity: newQuantity } : item;
                }
                return item;
            }).filter(item => item.quantity > 0);
        });
    };

    const removeFromCart = (productId: number) => {
        setCart(prev => prev.filter(item => item.productId !== productId));
    };

    const handleCheckout = async () => {
        if (!user) {
            alert('Please login first');
            return;
        }

        if (cart.length === 0) {
            alert('Your cart is empty');
            return;
        }

        setIsCheckingOut(true);

        try {
            const totalAmount = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
            const YOUR_UPI_ID = 'parasbalani748@okhdfcbank';

            const paymentWindow = window.open('', 'UPI Payment', 'width=450,height=650');

            if (!paymentWindow) {
                alert('⚠️ Please allow popups for payment');
                setIsCheckingOut(false);
                return;
            }

            paymentWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>Pay ₹${totalAmount}</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
              text-align: center;
              padding: 20px;
              background: #f5f5f5;
              margin: 0;
              min-height: 100vh;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
            }
            .container {
              background: white;
              border-radius: 12px;
              padding: 30px;
              box-shadow: 0 4px 6px rgba(0,0,0,0.1);
              max-width: 350px;
            }
            h2 {
              color: #333;
              margin-bottom: 20px;
              font-size: 24px;
              font-weight: 600;
            }
            .amount {
              font-size: 36px;
              color: #333;
              font-weight: 700;
              margin: 10px 0;
            }
            img {
              width: 250px;
              height: 250px;
              border: 1px solid #e0e0e0;
              border-radius: 8px;
              margin: 20px 0;
            }
            .upi-id {
              background: #f9f9f9;
              padding: 12px;
              border-radius: 6px;
              margin: 15px 0;
              font-family: monospace;
              font-size: 14px;
              word-break: break-all;
              border: 1px solid #e0e0e0;
            }
            .instructions {
              background: #f9f9f9;
              padding: 15px;
              border-radius: 6px;
              margin: 15px 0;
              font-size: 13px;
              color: #333;
              text-align: left;
              border: 1px solid #e0e0e0;
            }
            .btn {
              border: none;
              padding: 12px 24px;
              border-radius: 6px;
              font-size: 16px;
              font-weight: 600;
              cursor: pointer;
              margin: 8px;
              width: 200px;
              transition: all 0.2s;
            }
            .btn:hover {
              opacity: 0.9;
            }
            .btn-success {
              background: #333;
              color: white;
            }
            .btn-cancel {
              background: #e0e0e0;
              color: #333;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h2>Payment</h2>
            <div class="amount">₹${totalAmount}</div>
            
            <img src="/QRcode.png" alt="UPI QR Code" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22250%22 height=%22250%22%3E%3Crect fill=%22%23f0f0f0%22 width=%22250%22 height=%22250%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 text-anchor=%22middle%22 dy=%22.3em%22 fill=%22%23999%22%3EQR Code%3C/text%3E%3C/svg%3E'" />
            
            <div class="upi-id">
              UPI ID: ${YOUR_UPI_ID}
            </div>
            
            <div class="instructions">
              1. Open Google Pay / PhonePe / Paytm<br>
              2. Scan the QR code<br>
              3. Pay ₹${totalAmount}<br>
              4. Click "I Have Paid"
            </div>
            
            <button class="btn btn-success" onclick="confirmPayment()">
              I Have Paid
            </button>
            <br>
            <button class="btn btn-cancel" onclick="window.close()">
              Cancel
            </button>
          </div>
          
          <script>
            function confirmPayment() {
              if (confirm('Payment completed?')) {
                window.opener.postMessage('payment_success', '*');
                window.close();
              }
            }
          </script>
        </body>
        </html>
      `);

            const paymentConfirmed = await new Promise<boolean>((resolve) => {
                const handleMessage = (event: MessageEvent) => {
                    if (event.data === 'payment_success') {
                        window.removeEventListener('message', handleMessage);
                        resolve(true);
                    }
                };
                window.addEventListener('message', handleMessage);

                const checkInterval = setInterval(() => {
                    if (paymentWindow.closed) {
                        clearInterval(checkInterval);
                        window.removeEventListener('message', handleMessage);
                        resolve(false);
                    }
                }, 500);
            });

            if (!paymentConfirmed) {
                alert('Payment cancelled. Cart saved.');
                setIsCheckingOut(false);
                return;
            }

            const orderData = {
                userId: user.id,
                items: cart.map(item => ({
                    productId: item.productId,
                    quantity: item.quantity,
                    price: item.price,
                    shopId: item.shopId || 1
                })),
                paymentMode: 'UPI',
                totalAmount: totalAmount,
                paymentStatus: 'PAID'
            };

            console.log('Creating order:', orderData);

            const response = await fetch(`${API_URL}/api/orders`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(orderData)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to create order');
            }

            const result = await response.json();
            console.log('Order created:', result);

            setCart([]);
            localStorage.removeItem('cart');
            setShowCart(false);
            setIsCheckingOut(false);

            alert(`Order placed!\nOrder #: ${result.order.orderNumber}\nTotal: ₹${totalAmount}`);

            setCurrentView('orders');
            fetchOrders();

        } catch (error: any) {
            console.error('Checkout error:', error);
            alert(`Order failed: ${error.message}`);
            setIsCheckingOut(false);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        localStorage.removeItem('cart');
        router.push('/login');
    };

    const filteredProducts = products.filter(p => {
        const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.description.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;
        return matchesSearch && matchesCategory;
    });

    const categories = ['All', ...new Set(products.map(p => p.category))];
    const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-white">
                <div className="text-center">
                    <Loader className="w-8 h-8 text-gray-400 animate-spin mx-auto mb-3" />
                    <p className="text-gray-600 text-sm">Loading...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white">
            {/* Header */}
            <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
                <div className="max-w-7xl mx-auto px-4 py-4">
                    <div className="flex justify-between items-center gap-6">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900"><img src="/logo.png" alt=""  width="130" height="40"/></h1>
                        </div>

                        {currentView === 'products' && (
                            <div className="flex-1 max-w-md">
                                <div className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2 border border-gray-200">
                                    <Search className="w-4 h-4 text-gray-400" />
                                    <input
                                        type="text"
                                        placeholder="Search..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="bg-transparent text-gray-900 placeholder-gray-400 outline-none flex-1 text-sm"
                                    />
                                </div>
                            </div>
                        )}

                        <div className="flex items-center gap-4">
                            {/* View Toggle */}
                            <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
                                <button
                                    onClick={() => setCurrentView('products')}
                                    className={`px-3 py-1.5 text-sm font-medium rounded transition ${currentView === 'products'
                                            ? 'bg-white text-gray-900 shadow-sm'
                                            : 'text-gray-600 hover:text-gray-900'
                                        }`}
                                >
                                    Products
                                </button>
                                <button
                                    onClick={() => setCurrentView('orders')}
                                    className={`px-3 py-1.5 text-sm font-medium rounded transition ${currentView === 'orders'
                                            ? 'bg-white text-gray-900 shadow-sm'
                                            : 'text-gray-600 hover:text-gray-900'
                                        }`}
                                >
                                    Orders
                                </button>
                            </div>

                            {/* Refresh */}
                            <button
                                onClick={handleRefresh}
                                className="p-2 hover:bg-gray-100 rounded-lg transition text-gray-600"
                                title="Refresh"
                            >
                                <RefreshCw className="w-4 h-4" />
                            </button>

                            {/* Cart */}
                            <div className="relative">
                                <button
                                    onClick={() => setShowCart(!showCart)}
                                    className="p-2 hover:bg-gray-100 rounded-lg transition text-gray-600 relative"
                                >
                                    <ShoppingCart className="w-4 h-4" />
                                    {cartItemCount > 0 && (
                                        <span className="absolute -top-1 -right-1 bg-gray-900 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-semibold">
                                            {cartItemCount}
                                        </span>
                                    )}
                                </button>
                            </div>

                            {/* User Info */}
                            <div className="text-right border-r border-gray-200 pr-4 hidden sm:block">
                                <p className="text-xs text-gray-500">{user?.name}</p>
                            </div>

                            <NotificationCenter
                                userId={user?.id || 0}
                                token={localStorage.getItem('token') || ''}
                            />

                            {/* Logout */}
                            <button
                                onClick={handleLogout}
                                className="px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition"
                            >
                                Logout
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <div className="max-w-7xl mx-auto px-4 py-8">
                {/* Error Message */}
                {error && (
                    <div className="bg-gray-50 border border-gray-200 text-gray-900 px-4 py-3 rounded-lg mb-6">
                        <p className="text-sm font-medium">{error}</p>
                        <button
                            onClick={handleRefresh}
                            className="mt-2 text-sm underline hover:no-underline"
                        >
                            Try Again
                        </button>
                    </div>
                )}

                {/* Products View */}
                {currentView === 'products' && (
                    <>
                        {/* Category Filter */}
                        <div className="mb-8 flex gap-2 overflow-x-auto pb-2">
                            {categories.map(cat => (
                                <button
                                    key={cat}
                                    onClick={() => setSelectedCategory(cat)}
                                    className={`px-4 py-1.5 text-sm font-medium rounded-lg whitespace-nowrap transition ${selectedCategory === cat
                                            ? 'bg-gray-900 text-white'
                                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                        }`}
                                >
                                    {cat}
                                </button>
                            ))}
                        </div>

                        {/* Products Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {filteredProducts.length === 0 ? (
                                <div className="col-span-full text-center py-16">
                                    <p className="text-gray-500 text-sm">
                                        {products.length === 0 ? 'No products available' : 'No matches'}
                                    </p>
                                </div>
                            ) : (
                                filteredProducts.map(product => (
                                    <div
                                        key={product.id}
                                        className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:border-gray-300 transition"
                                    >
                                        <div className="h-40 bg-gray-100 flex items-center justify-center text-4xl">
                                            📦
                                        </div>

                                        <div className="p-4">
                                            <h3 className="font-semibold text-gray-900 mb-1 text-sm truncate">
                                                {product.name}
                                            </h3>

                                            <p className="text-xs text-gray-500 mb-2 flex items-center gap-1">
                                                <MapPin className="w-3 h-3" />
                                                {product.retailer?.shopName || 'Local Shop'}
                                            </p>

                                            <p className="text-xs text-gray-500 mb-3 line-clamp-2">
                                                {product.description}
                                            </p>

                                            <div className="flex justify-between items-center mb-3">
                                                <span className="text-lg font-semibold text-gray-900">₹{product.price}</span>
                                                <span className={`text-xs font-medium px-2 py-1 rounded ${product.stock > 10
                                                        ? 'bg-gray-100 text-gray-700'
                                                        : product.stock > 0
                                                            ? 'bg-gray-100 text-gray-700'
                                                            : 'bg-gray-100 text-gray-500'
                                                    }`}>
                                                    {product.stock > 0 ? `${product.stock} left` : 'Out'}
                                                </span>
                                            </div>

                                            <button
                                                onClick={() => handleAddToCart(product)}
                                                disabled={product.stock === 0}
                                                className={`w-full py-2 rounded-lg font-medium text-sm transition ${product.stock > 0
                                                        ? 'bg-gray-900 text-white hover:bg-gray-800'
                                                        : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                                    }`}
                                            >
                                                Add to Cart
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </>
                )}

                {/* Orders View */}
                {currentView === 'orders' && (
                    <div className="space-y-3">
                        {orders.length === 0 ? (
                            <div className="text-center py-12">
                                <p className="text-gray-500 text-sm">No orders yet</p>
                            </div>
                        ) : (
                            orders.map(order => (
                                <div key={order.id} className="bg-white border border-gray-200 rounded-lg p-4">
                                    <div className="flex justify-between items-start mb-3">
                                        <div>
                                            <p className="font-semibold text-gray-900 text-sm">
                                                Order #{order.orderNumber}
                                            </p>
                                            <p className="text-xs text-gray-500 mt-1">
                                                {new Date(order.createdAt).toLocaleDateString()}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-semibold text-gray-900">₹{order.totalAmount}</p>
                                            <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded inline-block mt-1">
                                                {order.status}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-3 gap-2 text-xs border-t border-gray-200 pt-3">
                                        <div>
                                            <p className="text-gray-500">Items</p>
                                            <p className="font-semibold text-gray-900">{order.items?.length || 0}</p>
                                        </div>
                                        <div>
                                            <p className="text-gray-500">Payment</p>
                                            <p className="font-semibold text-gray-900">{order.paymentMode}</p>
                                        </div>
                                        <div>
                                            <p className="text-gray-500">Status</p>
                                            <p className="font-semibold text-gray-900">{order.paymentStatus}</p>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>

            {/* Cart Sidebar */}
            {showCart && (
                <>
                    {/* Backdrop */}
                    <div
                        className="fixed inset-0 bg-black bg-opacity-20 z-40"
                        onClick={() => setShowCart(false)}
                    />

                    {/* Cart Panel */}
                    <div className="fixed right-0 top-0 h-full w-full md:w-80 bg-white shadow-lg z-50 flex flex-col">
                        <div className="bg-white border-b border-gray-200 p-4 flex justify-between items-center">
                            <h2 className="text-lg font-semibold text-gray-900">Cart ({cartItemCount})</h2>
                            <button
                                onClick={() => setShowCart(false)}
                                className="p-1 hover:bg-gray-100 rounded transition"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 space-y-2">
                            {cart.length === 0 ? (
                                <p className="text-gray-500 text-sm text-center py-8">Cart is empty</p>
                            ) : (
                                cart.map((item) => (
                                    <div
                                        key={item.productId}
                                        className="bg-gray-50 rounded-lg p-3 flex gap-3 items-center border border-gray-200"
                                    >
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium text-gray-900 text-sm truncate">{item.name}</p>
                                            <p className="text-xs text-gray-500">₹{item.price} each</p>
                                        </div>

                                        <div className="flex items-center gap-2 bg-white rounded border border-gray-200">
                                            <button
                                                onClick={() => updateCartQuantity(item.productId, -1)}
                                                className="px-2 py-1 text-gray-600 hover:bg-gray-50"
                                            >
                                                <Minus className="w-3 h-3" />
                                            </button>
                                            <span className="font-medium text-sm w-6 text-center">{item.quantity}</span>
                                            <button
                                                onClick={() => updateCartQuantity(item.productId, 1)}
                                                className="px-2 py-1 text-gray-600 hover:bg-gray-50"
                                            >
                                                <Plus className="w-3 h-3" />
                                            </button>
                                        </div>

                                        <div className="text-right">
                                            <p className="font-medium text-gray-900 text-sm">₹{item.price * item.quantity}</p>
                                            <button
                                                onClick={() => removeFromCart(item.productId)}
                                                className="text-xs text-gray-500 hover:text-gray-700 mt-1"
                                            >
                                                Remove
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        {cart.length > 0 && (
                            <div className="border-t border-gray-200 p-4 space-y-3 bg-gray-50">
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-600">Subtotal:</span>
                                    <span className="font-semibold text-gray-900">₹{cartTotal.toLocaleString()}</span>
                                </div>

                                <button
                                    onClick={handleCheckout}
                                    disabled={isCheckingOut}
                                    className={`w-full py-2.5 rounded-lg font-medium text-sm transition ${isCheckingOut
                                            ? 'bg-gray-300 text-gray-500'
                                            : 'bg-gray-900 text-white hover:bg-gray-800'
                                        }`}
                                >
                                    {isCheckingOut ? 'Processing...' : 'Checkout'}
                                </button>
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}
