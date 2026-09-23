// App.jsx
import { useEffect, useRef, useState } from 'react'
import './App.css'

const API_BASE = 'http://localhost:3000'

function formatTime(seconds) {
  if (seconds === '' || seconds === null || seconds === undefined) return '';
  const total = Math.floor(Number(seconds));
  if (isNaN(total) || total < 0) return '';
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  return `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

function App() {
  // Permissions & timer
  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [fullScreen, setFullScreen] = useState(false);
  const [timer, setTimer] = useState('');
  const [blurWarning, setBlurWarning] = useState('');

  // Exam flow: 'setup' | 'exam' | 'result'
  const [step, setStep] = useState('setup');
  const [sessionId, setSessionId] = useState('');
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [finalResult, setFinalResult] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Stream & video refs
  const videoRef = useRef(null);
  const examVideoRef = useRef(null);
  const streamRef = useRef(null);

  // Capture user webcam snapshot (low quality, small file size) on interval request from Main
  async function saveVideoScreenShots() {
    const video = examVideoRef.current || videoRef.current;
    if (video && video.videoWidth) {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 480;
        canvas.height = 360;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(async (blob) => {
          if (blob) {
            const arrayBuffer = await blob.arrayBuffer();
            window.athena?.storeCameraSnapImageOnDisk?.(arrayBuffer);
          }
        }, 'image/jpeg', 0.5);
        return;
      } catch (err) {
        console.warn("Canvas capture error, falling back:", err);
      }
    }

    // Fallback if video element is not ready
    const stream = streamRef.current;
    if (!stream) return;

    try {
      const track = stream.getVideoTracks()[0];
      if (!track || track.readyState !== 'live') return;

      if (window.ImageCapture) {
        const imageCapture = new ImageCapture(track);
        const blob = await imageCapture.takePhoto();
        const arrayBuffer = await blob.arrayBuffer();
        window.athena?.storeCameraSnapImageOnDisk?.(arrayBuffer);
      }
    } catch (error) {
      console.error("Failed to capture image:", error);
    }
  }

  useEffect(() => {
    // Register Listener for Timer Tick from Main
    const removeTimerTickListener = window.athena?.registerListenerForTimerTickFromMain?.((t) => {
      setTimer(t);
    });

    // Register Listener for Camera Snap Request from Main
    const removeCameraSnapListener = window.athena?.registerListenerForCameraSnapFromMain?.(saveVideoScreenShots);

    // Register Listener for Fullscreen change from Main
    const removeFullScreenListener = window.athena?.registerListenerForFullScreenChange?.((isFs) => {
      setFullScreen(isFs);
    });

    // Register Listener for Blur Warning from Main
    const removeBlurListener = window.athena?.registerListenerForBlurWarning?.(() => {
      setBlurWarning('⚠️ Notice: Exam window must remain active. Switching apps is restricted.');
      setTimeout(() => setBlurWarning(''), 5000);
    });

    // Check initial fullscreen status from Main if Electron
    window.athena?.isFullScreen?.().then((isFs) => {
      if (isFs) setFullScreen(true);
    });

    // Web DOM fullscreen change listener
    const onFsChange = () => {
      if (document.fullscreenElement) {
        setFullScreen(true);
      } else if (!window.athena?.isFullScreen) {
        setFullScreen(false);
      }
    };
    document.addEventListener('fullscreenchange', onFsChange);

    return () => {
      removeTimerTickListener?.();
      removeCameraSnapListener?.();
      removeFullScreenListener?.();
      removeBlurListener?.();
      document.removeEventListener('fullscreenchange', onFsChange);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      }
    };
  }, []);

  // Re-attach video stream if returning to setup or entering exam screen
  useEffect(() => {
    if (step === 'setup' && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
    }
    if (step === 'exam' && examVideoRef.current && streamRef.current) {
      examVideoRef.current.srcObject = streamRef.current;
    }
  }, [step]);

  async function getCameraAccess() {
    try {
      const videoData = await navigator.mediaDevices.getUserMedia({
        video: true
      });
      streamRef.current = videoData;
      if (videoRef.current) {
        videoRef.current.srcObject = videoData;
      }
      setCameraEnabled(true);
    } catch (error) {
      console.error(error);
      alert('Cannot access Camera. Please verify permissions in your browser or system.');
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
    } catch (error) {
      console.error(error);
      alert('Cannot access full screen');
    }
  }

  async function exitFullScreen() {
    try {
      if (window.athena?.setFullScreen) {
        await window.athena.setFullScreen(false);
      }
      if (document.exitFullscreen && document.fullscreenElement) {
        await document.exitFullscreen().catch(() => {});
      }
      setFullScreen(false);
    } catch (error) {
      console.error(error);
    }
  }

  // 1. Start Exam: POST /exam/start & GET /exam/mcq
  async function startExam() {
    try {
      await window.athena?.startTimerOnMain?.();
    } catch (error) {
      console.warn("Timer start warning:", error);
    }

    try {
      const res = await fetch(`${API_BASE}/exam/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.message || 'Failed to start exam');
        return;
      }

      setSessionId(data.sessionId);

      const qRes = await fetch(`${API_BASE}/exam/mcq`);
      const qData = await qRes.json();
      if (!Array.isArray(qData) || qData.length === 0) {
        alert('No questions found in this quiz.');
        return;
      }

      setQuestions(qData);
      setCurrentIndex(0);
      setStep('exam');
    } catch (error) {
      alert('Error connecting to backend: ' + error.message);
    }
  }

  // 2. Submit Answer
  async function sendAnswer(questionId, selectedAnswer) {
    if (!sessionId) return;
    try {
      await fetch(`${API_BASE}/exam/answer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          questionId,
          selectedAnswer
        })
      });
    } catch (error) {
      console.error('Error submitting answer:', error);
    }
  }

  function handleSelectOption(questionId, selectedAnswer) {
    setSelectedAnswers(prev => ({ ...prev, [questionId]: selectedAnswer }));
  }

  // 3. Submit Quiz: POST /exam/submit
  async function submitExam() {
    if (submitting) return;
    if (!window.confirm('Are you sure you want to submit the quiz?')) {
      return;
    }

    setSubmitting(true);
    try {
      for (const q of questions) {
        const chosen = selectedAnswers[q.id];
        if (chosen !== undefined) {
          await sendAnswer(q.id, chosen);
        }
      }

      const res = await fetch(`${API_BASE}/exam/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId })
      });
      const data = await res.json();

      if (!res.ok) {
        alert(data.message || 'Error submitting quiz');
        setSubmitting(false);
        return;
      }

      await window.athena?.stopTimerOnMain?.();
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      }

      setFinalResult(data.result);
      setStep('result');
    } catch (error) {
      alert('Error submitting quiz: ' + error.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function resetExam() {
    await exitFullScreen();
    await window.athena?.stopTimerOnMain?.();
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setCameraEnabled(false);
    setTimer('');
    setStep('setup');
    setSessionId('');
    setQuestions([]);
    setCurrentIndex(0);
    setSelectedAnswers({});
    setFinalResult(null);
    setSubmitting(false);
    setBlurWarning('');
  }

  const currentQ = questions[currentIndex];
  const canStartTest = cameraEnabled && fullScreen;

  return (
    <div className="page-container">
      {blurWarning && (
        <div className="warning-banner" style={{ backgroundColor: '#fef3c7', color: '#92400e', padding: '12px 16px', borderRadius: '8px', marginBottom: '16px', fontWeight: 600, border: '1px solid #fde68a' }}>
          {blurWarning}
        </div>
      )}

      {/* SCREEN 1: SETUP */}
      {step === 'setup' && (
        <>
          <div className="header-section">
            <h1>Quiz Setup</h1>
            <p>Please grant the following permissions to begin:</p>
          </div>

          <div className="card-container">
            {/* Section 1: Camera */}
            <div className="permission-item">
              <div className="permission-left">
                <div className="icon-box">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                    <circle cx="12" cy="13" r="4"/>
                  </svg>
                </div>
                <div className="permission-content">
                  <h3>Configure Camera</h3>
                  <p>Kindly configure Camera to attempt quiz/contests.</p>
                  <button
                    className={cameraEnabled ? "btn btn-success" : "btn btn-black"}
                    disabled={cameraEnabled}
                    onClick={getCameraAccess}
                  >
                    {cameraEnabled ? '✓ Camera Connected' : 'Get Camera Access'}
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
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5">
                      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                      <circle cx="12" cy="13" r="4"/>
                    </svg>
                    <span>Camera Preview</span>
                  </div>
                )}
              </div>
            </div>

            <div className="divider"></div>

            {/* Section 2: Fullscreen */}
            <div className="permission-item">
              <div className="permission-left">
                <div className="icon-box">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>
                  </svg>
                </div>
                <div className="permission-content">
                  <h3>Switch to full screen</h3>
                  <p>Kindly close all tabs and switch to full screen</p>
                  <button
                    className={fullScreen ? "btn btn-success" : "btn btn-black"}
                    disabled={fullScreen}
                    onClick={enableFullScreen}
                  >
                    {fullScreen ? '✓ Full Screen Enabled' : 'Give Full Screen Permissions'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="bottom-actions">
            <button
              className="btn btn-outline"
              style={{ marginRight: '12px' }}
              onClick={() => window.athena?.showRules?.()}
            >
              Exam Rules
            </button>
            <button
              className="btn btn-primary"
              disabled={!canStartTest}
              onClick={startExam}
            >
              Go To Test
            </button>
          </div>
        </>
      )}

      {/* SCREEN 2: EXAM */}
      {step === 'exam' && currentQ && (
        <div className="card-container">
          {/* Exam Header */}
          <div className="exam-header">
            <div>
              <h3>Athena Quiz</h3>
            </div>
            <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                <span className="exam-badge" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#22c55e', display: 'inline-block' }}></span>
                  Proctored
                </span>
                {timer !== '' && <span className="exam-badge">⏱ {formatTime(timer)}</span>}
                <span className="exam-badge">
                  Answered: {Object.keys(selectedAnswers).length} of {questions.length}
                </span>
              </div>

              {/* Live camera view while in quiz */}
              <div className="exam-camera-pip" title="Live Camera Feed">
                <video
                  ref={examVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="video-preview"
                />
              </div>
            </div>
          </div>

          <div className="divider" style={{ margin: '16px 0' }}></div>

          {/* Question Text */}
          <div style={{ textAlign: 'left', marginBottom: '8px' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748b' }}>
              Question {currentIndex + 1} of {questions.length}
            </span>
          </div>
          <h2 className="question-text">{currentQ.question}</h2>

          {/* Options */}
          <div className="options-list">
            {currentQ.options.map((option, idx) => {
              const isSelected = selectedAnswers[currentQ.id] === idx;
              return (
                <div
                  key={idx}
                  className={`option-item ${isSelected ? 'selected' : ''}`}
                  onClick={() => handleSelectOption(currentQ.id, idx)}
                >
                  <input
                    type="radio"
                    name={`q-${currentQ.id}`}
                    checked={isSelected}
                    readOnly
                  />
                  <span>{option}</span>
                </div>
              );
            })}
          </div>

          {/* Question Palette */}
          <div className="palette-row">
            {questions.map((q, idx) => {
              const isAnswered = selectedAnswers[q.id] !== undefined;
              const isActive = idx === currentIndex;
              return (
                <button
                  key={q.id}
                  className={`palette-btn ${isActive ? 'active' : ''} ${isAnswered ? 'answered' : ''}`}
                  onClick={() => setCurrentIndex(idx)}
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>

          <div className="divider" style={{ margin: '16px 0' }}></div>

          {/* Navigation & Controls */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                className="btn btn-outline"
                disabled={currentIndex === 0}
                onClick={() => setCurrentIndex(i => i - 1)}
              >
                Previous
              </button>
              <button
                className="btn btn-outline"
                disabled={currentIndex === questions.length - 1}
                onClick={() => setCurrentIndex(i => i + 1)}
              >
                Next
              </button>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                className="btn btn-primary"
                onClick={submitExam}
                disabled={submitting}
              >
                {submitting ? 'Submitting...' : 'Submit Quiz'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SCREEN 3: RESULT */}
      {step === 'result' && finalResult && (
        <div className="card-container result-box">
          <h2>Quiz Submitted!</h2>

          <div className="result-stats">
            <div className="stat-item">
              <h4>{finalResult.attempted}</h4>
              <p>Attempted</p>
            </div>
            <div className="stat-item">
              <h4 style={{ color: '#16a34a' }}>{finalResult.correct}</h4>
              <p>Correct</p>
            </div>
            <div className="stat-item">
              <h4 style={{ color: '#dc2626' }}>{finalResult.wrong}</h4>
              <p>Wrong</p>
            </div>
            <div className="stat-item">
              <h4>
                {questions.length > 0 ? Math.round((finalResult.correct / questions.length) * 100) : 0}%
              </h4>
              <p>Score</p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginTop: '16px' }}>
            <button className="btn btn-primary" onClick={resetExam}>
              Take Another Quiz
            </button>
            {fullScreen && (
              <button className="btn btn-outline" onClick={exitFullScreen}>
                Exit Full Screen
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
