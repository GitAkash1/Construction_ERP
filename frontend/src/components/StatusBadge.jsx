import React from 'react';

const StatusBadge = ({ status }) => {
  const getBadgeColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'active':
      case 'completed':
      case 'approved':
      case 'received':
        return 'success';
      case 'planned':
      case 'draft':
      case 'pending':
        return 'secondary';
      case 'on hold':
      case 'in progress':
      case 'ordered':
      case 'partially received':
        return 'warning';
      case 'delayed':
      case 'cancelled':
      case 'rejected':
      case 'inactive':
        return 'danger';
      default:
        return 'primary';
    }
  };

  return (
    <span className={`badge bg-${getBadgeColor(status)} bg-opacity-10 text-${getBadgeColor(status)}`}>
      {status}
    </span>
  );
};

export default StatusBadge;
