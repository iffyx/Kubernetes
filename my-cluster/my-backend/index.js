const { v4: uuidv4 } = require('uuid');
const express = require('express');
const keys = require('./keys.js');

const app = express();

const bodyParser = require('body-parser');
app.use(bodyParser.json());

const redis = require('redis');
const redisClient = redis.createClient({
  host: keys.redisHost,
  port: keys.redisPort,
  retry_strategy: () => 1000
});

const { Pool } = require('pg');
const pgClient = new Pool({
  user: keys.pgUser,
  host: keys.pgHost,
  database: keys.pgDatabase,
  password: keys.pgPassword,
  port: keys.pgPort,
});

pgClient.on('error', () => console.log('No connection to PG DB'));

pgClient.query('CREATE TABLE IF NOT EXISTS results(number INT)').catch(err => console.log(err));

const appId = uuidv4();
const appPort = 5000;

console.log(keys.pgDatabase);

app.get('/', (req, res) => {
  res.send(`[${appId}] message: ${keys.initMessage}`)
});

app.post('/power/', (req, resp) => {
  console.log(req.body);
  const base = req.body.base;
  const exponent = req.body.exponent;

  console.log(base);
  console.log(exponent);

  redisClient.get(base + ',' + exponent, (err, result) => {
      console.log(getPower(base, exponent));
      if (!result) {
          let powerResult = getPower(base, exponent);
          redisClient.set(base + ',' + exponent, powerResult);
          resp.send('New result ' + powerResult);
          pgClient.query('INSERT INTO results VALUES ($1)', [powerResult]).catch(err => console.log(err));
      }
      else {
          resp.send('Result ' + result);
      }
  });
});

app.get('/results', (req, resp) => {
  pgClient.query('SELECT * FROM results')
      .then(res => resp.send(res.rows))
      .catch(err => console.log(err));
});

app.listen(appPort, err => {
  console.log(`Backend listening on port ${appPort}`)
});

const getPower = (a, b) => {
  return Math.pow(a, b);
};