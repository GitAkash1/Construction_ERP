import React, { useState, useEffect } from 'react';
import DataTable from '../../components/DataTable';
import api from '../../services/api';
import { toast } from 'react-toastify';
import { FiCheck, FiX } from 'react-icons/fi';
import BackToWorkCenter from '../../components/BackToWorkCenter';
import { useAuth } from '../../context/AuthContext';

const MeasurementApproval = () => {
  const { hasPermission } = useAuth();
  const [activeTab, setActiveTab] = useState('Pending');
  const [measurements, setMeasurements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState('');
  
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedMeasurement, setSelectedMeasurement] = useState(null);
  
  const [approveForm, setApproveForm] = useState({ approved_quantity: '' });
  const [rejectForm, setRejectForm] = useState({ rejection_reason: '' });

  useEffect(() => {
    fetchProjects();
  }, []);

  useEffect(() => {
    fetchMeasurements();
  }, [activeTab, selectedProject]);

  const fetchProjects = async () => {
    try {
      const res = await api.get('/projects/projects/all/');
      setProjects(res.data.results || res.data);
    } catch (err) {
      toast.error('Failed to load projects');
    }
  };

  const fetchMeasurements = async () => {
    try {
      setLoading(true);
      let url = `/subcontractors/work-progress/?status=${activeTab}`;
      if (selectedProject) {
        url += `&work_order__project=${selectedProject}`;
      }
      const res = await api.get(url);
      setMeasurements(res.data.results || res.data);
    } catch (err) {
      toast.error('Failed to load measurements');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenApprove = (measurement) => {
    setSelectedMeasurement(measurement);
    setApproveForm({ approved_quantity: measurement.submitted_quantity });
    setShowApproveModal(true);
  };

  const handleOpenReject = (measurement) => {
    setSelectedMeasurement(measurement);
    setRejectForm({ rejection_reason: '' });
    setShowRejectModal(true);
  };

  const handleApprove = async (e) => {
    e.preventDefault();
    try {
      await api.post(`/subcontractors/work-progress/${selectedMeasurement.id}/approve/`, approveForm);
      toast.success('Measurement approved successfully');
      setShowApproveModal(false);
      fetchMeasurements();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to approve');
    }
  };

  const handleReject = async (e) => {
    e.preventDefault();
    try {
      await api.post(`/subcontractors/work-progress/${selectedMeasurement.id}/reject/`, rejectForm);
      toast.success('Measurement rejected');
      setShowRejectModal(false);
      fetchMeasurements();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to reject');
    }
  };

  const fmt = (val) => Number(val || 0).toLocaleString('en-IN', {minimumFractionDigits: 2});

  const columns = [
    { header: 'Date', accessor: 'measurement_date' },
    { header: 'Work Order', accessor: 'work_order_number' },
    { header: 'Project', accessor: 'project_name' },
    { header: 'Subcontractor', accessor: 'subcontractor_name' },
    { header: 'Submitted By', accessor: 'submitted_by_name' },
    { header: 'Material Name', accessor: (row) => row.material_name || '—' },
    { header: 'Submitted Qty', accessor: (row) => `${fmt(row.submitted_quantity)} ${row.work_order_unit || ''}` },
  ];

  if (activeTab === 'Approved') {
    columns.push({ header: 'Approved Qty', accessor: (row) => <span className="text-success fw-bold">{fmt(row.approved_quantity)} {row.work_order_unit || ''}</span> });
    columns.push({ header: 'Approved By', accessor: 'approved_by_name' });
  } else if (activeTab === 'Rejected') {
    columns.push({ header: 'Rejection Reason', accessor: 'rejection_reason' });
  } else {
    // Pending
    columns.push({
      header: 'Actions',
      accessor: (row) => (
        <div className="d-flex gap-2">
          {hasPermission('measurements.approve') && (
            <>
              <button className="btn btn-sm btn-success d-flex align-items-center gap-1" onClick={() => handleOpenApprove(row)}>
                <FiCheck /> Approve
              </button>
              <button className="btn btn-sm btn-danger d-flex align-items-center gap-1" onClick={() => handleOpenReject(row)}>
                <FiX /> Reject
              </button>
            </>
          )}
        </div>
      )
    });
  }

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="fw-bold mb-0">Measurement Approval</h2>
          <p className="text-muted mb-0">Review and approve subcontractor work progress</p>
        </div>
        <div className="d-flex align-items-center gap-2">
          <BackToWorkCenter />
          <div style={{ minWidth: '250px' }}>
            <select 
              className="form-select" 
              value={selectedProject} 
              onChange={(e) => setSelectedProject(e.target.value)}
            >
              <option value="">All Projects</option>
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.project_name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="card border-0 mb-4 shadow-sm">
        <div className="card-header bg-white">
          <ul className="nav nav-tabs card-header-tabs">
            {['Pending', 'Approved', 'Rejected'].map(tab => (
              <li className="nav-item" key={tab}>
                <button 
                  className={`nav-link ${activeTab === tab ? 'active fw-bold' : ''}`} 
                  onClick={() => setActiveTab(tab)}
                >
                  {tab}
                </button>
              </li>
            ))}
          </ul>
        </div>
        <div className="card-body p-0">
          <DataTable 
            columns={columns}
            data={measurements}
            loading={loading}
          />
        </div>
      </div>

      {/* Approve Modal */}
      {showApproveModal && selectedMeasurement && (
        <div className="modal d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Approve Measurement</h5>
                <button type="button" className="btn-close" onClick={() => setShowApproveModal(false)}></button>
              </div>
              <form onSubmit={handleApprove}>
                <div className="modal-body">
                  <div className="mb-3">
                    <p className="mb-1"><strong>Work Order:</strong> {selectedMeasurement.work_order_number}</p>
                    <p className="mb-1"><strong>Submitted Qty:</strong> {fmt(selectedMeasurement.submitted_quantity)} {selectedMeasurement.work_order_unit}</p>
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Approved Quantity *</label>
                    <input 
                      type="number" 
                      step="0.01" 
                      className="form-control" 
                      value={approveForm.approved_quantity} 
                      onChange={(e) => setApproveForm({ approved_quantity: e.target.value })} 
                      required 
                      min="0.01"
                      max={selectedMeasurement.submitted_quantity}
                    />
                    <div className="form-text text-muted">
                      You can approve partial quantity if needed. (Max: {fmt(selectedMeasurement.submitted_quantity)} {selectedMeasurement.work_order_unit})
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowApproveModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-success">Approve</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && selectedMeasurement && (
        <div className="modal d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Reject Measurement</h5>
                <button type="button" className="btn-close" onClick={() => setShowRejectModal(false)}></button>
              </div>
              <form onSubmit={handleReject}>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label">Rejection Reason *</label>
                    <textarea 
                      className="form-control" 
                      rows="3"
                      value={rejectForm.rejection_reason} 
                      onChange={(e) => setRejectForm({ rejection_reason: e.target.value })} 
                      required 
                    ></textarea>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowRejectModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-danger">Reject</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MeasurementApproval;
