import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import path from 'path';
import { fileURLToPath } from 'url';

import authRoutes from './routes/auth.js';
import authorsRoutes from './routes/authors.js';
import analyticsRoutes from './routes/analytics.js';
import adminRoutes from './routes/admin.js';
import visualizeRoutes from './routes/visualize.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({
  origin: process.env.NODE_ENV === 'production' ? true : ['http://localhost:5173', 'http://127.0.0.1:5173'],
  credentials: true
}));
app.use(morgan('combined'));
app.use(express.json());
app.use(cookieParser());

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/authors', authorsRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/visualize', visualizeRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve static files in production
const clientDistPath = path.join(__dirname, '../client/dist');
app.use(express.static(clientDistPath));

// SPA fallback
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(clientDistPath, 'index.html'));
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Admin key: ${process.env.ADMIN_KEY || 'change-me-in-production'}`);
});
