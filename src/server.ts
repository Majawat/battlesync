import express, { Request, Response } from 'express';
import cors from 'cors';
import { Server } from 'http';

const app = express();
const PORT = process.env.PORT || 40999;

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

app.get('/health', (req: Request, res: Response<HealthResponse>) => {
  res.json({ 
    status: 'ok', 
    version: '2.3.0',
    timestamp: new Date().toISOString()
  });
});

app.get('/', (req: Request, res: Response<ApiInfoResponse>) => {
  res.json({ 
    message: 'BattleSync v2 API',
    version: '2.3.0'
  });
});

const server: Server = app.listen(PORT, () => {
  console.log(`BattleSync v2 server running on port ${PORT}`);
});

export { app, server };