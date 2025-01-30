import mongoose from "npm:mongoose";

export const connectDB = async () => {
  try {
    console.log("Connecting to MongoDB...");
    //console.log(Deno.env.get("MONGODB_URI"));
    await mongoose.connect(Deno.env.get("MONGODB_URI") || "");
    console.log("MongoDB connected successfully");
  } catch (error) {
    console.error("MongoDB connection error:", error);
    throw error;
  }
};