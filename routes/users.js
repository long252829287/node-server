const express = require('express');
const bodyParser = require('body-parser');
const MongoClient = require('mongodb').MongoClient;

const app = express();
const url = 'mongodb://localhost:27017'; // MongoDB服务器地址
const dbName = 'local'; // 数据库名称
// 创建路由模块
const router = express.Router();

// 解析请求体
app.use(bodyParser.json());

// 连接数据库
MongoClient.connect(url, { useNewUrlParser: true, useUnifiedTopology: true }, (err, client) => {
  if (err) {
    console.error('连接数据库失败:', err);
    return;
  }

  console.log('成功连接到数据库');
  const db = client.db(dbName);

  // 注册接口
  router.post('/register', (req, res) => {
    const collection = db.collection('users');
    const newUser = { username: req.body.username, password: req.body.password };

    collection.insertOne(newUser, (insertErr, result) => {
      if (insertErr) {
        console.error('插入数据失败:', insertErr);
        res.status(500).json({ error: '注册失败' });
      } else {
        console.log('成功插入数据:', result.insertedCount, '条');
        res.status(200).json({ message: '注册成功' });
      }
    });
  });

  // 关闭数据库连接
  process.on('SIGINT', () => {
    client.close();
    process.exit();
  });
});

module.exports = router;
