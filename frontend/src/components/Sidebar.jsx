import React from 'react';
import { NavLink } from 'react-router-dom';
import logo from '../assets/construction-logo-design.jpg';
import {
  FiHome, FiBriefcase,
  FiBox, FiLayers, FiUsers, FiCheckCircle,
  FiDollarSign, FiBarChart2, FiFileText, FiShoppingCart, FiPackage,
  FiGrid, FiLogOut, FiX
} from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';

const Sidebar = ({ isOpen, onClose }) => {
  const { user, logout, hasPermission } = useAuth();

  const handleLinkClick = () => {
    if (onClose) {
      onClose();
    }
  };

  const navLink = (to, icon, label, end = false) => (
    <NavLink 
      to={to} 
      end={end} 
      onClick={handleLinkClick}
      className={({ isActive }) => `erp-nav-item ${isActive ? 'active' : ''}`}
    >
      <span className="erp-nav-icon">{icon}</span>
      <span className="erp-nav-label">{label}</span>
    </NavLink>
  );

  const canSeeProjects = hasPermission('projects.view');
  const canSeeBoq = hasPermission('boq.view');

  const canSeeMaterials = hasPermission('materials.view');
  const canSeeStock = hasPermission('stock.view');
  const canSeeConsumption = hasPermission('site_consumption.view');

  const canSeeRequests = hasPermission('material_requests.view');
  const canSeeOrders = hasPermission('purchase_orders.view');
  const canSeeReceipts = hasPermission('material_receipts.view');

  const canSeeCosts = hasPermission('finance_costs.view');
  const canSeeReports = hasPermission('finance_reports.view');

  const canSeeSubcontractors = hasPermission('subcontractors.view');
  const canSeeWorkOrders = hasPermission('work_orders.view');
  const canSeeMeasurements = hasPermission('measurements.view');
  const canSeeBills = hasPermission('subcontractor_bills.view');

  const showProjectMgmt = canSeeProjects || canSeeBoq;
  const showInventory = canSeeMaterials || canSeeStock || canSeeConsumption;
  const showProcurement = canSeeRequests || canSeeOrders || canSeeReceipts;
  const showFinance = canSeeCosts || canSeeReports;
  const showSubcontractors = canSeeSubcontractors || canSeeWorkOrders || canSeeMeasurements || canSeeBills;

  return (
    <div className={`erp-sidebar d-flex flex-column ${isOpen ? 'open' : ''}`}>
      <div className="erp-sidebar-scroll-content">
        <div className="erp-sidebar-header justify-content-between">
          <div className="d-flex align-items-center gap-2">
            <div className="erp-logo-container">
              <img src={logo} alt="ConstructionERP Logo" className="erp-sidebar-logo" />
            </div>
            <span className="erp-brand-name">ConstructionERP</span>
          </div>
          <button 
            type="button" 
            className="btn btn-link text-white p-1 d-md-none border-0 shadow-none" 
            onClick={onClose}
            aria-label="Close menu"
          >
            <FiX size={22} />
          </button>
        </div>

        <div className="erp-nav-menu">
          <div className="erp-nav-section-title">Overview</div>
          {navLink('/work-center', <FiGrid />, 'Work Center')}

          {showProjectMgmt && (
            <>
              <div className="erp-nav-section-title">Project Management</div>
              {canSeeProjects && navLink('/projects', <FiBriefcase />, 'Projects')}
              {canSeeBoq && navLink('/boq', <FiFileText />, 'Bill of Quantities')}
            </>
          )}

          {showInventory && (
            <>
              <div className="erp-nav-section-title">Inventory</div>
              {canSeeMaterials && navLink('/inventory/materials', <FiBox />, 'Approval')}
              {canSeeStock && navLink('/inventory/stock', <FiLayers />, 'Stock')}
              {canSeeConsumption && navLink('/inventory/consumption', <FiPackage />, 'Consumption')}
            </>
          )}

          {showProcurement && (
            <>
              <div className="erp-nav-section-title">Procurement</div>
              {canSeeRequests && navLink('/procurement/requests', <FiShoppingCart />, 'Material Requests')}
              {canSeeOrders && navLink('/procurement/orders', <FiFileText />, 'Purchase Orders')}
              {canSeeReceipts && navLink('/procurement/receipts', <FiPackage />, 'Material Receipts')}
            </>
          )}

          {showFinance && (
            <>
              <div className="erp-nav-section-title">Finance</div>
              {canSeeCosts && navLink('/finance/costs', <FiDollarSign />, 'Project Costs')}
              {canSeeReports && navLink('/finance/reports', <FiBarChart2 />, 'Reports')}
            </>
          )}

          {showSubcontractors && (
            <>
              <div className="erp-nav-section-title">Subcontractors</div>
              {canSeeSubcontractors && navLink('/subcontractors', <FiUsers />, 'Subcontractors', true)}
              {canSeeWorkOrders && navLink('/subcontractors/work-orders', <FiFileText />, 'Work Orders')}
              {canSeeMeasurements && navLink('/subcontractors/measurements', <FiCheckCircle />, 'Measurement Approval')}
              {canSeeBills && navLink('/subcontractors/bills', <FiDollarSign />, 'Bills')}
            </>
          )}
        </div>
      </div>

      <div className="erp-sidebar-footer">
        <div className="erp-user-card">
          <div className="erp-user-avatar">
            <FiUsers className="erp-user-avatar-icon" />
          </div>
          <div className="erp-user-info">
            <div className="erp-username">{user?.username || 'User'}</div>
            <div className="erp-user-role">
              {user?.role || (user?.isAdmin ? 'Admin' : 'User')}
            </div>
          </div>
        </div>
        <button 
          onClick={logout} 
          className="erp-logout-button"
        >
          <FiLogOut size={16} />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;

