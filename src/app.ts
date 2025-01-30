// src/app.ts
import "jsr:@std/dotenv/load";
import express from "npm:express";
import cors from "npm:cors";
import cookieParser from "npm:cookie-parser";
import { connectDB } from "./config/database.ts";
import imageRoutes from "./routes/images.ts";
import billingRoutes from "./routes/billing.ts";
import authRoutes from "./routes/auth.ts";
import projectRoutes from "./routes/project.ts";
const app = express();

// Connect to MongoDB
const corsOptions = {
  origin: 'http://localhost:5173',
  credentials: true,
};

await connectDB();
app.use(cors(corsOptions));
app.use(cookieParser());
app.use(express.json());

// Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/images', imageRoutes);
app.use('/api/v1/billing', billingRoutes);
app.use('/api/v1/project', projectRoutes);

// Error handling middleware
app.use((err: Error, _req: express.Request, res: express.Response,_next: express.Function) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    error: {
      code: '500',
      message: 'Internal server error',
      details: err.message
    }
  });
});

const PORT = Deno.env.get("PORT") || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});