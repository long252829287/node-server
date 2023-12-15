// Desc: 路由配置文件
module.exports = function (app) {
    // 在这里定义路由和处理请求的逻辑
    // 可以使用传入的 app 变量来添加路由和中间件等
    const index = require('./routes/index');
    const users = require('./routes/users');
    const photoList = require('./routes/photolist');
    const login = require('./routes/login');
    const chat = require('./routes/chat');
    // 斗鱼直播间直播流
    const douyu = require('./models/douyu');
    // 虎牙直播间直播流
    const huya = require('./models/huya');
    // 测试专用
    const test = require('./routes/test');
    
    // routes
    app.use('/lyl', index);
    app.use('/lyl', users);
    app.use('/lyl', photoList);
    app.use('/lyl/login', login);
    app.use('/lyl/chat', chat);
    app.use('/lyl/douyu', douyu);
    app.use('/lyl/huya', huya);
    app.use('/lyl/test', test);
};
  

