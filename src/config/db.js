const mongoose = require('mongoose');
require("node:dns/promises").setServers(["1.1.1.1", "8.8.8.8"]);

const connectDB = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('MongoDB connected');
};

module.exports = connectDB;
