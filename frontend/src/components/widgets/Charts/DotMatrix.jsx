import React from 'react';

const DotMatrix = ({ 
  count, 
  total = 20, 
  color = '#2DE4FF', 
  rows = 2 
}) => {
  const dots = Array.from({ length: total });
  const dotsPerRow = Math.ceil(total / rows);
  
  return (
    <div className="dot-matrix" style={{ 
      display: 'grid', 
      gridTemplateColumns: `repeat(${dotsPerRow}, 1fr)`, 
      gap: '5px',
      padding: '5px 0',
      width: 'fit-content'
    }}>
      {dots.map((_, i) => (
        <div key={i} style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          backgroundColor: i < count ? color : 'rgba(255,255,255,0.1)',
          boxShadow: i < count ? `0 0 6px ${color}88` : 'none',
          transition: 'all 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
          transform: i < count ? 'scale(1)' : 'scale(0.8)',
          opacity: i < count ? 1 : 0.4
        }} />
      ))}
    </div>
  );
};

export default DotMatrix;
