import { spawn } from 'child_process';
import http from 'http';

const isElectron = process.argv.includes('--electron');

function checkPort(port) {
  return new Promise((resolve) => {
    const req = http.get(`http://localhost:${port}/`, () => resolve(true));
    req.on('error', () => resolve(false));
    req.setTimeout(1000, () => {
      req.destroy();
      resolve(false);
    });
  });
}

function delay(ms) {
  return new Promise((res) => setTimeout(res, ms));
}

async function main() {
  const spawnedProcesses = [];

  // 1. Ensure Backend is running on port 3000
  const backendRunning = await checkPort(3000);
  if (!backendRunning) {
    console.log('[Backend] Starting Express backend on http://localhost:3000...');
    const backend = spawn('npm', ['start'], {
      cwd: 'backend',
      stdio: 'inherit',
    });
    spawnedProcesses.push(backend);
  } else {
    console.log('[Backend] Backend is already running on http://localhost:3000');
  }

  // 2. Ensure Frontend (Vite) is running on port 5173
  const frontendRunning = await checkPort(5173);
  if (!frontendRunning) {
    console.log('[Frontend] Starting Vite dev server on http://localhost:5173...');
    const frontend = spawn('npm', ['run', 'dev'], {
      cwd: 'frontend',
      stdio: 'inherit',
    });
    spawnedProcesses.push(frontend);
  } else {
    console.log('[Frontend] Vite is already running on http://localhost:5173');
  }

  // 3. Launch Electron if requested
  if (isElectron) {
    console.log('[Electron] Waiting for Vite server to be ready before launching...');
    while (!(await checkPort(5173))) {
      await delay(500);
    }

    console.log('[Electron] Launching Electron window...');
    const electron = spawn('npm', ['run', 'electron'], {
      cwd: 'frontend',
      stdio: 'inherit',
    });
    spawnedProcesses.push(electron);

    electron.on('exit', (code) => {
      console.log('[Electron] Window closed. Shutting down...');
      cleanup();
      process.exit(code || 0);
    });
  }

  function cleanup() {
    for (const proc of spawnedProcesses) {
      try {
        proc.kill('SIGTERM');
      } catch {
        // ignore
      }
    }
  }

  process.on('SIGINT', () => {
    cleanup();
    process.exit(0);
  });
  process.on('SIGTERM', () => {
    cleanup();
    process.exit(0);
  });
}

main();
