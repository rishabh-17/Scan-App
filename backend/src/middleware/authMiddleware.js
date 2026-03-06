const jwt = require('jsonwebtoken');
const Staff = require('../models/Staff');

const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      // Get token from header
      token = req.headers.authorization.split(' ')[1];

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Get user from the token
      req.user = await Staff.findById(decoded.id).select('-password');

      next();
    } catch (error) {
      console.log(error);
      res.status(401).json({ message: 'Not authorized' });
    }
  }

  if (!token) {
    res.status(401).json({ message: 'Not authorized, no token' });
  }
};

const admin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(401).json({ message: 'Not authorized as an admin' });
  }
};

const finance = (req, res, next) => {
  if (req.user && (req.user.role === 'admin' || req.user.role === 'finance_hr')) {
    next();
  } else {
    res.status(401).json({ message: 'Not authorized as finance manager' });
  }
};

const staffManager = (req, res, next) => {
  if (req.user && (req.user.role === 'admin' || req.user.role === 'center_supervisor')) {
    next();
  } else {
    res.status(401).json({ message: 'Not authorized as staff manager' });
  }
};

const staffViewer = (req, res, next) => {
  if (req.user && (req.user.role === 'admin' || req.user.role === 'finance_hr' || req.user.role === 'center_supervisor')) {
    next();
  } else {
    res.status(401).json({ message: 'Not authorized to view staff' });
  }
};

module.exports = { protect, admin, finance, staffManager, staffViewer };
