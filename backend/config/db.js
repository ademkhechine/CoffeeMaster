const mongoose = require('mongoose');

const connectDB = async () => {
  let retries = 5;
  while (retries) {
    try {
      const conn = await mongoose.connect(process.env.MONGO_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      });
      console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
      return;
    } catch (err) {
      console.error(`❌ MongoDB connection error: ${err.message}`);
      retries -= 1;
      if (retries === 0) {
        console.error('Could not connect to MongoDB after 5 retries. Exiting...');
        process.exit(1);
      }
      console.log(`Retrying... (${retries} attempts left)`);
      await new Promise(res => setTimeout(res, 3000));
    }
  }
};

module.exports = connectDB;
