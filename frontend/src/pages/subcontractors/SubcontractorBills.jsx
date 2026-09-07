import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import DataTable from '../../components/DataTable';
import api from '../../services/api';
import { toast } from 'react-toastify';
import { FiCheck, FiEye, FiSend } from 'react-icons/fi';
import BackToWorkCenter from '../../components/BackToWorkCenter';
import { useAuth } from '../../context/AuthContext';

const SubcontractorBills = () => {
  const { hasPermission } = useAuth();
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState([]);

  const [currentPage, setCurrentPage] = useState(1);
  const [tableProjectSearch, setTableProjectSearch] = useState('');
  const [showTableProjectDropdown, setShowTableProjectDropdown] = useState(false);
  const [selectedTableProject, setSelectedTableProject] = useState(null);
  const tableProjectComboboxRef = useRef(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [tableDateFilter, setTableDateFilter] = useState('');

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
    fetchProjects();
    fetchBills();
  }, []);

  const fetchProjects = async () => {
    try {
      const res = await api.get('/projects/projects/all/');
      setProjects(res.data.results || res.data);
    } catch (err) {
      toast.error('Failed to load projects');
    }
  };

  const fetchBills = async () => {
    try {
      setLoading(true);
      const res = await api.get('/subcontractors/bills/');
      setBills(res.data.results || res.data);
    } catch (err) {
      toast.error('Failed to load bills');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id) => {
    if (!window.confirm('Are you sure you want to approve this bill? This will integrate it with Project Costs.')) return;
    try {
      await api.post(`/subcontractors/bills/${id}/approve/`);
      toast.success('Bill approved successfully');
      fetchBills();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to approve bill');
    }
  };

  const handleSubmitBill = async (id) => {
    if (!window.confirm('Are you sure you want to submit this bill?')) return;
    try {
      await api.post(`/subcontractors/bills/${id}/submit/`);
      toast.success('Bill submitted successfully');
      fetchBills();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to submit bill');
    }
  };

  const fmt = (val) => Number(val || 0).toLocaleString('en-IN', {minimumFractionDigits: 2});

  const filteredBills = bills.filter(b => {
    const projectMatch = selectedTableProject ? b.project_name === selectedTableProject.project_name : true;
    const statusMatch = statusFilter ? b.status === statusFilter : true;
    const dateMatch = tableDateFilter ? b.bill_date === tableDateFilter : true;
    return projectMatch && statusMatch && dateMatch;
  });

  const pageSize = 10;
  const totalPages = Math.ceil(filteredBills.length / pageSize) || 1;
  const validCurrentPage = currentPage > totalPages ? Math.max(totalPages, 1) : currentPage;
  const startIndex = (validCurrentPage - 1) * pageSize;
  const paginatedBills = filteredBills.slice(startIndex, startIndex + pageSize);

  const dropdownProjects = projects.filter(p => p.project_name?.toLowerCase().includes(tableProjectSearch.toLowerCase()));
  const uniqueStatuses = Array.from(new Set(bills.map(b => b.status).filter(Boolean)));

  const PaginationControls = () => {
    if (totalPages <= 1) return null;
    return (
      <div className="d-flex justify-content-end p-3 border-top bg-white">
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
    { header: 'Date', accessor: 'bill_date' },
    { header: 'Bill Number', accessor: 'bill_number' },
    { 
      header: 'Work Order', 
      accessor: (row) => (
        <Link to={`/subcontractors/work-orders/${row.work_order}`} className="fw-semibold">
          {row.work_order_number}
        </Link>
      )
    },
    { header: 'Project', accessor: 'project_name' },
    { header: 'Sub Contractor', accessor: 'subcontractor_name' },
    { header: 'Bill QTY', accessor: (row) => fmt(row.bill_quantity) },
    { header: 'Rate (₹)', accessor: (row) => fmt(row.rate) },
    { 
      header: 'Tax (%)', 
      accessor: (row) => row.tax_percentage !== null && row.tax_percentage !== undefined ? `${parseFloat(row.tax_percentage)}%` : '—' 
    },
    { header: 'Total Amount', accessor: (row) => <span className="fw-bold">₹{fmt(row.total_amount)}</span> },
    { 
      header: 'Status', 
      accessor: (row) => {
        const colors = {
          'Draft': 'bg-secondary',
          'Submitted': 'bg-primary',
          'Approved': 'bg-success',
          'Rejected': 'bg-danger',
          'Paid': 'bg-info text-dark'
        };
        return <span className={`badge ${colors[row.status] || 'bg-secondary'}`}>{row.status}</span>;
      }
    },
    {
      header: 'Action',
      accessor: (row) => (
        <div className="d-flex gap-2">
          <Link to={`/subcontractors/work-orders/${row.work_order}`} className="btn btn-sm btn-outline-secondary" title="View Work Order">
            <FiEye /> WO
          </Link>
          {row.status === 'Draft' && hasPermission('subcontractor_bills.create') && (
            <button className="btn btn-sm btn-primary d-flex align-items-center gap-1" onClick={() => handleSubmitBill(row.id)}>
              <FiSend /> Submit
            </button>
          )}
          {['Draft', 'Submitted'].includes(row.status) && hasPermission('subcontractor_bills.approve') && (
            <button className="btn btn-sm btn-success d-flex align-items-center gap-1" onClick={() => handleApprove(row.id)}>
              <FiCheck /> Approve
            </button>
          )}
        </div>
      )
    }
  ];

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="fw-bold mb-0">Subcontractor Bills</h2>
          <p className="text-muted mb-0">Manage and approve subcontractor billing</p>
        </div>
        <div className="d-flex align-items-center gap-2">
          <BackToWorkCenter />
        </div>
      </div>

      <div className="d-flex align-items-center gap-3 mb-4">
        {/* Project Combobox */}
        <div style={{ width: '300px', position: 'relative' }} ref={tableProjectComboboxRef}>
          <input
            type="text"
            className="form-control"
            placeholder="Search by Project Name..."
            value={tableProjectSearch}
            onChange={(e) => {
              setTableProjectSearch(e.target.value);
              setShowTableProjectDropdown(true);
              if (e.target.value.trim() === '') {
                setSelectedTableProject(null);
                setCurrentPage(1);
              }
            }}
            onFocus={() => setShowTableProjectDropdown(true)}
          />
          {tableProjectSearch && (
            <button
              className="btn btn-sm btn-link text-muted position-absolute end-0 top-50 translate-middle-y me-1 text-decoration-none"
              onClick={() => {
                setTableProjectSearch('');
                setSelectedTableProject(null);
                setCurrentPage(1);
              }}
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
                    onClick={() => {
                      setTableProjectSearch(p.project_name);
                      setSelectedTableProject(p);
                      setShowTableProjectDropdown(false);
                      setCurrentPage(1);
                    }}
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

        {/* Date Filter */}
        <div className="d-flex align-items-center gap-1">
          <input
            type="date"
            className="form-control"
            value={tableDateFilter}
            onChange={(e) => { setTableDateFilter(e.target.value); setCurrentPage(1); }}
            style={{ width: '150px' }}
            title="Filter by Date"
          />
          {tableDateFilter && (
            <button
              className="btn btn-outline-secondary"
              onClick={() => { setTableDateFilter(''); setCurrentPage(1); }}
              title="Clear Date Filter"
            >
              Clear
            </button>
          )}
        </div>

        {/* Status Filter */}
        <div className="d-flex align-items-center">
          <select 
            className="form-select"
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
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
            <table className="table table-hover mb-0">
              <thead>
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
                ) : paginatedBills.length === 0 ? (
                  <tr>
                    <td colSpan={columns.length} className="text-center py-5 text-muted">
                      No records found.
                    </td>
                  </tr>
                ) : (
                  paginatedBills.map((row, rowIndex) => (
                    <tr key={rowIndex}>
                      {columns.map((col, colIndex) => (
                        <td key={colIndex}>
                          {typeof col.accessor === 'function' ? col.accessor(row) : row[col.accessor]}
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
    </div>
  );
};

export default SubcontractorBills;
