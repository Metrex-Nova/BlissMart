'use client';

import { Package, CheckCircle, Clock, Truck, MapPin, Home } from 'lucide-react';

interface OrderTrackingProps {
  order: {
    id: number;
    orderNumber: string;
    status: string;
    totalAmount: number;
    paymentMode: string;
    paymentStatus: string;
    createdAt: string;
    estimatedDelivery?: string;
    trackingNumber?: string;
    items: Array<{
      id: number;
      quantity: number;
      unitPrice: number;
      subtotal: number;
      product: {
        id: number;
        name: string;
        unit: string;
      };
      shop: {
        id: number;
        name: string;
        address: string;
      };
    }>;
  };
}

const orderSteps = [
  { key: 'PLACED', label: 'Order Placed', icon: Package },
  { key: 'CONFIRMED', label: 'Confirmed', icon: CheckCircle },
  { key: 'PACKED', label: 'Packed', icon: Package },
  { key: 'DISPATCHED', label: 'Dispatched', icon: Truck },
  { key: 'OUT_FOR_DELIVERY', label: 'Out for Delivery', icon: MapPin },
  { key: 'DELIVERED', label: 'Delivered', icon: Home },
];

export default function OrderTracking({ order }: OrderTrackingProps) {
  const currentStepIndex = orderSteps.findIndex(step => step.key === order.status);
  
  const getStatusColor = (stepIndex: number) => {
    if (stepIndex < currentStepIndex) return 'text-green-600 bg-green-50 border-green-200';
    if (stepIndex === currentStepIndex) return 'text-blue-600 bg-blue-50 border-blue-200';
    return 'text-gray-400 bg-gray-50 border-gray-200';
  };

  const getIcon = (StepIcon: any, stepIndex: number) => {
    if (stepIndex < currentStepIndex) {
      return <CheckCircle className="w-6 h-6 text-green-600" />;
    }
    if (stepIndex === currentStepIndex) {
      return <StepIcon className="w-6 h-6 text-blue-600" />;
    }
    return <StepIcon className="w-6 h-6 text-gray-400" />;
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border p-6">
      {/* Order Header */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <h2 className="text-xl font-bold">Order #{order.orderNumber}</h2>
          <p className="text-gray-600">
            Placed on {new Date(order.createdAt).toLocaleDateString('en-IN', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </p>
        </div>
        <div className="text-right">
          <p className="text-lg font-bold">₹{order.totalAmount}</p>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
            order.status === 'DELIVERED' ? 'bg-green-100 text-green-800' :
            order.status === 'CANCELLED' ? 'bg-red-100 text-red-800' :
            'bg-yellow-100 text-yellow-800'
          }`}>
            {order.status.replace(/_/g, ' ')}
          </span>
        </div>
      </div>

      {/* Order Progress Timeline */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          {orderSteps.map((step, index) => (
            <div key={step.key} className="flex flex-col items-center flex-1">
              <div className={`flex items-center justify-center w-12 h-12 rounded-full border-2 ${getStatusColor(index)}`}>
                {getIcon(step.icon, index)}
              </div>
              <p className={`text-sm mt-2 text-center ${
                index <= currentStepIndex ? 'text-gray-800 font-medium' : 'text-gray-500'
              }`}>
                {step.label}
              </p>
            </div>
          ))}
        </div>

        {/* Progress Line */}
        <div className="relative -mt-8 mb-8">
          <div className="absolute top-1/2 left-0 right-0 h-1 bg-gray-200 -translate-y-1/2"></div>
          <div
            className="absolute top-1/2 left-0 h-1 bg-green-600 -translate-y-1/2 transition-all duration-500"
            style={{ width: `${(currentStepIndex / (orderSteps.length - 1)) * 100}%` }}
          ></div>
        </div>
      </div>

      {/* Order Items */}
      <div className="border-t pt-6">
        <h3 className="font-semibold mb-4">Order Items</h3>
        <div className="space-y-3">
          {order.items.map(item => (
            <div key={item.id} className="flex justify-between items-center py-2 border-b">
              <div className="flex-1">
                <p className="font-medium">{item.product.name}</p>
                <p className="text-sm text-gray-600">{item.shop.name}</p>
                <p className="text-sm text-gray-500">Qty: {item.quantity} {item.product.unit}</p>
              </div>
              <div className="text-right">
                <p className="font-medium">₹{item.unitPrice} × {item.quantity}</p>
                <p className="text-sm text-gray-600">₹{item.subtotal}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Payment & Delivery Information */}
      <div className="border-t pt-6 mt-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="font-semibold mb-3">Payment Information</h3>
            <div className="space-y-2 text-sm">
              <p><span className="font-medium">Mode:</span> {order.paymentMode}</p>
              <p><span className="font-medium">Status:</span> 
                <span className={`ml-2 px-2 py-1 rounded-full text-xs ${
                  order.paymentStatus === 'PAID' ? 'bg-green-100 text-green-800' :
                  order.paymentStatus === 'FAILED' ? 'bg-red-100 text-red-800' :
                  'bg-yellow-100 text-yellow-800'
                }`}>
                  {order.paymentStatus}
                </span>
              </p>
              <p><span className="font-medium">Amount:</span> ₹{order.totalAmount}</p>
            </div>
          </div>
          
          <div>
            <h3 className="font-semibold mb-3">Delivery Information</h3>
            <div className="space-y-2 text-sm">
              {order.estimatedDelivery && (
                <div className="flex items-center text-gray-600">
                  <Clock className="w-4 h-4 mr-2" />
                  <span>Estimated: {new Date(order.estimatedDelivery).toLocaleDateString('en-IN')}</span>
                </div>
              )}
              {order.trackingNumber && (
                <div className="flex items-center text-gray-600">
                  <Truck className="w-4 h-4 mr-2" />
                  <span>Tracking: {order.trackingNumber}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}