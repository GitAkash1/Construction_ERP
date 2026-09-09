import React, { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import { toast } from 'react-toastify';
import { FiBarChart2, FiFileText, FiShoppingCart, FiDollarSign } from 'react-icons/fi';
import BackToWorkCenter from '../components/BackToWorkCenter';

const TABS = [
  { id: 'boq-consumption', label: 'BOQ Consumption', icon: <FiFileText /> },
  { id: 'po-status', label: 'PO Status', icon: <FiShoppingCart /> },
  { id: 'project-cost', label: 'Project Cost', icon: <FiDollarSign /> },
];

const Reports = () => {
  const [activeTab, setActiveTab] = useState('boq-consumption');
  const [projects, setProjects] = useState([]);
  const [projectId, setProjectId] = useState('');
  const [showProjectDropdown, setShowProjectDropdown] = useState(false);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    api.get('/projects/projects/').then(res => setProjects(res.data.results || res.data));
  }, []);

  // Handle closing dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowProjectDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadReport = async () => {
    if (!projectId) {
      toast.warning('Please select a project.');
      return;
    }
    setLoading(true);
    setData(null);
    try {
      const url = `/dashboard/reports/${activeTab}/?project=${projectId}`;
      const res = await api.get(url);
      setData(res.data);
    } catch (err) {
      toast.error('Failed to load report.');
    } finally {
      setLoading(false);
    }
  };

  const fmt = (n) => Number(n || 0).toLocaleString('en-IN');
  const fmtR = (n) => `₹${fmt(n)}`;
  const pct = (n) => `${Number(n || 0).toFixed(2)}%`;

  const selectedProject = projects.find(p => String(p.id) === String(projectId));

  return (
    <div>
      {/* Page Header */}
      <div className="d-flex flex-column flex-sm-row justify-content-between align-items-start align-items-sm-center mb-4 gap-2">
        <div>
          <h2 className="fw-bold mb-0">Reports</h2>
          <p className="text-muted small mb-0">Material, BOQ, Procurement &amp; Cost Analytics</p>
        </div>
        <div className="d-flex align-items-center gap-2 w-100 w-sm-auto justify-content-start justify-content-sm-end">
          <BackToWorkCenter />
        </div>
      </div>

      {/* Filter and Configuration Card */}
      <div className="card border-0 shadow-sm mb-4">
        <div className="card-body">
          <div className="row g-3 align-items-end">
            {/* Select Project Dropdown with Mobile Viewport Width Fix */}
            <div className="col-12 col-md-4">
              <label className="form-label fw-semibold small text-muted text-uppercase mb-1">Select Project</label>
              <div className="reports-project-select-wrapper position-relative w-100" ref={dropdownRef}>
                <button
                  type="button"
                  className="form-select text-start d-flex justify-content-between align-items-center shadow-none w-100 reports-project-select"
                  onClick={() => setShowProjectDropdown(prev => !prev)}
                  aria-expanded={showProjectDropdown}
                >
                  <span className={`text-truncate ${!selectedProject ? 'text-muted' : 'text-dark fw-medium'}`}>
                    {selectedProject ? selectedProject.project_name : 'Choose Project...'}
                  </span>
                </button>

                {showProjectDropdown && (
                  <div 
                    className="reports-project-dropdown position-absolute shadow-sm border rounded bg-white mt-1 py-1"
                    style={{
                      zIndex: 1050,
                      maxHeight: '220px',
                      overflowY: 'auto',
                      left: 0,
                      right: 0,
                      boxSizing: 'border-box'
                    }}
                  >
                    <button
                      type="button"
                      className={`dropdown-item py-2 px-3 ${!projectId ? 'active fw-semibold' : ''}`}
                      onClick={() => {
                        setProjectId('');
                        setData(null);
                        setShowProjectDropdown(false);
                      }}
                    >
                      Choose Project...
                    </button>
                    {projects.map(p => (
                      <button
                        key={p.id}
                        type="button"
                        className={`dropdown-item py-2 px-3 text-wrap ${String(projectId) === String(p.id) ? 'active fw-semibold' : ''}`}
                        style={{ overflowWrap: 'anywhere', wordBreak: 'break-word' }}
                        onClick={() => {
                          setProjectId(p.id);
                          setData(null);
                          setShowProjectDropdown(false);
                        }}
                      >
                        {p.project_name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="col-12 col-md-6">
              <label className="form-label fw-semibold small text-muted text-uppercase mb-1">Report Type</label>
              <div className="d-flex flex-wrap gap-2">
                {TABS.map(tab => (
                  <button
                    key={tab.id}
                    type="button"
                    className={`btn btn-sm ${activeTab === tab.id ? 'btn-primary shadow-sm' : 'btn-outline-secondary'} d-inline-flex align-items-center justify-content-center gap-1 flex-fill flex-sm-grow-0`}
                    style={{ minHeight: '38px', padding: '0.45rem 0.85rem' }}
                    onClick={() => {
                      setActiveTab(tab.id);
                      setData(null);
                    }}
                  >
                    {tab.icon} <span>{tab.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="col-12 col-md-2 text-md-end">
              <button 
                type="button"
                className="btn btn-success w-100 d-flex align-items-center justify-content-center gap-2" 
                onClick={loadReport} 
                disabled={loading}
                style={{ minHeight: '38px' }}
              >
                {loading ? (
                  <>
                    <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" />
                    <span>Loading...</span>
                  </>
                ) : (
                  <>
                    <FiBarChart2 />
                    <span>Generate</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Initial Empty State */}
      {!data && !loading && (
        <div className="text-center py-5 bg-white rounded border shadow-sm d-flex flex-column align-items-center justify-content-center">
          <FiBarChart2 size={48} className="text-muted mb-3" />
          <h5 className="fw-bold">Select Project &amp; Generate Report</h5>
          <p className="text-muted mb-0 px-3" style={{ maxWidth: '420px' }}>
            Choose a construction project and report category above, then tap <strong>Generate</strong> to view real-time analytics.
          </p>
        </div>
      )}

      {/* Loading Spinner */}
      {loading && (
        <div className="text-center py-5 bg-white rounded border shadow-sm">
          <div className="spinner-border text-primary mb-3" role="status" />
          <h6 className="text-muted mb-0">Generating report analytics...</h6>
        </div>
      )}

      {/* BOQ Consumption Report */}
      {data && activeTab === 'boq-consumption' && (
        <div className="card border-0 shadow-sm">
          <div className="card-header bg-white border-bottom fw-bold d-flex flex-column flex-sm-row justify-content-between align-items-start align-items-sm-center gap-2">
            <span>BOQ Consumption Report</span>
            {Array.isArray(data) && (
              <span className="badge bg-primary bg-opacity-10 text-primary fw-medium">
                {data.length} Materials
              </span>
            )}
          </div>
          <div className="card-body p-0">
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th className="text-nowrap">Material</th>
                    <th className="text-nowrap">Unit</th>
                    <th className="text-nowrap text-end">BOQ Qty</th>
                    <th className="text-nowrap text-end">Consumed</th>
                    <th className="text-nowrap text-end">Balance</th>
                    <th className="text-nowrap" style={{ minWidth: '180px' }}>Consumption %</th>
                  </tr>
                </thead>
                <tbody>
                  {data.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-5 text-muted">
                        No BOQ consumption data found for this project.
                      </td>
                    </tr>
                  ) : (
                    data.map((row, i) => (
                      <tr key={i}>
                        <td className="fw-semibold text-wrap" style={{ minWidth: '160px', maxWidth: '240px' }}>
                          {row.material_name}
                        </td>
                        <td>
                          <span className="badge bg-secondary bg-opacity-10 text-secondary">
                            {row.unit}
                          </span>
                        </td>
                        <td className="text-end fw-medium">{fmt(row.boq_qty)}</td>
                        <td className="text-end fw-medium">{fmt(row.consumed_qty)}</td>
                        <td className="text-end">
                          <span className="text-success fw-bold">{fmt(row.balance_qty)}</span>
                        </td>
                        <td>
                          <div className="d-flex align-items-center gap-2">
                            <div className="progress flex-grow-1" style={{ height: 8, minWidth: 80 }}>
                              <div 
                                className={`progress-bar ${row.consumption_pct > 90 ? 'bg-danger' : row.consumption_pct > 70 ? 'bg-warning' : 'bg-success'}`} 
                                style={{ width: `${Math.min(row.consumption_pct, 100)}%` }} 
                              />
                            </div>
                            <span className="fw-bold small text-nowrap">{pct(row.consumption_pct)}</span>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* PO Status Report */}
      {data && activeTab === 'po-status' && (
        <div className="card border-0 shadow-sm">
          <div className="card-header bg-white border-bottom fw-bold d-flex flex-column flex-sm-row justify-content-between align-items-start align-items-sm-center gap-2">
            <span>Purchase Order Status</span>
            {Array.isArray(data) && (
              <span className="badge bg-primary bg-opacity-10 text-primary fw-medium">
                {data.length} PO Items
              </span>
            )}
          </div>
          <div className="card-body p-0">
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th className="text-nowrap">PO Number</th>
                    <th className="text-nowrap">Vendor</th>
                    <th className="text-nowrap">Material</th>
                    <th className="text-nowrap">Unit</th>
                    <th className="text-nowrap text-end">Ordered</th>
                    <th className="text-nowrap text-end">Received</th>
                    <th className="text-nowrap text-end">Pending</th>
                    <th className="text-nowrap text-end">Rate</th>
                    <th className="text-nowrap text-end">Subtotal</th>
                    <th className="text-nowrap text-center">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="text-center py-5 text-muted">
                        No purchase orders found for this project.
                      </td>
                    </tr>
                  ) : (
                    data.map((row, i) => (
                      <tr key={i}>
                        <td className="fw-bold text-primary text-nowrap">
                          <code className="text-primary">{row.po_number}</code>
                        </td>
                        <td className="text-wrap" style={{ minWidth: '140px' }}>{row.vendor}</td>
                        <td className="fw-semibold text-wrap" style={{ minWidth: '140px' }}>{row.material_name}</td>
                        <td>
                          <span className="badge bg-secondary bg-opacity-10 text-secondary">{row.unit}</span>
                        </td>
                        <td className="text-end fw-medium">{fmt(row.ordered_qty)}</td>
                        <td className="text-end fw-medium">{fmt(row.received_qty)}</td>
                        <td className="text-end">
                          <span className={Number(row.pending_qty) > 0 ? 'text-warning fw-bold' : 'text-success fw-semibold'}>
                            {fmt(row.pending_qty)}
                          </span>
                        </td>
                        <td className="text-end">{fmtR(row.unit_price)}</td>
                        <td className="text-end fw-bold">{fmtR(row.subtotal)}</td>
                        <td className="text-center text-nowrap">
                          <span className={`badge ${row.status === 'Received' ? 'bg-success' : row.status === 'Partially Received' ? 'bg-warning text-dark' : 'bg-secondary'}`}>
                            {row.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Project Cost Summary Report */}
      {data && activeTab === 'project-cost' && (
        <div className="card border-0 shadow-sm">
          <div className="card-header bg-white border-bottom fw-bold d-flex flex-column flex-sm-row justify-content-between align-items-start align-items-sm-center gap-2">
            <span>Project Cost Summary</span>
            <span className="badge bg-info bg-opacity-10 text-info fw-semibold">{data.project}</span>
          </div>
          <div className="card-body p-3 p-md-4">
            <h5 className="fw-bold mb-4">{data.project}</h5>
            <div className="row g-3 mb-4">
              {[
                { label: 'Contract Value', value: data.contract_value, color: 'primary' },
                { label: 'BOQ Value', value: data.boq_value, color: 'info' },
                { label: 'PO Value (Ordered)', value: data.po_value, color: 'secondary' },
                { label: 'Received Material Value', value: data.received_value, color: 'success' },
                { label: 'Consumed Material Value', value: data.consumed_value, color: 'warning' },
                { label: 'Remaining Stock Value', value: data.remaining_stock_value, color: 'success' },
                { label: 'Pending PO Value', value: data.pending_po_value, color: 'danger' },
              ].map((item, i) => (
                <div key={i} className="col-12 col-sm-6 col-md-4 col-xl-3">
                  <div className={`card border-0 shadow-sm h-100 border-start border-${item.color} border-4`}>
                    <div className="card-body p-3">
                      <div className="text-muted small fw-semibold text-uppercase mb-1 text-truncate">{item.label}</div>
                      <div className={`fs-5 fw-bold text-${item.color}`}>{fmtR(item.value)}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Cost Reconciliation Check */}
            <div className="card bg-light border-0 shadow-sm">
              <div className="card-body p-3 p-md-4">
                <h6 className="fw-bold mb-3 d-flex align-items-center gap-2">
                  <FiBarChart2 className="text-primary" /> Cost Reconciliation Check
                </h6>
                <div className="row g-3">
                  <div className="col-12 col-lg-6">
                    <div className="bg-white p-3 rounded border h-100">
                      <p className="mb-1 fw-semibold text-dark">Consumed + Remaining Stock:</p>
                      <p className="text-muted mb-2 text-break font-monospace small">
                        ₹{fmt(data.consumed_value)} + ₹{fmt(data.remaining_stock_value)} = <strong className="text-primary">₹{fmt(Number(data.consumed_value) + Number(data.remaining_stock_value))}</strong>
                      </p>
                      <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mt-2 pt-2 border-top">
                        <small className="text-muted">Expected (Received): <strong>₹{fmt(data.received_value)}</strong></small>
                        {Math.abs((Number(data.consumed_value) + Number(data.remaining_stock_value)) - Number(data.received_value)) < 0.01
                          ? <span className="badge bg-success">✓ Reconciled</span>
                          : <span className="badge bg-danger">✗ Mismatch</span>}
                      </div>
                    </div>
                  </div>
                  <div className="col-12 col-lg-6">
                    <div className="bg-white p-3 rounded border h-100">
                      <p className="mb-1 fw-semibold text-dark">Received + Pending PO:</p>
                      <p className="text-muted mb-2 text-break font-monospace small">
                        ₹{fmt(data.received_value)} + ₹{fmt(data.pending_po_value)} = <strong className="text-primary">₹{fmt(Number(data.received_value) + Number(data.pending_po_value))}</strong>
                      </p>
                      <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mt-2 pt-2 border-top">
                        <small className="text-muted">Expected (PO Value): <strong>₹{fmt(data.po_value)}</strong></small>
                        {Math.abs((Number(data.received_value) + Number(data.pending_po_value)) - Number(data.po_value)) < 0.01
                          ? <span className="badge bg-success">✓ Reconciled</span>
                          : <span className="badge bg-danger">✗ Mismatch</span>}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Reports;
