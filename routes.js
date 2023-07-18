// Desc: 路由配置文件
module.exports = function (app) {
    // 在这里定义路由和处理请求的逻辑
    // 可以使用传入的 app 变量来添加路由和中间件等
    const index = require('./routes/index');
    const users = require('./routes/users');
    const photoList = require('./routes/photolist');
    const login = require('./routes/login');
    const chat = require('./routes/chat');
    const douyu = require('./models/douyu');
    const huya = require('./models/huya');
    const test = require('./routes/test');
    
    // routes
    app.use('/lyl', index);
    app.use('/lyl', users);
    app.use('/lyl', photoList);
    app.use('/lyl/api', login);
    app.use('/lyl/chat', chat);
    app.use('/lyl/douyu', douyu);
    app.use('/lyl/huya', huya);
    app.use('/lyl/test', test);
};
  

