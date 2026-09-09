import React, { useState, useEffect, useCallback, useRef } from 'react';
import { FiPlus } from 'react-icons/fi';
import api from '../services/api';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';
import BackToWorkCenter from '../components/BackToWorkCenter';

const MaterialReceipts = () => {
  const [receipts, setReceipts] = useState([]);
  const { hasPermission } = useAuth();
  const [pos, setPos] = useState([]);
  const [poItems, setPoItems] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ purchase_order: '', project: '', location_details: '', receipt_date: new Date().toISOString().split('T')[0], supplier: '', remarks: '' });
  const [receiptItems, setReceiptItems] = useState([]);

  // States for viewing GRN details
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [viewGrn, setViewGrn] = useState(null);
  const [viewPoItems, setViewPoItems] = useState([]);
  const [viewLoading, setViewLoading] = useState(false);
  const [viewError, setViewError] = useState(null);

  // Pagination & Combobox State
  const [currentPage, setCurrentPage] = useState(1);
  const [projectSearchText, setProjectSearchText] = useState('');
  const [showProjectDropdown, setShowProjectDropdown] = useState(false);
  const projectComboboxRef = useRef(null);

  // Table Filter State
  const [tableProjectSearch, setTableProjectSearch] = useState('');
  const [showTableProjectDropdown, setShowTableProjectDropdown] = useState(false);
  const [selectedTableProject, setSelectedTableProject] = useState(null);
  const tableProjectComboboxRef = useRef(null);
  const [tableDateFilter, setTableDateFilter] = useState('');

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (projectComboboxRef.current && !projectComboboxRef.current.contains(event.target)) {
        setShowProjectDropdown(false);
      }
      if (tableProjectComboboxRef.current && !tableProjectComboboxRef.current.contains(event.target)) {
        setShowTableProjectDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);
      const [rRes, projRes] = await Promise.all([
        api.get('/procurement/goods-receipts/'),
        api.get('/projects/projects/all/'),
      ]);
      setReceipts(rRes.data.results || rRes.data);
      setProjects(projRes.data.results || projRes.data);
    } catch { toast.error('Failed to load.'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleProjectChange = async (projectId) => {
    const selectedProj = projects.find(p => String(p.id) === String(projectId));
    setForm(f => ({ 
      ...f, 
      project: projectId, 
      purchase_order: '', 
      location_details: selectedProj ? selectedProj.project_location : '' 
    }));
    setPoItems([]);
    setReceiptItems([]);
    if (projectId) {
      const res = await api.get(`/procurement/purchase-orders/?project=${projectId}`);
      const allPos = res.data.results || res.data;
      setPos(allPos.filter(po => po.status === 'Ordered' || po.status === 'Partially Received'));
    }
  };

  const handlePOChange = async (poId) => {
    const selectedPo = pos.find(p => String(p.id) === String(poId));
    setForm(f => ({ ...f, purchase_order: poId, supplier: selectedPo ? selectedPo.vendor : f.supplier }));
    setPoItems([]);
    setReceiptItems([]);
    if (poId) {
      const res = await api.get(`/procurement/po-items/?purchase_order=${poId}`);
      const items = res.data.results || res.data;
      setPoItems(items);
      // Pre-populate receipt rows with pending quantities
      setReceiptItems(items.map(i => ({
        po_item_id: i.id,
        material_name: i.material_name,
        unit: i.material_unit,
        ordered: i.quantity,
        received: i.received_quantity,
        pending: i.pending_quantity,
        received_quantity: '',
      })));
    }
  };

  const updateReceiptItem = (idx, val) => {
    const items = [...receiptItems];
    items[idx].received_quantity = val;
    setItems(items);
  };

  // Fixed state setter name
  const setItems = (items) => setReceiptItems(items);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const itemsToSend = receiptItems.filter(i => Number(i.received_quantity) > 0).map(i => ({
      po_item_id: i.po_item_id,
      received_quantity: Number(i.received_quantity),
    }));
    if (!itemsToSend.length) {
      toast.error('Enter received quantity for at least one item.');
      return;
    }
    setSaving(true);
    try {
      await api.post('/procurement/goods-receipts/', { ...form, items: itemsToSend });
      toast.success('Material receipt recorded. Stock updated automatically.');
      setShowModal(false);
      setForm({ purchase_order: '', project: '', location_details: '', receipt_date: new Date().toISOString().split('T')[0], supplier: '', remarks: '' });
      setReceiptItems([]);
      setProjectSearchText('');
      fetchAll();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to record receipt.');
    } finally { setSaving(false); }
  };

  const handleViewGrn = async (grn) => {
    setViewGrn(grn);
    setViewModalOpen(true);
    setViewLoading(true);
    setViewError(null);
    setViewPoItems([]);
    try {
      const res = await api.get(`/procurement/po-items/?purchase_order=${grn.purchase_order}`);
      const items = res.data.results || res.data;
      setViewPoItems(items);
    } catch (err) {
      setViewError('Failed to load PO items.');
      toast.error('Failed to load PO items for this GRN.');
    } finally {
      setViewLoading(false);
    }
  };

  const closeViewModal = () => {
    setViewModalOpen(false);
    setViewGrn(null);
    setViewPoItems([]);
    setViewError(null);
  };

  const handleProjectSearchChange = (e) => {
    const val = e.target.value;
    setProjectSearchText(val);
    setShowProjectDropdown(true);
    if (val.trim() === '') {
      handleProjectChange('');
    }
  };

  const handleSelectProject = (project) => {
    setProjectSearchText(project.project_name);
    setShowProjectDropdown(false);
    handleProjectChange(project.id);
  };

  const handleTableProjectSearchChange = (e) => {
    const val = e.target.value;
    setTableProjectSearch(val);
    setShowTableProjectDropdown(true);
    if (val.trim() === '') {
      setSelectedTableProject(null);
      setCurrentPage(1);
    }
  };

  const handleSelectTableProject = (project) => {
    setTableProjectSearch(project.project_name);
    setSelectedTableProject(project);
    setShowTableProjectDropdown(false);
    setCurrentPage(1);
  };

  const clearTableProjectFilter = () => {
    setTableProjectSearch('');
    setSelectedTableProject(null);
    setCurrentPage(1);
  };

  const handleTableDateChange = (e) => {
    setTableDateFilter(e.target.value);
    setCurrentPage(1);
  };

  const clearTableDateFilter = () => {
    setTableDateFilter('');
    setCurrentPage(1);
  };

  // Filter Receipts
  const filteredReceipts = receipts.filter(r => {
    const projectMatch = selectedTableProject ? r.project_name === selectedTableProject.project_name : true;
    const dateMatch = tableDateFilter ? r.receipt_date === tableDateFilter : true;
    return projectMatch && dateMatch;
  });

  const pageSize = 10;
  const totalPages = Math.ceil(filteredReceipts.length / pageSize) || 1;
  const validCurrentPage = currentPage > totalPages ? Math.max(totalPages, 1) : currentPage;
  const startIndex = (validCurrentPage - 1) * pageSize;
  const paginatedReceipts = filteredReceipts.slice(startIndex, startIndex + pageSize);

  const PaginationControls = () => {
    if (totalPages <= 1) return null;
    return (
      <div className="d-flex flex-column flex-sm-row justify-content-between align-items-center p-3 border-top bg-white gap-2">
        <span className="text-muted small text-center text-sm-start">Showing page {validCurrentPage} of {totalPages}</span>
        <nav className="overflow-auto w-100 w-sm-auto d-flex justify-content-center">
          <ul className="pagination pagination-sm mb-0 flex-wrap justify-content-center">
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
      <div className="d-flex flex-column flex-sm-row justify-content-between align-items-start align-items-sm-center mb-4 gap-2">
        <h2 className="fw-bold mb-0">Material Receipts (GRN)</h2>
        <div className="d-flex align-items-center gap-2 flex-wrap">
          <BackToWorkCenter />
          {hasPermission('material_receipts.create') && (
            <button className="btn btn-primary d-flex align-items-center justify-content-center gap-2" onClick={() => setShowModal(true)}>
              <FiPlus /> Record Receipt
            </button>
          )}
        </div>
      </div>

      <div className="d-flex flex-column flex-sm-row align-items-stretch align-items-sm-center gap-2 mb-4 flex-wrap">
        <div className="flex-grow-1" style={{ minWidth: '200px', maxWidth: '100%', position: 'relative' }} ref={tableProjectComboboxRef}>
          <input
            type="text"
            className="form-control"
            placeholder="Search by Project Name..."
            value={tableProjectSearch}
            onChange={handleTableProjectSearchChange}
            onFocus={() => setShowTableProjectDropdown(true)}
          />
          {tableProjectSearch && (
            <button
              className="btn btn-sm btn-link text-muted position-absolute end-0 top-50 translate-middle-y me-1 text-decoration-none"
              onClick={clearTableProjectFilter}
              style={{ zIndex: 10, padding: 0 }}
              title="Clear Project"
            >
              ✕
            </button>
          )}
          {showTableProjectDropdown && (
            <ul className="list-group position-absolute w-100 shadow-sm" style={{ zIndex: 1000, maxHeight: '200px', overflowY: 'auto' }}>
              {projects.filter(p => p.project_name.toLowerCase().includes(tableProjectSearch.toLowerCase())).length > 0 ? (
                projects
                  .filter(p => p.project_name.toLowerCase().includes(tableProjectSearch.toLowerCase()))
                  .map(p => (
                    <li
                      key={p.id}
                      className="list-group-item list-group-item-action"
                      style={{ cursor: 'pointer' }}
                      onClick={() => handleSelectTableProject(p)}
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

        <div className="d-flex align-items-center gap-1 flex-grow-1 flex-sm-grow-0">
          <input
            type="date"
            className="form-control"
            value={tableDateFilter}
            onChange={handleTableDateChange}
            style={{ minWidth: '140px' }}
            title="Filter by Date"
          />
          {tableDateFilter && (
            <button
              className="btn btn-outline-secondary"
              onClick={clearTableDateFilter}
              title="Clear Date Filter"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      <div className="card border-0">
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover mb-0">
              <thead>
                <tr>
                  <th>S.No</th>
                  <th>Receipt Date</th>
                  <th>ID</th>
                  <th>PO Number</th>
                  <th>Project</th>
                  <th>Location</th>
                  <th>Supplier</th>
                  <th>Items</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? <tr><td colSpan={9} className="text-center py-5 text-muted">Loading...</td></tr>
                  : paginatedReceipts.length === 0 ? <tr><td colSpan={9} className="text-center py-5 text-muted">No receipts found.</td></tr>
                  : paginatedReceipts.map((r, index) => (
                    <tr key={r.id}>
                      <td><span className="fw-medium text-muted">{(validCurrentPage - 1) * pageSize + index + 1}</span></td>
                      <td>{r.receipt_date}</td>
                      <td>GRN-{r.id}</td>
                      <td className="fw-semibold">{r.po_number}</td>
                      <td>{r.project_name}</td>
                      <td>{r.location_details || 'Location not available'}</td>
                      <td>{r.supplier || '—'}</td>
                      <td><span className="badge bg-success bg-opacity-10 text-success">{r.items?.length || 0} items</span></td>
                      <td>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-primary"
                          title="View Detail"
                          onClick={() => handleViewGrn(r)}
                        >
                          <i className="bi bi-eye"></i>
                        </button>
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
          <div className="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title fw-bold">Record Material Receipt</h5>
                <button className="btn-close" onClick={() => setShowModal(false)} />
              </div>
              <form onSubmit={handleSubmit}>
                <div className="modal-body">
                  <div className="row g-3 mb-3">
                    <div className="col-12 col-sm-6 col-md-4" ref={projectComboboxRef}>
                      <label className="form-label fw-semibold">Project *</label>
                      <div className="position-relative">
                        <input
                          type="text"
                          className="form-control"
                          placeholder="Search Project..."
                          value={projectSearchText}
                          onChange={handleProjectSearchChange}
                          onFocus={() => setShowProjectDropdown(true)}
                          required={!form.project}
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
                    </div>
                    <div className="col-12 col-sm-6 col-md-4">
                      <label className="form-label fw-semibold">Purchase Order *</label>
                      <select className="form-select" required value={form.purchase_order} onChange={e => handlePOChange(e.target.value)}>
                        <option value="">Select PO</option>
                        {pos.map(po => <option key={po.id} value={po.id}>{po.po_number} — {po.vendor}</option>)}
                      </select>
                    </div>
                    <div className="col-12 col-sm-6 col-md-4">
                      <label className="form-label fw-semibold">Location</label>
                      <input type="text" className="form-control bg-light" readOnly value={form.project ? (form.location_details || 'Location not available') : ''} placeholder="Auto-populated" />
                    </div>
                    <div className="col-12 col-sm-6 col-md-4">
                      <label className="form-label fw-semibold">Supplier</label>
                      <input type="text" className="form-control" value={form.supplier} onChange={e => setForm(f => ({ ...f, supplier: e.target.value }))} />
                    </div>
                    <div className="col-12 col-sm-6 col-md-4">
                      <label className="form-label fw-semibold">Receipt Date *</label>
                      <input type="date" className="form-control" required value={form.receipt_date} onChange={e => setForm(f => ({ ...f, receipt_date: e.target.value }))} />
                    </div>
                    <div className="col-12 col-sm-6 col-md-4">
                      <label className="form-label fw-semibold">Remarks</label>
                      <input type="text" className="form-control" value={form.remarks} onChange={e => setForm(f => ({ ...f, remarks: e.target.value }))} />
                    </div>
                  </div>

                  {receiptItems.length > 0 && (
                    <>
                      <hr />
                      <h6 className="fw-bold mb-2">PO Items — Enter Received Quantities</h6>
                      <div className="table-responsive">
                        <table className="table table-bordered mb-0">
                          <thead className="table-light">
                            <tr><th>Material</th><th>Unit</th><th>Ordered</th><th>Already Received</th><th>Pending</th><th>Receiving Now *</th></tr>
                          </thead>
                          <tbody>
                            {receiptItems.map((item, idx) => (
                              <tr key={idx}>
                                <td>{item.material_name}</td>
                                <td>{item.unit}</td>
                                <td>{item.ordered}</td>
                                <td>{item.received}</td>
                                <td>
                                  <span className={Number(item.pending) <= 0 ? 'text-muted' : 'text-warning fw-semibold'}>
                                    {item.pending}
                                  </span>
                                </td>
                                <td>
                                  <input
                                    type="number"
                                    className="form-control form-control-sm"
                                    min="0"
                                    max={item.pending}
                                    step="0.01"
                                    value={item.received_quantity}
                                    disabled={Number(item.pending) <= 0}
                                    placeholder={Number(item.pending) <= 0 ? 'Fully received' : '0'}
                                    onChange={e => {
                                      const items = [...receiptItems];
                                      items[idx].received_quantity = e.target.value;
                                      setReceiptItems(items);
                                    }}
                                  />
                                  {Number(item.received_quantity) > Number(item.pending) && (
                                    <small className="text-danger">Exceeds pending ({item.pending})</small>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <div className="alert alert-info mt-3 mb-0 small">
                        <strong>Note:</strong> Stock will be automatically updated in the inventory upon saving.
                      </div>
                    </>
                  )}
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-light" onClick={() => setShowModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary" disabled={saving || !receiptItems.length}>{saving ? 'Saving...' : 'Record Receipt'}</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {viewModalOpen && viewGrn && (
        <div className="modal d-block" style={{ background: 'rgba(0,0,0,0.5)', zIndex: 1055 }}>
          <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title fw-bold">Material Receipt Details</h5>
                <button type="button" className="btn-close" onClick={closeViewModal} aria-label="Close" />
              </div>
              <div className="modal-body">
                {/* Header Information Grid */}
                <div className="row g-3 mb-4">
                  <div className="col-6 col-md-4">
                    <label className="form-label text-muted small fw-semibold mb-1">Receipt Date</label>
                    <div className="fw-medium">{viewGrn.receipt_date}</div>
                  </div>
                  <div className="col-6 col-md-4">
                    <label className="form-label text-muted small fw-semibold mb-1">GRN ID</label>
                    <div className="fw-medium">GRN-{viewGrn.id}</div>
                  </div>
                  <div className="col-12 col-md-4">
                    <label className="form-label text-muted small fw-semibold mb-1">PO Number</label>
                    <div className="fw-semibold text-primary">{viewGrn.po_number}</div>
                  </div>
                  <div className="col-12 col-md-6">
                    <label className="form-label text-muted small fw-semibold mb-1">Project</label>
                    <div className="fw-medium">{viewGrn.project_name}</div>
                  </div>
                  <div className="col-12 col-md-6">
                    <label className="form-label text-muted small fw-semibold mb-1">Supplier</label>
                    <div className="fw-medium">{viewGrn.supplier || '—'}</div>
                  </div>
                </div>

                <hr />
                <h6 className="fw-bold mb-3">PO Items & Quantity Status</h6>

                {viewLoading ? (
                  <div className="text-center py-4">
                    <div className="spinner-border text-primary spinner-border-sm me-2" role="status" />
                    <span className="text-muted">Loading items...</span>
                  </div>
                ) : viewError ? (
                  <div className="alert alert-danger py-2 small">{viewError}</div>
                ) : viewPoItems.length === 0 ? (
                  <div className="text-center py-4 text-muted small">No PO items available for this GRN.</div>
                ) : (
                  <div className="table-responsive">
                    <table className="table table-bordered align-middle mb-0">
                      <thead className="table-light">
                        <tr>
                          <th>Material</th>
                          <th>Unit</th>
                          <th className="text-end">Ordered</th>
                          <th className="text-end">Already Received</th>
                          <th className="text-end">Pending</th>
                        </tr>
                      </thead>
                      <tbody>
                        {viewPoItems.map((item, idx) => (
                          <tr key={idx}>
                            <td>{item.material_name}</td>
                            <td>{item.material_unit}</td>
                            <td className="text-end">{item.quantity}</td>
                            <td className="text-end">{item.received_quantity}</td>
                            <td className="text-end">
                              <span className={Number(item.pending_quantity) <= 0 ? 'text-muted' : 'text-warning fw-semibold'}>
                                {item.pending_quantity}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={closeViewModal}>
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MaterialReceipts;
