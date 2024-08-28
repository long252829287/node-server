require('dotenv').config();
require('rootpath')();
const bodyParser = require('body-parser');
const createError = require('http-errors');
const express = require('express');
const path = require('path');

const app = express();
const PUBLIC_DIR = 'public';
const VIEWS_DIR = 'views';

// require('./db/index');

// view engine setup
app.set('views', path.join(__dirname, VIEWS_DIR));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, PUBLIC_DIR)));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// routes
app.use('/', require('./routes'));
app.use('/lyl/douyu', require('./scripts/douyu'));
app.use('/lyl/huya', require('./scripts/huya'));

// error handler
app.use((err, req, res, next) => {
  const status = err.status || 500;
  const message = err.message || 'Internal Server Error';
  const error = req.app.get('env') === 'development' ? err : {};
  console.error(err);
  res.status(status).send({ error: { status, message } });
});

module.exports = app;