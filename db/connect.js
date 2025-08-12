const mongoose = require('mongoose');

const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/lyl';

mongoose
  .connect(mongoUri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log(`Mongoose connection open to ${mongoUri}`))
  .catch((err) => console.error('Mongoose connection error:', err));

// Optional: surface initial connection errors but do not crash the app
mongoose.connection.on('error', (err) => {
  console.error('Mongoose runtime error:', err);
});
