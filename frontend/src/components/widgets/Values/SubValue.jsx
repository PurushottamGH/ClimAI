import React from 'react';

const SubValue = ({ value, unit, color = '#fff', size = '36px' }) => {
  return (
    <div className="sub-value" style={{ display: 'flex', alignItems: 'baseline', gap: '6px', margin: '10px 0' }}>
      <span style={{ 
        fontSize: size, 
        fontWeight: '900', 
        color, 
        fontFamily: 'Inter, sans-serif',
        lineHeight: '1',
        letterSpacing: '-1px'
      }}>
        {value}
      </span>
      {unit && (
        <span style={{ 
          fontSize: '11px', 
          fontWeight: '800', 
          color: '#555', 
          textTransform: 'uppercase',
          letterSpacing: '1px'
        }}>
          {unit}
        </span>
      )}
    </div>
  );
};

export default SubValue;
