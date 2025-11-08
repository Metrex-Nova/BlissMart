'use client';

import { useState } from 'react';

interface UPIPaymentProps {
  amount: number;
  orderId: string;
  onPaymentInitiated: () => void;
}

export default function UPIPayment({ amount, orderId, onPaymentInitiated }: UPIPaymentProps) {
  const [isLoading, setIsLoading] = useState(false);

  // Replace with your actual UPI ID
  const YOUR_UPI_ID = 'parasbalani748@okhdfcbank'; // ← CHANGE THIS to your real UPI ID
  const YOUR_BUSINESS_NAME = 'Local Marketplace';

  const generateUPILink = () => {
    return `upi://pay?pa=${YOUR_UPI_ID}&pn=${encodeURIComponent(YOUR_BUSINESS_NAME)}&am=${amount}&tn=Order-${orderId}&cu=INR`;
  };

  const handleUPIPayment = async () => {
  setIsLoading(true);
  
  try {
    // Track payment attempt in backend
    const response = await fetch('/api/payments/track-upi-attempt', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId, amount })
    });

    const result = await response.json();
    
    if (result.success) {
      onPaymentInitiated();
      // Open UPI app
      const upiLink = generateUPILink();
      window.location.href = upiLink;
    } else {
      alert('Failed to initiate payment: ' + result.error);
    }
  } catch (error) {
    console.error('Payment initiation error:', error);
    alert('Failed to initiate payment');
  } finally {
    setIsLoading(false);
  }
};

  return (
    <div className="bg-white p-6 rounded-lg shadow-md border">
      <h3 className="text-lg font-semibold mb-4">Pay via UPI</h3>
      
      <button
        onClick={handleUPIPayment}
        disabled={isLoading}
        className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center"
      >
        {isLoading ? (
          <>
            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Opening UPI App...
          </>
        ) : (
          'Pay with UPI'
        )}
      </button>
      
      <div className="mt-4 text-sm text-gray-600">
        <p>• Clicking will open your UPI app</p>
        <p>• Amount: ₹{amount}</p>
        <p>• Complete payment in your UPI app</p>
      </div>
    </div>
  );
}