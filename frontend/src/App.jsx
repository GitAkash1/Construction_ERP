import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import ERPLayout from './layouts/ERPLayout';
import { AuthProvider, useAuth } from './context/AuthContext';

import Dashboard from './pages/Dashboard';
import WorkCenter from './pages/WorkCenter';
import Login from './pages/Login';
import AccessDenied from './pages/AccessDenied';
import Projects from './pages/Projects';
import ProjectDetail from './pages/ProjectDetail';
import Sites from './pages/Sites';
import Tasks from './pages/Tasks';
import Materials from './pages/Materials';
import Stock from './pages/Stock';
import MaterialRequests from './pages/MaterialRequests';
import PurchaseOrders from './pages/PurchaseOrders';
import MaterialReceipts from './pages/MaterialReceipts';
import SiteConsumption from './pages/SiteConsumption';
import BOQList from './pages/BOQList';
import BOQDetail from './pages/BOQDetail';
import Contractors from './pages/Contractors';
import WorkOrders from './pages/WorkOrders';
import Costs from './pages/Costs';
import Reports from './pages/Reports';

// Subcontractors
import SubcontractorList from './pages/subcontractors/SubcontractorList';
import SubcontractWorkOrders from './pages/subcontractors/SubcontractWorkOrders';
import WorkOrderDetail from './pages/subcontractors/WorkOrderDetail';
import MeasurementApproval from './pages/subcontractors/MeasurementApproval';
import SubcontractorBills from './pages/subcontractors/SubcontractorBills';

const ProtectedRoute = ({ children, permission }) => {
  const { user, loading, hasPermission } = useAuth();
  
  if (loading) {
    return <div className="d-flex justify-content-center align-items-center vh-100">Loading...</div>;
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  if (permission && !hasPermission(permission)) {
    return <AccessDenied />;
  }
  
  return children;
};

const ProtectedAuthRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <div className="d-flex justify-content-center align-items-center vh-100">Loading...</div>;
  }
  
  if (user) {
    return <Navigate to="/work-center" replace />;
  }
  
  return children;
};

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<ProtectedAuthRoute><Login /></ProtectedAuthRoute>} />
          <Route path="/" element={<ProtectedRoute><ERPLayout /></ProtectedRoute>}>
            <Route index element={<Dashboard />} />
            <Route path="work-center" element={<WorkCenter />} />
            <Route path="projects" element={<ProtectedRoute permission="projects.view"><Projects /></ProtectedRoute>} />
            <Route path="projects/:id" element={<ProtectedRoute permission="projects.view"><ProjectDetail /></ProtectedRoute>} />
            <Route path="sites" element={<ProtectedRoute permission="sites.view"><Sites /></ProtectedRoute>} />
            <Route path="tasks" element={<Tasks />} />
            <Route path="inventory/materials" element={<ProtectedRoute permission="materials.view"><Materials /></ProtectedRoute>} />
            <Route path="inventory/stock" element={<ProtectedRoute permission="stock.view"><Stock /></ProtectedRoute>} />
            <Route path="inventory/consumption" element={<ProtectedRoute permission="site_consumption.view"><SiteConsumption /></ProtectedRoute>} />
            {/* BOQ */}
            <Route path="boq" element={<ProtectedRoute permission="boq.view"><BOQList /></ProtectedRoute>} />
            <Route path="boq/:id" element={<ProtectedRoute permission="boq.view"><BOQDetail /></ProtectedRoute>} />
            {/* Procurement */}
            <Route path="procurement/requests" element={<ProtectedRoute permission="material_requests.view"><MaterialRequests /></ProtectedRoute>} />
            <Route path="procurement/orders" element={<ProtectedRoute permission="purchase_orders.view"><PurchaseOrders /></ProtectedRoute>} />
            <Route path="procurement/receipts" element={<ProtectedRoute permission="material_receipts.view"><MaterialReceipts /></ProtectedRoute>} />
            {/* Site Operations */}
            <Route path="sites/consumption" element={<ProtectedRoute permission="site_consumption.view"><SiteConsumption /></ProtectedRoute>} />
            {/* Contractors */}
            <Route path="contractors" element={<Contractors />} />
            <Route path="contractors/work-orders" element={<WorkOrders />} />
            {/* Finance */}
            <Route path="finance/costs" element={<ProtectedRoute permission="finance_costs.view"><Costs /></ProtectedRoute>} />
            <Route path="finance/reports" element={<ProtectedRoute permission="finance_reports.view"><Reports /></ProtectedRoute>} />
            {/* Subcontractors App */}
            <Route path="subcontractors" element={<ProtectedRoute permission="subcontractors.view"><SubcontractorList /></ProtectedRoute>} />
            <Route path="subcontractors/work-orders" element={<ProtectedRoute permission="work_orders.view"><SubcontractWorkOrders /></ProtectedRoute>} />
            <Route path="subcontractors/work-orders/:id" element={<ProtectedRoute permission="work_orders.view"><WorkOrderDetail /></ProtectedRoute>} />
            <Route path="subcontractors/measurements" element={<ProtectedRoute permission="measurements.view"><MeasurementApproval /></ProtectedRoute>} />
            <Route path="subcontractors/bills" element={<ProtectedRoute permission="subcontractor_bills.view"><SubcontractorBills /></ProtectedRoute>} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
