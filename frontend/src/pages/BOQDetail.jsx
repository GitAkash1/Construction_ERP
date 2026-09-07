import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { FiArrowLeft, FiPlus, FiTrash2 } from 'react-icons/fi';
import api from '../services/api';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';

const BOQDetail = () => {
  const { id } = useParams();
  const [boq, setBoq] = useState(null);
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [itemForm, setItemForm] = useState({ material_input: '', quantity: '', unit: '', rate: '' });
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [saving, setSaving] = useState(false);
  const { user, hasPermission } = useAuth();

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [boqRes, matRes] = await Promise.all([
        api.get(`/projects/boqs/${id}/`),
        api.get('/inventory/materials/'),
      ]);
      setBoq(boqRes.data);
      setMaterials(matRes.data.results || matRes.data);
    } catch { toast.error('Failed to load BOQ.'); }
    finally { setLoading(false); }
  }, [id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleMaterialChange = (name) => {
    const mat = materials.find(m => m.material_name.toLowerCase() === name.toLowerCase());
    setItemForm(f => ({ ...f, material_input: name, unit: mat && !f.unit ? mat.unit : f.unit }));
  };

  const handleAddItem = async (e) => {
    e.preventDefault();
    if (!itemForm.material_input || !itemForm.quantity || !itemForm.rate) {
      toast.error('Material, Quantity and Rate are required.');
      return;
    }
    setSaving(true);
    try {
      const mat = materials.find(m => m.material_name.toLowerCase() === itemForm.material_input.toLowerCase());
      const payload = {
        ...itemForm,
        material: mat ? mat.id : null,
        custom_material_name: mat ? '' : itemForm.material_input,
        boq: id
      };
      
      await api.post('/projects/boq-items/', payload);
      toast.success('BOQ item added.');
      setShowModal(false);
      setItemForm({ material_input: '', quantity: '', unit: '', rate: '' });
      fetchData();
    } catch (err) {
      const msg = err.response?.data ? JSON.stringify(err.response.data) : 'Failed to add item.';
      toast.error(msg);
    } finally { setSaving(false); }
  };

  const handleDeleteItem = async (itemId) => {
    if (!window.confirm('Delete this BOQ item?')) return;
    try {
      await api.delete(`/projects/boq-items/${itemId}/`);
      toast.success('Item removed.');
      fetchData();
    } catch { toast.error('Failed to delete item.'); }
  };

  if (loading) return <div className="text-center py-5"><div className="spinner-border text-primary" /></div>;
  if (!boq) return <div className="text-center py-5 text-muted">BOQ not found.</div>;

  return (
    <div>
      <div className="d-flex align-items-center gap-3 mb-4">
        <Link to="/boq" className="btn btn-light rounded-circle p-2"><FiArrowLeft size={20} /></Link>
        <div>
          <h2 className="fw-bold mb-0">{boq.boq_number}</h2>
          <span className="text-muted">{boq.title} · {boq.project_name}</span>
        </div>
        {hasPermission('boq.edit') && (
          <button className="btn btn-primary ms-auto d-flex align-items-center gap-2" onClick={() => setShowModal(true)}>
            <FiPlus /> Add Item
          </button>
        )}
      </div>

      {/* Summary */}
      <div className="card border-0 mb-4">
        <div className="card-body">
          <div className="row g-3">
            <div className="col-md-4">
              <div className="text-muted small fw-semibold text-uppercase mb-1">Total BOQ Estimated Cost</div>
              <div className="fs-4 fw-bold text-primary">₹{Number(boq.total_value || 0).toLocaleString('en-IN')}</div>
            </div>
            <div className="col-md-4">
              <div className="text-muted small fw-semibold text-uppercase mb-1">Items</div>
              <div className="fs-4 fw-bold">{boq.items?.length || 0}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Items Table */}
      <div className="card border-0">
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover mb-0">
              <thead>
                <tr>
                  <th>Product Name</th>
                  <th>Unit</th>
                  <th>Quantity</th>
                  <th>Per Unit Price</th>
                  <th>Total Cost</th>
                  <th>Consumed</th>
                  <th>Balance</th>
                  <th>Consumption %</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {boq.items?.length === 0 ? (
                  <tr><td colSpan={9} className="text-center py-5 text-muted">No items. Add BOQ items above.</td></tr>
                ) : boq.items?.map(item => (
                  <tr key={item.id}>
                    <td className="fw-semibold">{item.material_name}</td>
                    <td>{item.unit}</td>
                    <td>{Number(item.quantity).toLocaleString()}</td>
                    <td>₹{Number(item.rate).toLocaleString('en-IN')}</td>
                    <td>₹{Number(item.total_amount).toLocaleString('en-IN')}</td>
                    <td>{Number(item.consumed_quantity).toLocaleString()}</td>
                    <td>
                      <span className={`fw-semibold ${item.balance_quantity <= 0 ? 'text-danger' : 'text-success'}`}>
                        {Number(item.balance_quantity).toLocaleString()}
                      </span>
                    </td>
                    <td>
                      <div className="d-flex align-items-center gap-2">
                        <div className="progress flex-grow-1" style={{ height: '8px', minWidth: '80px' }}>
                          <div className="progress-bar" style={{ width: `${item.consumption_percentage}%` }} />
                        </div>
                        <span className="small text-muted">{item.consumption_percentage}%</span>
                      </div>
                    </td>
                    <td>
                      {hasPermission('boq.edit') && (
                        <button className="btn btn-sm btn-light text-danger" onClick={() => handleDeleteItem(item.id)}><FiTrash2 /></button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {showModal && (
        <div className="modal d-block" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title fw-bold">Add BOQ Item</h5>
                <button className="btn-close" onClick={() => setShowModal(false)} />
              </div>
              <form onSubmit={handleAddItem}>
                <div className="modal-body">
                  <div className="row g-3">
                    <div className="col-12">
                      <label className="form-label fw-semibold">Material *</label>
                      <div className="position-relative">
                        <input 
                          type="text"
                          className="form-control" 
                          required 
                          placeholder="Type/Search Material"
                          value={itemForm.material_input} 
                          onChange={(e) => {
                            setItemForm(f => ({ ...f, material_input: e.target.value }));
                            setActiveDropdown('material');
                          }}
                          onClick={() => setActiveDropdown('material')}
                          onBlur={() => setTimeout(() => setActiveDropdown(null), 200)}
                          autoComplete="off"
                        />
                        {activeDropdown === 'material' && (
                          <div className="dropdown-menu show w-100 position-absolute shadow-sm" style={{ top: '100%', left: 0, zIndex: 1050, maxHeight: '200px', overflowY: 'auto', padding: '4px 0', marginTop: '2px' }}>
                            {Array.from(new Set([
                                ...materials.map(m => m.material_name),
                                'Cement', 'Sand', 'Steel', 'Bricks', 'Concrete', 'Aggregate', 'Gravel', 'M-Sand', 'P-Sand', 'Jelly', 'Blue Metal', 'Blocks', 'Fly Ash', 'Tiles', 'Marble', 'Granite', 'Wood', 'Plywood', 'Glass', 'PVC Pipe', 'GI Pipe', 'CPVC Pipe', 'UPVC Pipe', 'Electrical Cable', 'Binding Wire', 'Nails', 'Paint', 'Primer', 'Waterproofing Material', 'Bitumen', 'Admixture'
                              ]))
                              .filter(name => name.toLowerCase().includes(itemForm.material_input.toLowerCase()))
                              .map(name => (
                                <button 
                                  key={name} 
                                  type="button" 
                                  className="dropdown-item py-1 small" 
                                  onMouseDown={(e) => {
                                    e.preventDefault();
                                    handleMaterialChange(name);
                                    setActiveDropdown(null);
                                  }}
                                >
                                  {name}
                                </button>
                              ))}
                              {Array.from(new Set([...materials.map(m => m.material_name), 'Cement', 'Sand', 'Steel', 'Bricks', 'Concrete', 'Aggregate', 'Gravel', 'M-Sand', 'P-Sand', 'Jelly', 'Blue Metal', 'Blocks', 'Fly Ash', 'Tiles', 'Marble', 'Granite', 'Wood', 'Plywood', 'Glass', 'PVC Pipe', 'GI Pipe', 'CPVC Pipe', 'UPVC Pipe', 'Electrical Cable', 'Binding Wire', 'Nails', 'Paint', 'Primer', 'Waterproofing Material', 'Bitumen', 'Admixture']))
                                .filter(name => name.toLowerCase().includes(itemForm.material_input.toLowerCase())).length === 0 && (
                                  <div className="dropdown-item text-muted small disabled py-1">No matching suggestions</div>
                              )}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="col-md-6">
                      <label className="form-label fw-semibold">Quantity *</label>
                      <input type="number" className="form-control" required min="0.01" step="0.01" value={itemForm.quantity} onChange={e => setItemForm(f => ({ ...f, quantity: e.target.value }))} />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label fw-semibold">Unit</label>
                      <input type="text" className="form-control" value={itemForm.unit} onChange={e => setItemForm(f => ({ ...f, unit: e.target.value }))} />
                    </div>
                    <div className="col-12">
                      <label className="form-label fw-semibold">Rate (₹) *</label>
                      <input type="number" className="form-control" required min="0" step="0.01" value={itemForm.rate} onChange={e => setItemForm(f => ({ ...f, rate: e.target.value }))} />
                      {itemForm.quantity && itemForm.rate && (
                        <div className="form-text text-primary fw-semibold">
                          Total: ₹{(Number(itemForm.quantity) * Number(itemForm.rate)).toLocaleString('en-IN')}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-light" onClick={() => setShowModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Add Item'}</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BOQDetail;
