import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './PaymentPage.css';
import confetti from 'canvas-confetti';
import axios from 'axios';

function PaymentPage({ cartItems, setCart, setOrder }) {
  const [method, setMethod] = useState('card');
  const [isProcessing, setIsProcessing] = useState(false);
  const [username, setUsername] = useState('');
  const [showPopup, setShowPopup] = useState(false);
  const [popupMessage, setPopupMessage] = useState('');
  const navigate = useNavigate();

  const grouped = cartItems.reduce((acc, item) => {
    if (acc[item.id]) {
      acc[item.id].quantity += 1;
    } else {
      acc[item.id] = { ...item, quantity: 1 };
    }
    return acc;
  }, {});
  const items = Object.values(grouped);
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const delivery = 40;
  const total = subtotal + delivery;

  useEffect(() => {
    const storedUser = localStorage.getItem('username');
    if (storedUser) {
      setUsername(storedUser);
    }
  }, []);

  const handlePayment = () => {
    setIsProcessing(true);

    setTimeout(async () => {
      try {
        const response = await axios.post('/initiatepayment', {
          user_id: username,
          amount: total,
          items: items.map(item => ({
            product_id: item.id,
            name: item.name,
            quantity: item.quantity,
            price: item.price
          }))
        });

        if (response?.data?.message === 'Payment and order successful') {
          setOrder({
            items,
            total,
            order_id: response?.data?.order?.order_id || null // in case API sends order_id
          });
          confetti({ particleCount: 100, spread: 70 });
          setCart([]);
          navigate('/confirmation');
        } else {
          showErrorPopup("❌ Payment was not successful.");
        }
      } catch (err) {
        console.error("Payment error:", err);
        const reason = err?.response?.data?.reason || err?.response?.data?.error || "Order failed, please try again.";
        showErrorPopup(`❌ ${reason}`);
      } finally {
        setIsProcessing(false);
      }
    }, 2000);
  };

  const showErrorPopup = (message) => {
    setPopupMessage(message);
    setShowPopup(true);
    setTimeout(() => setShowPopup(false), 3000);
  };

  return (
    <div className="payment-wrapper">
      <h2>Choose Payment Method</h2>

      <div className="payment-methods">
        <label>
          <input
            type="radio"
            value="card"
            checked={method === 'card'}
            onChange={() => setMethod('card')}
            disabled={isProcessing}
          />
          💳 Card
        </label>
        <label>
          <input
            type="radio"
            value="upi"
            checked={method === 'upi'}
            onChange={() => setMethod('upi')}
            disabled={isProcessing}
          />
          🏦 UPI
        </label>
        <label>
          <input
            type="radio"
            value="cod"
            checked={method === 'cod'}
            onChange={() => setMethod('cod')}
            disabled={isProcessing}
          />
          📦 Cash on Delivery
        </label>
      </div>

      <div className="payment-form">
        {method === 'card' && (
          <>
            <input type="text" placeholder="Card Number" disabled={isProcessing} />
            <input type="text" placeholder="Cardholder Name" disabled={isProcessing} />
            <div className="card-details">
              <input type="text" placeholder="MM/YY" disabled={isProcessing} />
              <input type="text" placeholder="CVV" disabled={isProcessing} />
            </div>
          </>
        )}
        {method === 'upi' && (
          <input type="text" placeholder="Enter UPI ID (e.g. name@bank)" disabled={isProcessing} />
        )}
        {method === 'cod' && (
          <p>No advance payment required. Please pay on delivery.</p>
        )}
      </div>

      <div className="payment-summary">
        <h3>Payment Summary</h3>
        <p><strong>Items:</strong> {totalItems}</p>
        <p><strong>Subtotal:</strong> ₹{subtotal}</p>
        <p><strong>Delivery Fee:</strong> ₹{delivery}</p>
        <p className="total"><strong>Total Payment:</strong> ₹{total}</p>
      </div>

      <button className="pay-button" onClick={handlePayment} disabled={isProcessing}>
        {isProcessing ? 'Processing...' : 'Pay Now'}
      </button>

      {isProcessing && <div className="payment-progress"><div className="bar" /></div>}

      {showPopup && (
        <div className="popup-overlay">
          <div className="popup-content">
            <p>{popupMessage}</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default PaymentPage;
