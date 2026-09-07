import React from 'react';

const ProgressBar = ({ progress }) => {
  return (
    <div className="d-flex align-items-center gap-2">
      <div className="progress flex-grow-1" style={{ height: '8px' }}>
        <div 
          className={`progress-bar ${progress === 100 ? 'bg-success' : 'bg-primary'}`} 
          role="progressbar" 
          style={{ width: `${progress}%` }} 
          aria-valuenow={progress} 
          aria-valuemin="0" 
          aria-valuemax="100"
        ></div>
      </div>
      <span className="small text-muted fw-medium" style={{ minWidth: '35px' }}>{progress}%</span>
    </div>
  );
};

export default ProgressBar;
