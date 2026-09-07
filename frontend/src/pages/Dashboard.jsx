import React, { useEffect, useState } from 'react';
import { 
  FiBriefcase, FiAlertCircle, FiCheckCircle, 
  FiClock, FiMap, FiList, FiAlertTriangle, FiDollarSign 
} from 'react-icons/fi';
import StatCard from '../components/StatCard';
import api from '../services/api';
import { toast } from 'react-toastify';

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await api.get('/dashboard/');
        setStats(response.data);
      } catch (error) {
        toast.error('Failed to load dashboard statistics.');
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: '70vh' }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div>
      <h2 className="mb-4 fw-bold">Overview</h2>
      
      <div className="row g-4 mb-4">
        <div className="col-md-6 col-lg-3">
          <StatCard title="Total Projects" value={stats.total_projects} icon={FiBriefcase} color="primary" />
        </div>
        <div className="col-md-6 col-lg-3">
          <StatCard title="Active Projects" value={stats.active_projects} icon={FiCheckCircle} color="success" />
        </div>
        <div className="col-md-6 col-lg-3">
          <StatCard title="Delayed Projects" value={stats.delayed_projects} icon={FiAlertCircle} color="danger" />
        </div>
        <div className="col-md-6 col-lg-3">
          <StatCard title="Active Sites" value={stats.active_sites} icon={FiMap} color="info" />
        </div>
        
        <div className="col-md-6 col-lg-3">
          <StatCard title="Pending Tasks" value={stats.pending_tasks} icon={FiClock} color="warning" />
        </div>
        <div className="col-md-6 col-lg-3">
          <StatCard title="Low Stock Materials" value={stats.low_stock_materials} icon={FiAlertTriangle} color="danger" />
        </div>
        <div className="col-md-6 col-lg-6">
          <StatCard 
            title="Total Project Cost" 
            value={`₹${Number(stats.total_project_cost).toLocaleString('en-IN', {minimumFractionDigits: 0, maximumFractionDigits: 2})}`} 
            icon={FiDollarSign} 
            color="success" 
          />
        </div>
      </div>
      
      {/* Additional dashboard sections like Recent Activity or Charts can go here */}
      <div className="row g-4">
        <div className="col-12 col-lg-8">
          <div className="card border-0 h-100">
            <div className="card-header bg-white border-bottom-0 pt-4 pb-0">
              <h5 className="fw-bold mb-0">Project Status Overview</h5>
            </div>
            <div className="card-body d-flex align-items-center justify-content-center text-muted">
              {/* Placeholder for a Chart.js component */}
              <p>Chart data will be visualized here.</p>
            </div>
          </div>
        </div>
        <div className="col-12 col-lg-4">
          <div className="card border-0 h-100">
            <div className="card-header bg-white border-bottom-0 pt-4 pb-0">
              <h5 className="fw-bold mb-0">Recent Alerts</h5>
            </div>
            <div className="card-body">
               {stats.low_stock_materials > 0 && (
                 <div className="alert alert-danger d-flex align-items-center gap-2 border-0">
                   <FiAlertTriangle /> {stats.low_stock_materials} materials are running low on stock.
                 </div>
               )}
               {stats.delayed_projects > 0 && (
                 <div className="alert alert-warning d-flex align-items-center gap-2 border-0">
                   <FiAlertCircle /> {stats.delayed_projects} projects are currently delayed.
                 </div>
               )}
               {stats.low_stock_materials === 0 && stats.delayed_projects === 0 && (
                 <div className="text-muted text-center py-4">
                    <FiCheckCircle size={32} className="text-success mb-2 opacity-50" />
                    <p className="mb-0">All systems operating normally.</p>
                 </div>
               )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
