import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { FiArrowLeft } from 'react-icons/fi';

const BackToWorkCenter = () => {
  const location = useLocation();
  const navigate = useNavigate();

  // Show only when navigated from Work Center
  if (!location.state?.fromWorkCenter) {
    return null;
  }

  return (
    <button
      type="button"
      className="btn btn-outline-secondary d-flex align-items-center gap-2 me-2"
      onClick={() => navigate('/work-center')}
      style={{ padding: '0.375rem 0.75rem', fontSize: '0.875rem', fontWeight: '500' }}
    >
      <FiArrowLeft /> Back to Workcenter
    </button>
  );
};

export default BackToWorkCenter;
