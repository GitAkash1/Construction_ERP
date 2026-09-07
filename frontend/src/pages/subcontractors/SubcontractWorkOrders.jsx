import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import DataTable from '../../components/DataTable';
import api from '../../services/api';
import { toast } from 'react-toastify';
import { FiPlus, FiEye, FiCheck, FiX } from 'react-icons/fi';
import BackToWorkCenter from '../../components/BackToWorkCenter';
import { useAuth } from '../../context/AuthContext';

const SubcontractWorkOrders = () => {
  const { hasPermission } = useAuth();
  const [workOrders, setWorkOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState([]);
  const [subcontractors, setSubcontractors] = useState([]);
  const [stockItems, setStockItems] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [availableQty, setAvailableQty] = useState(null);
  const [loadingAvailableQty, setLoadingAvailableQty] = useState(false);
  const [form, setForm] = useState({
    project: '',
    boq_item: '',
    subcontractor: '',
    work_description: '',
    contract_quantity: '',
    unit: '',
    rate: '',
    work_area: '',
    planned_completion_date: ''
  });

  // Filter States
  const [currentPage, setCurrentPage] = useState(1);
  const [tableProjectSearch, setTableProjectSearch] = useState('');
  const [showTableProjectDropdown, setShowTableProjectDropdown] = useState(false);
  const [selectedTableProject, setSelectedTableProject] = useState(null);
  const tableProjectComboboxRef = useRef(null);
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (tableProjectComboboxRef.current && !tableProjectComboboxRef.current.contains(event.target)) {
        setShowTableProjectDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    fetchWorkOrders();
    fetchDropdowns();
  }, []);

  const fetchWorkOrders = async () => {
    try {
      setLoading(true);
      const res = await api.get('/subcontractors/work-orders/');
      setWorkOrders(res.data.results || res.data);
    } catch (err) {
      toast.error('Failed to load work orders');
    } finally {
      setLoading(false);
    }
  };

  const fetchDropdowns = async () => {
    try {
      const [projRes, subRes] = await Promise.all([
        api.get('/projects/projects/all/'),
        api.get('/subcontractors/subcontractors/all/')
      ]);
      setProjects(projRes.data.results || projRes.data);
      setSubcontractors(subRes.data.results || subRes.data);
    } catch (err) {
      toast.error('Failed to load dropdowns');
    }
  };

  const fetchStockItems = async (projectId) => {
    try {
      if (!projectId) {
        setStockItems([]);
        return;
      }
      const res = await api.get(`/inventory/project-stock/?project=${projectId}`);
      const items = res.data.results || res.data;
      const eligible = items.filter(item => Number(item.available_for_work_order) > 0);
      setStockItems(eligible);
    } catch (err) {
      toast.error('Failed to load stock items');
    }
  };

  const handleInputChange = async (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    if (name === 'project') {
      fetchStockItems(value);
      setForm(prev => ({ ...prev, boq_item: '', unit: '' }));
      setAvailableQty(null);
    }
    if (name === 'boq_item') {
      setAvailableQty(null);
      if (!value) return;
      const item = stockItems.find(i => String(i.boq_item) === String(value));
      if (item) {
        setForm(prev => ({ ...prev, unit: item.material_unit }));
        setAvailableQty(Number(item.available_for_work_order));
      }
    }
  };

  const handleOpenModal = () => {
    setForm({
      project: '',
      boq_item: '',
      subcontractor: '',
      work_description: '',
      contract_quantity: '',
      unit: '',
      rate: '',
      work_area: '',
      planned_completion_date: ''
    });
    setStockItems([]);
    setAvailableQty(null);
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.boq_item && availableQty !== null && Number(form.contract_quantity) > availableQty) {
      const item = stockItems.find(i => String(i.boq_item) === String(form.boq_item));
      const matName = item ? item.material_name : 'selected material';
      toast.error(`Insufficient stock. Only ${availableQty} ${form.unit || ''} of ${matName} are currently available for this project.`);
      return;
    }
    try {
      await api.post('/subcontractors/work-orders/', form);
      toast.success('Work Order created successfully');
      setShowModal(false);
      fetchWorkOrders();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to create work order');
    }
  };

  const handleIssue = async (id) => {
    if (!window.confirm('Are you sure you want to issue this Work Order?')) return;
    try {
      await api.post(`/subcontractors/work-orders/${id}/issue/`);
      toast.success('Work Order issued successfully');
      fetchWorkOrders();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to issue');
    }
  };

  const handleCancel = async (id) => {
    if (!window.confirm('Are you sure you want to cancel this Work Order?')) return;
    try {
      await api.post(`/subcontractors/work-orders/${id}/cancel/`);
      toast.success('Work Order cancelled successfully');
      fetchWorkOrders();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to cancel');
    }
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

  const handleStatusFilterChange = (e) => {
    setStatusFilter(e.target.value);
    setCurrentPage(1);
  };

  const filteredWorkOrders = workOrders.filter(wo => {
    const projectMatch = selectedTableProject ? wo.project_name === selectedTableProject.project_name : true;
    const statusMatch = statusFilter ? wo.status === statusFilter : true;
    return projectMatch && statusMatch;
  });

  const pageSize = 10;
  const totalPages = Math.ceil(filteredWorkOrders.length / pageSize) || 1;
  const validCurrentPage = currentPage > totalPages ? Math.max(totalPages, 1) : currentPage;
  const startIndex = (validCurrentPage - 1) * pageSize;
  const paginatedWorkOrders = filteredWorkOrders.slice(startIndex, startIndex + pageSize);

  const dropdownProjects = projects.filter(p => p.project_name?.toLowerCase().includes(tableProjectSearch.toLowerCase()));
  const uniqueStatuses = Array.from(new Set(workOrders.map(w => w.status).filter(Boolean)));

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

  const columns = [
    { 
      header: 'WO Number', 
      render: (row) => <span className="fw-semibold">{row.work_order_number}</span> 
    },
    { header: 'Project', accessor: 'project_name' },
    { header: 'Subcontractor', accessor: 'subcontractor_name' },
    { 
      header: 'Description', 
      render: (row) => (
        <div className="text-truncate" style={{ maxWidth: '200px' }} title={row.work_description}>
          {row.work_description || '—'}
        </div>
      ) 
    },
    { 
      header: 'Contract Value', 
      render: (row) => `₹${Number(row.contract_value || 0).toLocaleString('en-IN')}`
    },
    {
      header: 'Progress',
      render: (row) => (
        <span className="badge bg-info bg-opacity-10 text-info fw-semibold">
          {row.progress_percentage || 0}%
        </span>
      )
    },
    {
      header: 'Planned Completion',
      render: (row) => row.planned_completion_date || '—'
    },
    { 
      header: 'Status', 
      render: (row) => {
        const colors = {
          'Draft': 'bg-secondary bg-opacity-10 text-secondary',
          'Issued': 'bg-primary bg-opacity-10 text-primary',
          'In Progress': 'bg-warning bg-opacity-10 text-dark',
          'Completed': 'bg-success bg-opacity-10 text-success',
          'Cancelled': 'bg-danger bg-opacity-10 text-danger'
        };
        return <span className={`badge ${colors[row.status] || 'bg-secondary'}`}>{row.status}</span>;
      }
    },
    {
      header: 'Actions',
      render: (row) => (
        <div className="d-flex gap-2">
          <Link to={`/subcontractors/work-orders/${row.id}`} className="btn btn-sm btn-light text-primary" title="View Details">
            <FiEye />
          </Link>
          {row.status === 'Draft' && hasPermission('work_orders.edit') && (
            <>
              <button className="btn btn-sm btn-light text-success" onClick={() => handleIssue(row.id)} title="Issue Work Order">
                <FiCheck />
              </button>
              <button className="btn btn-sm btn-light text-danger" onClick={() => handleCancel(row.id)} title="Cancel Work Order">
                <FiX />
              </button>
            </>
          )}
        </div>
      )
    }
  ];

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="fw-bold mb-0">Subcontract Work Orders</h2>
          <p className="text-muted mb-0">Manage subcontractor agreements and work scope</p>
        </div>
        <div className="d-flex align-items-center gap-2">
          <BackToWorkCenter />
          {hasPermission('work_orders.create') && (
            <button className="btn btn-primary d-flex align-items-center gap-2" onClick={handleOpenModal}>
              <FiPlus /> Create Work Order
            </button>
          )}
        </div>
      </div>

      <div className="d-flex align-items-center gap-3 mb-4">
        <div style={{ width: '300px', position: 'relative' }} ref={tableProjectComboboxRef}>
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
            <ul className="list-group list-group-flush border position-absolute w-100 shadow-sm bg-white" style={{ zIndex: 1000, maxHeight: '200px', overflowY: 'auto', borderRadius: '0 0 0.375rem 0.375rem' }}>
              {dropdownProjects.length > 0 ? (
                dropdownProjects.map(p => (
                  <li
                    key={p.id}
                    className="list-group-item list-group-item-action py-2"
                    style={{ cursor: 'pointer' }}
                    onClick={() => handleSelectTableProject(p)}
                  >
                    {p.project_name}
                  </li>
                ))
              ) : (
                <li className="list-group-item text-muted py-2">No projects found</li>
              )}
            </ul>
          )}
        </div>

        <div className="d-flex align-items-center">
          <select 
            className="form-select"
            value={statusFilter}
            onChange={handleStatusFilterChange}
            style={{ width: '200px' }}
          >
            <option value="">All Status</option>
            {uniqueStatuses.map(status => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="card border-0 mb-4 shadow-sm">
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  {columns.map((col, index) => (
                    <th key={index}>{col.header}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={columns.length} className="text-center py-5 text-muted">
                      <div className="spinner-border spinner-border-sm me-2" role="status"></div>
                      Loading data...
                    </td>
                  </tr>
                ) : paginatedWorkOrders.length === 0 ? (
                  <tr>
                    <td colSpan={columns.length} className="text-center py-5 text-muted">
                      No records found.
                    </td>
                  </tr>
                ) : (
                  paginatedWorkOrders.map((row, rowIndex) => (
                    <tr key={row.id || rowIndex}>
                      {columns.map((col, colIndex) => (
                        <td key={colIndex}>
                          {col.render ? col.render(row, rowIndex) : (typeof col.accessor === 'function' ? col.accessor(row, rowIndex) : row[col.accessor])}
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <PaginationControls />
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Create Work Order</h5>
                <button type="button" className="btn-close" onClick={() => setShowModal(false)}></button>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="modal-body">
                  <div className="row g-3">
                    <div className="col-md-6">
                      <label className="form-label">Project *</label>
                      <select className="form-select" name="project" value={form.project} onChange={handleInputChange} required>
                        <option value="">Select Project</option>
                        {projects.map(p => <option key={p.id} value={p.id}>{p.project_name}</option>)}
                      </select>
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Subcontractor *</label>
                      <select className="form-select" name="subcontractor" value={form.subcontractor} onChange={handleInputChange} required>
                        <option value="">Select Subcontractor</option>
                        {subcontractors.map(s => <option key={s.id} value={s.id}>{s.subcontractor_name}</option>)}
                      </select>
                    </div>
                    <div className="col-12">
                      <label className="form-label">Stock Item *</label>
                      <select className="form-select" name="boq_item" value={form.boq_item} onChange={handleInputChange} required>
                        <option value="">Select Stock Item</option>
                        {stockItems.map(s => (
                          <option key={s.boq_item} value={s.boq_item}>
                            {s.material_name} ({s.material_unit})
                          </option>
                        ))}
                      </select>
                      {form.boq_item && (
                        <div className="form-text text-muted mt-1 d-flex align-items-center">
                          <strong>Available Stock:</strong>&nbsp;
                          <span className={availableQty <= 0 ? 'text-danger fw-semibold' : 'text-success fw-semibold'}>
                            {availableQty !== null ? `${availableQty} ${form.unit}` : '—'}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="col-12">
                      <label className="form-label">Work Description *</label>
                      <textarea className="form-control" name="work_description" rows="2" value={form.work_description} onChange={handleInputChange} required></textarea>
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">Contract Quantity *</label>
                      <input 
                        type="number" 
                        step="0.01" 
                        className={`form-control ${availableQty !== null && Number(form.contract_quantity) > availableQty ? 'is-invalid' : ''}`}
                        name="contract_quantity" 
                        value={form.contract_quantity} 
                        onChange={handleInputChange} 
                        required 
                        min="0.01" 
                      />
                      {availableQty !== null && (
                        <div className="form-text mt-1 text-muted">
                          Available Stock: <strong>{availableQty} {form.unit || ''}</strong>
                        </div>
                      )}
                      {availableQty !== null && Number(form.contract_quantity) > availableQty && (
                        <div className="invalid-feedback">
                          Contract quantity cannot exceed the available stock quantity of {availableQty} {form.unit || ''}.
                        </div>
                      )}
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">Unit *</label>
                      <input type="text" className="form-control" name="unit" value={form.unit} onChange={handleInputChange} required />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">Rate (₹) *</label>
                      <input type="number" step="0.01" className="form-control" name="rate" value={form.rate} onChange={handleInputChange} required min="0" />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Work Area</label>
                      <input type="text" className="form-control" name="work_area" value={form.work_area} onChange={handleInputChange} placeholder="e.g. Ground Floor" />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Planned Completion</label>
                      <input type="date" className="form-control" name="planned_completion_date" value={form.planned_completion_date} onChange={handleInputChange} />
                    </div>
                    
                    <div className="col-12">
                      <div className="alert alert-info py-2 mb-0">
                        <strong>Calculated Contract Value:</strong> ₹{Number((form.contract_quantity || 0) * (form.rate || 0)).toLocaleString('en-IN', {minimumFractionDigits: 2})}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary">Create</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SubcontractWorkOrders;
