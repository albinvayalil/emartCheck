import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import './OrderConfirmation.css';
import confetti from 'canvas-confetti';

function OrderConfirmation({ order }) {
  const [orderId, setOrderId] = useState('');
  const deliveryFee = 40;

  const items = Array.isArray(order?.items) ? order.items : [];
  const totalAmount = Number(order?.total || 0);
  const subtotal = totalAmount >= deliveryFee ? totalAmount - deliveryFee : totalAmount;

  useEffect(() => {
    // ✅ Use API order_id if present, else generate random
    if (order?.order_id) {
      setOrderId(order.order_id);
    } else {
      const random = Math.floor(100000 + Math.random() * 900000);
      setOrderId(`EM${random}`);
    }

    confetti({
      particleCount: 120,
      spread: 80,
      origin: { y: 0.6 }
    });
  }, [order?.order_id]);

  const estimatedDelivery = () => {
    const date = new Date();
    date.setDate(date.getDate() + 5);
    return date.toDateString();
  };

  return (
    <div className="confirmation-wrapper">
      <div className="checkmark-animation">✅</div>
      <div className="confirmation-card">
        <h2 style={{ color: 'green' }}>Order Confirmed!</h2>
        <p>Thank you for your purchase. Here’s your order summary:</p>

        <div className="order-details">
          {items.length === 0 ? (
            <p style={{ fontStyle: 'italic', color: '#888' }}>No order items found.</p>
          ) : (
            items.map((item, idx) => (
              <div key={idx} className="order-item">
                {item?.name || 'Unnamed Item'} × {item?.quantity || 1} = ₹
                {Number(item?.price || 0) * Number(item?.quantity || 1)}
              </div>
            ))
          )}
        </div>

        <div className="order-meta">
          <p><strong>🧾 Order ID:</strong> {orderId}</p>
          <p><strong>🛍️ Items Total:</strong> ₹{subtotal}</p>
          <p><strong>🚚 Delivery Fee:</strong> ₹{deliveryFee}</p>
          <p><strong>💰 Grand Total:</strong> ₹{totalAmount}</p>
          <p><strong>📅 Estimated Delivery:</strong> {estimatedDelivery()}</p>
          <p><strong>📞 Support:</strong> support@emart.com</p>
        </div>

        <Link to="/" className="home-button">Back to Products</Link>
      </div>
    </div>
  );
}

export default OrderConfirmation;
