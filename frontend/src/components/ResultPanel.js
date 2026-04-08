import React from 'react';
import './ResultPanel.css';

export default function ResultPanel({
  graphData, showSteps, showExplanation, onToggleSteps, onToggleExplanation
}) {
  const {
    deadlock_detected, detection_mode,
    cycle_path, deadlocked_procs, dependency_info,
    is_safe, safe_sequence, explanation,
  } = graphData;

  const isMulti  = detection_mode === 'multi_instance';
  const isSingle = detection_mode === 'single_instance';

  return (
    <div className="result-panel">

      {/* ── Status Banner ── */}
      <div className={`result-status ${deadlock_detected ? 'status--deadlock' : 'status--safe'}`}>
        <div className="status-icon">{deadlock_detected ? '🔴' : '🟢'}</div>
        <div className="status-content">
          <div className="status-title">
            {deadlock_detected ? 'Deadlock Detected' : 'System is in SAFE State'}
          </div>
          <div className="status-mode">
            Mode: {isMulti ? "Multi-instance (Banker's Algorithm)" : 'Single-instance (Cycle Detection)'}
          </div>

          {/* Single-instance cycle */}
          {isSingle && deadlock_detected && cycle_path?.length > 0 && (
            <div className="status-cycle">
              <span className="cycle-label">Cycle:</span>
              <div className="cycle-path">
                {cycle_path.map((node, i) => (
                  <React.Fragment key={i}>
                    <span className="cycle-node">{node}</span>
                    {i < cycle_path.length - 1 && <span className="cycle-arrow">→</span>}
                  </React.Fragment>
                ))}
              </div>
            </div>
          )}

          {/* Multi-instance deadlocked processes */}
          {isMulti && deadlock_detected && deadlocked_procs?.length > 0 && (
            <div className="status-cycle">
              <span className="cycle-label">Deadlocked:</span>
              <div className="cycle-path">
                {deadlocked_procs.map((p, i) => (
                  <span key={i} className="cycle-node cycle-node--proc">{p}</span>
                ))}
              </div>
            </div>
          )}

          {/* Multi-instance dependency explanation */}
          {isMulti && deadlock_detected && dependency_info?.length > 0 && (
            <div className="dep-info">
              {dependency_info.map((item, i) => (
                item.blocking.map((b, j) => (
                  <div key={`${i}-${j}`} className="dep-row">
                    <span className="dep-proc">{item.process}</span>
                    <span className="dep-arrow">→ needs {b.needed} of</span>
                    <span className="dep-res">{b.resource}</span>
                    <span className="dep-avail">(only {b.available} available)</span>
                  </div>
                ))
              ))}
            </div>
          )}

          {/* Safe sequence */}
          {!deadlock_detected && safe_sequence?.length > 0 && (
            <div className="safe-seq">
              <span className="safe-seq-label">Safe Sequence:</span>
              <div className="safe-seq-path">
                {safe_sequence.map((p, i) => (
                  <React.Fragment key={i}>
                    <span className="safe-node">{p}</span>
                    {i < safe_sequence.length - 1 && <span className="safe-arrow">→</span>}
                  </React.Fragment>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Action Buttons ── */}
      <div className="result-actions">
        {isSingle && (
          <button className={`ra-btn ${showSteps ? 'ra-btn--active' : ''}`} onClick={onToggleSteps}>
            <span>🔍</span> {showSteps ? 'Hide' : 'Show'} DFS Steps
          </button>
        )}
        <button className={`ra-btn ${showExplanation ? 'ra-btn--active' : ''}`} onClick={onToggleExplanation}>
          <span>📘</span> {showExplanation ? 'Hide' : 'Explain'} Result
        </button>
      </div>

      {/* ── Explanation ── */}
      {showExplanation && (
        <div className="explanation-box">
          <div className="explanation-header"><span>📊</span> Analysis Explanation</div>
          <pre className="explanation-text">{explanation}</pre>
        </div>
      )}
    </div>
  );
}
