import React from 'react';
import { useNavigate } from 'react-router-dom';
import './Cart.css';
import TrashIcon from './icons/TrashIcon';

function Cart({ cartItems, onUpdateQuantity }) {
  const navigate = useNavigate();

  // Group identical products
  const groupedItems = cartItems.reduce((acc, item) => {
    if (acc[item.id]) {
      acc[item.id].quantity += 1;
    } else {
      acc[item.id] = { ...item, quantity: 1 };
    }
    return acc;
  }, {});
  const items = Object.values(groupedItems);
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const deliveryFee = 40;
  const totalWithDelivery = subtotal + deliveryFee;

  const handleProceedToPayment = () => {
    navigate('/payment'); // Go to PaymentPage instead of direct checkout
  };

  return (
    <div className="cart-page">
      <div className="cart-left">
        <h2>Your Cart</h2>
        {items.length === 0 ? (
          <p>Your cart is empty.</p>
        ) : (
          <>
            <div className="cart-items">
              {items.map((item) => (
                <div className="cart-item" key={item.id}>
                  <img src={item.image} alt={item.name} className="cart-item-image" />
                  <div className="cart-item-details">
                    <strong>{item.name}</strong>
                    <p>Price: ₹{item.price}</p>
                    <div className="quantity-remove">
                      <div className="quantity-controls">
                        <button onClick={() => onUpdateQuantity(item.id, 'decrease')}>−</button>
                        <span>{item.quantity}</span>
                        <button onClick={() => onUpdateQuantity(item.id, 'increase')}>+</button>
                      </div>
                      <button className="remove-button" onClick={() => onUpdateQuantity(item.id, 'remove')}>
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512">
                          <path d="M135.2 17.7C140.6 7 151.9 0 164.5 0h119c12.6 0 23.9 7 29.3 17.7L336 32H432c8.8 0 16 7.2 16 16s-7.2 16-16 16H416l-21.2 403.2c-1.6 31.1-27.2 55.8-58.4 55.8H111.6c-31.2 0-56.8-24.7-58.4-55.8L32 64H16C7.2 64 0 56.8 0 48s7.2-16 16-16H112l23.2-14.3zM164.5 32L151 64h146l-13.5-32h-119z" />
                        </svg>
                      </button>
                    </div>
                    <p className="item-subtotal">Subtotal: ₹{item.price * item.quantity}</p>
                  </div>
                </div>
              ))}
            </div>
            <h3 className="cart-total">Total: ₹{subtotal}</h3>
            <button className="checkout-button" onClick={handleProceedToPayment}>Proceed to Payment</button>
          </>
        )}
      </div>

      <div className="cart-right">
        <h3>Order Summary</h3>
        <p>Items: {items.reduce((sum, item) => sum + item.quantity, 0)}</p>
        <p>Subtotal: ₹{subtotal}</p>
        <p>Delivery: ₹{deliveryFee}</p>
        <hr />
        <p><strong>Total: ₹{totalWithDelivery}</strong></p>

        <h3>Estimated Delivery</h3>
        <p>{new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toDateString()}</p>

        <h3>Customer Support</h3>
        <p>📧 support@emart.com</p>
        <p>📞 +91 00312356</p>
      </div>
    </div>
  );
}

export default Cart;
