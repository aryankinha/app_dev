import { useState, useEffect } from 'react'
import './App.css'

function App() {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    window.athena?.startTimer?.();
    const unsub = window.athena?.onTimerTick?.((val) => {
      setElapsed(val);
    });
    return () => unsub?.();
  }, []);

  return (
    <div className="page-container">
      <div className="header-section">
        <h1>Athena Examination Portal</h1>
        <p>Proctored Desktop Assessment Environment</p>
      </div>

      <div className="card-container" style={{ textAlign: 'center', padding: '32px' }}>
        <h3>Diagnostic Session Active</h3>
        <p style={{ margin: '16px 0', fontSize: '18px', fontWeight: 600 }}>
          Session Elapsed: {elapsed} seconds
        </p>

        <div className="bottom-actions" style={{ justifyContent: 'center', marginTop: '24px' }}>
          <button
            className="btn btn-red"
            style={{ backgroundColor: '#ef4444', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '6px', cursor: 'pointer' }}
            onClick={() => window.athena?.quitApp?.()}
          >
            Quit Application
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;
