import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FiShieldOff, FiHome } from 'react-icons/fi';

const AccessDenied = () => {
  const navigate = useNavigate();

  return (
    <div className="container py-5">
      <div className="card border-0 shadow-sm rounded-4 text-center p-5 mx-auto" style={{ maxWidth: '540px' }}>
        <div className="card-body">
          <div className="bg-danger bg-opacity-10 text-danger rounded-circle d-inline-flex align-items-center justify-content-center mb-3" style={{ width: '80px', height: '80px' }}>
            <FiShieldOff size={40} />
          </div>
          <h3 className="fw-bold text-dark mb-2">Access Denied</h3>
          <p className="text-muted mb-4">
            You do not have permission to view this page or perform this action.
          </p>
          <button 
            className="btn btn-primary rounded-3 px-4 d-inline-flex align-items-center gap-2"
            onClick={() => navigate('/')}
          >
            <FiHome /> Back to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
};

export default AccessDenied;
