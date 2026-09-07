import React from 'react';

const StatCard = ({ title, value, icon: Icon, color = 'primary' }) => {
  return (
    <div className="card border-0">
      <div className="card-body p-4 d-flex align-items-center justify-content-between">
        <div>
          <h6 className="text-muted fw-semibold mb-1 text-uppercase" style={{ fontSize: '0.75rem', letterSpacing: '0.05em' }}>
            {title}
          </h6>
          <h3 className="mb-0 fw-bold">{value}</h3>
        </div>
        <div className={`text-${color} bg-${color} bg-opacity-10 p-3 rounded-circle`}>
          <Icon size={24} />
        </div>
      </div>
    </div>
  );
};

export default StatCard;
