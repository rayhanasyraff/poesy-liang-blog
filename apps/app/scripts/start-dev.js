#!/usr/bin/env node

const { spawn } = require('child_process');
const net = require('net');
const fs = require('fs');
const path = require('path');

const DEFAULT_PORT = 3000;
const FALLBACK_PORTS = [3000, 3010, 3020, 3030];

/**
 * Check if a port is available
 */
function isPortAvailable(port) {
  return new Promise((resolve) => {
    const server = net.createServer();

    server.once('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        resolve(false);
      } else {
        resolve(false);
      }
    });

    server.once('listening', () => {
      server.close();
      resolve(true);
    });

    server.listen(port);
  });
}

/**
 * Find an available port from the fallback list
 */
async function findAvailablePort(ports) {
  for (const port of ports) {
    const available = await isPortAvailable(port);
    if (available) {
      return port;
    }
    console.log(`⚠️  Port ${port} is already in use.`);
  }
  return null;
}

/**
 * Read API port from the port info file
 */
function getApiUrl() {
  try {
    const portFilePath = path.join(__dirname, '../../../.api-port.json');
    if (fs.existsSync(portFilePath)) {
      const portInfo = JSON.parse(fs.readFileSync(portFilePath, 'utf-8'));
      console.log(`📡 Detected API running on port ${portInfo.port}`);
      return portInfo.url;
    }
  } catch (error) {
    console.warn('⚠️  Could not read API port info file. Using default.');
  }
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
}

/**
 * Start the Next.js dev server
 */
async function startDevServer() {
  const envPort = process.env.PORT ? parseInt(process.env.PORT, 10) : null;
  const portsToTry = envPort ? [envPort, ...FALLBACK_PORTS] : FALLBACK_PORTS;

  const availablePort = await findAvailablePort(portsToTry);

  if (!availablePort) {
    console.error('❌ All fallback ports are in use. Please free up a port or specify a different PORT environment variable.');
    process.exit(1);
  }

  console.log(`🚀 Starting Next.js app on http://localhost:${availablePort}`);

  // Get API URL and set it as environment variable
  const apiUrl = getApiUrl();
  console.log(`🔗 Connecting to API at ${apiUrl}`);

  // Use npx to run next, and ensure PORT is set correctly
  const nextProcess = spawn('npx', ['next', 'dev', '-p', availablePort.toString()], {
    stdio: 'inherit',
    shell: true,
    env: {
      ...process.env,
      PORT: availablePort.toString(), // Ensure PORT env var matches
      NEXT_PUBLIC_API_URL: apiUrl,
    },
  });

  nextProcess.on('error', (err) => {
    console.error('Failed to start Next.js:', err);
    process.exit(1);
  });

  nextProcess.on('close', (code) => {
    process.exit(code || 0);
  });
}

startDevServer();
