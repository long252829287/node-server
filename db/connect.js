const mongoose = require('mongoose');

mongoose.connect('mongodb://localhost:27017/lyl', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('Mongoose connection open to mongodb://localhost:27017/lyl'))
.catch(err => console.error('Connection error', err));
