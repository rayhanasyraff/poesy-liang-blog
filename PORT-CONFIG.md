# Port Configuration

This document describes how port configuration works for the API and Next.js app in this Nx monorepo.

## 🎯 Key Feature: Automatic Port Discovery

The Next.js app automatically detects which port the API is running on! When the API starts, it writes its port information to `.api-port.json`, and the Next.js app reads this file to connect to the correct API endpoint automatically.

## Default Ports

- **API Server**: Port 3001
- **Next.js App**: Port 3000

## Automatic Port Fallback

Both the API and Next.js app have automatic port fallback mechanisms. If the default port is already in use, they will automatically try alternative ports.

### API Server Fallback Ports

The API server will try these ports in order:

1. 3001 (default)
2. 3011
3. 3021
4. 3031

The fallback logic is implemented in `apps/api/src/index.ts:39-73` and configured in `apps/api/src/config/config.ts:3`.

### Next.js App Fallback Ports

The Next.js app will try these ports in order:

1. 3000 (default)
2. 3010
3. 3020
4. 3030

The fallback logic is implemented in `apps/app/scripts/start-dev.js`.

## Custom Port Configuration

You can specify custom ports using environment variables:

### For the API Server

```bash
# In apps/api/.env or when running the command
PORT=3005 nx dev api
```

### For the Next.js App

```bash
# In apps/app/.env or when running the command
PORT=3006 nx dev app
```

## Environment Files

Example environment files have been created:

- `apps/api/.env.example` - API server configuration template
- `apps/app/.env.example` - Next.js app configuration template

Copy these to `.env` files and customize as needed:

```bash
cp apps/api/.env.example apps/api/.env
cp apps/app/.env.example apps/app/.env
```

## How It Works

### API Server

1. When the API server starts, it attempts to bind to the configured port
2. If the port is already in use (EADDRINUSE error), it automatically tries the next port in the fallback list
3. Once a port is successfully bound, it writes the port information to `.api-port.json` at the workspace root
4. The port info file contains: `{ "port": 3011, "url": "http://localhost:3011", "timestamp": "..." }`

**Implementation**: `apps/api/src/index.ts:40-73` and `apps/api/src/utils/port-manager.ts`

Example output:

```text
⚠️  Port 3001 is already in use.
Trying port 3011...
🚀 Blog API Server running at http://localhost:3011
📝 Port info written to /path/to/workspace/.api-port.json
```

### Next.js App

1. The Next.js app uses a custom Node.js script (`apps/app/scripts/start-dev.js`) that checks port availability
2. Before starting, it reads `.api-port.json` to discover the API's actual port
3. It automatically sets `NEXT_PUBLIC_API_URL` environment variable to point to the detected API port
4. The app then starts on an available port, ensuring no conflicts

**Implementation**: `apps/app/scripts/start-dev.js` and `apps/app/lib/api-port.ts`

Example output:

```text
⚠️  Port 3000 is already in use.
📡 Detected API running on port 3011
🔗 Connecting to API at http://localhost:3011
🚀 Starting Next.js app on http://localhost:3010
```

### Port Discovery Flow

```text
┌─────────────────┐
│   API Starts    │
│   on Port 3011  │
└────────┬────────┘
         │
         │ Writes port info
         ▼
  ┌──────────────────┐
  │ .api-port.json   │
  │ {port: 3011, ... }│
  └────────┬─────────┘
           │
           │ Reads port info
           ▼
  ┌──────────────────┐
  │  Next.js App     │
  │  Connects to     │
  │  Port 3011       │
  └──────────────────┘
```

## Commands

### Run with Default Ports

```bash
nx dev api    # Starts on port 3001 (or fallback)
nx dev app    # Starts on port 3000 (or fallback)
```

### Run with Custom Ports

```bash
PORT=3005 nx dev api
PORT=3006 nx dev app
```

### Run Both Apps (Recommended Workflow)


```bash
# Terminal 1 - Start API first
nx dev api
# Output: 🚀 Blog API Server running at http://localhost:3001
#         📝 Port info written to .api-port.json

# Terminal 2 - Start Next.js app (automatically detects API port)
nx dev app
# Output: 📡 Detected API running on port 3001
#         🔗 Connecting to API at http://localhost:3001
#         🚀 Starting Next.js app on http://localhost:3000
```

**Important**: Always start the API server **before** starting the Next.js app to ensure automatic port detection works correctly.

## Troubleshooting

### App Can't Connect to API

If the Next.js app shows connection errors:

1. **Make sure the API is running first**: The app needs to read `.api-port.json` which is created when the API starts

   ```bash
   # Start API first
   nx dev api

   # Then start app
   nx dev app
   ```

2. **Check if `.api-port.json` exists**:

   ```bash
   cat .api-port.json
   # Should show: {"port":3001,"url":"http://localhost:3001","timestamp":"..."}
   ```

3. **Manually set the API URL** if auto-detection fails:

   ```bash
   NEXT_PUBLIC_API_URL=http://localhost:3001 nx dev app
   ```

### All Ports Are In Use

If you see this error:

```text
❌ All fallback ports are in use. Please free up a port or specify a different PORT environment variable.
```

You can:

1. Kill processes using those ports:

   ```bash
   lsof -i :3001  # Check what's using the port
   kill -9 <PID>   # Kill the process
   ```

2. Specify a custom port:

   ```bash
   PORT=4000 nx dev api
   ```

### Check Which Ports Are In Use

```bash
lsof -i -P -n | grep LISTEN
```

This will show all processes listening on ports.

### API Port Changed After App Started

If the API restarts on a different port while the app is running:

1. Restart the Next.js app to pick up the new port:

   ```bash
   # Stop app (Ctrl+C)
   # Start it again
   nx dev app
   ```

Or set the API URL explicitly:

```bash
NEXT_PUBLIC_API_URL=http://localhost:3011 nx dev app
```
