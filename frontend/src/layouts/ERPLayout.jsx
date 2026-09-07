import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import { ToastContainer } from 'react-toastify';

const ERPLayout = () => {
  return (
    <div className="d-flex w-100">
      <Sidebar />
      <div className="erp-main-wrapper w-100">
        <Header />
        <main className="erp-page-content">
          <Outlet />
        </main>
      </div>
      <ToastContainer position="bottom-right" />
    </div>
  );
};

export default ERPLayout;
