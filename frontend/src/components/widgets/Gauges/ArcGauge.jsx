import React from 'react';

const ArcGauge = ({ 
  value, 
  min = 0, 
  max = 100, 
  label, 
  color = '#2DE4FF',
  size = 110
}) => {
  const percentage = Math.min(Math.max((value - min) / (max - min), 0), 1);
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  // Offset for 270 degree arc (leaving bottom open)
  const arcLength = circumference * 0.75;
  const offset = arcLength - (percentage * arcLength);
  
  return (
    <div className="arc-gauge" style={{ width: size, height: size * 0.85, position: 'relative', margin: '0 auto' }}>
      <svg width={size} height={size} style={{ transform: 'rotate(135deg)' }}>
        {/* Background Arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.05)"
          strokeWidth={strokeWidth}
          strokeDasharray={`${arcLength} ${circumference}`}
          strokeLinecap="round"
        />
        {/* Progress Arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={`${arcLength} ${circumference}`}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ 
            transition: 'stroke-dashoffset 1.5s cubic-bezier(0.4, 0, 0.2, 1)',
            filter: `drop-shadow(0 0 5px ${color}aa)`
          }}
        />
      </svg>
      <div style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -40%)',
        textAlign: 'center',
        width: '100%'
      }}>
        <div style={{ 
          color: '#fff', 
          fontSize: '22px', 
          fontWeight: '900', 
          fontFamily: 'Inter, monospace',
          letterSpacing: '-1px',
          textShadow: '0 0 10px rgba(255,255,255,0.2)'
        }}>
          {value}
        </div>
        <div style={{ 
          color: '#666', 
          fontSize: '9px', 
          textTransform: 'uppercase', 
          fontWeight: '700',
          letterSpacing: '1px'
        }}>
          {label}
        </div>
      </div>
    </div>
  );
};

export default ArcGauge;
