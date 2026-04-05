#!/usr/bin/env node

import { spawn } from 'child_process';
import net from 'net';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

  // Use node to run next directly, bypassing npm/npx and its override validation
  const nextBin = path.resolve(__dirname, '../../../node_modules/next/dist/bin/next');
  const nextProcess = spawn('node', [nextBin, 'dev', '-p', availablePort.toString()], {
    stdio: 'inherit',
    shell: false,
    env: {
      ...process.env,
      PORT: availablePort.toString(), // Ensure PORT env var matches
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
