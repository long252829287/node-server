var express = require('express');
var router = express.Router();
var imgList = `
zhuzhu: /images/zhuzhu.jpg
`
/* GET home page. */
router.get('/photo', function(req, res, next) {
  res.send(`
    zhuzhu: images/zhuzhu.jpg,
    longlong: images/longlong.jpg
  `);
});

module.exports = router;
