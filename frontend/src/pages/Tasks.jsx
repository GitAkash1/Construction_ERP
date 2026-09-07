import React, { useState, useEffect } from 'react';
import DataTable from '../components/DataTable';
import StatusBadge from '../components/StatusBadge';
import api from '../services/api';
import { toast } from 'react-toastify';

const Tasks = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await api.get('/tasks/');
      setData(response.data.results || response.data);
    } catch (error) {
      toast.error('Failed to load data.');
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    { header: 'Task Title', accessor: 'task_title' },
    { header: 'Status', accessor: 'status' }
  ];

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="fw-bold mb-0">Tasks</h2>
      </div>

      <DataTable 
        columns={columns} 
        data={data} 
        loading={loading}
      />
    </div>
  );
};

export default Tasks;
