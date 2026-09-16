import { useEffect, useRef, useState } from 'react'
import './App.css'

function App() {
  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [fullScreen, setFullScreen] = useState(false);
  const [timer, setTimer] = useState('');

  const videoRef = useRef(null);
  const streamRef = useRef(null);

  useEffect(() => {
    const removeTimer = window.athena?.registerListenerForTimerTickFromMain?.((t) => setTimer(t));
    const removeFs = window.athena?.registerListenerForFullScreenChange?.((isFs) => setFullScreen(isFs));
    window.athena?.isFullScreen?.().then((isFs) => {
      if (isFs) setFullScreen(true);
    });

    return () => {
      removeTimer?.();
      removeFs?.();
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
    };
  }, []);

  async function getCameraAccess() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setCameraEnabled(true);
    } catch (err) {
      alert('Cannot access camera: ' + err.message);
    }
  }

  async function enableFullScreen() {
    try {
      if (window.athena?.setFullScreen) {
        await window.athena.setFullScreen(true);
      }
      if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen().catch(() => {});
      }
      setFullScreen(true);
    } catch (err) {
      alert('Full screen error: ' + err.message);
    }
  }

  const canProceed = cameraEnabled && fullScreen;

  return (
    <div className="page-container">
      <div className="header-section">
        <h1>Quiz Setup & Verification</h1>
        <p>Grant camera and fullscreen access to verify your proctoring environment.</p>
      </div>

      <div className="card-container">
        <div className="permission-item">
          <div className="permission-left">
            <div className="icon-box">📷</div>
            <div className="permission-content">
              <h3>Configure Camera</h3>
              <p>Camera is required for candidate monitoring during the exam.</p>
              <button
                className={cameraEnabled ? "btn btn-success" : "btn btn-black"}
                disabled={cameraEnabled}
                onClick={getCameraAccess}
              >
                {cameraEnabled ? '✓ Camera Active' : 'Enable Camera'}
              </button>
            </div>
          </div>
          <div className="camera-box">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="video-preview"
              style={{ display: cameraEnabled ? 'block' : 'none' }}
            />
            {!cameraEnabled && (
              <div className="camera-placeholder">
                <span>Camera Preview</span>
              </div>
            )}
          </div>
        </div>

        <div className="divider"></div>

        <div className="permission-item">
          <div className="permission-left">
            <div className="icon-box">⛶</div>
            <div className="permission-content">
              <h3>Switch to Fullscreen</h3>
              <p>Exam runs in dedicated fullscreen mode to maintain assessment integrity.</p>
              <button
                className={fullScreen ? "btn btn-success" : "btn btn-black"}
                disabled={fullScreen}
                onClick={enableFullScreen}
              >
                {fullScreen ? '✓ Fullscreen Active' : 'Enter Fullscreen'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="bottom-actions" style={{ marginTop: '24px' }}>
        <button className="btn btn-primary" disabled={!canProceed}>
          Proceed to Exam
        </button>
      </div>
    </div>
  );
}

export default App;
