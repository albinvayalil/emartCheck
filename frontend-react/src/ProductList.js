import React from 'react';
import './ProductList.css';

const mockProducts = [
  {
    id: 1,
    name: 'Laptop',
    price: 1200,
    image: '/images/laptop.jpg'
  },
  {
    id: 2,
    name: 'Headphones',
    price: 150,
    image: '/images/headphone.jpg'
  },
  {
    id: 3,
    name: 'Smartphone',
    price: 900,
    image: '/images/smartphone.jpg'
  }
];

function ProductList({ onAddToCart }) {
  return (
    <div className="product-wrapper">
      <h2 style={{ textAlign: 'center', marginBottom: '1rem' }}>Product List</h2>
      <div className="product-grid">
        {mockProducts.map(product => (
          <div className="product-card" key={product.id}>
            <img
              src={product.image}
              alt={product.name}
              className="product-image"
            />
            <h3>{product.name}</h3>
            <p>₹{product.price}</p>
            <button onClick={() => onAddToCart(product)}>Add to Cart</button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default ProductList;
