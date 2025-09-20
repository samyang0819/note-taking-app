const mongoose = require('mongoose');
require('dotenv').config();

const mongoURI = process.env.MONGO_URI || 'mongodb://localhost:27017/note-taking';

const connectDB = async() => {
    try{
        const conn = await mongoose.connect(mongoURI);
        console.log(`MongoDB connected at ${conn.connection.host}`);   
    } catch(error){
        console.error('MongoDB conncetion failed', error.message);
        process.exit(1); // Exit process with failure
    }
};

module.exports = connectDB;