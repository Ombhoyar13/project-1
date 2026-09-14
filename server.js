const express = require('express');
const os = require('os');
const path = require('path');
const Redis = require('ioredis');

const app = express();
const PORT = process.env.PORT || 3000;
const APP_ENV = process.env.NODE_ENV || 'development';
const REDIS_HOST = process.env.REDIS_HOST || null;
const REDIS_PORT = process.env.REDIS_PORT || 6379;

let inMemoryCounter = 0;
let redisClient = null;
let redisStatus = 'Not Connected (In-Memory Fallback)';

if (REDIS_HOST) {
  try {
    redisClient = new Redis({
      host: REDIS_HOST,
      port: Number(REDIS_PORT),
      retryStrategy: (times) => {
        if (times > 3) {
          redisStatus = 'Connection Failed (Using In-Memory Store)';
          return null;
        }
        return Math.min(times * 100, 2000);
      }
    });

    redisClient.on('connect', () => {
      redisStatus = `Connected to Redis (${REDIS_HOST}:${REDIS_PORT})`;
      console.log(`✅ [Redis] Connected successfully to ${REDIS_HOST}:${REDIS_PORT}`);
    });

    redisClient.on('error', (err) => {
      redisStatus = `Error: ${err.message}`;
    });
  } catch (err) {
    redisStatus = `Init Error: ${err.message}`;
  }
}

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

app.get('/api/info', (req, res) => {
  const memoryUsage = process.memoryUsage();
  res.json({
    hostname: os.hostname(), // In Docker, this is Container ID!
    platform: os.platform(),
    arch: os.arch(),
    nodeVersion: process.version,
    uptimeSeconds: Math.floor(process.uptime()),
    memory: {
      rssMB: (memoryUsage.rss / (1024 * 1024)).toFixed(2),
      heapUsedMB: (memoryUsage.heapUsed / (1024 * 1024)).toFixed(2),
    },
    environment: {
      PORT,
      NODE_ENV: APP_ENV,
      REDIS_HOST: REDIS_HOST || 'none',
      CUSTOM_MESSAGE: process.env.CUSTOM_MESSAGE || 'Hello from Docker Container!'
    },
    redisStatus
  });
});

app.get('/api/counter', async (req, res) => {
  try {
    if (redisClient && redisClient.status === 'ready') {
      const count = await redisClient.incr('docker_learning_visits');
      return res.json({ count, storage: 'Redis Database', host: REDIS_HOST });
    }
    inMemoryCounter += 1;
    res.json({ count: inMemoryCounter, storage: 'In-Memory RAM (Will reset on restart)' });
  } catch (err) {
    inMemoryCounter += 1;
    res.json({ count: inMemoryCounter, storage: 'In-Memory RAM', error: err.message });
  }
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString(), containerId: os.hostname() });
});

app.get('/api/om', (req, res) => {
  res.send("this is from om");
});
app.get('/api/arjun', (req, res) => {
  res.send("this is from arjun");
});
app.get('/api/manthan', (req, res) => {
  res.send("this is from manthan");
});
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Docker Learning Lab running at http://localhost:${PORT}`);
  console.log(`📦 Host/Container ID: ${os.hostname()}`);
});
