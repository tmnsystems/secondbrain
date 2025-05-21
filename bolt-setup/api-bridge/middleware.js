const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Initialize Supabase client if environment variables are set
let supabase = null;
if (process.env.SUPABASE_URL && process.env.SUPABASE_KEY) {
  supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
}

/**
 * Middleware to verify authentication token from Supabase
 * Expects the token in the Authorization header as "Bearer <token>"
 */
const verifyToken = async (req, res, next) => {
  try {
    if (!supabase) {
      return res.status(503).json({ 
        success: false, 
        error: 'Authentication service not available. Check environment variables.' 
      });
    }

    // Get the auth header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    
    // Verify the token with Supabase
    const { data, error } = await supabase.auth.getUser(token);
    
    if (error || !data.user) {
      return res.status(401).json({ success: false, error: 'Invalid or expired token' });
    }

    // Set user data on request
    req.user = data.user;
    
    next();
  } catch (error) {
    console.error('Error verifying token:', error);
    res.status(500).json({ success: false, error: 'Error verifying authentication' });
  }
};

/**
 * Middleware to check if the user has admin role
 * Must be used after verifyToken middleware
 */
const requireAdmin = (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    // Check if user has admin role
    const isAdmin = req.user.app_metadata && req.user.app_metadata.role === 'admin';
    
    if (!isAdmin) {
      return res.status(403).json({ success: false, error: 'Admin access required' });
    }
    
    next();
  } catch (error) {
    console.error('Error checking admin role:', error);
    res.status(500).json({ success: false, error: 'Error checking permissions' });
  }
};

/**
 * Middleware to log API requests
 */
const logRequest = (req, res, next) => {
  const timestamp = new Date().toISOString();
  const { method, originalUrl, ip, body } = req;
  
  console.log(`[${timestamp}] ${method} ${originalUrl} - IP: ${ip}`);
  
  // Don't log sensitive data like passwords
  if (body && Object.keys(body).length > 0) {
    const sanitizedBody = { ...body };
    if (sanitizedBody.password) sanitizedBody.password = '[REDACTED]';
    console.log(`Request body: ${JSON.stringify(sanitizedBody)}`);
  }
  
  // Log response data
  const originalSend = res.send;
  res.send = function(data) {
    const responseTime = new Date().toISOString();
    console.log(`[${responseTime}] Response status: ${res.statusCode}`);
    
    // Don't log large responses or sensitive data
    if (typeof data === 'string' && data.length < 500) {
      try {
        const parsed = JSON.parse(data);
        if (parsed.user && parsed.user.email) {
          parsed.user.email = '[REDACTED]';
        }
        if (parsed.session && parsed.session.access_token) {
          parsed.session.access_token = '[REDACTED]';
        }
        console.log(`Response body: ${JSON.stringify(parsed)}`);
      } catch (e) {
        // Not JSON, don't log it
      }
    }
    
    originalSend.call(this, data);
    return this;
  };
  
  next();
};

module.exports = {
  verifyToken,
  requireAdmin,
  logRequest
};