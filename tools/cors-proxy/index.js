const express = require('express');
const request = require('request');
const app = express();

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', '*');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

app.use('/proxy', (req, res) => {
  const url = req.originalUrl.replace(/^\/proxy\//, '');
  if (!url) return res.status(400).send('No URL provided');

  request({ url, method: req.method, qs: req.query, body: req.body }).pipe(res);
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`CORS proxy running on port ${PORT}`));
