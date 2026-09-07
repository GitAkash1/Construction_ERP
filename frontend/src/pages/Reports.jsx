import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { toast } from 'react-toastify';
import { FiBarChart2, FiFileText, FiShoppingCart, FiPackage, FiLayers, FiDollarSign } from 'react-icons/fi';
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
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get('/projects/projects/').then(res => setProjects(res.data.results || res.data));
  }, []);

  const loadReport = async () => {
    if (!projectId) { toast.warning('Please select a project.'); return; }
    setLoading(true);
    setData(null);
    try {
      const url = `/dashboard/reports/${activeTab}/?project=${projectId}`;
      const res = await api.get(url);
      setData(res.data);
    } catch (err) {
      toast.error('Failed to load report.');
    } finally { setLoading(false); }
  };

  const fmt = (n) => Number(n || 0).toLocaleString('en-IN');
  const fmtR = (n) => `₹${fmt(n)}`;
  const pct = (n) => `${Number(n || 0).toFixed(2)}%`;

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="fw-bold mb-0">Reports</h2>
          <p className="text-muted mb-0">Material, BOQ, Procurement &amp; Cost Analytics</p>
        </div>
        <div className="d-flex align-items-center gap-2">
          <BackToWorkCenter />
        </div>
      </div>

      {/* Tabs */}
      <div className="card border-0 mb-4">
        <div className="card-body">
          <div className="row g-3 align-items-end">
            <div className="col-md-4">
              <label className="form-label fw-semibold">Select Project</label>
              <select className="form-select" value={projectId} onChange={e => setProjectId(e.target.value)}>
                <option value="">Choose Project...</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.project_name}</option>)}
              </select>
            </div>
            <div className="col-md-6">
              <label className="form-label fw-semibold">Report Type</label>
              <div className="d-flex flex-wrap gap-2">
                {TABS.map(tab => (
                  <button
                    key={tab.id}
                    className={`btn btn-sm ${activeTab === tab.id ? 'btn-primary' : 'btn-outline-secondary'} d-flex align-items-center gap-1`}
                    onClick={() => { setActiveTab(tab.id); setData(null); }}
                  >
                    {tab.icon} {tab.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="col-md-2 text-end">
              <button className="btn btn-success w-100" onClick={loadReport} disabled={loading}>
                {loading ? 'Loading...' : 'Generate'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Results */}
      {loading && (
        <div className="text-center py-5"><div className="spinner-border text-primary" /><p className="mt-2 text-muted">Generating report...</p></div>
      )}

      {data && activeTab === 'boq-consumption' && (
        <div className="card border-0">
          <div className="card-header bg-white border-bottom fw-bold">BOQ Consumption Report</div>
          <div className="card-body p-0">
            <div className="table-responsive">
              <table className="table table-hover mb-0">
                <thead>
                  <tr><th>Material</th><th>Unit</th><th>BOQ Qty</th><th>Consumed</th><th>Balance</th><th>Consumption %</th></tr>
                </thead>
                <tbody>
                  {data.length === 0 ? <tr><td colSpan={6} className="text-center py-4 text-muted">No data.</td></tr>
                    : data.map((row, i) => (
                      <tr key={i}>
                        <td className="fw-semibold">{row.material_name}</td>
                        <td>{row.unit}</td>
                        <td>{fmt(row.boq_qty)}</td>
                        <td>{fmt(row.consumed_qty)}</td>
                        <td><span className="text-success fw-semibold">{fmt(row.balance_qty)}</span></td>
                        <td>
                          <div className="d-flex align-items-center gap-2">
                            <div className="progress flex-grow-1" style={{ height: 8, minWidth: 80 }}>
                              <div className={`progress-bar ${row.consumption_pct > 90 ? 'bg-danger' : row.consumption_pct > 70 ? 'bg-warning' : 'bg-success'}`} style={{ width: `${row.consumption_pct}%` }} />
                            </div>
                            <span className="fw-semibold">{pct(row.consumption_pct)}</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {data && activeTab === 'po-status' && (
        <div className="card border-0">
          <div className="card-header bg-white border-bottom fw-bold">Purchase Order Status</div>
          <div className="card-body p-0">
            <div className="table-responsive">
              <table className="table table-hover mb-0">
                <thead>
                  <tr><th>PO Number</th><th>Vendor</th><th>Material</th><th>Unit</th><th>Ordered</th><th>Received</th><th>Pending</th><th>Rate</th><th>Subtotal</th><th>Status</th></tr>
                </thead>
                <tbody>
                  {data.length === 0 ? <tr><td colSpan={10} className="text-center py-4 text-muted">No data.</td></tr>
                    : data.map((row, i) => (
                      <tr key={i}>
                        <td className="fw-semibold">{row.po_number}</td>
                        <td>{row.vendor}</td>
                        <td>{row.material_name}</td>
                        <td>{row.unit}</td>
                        <td>{fmt(row.ordered_qty)}</td>
                        <td>{fmt(row.received_qty)}</td>
                        <td><span className={Number(row.pending_qty) > 0 ? 'text-warning fw-semibold' : 'text-success'}>{fmt(row.pending_qty)}</span></td>
                        <td>{fmtR(row.unit_price)}</td>
                        <td>{fmtR(row.subtotal)}</td>
                        <td><span className={`badge ${row.status === 'Received' ? 'bg-success' : row.status === 'Partially Received' ? 'bg-warning text-dark' : 'bg-secondary'}`}>{row.status}</span></td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {data && activeTab === 'project-cost' && (
        <div className="card border-0">
          <div className="card-header bg-white border-bottom fw-bold">Project Cost Summary</div>
          <div className="card-body">
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
                <div key={i} className="col-md-4">
                  <div className={`card border-0 border-start border-${item.color} border-4`}>
                    <div className="card-body">
                      <div className="text-muted small fw-semibold text-uppercase mb-1">{item.label}</div>
                      <div className={`fs-5 fw-bold text-${item.color}`}>{fmtR(item.value)}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Cost Reconciliation */}
            <div className="card bg-light border-0">
              <div className="card-body">
                <h6 className="fw-bold mb-3">📊 Cost Reconciliation Check</h6>
                <div className="row">
                  <div className="col-md-6">
                    <p className="mb-1"><strong>Consumed + Remaining Stock:</strong></p>
                    <p className="text-muted mb-2">₹{fmt(data.consumed_value)} + ₹{fmt(data.remaining_stock_value)} = <strong className="text-primary">₹{fmt(Number(data.consumed_value) + Number(data.remaining_stock_value))}</strong></p>
                    <p className="mb-1"><small>Should equal Received Value: <strong>₹{fmt(data.received_value)}</strong></small></p>
                    {Math.abs((Number(data.consumed_value) + Number(data.remaining_stock_value)) - Number(data.received_value)) < 0.01
                      ? <span className="badge bg-success">✓ Reconciled</span>
                      : <span className="badge bg-danger">✗ Mismatch</span>}
                  </div>
                  <div className="col-md-6">
                    <p className="mb-1"><strong>Received + Pending PO:</strong></p>
                    <p className="text-muted mb-2">₹{fmt(data.received_value)} + ₹{fmt(data.pending_po_value)} = <strong className="text-primary">₹{fmt(Number(data.received_value) + Number(data.pending_po_value))}</strong></p>
                    <p className="mb-1"><small>Should equal PO Value: <strong>₹{fmt(data.po_value)}</strong></small></p>
                    {Math.abs((Number(data.received_value) + Number(data.pending_po_value)) - Number(data.po_value)) < 0.01
                      ? <span className="badge bg-success">✓ Reconciled</span>
                      : <span className="badge bg-danger">✗ Mismatch</span>}
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
