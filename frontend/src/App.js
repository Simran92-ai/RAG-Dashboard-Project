import React, { useState, useCallback } from 'react';
import Header from './components/Header';
import InputPanel from './components/InputPanel';
import GraphCanvas from './components/GraphCanvas';
import ResultPanel from './components/ResultPanel';
import StepsPanel from './components/StepsPanel';
import MatrixTables from './components/MatrixTables';
import EducationSection from './components/EducationSection';
import './styles/App.css';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

export default function App() {
  const [theme, setTheme]           = useState('dark');
  const [graphData, setGraphData]   = useState(null);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState('');
  const [showSteps, setShowSteps]   = useState(false);
  const [showExpl, setShowExpl]     = useState(false);

  const toggleTheme = () => setTheme(t => t === 'dark' ? 'light' : 'dark');

  const handleAnalyze = useCallback(async (inputData) => {
    setLoading(true); setError(''); setGraphData(null);
    setShowSteps(false); setShowExpl(false);
    try {
      const res  = await fetch(`${API_BASE}/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(inputData),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Server error');
      setGraphData(json);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleLoadSample = useCallback(async (type = 'single') => {
    try {
      const url = type === 'multi' ? `${API_BASE}/sample_multi` : `${API_BASE}/sample`;
      const res = await fetch(url);
      return await res.json();
    } catch {
      setError('Could not load sample data. Is the backend running?');
      return null;
    }
  }, []);

  return (
    <div data-theme={theme} className="app-root">
      <Header theme={theme} onToggleTheme={toggleTheme} />
      <main className="app-main">
        <div className="layout-grid">
          <aside className="panel-left">
            <InputPanel onAnalyze={handleAnalyze} onLoadSample={handleLoadSample} loading={loading} />
            <EducationSection />
          </aside>
          <section className="panel-right">
            {error && (
              <div className="error-banner" role="alert">
                <span className="error-icon">⚠</span>
                <span>{error}</span>
                <button onClick={() => setError('')} className="error-dismiss">×</button>
              </div>
            )}
            <GraphCanvas graphData={graphData} loading={loading} />
            {graphData && (
              <>
                <ResultPanel
                  graphData={graphData}
                  showSteps={showSteps}
                  showExplanation={showExpl}
                  onToggleSteps={() => setShowSteps(s => !s)}
                  onToggleExplanation={() => setShowExpl(s => !s)}
                />
                {showSteps && graphData.detection_mode === 'single_instance' && (
                  <StepsPanel steps={graphData.traversal_steps} />
                )}
                <MatrixTables graphData={graphData} />
              </>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
