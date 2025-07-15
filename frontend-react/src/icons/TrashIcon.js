import React from 'react';

const TrashIcon = ({ size = 20, color = '#ff4d4f' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ verticalAlign: 'middle' }}
  >
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6m5-3h4a1 1 0 0 1 1 1v2H9V4a1 1 0 0 1 1-1z" />
  </svg>
);

export default TrashIcon;