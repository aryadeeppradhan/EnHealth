const path = require('path');
const fs = require('fs');
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { spawn } = require('child_process');

const app = express();
const PORT = process.env.PORT || 4000;
const DB_PATH = path.join(__dirname, 'enhealth.db');
const ML_SERVER_SCRIPT = path.join(__dirname, 'ml_server.py');

const db = new sqlite3.Database(DB_PATH);
let mlProcess = null;

const startMlServer = () => {
  if (process.env.SKIP_ML_SERVER) {
    console.log('Skipping ML server start');
    return;
  }

  if (!fs.existsSync(ML_SERVER_SCRIPT)) {
    console.warn(
      'ml_server.py was not found. Prediction requests will fail until it is restored.'
    );
    return;
  }

  const localPythonCandidates =
    process.platform === 'win32'
      ? [
          path.join(__dirname, '.venv', 'Scripts', 'python.exe'),
          path.join(__dirname, '.venv', 'Scripts', 'python')
        ]
      : [
          path.join(__dirname, '.venv', 'bin', 'python3'),
          path.join(__dirname, '.venv', 'bin', 'python')
        ];

  const pythonCandidates = [
    ...localPythonCandidates.filter((candidate) => fs.existsSync(candidate)),
    ...(process.platform === 'win32' ? ['py', 'python', 'python3'] : ['python3', 'python'])
  ];

  const trySpawn = (index = 0) => {
    if (index >= pythonCandidates.length) {
      console.warn(
        'Unable to start the ML server automatically. ' +
          'Please ensure Python is installed and run ml_server.py manually.'
      );
      return;
    }

    const command = pythonCandidates[index];
    const child = spawn(command, [ML_SERVER_SCRIPT], {
      stdio: 'inherit',
      env: { ...process.env, FLASK_SKIP_DOTENV: '1' }
    });

    child.once('error', (error) => {
      if (error.code === 'ENOENT') {
        console.warn(`Command ${command} not found. Trying next Python interpreter...`);
        trySpawn(index + 1);
        return;
      }
      console.error('ML server failed to start', error);
    });

    child.once('spawn', () => {
      mlProcess = child;
      console.log(`ML server started with ${command}`);
    });

    child.on('exit', (code, signal) => {
      if (code !== null && code !== 0) {
        console.warn(`ML server exited with code ${code}`);
      } else if (signal) {
        console.warn(`ML server terminated via signal ${signal}`);
      }
    });
  };

  trySpawn();
};

const stopMlServer = () => {
  if (mlProcess) {
    mlProcess.kill();
    mlProcess = null;
  }
};

startMlServer();

['SIGINT', 'SIGTERM', 'exit'].forEach((eventName) => {
  process.on(eventName, () => {
    stopMlServer();
    if (eventName !== 'exit') {
      process.exit();
    }
  });
});

const run = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.run(sql, params, function runCallback(err) {
      if (err) reject(err);
      else resolve(this);
    });
  });

const get = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });

const all = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });

db.serialize(() => {
  db.run(
    `CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL
    )`
  );

  db.run(
    `CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    )`
  );

  db.run(
    `CREATE TABLE IF NOT EXISTS history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      type TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      inputs TEXT NOT NULL,
      result TEXT NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    )`
  );
});

app.use(express.json());

const staticDir = path.join(__dirname);
app.use(express.static(staticDir));

const asyncHandler = (handler) => (req, res, next) =>
  Promise.resolve(handler(req, res, next)).catch(next);

const sanitizeEmail = (email = '') => email.trim().toLowerCase();

const errorResponse = (res, status, message) =>
  res.status(status).json({ error: message });

const createSession = async (userId) => {
  const token = crypto.randomUUID();
  await run('INSERT INTO sessions (id, user_id, created_at) VALUES (?, ?, ?)', [
    token,
    userId,
    new Date().toISOString()
  ]);
  return token;
};

const authenticate = asyncHandler(async (req, res, next) => {
  const authHeader = req.get('Authorization') || '';
  if (!authHeader.startsWith('Bearer ')) {
    return errorResponse(res, 401, 'Unauthorized');
  }

  const token = authHeader.slice(7).trim();
  if (!token) {
    return errorResponse(res, 401, 'Unauthorized');
  }

  const session = await get(
    `SELECT sessions.id, users.id as userId, users.email
     FROM sessions
     JOIN users ON users.id = sessions.user_id
     WHERE sessions.id = ?`,
    [token]
  );

  if (!session) {
    return errorResponse(res, 401, 'Unauthorized');
  }

  req.user = { id: session.userId, email: session.email };
  req.token = token;
  return next();
});

app.post(
  '/api/auth/register',
  asyncHandler(async (req, res) => {
    const { email, password } = req.body || {};
    const normalizedEmail = sanitizeEmail(email);

    if (!normalizedEmail || !password) {
      return errorResponse(res, 400, 'Email and password are required');
    }

    if (password.length < 6) {
      return errorResponse(res, 400, 'Password must be at least 6 characters');
    }

    const existing = await get('SELECT id FROM users WHERE email = ?', [
      normalizedEmail
    ]);
    if (existing) {
      return errorResponse(res, 409, 'Account already exists');
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const result = await run(
      'INSERT INTO users (email, password_hash, created_at) VALUES (?, ?, ?)',
      [normalizedEmail, passwordHash, new Date().toISOString()]
    );

    const token = await createSession(result.lastID);
    res.json({ token, user: { email: normalizedEmail } });
  })
);

app.post(
  '/api/auth/login',
  asyncHandler(async (req, res) => {
    const { email, password } = req.body || {};
    const normalizedEmail = sanitizeEmail(email);

    if (!normalizedEmail || !password) {
      return errorResponse(res, 400, 'Email and password are required');
    }

    const user = await get('SELECT * FROM users WHERE email = ?', [
      normalizedEmail
    ]);
    if (!user) {
      return errorResponse(res, 404, 'Account not found');
    }

    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      return errorResponse(res, 401, 'Invalid credentials');
    }

    const token = await createSession(user.id);
    res.json({ token, user: { email: user.email } });
  })
);

app.get(
  '/api/auth/me',
  authenticate,
  asyncHandler(async (req, res) => {
    res.json({ email: req.user.email });
  })
);

app.post(
  '/api/auth/logout',
  authenticate,
  asyncHandler(async (req, res) => {
    await run('DELETE FROM sessions WHERE id = ?', [req.token]);
    res.status(204).end();
  })
);

app.get(
  '/api/history',
  authenticate,
  asyncHandler(async (req, res) => {
    const rows = await all(
      `SELECT type, timestamp, inputs, result
       FROM history
       WHERE user_id = ?
       ORDER BY datetime(timestamp) DESC`,
      [req.user.id]
    );

    const history = rows.map((row) => ({
      type: row.type,
      timestamp: row.timestamp,
      inputs: JSON.parse(row.inputs),
      result: JSON.parse(row.result)
    }));

    res.json({ history });
  })
);

app.post(
  '/api/history',
  authenticate,
  asyncHandler(async (req, res) => {
    const { type, inputs, result } = req.body || {};

    if (!type || !inputs || !result) {
      return errorResponse(res, 400, 'Type, inputs, and result are required');
    }

    const record = {
      type,
      timestamp: new Date().toISOString(),
      inputs,
      result
    };

    await run(
      `INSERT INTO history (user_id, type, timestamp, inputs, result)
       VALUES (?, ?, ?, ?, ?)`,
      [
        req.user.id,
        record.type,
        record.timestamp,
        JSON.stringify(record.inputs),
        JSON.stringify(record.result)
      ]
    );

    res.status(201).json({ entry: record });
  })
);

app.use((err, req, res, next) => {
  console.error(err);
  res
    .status(500)
    .json({ error: 'Something went wrong. Please try again later.' });
});

const server = app.listen(PORT, () => {
  console.log(`EnHealth server running at http://localhost:${PORT}`);
});

module.exports = server;
