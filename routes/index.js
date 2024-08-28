var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  console.log(123123);
  res.render('index', { title: 'hello' });
});

module.exports = router;
