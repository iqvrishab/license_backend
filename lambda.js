import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { connect } from 'mongoose';
import { startMonitoringSyncScheduler } from './src/jobs/monitoringSync.js';
import licenseRoutes from './src/routes/licenseRoutes.js';
import { configure } from '@codegenie/serverless-express';

const app = express();

app.use(
  cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

app.use(express.json());
app.use('/backend_api', licenseRoutes);

let isConnected = false;
async function connectDB() {
  if (isConnected) return;
  await connect(process.env.MONGO_URI);
  isConnected = true;
  console.log('✅ MongoDB connected');
  startMonitoringSyncScheduler();
}
await connectDB();

const serverlessExpress = configure({ app });
export const handler = serverlessExpress;
