import React, { useState, useEffect, useCallback, useRef } from 'react';
import { FiPlus, FiCalendar, FiX, FiFilter } from 'react-icons/fi';
import api from '../services/api';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';
import BackToWorkCenter from '../components/BackToWorkCenter';

const SiteConsumption = () => {
  const [projectSummaries, setProjectSummaries] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [projectConsumptions, setProjectConsumptions] = useState([]);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const { hasPermission } = useAuth();

  const [projects, setProjects] = useState([]);
  const [sites, setSites] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [boqItems, setBoqItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [projectSearchTerm, setProjectSearchTerm] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [location, setLocation] = useState('');
  const [form, setForm] = useState({ project: '', consumption_date: new Date().toISOString().split('T')[0], activity: '', remarks: '' });
  const [items, setItems] = useState([{ material: '', boq_item: '', quantity: '', unit: '', unit_price: '' }]);

  // Main view combobox, date filter and pagination
  const [filterSearchText, setFilterSearchText] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const filterComboboxRef = useRef(null);
  const [currentPage, setCurrentPage] = useState(1);

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
      const [cRes, projRes, siteRes, matRes] = await Promise.all([
        api.get('/sites/consumptions/project-summary/'),
        api.get('/sites/consumptions/eligible-projects/'),
        api.get('/sites/sites/'),
        api.get('/inventory/materials/'),
      ]);
      setProjectSummaries(cRes.data.results || cRes.data);
      setProjects(projRes.data.results || projRes.data);
      setSites(siteRes.data.results || siteRes.data);
      setMaterials(matRes.data.results || matRes.data);
    } catch { toast.error('Failed to load.'); }
    finally { setLoading(false); }
  }, []);

  const handleInspect = async (projectId) => {
    setSelectedProjectId(projectId);
    setCurrentPage(1);
    try {
      setLoadingDetails(true);
      const res = await api.get(`/sites/consumptions/?project=${projectId}`);
      setProjectConsumptions(res.data.results || res.data);
    } catch {
      toast.error('Failed to load consumption details.');
    } finally {
      setLoadingDetails(false);
    }
  };

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleProjectSelect = async (project) => {
    setForm(f => ({ ...f, project: project.project_id }));
    setProjectSearchTerm(project.project_name);
    setLocation(project.location || '');
    setShowSuggestions(false);
    setBoqItems([]);
    if (project.project_id) {
      const boqRes = await api.get(`/projects/boq-items/?boq__project=${project.project_id}`);
      setBoqItems(boqRes.data.results || boqRes.data);
    }
  };

  const updateItem = (idx, key, val) => {
    const newItems = [...items];
    newItems[idx][key] = val;
    // Auto-fill unit and price from material
    if (key === 'material') {
      const mat = materials.find(m => m.id === Number(val));
      if (mat) { newItems[idx].unit = mat.unit; newItems[idx].unit_price = mat.unit_price; }
    }
    if (key === 'boq_item') {
      const bi = boqItems.find(b => b.id === Number(val));
      if (bi) {
        newItems[idx].material = bi.material;
        const mat = materials.find(m => m.id === bi.material);
        if (mat) { newItems[idx].unit = mat.unit; newItems[idx].unit_price = mat.unit_price; }
      }
    }
    setItems(newItems);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const itemsToSend = items.map(i => ({
      material_id: Number(i.material),
      boq_item_id: i.boq_item ? Number(i.boq_item) : null,
      quantity: Number(i.quantity),
      unit: i.unit,
      unit_price: Number(i.unit_price) || 0,
    }));
    setSaving(true);
    try {
      await api.post('/sites/consumptions/', { ...form, items: itemsToSend });
      toast.success('Consumption recorded. Stock and BOQ updated automatically.');
      setShowModal(false);
      setForm({ project: '', consumption_date: new Date().toISOString().split('T')[0], activity: '', remarks: '' });
      setProjectSearchTerm('');
      setLocation('');
      setItems([{ material: '', boq_item: '', quantity: '', unit: '', unit_price: '' }]);
      fetchAll();
      if (selectedProjectId) {
        handleInspect(selectedProjectId);
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to record consumption.');
    } finally { setSaving(false); }
  };

  const handleFilterSearchChange = (e) => {
    const val = e.target.value;
    setFilterSearchText(val);
    setShowFilterDropdown(true);
    
    if (val.trim() === '') {
      setSelectedProjectId(null);
      setCurrentPage(1);
    }
  };

  const handleSelectFilterProject = (project) => {
    setFilterSearchText(project.project_name);
    setShowFilterDropdown(false);
    handleInspect(project.project_id);
  };

  // Pagination & Filtering Logic
  const detailedRecords = React.useMemo(() => {
    return projectConsumptions.flatMap(c => 
      c.items && c.items.length > 0 
        ? c.items.map(item => ({ ...item, consumption_date: c.consumption_date, activity: c.activity, is_empty: false }))
        : [{ id: c.id, consumption_date: c.consumption_date, activity: c.activity, is_empty: true }]
    );
  }, [projectConsumptions]);

  const rawData = !selectedProjectId ? projectSummaries : detailedRecords;
  
  const currentData = React.useMemo(() => {
    if (!selectedDate) return rawData;
    return rawData.filter(item => {
      if (!item.consumption_date) return false;
      return String(item.consumption_date) === String(selectedDate);
    });
  }, [rawData, selectedDate]);

  const pageSize = 10;
  const totalPages = Math.ceil(currentData.length / pageSize) || 1;
  const validCurrentPage = currentPage > totalPages ? Math.max(totalPages, 1) : currentPage;
  const startIndex = (validCurrentPage - 1) * pageSize;
  const paginatedData = currentData.slice(startIndex, startIndex + pageSize);

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
        <h2 className="fw-bold mb-0">Site Consumption</h2>
        <div className="d-flex align-items-center gap-2 flex-wrap">
          <BackToWorkCenter />
          {hasPermission('site_consumption.create') && (
            <button className="btn btn-primary d-flex align-items-center justify-content-center gap-2" onClick={() => setShowModal(true)}>
              <FiPlus /> Record Consumption
            </button>
          )}
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="card border-0 shadow-sm rounded-4 mb-4 bg-white">
        <div className="card-body p-3">
          <div className="d-flex flex-column flex-sm-row align-items-stretch align-items-sm-center gap-2 gap-sm-3 flex-wrap">
            <div className="d-flex align-items-center text-dark fw-bold me-2">
              <FiFilter className="text-primary me-2" />
              <span>Search & Filter</span>
            </div>

            {/* Project Search Combobox */}
            <div className="flex-grow-1" style={{ minWidth: '200px', maxWidth: '100%', position: 'relative' }} ref={filterComboboxRef}>
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
                  {projectSummaries.filter(p => p.project_name.toLowerCase().includes(filterSearchText.toLowerCase())).length > 0 ? (
                    projectSummaries
                      .filter(p => p.project_name.toLowerCase().includes(filterSearchText.toLowerCase()))
                      .map(p => (
                        <li
                          key={p.project_id}
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

            {/* Search by Date Input */}
            <div className="input-group flex-grow-1 flex-sm-grow-0" style={{ minWidth: '170px' }}>
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
            {(filterSearchText || selectedDate || selectedProjectId) && (
              <button 
                type="button"
                className="btn btn-link text-danger p-0 text-decoration-none small d-flex align-items-center justify-content-center gap-1 ms-sm-auto"
                onClick={() => {
                  setFilterSearchText('');
                  setSelectedProjectId(null);
                  setSelectedDate('');
                  setCurrentPage(1);
                }}
              >
                <FiX /> Clear Filters
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="card border-0">
        <div className="card-body p-0">
          <div className="table-responsive">
            {!selectedProjectId ? (
              <table className="table table-hover mb-0 align-middle">
                <thead>
                  <tr><th>S.NO</th><th>Date</th><th>Project</th><th>Location</th><th className="text-end pe-4">Inspect</th></tr>
                </thead>
                <tbody>
                  {loading ? <tr><td colSpan={5} className="text-center py-5 text-muted">Loading...</td></tr>
                    : paginatedData.length === 0 ? <tr><td colSpan={5} className="text-center py-5 text-muted">No consumption records found.</td></tr>
                    : paginatedData.map((p, index) => (
                      <tr key={p.project_id || index}>
                        <td><span className="fw-medium text-muted">{(validCurrentPage - 1) * pageSize + index + 1}</span></td>
                        <td>{p.consumption_date}</td>
                        <td className="fw-semibold">{p.project_name}</td>
                        <td>{p.location}</td>
                        <td className="text-end pe-4">
                          <button className="btn btn-sm btn-outline-primary" onClick={() => handleInspect(p.project_id)}>Inspect</button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            ) : (
              <div className="p-4">
                <div className="d-flex justify-content-between align-items-center mb-4">
                  <div>
                    <h5 className="fw-bold mb-1">Selected Project:</h5>
                    <h4 className="text-primary mb-0">{projectSummaries.find(p => p.project_id === selectedProjectId)?.project_name}</h4>
                  </div>
                  <button className="btn btn-light rounded-circle p-2 lh-1" title="Close" aria-label="Close" onClick={() => {
                    setSelectedProjectId(null);
                    setFilterSearchText('');
                    setCurrentPage(1);
                  }}>
                    <i className="bi bi-x-lg"></i>
                  </button>
                </div>
                <table className="table table-hover mb-0 align-middle">
                  <thead>
                    <tr><th>S.NO</th><th>Date</th><th>Activity</th><th>Material Name</th><th>Issued Qty</th><th>Quantity Used</th><th>Balance Qty</th></tr>
                  </thead>
                  <tbody>
                    {loadingDetails ? <tr><td colSpan={7} className="text-center py-5 text-muted">Loading details...</td></tr>
                      : paginatedData.length === 0 ? <tr><td colSpan={7} className="text-center py-5 text-muted">No consumption records found.</td></tr>
                      : paginatedData.map((item, index) => (
                        item.is_empty ? (
                          <tr key={item.id || index}>
                            <td><span className="fw-medium text-muted">{(validCurrentPage - 1) * pageSize + index + 1}</span></td>
                            <td>{item.consumption_date}</td>
                            <td className="fw-semibold">{item.activity}</td>
                            <td className="text-muted fst-italic">No materials</td>
                            <td>-</td>
                            <td>-</td>
                            <td>-</td>
                          </tr>
                        ) : (
                          <tr key={item.id || index}>
                            <td><span className="fw-medium text-muted">{(validCurrentPage - 1) * pageSize + index + 1}</span></td>
                            <td>{item.consumption_date}</td>
                            <td className="fw-semibold">{item.activity}</td>
                            <td>{item.material_name}</td>
                            <td>{item.issued_qty} {item.unit}</td>
                            <td>{item.quantity} {item.unit}</td>
                            <td>{item.balance_qty} {item.unit}</td>
                          </tr>
                        )
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          <PaginationControls />
        </div>
      </div>

      {showModal && (
        <div className="modal d-block" style={{ background: 'rgba(0,0,0,0.5)', zIndex: 1055 }}>
          <div className="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title fw-bold">Record Site Consumption</h5>
                <button className="btn-close" onClick={() => setShowModal(false)} />
              </div>
              <form onSubmit={handleSubmit}>
                <div className="modal-body">
                  <div className="row g-3 mb-3">
                    <div className="col-12 col-sm-6 col-md-3 position-relative">
                      <label className="form-label fw-semibold">Project Name *</label>
                      <input 
                        type="text" 
                        className="form-control" 
                        placeholder="Select / Search Project"
                        required 
                        value={projectSearchTerm} 
                        onChange={e => {
                          setProjectSearchTerm(e.target.value);
                          setForm(f => ({ ...f, project: '' }));
                          setLocation('');
                          setShowSuggestions(true);
                        }}
                        onFocus={() => setShowSuggestions(true)}
                        onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                      />
                      {showSuggestions && (
                        <div className="dropdown-menu show w-100 shadow-sm" style={{ position: 'absolute', top: '100%', left: 0, zIndex: 1000, maxHeight: '200px', overflowY: 'auto' }}>
                          {projects.filter(p => p.project_name.toLowerCase().includes(projectSearchTerm.toLowerCase())).length === 0 ? (
                            <div className="dropdown-item text-muted">No eligible projects found</div>
                          ) : (
                            projects.filter(p => p.project_name.toLowerCase().includes(projectSearchTerm.toLowerCase())).map(p => (
                              <button type="button" className="dropdown-item" key={p.project_id} onMouseDown={(e) => { e.preventDefault(); handleProjectSelect(p); }}>
                                {p.project_name}
                              </button>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                    <div className="col-12 col-sm-6 col-md-3">
                      <label className="form-label fw-semibold">Location</label>
                      <input type="text" className="form-control" readOnly value={location} placeholder="Auto-populated Location" />
                    </div>
                    <div className="col-12 col-sm-6 col-md-3">
                      <label className="form-label fw-semibold">Activity *</label>
                      <input type="text" className="form-control" required value={form.activity} onChange={e => setForm(f => ({ ...f, activity: e.target.value }))} placeholder="e.g. Concrete Work" />
                    </div>
                    <div className="col-12 col-sm-6 col-md-3">
                      <label className="form-label fw-semibold">Date *</label>
                      <input type="date" className="form-control" required value={form.consumption_date} onChange={e => setForm(f => ({ ...f, consumption_date: e.target.value }))} />
                    </div>
                    <div className="col-12">
                      <label className="form-label fw-semibold">Remarks</label>
                      <input type="text" className="form-control" value={form.remarks} onChange={e => setForm(f => ({ ...f, remarks: e.target.value }))} />
                    </div>
                  </div>

                  <hr />
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <h6 className="fw-bold mb-0">Materials</h6>
                    <button type="button" className="btn btn-sm btn-outline-primary" onClick={() => setItems(i => [...i, { material: '', boq_item: '', quantity: '', unit: '', unit_price: '' }])}><FiPlus /> Add Material</button>
                  </div>
                  {items.map((item, idx) => (
                    <div key={idx} className="row g-2 mb-2 align-items-end border-bottom pb-2">
                      <div className="col-12 col-sm-6 col-md-3">
                        <label className="form-label fw-semibold small">BOQ Item</label>
                        <select className="form-select form-select-sm" value={item.boq_item} onChange={e => updateItem(idx, 'boq_item', e.target.value)}>
                          <option value="">Select BOQ Item (Optional)</option>
                          {boqItems.map(bi => <option key={bi.id} value={bi.id}>{bi.material_name} (Bal: {bi.balance_quantity})</option>)}
                        </select>
                      </div>
                      <div className="col-12 col-sm-6 col-md-3">
                        <label className="form-label fw-semibold small">Material *</label>
                        <select className="form-select form-select-sm" required value={item.material} onChange={e => updateItem(idx, 'material', e.target.value)}>
                          <option value="">Select Material</option>
                          {materials.map(m => <option key={m.id} value={m.id}>{m.material_name} (Stock: {m.current_stock} {m.unit})</option>)}
                        </select>
                      </div>
                      <div className="col-6 col-sm-4 col-md-2">
                        <label className="form-label fw-semibold small">Quantity *</label>
                        <input type="number" className="form-control form-control-sm" required min="0.01" step="0.01" value={item.quantity} onChange={e => updateItem(idx, 'quantity', e.target.value)} />
                      </div>
                      <div className="col-6 col-sm-4 col-md-2">
                        <label className="form-label fw-semibold small">Unit</label>
                        <input type="text" className="form-control form-control-sm" value={item.unit} onChange={e => updateItem(idx, 'unit', e.target.value)} />
                      </div>
                      <div className="col-10 col-sm-3 col-md-1">
                        <label className="form-label fw-semibold small">Rate</label>
                        <input type="number" className="form-control form-control-sm" min="0" step="0.01" value={item.unit_price} onChange={e => updateItem(idx, 'unit_price', e.target.value)} />
                      </div>
                      <div className="col-2 col-sm-1 col-md-1 text-end">
                        {items.length > 1 && <button type="button" className="btn btn-sm btn-light text-danger w-100" onClick={() => setItems(i => i.filter((_, j) => j !== idx))}>✕</button>}
                      </div>
                    </div>
                  ))}
                  <div className="alert alert-warning mt-3 mb-0 small">
                    <strong>Note:</strong> Stock will be reduced and BOQ consumption will be updated automatically on save.
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-light" onClick={() => setShowModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Record Consumption'}</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SiteConsumption;
