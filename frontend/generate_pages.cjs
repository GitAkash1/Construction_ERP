const fs = require('fs');

const pages = [
  { name: 'Tasks', endpoint: '/tasks/', columns: [{ header: 'Task Title', accessor: 'task_title' }, { header: 'Status', accessor: 'status' }] },
  { name: 'Materials', endpoint: '/materials/', columns: [{ header: 'Material Code', accessor: 'material_code' }, { header: 'Material Name', accessor: 'material_name' }, { header: 'Current Stock', accessor: 'current_stock' }] },
  { name: 'Stock', endpoint: '/stock-transactions/', columns: [{ header: 'Type', accessor: 'transaction_type' }, { header: 'Quantity', accessor: 'quantity' }, { header: 'Date', accessor: 'transaction_date' }] },
  { name: 'PurchaseRequests', endpoint: '/purchase-requests/', columns: [{ header: 'Request Number', accessor: 'request_number' }, { header: 'Status', accessor: 'status' }] },
  { name: 'PurchaseOrders', endpoint: '/purchase-orders/', columns: [{ header: 'PO Number', accessor: 'po_number' }, { header: 'Vendor', accessor: 'vendor' }, { header: 'Status', accessor: 'status' }] },
  { name: 'Contractors', endpoint: '/contractors/', columns: [{ header: 'Code', accessor: 'contractor_code' }, { header: 'Company Name', accessor: 'company_name' }, { header: 'Status', accessor: 'status' }] },
  { name: 'WorkOrders', endpoint: '/work-orders/', columns: [{ header: 'Description', accessor: 'work_description' }, { header: 'Status', accessor: 'status' }] },
  { name: 'Costs', endpoint: '/project-costs/', columns: [{ header: 'Category', accessor: 'cost_category' }, { header: 'Amount', accessor: 'amount' }, { header: 'Date', accessor: 'date' }] },
];

pages.forEach(p => {
  const code = `import React, { useState, useEffect } from 'react';
import DataTable from '../components/DataTable';
import StatusBadge from '../components/StatusBadge';
import api from '../services/api';
import { toast } from 'react-toastify';

const ${p.name} = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await api.get('${p.endpoint}');
      setData(response.data.results || response.data);
    } catch (error) {
      toast.error('Failed to load data.');
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    ${p.columns.map(c => `{ header: '${c.header}', accessor: '${c.accessor}' }`).join(',\n    ')}
  ];

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="fw-bold mb-0">${p.name}</h2>
      </div>

      <DataTable 
        columns={columns} 
        data={data} 
        loading={loading}
      />
    </div>
  );
};

export default ${p.name};
`;
  fs.writeFileSync(`src/pages/${p.name}.jsx`, code);
});

console.log('Pages generated.');
