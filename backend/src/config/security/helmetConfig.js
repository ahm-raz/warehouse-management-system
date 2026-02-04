import helmet from "helmet";
import logger from "../../logs/logger.js";

/**
 * Helmet Security Headers Configuration
 * Implements comprehensive HTTP security headers following OWASP best practices
 * Configures Content Security Policy, XSS protection, frame options, and more
 */

const isProduction = process.env.NODE_ENV === "production";
const clientURL = process.env.CLIENT_URL || "http://localhost:5173";

/**
 * Content Security Policy (CSP)
 * Restricts which resources can be loaded to prevent XSS attacks
 */
const contentSecurityPolicy = {
  directives: {
    defaultSrc: ["'self'"],
    styleSrc: ["'self'", "'unsafe-inline'"], // Allow inline styles (needed for some frameworks)
    scriptSrc: ["'self'"], // Only allow scripts from same origin
    imgSrc: ["'self'", "data:", "blob:"], // Allow images from same origin, data URIs, and blobs
    connectSrc: ["'self'", clientURL], // Allow connections to API and client
    fontSrc: ["'self'", "data:"], // Allow fonts from same origin and data URIs
    objectSrc: ["'none'"], // Disallow plugins
    mediaSrc: ["'self'"],
    frameSrc: ["'none'"], // Disallow iframes
    upgradeInsecureRequests: isProduction ? [] : null, // Upgrade HTTP to HTTPS in production
  },
};

/**
 * Helmet configuration
 * Applies security headers based on environment
 */
const helmetConfig = helmet({
  // Content Security Policy
  contentSecurityPolicy: isProduction ? contentSecurityPolicy : false, // Disable in development for easier debugging

  // X-Frame-Options: Prevent clickjacking
  frameguard: {
    action: "deny", // Deny all framing
  },

  // X-XSS-Protection: Enable browser XSS filter
  xssFilter: true,

  // Referrer Policy: Control referrer information
  referrerPolicy: {
    policy: "strict-origin-when-cross-origin", // Send full referrer for same-origin, origin only for cross-origin
  },

  // HSTS: HTTP Strict Transport Security (production only)
  hsts: isProduction
    ? {
        maxAge: 31536000, // 1 year
        includeSubDomains: true,
        preload: true,
      }
    : false, // Disable in development

  // Hide X-Powered-By header
  hidePoweredBy: true,

  // X-Content-Type-Options: Prevent MIME type sniffing
  noSniff: true,

  // Permissions Policy: Control browser features
  permissionsPolicy: {
    features: {
      geolocation: ["'none'"],
      microphone: ["'none'"],
      camera: ["'none'"],
    },
  },
});

logger.info("Helmet security headers configured", {
  environment: process.env.NODE_ENV || "development",
  cspEnabled: isProduction,
  hstsEnabled: isProduction,
  clientURL: clientURL,
});

export default helmetConfig;
