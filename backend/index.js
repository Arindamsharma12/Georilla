import express from 'express';
import connectDB from './lib/db.js';
import dotenv from 'dotenv';

import cors from 'cors';
dotenv.config();
const app = express();

connectDB();
app.get("/",(req,res)=>{
  res.send("Hello World");
})

app.listen(5000,()=>{
  console.log("Server is running on port: 5000");
})