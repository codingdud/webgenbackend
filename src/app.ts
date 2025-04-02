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
import dashboardRoutes from "./routes/dashboard.ts";
import userRoutes from "./routes/user.ts";
import { logger } from "./utils/logger.ts";

export const app = express();

// CORS Configuration
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  Deno.env.get("CORS_ORIGIN"),
].filter(Boolean);

const corsOptions = {
  origin: function (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) {
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      logger.warn(`Blocked request from unauthorized origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'X-Api-Key',
    'Access-Control-Allow-Origin',
    'Access-Control-Allow-Credentials',
    'Access-Control-Allow-Methods',
    'Access-Control-Allow-Headers'
  ],
  exposedHeaders: [
    'Access-Control-Allow-Origin',
    'Access-Control-Allow-Credentials'
  ]
};
await connectDB();
app.use(cors(corsOptions));
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/images', imageRoutes);
app.use('/api/v1/billing', billingRoutes);
app.use('/api/v1/project', projectRoutes);
app.use('/api/v1/dashboard', dashboardRoutes);
app.use('/api/v1/user', userRoutes);

// Error handling middleware
app.use((err: Error, _req: express.Request, res: express.Response,_next: express.Function) => {
  logger.error('Internal Server Error', { 
    error: err.stack,
    message: err.message 
  });
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
  logger.info(`Server running on port ${PORT}`);
});