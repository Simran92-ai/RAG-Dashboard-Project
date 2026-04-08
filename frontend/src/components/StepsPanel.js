import React, { useState } from 'react';
import './StepsPanel.css';

const STEP_META = {
  start:     { icon: '▶', label: 'START',     colorVar: '--accent-blue' },
  visit:     { icon: '●', label: 'VISIT',     colorVar: '--accent-green' },
  explore:   { icon: '→', label: 'EXPLORE',   colorVar: '--accent-purple' },
  cycle:     { icon: '⚠', label: 'CYCLE!',    colorVar: '--accent-red' },
  backtrack: { icon: '◁', label: 'BACKTRACK', colorVar: '--text-muted' },
};

export default function StepsPanel({ steps }) {
  const [activeStep, setActiveStep] = useState(null);

  if (!steps || steps.length === 0) {
    return (
      <div className="steps-panel">
        <div className="steps-header">
          <span className="steps-title">🔍 DFS Detection Steps</span>
        </div>
        <div className="steps-empty">No traversal steps available.</div>
      </div>
    );
  }

  return (
    <div className="steps-panel">
      <div className="steps-header">
        <span className="steps-title">🔍 DFS Detection Steps</span>
        <span className="steps-count">{steps.length} steps</span>
      </div>

      <p className="steps-intro">
        Follow the DFS traversal that detected the deadlock cycle.
        Click any step to expand details.
      </p>

      <div className="steps-list">
        {steps.map((step, i) => {
          const meta    = STEP_META[step.type] || STEP_META.visit;
          const isOpen  = activeStep === i;
          const isCycle = step.type === 'cycle';

          // Prefer human-readable label over raw ID
          const displayMsg = step.message
            .replace(/p(\d+)/g, (_, n) => step[`node_label`] || `p${n}`)
            || step.message;

          // Use enriched message if backend sends node_label
          const message = step.message;

          const stackLabels = step.current_stack_labels?.length
            ? step.current_stack_labels
            : step.current_stack || [];

          return (
            <div
              key={i}
              className={`step-row ${isCycle ? 'step-row--cycle' : ''} ${isOpen ? 'step-row--open' : ''}`}
              style={{ '--step-color': `var(${meta.colorVar})` }}
            >
              {/* ── Clickable header ── */}
              <div
                className="step-header"
                onClick={() => setActiveStep(isOpen ? null : i)}
              >
                <span className="step-num">#{step.step}</span>
                <span className="step-icon" style={{ color: `var(${meta.colorVar})` }}>
                  {meta.icon}
                </span>
                <span className="step-type" style={{ color: `var(${meta.colorVar})` }}>
                  {meta.label}
                </span>
                <span className="step-msg">{message}</span>
                <span className="step-chevron">{isOpen ? '▲' : '▼'}</span>
              </div>

              {/* ── Expanded details — rendered OUTSIDE the clipping context ── */}
              {isOpen && (
                <div className="step-detail">
                  <div className="step-detail-grid">
                    <span className="detail-key">Node</span>
                    <span className="detail-val mono">
                      {step.node_label || step.node}
                    </span>

                    <span className="detail-key">Type</span>
                    <span className="detail-val" style={{ color: `var(${meta.colorVar})` }}>
                      {meta.label}
                    </span>

                    <span className="detail-key">Message</span>
                    <span className="detail-val">{message}</span>

                    {stackLabels.length > 0 && (
                      <>
                        <span className="detail-key">DFS Stack</span>
                        <div className="detail-stack">
                          {stackLabels.map((n, j) => (
                            <span key={j} className="stack-chip">{n}</span>
                          ))}
                        </div>
                      </>
                    )}

                    {isCycle && (
                      <>
                        <span className="detail-key">Status</span>
                        <span className="detail-val detail-val--cycle">
                          🔴 Back edge found — deadlock confirmed
                        </span>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}