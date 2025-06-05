const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Configuration
const PORT = process.env.PORT || 3000;
const MINECRAFT_SERVER_PATH = process.env.MINECRAFT_SERVER_PATH || '/minecraft';
const MINECRAFT_JAR = process.env.MINECRAFT_JAR || 'server.jar';
const JAVA_XMS = process.env.JAVA_XMS || '1G';
const JAVA_XMX = process.env.JAVA_XMX || '4G';

// Global variables
let minecraftProcess = null;
let serverStatus = {
  online: false,
  players: 0,
  maxPlayers: 20,
  memoryUsed: 0,
  maxMemory: parseInt(JAVA_XMX),
  startTime: null
};

// Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"]
    }
  }
}));

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

const commandLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30 // limit commands to 30 per minute
});

// WebSocket connections
const clients = new Set();

wss.on('connection', (ws) => {
  clients.add(ws);
  console.log('Client connected');
  
  // Send current server status
  ws.send(JSON.stringify({
    type: 'status',
    data: serverStatus
  }));
  
  ws.on('close', () => {
    clients.delete(ws);
    console.log('Client disconnected');
  });
});

// Broadcast to all connected clients
function broadcast(message) {
  clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(message));
    }
  });
}

// Parse Minecraft server output
function parseServerOutput(data) {
  const line = data.toString().trim();
  if (!line) return;
  
  console.log('MC Server:', line);
  
  // Update server status based on output
  if (line.includes('Done (') && line.includes('s)! For help, type "help"')) {
    serverStatus.online = true;
    serverStatus.startTime = new Date();
  }
  
  if (line.includes('Stopping server')) {
    serverStatus.online = false;
    serverStatus.startTime = null;
    serverStatus.players = 0;
  }
  
  // Parse player join/leave
  const joinMatch = line.match(/(\w+) joined the game/);
  if (joinMatch) {
    serverStatus.players++;
  }
  
  const leaveMatch = line.match(/(\w+) left the game/);
  if (leaveMatch) {
    serverStatus.players = Math.max(0, serverStatus.players - 1);
  }
  
  // Parse player list command
  const listMatch = line.match(/There are (\d+) of a max of (\d+) players online/);
  if (listMatch) {
    serverStatus.players = parseInt(listMatch[1]);
    serverStatus.maxPlayers = parseInt(listMatch[2]);
  }
  
  // Broadcast log to clients
  broadcast({
    type: 'log',
    data: {
      timestamp: new Date().toISOString(),
      message: line
    }
  });
  
  // Broadcast status update
  broadcast({
    type: 'status',
    data: serverStatus
  });
}

// Start Minecraft server
function startMinecraftServer() {
  if (minecraftProcess) {
    return { success: false, message: 'Server is already running' };
  }
  
  const serverJarPath = path.join(MINECRAFT_SERVER_PATH, MINECRAFT_JAR);
  
  if (!fs.existsSync(serverJarPath)) {
    return { success: false, message: `Server jar not found at ${serverJarPath}` };
  }
  
  try {
    minecraftProcess = spawn('java', [
      `-Xms${JAVA_XMS}`,
      `-Xmx${JAVA_XMX}`,
      '-jar',
      MINECRAFT_JAR,
      'nogui'
    ], {
      cwd: MINECRAFT_SERVER_PATH,
      stdio: ['pipe', 'pipe', 'pipe']
    });
    
    minecraftProcess.stdout.on('data', parseServerOutput);
    minecraftProcess.stderr.on('data', parseServerOutput);
    
    minecraftProcess.on('close', (code) => {
      console.log(`Minecraft server process exited with code ${code}`);
      minecraftProcess = null;
      serverStatus.online = false;
      serverStatus.startTime = null;
      serverStatus.players = 0;
      
      broadcast({
        type: 'log',
        data: {
          timestamp: new Date().toISOString(),
          message: `Server process exited with code ${code}`
        }
      });
      
      broadcast({
        type: 'status',
        data: serverStatus
      });
    });
    
    return { success: true, message: 'Server starting...' };
  } catch (error) {
    console.error('Failed to start server:', error);
    return { success: false, message: `Failed to start server: ${error.message}` };
  }
}

// Stop Minecraft server
function stopMinecraftServer() {
  if (!minecraftProcess) {
    return { success: false, message: 'Server is not running' };
  }
  
  try {
    minecraftProcess.stdin.write('stop\n');
    
    // Force kill after 30 seconds if not stopped gracefully
    setTimeout(() => {
      if (minecraftProcess) {
        minecraftProcess.kill('SIGKILL');
      }
    }, 30000);
    
    return { success: true, message: 'Stopping server...' };
  } catch (error) {
    console.error('Failed to stop server:', error);
    return { success: false, message: `Failed to stop server: ${error.message}` };
  }
}

// Send command to Minecraft server
function sendCommand(command) {
  if (!minecraftProcess || !serverStatus.online) {
    return { success: false, message: 'Server is not running' };
  }
  
  try {
    minecraftProcess.stdin.write(command + '\n');
    return { success: true, message: 'Command sent' };
  } catch (error) {
    console.error('Failed to send command:', error);
    return { success: false, message: `Failed to send command: ${error.message}` };
  }
}

// API Routes
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/status', (req, res) => {
  res.json(serverStatus);
});

app.post('/api/server/start', (req, res) => {
  const result = startMinecraftServer();
  res.json(result);
});

app.post('/api/server/stop', (req, res) => {
  const result = stopMinecraftServer();
  res.json(result);
});

app.post('/api/server/restart', (req, res) => {
  const stopResult = stopMinecraftServer();
  if (stopResult.success) {
    setTimeout(() => {
      startMinecraftServer();
    }, 5000);
    res.json({ success: true, message: 'Server restarting...' });
  } else {
    res.json(stopResult);
  }
});

app.post('/api/command', commandLimiter, (req, res) => {
  const { command } = req.body;
  
  if (!command || typeof command !== 'string') {
    return res.status(400).json({ success: false, message: 'Invalid command' });
  }
  
  // Sanitize command
  const sanitizedCommand = command.trim().slice(0, 100);
  
  const result = sendCommand(sanitizedCommand);
  res.json(result);
});

// Serve the main HTML file
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Update server stats periodically
setInterval(() => {
  if (serverStatus.online && minecraftProcess) {
    // Get memory usage (this is a simplified approach)
    try {
      const memInfo = process.memoryUsage();
      serverStatus.memoryUsed = Math.round(memInfo.heapUsed / 1024 / 1024 / 1024 * 10) / 10;
    } catch (error) {
      console.error('Failed to get memory usage:', error);
    }
    
    broadcast({
      type: 'status',
      data: serverStatus
    });
  }
}, 5000);

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('Received SIGTERM, shutting down gracefully');
  if (minecraftProcess) {
    minecraftProcess.stdin.write('stop\n');
  }
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('Received SIGINT, shutting down gracefully');
  if (minecraftProcess) {
    minecraftProcess.stdin.write('stop\n');
  }
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});

server.listen(PORT, () => {
  console.log(`Minecraft Console Server running on port ${PORT}`);
});