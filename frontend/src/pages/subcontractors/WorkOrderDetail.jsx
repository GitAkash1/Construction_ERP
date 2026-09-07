import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { toast } from 'react-toastify';
import { FiArrowLeft, FiPlus, FiDollarSign } from 'react-icons/fi';
import ProgressBar from '../../components/ProgressBar';
import DataTable from '../../components/DataTable';
import { useAuth } from '../../context/AuthContext';

const WorkOrderDetail = () => {
  const { hasPermission } = useAuth();
  const { id } = useParams();
  const navigate = useNavigate();
  const [workOrder, setWorkOrder] = useState(null);
  const [progressRecords, setProgressRecords] = useState([]);
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [showBillModal, setShowBillModal] = useState(false);
  
  const [progressForm, setProgressForm] = useState({
    measurement_date: new Date().toISOString().split('T')[0],
    submitted_quantity: '',
    measurement_description: '',
    remarks: ''
  });
  
  const [billForm, setBillForm] = useState({
    bill_date: new Date().toISOString().split('T')[0],
    bill_quantity: '',
    tax_percentage: '0'
  });

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const promises = [
        api.get(`/subcontractors/work-orders/${id}/`),
        hasPermission('measurements.view') ? api.get(`/subcontractors/work-progress/?work_order=${id}`) : Promise.resolve({ data: [] }),
        hasPermission('subcontractor_bills.view') ? api.get(`/subcontractors/bills/?work_order=${id}`) : Promise.resolve({ data: [] })
      ];
      const [woRes, progRes, billRes] = await Promise.all(promises);
      setWorkOrder(woRes.data);
      setProgressRecords(progRes.data.results || progRes.data || []);
      setBills(billRes.data.results || billRes.data || []);
    } catch (err) {
      toast.error('Failed to load details');
    } finally {
      setLoading(false);
    }
  };

  const handleProgressSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/subcontractors/work-progress/', {
        ...progressForm,
        work_order: id
      });
      toast.success('Progress recorded successfully');
      setShowProgressModal(false);
      setProgressForm({ ...progressForm, submitted_quantity: '', measurement_description: '', remarks: '' });
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.detail || err.response?.data?.work_order?.[0] || 'Failed to record progress');
    }
  };

  const handleBillSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/subcontractors/bills/', {
        ...billForm,
        work_order: id,
        project: workOrder.project,
        subcontractor: workOrder.subcontractor,
        rate: workOrder.rate
      });
      toast.success('Bill created successfully');
      setShowBillModal(false);
      setBillForm({ ...billForm, bill_quantity: '' });
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.bill_quantity?.[0] || err.response?.data?.detail || 'Failed to create bill');
    }
  };

  if (loading) return <div className="p-4 text-center">Loading...</div>;
  if (!workOrder) return <div className="p-4 text-center">Work order not found.</div>;

  const fmt = (val) => Number(val || 0).toLocaleString('en-IN', {minimumFractionDigits: 2});

  return (
    <div>
      <div className="d-flex align-items-center mb-4 gap-3">
        <button className="btn btn-light" onClick={() => navigate(-1)}><FiArrowLeft /></button>
        <h2 className="fw-bold mb-0">Work Order: {workOrder.work_order_number}</h2>
        <span className={`badge ${workOrder.status === 'Issued' ? 'bg-primary' : workOrder.status === 'In Progress' ? 'bg-info text-dark' : 'bg-secondary'}`}>
          {workOrder.status}
        </span>
      </div>

      <div className="row g-4 mb-4">
        {/* Info Card */}
        <div className="col-lg-8">
          <div className="card h-100 border-0 shadow-sm">
            <div className="card-header bg-white border-bottom py-3">
              <h5 className="mb-0 fw-bold">Work Details</h5>
            </div>
            <div className="card-body">
              <div className="row g-3">
                <div className="col-md-6">
                  <div className="text-muted small">Project</div>
                  <div className="fw-semibold">{workOrder.project_name}</div>
                </div>
                <div className="col-md-6">
                  <div className="text-muted small">Subcontractor</div>
                  <div className="fw-semibold">{workOrder.subcontractor_name}</div>
                </div>
                <div className="col-md-6">
                  <div className="text-muted small">BOQ Item</div>
                  <div className="fw-semibold">{workOrder.boq_item_details || 'N/A'}</div>
                </div>
                <div className="col-md-6">
                  <div className="text-muted small">Planned Completion</div>
                  <div className="fw-semibold">{workOrder.planned_completion_date || 'N/A'}</div>
                </div>
                <div className="col-md-6">
                  <div className="text-muted small">Work Area</div>
                  <div className="fw-semibold">{workOrder.work_area || 'N/A'}</div>
                </div>
                <div className="col-md-6">
                  {/* Spacing/alignment */}
                </div>
                <div className="col-12">
                  <div className="text-muted small">Description</div>
                  <div>{workOrder.work_description}</div>
                </div>
                
                <hr className="my-2" />
                
                <div className="col-md-4">
                  <div className="text-muted small">Contract Quantity</div>
                  <div className="fs-5 fw-bold">{fmt(workOrder.contract_quantity)} <span className="fs-6 text-muted">{workOrder.unit}</span></div>
                </div>
                <div className="col-md-4">
                  <div className="text-muted small">Rate</div>
                  <div className="fs-5 fw-bold text-success">₹{fmt(workOrder.rate)}</div>
                </div>
                <div className="col-md-4">
                  <div className="text-muted small">Contract Value</div>
                  <div className="fs-5 fw-bold text-primary">₹{fmt(workOrder.contract_value)}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Progress Summary Card */}
        <div className="col-lg-4">
          <div className="card h-100 border-0 shadow-sm">
            <div className="card-header bg-white border-bottom py-3">
              <h5 className="mb-0 fw-bold">Progress Summary</h5>
            </div>
            <div className="card-body">
              <div className="mb-4">
                <div className="d-flex justify-content-between mb-1">
                  <span className="fw-semibold">Overall Progress</span>
                  <span className="fw-bold text-primary">{workOrder.progress_percentage}%</span>
                </div>
                <div className="progress" style={{ height: '10px' }}>
                  <div className="progress-bar bg-primary" style={{ width: `${workOrder.progress_percentage}%` }}></div>
                </div>
              </div>
              
              <div className="d-flex justify-content-between mb-2 pb-2 border-bottom">
                <span className="text-muted">Contract Qty:</span>
                <span className="fw-semibold">{fmt(workOrder.contract_quantity)} {workOrder.unit}</span>
              </div>
              <div className="d-flex justify-content-between mb-2 pb-2 border-bottom">
                <span className="text-muted">Completed Qty:</span>
                <span className="fw-semibold text-primary">{fmt(workOrder.submitted_quantity_total)} {workOrder.unit}</span>
              </div>
              <div className="d-flex justify-content-between mb-2 pb-2 border-bottom">
                <span className="text-muted">Approved Qty:</span>
                <span className="fw-semibold text-success">{fmt(workOrder.approved_quantity)} {workOrder.unit}</span>
              </div>
              <div className="d-flex justify-content-between mb-2 pb-2 border-bottom">
                <span className="text-muted">Balance Qty:</span>
                <span className="fw-semibold text-warning">{fmt(workOrder.balance_quantity)} {workOrder.unit}</span>
              </div>
              <div className="d-flex justify-content-between mb-2 pb-2 border-bottom">
                <span className="text-muted">Billed Qty:</span>
                <span className="fw-semibold text-info">{fmt(workOrder.billed_quantity)} {workOrder.unit}</span>
              </div>
              <div className="d-flex justify-content-between mb-3">
                <span className="text-muted">Available to Bill:</span>
                <span className="fw-bold">{fmt(workOrder.remaining_billable_quantity)} {workOrder.unit}</span>
              </div>
              
              <div className="d-grid gap-2">
                {hasPermission('measurements.create') && (
                  <button 
                    className="btn btn-primary d-flex align-items-center justify-content-center gap-2"
                    onClick={() => setShowProgressModal(true)}
                    disabled={['Draft', 'Cancelled', 'Completed'].includes(workOrder.status) || workOrder.remaining_work_quantity <= 0}
                  >
                    <FiPlus /> Record Progress
                  </button>
                )}
                {hasPermission('subcontractor_bills.create') && (
                  <button 
                    className="btn btn-outline-success d-flex align-items-center justify-content-center gap-2"
                    onClick={() => setShowBillModal(true)}
                    disabled={['Draft', 'Cancelled'].includes(workOrder.status) || workOrder.remaining_billable_quantity <= 0}
                  >
                    <FiDollarSign /> Create Bill
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Progress History */}
      <div className="card border-0 shadow-sm mb-4">
        <div className="card-header bg-white border-bottom py-3">
          <h5 className="mb-0 fw-bold">Progress History</h5>
        </div>
        <div className="card-body p-0">
          <DataTable 
            columns={[
              { header: 'Date', accessor: 'measurement_date' },
              { header: 'Submitted Qty', accessor: (row) => fmt(row.submitted_quantity) },
              { header: 'Approved Qty', accessor: (row) => fmt(row.approved_quantity) },
              { 
                header: 'Status', 
                accessor: (row) => (
                  <span className={`badge ${row.status === 'Approved' ? 'bg-success' : row.status === 'Rejected' ? 'bg-danger' : 'bg-warning text-dark'}`}>
                    {row.status}
                  </span>
                ) 
              },
              { header: 'Submitted By', accessor: 'submitted_by_name' },
              { header: 'Remarks', accessor: 'remarks' }
            ]}
            data={progressRecords}
            loading={false}
          />
        </div>
      </div>

      {/* Bills */}
      {hasPermission('subcontractor_bills.view') && (
        <div className="card border-0 shadow-sm mb-4">
          <div className="card-header bg-white border-bottom py-3">
            <h5 className="mb-0 fw-bold">Bills</h5>
          </div>
          <div className="card-body p-0">
            <DataTable 
              columns={[
                { header: 'Bill Number', accessor: 'bill_number' },
                { header: 'Date', accessor: 'bill_date' },
                { header: 'Qty', accessor: (row) => fmt(row.bill_quantity) },
                { header: 'Basic Amount', accessor: (row) => `₹${fmt(row.basic_amount)}` },
                { header: 'Total Amount', accessor: (row) => `₹${fmt(row.total_amount)}` },
                { 
                  header: 'Status', 
                  accessor: (row) => (
                    <span className={`badge ${row.status === 'Approved' ? 'bg-success' : row.status === 'Paid' ? 'bg-info text-dark' : 'bg-secondary'}`}>
                      {row.status}
                    </span>
                  ) 
                }
              ]}
              data={bills}
              loading={false}
            />
          </div>
        </div>
      )}

      {/* Progress Modal */}
      {showProgressModal && (
        <div className="modal d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Record Work Progress</h5>
                <button type="button" className="btn-close" onClick={() => setShowProgressModal(false)}></button>
              </div>
              <form onSubmit={handleProgressSubmit}>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label">Measurement Date *</label>
                    <input type="date" className="form-control" name="measurement_date" value={progressForm.measurement_date} onChange={(e) => setProgressForm({...progressForm, measurement_date: e.target.value})} required />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Quantity Submitted *</label>
                    <div className="input-group">
                      <input type="number" step="0.01" className="form-control" value={progressForm.submitted_quantity} onChange={(e) => setProgressForm({...progressForm, submitted_quantity: e.target.value})} required min="0.01" max={workOrder.remaining_work_quantity} />
                      <span className="input-group-text">{workOrder.unit}</span>
                    </div>
                    <div className="form-text text-muted">Remaining contract qty: {fmt(workOrder.remaining_work_quantity)}</div>
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Measurement Description</label>
                    <textarea className="form-control" rows="2" value={progressForm.measurement_description} onChange={(e) => setProgressForm({...progressForm, measurement_description: e.target.value})}></textarea>
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Remarks</label>
                    <textarea className="form-control" rows="2" value={progressForm.remarks} onChange={(e) => setProgressForm({...progressForm, remarks: e.target.value})}></textarea>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowProgressModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary">Submit Progress</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Bill Modal */}
      {showBillModal && (
        <div className="modal d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Create Subcontractor Bill</h5>
                <button type="button" className="btn-close" onClick={() => setShowBillModal(false)}></button>
              </div>
              <form onSubmit={handleBillSubmit}>
                <div className="modal-body">
                  <div className="alert alert-info">
                    Available to bill: <strong>{fmt(workOrder.remaining_billable_quantity)} {workOrder.unit}</strong>
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Bill Date *</label>
                    <input type="date" className="form-control" value={billForm.bill_date} onChange={(e) => setBillForm({...billForm, bill_date: e.target.value})} required />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Bill Quantity *</label>
                    <div className="input-group">
                      <input type="number" step="0.01" className="form-control" value={billForm.bill_quantity} onChange={(e) => setBillForm({...billForm, bill_quantity: e.target.value})} required min="0.01" max={workOrder.remaining_billable_quantity} />
                      <span className="input-group-text">{workOrder.unit}</span>
                    </div>
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Tax Percentage (%)</label>
                    <input type="number" step="0.01" className="form-control" value={billForm.tax_percentage} onChange={(e) => setBillForm({...billForm, tax_percentage: e.target.value})} min="0" />
                  </div>
                  
                  {/* Dynamic calculation preview */}
                  <div className="bg-light p-3 rounded">
                    <div className="d-flex justify-content-between mb-1">
                      <span>Basic Amount:</span>
                      <span>₹{fmt(Number(billForm.bill_quantity || 0) * Number(workOrder.rate))}</span>
                    </div>
                    <div className="d-flex justify-content-between mb-1">
                      <span>Tax Amount:</span>
                      <span>₹{fmt((Number(billForm.bill_quantity || 0) * Number(workOrder.rate)) * (Number(billForm.tax_percentage || 0) / 100))}</span>
                    </div>
                    <hr className="my-2" />
                    <div className="d-flex justify-content-between fw-bold">
                      <span>Total Amount:</span>
                      <span className="text-primary">
                        ₹{fmt(
                          (Number(billForm.bill_quantity || 0) * Number(workOrder.rate)) + 
                          ((Number(billForm.bill_quantity || 0) * Number(workOrder.rate)) * (Number(billForm.tax_percentage || 0) / 100))
                        )}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowBillModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-success">Create Bill</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkOrderDetail;
