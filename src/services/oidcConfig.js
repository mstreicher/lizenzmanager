import { UserManager, WebStorageStateStore } from 'oidc-client-ts';

const isDevelopment = import.meta.env.VITE_DEVELOPMENT_MODE === 'true';

// OIDC Configuration for VIDIS
const oidcConfig = {
  authority: import.meta.env.VITE_VIDIS_OIDC_ISSUER || 'https://aai-test.vidis.schule/auth/realms/vidis',
  client_id: import.meta.env.VITE_VIDIS_CLIENT_ID || 'lc-kern-client',
  client_secret: import.meta.env.VITE_VIDIS_CLIENT_SECRET,
  redirect_uri: import.meta.env.VITE_VIDIS_REDIRECT_URI || `${window.location.origin}/auth/callback`,
  response_type: 'code',
  scope: import.meta.env.VITE_VIDIS_SCOPES || 'openid',
  post_logout_redirect_uri: window.location.origin,
  userStore: new WebStorageStateStore({ store: window.localStorage }),
  automaticSilentRenew: false, // VIDIS doesn't support silent renew
  silent_redirect_uri: `${window.location.origin}/silent-callback.html`,
  // VIDIS-specific settings
  loadUserInfo: false, // VIDIS provides data via access token, not userinfo endpoint
  filterProtocolClaims: true,
  clockSkew: 300, // 5 minutes tolerance for clock differences
  // Discovery document URL
  metadataUrl: import.meta.env.VITE_VIDIS_DISCOVERY_URL,
  // Additional VIDIS settings
  extraQueryParams: {},
  extraTokenParams: {},
};

// Create UserManager instance
export const userManager = new UserManager(oidcConfig);

// OIDC Event Handlers
userManager.events.addUserLoaded((user) => {
  console.log('VIDIS User loaded:', user.profile);
});

userManager.events.addUserUnloaded(() => {
  console.log('VIDIS User unloaded');
});

userManager.events.addAccessTokenExpiring(() => {
  console.log('VIDIS Access token expiring');
});

userManager.events.addAccessTokenExpired(() => {
  console.log('VIDIS Access token expired');
});

userManager.events.addSilentRenewError((e) => {
  console.error('VIDIS Silent renew error:', e);
});

// VIDIS Role Mapping
export const mapVidisRole = (vidisRole) => {
  switch (vidisRole) {
    case 'LEHR': return 'lehrer';
    case 'LERN': return 'lehrer'; // Lernende werden als Lehrer behandelt, da es keine separate Schüler-Rolle gibt
    case 'LEIT': return 'schulleiter';
    default: return 'lehrer'; // Fallback
  }
};

// Generate pseudonym from VIDIS sub
export const generateVidisPseudonym = (sub) => {
  return `pseudo-${sub.replace(/[^a-zA-Z0-9]/g, '-')}`;
};

// Process VIDIS user profile
export const processVidisProfile = (profile) => {
  return {
    ...profile,
    // Generate LC-Kern specific fields from access token data
    name: profile.name || `${profile.given_name || ''} ${profile.family_name || ''}`.trim(),
    vidis_pseudonym: generateVidisPseudonym(profile.sub),
    role: mapVidisRole(profile.rolle),
    // Keep original VIDIS fields
    vidis_sub: profile.sub,
    vidis_rolle: profile.rolle,
    vidis_schulkennung: profile.schulkennung,
    vidis_bundesland: profile.bundesland,
    // Use email from token
    email: profile.email || profile.preferred_username + '@vidis.local',
  };
};

// Decode JWT token to extract VIDIS data
export const decodeVidisToken = (token) => {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    
    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error('Error decoding VIDIS token:', error);
    return null;
  }
};

// Helper functions
export const oidcService = {
  // Start VIDIS login
  async login() {
    console.log('Starting VIDIS login...');
    return userManager.signinRedirect();
  },

  // Handle callback after VIDIS login
  async handleCallback() {
    console.log('Handling VIDIS callback...');
    return userManager.signinRedirectCallback();
  },

  // Get current user with VIDIS data from access token
  async getUser() {
    const user = await userManager.getUser();
    if (user && user.access_token) {
      // Extract VIDIS data from access token
      const tokenData = decodeVidisToken(user.access_token);
      if (tokenData) {
        // Merge token data with user profile
        user.profile = {
          ...user.profile,
          ...tokenData,
        };
      }
    }
    return user;
  },

  // Logout from VIDIS
  async logout() {
    console.log('Logging out from VIDIS...');
    return userManager.signoutRedirect();
  },

  // Check if user is authenticated
  async isAuthenticated() {
    const user = await this.getUser();
    return user && !user.expired;
  },

  // Get VIDIS user info from access token
  async getVidisUserInfo(accessToken) {
    try {
      const tokenData = decodeVidisToken(accessToken);
      if (tokenData) {
        return processVidisProfile(tokenData);
      }
      return null;
    } catch (error) {
      console.error('Error getting VIDIS user info:', error);
      return null;
    }
  },
};
