const createError = require('http-errors');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');

const indexRouter = require('./routes/index');
const usersRouter = require('./routes/users');
const photoListRouter = require('./routes/photolist');
const loginRouter = require('./routes/login');

const app = express();
const PUBLIC_DIR = 'public';
const VIEWS_DIR = 'views';

// view engine setup
app.set('views', path.join(__dirname, VIEWS_DIR));
app.set('view engine', 'jade');

// middleware
app.use(express.static(path.join(__dirname, PUBLIC_DIR)));
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

// routes
app.use('/', indexRouter);
app.use('/users', usersRouter);
app.use('/photoList', photoListRouter);
app.use('/api', loginRouter);

// error handler
app.use((err, req, res, next) => {
  const status = err.status || 500;
  const message = err.message || 'Internal Server Error';
  const error = req.app.get('env') === 'development' ? err : {};
  console.error(err);
  res.status(status).send({ error: { status, message } });
});


module.exports = app;