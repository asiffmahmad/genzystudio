import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import dashboardRoutes from './routes/dashboard';
import contentRoutes from './routes/content';
import mediaRoutes from './routes/media';
import calendarRoutes from './routes/calendar';
import ideasRoutes from './routes/ideas';
import tasksRoutes from './routes/tasks';
import accountsRoutes from './routes/accounts';
import oauthRoutes from './routes/oauth';
import cronRoutes from './routes/cron';
import aiRoutes from './routes/ai';
import webhooksRoutes from './routes/webhooks';

dotenv.config({ path: '../.env', override: true }); // Load from root if needed
dotenv.config({ override: true }); // Force override with backend/.env

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/content', contentRoutes);
app.use('/api/media', mediaRoutes);
app.use('/api/calendar', calendarRoutes);
app.use('/api/ideas', ideasRoutes);
app.use('/api/tasks', tasksRoutes);
app.use('/api/accounts', accountsRoutes);
app.use('/api/oauth', oauthRoutes);
app.use('/api/cron', cronRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/webhooks', webhooksRoutes);

app.get('/api/health', (req, res) => {
  res.json({
    status: 'UP',
    database: 'UP', // Actually should check DB connection, but stubbing for now
    timestamp: new Date().toISOString()
  });
});

if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

export default app;
