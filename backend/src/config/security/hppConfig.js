import hpp from "hpp";
import logger from "../../logs/logger.js";

/**
 * HTTP Parameter Pollution (HPP) Protection Configuration
 * Prevents duplicate query parameters that could cause security issues
 * Allows whitelisted parameters where necessary
 */

/**
 * Whitelist of parameters that can have multiple values
 * These parameters are safe to have duplicates
 */
const whitelist = [
  // Add parameters here if you need to allow multiple values
  // Example: 'tags', 'categories', etc.
];

/**
 * HPP Configuration
 * Blocks duplicate parameters except those in whitelist
 */
const hppConfig = hpp({
  whitelist: whitelist,
  checkQuery: true, // Check query string
  checkBody: true, // Check request body
  checkBodyOnlyForContentType: ["application/x-www-form-urlencoded", "application/json"], // Only check body for these content types
});

logger.info("HPP protection configured", {
  whitelist: whitelist.length > 0 ? whitelist : "none",
});

export default hppConfig;
