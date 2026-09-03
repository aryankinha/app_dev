import { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [electronInfo, setElectronInfo] = useState({
    isElectron: false,
    platform: 'web',
    version: 'N/A',
  });
  const [ipcResponse, setIpcResponse] = useState('');
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (window.electronAPI) {
      setElectronInfo({
        isElectron: true,
        platform: window.electronAPI.platform || 'unknown',
        version: window.electronAPI.version || 'unknown',
      });
    }
  }, []);

  const handlePing = async () => {
    if (window.electronAPI?.ping) {
      const response = await window.electronAPI.ping();
      setIpcResponse(response);
    } else {
      setIpcResponse('IPC is only available when running inside Electron.');
    }
  };

  return (
    <div className="container">
      <header className="header">
        <div className="badge">
          {electronInfo.isElectron ? '⚡ Running in Electron' : '🌐 Running in Browser Preview'}
        </div>
        <h1 className="title">React + Electron Desktop App</h1>
        <p className="subtitle">
          Modular architecture with React frontend and Electron main process.
        </p>
      </header>

      <main className="grid">
        <div className="card">
          <div className="card-header">
            <h3>🖥️ System Environment</h3>
          </div>
          <div className="card-body">
            <div className="info-row">
              <span className="label">Platform</span>
              <span className="value"><code>{electronInfo.platform}</code></span>
            </div>
            <div className="info-row">
              <span className="label">Electron Version</span>
              <span className="value"><code>{electronInfo.version}</code></span>
            </div>
            <div className="info-row">
              <span className="label">Frontend Framework</span>
              <span className="value"><code>React 19 + Vite</code></span>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3>🔌 IPC Communication</h3>
          </div>
          <div className="card-body">
            <p className="desc">
              Test Inter-Process Communication between React renderer and Electron main process:
            </p>
            <button className="btn primary" onClick={handlePing}>
              Send Ping to Main Process
            </button>
            {ipcResponse && (
              <div className="response-box">
                <strong>Response:</strong> {ipcResponse}
              </div>
            )}
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3>✨ Interactive State</h3>
          </div>
          <div className="card-body">
            <p className="desc">Fast HMR state persistence:</p>
            <div className="counter-row">
              <button className="btn secondary" onClick={() => setCount((c) => c - 1)}>-</button>
              <span className="counter-val">{count}</span>
              <button className="btn secondary" onClick={() => setCount((c) => c + 1)}>+</button>
            </div>
          </div>
        </div>
      </main>

      <footer className="footer">
        <p>Main process logic is located in <code>app/index.js</code></p>
      </footer>
    </div>
  );
}

export default App;
