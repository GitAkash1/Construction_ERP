import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { FiMapPin, FiCalendar, FiDollarSign, FiArrowLeft } from 'react-icons/fi';
import StatusBadge from '../components/StatusBadge';
import ProgressBar from '../components/ProgressBar';
import api from '../services/api';
import { toast } from 'react-toastify';

const ProjectDetail = () => {
  const { id } = useParams();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    const fetchProjectDetails = async () => {
      try {
        setLoading(true);
        const response = await api.get(`/projects/projects/${id}/`);
        setProject(response.data);
      } catch (error) {
        toast.error('Failed to load project details.');
      } finally {
        setLoading(false);
      }
    };
    fetchProjectDetails();
  }, [id]);

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: '70vh' }}>
        <div className="spinner-border text-primary" role="status"></div>
      </div>
    );
  }

  if (!project) return <div>Project not found.</div>;

  return (
    <div>
      <div className="mb-4 d-flex align-items-center gap-3">
        <Link to="/projects" className="btn btn-light rounded-circle p-2 d-flex align-items-center justify-content-center text-muted">
          <FiArrowLeft size={20} />
        </Link>
        <div>
          <div className="d-flex align-items-center gap-3 mb-1">
            <h2 className="fw-bold mb-0">{project.project_name}</h2>
            <StatusBadge status={project.status} />
          </div>
          <span className="text-muted fw-semibold">{project.project_code} • {project.client_name}</span>
        </div>
      </div>

      <div className="card border-0 mb-4">
        <div className="card-body p-4">
          <div className="row g-4">
            <div className="col-md-3">
              <div className="d-flex align-items-center gap-3 text-muted mb-1">
                <FiMapPin /> Location
              </div>
              <div className="fw-medium text-dark">{project.project_location}</div>
            </div>
            <div className="col-md-3">
              <div className="d-flex align-items-center gap-3 text-muted mb-1">
                <FiCalendar /> Start Date
              </div>
              <div className="fw-medium text-dark">{project.start_date}</div>
            </div>
            <div className="col-md-3">
              <div className="d-flex align-items-center gap-3 text-muted mb-1">
                <FiCalendar /> Expected End
              </div>
              <div className="fw-medium text-dark">{project.expected_end_date}</div>
            </div>
            <div className="col-md-3">
              <div className="d-flex align-items-center gap-3 text-muted mb-1">
                <FiDollarSign /> Budget
              </div>
              <div className="fw-medium text-dark">${Number(project.estimated_budget).toLocaleString()}</div>
            </div>
          </div>
        </div>
      </div>

      <ul className="nav nav-tabs border-bottom border-2 mb-4">
        {['Overview', 'Engineering', 'Tasks', 'Sites', 'Procurement', 'Finance'].map(tab => (
          <li className="nav-item" key={tab}>
            <button 
              className={`nav-link border-0 text-muted fw-medium pb-3 px-4 ${activeTab === tab.toLowerCase() ? 'active text-primary bg-transparent border-bottom border-primary border-3' : ''}`}
              onClick={() => setActiveTab(tab.toLowerCase())}
              style={{ borderRadius: 0, marginBottom: '-2px' }}
            >
              {tab}
            </button>
          </li>
        ))}
      </ul>

      <div className="tab-content">
        {activeTab === 'overview' && (
          <div className="card border-0 p-4">
            <h5 className="fw-bold mb-3">Client Details</h5>
            {project.client_mobile && (
              <p className="text-muted mb-2"><span className="fw-semibold text-dark">Mobile: </span>{project.client_mobile}</p>
            )}
            <p className="text-muted mb-0"><span className="fw-semibold text-dark">Address: </span>{project.client_address || "No address provided."}</p>
          </div>
        )}
        
        {/* Placeholder for other tabs */}
        {activeTab !== 'overview' && (
          <div className="card border-0 p-5 text-center text-muted">
            <p className="mb-0">This module is under construction.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProjectDetail;
