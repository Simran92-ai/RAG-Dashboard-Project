import React, { useState, useCallback } from 'react';
import './InputPanel.css';

const CATEGORIES = ['CPU', 'Memory', 'I/O Device', 'File', 'Network'];
const PROCESS_NAMES  = ['Process A','Process B','Process C','Process D','Process E',
                        'Process F','Process G','Process H','Process I','Process J'];
const RESOURCE_NAMES = ['Resource X','Resource Y','Resource Z','Resource W',
                        'Resource V','Resource U','Resource T','Resource S'];

const mkProcess  = (i) => ({ id: `p${i}`, label: PROCESS_NAMES[i] || `Process ${i}` });
const mkResource = (i) => ({
  id: `r${i}`, label: RESOURCE_NAMES[i] || `Resource ${i}`,
  category: 'CPU', instances: 1,
});

export default function InputPanel({ onAnalyze, onLoadSample, loading }) {
  const [processes,   setProcesses]   = useState([mkProcess(0), mkProcess(1)]);
  const [resources,   setResources]   = useState([mkResource(0), mkResource(1)]);
  const [requests,    setRequests]    = useState([]);
  const [allocations, setAllocations] = useState([]);
  const [maxDemand,   setMaxDemand]   = useState([]);
  const [showMax,     setShowMax]     = useState(false);
  const [newReq,      setNewReq]      = useState({ process: 'p0', resource: 'r0' });
  const [newAlloc,    setNewAlloc]    = useState({ resource: 'r0', process: 'p0', instances: 1 });
  const [newMax,      setNewMax]      = useState({ process: 'p0', resource: 'r0', instances: 1 });
  const [validErr,    setValidErr]    = useState('');

  const isMulti = resources.some(r => parseInt(r.instances) > 1);

  // ── Process management ────────────────────────────────────────
  const addProcess = () => {
    const i = processes.length;
    setProcesses(prev => [...prev, mkProcess(i)]);
  };
  const removeProcess = (idx) => {
    const pid = processes[idx].id;
    setProcesses(prev => prev.filter((_, i) => i !== idx));
    setRequests(prev => prev.filter(r => r.process !== pid));
    setAllocations(prev => prev.filter(a => a.process !== pid));
    setMaxDemand(prev => prev.filter(m => m.process !== pid));
  };
  const updateProcess = (idx, val) =>
    setProcesses(prev => prev.map((p, i) => i === idx ? { ...p, label: val } : p));

  // ── Resource management ───────────────────────────────────────
  const addResource = () => {
    const i = resources.length;
    setResources(prev => [...prev, mkResource(i)]);
  };
  const removeResource = (idx) => {
    const rid = resources[idx].id;
    setResources(prev => prev.filter((_, i) => i !== idx));
    setRequests(prev => prev.filter(r => r.resource !== rid));
    setAllocations(prev => prev.filter(a => a.resource !== rid));
    setMaxDemand(prev => prev.filter(m => m.resource !== rid));
  };
  const updateResource = (idx, field, val) =>
    setResources(prev => prev.map((r, i) => i === idx ? { ...r, [field]: val } : r));

  // ── Edge management ───────────────────────────────────────────
  const addRequest = () => {
    if (requests.some(r => r.process === newReq.process && r.resource === newReq.resource)) return;
    setRequests(prev => [...prev, { ...newReq }]);
  };
  const addAllocation = () => {
    if (allocations.some(a => a.resource === newAlloc.resource && a.process === newAlloc.process)) return;
    setAllocations(prev => [...prev, { ...newAlloc }]);
  };
  const addMaxDemand = () => {
    setMaxDemand(prev => {
      const exists = prev.findIndex(m => m.process === newMax.process && m.resource === newMax.resource);
      if (exists >= 0) {
        const updated = [...prev];
        updated[exists] = { ...newMax };
        return updated;
      }
      return [...prev, { ...newMax }];
    });
  };

  const pLabel = (id) => processes.find(p => p.id === id)?.label || id;
  const rLabel = (id) => {
    const r = resources.find(r => r.id === id);
    return r ? r.label : id;
  };

  // ── Load sample ───────────────────────────────────────────────
  const handleSample = useCallback(async (type) => {
    const s = await onLoadSample(type);
    if (!s) return;
    setProcesses(s.processes);
    setResources(s.resources.map(r => ({
      ...r, category: r.category || 'CPU', instances: r.instances || 1
    })));
    setRequests(s.requests);
    setAllocations(s.allocations);
    setMaxDemand(s.max_demand || []);
    setShowMax((s.max_demand || []).length > 0);
    if (s.processes[0]) setNewReq({ process: s.processes[0].id, resource: s.resources[0].id });
    if (s.resources[0]) setNewAlloc({ resource: s.resources[0].id, process: s.processes[0].id, instances: 1 });
  }, [onLoadSample]);

  const handleReset = () => {
    setProcesses([mkProcess(0), mkProcess(1)]);
    setResources([mkResource(0), mkResource(1)]);
    setRequests([]); setAllocations([]); setMaxDemand([]);
    setValidErr(''); setShowMax(false);
    setNewReq({ process: 'p0', resource: 'r0' });
    setNewAlloc({ resource: 'r0', process: 'p0', instances: 1 });
    setNewMax({ process: 'p0', resource: 'r0', instances: 1 });
  };

  const handleSubmit = () => {
    if (requests.length === 0 && allocations.length === 0) {
      setValidErr('Add at least one edge.'); return;
    }
    setValidErr('');
    onAnalyze({ processes, resources, requests, allocations, max_demand: maxDemand });
  };

  return (
    <div className="input-panel">

      {/* ── Processes ── */}
      <div className="ip-section">
        <div className="ip-section-header">
          <div className="ip-section-title">
            <span className="ip-dot ip-dot--process"></span> Processes
          </div>
          <button className="ip-add-node-btn" onClick={addProcess}>+ Add</button>
        </div>
        <div className="ip-labels-grid">
          {processes.map((p, i) => (
            <div key={p.id} className="ip-label-row">
              <span className="ip-node-id">{p.id}</span>
              <input
                className="ip-input"
                value={p.label}
                onChange={e => updateProcess(i, e.target.value)}
                placeholder={`Process ${i}`}
              />
              {processes.length > 1 && (
                <button className="ip-remove-node" onClick={() => removeProcess(i)} title="Remove">×</button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── Resources ── */}
      <div className="ip-section">
        <div className="ip-section-header">
          <div className="ip-section-title">
            <span className="ip-dot ip-dot--resource"></span> Resources
          </div>
          <button className="ip-add-node-btn" onClick={addResource}>+ Add</button>
        </div>
        <div className="ip-res-grid">
          {resources.map((r, i) => (
            <div key={r.id} className="ip-res-row">
              <span className="ip-node-id">{r.id}</span>
              <input
                className="ip-input ip-input--name"
                value={r.label}
                onChange={e => updateResource(i, 'label', e.target.value)}
                placeholder="Name"
              />
              <select
                className="ip-select ip-select--cat"
                value={r.category}
                onChange={e => updateResource(i, 'category', e.target.value)}
              >
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <input
                className="ip-input ip-input--inst"
                type="number"
                min="1"
                value={r.instances}
                onChange={e => updateResource(i, 'instances', Math.max(1, parseInt(e.target.value) || 1))}
                title="Instances"
              />
              {resources.length > 1 && (
                <button className="ip-remove-node" onClick={() => removeResource(i)} title="Remove">×</button>
              )}
            </div>
          ))}
        </div>
        {isMulti && (
          <div className="ip-multi-badge">⚡ Multi-instance detected — Banker's Algorithm will be used</div>
        )}
      </div>

      {/* ── Request Edges ── */}
      <div className="ip-section">
        <div className="ip-section-title">Request Edges <span className="ip-badge">(Process → Resource)</span></div>
        <div className="ip-edge-add">
          <select className="ip-select" value={newReq.process}
            onChange={e => setNewReq(v => ({ ...v, process: e.target.value }))}>
            {processes.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
          </select>
          <span className="ip-arrow">→</span>
          <select className="ip-select" value={newReq.resource}
            onChange={e => setNewReq(v => ({ ...v, resource: e.target.value }))}>
            {resources.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
          </select>
          <button className="ip-add-btn" onClick={addRequest}>+</button>
        </div>
        <div className="ip-edge-list">
          {requests.length === 0 && <div className="ip-empty">No request edges</div>}
          {requests.map((req, i) => (
            <div key={i} className="ip-edge-chip ip-edge-chip--request">
              <span>{pLabel(req.process)}</span>
              <span className="ip-arrow-chip">→</span>
              <span>{rLabel(req.resource)}</span>
              <button onClick={() => setRequests(p => p.filter((_, j) => j !== i))} className="ip-remove">×</button>
            </div>
          ))}
        </div>
      </div>

      {/* ── Allocation Edges ── */}
      <div className="ip-section">
        <div className="ip-section-title">Allocation Edges <span className="ip-badge">(Resource → Process)</span></div>
        <div className="ip-edge-add">
          <select className="ip-select" value={newAlloc.resource}
            onChange={e => setNewAlloc(v => ({ ...v, resource: e.target.value }))}>
            {resources.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
          </select>
          <span className="ip-arrow">→</span>
          <select className="ip-select" value={newAlloc.process}
            onChange={e => setNewAlloc(v => ({ ...v, process: e.target.value }))}>
            {processes.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
          </select>
          {isMulti && (
            <input type="number" min="1" className="ip-input ip-input--inst"
              value={newAlloc.instances}
              onChange={e => setNewAlloc(v => ({ ...v, instances: Math.max(1, parseInt(e.target.value) || 1) }))}
              title="Instances to allocate"
            />
          )}
          <button className="ip-add-btn" onClick={addAllocation}>+</button>
        </div>
        <div className="ip-edge-list">
          {allocations.length === 0 && <div className="ip-empty">No allocation edges</div>}
          {allocations.map((alloc, i) => (
            <div key={i} className="ip-edge-chip ip-edge-chip--alloc">
              <span>{rLabel(alloc.resource)}</span>
              <span className="ip-arrow-chip">→</span>
              <span>{pLabel(alloc.process)}</span>
              {isMulti && <span className="ip-inst-badge">×{alloc.instances || 1}</span>}
              <button onClick={() => setAllocations(p => p.filter((_, j) => j !== i))} className="ip-remove">×</button>
            </div>
          ))}
        </div>
      </div>

      {/* ── Max Demand (optional, for Banker's) ── */}
      {isMulti && (
        <div className="ip-section">
          <div className="ip-section-header">
            <div className="ip-section-title">Max Demand <span className="ip-badge">(optional)</span></div>
            <button className="ip-toggle-btn" onClick={() => setShowMax(s => !s)}>
              {showMax ? '▲ Hide' : '▼ Show'}
            </button>
          </div>
          {showMax && (
            <>
              <div className="ip-edge-add">
                <select className="ip-select" value={newMax.process}
                  onChange={e => setNewMax(v => ({ ...v, process: e.target.value }))}>
                  {processes.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
                </select>
                <span className="ip-arrow">needs max</span>
                <input type="number" min="1" className="ip-input ip-input--inst"
                  value={newMax.instances}
                  onChange={e => setNewMax(v => ({ ...v, instances: Math.max(1, parseInt(e.target.value) || 1) }))}
                />
                <span className="ip-arrow">of</span>
                <select className="ip-select" value={newMax.resource}
                  onChange={e => setNewMax(v => ({ ...v, resource: e.target.value }))}>
                  {resources.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
                </select>
                <button className="ip-add-btn" onClick={addMaxDemand}>+</button>
              </div>
              <div className="ip-edge-list">
                {maxDemand.length === 0 && <div className="ip-empty">No max demand entries</div>}
                {maxDemand.map((m, i) => (
                  <div key={i} className="ip-edge-chip ip-edge-chip--max">
                    <span>{pLabel(m.process)}</span>
                    <span className="ip-arrow-chip">max {m.instances}</span>
                    <span>{rLabel(m.resource)}</span>
                    <button onClick={() => setMaxDemand(p => p.filter((_, j) => j !== i))} className="ip-remove">×</button>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {validErr && <div className="ip-validation-err">{validErr}</div>}

      <div className="ip-actions">
        <button className="ip-btn ip-btn--primary" onClick={handleSubmit} disabled={loading}>
          {loading ? <><span className="ip-spinner"></span> Analyzing…</> : <><span>⬡</span> Generate Graph</>}
        </button>
        <div className="ip-sample-row">
          <button className="ip-btn ip-btn--secondary" onClick={() => handleSample('single')}>⚡ Sample (Single)</button>
          <button className="ip-btn ip-btn--secondary" onClick={() => handleSample('multi')}>⚡ Sample (Multi)</button>
        </div>
        <button className="ip-btn ip-btn--ghost" onClick={handleReset}>↺ Reset</button>
      </div>
    </div>
  );
}
