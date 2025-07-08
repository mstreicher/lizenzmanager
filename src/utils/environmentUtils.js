/**
 * Environment utilities for multi-environment support
 * Supports both localhost development and GitHub Pages production
 */

/**
 * Get the current environment based on the URL
 * @returns {'development' | 'production'}
 */
export const getCurrentEnvironment = () => {
  const hostname = window.location.hostname;
  const origin = window.location.origin;
  
  // Development environment
  if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname.startsWith('192.168.') || hostname.startsWith('10.')) {
    return 'development';
  }
  
  // GitHub Pages or other production environments
  if (hostname.includes('github.io') || origin.includes('mstreicher.github.io')) {
    return 'production';
  }
  
  // Default to production for unknown domains
  return 'production';
};

/**
 * Get the base URL for the current environment
 * @returns {string} Base URL
 */
export const getBaseUrl = () => {
  const env = getCurrentEnvironment();
  
  if (env === 'development') {
    return 'https://localhost:5173';
  } else {
    // GitHub Pages URL
    return 'https://mstreicher.github.io/lizenzmanager';
  }
};

/**
 * Get the correct VIDIS redirect URI for the current environment
 * @returns {string} Redirect URI
 */
export const getVidisRedirectUri = () => {
  const baseUrl = getBaseUrl();
  return `${baseUrl}/auth/callback`;
};

/**
 * Get environment-specific configuration
 * @returns {object} Environment configuration
 */
export const getEnvironmentConfig = () => {
  const env = getCurrentEnvironment();
  const baseUrl = getBaseUrl();
  
  return {
    environment: env,
    baseUrl,
    vidisRedirectUri: getVidisRedirectUri(),
    isDevelopment: env === 'development',
    isProduction: env === 'production',
    // VIDIS configuration
    vidis: {
      issuer: 'https://aai-test.vidis.schule/auth/realms/vidis',
      clientId: 'lc-kern-client',
      clientSecret: 'kCXIpvO7kVrommGAPi6RBenZCocr6fl3',
      redirectUri: getVidisRedirectUri(),
      scope: 'openid', // Nur openid - VIDIS unterstützt keine anderen Scopes
      discoveryUrl: 'https://aai-test.vidis.schule/auth/realms/vidis/.well-known/openid-configuration'
    }
  };
};

/**
 * Log environment information for debugging
 */
export const logEnvironmentInfo = () => {
  const config = getEnvironmentConfig();
  console.log('🌍 Environment Configuration:', {
    environment: config.environment,
    baseUrl: config.baseUrl,
    vidisRedirectUri: config.vidisRedirectUri,
    hostname: window.location.hostname,
    pathname: window.location.pathname,
    origin: window.location.origin
  });
};
