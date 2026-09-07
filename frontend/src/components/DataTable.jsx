import React from 'react';
import { FiSearch } from 'react-icons/fi';

const DataTable = ({ columns, data, onSearch, loading, actions }) => {
  return (
    <div className="card border-0">
      <div className="card-header bg-white border-bottom-0 pt-4 pb-0 d-flex justify-content-between align-items-center">
        {onSearch && (
          <div className="input-group" style={{ maxWidth: '300px' }}>
            <span className="input-group-text bg-transparent border-end-0">
              <FiSearch className="text-muted" />
            </span>
            <input 
              type="text" 
              className="form-control border-start-0 ps-0" 
              placeholder="Search..." 
              onChange={(e) => onSearch(e.target.value)}
            />
          </div>
        )}
        <div className="d-flex gap-2">
          {actions}
        </div>
      </div>
      <div className="card-body p-0 mt-3">
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
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="text-center py-5 text-muted">
                    No records found.
                  </td>
                </tr>
              ) : (
                data.map((row, rowIndex) => (
                  <tr key={rowIndex}>
                    {columns.map((col, colIndex) => (
                      <td key={colIndex}>
                        {col.render ? col.render(row, rowIndex) : (typeof col.accessor === 'function' ? col.accessor(row, rowIndex) : row[col.accessor])}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default DataTable;
