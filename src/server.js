const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    version: '2.0.0',
    timestamp: new Date().toISOString()
  });
});

app.get('/', (req, res) => {
  res.json({ 
    message: 'BattleSync v2 API',
    version: '2.0.0'
  });
});

const server = app.listen(PORT, () => {
  console.log(`BattleSync v2 server running on port ${PORT}`);
});

module.exports = { app, server };