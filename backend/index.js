import express from 'express';
import connectDB from './lib/db.js';
import dotenv from 'dotenv';

import cors from 'cors';
dotenv.config();
const app = express();
app.use(cors())
app.use(express.json());

connectDB();
app.get("/",(req,res)=>{
  res.send("Hello World");
})


import adminRoute from './routes/admin.route.js';
import userRoute from './routes/user.route.js';
app.use("/api/v1/user",userRoute);
app.use("/api/v1/admin",adminRoute);

app.listen(5000,()=>{
  console.log("Server is running on port: 5000");
})
