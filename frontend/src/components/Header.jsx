import React from 'react';
import { FiBell, FiUser, FiLogOut } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const Header = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="erp-top-header">
      <div className="d-flex align-items-center">
        {/* Placeholder for Search or Breadcrumbs */}
      </div>
      <div className="d-flex align-items-center gap-4">
        <button className="btn btn-link text-muted p-0">
          <FiBell size={20} />
        </button>
        <div className="d-flex align-items-center gap-2" style={{ cursor: 'pointer' }}>
          <div className="bg-primary text-white rounded-circle d-flex align-items-center justify-content-center" style={{ width: '32px', height: '32px' }}>
            <FiUser />
          </div>
          <span className="fw-medium text-dark">{user?.username || 'User'}</span>
        </div>
        <button className="btn btn-link text-danger p-0" title="Logout" onClick={logout}>
          <FiLogOut size={20} />
        </button>
      </div>
    </header>
  );
};

export default Header;
