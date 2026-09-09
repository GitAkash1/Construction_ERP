import React, { useState, useEffect, useRef } from 'react';
import DataTable from '../../components/DataTable';
import api from '../../services/api';
import { toast } from 'react-toastify';
import { FiPlus, FiEdit, FiEye, FiTrash2 } from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';

const SubcontractorList = () => {
  const { hasPermission } = useAuth();
  const [subcontractors, setSubcontractors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  
  // Details popup modal state
  const [selectedSubcontractor, setSelectedSubcontractor] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  // Form input state
  const [form, setForm] = useState({
    subcontractor_name: '',
    contact_person: '',
    mobile_number: '',
    email: '',
    address: '',
    work_category: '',
    status: 'Active'
  });

  // Form errors validation state
  const [errors, setErrors] = useState({});

  // Pagination & Search States
  const [currentPage, setCurrentPage] = useState(1);
  const [companySearchText, setCompanySearchText] = useState('');
  const [showCompanyDropdown, setShowCompanyDropdown] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [mobileSearchText, setMobileSearchText] = useState('');
  const companyComboboxRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (companyComboboxRef.current && !companyComboboxRef.current.contains(event.target)) {
        setShowCompanyDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    fetchSubcontractors();
  }, []);

  const fetchSubcontractors = async () => {
    try {
      setLoading(true);
      const res = await api.get('/subcontractors/subcontractors/');
      setSubcontractors(res.data.results || res.data);
    } catch (err) {
      toast.error('Failed to load subcontractors');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    let { name, value } = e.target;
    
    // Restrict mobile number to digits only and max 10 characters
    if (name === 'mobile_number') {
      value = value.replace(/\D/g, '').slice(0, 10);
    }
    
    setForm({ ...form, [name]: value });
    if (errors[name]) {
      setErrors({ ...errors, [name]: '' });
    }
  };

  const handleOpenModal = (subcontractor = null) => {
    setErrors({});
    if (subcontractor) {
      setEditMode(true);
      setSelectedId(subcontractor.id);
      setForm({
        subcontractor_name: subcontractor.subcontractor_name || '',
        contact_person: subcontractor.contact_person || '',
        mobile_number: subcontractor.mobile_number || '',
        email: subcontractor.email || '',
        address: subcontractor.address || '',
        work_category: subcontractor.work_category || '',
        status: subcontractor.status || 'Active'
      });
    } else {
      setEditMode(false);
      setSelectedId(null);
      setForm({
        subcontractor_name: '',
        contact_person: '',
        mobile_number: '',
        email: '',
        address: '',
        work_category: '',
        status: 'Active'
      });
    }
    setShowModal(true);
  };

  const validateForm = () => {
    const tempErrors = {};
    if (!form.subcontractor_name.trim()) {
      tempErrors.subcontractor_name = "Company Name is required.";
    }
    if (!form.work_category.trim()) {
      tempErrors.work_category = "Work Category is required.";
    }
    if (!form.contact_person.trim()) {
      tempErrors.contact_person = "Contact Person is required.";
    }
    
    const mobileTrimmed = form.mobile_number.trim();
    if (!mobileTrimmed) {
      tempErrors.mobile_number = "Mobile Number is required.";
    } else if (!/^[6-9]\d{9}$/.test(mobileTrimmed)) {
      tempErrors.mobile_number = "Enter a valid 10-digit mobile number.";
    }

    const emailTrimmed = form.email.trim();
    if (!emailTrimmed) {
      tempErrors.email = "Email is required.";
    } else if (!/\S+@\S+\.\S+/.test(emailTrimmed)) {
      tempErrors.email = "Please enter a valid email address.";
    }
    
    if (!form.status) {
      tempErrors.status = "Status is required.";
    }
    if (!form.address.trim()) {
      tempErrors.address = "Address is required.";
    }
    setErrors(tempErrors);
    return Object.keys(tempErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) {
      toast.error('Please fix the validation errors before submitting.');
      return;
    }

    const payload = {
      subcontractor_name: form.subcontractor_name.trim(),
      contact_person: form.contact_person.trim(),
      mobile_number: form.mobile_number.trim(),
      email: form.email.trim(),
      address: form.address.trim(),
      work_category: form.work_category.trim(),
      status: form.status
    };

    try {
      if (editMode) {
        await api.put(`/subcontractors/subcontractors/${selectedId}/`, payload);
        toast.success('Subcontractor updated successfully');
      } else {
        await api.post('/subcontractors/subcontractors/', payload);
        toast.success('Subcontractor added successfully');
      }
      setShowModal(false);
      fetchSubcontractors();
    } catch (err) {
      if (err.response?.data) {
        const backendErrors = {};
        Object.keys(err.response.data).forEach(key => {
          backendErrors[key] = Array.isArray(err.response.data[key])
            ? err.response.data[key][0]
            : err.response.data[key];
        });
        setErrors(backendErrors);
        toast.error(err.response?.data?.detail || 'Failed to save subcontractor. Please check the fields.');
      } else {
        toast.error('Failed to save subcontractor');
      }
    }
  };

  const handleOpenDetails = (subcontractor) => {
    setSelectedSubcontractor(subcontractor);
    setShowDetailsModal(true);
  };

  const handleDelete = async (subcontractor) => {
    const confirmed = window.confirm('Are you sure you want to delete this subcontractor?');
    if (!confirmed) return;

    try {
      await api.delete(`/subcontractors/subcontractors/${subcontractor.id}/`);
      toast.success('Subcontractor deleted successfully');
      fetchSubcontractors();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to delete subcontractor');
    }
  };

  const columns = [
    {
      header: 'Serial Number',
      render: (row, rowIndex) => (
        <span className="fw-medium text-muted">
          {(validCurrentPage - 1) * pageSize + rowIndex + 1}
        </span>
      )
    },
    { header: 'Company Name', accessor: 'subcontractor_name' },
    { header: 'Work Category', accessor: 'work_category' },
    { header: 'Contact Person', accessor: 'contact_person' },
    { header: 'Mobile', accessor: 'mobile_number' },
    { 
      header: 'Status', 
      render: (row) => {
        const displayStatus = row.status || 'Inactive';
        return (
          <span className={`badge ${displayStatus === 'Active' ? 'bg-success' : 'bg-secondary'}`}>
            {displayStatus}
          </span>
        );
      } 
    },
    {
      header: 'Actions',
      render: (row) => (
        <div className="d-flex gap-2 align-items-center">
          <button 
            className="btn btn-sm btn-outline-secondary" 
            title="View Details"
            onClick={() => handleOpenDetails(row)}
          >
            <FiEye />
          </button>
          {hasPermission('subcontractors.edit') && (
            <button 
              className="btn btn-sm btn-outline-primary" 
              title="Edit"
              onClick={() => handleOpenModal(row)}
            >
              <FiEdit />
            </button>
          )}
          {hasPermission('subcontractors.delete') && (
            <button 
              className="btn btn-sm btn-outline-danger" 
              title="Delete"
              onClick={() => handleDelete(row)}
            >
              <FiTrash2 />
            </button>
          )}
        </div>
      )
    }
  ];

  const handleCompanySearchChange = (e) => {
    const val = e.target.value;
    setCompanySearchText(val);
    setShowCompanyDropdown(true);
    if (val.trim() === '') {
      setSelectedCompany(null);
      setCurrentPage(1);
    }
  };

  const handleSelectCompany = (company) => {
    setCompanySearchText(company.subcontractor_name);
    setSelectedCompany(company);
    setShowCompanyDropdown(false);
    setCurrentPage(1);
  };

  const clearCompanyFilter = () => {
    setCompanySearchText('');
    setSelectedCompany(null);
    setCurrentPage(1);
  };

  const handleMobileSearchChange = (e) => {
    setMobileSearchText(e.target.value);
    setCurrentPage(1);
  };

  const clearMobileFilter = () => {
    setMobileSearchText('');
    setCurrentPage(1);
  };

  const filteredSubcontractors = subcontractors.filter(sub => {
    const companyMatch = selectedCompany 
      ? sub.subcontractor_name === selectedCompany.subcontractor_name 
      : true;
    const mobileMatch = mobileSearchText
      ? sub.mobile_number && sub.mobile_number.includes(mobileSearchText)
      : true;
    return companyMatch && mobileMatch;
  });

  const pageSize = 10;
  const totalPages = Math.ceil(filteredSubcontractors.length / pageSize) || 1;
  const validCurrentPage = currentPage > totalPages ? Math.max(totalPages, 1) : currentPage;
  const startIndex = (validCurrentPage - 1) * pageSize;
  const paginatedSubcontractors = filteredSubcontractors.slice(startIndex, startIndex + pageSize);

  const uniqueCompanies = Array.from(new Map(subcontractors.map(s => [s.subcontractor_name, s])).values());
  const dropdownCompanies = uniqueCompanies.filter(s => s.subcontractor_name?.toLowerCase().includes(companySearchText.toLowerCase()));

  const PaginationControls = () => {
    if (totalPages <= 1) return null;
    return (
      <div className="d-flex flex-column flex-sm-row justify-content-between align-items-center p-3 border-top bg-white mt-3 gap-2">
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
        <div>
          <h2 className="fw-bold mb-0">Subcontractors</h2>
          <p className="text-muted mb-0">Manage subcontractor profiles and details</p>
        </div>
        {hasPermission('subcontractors.create') && (
          <button className="btn btn-primary d-flex align-items-center justify-content-center gap-2" onClick={() => handleOpenModal()}>
            <FiPlus /> Add Subcontractor
          </button>
        )}
      </div>

      <div className="d-flex flex-column flex-sm-row align-items-stretch align-items-sm-center gap-2 gap-sm-3 mb-4 flex-wrap">
        <div className="flex-grow-1" style={{ minWidth: '200px', maxWidth: '100%', position: 'relative' }} ref={companyComboboxRef}>
          <input
            type="text"
            className="form-control"
            placeholder="Search by Company Name..."
            value={companySearchText}
            onChange={handleCompanySearchChange}
            onFocus={() => setShowCompanyDropdown(true)}
          />
          {companySearchText && (
            <button
              className="btn btn-sm btn-link text-muted position-absolute end-0 top-50 translate-middle-y me-1 text-decoration-none"
              onClick={clearCompanyFilter}
              style={{ zIndex: 10, padding: 0 }}
              title="Clear Company"
            >
              ✕
            </button>
          )}
          {showCompanyDropdown && (
            <ul className="list-group list-group-flush border position-absolute w-100 shadow-sm bg-white" style={{ zIndex: 1000, maxHeight: '200px', overflowY: 'auto', borderRadius: '0 0 0.375rem 0.375rem' }}>
              {dropdownCompanies.length > 0 ? (
                dropdownCompanies.map(c => (
                  <li
                    key={c.id}
                    className="list-group-item list-group-item-action py-2"
                    style={{ cursor: 'pointer' }}
                    onClick={() => handleSelectCompany(c)}
                  >
                    {c.subcontractor_name}
                  </li>
                ))
              ) : (
                <li className="list-group-item text-muted py-2">No companies found</li>
              )}
            </ul>
          )}
        </div>

        <div className="d-flex align-items-center position-relative flex-grow-1 flex-sm-grow-0" style={{ minWidth: '180px' }}>
          <input
            type="text"
            className="form-control"
            placeholder="Search mobile number..."
            value={mobileSearchText}
            onChange={handleMobileSearchChange}
            style={{ width: '100%' }}
          />
          {mobileSearchText && (
            <button
              className="btn btn-sm btn-link text-muted position-absolute end-0 top-50 translate-middle-y me-1 text-decoration-none"
              onClick={clearMobileFilter}
              style={{ zIndex: 10, padding: 0 }}
              title="Clear Mobile Number"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      <DataTable 
        columns={columns}
        data={paginatedSubcontractors}
        loading={loading}
      />
      <PaginationControls />

      {/* Add / Edit Modal */}
      {showModal && (
        <div className="modal d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050 }}>
          <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
            <div className="modal-content border-0 shadow-lg" style={{ borderRadius: '12px' }}>
              <div className="modal-header">
                <h5 className="modal-title fw-bold">{editMode ? 'Edit Subcontractor' : 'Add Subcontractor'}</h5>
                <button type="button" className="btn-close" onClick={() => setShowModal(false)}></button>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="modal-body">
                  <div className="row g-3">
                    <div className="col-12 col-sm-6">
                      <label className="form-label">Company Name *</label>
                      <input 
                        type="text" 
                        className={`form-control ${errors.subcontractor_name ? 'is-invalid' : ''}`} 
                        name="subcontractor_name" 
                        value={form.subcontractor_name} 
                        onChange={handleInputChange} 
                        placeholder="Enter company name"
                      />
                      {errors.subcontractor_name && <div className="invalid-feedback">{errors.subcontractor_name}</div>}
                    </div>
                    <div className="col-12 col-sm-6">
                      <label className="form-label">Work Category *</label>
                      <input 
                        type="text" 
                        className={`form-control ${errors.work_category ? 'is-invalid' : ''}`} 
                        name="work_category" 
                        value={form.work_category} 
                        onChange={handleInputChange} 
                        placeholder="e.g. Electrical, Plumbing" 
                      />
                      {errors.work_category && <div className="invalid-feedback">{errors.work_category}</div>}
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Contact Person *</label>
                      <input 
                        type="text" 
                        className={`form-control ${errors.contact_person ? 'is-invalid' : ''}`} 
                        name="contact_person" 
                        value={form.contact_person} 
                        onChange={handleInputChange} 
                        placeholder="Enter contact person name"
                      />
                      {errors.contact_person && <div className="invalid-feedback">{errors.contact_person}</div>}
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Mobile Number *</label>
                      <input 
                        type="tel" 
                        className={`form-control ${errors.mobile_number ? 'is-invalid' : ''}`} 
                        name="mobile_number" 
                        value={form.mobile_number} 
                        onChange={handleInputChange} 
                        placeholder="Enter mobile number"
                        maxLength="10"
                      />
                      {errors.mobile_number && <div className="invalid-feedback">{errors.mobile_number}</div>}
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Email *</label>
                      <input 
                        type="email" 
                        className={`form-control ${errors.email ? 'is-invalid' : ''}`} 
                        name="email" 
                        value={form.email} 
                        onChange={handleInputChange} 
                        placeholder="Enter email address"
                      />
                      {errors.email && <div className="invalid-feedback">{errors.email}</div>}
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Status *</label>
                      <select 
                        className={`form-select ${errors.status ? 'is-invalid' : ''}`} 
                        name="status" 
                        value={form.status} 
                        onChange={handleInputChange}
                      >
                        <option value="Active">Active</option>
                        <option value="Inactive">Inactive</option>
                      </select>
                      {errors.status && <div className="invalid-feedback">{errors.status}</div>}
                    </div>
                    <div className="col-12">
                      <label className="form-label">Address *</label>
                      <textarea 
                        className={`form-control ${errors.address ? 'is-invalid' : ''}`} 
                        name="address" 
                        rows="3" 
                        value={form.address} 
                        onChange={handleInputChange}
                        placeholder="Enter address"
                      ></textarea>
                      {errors.address && <div className="invalid-feedback">{errors.address}</div>}
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary shadow-none" onClick={() => setShowModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary px-4 fw-bold">{editMode ? 'Update' : 'Save'}</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Details View Modal */}
      {showDetailsModal && selectedSubcontractor && (
        <div className="modal d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050 }}>
          <div className="modal-dialog modal-dialog-centered modal-lg modal-dialog-scrollable">
            <div className="modal-content border-0 shadow-lg" style={{ borderRadius: '15px', overflow: 'hidden' }}>
              <div className="modal-header bg-dark text-white border-0 py-3">
                <h5 className="modal-title fw-bold">Subcontractor Details</h5>
                <button 
                  type="button" 
                  className="btn-close btn-close-white shadow-none" 
                  onClick={() => {
                    setShowDetailsModal(false);
                    setSelectedSubcontractor(null);
                  }}
                  aria-label="Close"
                ></button>
              </div>
              <div className="modal-body p-4" style={{ backgroundColor: '#f8fafc' }}>
                <div className="row g-4">
                  {/* Section A: Subcontractor Details */}
                  <div className="col-12 col-md-6">
                    <div className="card border-0 shadow-sm h-100" style={{ borderRadius: '10px' }}>
                      <div className="card-header bg-white border-0 pt-3 pb-0">
                        <h6 className="text-primary fw-bold mb-0">SECTION A – SUBCONTRACTOR DETAILS</h6>
                      </div>
                      <div className="card-body">
                        <div className="mb-3">
                          <label className="text-muted small fw-bold d-block mb-1">Company Name</label>
                          <div className="fw-semibold text-dark fs-5">{selectedSubcontractor.subcontractor_name || 'N/A'}</div>
                        </div>
                        <div className="mb-3">
                          <label className="text-muted small fw-bold d-block mb-1">Work / Category</label>
                          <div className="fw-semibold text-dark">{selectedSubcontractor.work_category || 'N/A'}</div>
                        </div>
                        <div className="mb-3">
                          <label className="text-muted small fw-bold d-block mb-1">Status</label>
                          <div>
                            <span className={`badge ${selectedSubcontractor.status === 'Active' ? 'bg-success' : 'bg-secondary'} px-3 py-2 fs-6`}>
                              {selectedSubcontractor.status || 'N/A'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Section B: Communication Details */}
                  <div className="col-12 col-md-6">
                    <div className="card border-0 shadow-sm h-100" style={{ borderRadius: '10px' }}>
                      <div className="card-header bg-white border-0 pt-3 pb-0">
                        <h6 className="text-primary fw-bold mb-0">SECTION B – COMMUNICATION DETAILS</h6>
                      </div>
                      <div className="card-body">
                        <div className="mb-3">
                          <label className="text-muted small fw-bold d-block mb-1">Contact Person</label>
                          <div className="fw-semibold text-dark">{selectedSubcontractor.contact_person || 'N/A'}</div>
                        </div>
                        <div className="mb-3">
                          <label className="text-muted small fw-bold d-block mb-1">Mobile Number</label>
                          <div className="fw-semibold text-dark">{selectedSubcontractor.mobile_number || 'N/A'}</div>
                        </div>
                        <div className="mb-3">
                          <label className="text-muted small fw-bold d-block mb-1">Email</label>
                          <div className="fw-semibold text-dark">{selectedSubcontractor.email || 'N/A'}</div>
                        </div>
                        <div className="mb-3">
                          <label className="text-muted small fw-bold d-block mb-1">Address</label>
                          <div className="text-dark" style={{ whiteSpace: 'pre-line' }}>{selectedSubcontractor.address || 'N/A'}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="modal-footer bg-light border-0 py-3">
                <button 
                  type="button" 
                  className="btn btn-secondary px-4 fw-bold shadow-none" 
                  onClick={() => {
                    setShowDetailsModal(false);
                    setSelectedSubcontractor(null);
                  }}
                  style={{ borderRadius: '8px' }}
                >
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

export default SubcontractorList;
