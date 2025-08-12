require('dotenv').config();
require('rootpath')();
const createError = require('http-errors');
const express = require('express');
const path = require('path');
const helmet = require('helmet');
const compression = require('compression');
const cors = require('cors');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const app = express();
const PUBLIC_DIR = 'public';
const VIEWS_DIR = 'views';

// database
require('./db/index');

// view engine setup
app.set('views', path.join(__dirname, VIEWS_DIR));
app.set('view engine', 'jade');

// basic hardening & observability
app.disable('x-powered-by');
app.use(helmet());
app.use(compression());
app.use(cors());
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// body parsers
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// static assets
app.use(express.static(path.join(__dirname, PUBLIC_DIR)));

// basic rate limit (customize as needed)
app.use(
  rateLimit({
    windowMs: 60 * 1000,
    limit: 120,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

// routes
app.use('/', require('./routes'));
app.use('/lyl/douyu', require('./scripts/douyu'));
app.use('/lyl/huya', require('./scripts/huya'));

// 404 handler
app.use((req, res, next) => {
  next(createError(404, 'Not Found'));
});

// error handler
app.use((err, req, res, next) => {
  const status = err.status || 500;
  const message = err.message || 'Internal Server Error';
  const error = req.app.get('env') === 'development' ? err : {};
  console.error(err);
  res.status(status).send({ error: { status, message } });
});

module.exports = app;