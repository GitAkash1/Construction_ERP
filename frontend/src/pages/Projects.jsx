import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FiPlus, FiEye, FiTrash2, FiSearch, FiFilter, FiX } from 'react-icons/fi';
import { BsPencilSquare } from 'react-icons/bs';
import DataTable from '../components/DataTable';
import StatusBadge from '../components/StatusBadge';
import api from '../services/api';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';
import BackToWorkCenter from '../components/BackToWorkCenter';

const Projects = () => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user, hasPermission } = useAuth();
  
  // Filter & Pagination States
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [minContractValue, setMinContractValue] = useState('');
  const [maxContractValue, setMaxContractValue] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Filter Options from Backend
  const [projectNames, setProjectNames] = useState([]);
  const [locations, setLocations] = useState([]);
  
  // UI States
  const [showSuggestions, setShowSuggestions] = useState(false);
  
  // Modal & Form States
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState(null);
  
  // View Modal State
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);

  const handleViewClick = (project) => {
    setSelectedProject(project);
    setShowViewModal(true);
  };

  const handleViewModalClose = () => {
    setShowViewModal(false);
    setSelectedProject(null);
  };
  
  const [form, setForm] = useState({
    project_code: '',
    project_name: '',
    client_name: '',
    client_mobile: '',
    project_location: '',
    project_description: '',
    client_address: '',
    start_date: '',
    expected_end_date: '',
    estimated_budget: 0,
    status: 'Planned'
  });

  useEffect(() => {
    fetchFilterOptions();
  }, []);

  useEffect(() => {
    fetchProjects();
  }, [searchTerm, statusFilter, locationFilter, minContractValue, maxContractValue, currentPage]);

  const fetchFilterOptions = async () => {
    try {
      const response = await api.get('/projects/projects/filters_data/');
      setProjectNames(response.data.project_names || []);
      setLocations(response.data.locations || []);
    } catch (error) {
      console.error('Failed to fetch filter options', error);
    }
  };

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (statusFilter) params.append('status', statusFilter);
      if (locationFilter) params.append('project_location', locationFilter);
      if (minContractValue) params.append('min_contract_value', minContractValue);
      if (maxContractValue) params.append('max_contract_value', maxContractValue);
      params.append('page', currentPage);
      
      const response = await api.get(`/projects/projects/?${params.toString()}`);
      setProjects(response.data.results || response.data);
      
      if (response.data.count !== undefined) {
        setTotalPages(Math.ceil(response.data.count / 5));
      }
    } catch (error) {
      toast.error('Failed to load projects.');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const deleteProject = async (id) => {
    if (window.confirm('Are you sure you want to delete this project?')) {
      try {
        await api.delete(`/projects/projects/${id}/`);
        toast.success('Project deleted successfully.');
        fetchProjects();
        fetchFilterOptions();
      } catch (error) {
        toast.error('Failed to delete project.');
      }
    }
  };
  
  const handleEditClick = (project) => {
    setForm({
      project_code: project.project_code,
      project_name: project.project_name,
      client_name: project.client_name,
      client_mobile: project.client_mobile || '',
      project_location: project.project_location,
      project_description: project.project_description || '',
      client_address: project.client_address || '',
      start_date: project.start_date,
      expected_end_date: project.expected_end_date,
      estimated_budget: project.estimated_budget,
      status: project.status
    });
    setEditId(project.id);
    setIsEditing(true);
    setShowModal(true);
  };
  
  const resetForm = () => {
    setForm({
      project_code: '',
      project_name: '',
      client_name: '',
      client_mobile: '',
      project_location: '',
      project_description: '',
      client_address: '',
      start_date: '',
      expected_end_date: '',
      estimated_budget: 0,
      status: 'Planned'
    });
    setIsEditing(false);
    setEditId(null);
  };
  
  const handleModalClose = () => {
    setShowModal(false);
    resetForm();
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (isEditing) {
        await api.put(`/projects/projects/${editId}/`, form);
        toast.success('Project updated successfully.');
      } else {
        await api.post('/projects/projects/', form);
        toast.success('Project created successfully.');
      }
      setShowModal(false);
      resetForm();
      fetchProjects();
      fetchFilterOptions();
    } catch (err) {
      toast.error(err.response?.data?.error || JSON.stringify(err.response?.data) || `Failed to ${isEditing ? 'update' : 'create'} project.`);
    } finally {
      setSaving(false);
    }
  };

  const updateFilter = (setter, value) => {
    setter(value);
    setCurrentPage(1); // Reset to page 1 on filter change
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    setStatusFilter('');
    setLocationFilter('');
    setMinContractValue('');
    setMaxContractValue('');
    setCurrentPage(1);
  };

  const filteredSuggestions = projectNames.filter(name => 
    name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const columns = [
    { 
      header: 'S.NO', 
      render: (row, index) => <span className="fw-medium text-muted">{(currentPage - 1) * 5 + index + 1}</span> 
    },
    { header: 'Code', accessor: 'project_code', render: (row) => <span className="fw-semibold text-dark">{row.project_code}</span> },
    { header: 'Project Name', accessor: 'project_name', render: (row) => <span className="fw-medium text-dark">{row.project_name}</span> },
    { header: 'Location', accessor: 'project_location', render: (row) => <span className="text-muted">{row.project_location}</span> },
    { header: 'Status', accessor: 'status', render: (row) => <StatusBadge status={row.status} /> },
    { 
      header: 'Contract Value', 
      accessor: 'estimated_budget',
      render: (row) => (
        <span className="fw-medium text-success">
          ₹{new Intl.NumberFormat('en-IN').format(row.estimated_budget)}
        </span>
      )
    },
    { 
      header: 'Actions', 
      render: (row) => (
        <div className="d-flex gap-2">
          <button 
            type="button" 
            className="btn btn-sm btn-light text-primary shadow-sm rounded-2" 
            onClick={() => handleViewClick(row)}
            title="View Details"
          >
            <FiEye />
          </button>
          {hasPermission('projects.edit') && (
            <button className="btn btn-sm btn-light text-warning shadow-sm rounded-2" onClick={() => handleEditClick(row)}>
              <BsPencilSquare />
            </button>
          )}
          {hasPermission('projects.delete') && (
            <button className="btn btn-sm btn-light text-danger shadow-sm rounded-2" onClick={() => deleteProject(row.id)}>
              <FiTrash2 />
            </button>
          )}
        </div>
      ) 
    },
  ];

  const PaginationControls = () => {
    if (totalPages <= 1) return null;
    return (
      <div className="d-flex justify-content-between align-items-center mt-4 mb-2 px-1">
        <span className="text-muted small fw-medium">Showing page {currentPage} of {totalPages}</span>
        <nav>
          <ul className="pagination pagination-sm mb-0 shadow-sm">
            <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
              <button className="page-link rounded-start-3" onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}>Previous</button>
            </li>
            {[...Array(totalPages)].map((_, idx) => (
              <li key={idx} className={`page-item ${currentPage === idx + 1 ? 'active' : ''}`}>
                <button className="page-link" onClick={() => setCurrentPage(idx + 1)}>{idx + 1}</button>
              </li>
            ))}
            <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
              <button className="page-link rounded-end-3" onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}>Next</button>
            </li>
          </ul>
        </nav>
      </div>
    );
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="fw-bold mb-0 text-dark">Projects</h2>
        <div className="d-flex align-items-center gap-2">
          <BackToWorkCenter />
          {hasPermission('projects.create') && (
            <button className="btn btn-primary shadow-sm rounded-3 d-flex align-items-center gap-2" onClick={() => setShowModal(true)}>
              <FiPlus /> New Project
            </button>
          )}
        </div>
      </div>

      {/* Filter Bar */}
      <div className="card border-0 shadow-sm rounded-4 mb-4 bg-white">
        <div className="card-body p-4">
          <div className="d-flex align-items-center mb-3">
            <FiFilter className="text-primary me-2" />
            <h6 className="mb-0 fw-bold text-dark">Search & Filter</h6>
            {(searchTerm || statusFilter || locationFilter || minContractValue || maxContractValue) && (
              <button className="btn btn-link btn-sm text-danger text-decoration-none ms-auto d-flex align-items-center gap-1 p-0" onClick={handleClearFilters}>
                <FiX /> Clear Filters
              </button>
            )}
          </div>
          
          <div className="row g-3">
            {/* Project Search (Hybrid) */}
            <div className="col-md-4 position-relative">
              <label className="form-label small text-muted fw-semibold">Project Name</label>
              <div className="input-group">
                <span className="input-group-text bg-light border-end-0 rounded-start-3">
                  <FiSearch className="text-muted" />
                </span>
                <input 
                  type="text"
                  className="form-control bg-light border-start-0 ps-0 rounded-end-3"
                  placeholder="Type to search..."
                  value={searchTerm}
                  onChange={(e) => updateFilter(setSearchTerm, e.target.value)}
                  onFocus={() => setShowSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                />
              </div>
              {showSuggestions && (searchTerm || projectNames.length > 0) && (
                <ul className="list-group position-absolute w-100 mt-1 shadow-lg border-0 rounded-3" style={{ zIndex: 1000, maxHeight: '200px', overflowY: 'auto' }}>
                  {filteredSuggestions.length > 0 ? (
                    filteredSuggestions.map((name, idx) => (
                      <li 
                        key={idx} 
                        className="list-group-item list-group-item-action border-0 px-3 py-2 text-dark"
                        style={{ cursor: 'pointer', fontSize: '0.9rem' }}
                        onClick={() => {
                          updateFilter(setSearchTerm, name);
                          setShowSuggestions(false);
                        }}
                      >
                        {name}
                      </li>
                    ))
                  ) : (
                    <li className="list-group-item border-0 px-3 py-2 text-muted small">No suggestions found</li>
                  )}
                </ul>
              )}
            </div>

            {/* Status Filter */}
            <div className="col-md-2">
              <label className="form-label small text-muted fw-semibold">Status</label>
              <select className="form-select bg-light rounded-3 border-light" value={statusFilter} onChange={(e) => updateFilter(setStatusFilter, e.target.value)}>
                <option value="">All</option>
                <option value="Planned">Planned</option>
                <option value="Active">Active</option>
                <option value="On Hold">On Hold</option>
                <option value="Completed">Completed</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>

            {/* Location Filter */}
            <div className="col-md-2">
              <label className="form-label small text-muted fw-semibold">Location</label>
              <select className="form-select bg-light rounded-3 border-light" value={locationFilter} onChange={(e) => updateFilter(setLocationFilter, e.target.value)}>
                <option value="">All</option>
                {locations.map((loc, idx) => (
                  <option key={idx} value={loc}>{loc}</option>
                ))}
              </select>
            </div>

            {/* Contract Value Filter */}
            <div className="col-md-4">
              <label className="form-label small text-muted fw-semibold">Contract Value (Min - Max)</label>
              <div className="d-flex gap-2">
                <input 
                  type="number" 
                  className="form-control bg-light rounded-3 border-light w-50" 
                  placeholder="Min Value"
                  value={minContractValue}
                  onChange={(e) => updateFilter(setMinContractValue, e.target.value)}
                />
                <input 
                  type="number" 
                  className="form-control bg-light rounded-3 border-light w-50" 
                  placeholder="Max Value"
                  value={maxContractValue}
                  onChange={(e) => updateFilter(setMaxContractValue, e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="shadow-sm rounded-4 overflow-hidden bg-white">
        {/* Note: we omit onSearch in DataTable since we handle it externally */}
        <DataTable 
          columns={columns} 
          data={projects} 
          loading={loading}
        />
        <PaginationControls />
      </div>
      
      {showModal && (
        <div className="modal d-block" style={{ background: 'rgba(0,0,0,0.5)', zIndex: 1055, backdropFilter: 'blur(4px)' }}>
          <div className="modal-dialog modal-lg modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg rounded-4">
              <div className="modal-header border-bottom-0 pt-4 px-4">
                <h5 className="modal-title fw-bold text-dark">{isEditing ? 'Edit Project' : 'Create New Project'}</h5>
                <button className="btn-close shadow-none" onClick={handleModalClose} />
              </div>
              <form onSubmit={handleCreateSubmit}>
                <div className="modal-body px-4">
                  <div className="row g-3">
                    <div className="col-md-6">
                      <label className="form-label fw-semibold text-secondary small text-uppercase tracking-wider">Project Code *</label>
                      <input type="text" className="form-control bg-light rounded-3 border-light" disabled value={isEditing ? form.project_code : 'Auto-generated upon save'} />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label fw-semibold text-muted small">Project Name *</label>
                      <input type="text" className="form-control bg-light rounded-3 border-light" required value={form.project_name} onChange={e => setForm({...form, project_name: e.target.value})} placeholder="Project Name" />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label fw-semibold text-muted small">Client Name *</label>
                      <input type="text" className="form-control bg-light rounded-3 border-light" required value={form.client_name} onChange={e => setForm({...form, client_name: e.target.value})} placeholder="Client Name" />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label fw-semibold text-muted small">Client Mobile Number *</label>
                      <input 
                        type="tel" 
                        className="form-control bg-light rounded-3 border-light" 
                        required 
                        pattern="[0-9]{10}"
                        maxLength="10"
                        title="10-digit mobile number"
                        value={form.client_mobile} 
                        onChange={e => setForm({...form, client_mobile: e.target.value.replace(/[^0-9]/g, '').slice(0, 10)})} 
                        placeholder="Client Mobile Number" 
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label fw-semibold text-muted small">Location *</label>
                      <input type="text" className="form-control bg-light rounded-3 border-light" required value={form.project_location} onChange={e => setForm({...form, project_location: e.target.value})} placeholder="Project Location" />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label fw-semibold text-muted small">Start Date *</label>
                      <input type="date" className="form-control bg-light rounded-3 border-light" required value={form.start_date} onChange={e => setForm({...form, start_date: e.target.value})} />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label fw-semibold text-muted small">Expected End Date *</label>
                      <input type="date" className="form-control bg-light rounded-3 border-light" required value={form.expected_end_date} onChange={e => setForm({...form, expected_end_date: e.target.value})} />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label fw-semibold text-muted small">Contract Value (₹) *</label>
                      <input type="number" className="form-control bg-light rounded-3 border-light" required min="0" step="0.01" value={form.estimated_budget} onChange={e => setForm({...form, estimated_budget: e.target.value})} />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label fw-semibold text-muted small">Status *</label>
                      <select className="form-select bg-light rounded-3 border-light" required value={form.status} onChange={e => setForm({...form, status: e.target.value})}>
                        <option value="Planned">Planned</option>
                        <option value="Active">Active</option>
                        <option value="On Hold">On Hold</option>
                        <option value="Completed">Completed</option>
                        <option value="Cancelled">Cancelled</option>
                      </select>
                    </div>
                    <div className="col-12">
                      <label className="form-label fw-semibold text-muted small">Client Address *</label>
                      <textarea className="form-control bg-light rounded-3 border-light" rows={3} required value={form.client_address} onChange={e => setForm({...form, client_address: e.target.value})} placeholder="Client Address"></textarea>
                    </div>
                  </div>
                </div>
                <div className="modal-footer border-top-0 pb-4 px-4">
                  <button type="button" className="btn btn-light rounded-3 shadow-sm px-4" onClick={handleModalClose}>Cancel</button>
                  <button type="submit" className="btn btn-primary rounded-3 shadow-sm px-4" disabled={saving}>
                    {saving ? (isEditing ? 'Updating...' : 'Creating...') : (isEditing ? 'Save Changes' : 'Create Project')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Read-Only Project Details Modal */}
      {showViewModal && selectedProject && (
        <div className="modal d-block" style={{ background: 'rgba(0,0,0,0.5)', zIndex: 1055, backdropFilter: 'blur(4px)' }} onClick={handleViewModalClose}>
          <div className="modal-dialog modal-lg modal-dialog-centered" onClick={(e) => e.stopPropagation()}>
            <div className="modal-content border-0 shadow-lg rounded-4">
              <div className="modal-header border-bottom-0 pt-4 px-4">
                <h5 className="modal-title fw-bold text-dark">Project Details</h5>
                <button type="button" className="btn-close shadow-none" onClick={handleViewModalClose} />
              </div>
              <div className="modal-body px-4">
                <div className="row g-3">
                  <div className="col-md-6">
                    <label className="form-label fw-semibold text-muted small">Project Code</label>
                    <input 
                      type="text" 
                      className="form-control bg-light rounded-3 border-light text-dark" 
                      readOnly 
                      disabled
                      value={selectedProject.project_code || '-'} 
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label fw-semibold text-muted small">Project Name</label>
                    <input 
                      type="text" 
                      className="form-control bg-light rounded-3 border-light text-dark" 
                      readOnly 
                      disabled
                      value={selectedProject.project_name || '-'} 
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label fw-semibold text-muted small">Client Name</label>
                    <input 
                      type="text" 
                      className="form-control bg-light rounded-3 border-light text-dark" 
                      readOnly 
                      disabled
                      value={selectedProject.client_name || '-'} 
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label fw-semibold text-muted small">Client Mobile Number</label>
                    <input 
                      type="text" 
                      className="form-control bg-light rounded-3 border-light text-dark" 
                      readOnly 
                      disabled
                      value={selectedProject.client_mobile || '-'} 
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label fw-semibold text-muted small">Location</label>
                    <input 
                      type="text" 
                      className="form-control bg-light rounded-3 border-light text-dark" 
                      readOnly 
                      disabled
                      value={selectedProject.project_location || '-'} 
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label fw-semibold text-muted small">Start Date</label>
                    <input 
                      type="text" 
                      className="form-control bg-light rounded-3 border-light text-dark" 
                      readOnly 
                      disabled
                      value={selectedProject.start_date || '-'} 
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label fw-semibold text-muted small">Expected End Date</label>
                    <input 
                      type="text" 
                      className="form-control bg-light rounded-3 border-light text-dark" 
                      readOnly 
                      disabled
                      value={selectedProject.expected_end_date || '-'} 
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label fw-semibold text-muted small">Contract Value (₹)</label>
                    <input 
                      type="text" 
                      className="form-control bg-light rounded-3 border-light text-dark fw-medium" 
                      readOnly 
                      disabled
                      value={selectedProject.estimated_budget !== undefined && selectedProject.estimated_budget !== null 
                        ? `₹${new Intl.NumberFormat('en-IN').format(selectedProject.estimated_budget)}` 
                        : '-'} 
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label fw-semibold text-muted small">Status</label>
                    <div className="form-control bg-light rounded-3 border-light d-flex align-items-center" style={{ minHeight: '38px' }}>
                      {selectedProject.status ? (
                        <StatusBadge status={selectedProject.status} />
                      ) : (
                        <span className="text-muted">-</span>
                      )}
                    </div>
                  </div>
                  <div className="col-12">
                    <label className="form-label fw-semibold text-muted small">Client Address</label>
                    <textarea 
                      className="form-control bg-light rounded-3 border-light text-dark" 
                      rows={3} 
                      readOnly 
                      disabled
                      value={selectedProject.client_address || '-'} 
                    />
                  </div>
                </div>
              </div>
              <div className="modal-footer border-top-0 pb-4 px-4">
                <button type="button" className="btn btn-light rounded-3 shadow-sm px-4" onClick={handleViewModalClose}>
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

export default Projects;
