import React, { useState, useEffect, useRef, useCallback } from 'react';
import { FiDollarSign, FiCalendar, FiFilter, FiRefreshCw, FiAlertCircle } from 'react-icons/fi';
import api from '../services/api';
import { toast } from 'react-toastify';
import StatusBadge from '../components/StatusBadge';
import BackToWorkCenter from '../components/BackToWorkCenter';

const Costs = () => {
  // Projects select autocomplete state
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [projectSearchText, setProjectSearchText] = useState('');
  const [showProjectDropdown, setShowProjectDropdown] = useState(false);
  const projectComboboxRef = useRef(null);

  // Cost Data State
  const [summary, setSummary] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [transactionsCount, setTransactionsCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingTransactions, setLoadingTransactions] = useState(false);

  // Filters & Pagination State
  const [categoryFilter, setCategoryFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  // Handle clicking outside project dropdown to close it
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (projectComboboxRef.current && !projectComboboxRef.current.contains(event.target)) {
        setShowProjectDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch all projects on mount
  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const res = await api.get('/projects/projects/all/');
      setProjects(res.data.results || res.data);
    } catch (err) {
      toast.error('Failed to load projects.');
    }
  };

  // Fetch summary and transactions for the selected project
  const fetchProjectCostData = useCallback(async (projectId) => {
    if (!projectId) return;
    try {
      setLoading(true);
      const summaryRes = await api.get(`/finance/project-cost/${projectId}/`);
      setSummary(summaryRes.data);
    } catch (err) {
      toast.error('Failed to load project cost summary.');
      setSummary(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchProjectTransactions = useCallback(async (projectId, page, category, dateVal) => {
    if (!projectId) return;
    try {
      setLoadingTransactions(true);
      const params = new URLSearchParams();
      params.append('page', page);
      if (category) params.append('category', category);
      if (dateVal) params.append('date', dateVal);

      const txRes = await api.get(`/finance/project-cost/${projectId}/transactions/?${params.toString()}`);
      setTransactions(txRes.data.results || []);
      setTransactionsCount(txRes.data.count || 0);
    } catch (err) {
      toast.error('Failed to load project cost transactions.');
      setTransactions([]);
      setTransactionsCount(0);
    } finally {
      setLoadingTransactions(false);
    }
  }, []);

  // Trigger data load when project, filters, or page changes
  useEffect(() => {
    if (selectedProject) {
      fetchProjectCostData(selectedProject.id);
    } else {
      setSummary(null);
    }
  }, [selectedProject, fetchProjectCostData]);

  useEffect(() => {
    if (selectedProject) {
      fetchProjectTransactions(selectedProject.id, currentPage, categoryFilter, dateFilter);
    } else {
      setTransactions([]);
      setTransactionsCount(0);
    }
  }, [selectedProject, currentPage, categoryFilter, dateFilter, fetchProjectTransactions]);

  const handleSelectProject = (project) => {
    setSelectedProject(project);
    setProjectSearchText(project.project_name);
    setShowProjectDropdown(false);
    setCurrentPage(1);
    setCategoryFilter('');
    setDateFilter('');
  };

  const handleClearProject = () => {
    setSelectedProject(null);
    setProjectSearchText('');
    setSummary(null);
    setTransactions([]);
    setTransactionsCount(0);
  };

  const handleRefresh = () => {
    if (selectedProject) {
      fetchProjectCostData(selectedProject.id);
      fetchProjectTransactions(selectedProject.id, currentPage, categoryFilter, dateFilter);
      toast.success('Data refreshed successfully.');
    }
  };

  const formatCurrency = (value) => {
    if (value === undefined || value === null) return '₹0.00';
    return `₹${Number(value).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatPercent = (value) => {
    if (value === undefined || value === null) return 'N/A';
    return `${Number(value).toFixed(2)}%`;
  };

  const pageSize = 10;
  const totalPages = Math.ceil(transactionsCount / pageSize) || 1;

  return (
    <div>
      {/* Top Header Section */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="fw-bold mb-0">Project Costs</h2>
          <p className="text-muted small mb-0">Monitor construction project budget utilization and transactional costs</p>
        </div>
        <div className="d-flex align-items-center gap-2">
          {selectedProject && (
            <button className="btn btn-outline-secondary d-flex align-items-center gap-1" onClick={handleRefresh} disabled={loading || loadingTransactions}>
              <FiRefreshCw className={loading || loadingTransactions ? 'spin' : ''} />
              <span>Refresh</span>
            </button>
          )}
          <BackToWorkCenter />
        </div>
      </div>

      {/* Project Selector Control */}
      <div className="card mb-4 border-0 shadow-sm">
        <div className="card-body">
          <div className="row align-items-center">
            <div className="col-md-6">
              <label className="form-label fw-bold text-muted small uppercase mb-1">Select Project</label>
              <div style={{ position: 'relative' }} ref={projectComboboxRef}>
                <div className="input-group">
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Search by Project Name..."
                    value={projectSearchText}
                    onChange={(e) => {
                      setProjectSearchText(e.target.value);
                      setShowProjectDropdown(true);
                      if (selectedProject && e.target.value !== selectedProject.project_name) {
                        setSelectedProject(null);
                      }
                    }}
                    onFocus={() => setShowProjectDropdown(true)}
                  />
                  {selectedProject && (
                    <button className="btn btn-outline-secondary" type="button" onClick={handleClearProject}>
                      ✕
                    </button>
                  )}
                </div>
                {showProjectDropdown && (
                  <ul className="list-group position-absolute w-100 shadow" style={{ zIndex: 1050, maxHeight: '200px', overflowY: 'auto' }}>
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
            {selectedProject && (
              <div className="col-md-6 mt-3 mt-md-0">
                <span className="text-muted small d-block">Selected Project Name</span>
                <span className="fw-bold text-primary fs-5">{selectedProject.project_name}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {!selectedProject ? (
        <div className="text-center py-5 bg-white rounded border d-flex flex-column align-items-center justify-content-center">
          <FiDollarSign size={48} className="text-muted mb-3" />
          <h5 className="fw-bold">No Project Selected</h5>
          <p className="text-muted max-w-md">Search and select a project in the dropdown above to view its cost overview and details.</p>
        </div>
      ) : loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-primary mb-3" role="status" />
          <h5 className="text-muted">Loading Project Cost...</h5>
        </div>
      ) : summary ? (
        <>
          {/* Summary Cards */}
          <div className="row g-3 mb-4">
            <div className="col-md-4 col-sm-6">
              <div className="card border-0 shadow-sm h-100">
                <div className="card-body">
                  <span className="text-muted small fw-semibold uppercase d-block mb-1">Project Budget</span>
                  <h3 className="fw-bold mb-0">{formatCurrency(summary.project_budget)}</h3>
                </div>
              </div>
            </div>
            <div className="col-md-4 col-sm-6">
              <div className="card border-0 shadow-sm h-100 border-start border-success border-4">
                <div className="card-body">
                  <span className="text-muted small fw-semibold uppercase d-block mb-1">Actual Cost</span>
                  <h3 className="fw-bold text-success mb-0">{formatCurrency(summary.actual_cost)}</h3>
                </div>
              </div>
            </div>
            <div className="col-md-4 col-sm-6">
              <div className="card border-0 shadow-sm h-100 border-start border-warning border-4">
                <div className="card-body">
                  <span className="text-muted small fw-semibold uppercase d-block mb-1">Committed Cost</span>
                  <h3 className="fw-bold text-warning mb-0">{formatCurrency(summary.committed_cost)}</h3>
                </div>
              </div>
            </div>
            <div className="col-md-4 col-sm-6">
              <div className="card border-0 shadow-sm h-100">
                <div className="card-body">
                  <span className="text-muted small fw-semibold uppercase d-block mb-1">Projected Final Cost</span>
                  <h3 className="fw-bold mb-0">{formatCurrency(summary.projected_final_cost)}</h3>
                </div>
              </div>
            </div>
            <div className="col-md-4 col-sm-6">
              <div className={`card border-0 shadow-sm h-100 border-start border-4 ${summary.remaining_budget < 0 ? 'border-danger bg-danger bg-opacity-10' : 'border-info'}`}>
                <div className="card-body">
                  <span className="text-muted small fw-semibold uppercase d-block mb-1">Remaining Budget</span>
                  <h3 className={`fw-bold mb-0 ${summary.remaining_budget < 0 ? 'text-danger' : 'text-info'}`}>
                    {formatCurrency(summary.remaining_budget)}
                  </h3>
                  {summary.remaining_budget < 0 && (
                    <span className="badge bg-danger mt-1">Over Budget</span>
                  )}
                </div>
              </div>
            </div>
            <div className="col-md-4 col-sm-6">
              <div className="card border-0 shadow-sm h-100">
                <div className="card-body">
                  <span className="text-muted small fw-semibold uppercase d-block mb-1">Cost Utilization %</span>
                  <h3 className="fw-bold mb-0">{formatPercent(summary.cost_utilization_percentage)}</h3>
                  {summary.cost_utilization_percentage !== null && (
                    <div className="progress mt-2" style={{ height: '6px' }}>
                      <div
                        className={`progress-bar ${summary.cost_utilization_percentage > 100 ? 'bg-danger' : 'bg-success'}`}
                        role="progressbar"
                        style={{ width: `${Math.min(summary.cost_utilization_percentage, 100)}%` }}
                        aria-valuenow={summary.cost_utilization_percentage}
                        aria-valuemin="0"
                        aria-valuemax="100"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Breakdown Section */}
          <h5 className="fw-bold mb-3">Cost Breakdown</h5>
          <div className="row g-3 mb-4">
            <div className="col">
              <div className="card border-0 shadow-sm">
                <div className="card-body text-center p-3">
                  <span className="text-muted small d-block mb-1">Material Cost</span>
                  <span className="fw-bold text-dark fs-5">{formatCurrency(summary.breakdown.material)}</span>
                </div>
              </div>
            </div>
            <div className="col">
              <div className="card border-0 shadow-sm">
                <div className="card-body text-center p-3">
                  <span className="text-muted small d-block mb-1">Labour Cost</span>
                  <span className="fw-bold text-dark fs-5">{formatCurrency(summary.breakdown.labour)}</span>
                </div>
              </div>
            </div>
            <div className="col">
              <div className="card border-0 shadow-sm">
                <div className="card-body text-center p-3">
                  <span className="text-muted small d-block mb-1">Subcontract Cost</span>
                  <span className="fw-bold text-dark fs-5">{formatCurrency(summary.breakdown.subcontract)}</span>
                </div>
              </div>
            </div>
            <div className="col">
              <div className="card border-0 shadow-sm">
                <div className="card-body text-center p-3">
                  <span className="text-muted small d-block mb-1">Equipment Cost</span>
                  <span className="fw-bold text-dark fs-5">{formatCurrency(summary.breakdown.equipment)}</span>
                </div>
              </div>
            </div>
            <div className="col">
              <div className="card border-0 shadow-sm">
                <div className="card-body text-center p-3">
                  <span className="text-muted small d-block mb-1">Other Expenses</span>
                  <span className="fw-bold text-dark fs-5">{formatCurrency(summary.breakdown.other)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Detailed Transaction Table Section */}
          <div className="card border-0 shadow-sm">
            <div className="card-header bg-white border-0 pt-4 pb-0">
              <div className="d-flex flex-wrap justify-content-between align-items-center gap-3">
                <h5 className="fw-bold mb-0">Cost Transactions</h5>
                
                {/* Filters Row */}
                <div className="d-flex align-items-center gap-2">
                  <div className="input-group input-group-sm" style={{ width: '180px' }}>
                    <span className="input-group-text bg-transparent border-end-0">
                      <FiFilter className="text-muted" />
                    </span>
                    <select
                      className="form-select border-start-0 ps-0 shadow-none"
                      value={categoryFilter}
                      onChange={(e) => {
                        setCategoryFilter(e.target.value);
                        setCurrentPage(1);
                      }}
                    >
                      <option value="">All Categories</option>
                      <option value="Material">Material</option>
                      <option value="Labour">Labour</option>
                      <option value="Subcontract">Subcontract</option>
                      <option value="Equipment">Equipment</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div className="input-group input-group-sm" style={{ width: '180px' }}>
                    <span className="input-group-text bg-transparent border-end-0">
                      <FiCalendar className="text-muted" />
                    </span>
                    <input
                      type="date"
                      className="form-control border-start-0 ps-0 shadow-none"
                      value={dateFilter}
                      onChange={(e) => {
                        setDateFilter(e.target.value);
                        setCurrentPage(1);
                      }}
                    />
                    {dateFilter && (
                      <button
                        className="btn btn-outline-secondary"
                        type="button"
                        onClick={() => {
                          setDateFilter('');
                          setCurrentPage(1);
                        }}
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="card-body p-0 mt-3">
              <div className="table-responsive">
                <table className="table table-hover mb-0">
                  <thead className="table-light">
                    <tr>
                      <th>Date</th>
                      <th>Category</th>
                      <th>Description</th>
                      <th>Reference</th>
                      <th className="text-end">Amount</th>
                      <th className="text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loadingTransactions ? (
                      <tr>
                        <td colSpan="6" className="text-center py-5 text-muted">
                          <div className="spinner-border spinner-border-sm me-2" role="status" />
                          Loading transactions...
                        </td>
                      </tr>
                    ) : transactions.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="text-center py-5 text-muted">
                          <FiAlertCircle size={24} className="mb-2 d-block mx-auto text-warning" />
                          No cost transactions available for this project.
                        </td>
                      </tr>
                    ) : (
                      transactions.map((tx, idx) => (
                        <tr key={idx}>
                          <td>{tx.date}</td>
                          <td>
                            <span className="badge bg-secondary bg-opacity-10 text-secondary">
                              {tx.cost_category}
                            </span>
                          </td>
                          <td className="text-wrap" style={{ maxWidth: '300px' }}>{tx.description}</td>
                          <td><code className="text-dark">{tx.reference}</code></td>
                          <td className="text-end fw-semibold">{formatCurrency(tx.amount)}</td>
                          <td className="text-center">
                            <StatusBadge status={tx.status} />
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination controls */}
              {totalPages > 1 && (
                <div className="d-flex justify-content-between align-items-center p-3 border-top bg-white">
                  <span className="text-muted small">
                    Showing page {currentPage} of {totalPages} ({transactionsCount} total transactions)
                  </span>
                  <nav>
                    <ul className="pagination pagination-sm mb-0">
                      <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                        <button
                          type="button"
                          className="page-link shadow-none"
                          onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        >
                          Previous
                        </button>
                      </li>
                      {[...Array(totalPages)].map((_, idx) => (
                        <li key={idx} className={`page-item ${currentPage === idx + 1 ? 'active' : ''}`}>
                          <button
                            type="button"
                            className="page-link shadow-none"
                            onClick={() => setCurrentPage(idx + 1)}
                          >
                            {idx + 1}
                          </button>
                        </li>
                      ))}
                      <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                        <button
                          type="button"
                          className="page-link shadow-none"
                          onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                        >
                          Next
                        </button>
                      </li>
                    </ul>
                  </nav>
                </div>
              )}
            </div>
          </div>
        </>
      ) : (
        <div className="text-center py-5 bg-white rounded border d-flex flex-column align-items-center justify-content-center">
          <FiAlertCircle size={48} className="text-warning mb-3" />
          <h5 className="fw-bold">Data Unavailable</h5>
          <p className="text-muted max-w-md">Failed to calculate or retrieve cost summary details for the selected project.</p>
        </div>
      )}
    </div>
  );
};

export default Costs;

