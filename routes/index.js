var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'hello' });
});

// Health check
router.get('/health', function (req, res) {
  res.json({ status: 'ok' });
});

module.exports = router;
