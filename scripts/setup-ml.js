#!/usr/bin/env node
/**
 * Helper script to create a dedicated Python virtual environment inside the repo
 * and install the ML dependencies without touching any global Python install.
 */

const { spawnSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const projectRoot = path.join(__dirname, '..');
const venvPath = path.join(projectRoot, '.venv');
const requirements = path.join(projectRoot, 'requirements.txt');

const run = (command, args, options = {}) =>
  new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: 'inherit',
      ...options
    });
    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} ${args.join(' ')} exited with code ${code}`));
    });
  });

const detectPython = () => {
  const systemCandidates =
    process.platform === 'win32' ? ['py', 'python', 'python3'] : ['python3', 'python'];
  for (const cmd of systemCandidates) {
    const result = spawnSync(cmd, ['--version'], { stdio: 'ignore' });
    if (!result.error) {
      return cmd;
    }
  }
  throw new Error(
    'Python was not found in PATH. Please install Python 3.10+ and try again.'
  );
};

const venvPythonCandidates =
  process.platform === 'win32'
    ? [
        path.join(venvPath, 'Scripts', 'python.exe'),
        path.join(venvPath, 'Scripts', 'python')
      ]
    : [
        path.join(venvPath, 'bin', 'python3'),
        path.join(venvPath, 'bin', 'python')
      ];

const getVenvPython = () => {
  for (const candidate of venvPythonCandidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  throw new Error('Virtual environment python executable not found.');
};

const ensureVenv = async () => {
  if (fs.existsSync(venvPath)) {
    console.log('Virtual environment already exists – skipping creation.');
    return;
  }
  console.log('Creating local Python virtual environment...');
  const python = detectPython();
  await run(python, ['-m', 'venv', '.venv'], { cwd: projectRoot });
};

const installRequirements = async () => {
  if (!fs.existsSync(requirements)) {
    throw new Error('requirements.txt was not found.');
  }
  const python = getVenvPython();
  console.log('Upgrading pip inside the virtual environment...');
  await run(python, ['-m', 'pip', 'install', '--upgrade', 'pip']);
  console.log('Installing Python dependencies from requirements.txt...');
  await run(python, ['-m', 'pip', 'install', '-r', requirements]);
};

(async () => {
  try {
    await ensureVenv();
    await installRequirements();
    console.log(
      'All set! Activate the env with ".\\.venv\\Scripts\\activate" (Windows) or "source .venv/bin/activate" (macOS/Linux).'
    );
  } catch (error) {
    console.error('Failed to set up the ML environment:', error.message);
    process.exit(1);
  }
})();
