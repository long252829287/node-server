const MongoClient = require('mongodb').MongoClient;

// 连接 URL
const url = 'mongodb://localhost:27017'; // 本地 MongoDB 服务器地址

// 数据库名称
const dbName = 'local'; // 修改为你的数据库名称

// 连接数据库
MongoClient.connect(url, { useNewUrlParser: true, useUnifiedTopology: true }, (err, client) => {
  if (err) {
    console.error('连接数据库失败:', err);
    return;
  }

  console.log('成功连接到数据库');

  const db = client.db(dbName);

  // 在此处执行你的数据库操作，比如插入数据、查询数据等
  // 例如插入数据：
  const collection = db.collection('users');
  const newUser = { name: 'John', age: 30, email: 'john@example.com' };
  collection.insertOne(newUser, (insertErr, result) => {
    if (insertErr) {
      console.error('插入数据失败:', insertErr);
    } else {
      console.log('成功插入数据:', result.insertedCount, '条');
    }

    // 关闭数据库连接
    client.close();
  });
});
