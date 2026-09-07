import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { FiPlus, FiEye, FiTrash2, FiSearch, FiCalendar, FiX } from 'react-icons/fi';
import api from '../services/api';
import StatusBadge from '../components/StatusBadge';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';
import BackToWorkCenter from '../components/BackToWorkCenter';

const BOQList = () => {
  const [boqs, setBoqs] = useState([]);
  const [projects, setProjects] = useState([]);
  const [inventoryMaterials, setInventoryMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  
  const [projectSearchTerm, setProjectSearchTerm] = useState('');
  const [projectSearchResults, setProjectSearchResults] = useState([]);
  const [activeProjectDropdown, setActiveProjectDropdown] = useState(false);
  const [selectedProjectName, setSelectedProjectName] = useState('');
  
  const materialSearchTimeout = React.useRef(null);

  // Pagination & Search States
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Get current date string for input default (YYYY-MM-DD)
  const getTodayDateString = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  const [form, setForm] = useState({ project: '', bill_date: getTodayDateString() });
  const [items, setItems] = useState([]);
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [saving, setSaving] = useState(false);
  const { user, hasPermission } = useAuth();

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (selectedDate) params.append('bill_date', selectedDate);
      params.append('page', currentPage);

      const [boqRes, projRes, matRes] = await Promise.all([
        api.get(`/projects/boqs/?${params.toString()}`),
        api.get('/projects/projects/all/'),
        api.get('/inventory/materials/'),
      ]);
      setBoqs(boqRes.data.results || boqRes.data);
      if (boqRes.data.count !== undefined) {
        setTotalPages(Math.ceil(boqRes.data.count / 10));
      }
      setProjects(projRes.data.results || projRes.data);
      setInventoryMaterials(matRes.data.results || matRes.data);
    } catch { toast.error('Failed to load BOQs.'); }
    finally { setLoading(false); }
  }, [searchTerm, selectedDate, currentPage]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1); // Reset to page 1 on search change
  };

  const handleDateChange = (e) => {
    setSelectedDate(e.target.value);
    setCurrentPage(1); // Reset to page 1 on date change
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    setSelectedDate('');
    setCurrentPage(1);
  };

  useEffect(() => {
    const timer = setTimeout(() => {
       const term = projectSearchTerm.trim();
       if (activeProjectDropdown) {
          api.get(`/projects/projects/?search=${term}`).then(res => setProjectSearchResults(res.data.results || res.data)).catch(() => {});
       }
    }, 300);
    return () => clearTimeout(timer);
  }, [projectSearchTerm, activeProjectDropdown]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (items.length === 0) {
      toast.error('At least one material must be added.');
      return;
    }
    const invalidItem = items.find(i => !i.material_input || !i.quantity || !i.rate || !i.unit);
    if (invalidItem) {
      toast.error('All material rows must have a Product, Quantity, Unit and Per Unit Price.');
      return;
    }
    setSaving(true);
    try {
      const payloadItems = items.map(i => {
         const mat = inventoryMaterials.find(m => m.material_name.toLowerCase() === i.material_input.toLowerCase());
         return {
            material: mat ? mat.id : null,
            custom_material_name: mat ? '' : i.material_input,
            quantity: i.quantity,
            unit: i.unit,
            rate: i.rate
         };
      });
      await api.post('/projects/boqs/', { ...form, items_data: payloadItems });
      toast.success('BOQ created successfully.');
      setShowModal(false);
      setForm({ project: '', bill_date: getTodayDateString() });
      setItems([]);
      fetchData();
    } catch (err) {
      const msg = err.response?.data?.project?.[0] || 
                  (err.response?.data ? JSON.stringify(err.response.data) : 'Failed to create BOQ.');
      toast.error(msg);
    } finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this BOQ?')) return;
    try {
      await api.delete(`/projects/boqs/${id}/`);
      toast.success('BOQ deleted.');
      fetchData();
    } catch { toast.error('Failed to delete BOQ.'); }
  };

  const handleAddItem = () => {
    setItems([...items, { material_input: '', quantity: '', unit: '', rate: '', total: 0 }]);
    setActiveDropdown(null);
  };

  const handleRemoveItem = (index) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...items];
    const item = { ...newItems[index], [field]: value };
    
    if (field === 'material_input') {
      const mat = inventoryMaterials.find(m => m.material_name.toLowerCase() === value.toLowerCase());
      if (mat) {
        item.unit = mat.unit;
      }
      
      if (materialSearchTimeout.current) clearTimeout(materialSearchTimeout.current);
      materialSearchTimeout.current = setTimeout(() => {
        if (value.trim()) {
          api.get(`/inventory/materials/?search=${value.trim()}`).then(res => {
            const newMats = res.data.results || res.data;
            setInventoryMaterials(prev => {
              const map = new Map(prev.map(m => [m.id, m]));
              newMats.forEach(m => map.set(m.id, m));
              return Array.from(map.values());
            });
          }).catch(() => {});
        }
      }, 300);
    }
    
    if (field === 'quantity' || field === 'rate') {
      const qty = parseFloat(item.quantity) || 0;
      const rate = parseFloat(item.rate) || 0;
      item.total = qty * rate;
    }
    
    newItems[index] = item;
    setItems(newItems);
  };
  
  const grandTotal = items.reduce((sum, item) => sum + (item.total || 0), 0);

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB'); // DD/MM/YYYY format
  };

  const PaginationControls = () => {
    if (totalPages <= 1) return null;
    return (
      <div className="d-flex justify-content-between align-items-center p-3 border-top bg-white">
        <span className="text-muted small">Showing page {currentPage} of {totalPages}</span>
        <nav>
          <ul className="pagination pagination-sm mb-0">
            <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
              <button className="page-link" onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}>Previous</button>
            </li>
            {[...Array(totalPages)].map((_, idx) => (
              <li key={idx} className={`page-item ${currentPage === idx + 1 ? 'active' : ''}`}>
                <button className="page-link" onClick={() => setCurrentPage(idx + 1)}>{idx + 1}</button>
              </li>
            ))}
            <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
              <button className="page-link" onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}>Next</button>
            </li>
          </ul>
        </nav>
      </div>
    );
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="fw-bold mb-0">Bill of Quantities</h2>
        <div className="d-flex align-items-center gap-2">
          <BackToWorkCenter />
          {hasPermission('boq.create') && (
            <button className="btn btn-primary d-flex align-items-center gap-2" onClick={() => setShowModal(true)}>
              <FiPlus /> New BOQ
            </button>
          )}
        </div>
      </div>

      <div className="card border-0 mb-4 shadow-sm">
        <div className="card-header bg-white border-bottom-0 pt-4 pb-3 d-flex justify-content-between align-items-center">
          <div className="d-flex gap-3 w-100 flex-wrap align-items-center">
            <div className="input-group" style={{ maxWidth: '360px', minWidth: '240px' }}>
              <span className="input-group-text bg-white">
                <FiSearch className="text-muted" />
              </span>
              <input 
                type="text" 
                className="form-control border-start-0 ps-0" 
                placeholder="Search by Bill No or Project Name..." 
                value={searchTerm}
                onChange={handleSearch}
              />
            </div>
            <div className="input-group" style={{ maxWidth: '240px', minWidth: '180px' }}>
              <span className="input-group-text bg-white">
                <FiCalendar className="text-muted" />
              </span>
              <input 
                type="date" 
                className="form-control border-start-0 ps-0" 
                placeholder="Search by Date"
                title="Search by Date"
                value={selectedDate}
                onChange={handleDateChange}
              />
            </div>
            {(searchTerm || selectedDate) && (
              <button 
                type="button"
                className="btn btn-link text-danger p-0 text-decoration-none small d-flex align-items-center gap-1"
                onClick={handleClearFilters}
              >
                <FiX /> Clear Filters
              </button>
            )}
          </div>
        </div>
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover mb-0 align-middle">
              <thead className="table-light">
                <tr>
                  <th>S.NO</th>
                  <th>Date</th>
                  <th>Bill Number</th>
                  <th>Project</th>
                  <th>Total Value</th>
                  <th>Items</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={7} className="text-center py-5 text-muted">Loading...</td></tr>
                ) : boqs.length === 0 ? (
                  <tr><td colSpan={7} className="text-center py-5 text-muted">No BOQs found.</td></tr>
                ) : boqs.map((boq, index) => (
                  <tr key={boq.id}>
                    <td><span className="fw-medium text-muted">{(currentPage - 1) * 10 + index + 1}</span></td>
                    <td>{formatDate(boq.bill_date)}</td>
                    <td><span className="fw-semibold">{boq.boq_number}</span></td>
                    <td>{boq.project_name}</td>
                    <td>₹{Number(boq.total_value || 0).toLocaleString('en-IN')}</td>
                    <td><span className="badge bg-primary bg-opacity-10 text-primary">{boq.items?.length || 0} items</span></td>
                    <td>
                      <div className="d-flex gap-2">
                        <Link to={`/boq/${boq.id}`} className="btn btn-sm btn-light text-primary" title="View"><FiEye /></Link>
                        {hasPermission('boq.edit') && (
                          <button className="btn btn-sm btn-light text-danger" onClick={() => handleDelete(boq.id)} title="Delete"><FiTrash2 /></button>
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
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title fw-bold">Create BOQ</h5>
                <button className="btn-close" onClick={() => setShowModal(false)} />
              </div>
              <form onSubmit={handleSubmit}>
                <div className="modal-body">
                  <div className="row g-3">
                    <div className="col-md-4">
                      <label className="form-label fw-semibold">Project *</label>
                      <div className="position-relative">
                        <input
                          type="text"
                          className="form-control"
                          required
                          placeholder="Search Project..."
                          value={selectedProjectName || projectSearchTerm}
                          onChange={(e) => {
                            setProjectSearchTerm(e.target.value);
                            setSelectedProjectName('');
                            setForm(f => ({ ...f, project: '' }));
                            setActiveProjectDropdown(true);
                          }}
                          onClick={() => setActiveProjectDropdown(true)}
                          onBlur={() => setTimeout(() => setActiveProjectDropdown(false), 200)}
                          autoComplete="off"
                        />
                        {activeProjectDropdown && (
                          <div className="dropdown-menu show w-100 position-absolute shadow-sm" style={{ top: '100%', left: 0, zIndex: 1050, maxHeight: '200px', overflowY: 'auto', padding: '4px 0', marginTop: '2px' }}>
                            {projectSearchResults.map(p => (
                              <button
                                key={p.id}
                                type="button"
                                className="dropdown-item py-1 small"
                                onMouseDown={(e) => {
                                  e.preventDefault();
                                  setForm(f => ({ ...f, project: p.id }));
                                  setSelectedProjectName(p.project_name);
                                  setProjectSearchTerm('');
                                  setActiveProjectDropdown(false);
                                }}
                              >
                                {p.project_name}
                              </button>
                            ))}
                            {projectSearchResults.length === 0 && (
                              <div className="dropdown-item text-muted small disabled py-1">No projects found</div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="col-md-4">
                      <label className="form-label fw-semibold">BOQ Number *</label>
                      <input type="text" className="form-control bg-light" disabled value="Auto-generated upon save" />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label fw-semibold">Bill Date *</label>
                      <input type="date" className="form-control" required value={form.bill_date} onChange={e => setForm(f => ({ ...f, bill_date: e.target.value }))} />
                    </div>
                    
                    <div className="col-12 mt-4">
                      <h6 className="fw-bold mb-3 border-bottom pb-2">Required Materials</h6>
                      
                      <div className="table-responsive mb-3">
                        <table className="table table-bordered table-sm align-middle">
                          <thead className="table-light">
                            <tr>
                              <th style={{ width: '25%' }}>Product Name</th>
                              <th style={{ width: '12%' }}>Quantity</th>
                              <th style={{ width: '18%' }}>Unit</th>
                              <th style={{ width: '20%' }}>Per Unit Price</th>
                              <th style={{ width: '20%' }}>Total Cost</th>
                              <th style={{ width: '5%' }} className="text-center">Action</th>
                            </tr>
                          </thead>
                          <tbody>
                            {items.length === 0 ? (
                              <tr>
                                <td colSpan={6} className="text-center text-muted py-3">No materials added yet.</td>
                              </tr>
                            ) : items.map((item, index) => (
                              <tr key={index}>
                                <td>
                                  <div className="position-relative">
                                    <input 
                                      type="text"
                                      className="form-control form-control-sm" 
                                      required 
                                      placeholder="Search/Type Material"
                                      value={item.material_input} 
                                      onChange={(e) => {
                                        handleItemChange(index, 'material_input', e.target.value);
                                        setActiveDropdown(`material-${index}`);
                                      }}
                                      onClick={() => setActiveDropdown(`material-${index}`)}
                                      onBlur={() => setTimeout(() => setActiveDropdown(null), 200)}
                                      autoComplete="off"
                                    />
                                    {activeDropdown === `material-${index}` && (
                                      <div className="dropdown-menu show w-100 position-absolute shadow-sm" style={{ top: '100%', left: 0, zIndex: 1050, maxHeight: '200px', overflowY: 'auto', padding: '4px 0', marginTop: '2px' }}>
                                        {Array.from(new Set([
                                            ...inventoryMaterials.map(m => m.material_name),
                                            'Cement', 'Sand', 'Steel', 'Bricks', 'Concrete', 'Aggregate', 'Gravel', 'M-Sand', 'P-Sand', 'Jelly', 'Blue Metal', 'Blocks', 'Fly Ash', 'Tiles', 'Marble', 'Granite', 'Wood', 'Plywood', 'Glass', 'PVC Pipe', 'GI Pipe', 'CPVC Pipe', 'UPVC Pipe', 'Electrical Cable', 'Binding Wire', 'Nails', 'Paint', 'Primer', 'Waterproofing Material', 'Bitumen', 'Admixture'
                                          ]))
                                          .filter(name => name.toLowerCase().includes(item.material_input.toLowerCase()))
                                          .map(name => (
                                            <button 
                                              key={name} 
                                              type="button" 
                                              className="dropdown-item py-1 small" 
                                              onMouseDown={(e) => {
                                                e.preventDefault();
                                                handleItemChange(index, 'material_input', name);
                                                setActiveDropdown(null);
                                              }}
                                            >
                                              {name}
                                            </button>
                                          ))}
                                          {Array.from(new Set([...inventoryMaterials.map(m => m.material_name), 'Cement', 'Sand', 'Steel', 'Bricks', 'Concrete', 'Aggregate', 'Gravel', 'M-Sand', 'P-Sand', 'Jelly', 'Blue Metal', 'Blocks', 'Fly Ash', 'Tiles', 'Marble', 'Granite', 'Wood', 'Plywood', 'Glass', 'PVC Pipe', 'GI Pipe', 'CPVC Pipe', 'UPVC Pipe', 'Electrical Cable', 'Binding Wire', 'Nails', 'Paint', 'Primer', 'Waterproofing Material', 'Bitumen', 'Admixture']))
                                            .filter(name => name.toLowerCase().includes(item.material_input.toLowerCase())).length === 0 && (
                                              <div className="dropdown-item text-muted small disabled py-1">No matching suggestions</div>
                                          )}
                                      </div>
                                    )}
                                  </div>
                                </td>
                                <td>
                                  <input type="number" className="form-control form-control-sm" required min="0.01" step="0.01" value={item.quantity} onChange={(e) => handleItemChange(index, 'quantity', e.target.value)} />
                                </td>
                                <td>
                                  <div className="position-relative">
                                    <input 
                                      type="text"
                                      className="form-control form-control-sm" 
                                      required 
                                      placeholder="Search/Type Unit"
                                      value={item.unit} 
                                      onChange={(e) => {
                                        handleItemChange(index, 'unit', e.target.value);
                                        setActiveDropdown(`unit-${index}`);
                                      }}
                                      onClick={() => setActiveDropdown(`unit-${index}`)}
                                      onBlur={() => setTimeout(() => setActiveDropdown(null), 200)}
                                      autoComplete="off"
                                    />
                                    {activeDropdown === `unit-${index}` && (
                                      <div className="dropdown-menu show w-100 position-absolute shadow-sm" style={{ top: '100%', left: 0, zIndex: 1050, maxHeight: '200px', overflowY: 'auto', padding: '4px 0', marginTop: '2px' }}>
                                        {['Bags', 'Kg', 'Gram', 'Ton', 'Nos', 'Pieces', 'Meter', 'Feet', 'Sq.ft', 'Sq.m', 'Cu.ft', 'Cu.m', 'Liter', 'Litre', 'Bundle', 'Roll', 'Box', 'Set', 'Pair', 'Load']
                                          .filter(u => u.toLowerCase().includes(item.unit.toLowerCase()))
                                          .map(u => (
                                            <button 
                                              key={u} 
                                              type="button" 
                                              className="dropdown-item py-1 small" 
                                              onMouseDown={(e) => {
                                                e.preventDefault();
                                                handleItemChange(index, 'unit', u);
                                                setActiveDropdown(null);
                                              }}
                                            >
                                              {u}
                                            </button>
                                          ))}
                                          {['Bags', 'Kg', 'Gram', 'Ton', 'Nos', 'Pieces', 'Meter', 'Feet', 'Sq.ft', 'Sq.m', 'Cu.ft', 'Cu.m', 'Liter', 'Litre', 'Bundle', 'Roll', 'Box', 'Set', 'Pair', 'Load']
                                            .filter(u => u.toLowerCase().includes(item.unit.toLowerCase())).length === 0 && (
                                              <div className="dropdown-item text-muted small disabled py-1">No matching suggestions</div>
                                          )}
                                      </div>
                                    )}
                                  </div>
                                </td>
                                <td>
                                  <div className="input-group input-group-sm">
                                    <span className="input-group-text">₹</span>
                                    <input type="number" className="form-control" required min="0" step="0.01" value={item.rate} onChange={(e) => handleItemChange(index, 'rate', e.target.value)} />
                                  </div>
                                </td>
                                <td>
                                  <div className="input-group input-group-sm">
                                    <span className="input-group-text">₹</span>
                                    <input type="text" className="form-control bg-light fw-bold" readOnly value={item.total.toLocaleString('en-IN', { maximumFractionDigits: 2 })} />
                                  </div>
                                </td>
                                <td className="text-center">
                                  <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => handleRemoveItem(index)}><FiTrash2 /></button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      
                      <div className="d-flex justify-content-between align-items-center">
                        <button type="button" className="btn btn-sm btn-secondary d-flex align-items-center gap-1" onClick={handleAddItem}>
                          <FiPlus /> Add Material
                        </button>
                        <h5 className="mb-0 fw-bold text-primary">
                          Total BOQ Estimated Cost: ₹{grandTotal.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                        </h5>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-light" onClick={() => setShowModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Create BOQ'}</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BOQList;
