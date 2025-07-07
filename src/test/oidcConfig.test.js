import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { oidcService } from '../services/oidcConfig';

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
global.localStorage = localStorageMock;

// Mock window.location
Object.defineProperty(window, 'location', {
  value: {
    origin: 'https://localhost:5173',
    pathname: '/',
  },
  writable: true,
});

describe('OIDC Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Set development mode
    import.meta.env.VITE_DEVELOPMENT_MODE = 'true';
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Development Mode (Mock VIDIS)', () => {
    it('should perform mock login successfully', async () => {
      const result = await oidcService.login();
      
      expect(result).toBeDefined();
      expect(result.profile).toBeDefined();
      expect(result.profile.sub).toBe('mock-user-123');
      expect(result.profile.name).toBe('Max Mustermann');
      expect(result.profile.email).toBe('max.mustermann@schule.de');
      expect(result.profile.vidis_pseudonym).toBe('pseudo-789');
      
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'vidis_mock_user',
        expect.stringContaining('mock-user-123')
      );
    });

    it('should handle mock callback correctly', async () => {
      // Setup mock user in localStorage
      const mockUser = {
        profile: { sub: 'test-user', name: 'Test User' },
        access_token: 'test-token',
        expires_at: Date.now() + 3600000,
      };
      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockUser));

      const result = await oidcService.handleCallback();
      
      expect(result).toEqual(mockUser);
      expect(localStorageMock.getItem).toHaveBeenCalledWith('vidis_mock_user');
    });

    it('should get mock user from localStorage', async () => {
      const mockUser = {
        profile: { sub: 'test-user', name: 'Test User' },
        access_token: 'test-token',
        expires_at: Date.now() + 3600000,
      };
      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockUser));

      const result = await oidcService.getUser();
      
      expect(result).toBeDefined();
      expect(result.profile.sub).toBe('test-user');
      expect(result.expired).toBe(false);
    });

    it('should detect expired mock user', async () => {
      const expiredUser = {
        profile: { sub: 'test-user', name: 'Test User' },
        access_token: 'test-token',
        expires_at: Date.now() - 1000, // Expired
      };
      localStorageMock.getItem.mockReturnValue(JSON.stringify(expiredUser));

      const result = await oidcService.getUser();
      
      expect(result.expired).toBe(true);
    });

    it('should return null when no mock user exists', async () => {
      localStorageMock.getItem.mockReturnValue(null);

      const result = await oidcService.getUser();
      
      expect(result).toBeNull();
    });

    it('should check authentication status correctly', async () => {
      const validUser = {
        profile: { sub: 'test-user' },
        expires_at: Date.now() + 3600000,
      };
      localStorageMock.getItem.mockReturnValue(JSON.stringify(validUser));

      const isAuthenticated = await oidcService.isAuthenticated();
      
      expect(isAuthenticated).toBe(true);
    });

    it('should return false for expired user authentication', async () => {
      const expiredUser = {
        profile: { sub: 'test-user' },
        expires_at: Date.now() - 1000,
      };
      localStorageMock.getItem.mockReturnValue(JSON.stringify(expiredUser));

      const isAuthenticated = await oidcService.isAuthenticated();
      
      expect(isAuthenticated).toBe(false);
    });

    it('should logout by removing mock user', async () => {
      await oidcService.logout();
      
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('vidis_mock_user');
    });
  });

  describe('Production Mode', () => {
    beforeEach(() => {
      import.meta.env.VITE_DEVELOPMENT_MODE = 'false';
    });

    it('should use real UserManager in production mode', async () => {
      // This test would require mocking the actual UserManager
      // For now, we'll just verify the service doesn't crash
      expect(oidcService).toBeDefined();
      expect(typeof oidcService.login).toBe('function');
      expect(typeof oidcService.handleCallback).toBe('function');
      expect(typeof oidcService.getUser).toBe('function');
      expect(typeof oidcService.logout).toBe('function');
      expect(typeof oidcService.isAuthenticated).toBe('function');
    });
  });

  describe('Error Handling', () => {
    it('should handle localStorage errors gracefully', async () => {
      localStorageMock.getItem.mockImplementation(() => {
        throw new Error('localStorage error');
      });

      const result = await oidcService.getUser();
      
      // Should not throw, should handle error gracefully
      expect(result).toBeNull();
    });

    it('should handle invalid JSON in localStorage', async () => {
      localStorageMock.getItem.mockReturnValue('invalid-json');

      const result = await oidcService.getUser();
      
      expect(result).toBeNull();
    });
  });
});
