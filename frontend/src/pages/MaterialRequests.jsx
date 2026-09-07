import React, { useState, useEffect, useCallback, useRef } from 'react';
import { FiPlus, FiEye, FiEdit, FiTrash2, FiShoppingCart, FiCalendar, FiX } from 'react-icons/fi';
import api from '../services/api';
import StatusBadge from '../components/StatusBadge';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import BackToWorkCenter from '../components/BackToWorkCenter';
import { useAuth } from '../context/AuthContext';

const MaterialRequests = () => {
  const { hasPermission } = useAuth();
  const [requests, setRequests] = useState([]);
  const [projects, setProjects] = useState([]);
  const [boqs, setBoqs] = useState([]);
  const [boqItems, setBoqItems] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [editMode, setEditMode] = useState(null); // stores ID if editing
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ project: '', boq: '', request_date: new Date().toISOString().split('T')[0] });
  const [projectLocation, setProjectLocation] = useState('');
  const [requestNumber, setRequestNumber] = useState('');
  const [projectSearchName, setProjectSearchName] = useState('');
  const [showProjectDropdown, setShowProjectDropdown] = useState(false);
  const [formItems, setFormItems] = useState([{ id: null, boq_item: '', material: '', requested_quantity: '', unit: '', remarks: '' }]);
  const navigate = useNavigate();

  // Combobox Filter & Pagination State
  const [filterSearchText, setFilterSearchText] = useState('');
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const filterComboboxRef = useRef(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedFilterProjectId, setSelectedFilterProjectId] = useState('');
  const [selectedDate, setSelectedDate] = useState('');

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (filterComboboxRef.current && !filterComboboxRef.current.contains(event.target)) {
        setShowFilterDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);
      const [mrRes, projRes, matRes] = await Promise.all([
        api.get('/procurement/material-requests/'),
        api.get('/projects/projects/all/'),
        api.get('/inventory/materials/')
      ]);
      setRequests(mrRes.data.results || mrRes.data);
      setProjects(projRes.data.results || projRes.data);
      setMaterials(matRes.data.results || matRes.data);
    } catch { toast.error('Failed to load.'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleProjectChange = async (projectId) => {
    setForm(f => ({ ...f, project: projectId, boq: '' }));
    setBoqs([]);
    setBoqItems([]);
    setProjectLocation('');
    if (!editMode) setRequestNumber('');
    if (projectId) {
      const selectedProject = projects.find(p => String(p.id) === String(projectId));
      if (selectedProject) {
        setProjectLocation(selectedProject.project_location || '');
      }
      try {
        if (!editMode) {
          const nrRes = await api.get(`/procurement/material-requests/next-request-number/?project=${projectId}`);
          setRequestNumber(nrRes.data.next_request_number);
        }
      } catch (err) {
        toast.error('Failed to fetch next request number.');
      }
      const res = await api.get(`/projects/boqs/?project=${projectId}`);
      setBoqs(res.data.results || res.data);
    }
  };

  const handleProjectSearchChange = (e) => {
    const val = e.target.value;
    setProjectSearchName(val);
    setShowProjectDropdown(true);
    
    const matchedProject = projects.find(p => p.project_name.toLowerCase() === val.toLowerCase());
    if (matchedProject) {
      if (form.project !== matchedProject.id) {
        handleProjectChange(matchedProject.id);
      }
    } else if (form.project) {
      handleProjectChange('');
    }
  };

  const handleBOQChange = async (boqId) => {
    setForm(f => ({ ...f, boq: boqId }));
    setBoqItems([]);
    if (boqId) {
      const res = await api.get(`/projects/boq-items/?boq=${boqId}`);
      setBoqItems(res.data.results || res.data);
    }
  };

  const handleItemBOQChange = (idx, boqItemId) => {
    const item = boqItems.find(i => String(i.id) === String(boqItemId));
    const newItems = [...formItems];
    newItems[idx] = { ...newItems[idx], boq_item: boqItemId, material: item?.material || '', unit: item?.unit || '', balance: item?.balance_quantity };
    if (item) {
      newItems[idx].material = item.material;
      newItems[idx].unit = item.unit;
      newItems[idx].balance = item.balance_quantity;
    }
    setFormItems(newItems);
  };

  const updateItem = (idx, key, val) => {
    const newItems = [...formItems];
    newItems[idx][key] = val;
    setFormItems(newItems);
  };

  const addItem = () => setFormItems(f => [...f, { id: null, boq_item: '', material: '', requested_quantity: '', unit: '', remarks: '' }]);
  const removeItem = (idx) => setFormItems(f => f.filter((_, i) => i !== idx));

  const openNewModal = () => {
    setEditMode(null);
    setForm({ project: '', boq: '', request_date: new Date().toISOString().split('T')[0] });
    setProjectSearchName('');
    setRequestNumber('');
    setProjectLocation('');
    setFormItems([{ id: null, boq_item: '', material: '', requested_quantity: '', unit: '', remarks: '' }]);
    setBoqs([]);
    setBoqItems([]);
    setShowModal(true);
  };

  const handleEdit = async (r) => {
    setEditMode(r.id);
    setForm({
      project: r.project,
      boq: r.boq || '',
      request_date: r.request_date
    });
    setProjectSearchName(r.project_name);
    setRequestNumber(r.request_number);
    setProjectLocation(r.location_details || '');
    
    // Fetch BOQs and Items
    if (r.project) {
      const res = await api.get(`/projects/boqs/?project=${r.project}`);
      setBoqs(res.data.results || res.data);
    }
    if (r.boq) {
      const res = await api.get(`/projects/boq-items/?boq=${r.boq}`);
      setBoqItems(res.data.results || res.data);
    }

    setFormItems(r.items.map(i => ({
      id: i.id,
      boq_item: i.boq_item || '',
      material: i.material || '',
      requested_quantity: i.requested_quantity,
      unit: i.unit,
      remarks: i.remarks || '',
      balance: i.boq_item_detail?.balance_quantity || 0
    })));
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this material request?')) return;
    try {
      await api.delete(`/procurement/material-requests/${id}/`);
      toast.success('Material request deleted.');
      fetchAll();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to delete request.');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      for (const item of formItems) {
        if (!item.boq_item) throw new Error('BOQ Item is required.');
        if (!item.requested_quantity || Number(item.requested_quantity) <= 0) throw new Error('Quantity must be greater than 0.');
        if (!item.unit) throw new Error('Unit is required.');
      }

      const payload = { ...form };

      let mrId;
      if (editMode) {
        const mrRes = await api.put(`/procurement/material-requests/${editMode}/`, payload);
        mrId = editMode;
        
        // Handle items
        const existingItemsRes = await api.get(`/procurement/material-request-items/?material_request=${mrId}`);
        const existingItems = existingItemsRes.data.results || existingItemsRes.data;
        
        const currentItemIds = formItems.map(i => i.id).filter(i => i);
        const toDelete = existingItems.filter(ei => !currentItemIds.includes(ei.id));
        for (const d of toDelete) {
          await api.delete(`/procurement/material-request-items/${d.id}/`);
        }
        for (const item of formItems) {
          if (item.id) {
            await api.put(`/procurement/material-request-items/${item.id}/`, { ...item, material_request: mrId });
          } else {
            await api.post(`/procurement/material-request-items/`, { ...item, material_request: mrId });
          }
        }
        toast.success('Material Request updated.');
      } else {
        const mrRes = await api.post('/procurement/material-requests/', payload);
        mrId = mrRes.data.id;
        try {
          await Promise.all(formItems.map(item =>
            api.post('/procurement/material-request-items/', { ...item, material_request: mrId })
          ));
        } catch (itemErr) {
          await api.delete(`/procurement/material-requests/${mrId}/`);
          throw itemErr;
        }
        toast.success('Material Request created.');
      }

      setShowModal(false);
      fetchAll();
    } catch (err) {
      let msg = err.message || 'Failed to save.';
      if (err.response?.data) {
        if (err.response.data.error) msg = err.response.data.error;
        else if (typeof err.response.data === 'object' && !Array.isArray(err.response.data)) {
          msg = Object.entries(err.response.data)
            .map(([f, e]) => `${f.replace(/_/g, ' ')}: ${Array.isArray(e) ? e.join(', ') : e}`)
            .join(' | ');
        } else msg = String(err.response.data);
      }
      toast.error(msg);
    } finally { setSaving(false); }
  };

  const handleFilterSearchChange = (e) => {
    const val = e.target.value;
    setFilterSearchText(val);
    setShowFilterDropdown(true);
    
    if (val.trim() === '') {
      setSelectedFilterProjectId('');
      setCurrentPage(1);
    }
  };

  const handleSelectFilterProject = (project) => {
    setFilterSearchText(project.project_name);
    setSelectedFilterProjectId(project.id);
    setShowFilterDropdown(false);
    setCurrentPage(1);
  };

  const handleDateChange = (e) => {
    setSelectedDate(e.target.value);
    setCurrentPage(1);
  };

  const handleClearFilters = () => {
    setFilterSearchText('');
    setSelectedFilterProjectId('');
    setSelectedDate('');
    setCurrentPage(1);
  };

  const filteredRequests = requests.filter(r => {
    const matchesProject = selectedFilterProjectId 
      ? String(r.project) === String(selectedFilterProjectId)
      : true;
    const matchesDate = selectedDate 
      ? r.request_date === selectedDate 
      : true;
    return matchesProject && matchesDate;
  });

  const pageSize = 10;
  const totalPages = Math.ceil(filteredRequests.length / pageSize) || 1;
  const validCurrentPage = currentPage > totalPages ? Math.max(totalPages, 1) : currentPage;
  const startIndex = (validCurrentPage - 1) * pageSize;
  const paginatedRequests = filteredRequests.slice(startIndex, startIndex + pageSize);

  const PaginationControls = () => {
    if (totalPages <= 1) return null;
    return (
      <div className="d-flex justify-content-between align-items-center p-3 border-top bg-white">
        <span className="text-muted small">Showing page {validCurrentPage} of {totalPages}</span>
        <nav>
          <ul className="pagination pagination-sm mb-0">
            <li className={`page-item ${validCurrentPage === 1 ? 'disabled' : ''}`}>
              <button type="button" className="page-link shadow-none" onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}>Previous</button>
            </li>
            {[...Array(totalPages)].map((_, idx) => (
              <li key={idx} className={`page-item ${validCurrentPage === idx + 1 ? 'active' : ''}`}>
                <button type="button" className="page-link shadow-none" onClick={() => setCurrentPage(idx + 1)}>{idx + 1}</button>
              </li>
            ))}
            <li className={`page-item ${validCurrentPage === totalPages ? 'disabled' : ''}`}>
              <button type="button" className="page-link shadow-none" onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}>Next</button>
            </li>
          </ul>
        </nav>
      </div>
    );
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="fw-bold mb-0">Material Requests</h2>
        <div className="d-flex align-items-center gap-2 flex-wrap">
          <BackToWorkCenter />

          <div style={{ width: '260px', position: 'relative' }} ref={filterComboboxRef}>
            <input
              type="text"
              className="form-control"
              placeholder="Search by Project Name..."
              value={filterSearchText}
              onChange={handleFilterSearchChange}
              onFocus={() => setShowFilterDropdown(true)}
            />
            {showFilterDropdown && (
              <ul className="list-group position-absolute w-100 shadow-sm" style={{ zIndex: 1000, maxHeight: '200px', overflowY: 'auto' }}>
                {projects.filter(p => p.project_name.toLowerCase().includes(filterSearchText.toLowerCase())).length > 0 ? (
                  projects
                    .filter(p => p.project_name.toLowerCase().includes(filterSearchText.toLowerCase()))
                    .map(p => (
                      <li
                        key={p.id}
                        className="list-group-item list-group-item-action"
                        style={{ cursor: 'pointer' }}
                        onClick={() => handleSelectFilterProject(p)}
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

          <div className="input-group" style={{ width: '200px' }}>
            <span className="input-group-text bg-white">
              <FiCalendar className="text-muted" />
            </span>
            <input 
              type="date" 
              className="form-control border-start-0 ps-0" 
              placeholder="Filter by Date"
              title="Filter by Date"
              value={selectedDate}
              onChange={handleDateChange}
            />
          </div>

          {(filterSearchText || selectedDate) && (
            <button 
              type="button"
              className="btn btn-link text-danger p-0 text-decoration-none small d-flex align-items-center gap-1 ms-1"
              onClick={handleClearFilters}
            >
              <FiX /> Clear Filters
            </button>
          )}

          {hasPermission('material_requests.create') && (
            <button className="btn btn-primary d-flex align-items-center gap-2" onClick={openNewModal}>
              <FiPlus /> New Request
            </button>
          )}
        </div>
      </div>

      <div className="card border-0">
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead>
                <tr>
                  <th>S.No</th>
                  <th>Request No.</th>
                  <th>Project</th>
                  <th>Location Details</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th className="text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? <tr><td colSpan={7} className="text-center py-5 text-muted">Loading...</td></tr>
                  : paginatedRequests.length === 0 ? <tr><td colSpan={7} className="text-center py-5 text-muted">No requests found.</td></tr>
                  : paginatedRequests.map((r, index) => (
                    <tr key={r.id}>
                      <td><span className="fw-medium text-muted">{(validCurrentPage - 1) * pageSize + index + 1}</span></td>
                      <td className="fw-semibold">{r.request_number}</td>
                      <td>{r.project_name}</td>
                      <td>{r.location_details || '—'}</td>
                      <td>{r.request_date}</td>
                      <td><StatusBadge status={r.status} /></td>
                      <td>
                        <div className="d-flex justify-content-center gap-3">
                          <button 
                            className="btn btn-sm btn-light text-primary border-0 p-1" 
                            title="View"
                            onClick={() => { setSelectedRequest(r); setShowViewModal(true); }}
                          >
                            <FiEye size={18} />
                          </button>
                          {hasPermission('material_requests.edit') && (
                            <button 
                              className="btn btn-sm btn-light text-secondary border-0 p-1" 
                              title="Edit"
                              onClick={() => handleEdit(r)}
                              disabled={!['Draft', 'Pending'].includes(r.status)}
                            >
                              <FiEdit size={18} />
                            </button>
                          )}
                          {r.status === 'Approved' && hasPermission('purchase_orders.create') && (
                            <button 
                              className="btn btn-sm btn-light text-success border-0 p-1" 
                              title="Create PO"
                              onClick={() => navigate('/procurement/orders', { state: { preselect_mr: r } })}
                            >
                              <FiShoppingCart size={18} />
                            </button>
                          )}
                          {(hasPermission('material_requests.edit') || hasPermission('material_requests.create')) && r.status === 'Draft' && (
                            <button 
                              className="btn btn-sm btn-light text-danger border-0 p-1" 
                              title="Delete"
                              onClick={() => handleDelete(r.id)}
                            >
                              <FiTrash2 size={18} />
                            </button>
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


      {showModal && (
        <div className="modal d-block" style={{ background: 'rgba(0,0,0,0.5)', zIndex: 1055 }}>
          <div className="modal-dialog modal-xl">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title fw-bold">{editMode ? 'Edit Material Request' : 'New Material Request'}</h5>
                <button className="btn-close" onClick={() => setShowModal(false)} />
              </div>
              <form onSubmit={handleSubmit}>
                <div className="modal-body">
                  <div className="row g-3 mb-3">
                    <div className="col-md-3">
                      <label className="form-label fw-semibold">Request Number *</label>
                      <input type="text" className="form-control" disabled value={requestNumber} placeholder="Auto-generated" />
                    </div>
                    <div className="col-md-3">
                      <label className="form-label fw-semibold">Project *</label>
                      <div className="position-relative">
                        <input 
                          type="text" 
                          className="form-control" 
                          required 
                          value={projectSearchName} 
                          onChange={handleProjectSearchChange} 
                          onFocus={() => setShowProjectDropdown(true)}
                          onBlur={() => setTimeout(() => setShowProjectDropdown(false), 200)}
                          placeholder="Search Project Name..." 
                        />
                        {showProjectDropdown && (
                          <ul className="list-group position-absolute w-100 mt-1 shadow-sm" style={{ zIndex: 1000, maxHeight: '200px', overflowY: 'auto' }}>
                            {projects
                              .filter(p => p.project_name.toLowerCase().includes(projectSearchName.toLowerCase()))
                              .map(p => (
                                <li 
                                  key={p.id} 
                                  className="list-group-item list-group-item-action" 
                                  style={{ cursor: 'pointer' }}
                                  onMouseDown={(e) => {
                                    e.preventDefault();
                                    setProjectSearchName(p.project_name);
                                    handleProjectChange(p.id);
                                    setShowProjectDropdown(false);
                                  }}
                                >
                                  {p.project_name}
                                </li>
                            ))}
                            {projects.filter(p => p.project_name.toLowerCase().includes(projectSearchName.toLowerCase())).length === 0 && (
                              <li className="list-group-item text-muted">No projects found.</li>
                            )}
                          </ul>
                        )}
                      </div>
                    </div>
                    <div className="col-md-3">
                      <label className="form-label fw-semibold">Location Details</label>
                      <input type="text" className="form-control" readOnly value={projectLocation} placeholder="Auto-filled from project" />
                    </div>
                    <div className="col-md-3">
                      <label className="form-label fw-semibold">BOQ</label>
                      <select className="form-select" value={form.boq} onChange={e => handleBOQChange(e.target.value)}>
                        <option value="">Select BOQ</option>
                        {boqs.map(b => <option key={b.id} value={b.id}>{b.boq_number} - {b.title}</option>)}
                      </select>
                    </div>
                    <div className="col-md-3">
                      <label className="form-label fw-semibold">Request Date *</label>
                      <input type="date" className="form-control" required value={form.request_date} onChange={e => setForm(f => ({ ...f, request_date: e.target.value }))} />
                    </div>
                  </div>

                  <hr />
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <h6 className="fw-bold mb-0">Items</h6>
                    <button type="button" className="btn btn-sm btn-outline-primary" onClick={addItem}><FiPlus /> Add Item</button>
                  </div>
                  {formItems.map((item, idx) => (
                    <div key={idx} className="row g-2 mb-2 align-items-end border-bottom pb-2">
                      <div className="col-md-3">
                        <label className="form-label fw-semibold small">BOQ Item</label>
                        <select className="form-select form-select-sm" value={item.boq_item} onChange={e => handleItemBOQChange(idx, e.target.value)}>
                          <option value="">Select BOQ Item</option>
                          {boqItems.map(bi => <option key={bi.id} value={bi.id}>{bi.material_name} (Bal: {bi.balance_quantity})</option>)}
                        </select>
                      </div>
                      <div className="col-md-2">
                        <label className="form-label fw-semibold small">Quantity *</label>
                        <input type="number" className="form-control form-control-sm" required min="0.01" step="0.01" value={item.requested_quantity} onChange={e => updateItem(idx, 'requested_quantity', e.target.value)} />
                        {item.balance && Number(item.requested_quantity) > Number(item.balance) && (
                          <small className="text-danger">Exceeds BOQ balance ({item.balance})</small>
                        )}
                      </div>
                      <div className="col-md-2">
                        <label className="form-label fw-semibold small">Unit</label>
                        <input type="text" className="form-control form-control-sm" readOnly disabled value={item.unit} />
                      </div>
                      <div className="col-md-3">
                        <label className="form-label fw-semibold small">Remarks</label>
                        <input type="text" className="form-control form-control-sm" value={item.remarks} onChange={e => updateItem(idx, 'remarks', e.target.value)} />
                      </div>
                      <div className="col-md-1">
                        {formItems.length > 1 && <button type="button" className="btn btn-sm btn-light text-danger" onClick={() => removeItem(idx)}>✕</button>}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-light" onClick={() => setShowModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : (editMode ? 'Update Request' : 'Submit Request')}</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {showViewModal && selectedRequest && (
        <div className="modal d-block" style={{ background: 'rgba(0,0,0,0.5)', zIndex: 1055 }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title fw-bold">Request Details: {selectedRequest.request_number}</h5>
                <button className="btn-close" onClick={() => setShowViewModal(false)} />
              </div>
              <div className="modal-body">
                <div className="row mb-4">
                  <div className="col-md-6">
                    <p className="mb-1"><strong>Project:</strong> {selectedRequest.project_name}</p>
                    <p className="mb-1"><strong>Location Details:</strong> {selectedRequest.location_details || 'N/A'}</p>
                    <p className="mb-1"><strong>Request Date:</strong> {selectedRequest.request_date}</p>
                  </div>
                  <div className="col-md-6">
                    <p className="mb-1"><strong>Status:</strong> <StatusBadge status={selectedRequest.status} /></p>
                    <p className="mb-1"><strong>Requested By:</strong> {selectedRequest.requested_by_name ? selectedRequest.requested_by_name : (selectedRequest.requested_by ? `User ID: ${selectedRequest.requested_by}` : 'Site Engineer')}</p>
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
                      </tr>
                    </thead>
                    <tbody>
                      {selectedRequest.items?.map(item => (
                        <tr key={item.id}>
                          <td>{item.material_name}</td>
                          <td>{item.requested_quantity}</td>
                          <td>{item.approved_quantity || '—'}</td>
                          <td>{item.unit}</td>
                        </tr>
                      ))}
                      {!selectedRequest.items?.length && (
                        <tr><td colSpan={4} className="text-center text-muted">No items in this request.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-light" onClick={() => setShowViewModal(false)}>Close</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MaterialRequests;
