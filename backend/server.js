const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const connectDB = require('./src/config/db');

// Load env vars
dotenv.config();

// Connect to database
connectDB();

const app = express();

// Middleware
app.use(express.json());
app.use(cors());

// Basic route
app.get('/', (req, res) => {
  res.send('API is running...');
});

// Routes
app.use('/api/auth', require('./src/routes/authRoutes'));
app.use('/api/scan-entry', require('./src/routes/scanEntryRoutes'));
app.use('/api/projects', require('./src/routes/projectRoutes'));
app.use('/api/payroll', require('./src/routes/payrollRoutes'));
app.use('/api/payments', require('./src/routes/paymentRoutes'));
app.use('/api/staff', require('./src/routes/staffRoutes'));
// app.use('/api/admin', require('./src/routes/adminRoutes'));

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
