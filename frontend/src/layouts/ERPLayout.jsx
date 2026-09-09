import React, { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import { ToastContainer } from 'react-toastify';

const ERPLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  // Auto-close sidebar on mobile whenever the route changes
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  return (
    <div className="d-flex w-100 position-relative">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div 
        className={`erp-sidebar-backdrop ${sidebarOpen ? 'show' : ''}`} 
        onClick={() => setSidebarOpen(false)} 
        aria-hidden="true"
      />
      <div className="erp-main-wrapper w-100">
        <Header onToggleSidebar={() => setSidebarOpen(prev => !prev)} isSidebarOpen={sidebarOpen} />
        <main className="erp-page-content">
          <Outlet />
        </main>
      </div>
      <ToastContainer position="bottom-right" />
    </div>
  );
};

export default ERPLayout;

