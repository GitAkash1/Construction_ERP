import React, { useState, useEffect, useRef } from 'react';
import DataTable from '../components/DataTable';
import api from '../services/api';
import { toast } from 'react-toastify';
import { FiEye, FiFilter, FiSearch, FiCalendar, FiX } from 'react-icons/fi';
import BackToWorkCenter from '../components/BackToWorkCenter';

const Stock = () => {
  const [data, setData] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const [selectedBOQ, setSelectedBOQ] = useState(null);
  const [boqDetailData, setBoqDetailData] = useState([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [projectSearchText, setProjectSearchText] = useState('');
  const [showProjectDropdown, setShowProjectDropdown] = useState(false);
  const comboboxRef = useRef(null);

  useEffect(() => {
    fetchProjects();
    fetchData('', '', '');
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (comboboxRef.current && !comboboxRef.current.contains(event.target)) {
        setShowProjectDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchProjects = async () => {
    try {
      const res = await api.get('/projects/projects/all/');
      setProjects(res.data.results || res.data);
    } catch (err) {
      toast.error('Failed to load projects.');
    }
  };

  const fetchData = async (projectId = '', fDate = '', tDate = '') => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (projectId) params.append('project', projectId);
      if (fDate) params.append('from_date', fDate);
      if (tDate) params.append('to_date', tDate);

      const url = params.toString() 
        ? `/inventory/project-stock/boq_summary/?${params.toString()}` 
        : '/inventory/project-stock/boq_summary/';
        
      const response = await api.get(url);
      setData(response.data.results || response.data);
      setSelectedBOQ(null);
      setBoqDetailData([]);
      setCurrentPage(1);
    } catch (error) {
      toast.error('Failed to load stock data.');
    } finally {
      setLoading(false);
    }
  };

  const fetchBOQDetails = async (boq) => {
    try {
      setSelectedBOQ(boq);
      setDetailLoading(true);
      setDetailError(null);
      setBoqDetailData([]); // Ensure stale data is cleared instantly
      const url = `/inventory/project-stock/?boq=${boq.boq_id}`;
      const response = await api.get(url);
      setBoqDetailData(response.data.results || response.data);
    } catch (error) {
      setDetailError('Failed to load BOQ details.');
      toast.error('Failed to load BOQ details.');
    } finally {
      setDetailLoading(false);
    }
  };

  const handleFromDateChange = (val) => {
    if (toDate && val && val > toDate) {
      toast.error('From Date cannot be later than To Date.');
      return;
    }
    setFromDate(val);
    fetchData(selectedProject, val, toDate);
  };

  const handleToDateChange = (val) => {
    if (fromDate && val && val < fromDate) {
      toast.error('From Date cannot be later than To Date.');
      return;
    }
    setToDate(val);
    fetchData(selectedProject, fromDate, val);
  };

  const handleClearFilters = () => {
    setSelectedProject('');
    setProjectSearchText('');
    setFromDate('');
    setToDate('');
    fetchData('', '', '');
  };

  const handleProjectSearchChange = (e) => {
    const val = e.target.value;
    setProjectSearchText(val);
    setShowProjectDropdown(true);
    
    if (val.trim() === '') {
      setSelectedProject('');
      fetchData('', fromDate, toDate);
    }
  };

  const handleSelectProject = (project) => {
    setSelectedProject(project.id);
    setProjectSearchText(project.project_name);
    setShowProjectDropdown(false);
    fetchData(project.id, fromDate, toDate);
  };

  // Pagination logic
  const pageSize = 6;
  const totalPages = Math.ceil(data.length / pageSize) || 1;
  const validCurrentPage = currentPage > totalPages ? Math.max(totalPages, 1) : currentPage;
  const startIndex = (validCurrentPage - 1) * pageSize;
  const paginatedData = data.slice(startIndex, startIndex + pageSize);

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

  const summaryColumns = [
    { 
      header: 'S.NO', 
      render: (row, index) => <span className="fw-medium text-muted">{(validCurrentPage - 1) * pageSize + index + 1}</span> 
    },
    { 
      header: 'Date', 
      accessor: 'bill_date',
      render: (row) => <span className="text-muted">{row.bill_date ? new Date(row.bill_date).toLocaleDateString('en-GB') : '—'}</span> 
    },
    { header: 'BOQ No', accessor: 'boq_number', render: (row) => <span className="fw-semibold text-dark">{row.boq_number}</span> },
    { header: 'Project Name', accessor: 'project_name', render: (row) => <span className="fw-medium text-dark">{row.project_name}</span> },
    { 
      header: 'Inspect', 
      render: (row) => (
        <button 
          className="btn btn-sm btn-outline-primary rounded-2 shadow-sm"
          onClick={() => fetchBOQDetails(row)}
          title="Inspect BOQ Details"
        >
          <FiEye />
        </button>
      )
    }
  ];

  const detailColumns = [
    { 
      header: 'S.NO', 
      render: (row, index) => <span className="fw-medium text-muted">{index + 1}</span> 
    },
    { header: 'Material', accessor: 'material_name', render: (row) => <span className="fw-medium text-dark">{row.material_name}</span> },
    { header: 'BOQ Qty', accessor: 'boq_qty' },
    { header: 'Issued Qty', accessor: 'issued_qty' },
    { header: 'Consumed Qty', accessor: 'consumed_qty' },
    { 
      header: 'Balance Qty', 
      render: (row) => {
        const bal = Number(row.available_stock);
        let badgeClass = 'bg-success';
        if (bal <= 0) badgeClass = 'bg-danger';
        else if (bal < Number(row.boq_qty) * 0.1) badgeClass = 'bg-warning';
        return <span className={`badge ${badgeClass}`}>{row.available_stock}</span>;
      }
    }
  ];

  return (
    <div>
      <div className="d-flex flex-column flex-sm-row justify-content-between align-items-start align-items-sm-center mb-4 gap-2">
        <h2 className="fw-bold mb-0">Project Stock Balance</h2>
        <div className="d-flex align-items-center gap-2 w-100 w-sm-auto justify-content-start justify-content-sm-end">
          <BackToWorkCenter />
        </div>
      </div>

      {/* Search & Filter Card */}
      <div className="card border-0 shadow-sm rounded-4 mb-4 bg-white">
        <div className="card-body p-4">
          <div className="d-flex align-items-center mb-3">
            <FiFilter className="text-primary me-2" />
            <h6 className="mb-0 fw-bold text-dark">Search & Filter</h6>
            {(selectedProject || projectSearchText || fromDate || toDate) && (
              <button 
                type="button"
                className="btn btn-link btn-sm text-danger text-decoration-none ms-auto d-flex align-items-center gap-1 p-0" 
                onClick={handleClearFilters}
              >
                <FiX /> Clear Filters
              </button>
            )}
          </div>

          <div className="row g-3 align-items-end">
            {/* Search Project Combobox */}
            <div className="col-12 col-md-4 position-relative" ref={comboboxRef}>
              <label className="form-label small text-muted fw-semibold">Project Name</label>
              <div className="input-group">
                <span className="input-group-text bg-light border-end-0 rounded-start-3">
                  <FiSearch className="text-muted" />
                </span>
                <input
                  type="text"
                  className="form-control bg-light border-start-0 ps-0 rounded-end-3"
                  placeholder="Type project name..."
                  value={projectSearchText}
                  onChange={handleProjectSearchChange}
                  onFocus={() => setShowProjectDropdown(true)}
                />
              </div>
              {showProjectDropdown && (
                <ul className="list-group position-absolute w-100 mt-1 shadow-lg border-0 rounded-3" style={{ zIndex: 1000, maxHeight: '200px', overflowY: 'auto' }}>
                  {projects.filter(p => p.project_name.toLowerCase().includes(projectSearchText.toLowerCase())).length > 0 ? (
                    projects
                      .filter(p => p.project_name.toLowerCase().includes(projectSearchText.toLowerCase()))
                      .map(p => (
                        <li
                          key={p.id}
                          className="list-group-item list-group-item-action border-0 px-3 py-2 text-dark"
                          style={{ cursor: 'pointer', fontSize: '0.9rem' }}
                          onClick={() => handleSelectProject(p)}
                        >
                          {p.project_name}
                        </li>
                      ))
                  ) : (
                    <li className="list-group-item border-0 px-3 py-2 text-muted small">No projects found</li>
                  )}
                </ul>
              )}
            </div>

            {/* From Date Filter */}
            <div className="col-12 col-sm-6 col-md-4">
              <label className="form-label small text-muted fw-semibold">From Date</label>
              <div className="input-group">
                <span className="input-group-text bg-light border-end-0 rounded-start-3">
                  <FiCalendar className="text-muted" />
                </span>
                <input
                  type="date"
                  className="form-control bg-light border-start-0 ps-0 rounded-end-3"
                  value={fromDate}
                  onChange={(e) => handleFromDateChange(e.target.value)}
                />
              </div>
            </div>

            {/* To Date Filter */}
            <div className="col-12 col-sm-6 col-md-4">
              <label className="form-label small text-muted fw-semibold">To Date</label>
              <div className="input-group">
                <span className="input-group-text bg-light border-end-0 rounded-start-3">
                  <FiCalendar className="text-muted" />
                </span>
                <input
                  type="date"
                  className="form-control bg-light border-start-0 ps-0 rounded-end-3"
                  value={toDate}
                  onChange={(e) => handleToDateChange(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="card border-0 mb-4 shadow-sm rounded-4 overflow-hidden bg-white">
        <div className="card-body p-0">
          <DataTable 
            columns={summaryColumns} 
            data={paginatedData} 
            loading={loading}
          />
          <PaginationControls />
        </div>
      </div>

      {selectedBOQ && (
        <div className="modal d-block" style={{ background: 'rgba(0,0,0,0.5)', zIndex: 1055 }}>
          <div className="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable">
            <div className="modal-content border-0 shadow-lg rounded-3">
              <div className="modal-header">
                <h5 className="modal-title fw-bold">
                  Details for BOQ: <span className="text-primary">{selectedBOQ.boq_number}</span> ({selectedBOQ.project_name})
                </h5>
                <button type="button" className="btn-close shadow-none" onClick={() => setSelectedBOQ(null)} aria-label="Close" />
              </div>
              <div className="modal-body p-0">
                {detailLoading ? (
                  <div className="text-center py-5 text-muted">
                    <div className="spinner-border spinner-border-sm me-2" role="status" />
                    Loading BOQ details...
                  </div>
                ) : detailError ? (
                  <div className="alert alert-danger m-3 py-2 small">{detailError}</div>
                ) : boqDetailData.length === 0 ? (
                  <div className="text-center p-4 text-muted">No material records found for this BOQ.</div>
                ) : (
                  <DataTable 
                    columns={detailColumns} 
                    data={boqDetailData} 
                    loading={detailLoading}
                  />
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setSelectedBOQ(null)}>
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

export default Stock;
