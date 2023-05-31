var express = require('express');
var router = express.Router();
const jwt = require('jsonwebtoken');
const bodyParser = require('body-parser');
const cors = require('cors');
const secretKey = 'your_secret_key';


router.use(cors());

router.use(bodyParser.json());

router.post('/login', (req, res) => {
    const { username, password } = req.body;
    if (username == 'admin' && password == '123456') {
        const token = jwt.sign(
        { username, exp: Math.floor(Date.now() / 1000) + 60 * 60 * 60 },
        secretKey
        );
        res.json({
        code: 200,
        message: '登录成功',
        token,
        });
    } else {
        res.json({
        code: 400,
        message: '用户名或密码错误',
        });
    }
});

router.use('/lyl/api', (req, res, next) => {
  const token = req.headers['authorization'];
  if (!token) {
    res.status(401).json({
      code: 401,
      message: '未登录或登录已过期，请重新登录',
    });
  } else {
    jwt.verify(token, secretKey, (err, decode) => {
      if (err) {
        res.json({
          code: 401,
          message: '未登录或登录已过期，请重新登录',
        });
      } else {
        req.user = decode;
        next();
      }
    });
  }
});

router.get('/userinfo', (req, res) => {
  res.json({
    code: 200,
    message: '获取用户信息成功',
    userinfo: {
      username: req.username,
    },
  });
});

router.get('/', function(req, res, next) {
  res.send('respond with a resource');
});

module.exports = router;