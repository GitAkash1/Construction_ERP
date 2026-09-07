import React, { useState, useEffect, useCallback, useRef } from 'react';
import { FiPlus, FiPackage, FiEye } from 'react-icons/fi';
import api from '../services/api';
import StatusBadge from '../components/StatusBadge';
import { toast } from 'react-toastify';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import BackToWorkCenter from '../components/BackToWorkCenter';

const PurchaseOrdersPage = () => {
  const { hasPermission } = useAuth();
  const [orders, setOrders] = useState([]);
  const [projects, setProjects] = useState([]);
  const [materialRequests, setMaterialRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedPo, setSelectedPo] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    po_number: '', project: '', material_request: '', vendor: '', vendor_mobile: '', vendor_location: '',
    order_date: new Date().toISOString().split('T')[0],
    expected_delivery_date: '', tax_percentage: '0', remarks: ''
  });
  const [poItems, setPoItems] = useState([{ material: '', quantity: '', unit_price: '' }]);
  const [materials, setMaterials] = useState([]);

  // Pagination & Combobox State
  const [currentPage, setCurrentPage] = useState(1);
  const [projectSearchText, setProjectSearchText] = useState('');
  const [showProjectDropdown, setShowProjectDropdown] = useState(false);
  const projectComboboxRef = useRef(null);

  // Table Filter Combobox State
  const [filterSearchText, setFilterSearchText] = useState('');
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [selectedFilterProject, setSelectedFilterProject] = useState(null);
  const filterComboboxRef = useRef(null);
  const [tableDateFilter, setTableDateFilter] = useState('');

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (projectComboboxRef.current && !projectComboboxRef.current.contains(event.target)) {
        setShowProjectDropdown(false);
      }
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
      const [poRes, projRes, matRes] = await Promise.all([
        api.get('/procurement/purchase-orders/'),
        api.get('/projects/projects/all/'),
        api.get('/inventory/materials/'),
      ]);
      setOrders(poRes.data.results || poRes.data);
      setProjects(projRes.data.results || projRes.data);
      setMaterials(matRes.data.results || matRes.data);
    } catch { toast.error('Failed to load.'); }
    finally { setLoading(false); }
  }, []);

  const location = useLocation();

  useEffect(() => { 
    fetchAll().then(() => {
      if (location.state && location.state.preselect_mr) {
        const mr = location.state.preselect_mr;
        setProjectSearchText(mr.project_name || '');
        handleProjectChange(mr.project).then(() => {
          setTimeout(() => {
            handleMRChange(mr.id);
            setShowModal(true);
          }, 500); // Give it a bit of time to fetch MRs
        });
        // Clear state to avoid reopening on refresh
        window.history.replaceState({}, document.title);
      }
    }); 
  }, [fetchAll, location.state]);

  const handleProjectChange = async (projectId) => {
    setForm(f => ({ ...f, project: projectId, material_request: '' }));
    if (projectId) {
      const res = await api.get(`/procurement/material-requests/?project=${projectId}&status=Approved`);
      const mrs = res.data.results || res.data;
      const poRes = await api.get(`/procurement/purchase-orders/?project=${projectId}`);
      const pos = poRes.data.results || poRes.data;
      const mrIdsWithPo = pos.map(po => po.material_request).filter(Boolean);
      setMaterialRequests(mrs.filter(mr => !mrIdsWithPo.includes(mr.id)));
    }
  };

  const handleMRChange = (mrId) => {
    setForm(f => ({ ...f, material_request: mrId }));
    if (mrId) {
      const mr = materialRequests.find(m => String(m.id) === String(mrId));
      if (mr && mr.items && mr.items.length > 0) {
        setPoItems(mr.items.map(item => ({
          material: item.material,
          quantity: item.approved_quantity || item.requested_quantity,
          unit_price: '',
        })));
      }
    } else {
      setPoItems([{ material: '', quantity: '', unit_price: '' }]);
    }
  };

  const updatePoItem = (idx, key, val) => {
    const items = [...poItems];
    items[idx][key] = val;
    setPoItems(items);
  };

  const handleVendorChange = (e) => {
    const val = e.target.value;
    // Exact match auto-fill
    const match = orders.find(o => o.vendor && o.vendor.toLowerCase() === val.toLowerCase());
    if (match && (match.vendor_mobile || match.vendor_location)) {
      setForm(f => ({ 
        ...f, 
        vendor: val, 
        vendor_mobile: f.vendor_mobile || match.vendor_mobile || '', 
        vendor_location: f.vendor_location || match.vendor_location || '' 
      }));
    } else {
      setForm(f => ({ ...f, vendor: val }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const poRes = await api.post('/procurement/purchase-orders/', {
        ...form,
        material_request: form.material_request || null,
      });
      const poId = poRes.data.id;
      await Promise.all(poItems.map(item =>
        api.post('/procurement/po-items/', { ...item, purchase_order: poId })
      ));
      toast.success('Purchase Order created.');
      setShowModal(false);
      setForm({ po_number: '', project: '', material_request: '', vendor: '', vendor_mobile: '', vendor_location: '', order_date: new Date().toISOString().split('T')[0], expected_delivery_date: '', tax_percentage: '0', remarks: '' });
      setPoItems([{ material: '', quantity: '', unit_price: '' }]);
      setProjectSearchText('');
      fetchAll();
    } catch (err) {
      toast.error(err.response?.data?.error || JSON.stringify(err.response?.data) || 'Failed to create.');
    } finally { setSaving(false); }
  };

  const subtotal = poItems.reduce((sum, i) => sum + (Number(i.quantity) * Number(i.unit_price) || 0), 0);
  const tax = subtotal * Number(form.tax_percentage) / 100;
  const grandTotal = subtotal + tax;

  const openDetailsModal = async (po) => {
    setLoadingDetails(true);
    setShowDetailsModal(true);
    try {
      const res = await api.get(`/procurement/purchase-orders/${po.id}/`);
      setSelectedPo(res.data);
    } catch (err) {
      toast.error('Unable to load Purchase Order details. Please try again.');
      setShowDetailsModal(false);
    } finally {
      setLoadingDetails(false);
    }
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

  const handleFilterSearchChange = (e) => {
    const val = e.target.value;
    setFilterSearchText(val);
    setShowFilterDropdown(true);
    if (val.trim() === '') {
      setSelectedFilterProject(null);
      setCurrentPage(1);
    }
  };

  const handleSelectFilterProject = (project) => {
    setFilterSearchText(project.project_name);
    setSelectedFilterProject(project);
    setShowFilterDropdown(false);
    setCurrentPage(1);
  };

  const clearFilterProject = () => {
    setFilterSearchText('');
    setSelectedFilterProject(null);
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

  const filteredOrders = orders.filter(po => {
    const projectMatch = selectedFilterProject ? po.project_name === selectedFilterProject.project_name : true;
    const dateMatch = tableDateFilter ? po.order_date === tableDateFilter : true;
    return projectMatch && dateMatch;
  });

  const pageSize = 10;
  const totalPages = Math.ceil(filteredOrders.length / pageSize) || 1;
  const validCurrentPage = currentPage > totalPages ? Math.max(totalPages, 1) : currentPage;
  const startIndex = (validCurrentPage - 1) * pageSize;
  const paginatedOrders = filteredOrders.slice(startIndex, startIndex + pageSize);

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
        <h2 className="fw-bold mb-0">Purchase Orders</h2>
        <div className="d-flex align-items-center gap-2">
          <BackToWorkCenter />

          <div style={{ width: '300px', position: 'relative' }} ref={filterComboboxRef}>
            <input
              type="text"
              className="form-control"
              placeholder="Search by Project Name..."
              value={filterSearchText}
              onChange={handleFilterSearchChange}
              onFocus={() => setShowFilterDropdown(true)}
            />
            {filterSearchText && (
              <button
                className="btn btn-sm btn-link text-muted position-absolute end-0 top-50 translate-middle-y me-1 text-decoration-none"
                onClick={clearFilterProject}
                style={{ zIndex: 10, padding: 0 }}
              >
                ✕
              </button>
            )}
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

          <div className="d-flex align-items-center gap-1">
            <input
              type="date"
              className="form-control"
              value={tableDateFilter}
              onChange={handleTableDateChange}
              style={{ width: '150px' }}
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

          {hasPermission('purchase_orders.create') && (
            <button className="btn btn-primary d-flex align-items-center gap-2" onClick={() => setShowModal(true)}>
              <FiPlus /> New PO
            </button>
          )}
        </div>
      </div>

      <div className="card border-0">
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover mb-0">
              <thead>
                <tr><th>S.No</th><th>Date</th><th>PO Number</th><th>MR Ref</th><th>Project</th><th>Vendor</th><th>Grand Total</th><th>Status</th><th>Details</th></tr>
              </thead>
              <tbody>
                {loading ? <tr><td colSpan={9} className="text-center py-5 text-muted">Loading...</td></tr>
                  : paginatedOrders.length === 0 ? <tr><td colSpan={9} className="text-center py-5 text-muted">No purchase orders found.</td></tr>
                  : paginatedOrders.map((po, index) => (
                    <tr key={po.id}>
                      <td><span className="fw-medium text-muted">{(validCurrentPage - 1) * pageSize + index + 1}</span></td>
                      <td>{po.order_date}</td>
                      <td className="fw-semibold">{po.po_number}</td>
                      <td>{po.material_request_number ? <span className="badge bg-light text-secondary border">{po.material_request_number}</span> : '—'}</td>
                      <td>{po.project_name}</td>
                      <td>{po.vendor}</td>
                      <td>₹{Number(po.grand_total || 0).toLocaleString('en-IN')}</td>
                      <td><StatusBadge status={po.status} /></td>
                      <td>
                        <button className="btn btn-sm btn-light text-primary" onClick={() => openDetailsModal(po)} title="View Details">
                          <FiEye />
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
          <div className="modal-dialog modal-xl">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title fw-bold">Create Purchase Order</h5>
                <button className="btn-close" onClick={() => setShowModal(false)} />
              </div>
              <form onSubmit={handleSubmit}>
                <div className="modal-body">
                  <div className="row g-3 mb-3">
                    <div className="col-md-3">
                      <label className="form-label fw-semibold">PO Number</label>
                      <input type="text" className="form-control bg-light" readOnly value="Auto-generated" />
                    </div>
                    <div className="col-md-3" ref={projectComboboxRef}>
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
                    <div className="col-md-3">
                      <label className="form-label fw-semibold">Material Request *</label>
                      <select className="form-select" required value={form.material_request} onChange={e => handleMRChange(e.target.value)}>
                        <option value="">Select MR</option>
                        {materialRequests.map(mr => <option key={mr.id} value={mr.id}>{mr.request_number}</option>)}
                      </select>
                    </div>
                    <div className="col-md-3">
                      <label className="form-label fw-semibold">Vendor *</label>
                      <input type="text" className="form-control" required value={form.vendor} onChange={handleVendorChange} />
                    </div>
                    <div className="col-md-3">
                      <label className="form-label fw-semibold">Vendor Mobile *</label>
                      <input type="tel" className="form-control" required pattern="[0-9]{10}" title="10-digit mobile number" value={form.vendor_mobile} onChange={e => setForm(f => ({ ...f, vendor_mobile: e.target.value }))} />
                    </div>
                    <div className="col-md-9">
                      <label className="form-label fw-semibold">Vendor Location Details *</label>
                      <input type="text" className="form-control" required value={form.vendor_location} onChange={e => setForm(f => ({ ...f, vendor_location: e.target.value }))} />
                    </div>
                    <div className="col-md-3">
                      <label className="form-label fw-semibold">Order Date *</label>
                      <input type="date" className="form-control" required value={form.order_date} onChange={e => setForm(f => ({ ...f, order_date: e.target.value }))} />
                    </div>
                    <div className="col-md-3">
                      <label className="form-label fw-semibold">Expected Delivery</label>
                      <input type="date" className="form-control" value={form.expected_delivery_date} onChange={e => setForm(f => ({ ...f, expected_delivery_date: e.target.value }))} />
                    </div>
                    <div className="col-md-3">
                      <label className="form-label fw-semibold">Tax %</label>
                      <input type="number" className="form-control" min="0" step="0.01" value={form.tax_percentage} onChange={e => setForm(f => ({ ...f, tax_percentage: e.target.value }))} />
                    </div>
                  </div>

                  <hr />
                  <h6 className="fw-bold mb-2">Items</h6>
                  {poItems.map((item, idx) => (
                    <div key={idx} className="row g-2 mb-2 align-items-end border-bottom pb-2">
                      <div className="col-md-4">
                        <label className="form-label fw-semibold small">Material *</label>
                        <select className="form-select form-select-sm" required value={item.material} onChange={e => updatePoItem(idx, 'material', e.target.value)}>
                          <option value="">Select Material</option>
                          {materials.map(m => <option key={m.id} value={m.id}>{m.material_name} ({m.unit})</option>)}
                        </select>
                      </div>
                      <div className="col-md-2">
                        <label className="form-label fw-semibold small">Quantity *</label>
                        <input type="number" className="form-control form-control-sm" required min="0.01" step="0.01" value={item.quantity} onChange={e => updatePoItem(idx, 'quantity', e.target.value)} />
                      </div>
                      <div className="col-md-2">
                        <label className="form-label fw-semibold small">Rate (₹) *</label>
                        <input type="number" className="form-control form-control-sm" required min="0" step="0.01" value={item.unit_price} onChange={e => updatePoItem(idx, 'unit_price', e.target.value)} />
                      </div>
                      <div className="col-md-2">
                        <label className="form-label fw-semibold small">Line Total</label>
                        <input className="form-control form-control-sm bg-light" readOnly value={`₹${(Number(item.quantity) * Number(item.unit_price) || 0).toLocaleString('en-IN')}`} />
                      </div>
                      <div className="col-md-1">
                        {poItems.length > 1 && <button type="button" className="btn btn-sm btn-light text-danger" onClick={() => setPoItems(p => p.filter((_, i) => i !== idx))}>✕</button>}
                      </div>
                    </div>
                  ))}
                  <button type="button" className="btn btn-sm btn-outline-primary mt-2" onClick={() => setPoItems(p => [...p, { material: '', quantity: '', unit_price: '' }])}><FiPlus /> Add Item</button>

                  <div className="mt-3 text-end">
                    <table className="table table-sm ms-auto" style={{ maxWidth: 300 }}>
                      <tbody>
                        <tr><td className="text-muted">Subtotal</td><td className="fw-semibold text-end">₹{subtotal.toLocaleString('en-IN')}</td></tr>
                        <tr><td className="text-muted">Tax ({form.tax_percentage}%)</td><td className="fw-semibold text-end">₹{tax.toLocaleString('en-IN')}</td></tr>
                        <tr className="table-primary"><td className="fw-bold">Grand Total</td><td className="fw-bold text-end">₹{grandTotal.toLocaleString('en-IN')}</td></tr>
                      </tbody>
                    </table>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-light" onClick={() => setShowModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Create PO'}</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {showDetailsModal && (
        <div className="modal d-block" style={{ background: 'rgba(0,0,0,0.5)', zIndex: 1055 }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title fw-bold">Purchase Order Details</h5>
                <button className="btn-close" onClick={() => setShowDetailsModal(false)} />
              </div>
              <div className="modal-body">
                {loadingDetails ? (
                  <div className="text-center py-5 text-muted">Loading Purchase Order Details...</div>
                ) : selectedPo ? (
                  <>
                    <div className="mb-4">
                      <h6 className="fw-bold mb-3 border-bottom pb-2">PO Information</h6>
                      <div className="row g-3">
                        <div className="col-md-3"><span className="text-muted d-block small">PO Number</span><span className="fw-semibold">{selectedPo.po_number}</span></div>
                        <div className="col-md-3"><span className="text-muted d-block small">Project</span><span className="fw-semibold">{selectedPo.project_name}</span></div>
                        <div className="col-md-3"><span className="text-muted d-block small">PO Date</span><span className="fw-semibold">{selectedPo.order_date}</span></div>
                        <div className="col-md-3"><span className="text-muted d-block small">Status</span><StatusBadge status={selectedPo.status} /></div>
                      </div>
                    </div>

                    <div className="mb-4">
                      <h6 className="fw-bold mb-3 border-bottom pb-2">Material Details</h6>
                      {selectedPo.items && selectedPo.items.length > 0 ? (
                        <div className="table-responsive">
                          <table className="table table-bordered table-sm mb-0">
                            <thead className="table-light">
                              <tr>
                                <th>Material Name</th>
                                <th className="text-end">Requested Qty</th>
                                <th className="text-end">Received Qty</th>
                                <th className="text-end">Balance Qty</th>
                              </tr>
                            </thead>
                            <tbody>
                              {selectedPo.items.map(item => (
                                <tr key={item.id}>
                                  <td>{item.material_name}</td>
                                  <td className="text-end">{Number(item.requested_quantity || 0).toLocaleString('en-IN')} {item.material_unit}</td>
                                  <td className="text-end">{Number(item.received_quantity || 0).toLocaleString('en-IN')} {item.material_unit}</td>
                                  <td className="text-end fw-semibold">{Math.max(0, Number(item.requested_quantity || 0) - Number(item.received_quantity || 0)).toLocaleString('en-IN')} {item.material_unit}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className="text-muted small">No material details available.</div>
                      )}
                    </div>

                    <div>
                      <h6 className="fw-bold mb-3 border-bottom pb-2">Vendor Details</h6>
                      <div className="row g-3">
                        <div className="col-md-4"><span className="text-muted d-block small">Vendor Name</span><span className="fw-semibold">{selectedPo.vendor || '—'}</span></div>
                        <div className="col-md-4"><span className="text-muted d-block small">Mobile Number</span><span className="fw-semibold">{selectedPo.vendor_mobile || '—'}</span></div>
                        <div className="col-md-4"><span className="text-muted d-block small">Location</span><span className="fw-semibold">{selectedPo.vendor_location || '—'}</span></div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-5 text-muted">Unable to load Purchase Order details. Please try again.</div>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-light" onClick={() => setShowDetailsModal(false)}>Close</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PurchaseOrdersPage;
