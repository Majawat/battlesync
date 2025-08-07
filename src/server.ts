import express, { Request, Response } from 'express';
import cors from 'cors';
import { Server } from 'http';
import { db } from './database/db';

const app = express();
const PORT = process.env.PORT || 4019;

app.use(cors());
app.use(express.json());

interface HealthResponse {
  status: string;
  version: string;
  timestamp: string;
}

interface ApiInfoResponse {
  message: string;
  version: string;
}

app.get('/health', (_req: Request, res: Response<HealthResponse>) => {
  res.json({ 
    status: 'ok', 
    version: '2.5.0',
    timestamp: new Date().toISOString()
  });
});

app.get('/', (_req: Request, res: Response<ApiInfoResponse>) => {
  res.json({ 
    message: 'BattleSync v2 API',
    version: '2.5.0'
  });
});

// Initialize database and start server
async function startServer(): Promise<Server> {
  try {
    await db.initialize();
    console.log('Database initialized successfully');
    
    const server: Server = app.listen(PORT, () => {
      console.log(`BattleSync v2 server running on port ${PORT}`);
    });
    
    return server;
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Start server unless in test environment
let server: Server | undefined;
if (process.env.NODE_ENV !== 'test') {
  startServer().then((s) => {
    server = s;
  });
}

export { app, server, startServer };