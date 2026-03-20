import React from 'react';
import './ClimateWidget.css';

const ClimateWidget = ({ 
  title, 
  subtitle, 
  badge, 
  badgeColor = '#22C55E', 
  children, 
  className = '' 
}) => {
  return (
    <div className={`climate-widget ${className}`}>
      <div className="widget-header">
        <div className="header-text">
          <span className="widget-title">{title}</span>
          {subtitle && <span className="widget-subtitle">{subtitle}</span>}
        </div>
        {badge && (
          <div className="widget-badge" style={{ backgroundColor: badgeColor, boxShadow: `0 0 8px ${badgeColor}44` }}>
            {badge}
          </div>
        )}
      </div>
      <div className="widget-content">
        {children}
      </div>
    </div>
  );
};

export default ClimateWidget;
