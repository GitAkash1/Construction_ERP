import React from 'react';
import { FiBell, FiUser, FiLogOut, FiMenu } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const Header = ({ onToggleSidebar, isSidebarOpen }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="erp-top-header">
      <div className="d-flex align-items-center gap-2">
        <button 
          className="btn btn-link text-dark p-1 d-md-none border-0 shadow-none d-flex align-items-center justify-content-center"
          onClick={onToggleSidebar}
          aria-label={isSidebarOpen ? 'Close navigation' : 'Open navigation'}
          style={{ width: '38px', height: '38px' }}
        >
          <FiMenu size={24} />
        </button>
        {/* Placeholder for Search or Breadcrumbs */}
      </div>
      <div className="d-flex align-items-center gap-3 gap-sm-4">
        <button className="btn btn-link text-muted p-0 border-0 shadow-none" title="Notifications" aria-label="Notifications">
          <FiBell size={20} />
        </button>
        <div className="d-flex align-items-center gap-2" style={{ cursor: 'pointer' }}>
          <div className="bg-primary text-white rounded-circle d-flex align-items-center justify-content-center" style={{ width: '32px', height: '32px' }}>
            <FiUser />
          </div>
          <span className="fw-medium text-dark d-none d-sm-inline">{user?.username || 'User'}</span>
        </div>
        <button className="btn btn-link text-danger p-0 border-0 shadow-none" title="Logout" onClick={logout} aria-label="Logout">
          <FiLogOut size={20} />
        </button>
      </div>
    </header>
  );
};

export default Header;

