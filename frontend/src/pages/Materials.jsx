import React, { useState, useEffect, useCallback, useRef } from 'react';
import { FiCheckCircle, FiXCircle, FiEye, FiCornerUpLeft, FiCalendar, FiX } from 'react-icons/fi';
import api from '../services/api';
import StatusBadge from '../components/StatusBadge';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';

const Materials = () => {
  const [requests, setRequests] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedRequest, setSelectedRequest] = useState(null);
  
  // Combobox and Pagination State
  const [projectSearchText, setProjectSearchText] = useState('');
  const [showProjectDropdown, setShowProjectDropdown] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const recordsPerPage = 10;
  const comboboxRef = useRef(null);

  const { hasPermission } = useAuth();

  const fetchAll = useCallback(async (projectId = '', date = '') => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (projectId) params.append('project', projectId);
      if (date) params.append('request_date', date);
      
      const url = params.toString() ? `/procurement/material-requests/?${params.toString()}` : '/procurement/material-requests/';
      const mrRes = await api.get(url);
      setRequests(mrRes.data.results || mrRes.data);
      
      if (!projects.length) {
        const projRes = await api.get('/projects/projects/all/');
        setProjects(projRes.data.results || projRes.data);
      }
    } catch { 
      toast.error('Failed to load requests.'); 
    } finally { 
      setLoading(false); 
    }
  }, [projects.length]);

  useEffect(() => { fetchAll(selectedProject, selectedDate); }, [fetchAll, selectedProject, selectedDate]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (comboboxRef.current && !comboboxRef.current.contains(event.target)) {
        setShowProjectDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleProjectSearchChange = (e) => {
    const val = e.target.value;
    setProjectSearchText(val);
    setShowProjectDropdown(true);
    
    if (val.trim() === '') {
      setSelectedProject('');
      setCurrentPage(1);
    }
  };

  const handleSelectProject = (project) => {
    setSelectedProject(project.id);
    setProjectSearchText(project.project_name);
    setShowProjectDropdown(false);
    setCurrentPage(1);
  };

  // Pagination Logic
  const totalPages = Math.ceil(requests.length / recordsPerPage) || 1;
  const validCurrentPage = currentPage > totalPages ? Math.max(totalPages, 1) : currentPage;
  const indexOfLastRecord = validCurrentPage * recordsPerPage;
  const indexOfFirstRecord = indexOfLastRecord - recordsPerPage;
  const currentRecords = requests.slice(indexOfFirstRecord, indexOfLastRecord);

  const handlePageChange = (pageNumber) => {
    setCurrentPage(Math.max(1, Math.min(pageNumber, totalPages)));
  };

  const handleApprove = async (id) => {
    if (!window.confirm('Are you sure you want to approve this request? It will update project stock.')) return;
    try {
      await api.post(`/procurement/material-requests/${id}/approve/`);
      toast.success('Request approved successfully.');
      fetchAll(selectedProject);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to approve request. Please check stock balances.');
    }
  };

  const handleReject = async (id) => {
    if (!window.confirm('Are you sure you want to reject this request?')) return;
    try {
      await api.post(`/procurement/material-requests/${id}/reject/`);
      toast.warning('Request rejected.');
      fetchAll(selectedProject);
    } catch { 
      toast.error('Failed to reject request.'); 
    }
  };

  const handleUndo = async (id) => {
    if (!window.confirm('Are you sure you want to undo this action?')) return;
    try {
      await api.post(`/procurement/material-requests/${id}/undo/`);
      toast.success('Action undone successfully.');
      fetchAll(selectedProject);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to undo action.');
    }
  };

  const PaginationControls = () => {
    if (totalPages <= 1) return null;
    return (
      <div className="d-flex flex-column flex-sm-row justify-content-between align-items-center p-3 border-top bg-white gap-2">
        <span className="text-muted small fw-medium text-center text-sm-start">Showing page {validCurrentPage} of {totalPages}</span>
        <nav className="overflow-auto w-100 w-sm-auto d-flex justify-content-center">
          <ul className="pagination pagination-sm mb-0 shadow-sm flex-wrap justify-content-center">
            <li className={`page-item ${validCurrentPage === 1 ? 'disabled' : ''}`}>
              <button 
                type="button"
                className="page-link rounded-start-3" 
                onClick={() => handlePageChange(validCurrentPage - 1)}
                disabled={validCurrentPage === 1}
              >
                Previous
              </button>
            </li>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
              <li key={page} className={`page-item ${validCurrentPage === page ? 'active' : ''}`}>
                <button 
                  type="button"
                  className="page-link" 
                  onClick={() => handlePageChange(page)}
                >
                  {page}
                </button>
              </li>
            ))}
            <li className={`page-item ${validCurrentPage === totalPages ? 'disabled' : ''}`}>
              <button 
                type="button"
                className="page-link rounded-end-3" 
                onClick={() => handlePageChange(validCurrentPage + 1)}
                disabled={validCurrentPage === totalPages}
              >
                Next
              </button>
            </li>
          </ul>
        </nav>
      </div>
    );
  };

  return (
    <div>
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center mb-4 gap-3">
        <h2 className="fw-bold mb-0">Material Requests Approval</h2>
        <div className="d-flex flex-column flex-sm-row align-items-stretch align-items-sm-center gap-2 gap-sm-3 flex-wrap w-100 w-md-auto">
          {/* Project Search Combobox */}
          <div className="flex-grow-1" style={{ minWidth: '200px', maxWidth: '100%', position: 'relative' }} ref={comboboxRef}>
            <input
              type="text"
              className="form-control"
              placeholder="Search by Project Name..."
              value={projectSearchText}
              onChange={handleProjectSearchChange}
              onFocus={() => setShowProjectDropdown(true)}
            />
            {showProjectDropdown && (
              <ul className="list-group position-absolute w-100 shadow-sm" style={{ zIndex: 1000, maxHeight: '200px', overflowY: 'auto' }}>
                {projects.filter(p => p.project_name.toLowerCase().includes(projectSearchText.toLowerCase())).length > 0 ? (
                  projects
                    .filter(p => p.project_name.toLowerCase().includes(projectSearchText.toLowerCase()))
                    .map(p => (
                      <li
                        key={p.id}
                        className="list-group-item list-group-item-action"
                        style={{ cursor: 'pointer' }}
                        onClick={() => handleSelectProject(p)}
                      >
                        {p.project_name}
                      </li>
                    ))
                ) : (
                  <li className="list-group-item text-muted">No projects found</li>
                )}
              </ul>
            )}
          </div>

          {/* Date Filter Input */}
          <div className="input-group flex-grow-1 flex-sm-grow-0" style={{ minWidth: '180px' }}>
            <span className="input-group-text bg-white">
              <FiCalendar className="text-muted" />
            </span>
            <input 
              type="date" 
              className="form-control border-start-0 ps-0" 
              placeholder="Search by Date"
              title="Search by Date"
              value={selectedDate}
              onChange={(e) => {
                setSelectedDate(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>

          {/* Clear Filters Button */}
          {(selectedProject || projectSearchText || selectedDate) && (
            <button 
              type="button"
              className="btn btn-link text-danger p-0 text-decoration-none small d-flex align-items-center justify-content-center gap-1"
              onClick={() => {
                setSelectedProject('');
                setProjectSearchText('');
                setSelectedDate('');
                setCurrentPage(1);
              }}
            >
              <FiX /> Clear Filters
            </button>
          )}
        </div>
      </div>

      <div className="card border-0 shadow-sm rounded-4 overflow-hidden bg-white mb-4">
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th>S.NO</th>
                  <th>Date</th>
                  <th>Request No.</th>
                  <th>Project</th>
                  <th>Requested By</th>
                  <th>Status</th>
                  <th>Action Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={8} className="text-center py-5 text-muted">Loading...</td></tr>
                ) : currentRecords.length === 0 ? (
                  <tr><td colSpan={8} className="text-center py-5 text-muted">No material requests found.</td></tr>
                ) : currentRecords.map((r, index) => (
                  <tr key={r.id}>
                    <td><span className="fw-medium text-muted">{(validCurrentPage - 1) * recordsPerPage + index + 1}</span></td>
                    <td className="text-nowrap">{r.request_date}</td>
                    <td>
                      <div className="d-flex align-items-center gap-2 flex-wrap">
                        <span className="fw-semibold text-dark">{r.request_number}</span>
                        <button 
                          type="button"
                          className="btn btn-sm btn-link text-primary p-0 text-decoration-none d-inline-flex align-items-center gap-1 shadow-none"
                          onClick={() => setSelectedRequest(r)}
                          title="View Details"
                        >
                          <FiEye size={14} /> View Items
                        </button>
                      </div>
                    </td>
                    <td><span className="fw-medium text-dark">{r.project_name}</span></td>
                    <td><span className="text-muted">{r.requested_by_name ? r.requested_by_name : (r.requested_by ? `User ID: ${r.requested_by}` : 'Site Engineer')}</span></td>
                    <td><StatusBadge status={r.status} /></td>
                    <td className="text-muted small">{r.action_date ? `${r.action_date} by ${r.approved_by_name || 'Admin'}` : '—'}</td>
                    <td>
                      <div className="d-flex align-items-center gap-2 flex-wrap">
                        {hasPermission('material_requests.approve') && (
                          <>
                            {['Draft', 'Pending'].includes(r.status) && (
                              <>
                                <button type="button" className="btn btn-sm btn-success d-inline-flex align-items-center gap-1 shadow-sm rounded-2" onClick={() => handleApprove(r.id)}>
                                  <FiCheckCircle /> Approve
                                </button>
                                <button type="button" className="btn btn-sm btn-danger d-inline-flex align-items-center gap-1 shadow-sm rounded-2" onClick={() => handleReject(r.id)}>
                                  <FiXCircle /> Reject
                                </button>
                              </>
                            )}
                            {r.status === 'Rejected' && (
                              <button type="button" className="btn btn-sm btn-secondary d-inline-flex align-items-center gap-1 shadow-sm rounded-2" onClick={() => handleUndo(r.id)}>
                                <FiCornerUpLeft /> Undo
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <PaginationControls />
        </div>
      </div>

      {selectedRequest && (
        <div className="modal d-block" style={{ background: 'rgba(0,0,0,0.5)', zIndex: 1055 }}>
          <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title fw-bold">Request Details: {selectedRequest.request_number}</h5>
                <button className="btn-close" onClick={() => setSelectedRequest(null)} />
              </div>
              <div className="modal-body">
                <div className="row mb-4">
                  <div className="col-md-6">
                    <p className="mb-1"><strong>Project:</strong> {selectedRequest.project_name}</p>
                    <p className="mb-1"><strong>Site:</strong> {selectedRequest.site_name || 'N/A'}</p>
                    <p className="mb-1"><strong>Date:</strong> {selectedRequest.request_date}</p>
                  </div>
                  <div className="col-md-6">
                    <p className="mb-1"><strong>Status:</strong> <StatusBadge status={selectedRequest.status} /></p>
                    <p className="mb-1"><strong>Remarks:</strong> {selectedRequest.remarks || 'None'}</p>
                  </div>
                </div>
                
                <h6 className="fw-bold mb-3">Requested Materials</h6>
                <div className="table-responsive">
                  <table className="table table-bordered table-sm">
                    <thead className="table-light">
                      <tr>
                        <th>Material</th>
                        <th>Requested Qty</th>
                        <th>Approved Qty</th>
                        <th>Unit</th>
                        <th>BOQ Balance (Before)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedRequest.items?.map(item => (
                        <tr key={item.id}>
                          <td>{item.material_name}</td>
                          <td>{item.requested_quantity}</td>
                          <td>{item.approved_quantity || '—'}</td>
                          <td>{item.unit}</td>
                          <td>{item.boq_item_detail ? item.boq_item_detail.balance_quantity : 'N/A'}</td>
                        </tr>
                      ))}
                      {!selectedRequest.items?.length && (
                        <tr><td colSpan={5} className="text-center text-muted">No items in this request.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-light" onClick={() => setSelectedRequest(null)}>Close</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Materials;
