import mongoose from "mongoose";


const connectDB = async ()=>{
  try {
    const connectionInstances = await mongoose.connect(`${process.env.MONGODB_URI}`);
    console.log(`\n MongoDB Connected !! DB HOST : ${connectionInstances.connection.host}`);
  } catch (error) {
    console.log("MongoDB Connection Failed",error);
    process.exit(1);
  }
}

export default connectDB;