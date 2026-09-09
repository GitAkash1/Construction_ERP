import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FiBriefcase, FiAlertTriangle, FiCheckCircle, 
  FiClock, FiGrid, FiArrowRight, FiRefreshCw, 
  FiFileText, FiShoppingCart, FiPackage, FiLayers, FiDollarSign, FiUsers 
} from 'react-icons/fi';
import StatCard from '../components/StatCard';
import StatusBadge from '../components/StatusBadge';
import api from '../services/api';
import { toast } from 'react-toastify';

const WorkCenter = () => {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);

  const fetchWorkCenterData = async (projId = '') => {
    setError(null);
    try {
      const url = projId ? `/work-center/?project_id=${projId}` : '/work-center/';
      const response = await api.get(url);
      setData(response.data);
    } catch (err) {
      console.error(err);
      setError('Unable to load Work Center data. Please try again.');
      toast.error('Failed to load Work Center details.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchWorkCenterData(selectedProject);
  }, [selectedProject]);

  const handleRefresh = () => {
    setRefreshing(true);
    setCurrentPage(1);
    fetchWorkCenterData(selectedProject);
  };

  const handleProjectChange = (e) => {
    setLoading(true);
    setCurrentPage(1);
    setSelectedProject(e.target.value);
  };

  // Helper to map activity type to icon
  const getActivityIcon = (type) => {
    switch (type) {
      case 'Material Request':
        return <FiShoppingCart className="text-primary" />;
      case 'Purchase Order':
        return <FiFileText className="text-warning" />;
      case 'Material Receipt':
        return <FiPackage className="text-success" />;
      case 'Site Consumption':
        return <FiLayers className="text-info" />;
      case 'Work Order':
        return <FiBriefcase className="text-secondary" />;
      case 'Measurement':
        return <FiCheckCircle className="text-success" />;
      case 'Bill':
        return <FiDollarSign className="text-danger" />;
      default:
        return <FiGrid className="text-muted" />;
    }
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: '70vh' }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container py-5">
        <div className="alert alert-danger shadow-sm border-0 d-flex flex-column align-items-center p-5 text-center" role="alert">
          <FiAlertTriangle size={48} className="mb-3 text-danger" />
          <h4 className="alert-heading fw-bold mb-2">Failed to Load</h4>
          <p className="mb-4">{error}</p>
          <button className="btn btn-danger px-4" onClick={handleRefresh}>
            <FiRefreshCw className="me-2" /> Retry
          </button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { overview, actions, attention_required = [], recent_activity, quick_access, projects } = data;

  const rowsPerPage = 6;
  const totalRecords = attention_required.length;
  const totalPages = Math.max(1, Math.ceil(totalRecords / rowsPerPage));
  const validCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (validCurrentPage - 1) * rowsPerPage;
  const paginatedAttentionRequired = attention_required.slice(startIndex, startIndex + rowsPerPage);

  return (
    <div className="container-fluid px-0">
      {/* Header and Filter */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
        <div>
          <nav aria-label="breadcrumb">
            <ol className="breadcrumb mb-1 text-muted" style={{ fontSize: '0.85rem' }}>
              <li className="breadcrumb-item"><a href="/" onClick={(e) => { e.preventDefault(); navigate('/'); }} className="text-decoration-none text-muted">Home</a></li>
              <li className="breadcrumb-item active fw-medium text-primary" aria-current="page">Work Center</li>
            </ol>
          </nav>
          <h2 className="mb-0 fw-bold" style={{ letterSpacing: '-0.02em' }}>Work Center</h2>
          <p className="text-muted mb-0" style={{ fontSize: '0.95rem' }}>Today's project activities and actions requiring your attention</p>
        </div>
        
        <div className="d-flex align-items-center gap-2">
          <div className="input-group" style={{ minWidth: '220px' }}>
            <label className="input-group-text bg-white border-end-0 text-muted" htmlFor="project-filter" style={{ fontSize: '0.85rem' }}>
              Project
            </label>
            <select 
              className="form-select border-start-0 fw-medium" 
              id="project-filter"
              value={selectedProject} 
              onChange={handleProjectChange}
              style={{ fontSize: '0.875rem' }}
            >
              <option value="">All Projects</option>
              {projects?.map(proj => (
                <option key={proj.id} value={proj.id}>{proj.project_name}</option>
              ))}
            </select>
          </div>
          <button 
            className="btn btn-light bg-white border shadow-sm d-flex align-items-center justify-content-center p-2 rounded-3"
            onClick={handleRefresh}
            disabled={refreshing}
            title="Refresh Data"
            style={{ width: '38px', height: '38px' }}
          >
            <FiRefreshCw className={refreshing ? 'spin-animation text-primary' : 'text-secondary'} size={18} />
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="row g-4 mb-4">
        <div className="col-md-6 col-lg-3">
          <StatCard 
            title="Active Projects" 
            value={overview.active_projects} 
            icon={FiBriefcase} 
            color="primary" 
          />
        </div>
        <div className="col-md-6 col-lg-3">
          <StatCard 
            title="Pending Approvals" 
            value={overview.pending_approvals} 
            icon={FiClock} 
            color="warning" 
          />
        </div>
        <div className="col-md-6 col-lg-3">
          <StatCard 
            title="Stock Alerts" 
            value={overview.stock_alerts} 
            icon={FiAlertTriangle} 
            color="danger" 
          />
        </div>
        <div className="col-md-6 col-lg-3">
          <StatCard 
            title="Open Work Orders" 
            value={overview.open_work_orders} 
            icon={FiGrid} 
            color="info" 
          />
        </div>
      </div>

      {/* My Actions Section */}
      <div className="mb-4">
        <div className="mb-3">
          <h5 className="fw-bold mb-0">My Actions</h5>
          <span className="text-muted small">Start work directly from existing screens</span>
        </div>
        <div className="row g-3">
          {actions.map((act, index) => (
            <div key={index} className="col-12 col-md-6 col-lg-2-4">
              <div 
                className="card h-100 border-0 shadow-sm erp-action-card" 
                onClick={() => navigate(act.route, { state: { fromWorkCenter: true } })}
                style={{ cursor: 'pointer', transition: 'all 0.2s ease-in-out' }}
              >
                <div className="card-body p-3 d-flex flex-column justify-content-between">
                  <div>
                    <div className="d-flex justify-content-between align-items-start mb-2">
                      <span className="badge bg-primary bg-opacity-10 text-primary fw-bold" style={{ fontSize: '0.85rem' }}>
                        {act.count}
                      </span>
                      <FiArrowRight className="text-muted erp-arrow-icon" size={16} />
                    </div>
                    <h6 className="fw-bold mb-1 text-dark" style={{ fontSize: '0.9rem' }}>{act.title}</h6>
                    <p className="text-muted mb-0 small">{act.description}</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Attention Required & Recent Activity */}
      <div className="row g-4 mb-4">
        {/* Attention Required */}
        <div className="col-12 col-lg-8">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-header bg-white border-0 pt-4 pb-0 px-4">
              <h5 className="fw-bold mb-0">Attention Required</h5>
              <span className="text-muted small">Records that need action</span>
            </div>
            <div className="card-body px-4 pb-4 pt-3">
              {attention_required.length === 0 ? (
                <div className="text-center py-5">
                  <FiCheckCircle size={44} className="text-success mb-2 opacity-75" />
                  <p className="mb-0 fw-semibold text-dark">No pending actions</p>
                  <p className="text-muted small mb-0">All project activities are up to date.</p>
                </div>
              ) : (
                <>
                  <div className="table-responsive">
                    <table className="table align-middle mb-0">
                      <thead>
                        <tr>
                          <th>Serial Number</th>
                          <th>Date</th>
                          <th>Type</th>
                          <th>Project</th>
                          <th>Reference</th>
                          <th>Status</th>
                          <th className="text-end">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedAttentionRequired.map((item, index) => (
                          <tr key={index}>
                            <td className="text-nowrap small text-muted">{startIndex + index + 1}</td>
                            <td className="text-nowrap small text-muted">{item.date}</td>
                            <td>
                              <span className="fw-semibold text-dark" style={{ fontSize: '0.9rem' }}>
                                {item.type}
                              </span>
                            </td>
                            <td className="text-truncate" style={{ maxWidth: '150px' }} title={item.project}>
                              {item.project}
                            </td>
                            <td>
                              <code className="text-secondary fw-semibold" style={{ fontSize: '0.85rem' }}>{item.reference}</code>
                            </td>
                            <td>
                              <StatusBadge status={item.status} />
                            </td>
                            <td className="text-end">
                              <button 
                                className="btn btn-sm btn-outline-primary fw-medium px-3 rounded-2"
                                onClick={() => navigate(item.route, { state: { fromWorkCenter: true } })}
                                style={{ fontSize: '0.8rem' }}
                              >
                                {item.action}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {totalPages > 1 && (
                    <div className="d-flex justify-content-between align-items-center pt-3 mt-2 border-top">
                      <span className="text-muted small">Showing page {validCurrentPage} of {totalPages}</span>
                      <nav>
                        <ul className="pagination pagination-sm mb-0">
                          <li className={`page-item ${validCurrentPage === 1 ? 'disabled' : ''}`}>
                            <button 
                              className="page-link" 
                              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                              disabled={validCurrentPage === 1}
                            >
                              Previous
                            </button>
                          </li>
                          {[...Array(totalPages)].map((_, idx) => (
                            <li key={idx} className={`page-item ${validCurrentPage === idx + 1 ? 'active' : ''}`}>
                              <button className="page-link" onClick={() => setCurrentPage(idx + 1)}>
                                {idx + 1}
                              </button>
                            </li>
                          ))}
                          <li className={`page-item ${validCurrentPage === totalPages ? 'disabled' : ''}`}>
                            <button 
                              className="page-link" 
                              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                              disabled={validCurrentPage === totalPages}
                            >
                              Next
                            </button>
                          </li>
                        </ul>
                      </nav>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Recent Activities */}
        <div className="col-12 col-lg-4">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-header bg-white border-0 pt-4 pb-0 px-4">
              <h5 className="fw-bold mb-0">Recent Activities</h5>
              <span className="text-muted small">Latest project activities</span>
            </div>
            <div className="card-body px-4 pb-4 pt-3 position-relative">
              {recent_activity.length === 0 ? (
                <div className="text-center py-5 text-muted">
                  <p className="mb-0">No recent activity available.</p>
                </div>
              ) : (
                <div className="position-relative">
                  <div 
                    className="erp-activity-scroll pe-2" 
                    style={{ 
                      maxHeight: '400px', 
                      overflowY: 'auto', 
                      overflowX: 'hidden' 
                    }}
                  >
                    <div className="position-relative erp-timeline ps-3 ms-1" style={{ borderLeft: '2px solid var(--erp-border)' }}>
                      {recent_activity.map((act, index) => (
                        <div key={index} className="position-relative mb-4 last-mb-0">
                          {/* Bullet Icon */}
                          <div 
                            className="position-absolute bg-white rounded-circle border shadow-sm d-flex align-items-center justify-content-center"
                            style={{ 
                              width: '28px', 
                              height: '28px', 
                              left: '-29px', 
                              top: '0px'
                            }}
                          >
                            {getActivityIcon(act.type)}
                          </div>
                          
                          <div className="ms-2">
                            <div className="d-flex justify-content-between align-items-start gap-2 mb-1">
                              <span className="fw-bold text-dark" style={{ fontSize: '0.85rem' }}>{act.type}</span>
                              <span className="text-muted text-nowrap" style={{ fontSize: '0.75rem' }}>
                                {act.date} {act.time}
                              </span>
                            </div>
                            <p className="text-muted mb-0 small lh-sm">{act.description}</p>
                            {act.project && (
                              <span className="badge bg-light text-secondary mt-1 small" style={{ fontSize: '0.7rem' }}>
                                {act.project}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  {recent_activity.length > 5 && (
                    <div 
                      className="position-absolute bottom-0 start-0 end-0 pointer-events-none d-flex justify-content-center align-items-end pb-1"
                      style={{ 
                        height: '40px', 
                        background: 'linear-gradient(to bottom, rgba(255,255,255,0), rgba(255,255,255,0.95))',
                        borderBottomLeftRadius: '0.375rem',
                        borderBottomRightRadius: '0.375rem'
                      }}
                    >
                      <span className="text-muted small fw-medium" style={{ fontSize: '0.75rem', opacity: 0.8 }}>
                        ↕ Scroll for more
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Access */}
      <div className="card border-0 shadow-sm mb-4">
        <div className="card-header bg-white border-0 pt-4 pb-0 px-4">
          <h5 className="fw-bold mb-0">Quick Access</h5>
          <span className="text-muted small">Navigate instantly to modules</span>
        </div>
        <div className="card-body p-4">
          <div className="d-flex flex-wrap gap-2">
            {quick_access.map((qa, index) => (
              <button 
                key={index}
                className="btn btn-outline-secondary btn-sm fw-medium border-light-subtle bg-light-subtle text-secondary px-3 py-2 rounded-3 shadow-none erp-qa-btn"
                onClick={() => navigate(qa.route, { state: { fromWorkCenter: true } })}
                style={{ fontSize: '0.85rem' }}
              >
                {qa.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* CSS Styles injection specifically for WorkCenter */}
      <style dangerouslySetInnerHTML={{__html: `
        .col-lg-2-4 {
          flex: 0 0 auto;
          width: 100%;
        }
        @media (min-width: 992px) {
          .col-lg-2-4 {
            width: 20%;
          }
        }
        .erp-action-card:hover {
          transform: translateY(-3px);
          box-shadow: var(--erp-shadow-md) !important;
          border: 1px solid var(--erp-primary) !important;
        }
        .erp-action-card:hover .erp-arrow-icon {
          color: var(--erp-primary) !important;
          transform: translateX(3px);
          transition: transform 0.2s;
        }
        .spin-animation {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .last-mb-0:last-child {
          margin-bottom: 0 !important;
        }
        .erp-qa-btn:hover {
          background-color: var(--erp-primary) !important;
          color: white !important;
          border-color: var(--erp-primary) !important;
        }
        .erp-activity-scroll::-webkit-scrollbar {
          width: 5px;
        }
        .erp-activity-scroll::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 4px;
        }
        .erp-activity-scroll::-webkit-scrollbar-track {
          background: transparent;
        }
      `}} />
    </div>
  );
};

export default WorkCenter;
