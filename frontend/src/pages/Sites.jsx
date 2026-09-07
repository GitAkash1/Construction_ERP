import React, { useState, useEffect } from 'react';
import { FiPlus } from 'react-icons/fi';
import DataTable from '../components/DataTable';
import StatusBadge from '../components/StatusBadge';
import api from '../services/api';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';

const Sites = () => {
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user, hasPermission } = useAuth();

  useEffect(() => {
    fetchSites();
  }, []);

  const fetchSites = async () => {
    try {
      setLoading(true);
      const response = await api.get('/sites/');
      setSites(response.data.results || response.data);
    } catch (error) {
      toast.error('Failed to load sites.');
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    { header: 'Site Name', accessor: 'site_name', render: (row) => <span className="fw-semibold">{row.site_name}</span> },
    { header: 'Location', accessor: 'site_location' },
    { header: 'Status', accessor: 'status', render: (row) => <StatusBadge status={row.status} /> },
  ];

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="fw-bold mb-0">Sites</h2>
      </div>

      <DataTable 
        columns={columns} 
        data={sites} 
        loading={loading}
        actions={
          hasPermission('sites.create') && (
            <button className="btn btn-primary d-flex align-items-center gap-2">
              <FiPlus /> New Site
            </button>
          )
        }
      />
    </div>
  );
};

export default Sites;
