'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import UPIPayment from '../components/UPIPayment';

interface CartItem {
  id: number;
  name: string;
  price: number;
  unit: string;
  image: string;
  shop: string;
  quantity: number;
  productId: number;
  shopId: number;
}

export default function CheckoutPage() {
  const [selectedPayment, setSelectedPayment] = useState<string>('');
  const [orderId, setOrderId] = useState<string>('');
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [orderTotal, setOrderTotal] = useState(0);
  const router = useRouter();

  useEffect(() => {
    // Get cart items from localStorage or context
    const savedCart = localStorage.getItem('cartItems');
    if (savedCart) {
      const items = JSON.parse(savedCart);
      setCartItems(items);
      const total = items.reduce((sum: number, item: CartItem) => sum + (item.price * item.quantity), 0);
      setOrderTotal(total);
    }
    
    // Generate order ID
    setOrderId(`ORD-${Date.now()}`);
  }, []);

  const handlePaymentInitiated = () => {
    console.log('UPI payment initiated for order:', orderId);
    
    // Track payment attempt in backend
    fetch('/api/payments/track-upi-attempt', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId, amount: orderTotal })
    });
  };

  const handlePlaceCODOrder = async () => {
    try {
      const response = await fetch('/api/payments/cod', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          orderId,
          items: cartItems,
          totalAmount: orderTotal
        })
      });

      const result = await response.json();
      
      if (result.success) {
        // Clear cart and redirect
        localStorage.removeItem('cartItems');
        alert(`COD order placed successfully! Order #${orderId}`);
        router.push('/');
      } else {
        alert('Failed to place order: ' + result.error);
      }
    } catch (error) {
      console.error('COD order error:', error);
      alert('Failed to place order');
    }
  };

  if (cartItems.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">🛒</div>
          <h1 className="text-2xl font-bold mb-2">Your cart is empty</h1>
          <p className="text-gray-600 mb-4">Add some products to checkout</p>
          <button 
            onClick={() => router.push('/')}
            className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700"
          >
            Continue Shopping
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-3xl font-bold mb-8">Checkout</h1>
        
        <div className="grid md:grid-cols-3 gap-8">
          {/* Order Summary */}
          <div className="md:col-span-2">
            <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
              <h2 className="text-xl font-bold mb-4">Order Summary</h2>
              
              <div className="space-y-4">
                {cartItems.map(item => (
                  <div key={`${item.productId}-${item.shopId}`} className="flex items-center justify-between border-b pb-4">
                    <div className="flex items-center space-x-4">
                      <div className="text-2xl">{item.image}</div>
                      <div>
                        <h3 className="font-medium">{item.name}</h3>
                        <p className="text-sm text-gray-600">{item.shop}</p>
                        <p className="text-sm text-gray-600">₹{item.price}/{item.unit} × {item.quantity}</p>
                      </div>
                    </div>
                    <div className="font-semibold">
                      ₹{item.price * item.quantity}
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t mt-4 pt-4">
                <div className="flex justify-between items-center text-lg font-bold">
                  <span>Total Amount:</span>
                  <span className="text-green-600">₹{orderTotal}</span>
                </div>
                <p className="text-sm text-gray-600 mt-2">Order ID: {orderId}</p>
              </div>
            </div>
          </div>

          {/* Payment Methods */}
          <div className="md:col-span-1">
            <div className="bg-white rounded-lg shadow-sm border p-6 sticky top-4">
              <h2 className="text-xl font-bold mb-4">Payment Method</h2>
              
              <div className="space-y-3 mb-6">
                <label className="flex items-center space-x-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="radio"
                    name="payment"
                    value="upi"
                    checked={selectedPayment === 'upi'}
                    onChange={(e) => setSelectedPayment(e.target.value)}
                    className="text-blue-600"
                  />
                  <span>💳 UPI Payment</span>
                </label>
                
                <label className="flex items-center space-x-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="radio"
                    name="payment"
                    value="cod"
                    checked={selectedPayment === 'cod'}
                    onChange={(e) => setSelectedPayment(e.target.value)}
                    className="text-blue-600"
                  />
                  <span>💰 Cash on Delivery</span>
                </label>
              </div>

              {/* UPI Payment Component */}
              {selectedPayment === 'upi' && (
                <UPIPayment 
                  amount={orderTotal}
                  orderId={orderId}
                  onPaymentInitiated={handlePaymentInitiated}
                />
              )}

              {/* COD Confirmation */}
              {selectedPayment === 'cod' && (
                <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                  <h3 className="font-semibold text-green-800 mb-2">Cash on Delivery</h3>
                  <p className="text-green-700 text-sm mb-4">
                    Pay when your order arrives. Additional ₹20 delivery charge may apply.
                  </p>
                  <button 
                    onClick={handlePlaceCODOrder}
                    className="w-full bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 font-medium"
                  >
                    Place COD Order
                  </button>
                </div>
              )}

              {!selectedPayment && (
                <div className="text-center py-4 text-gray-500">
                  Please select a payment method
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}