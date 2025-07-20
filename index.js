const tracker = require('@middleware.io/node-apm');
tracker.track({
  serviceName: process.env.SERVICE_NAME,
  accessToken: process.env.ACCESS_TOKEN,
  target: process.env.TARGET,
});

const express = require('express');
const app = express();

const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.send('Hello, Middleware APM!');
});

app.get('/user', (req, res) => {
  const userId = req.query.id;
  if (!userId) {
    throw new Error('Missing user ID');
  }
  res.send(`User ID is ${userId}`);
});

let memoryHolder = [];
app.get('/leaky', (req, res) => {
  memoryHolder.push(new Array(1e6).fill('*'));
  res.send('Leaking...');
});

app.get('/error', function (req, res) {
    try{
        throw new Error('oh error!');
    }catch (e) {
        tracker.errorRecord(e)
    }
    res.status(500).send("wrong");
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});