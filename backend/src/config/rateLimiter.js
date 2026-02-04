import rateLimit from "express-rate-limit";

/**
 * Rate Limiter Configuration
 * Limits API requests to prevent abuse
 */

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    success: false,
    error: "Too many requests from this IP, please try again later.",
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error: "Too many requests from this IP, please try again later.",
    });
  },
});

export default limiter;
