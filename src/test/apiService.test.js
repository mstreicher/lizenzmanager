import { describe, it, expect, vi, beforeEach } from 'vitest';
import { apiService, mockApiEndpoints } from '../services/apiService';

// Mock supabase
const mockSupabase = {
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn(),
      })),
      or: vi.fn(() => ({
        limit: vi.fn(() => ({
          single: vi.fn(),
        })),
      })),
    })),
    insert: vi.fn(),
  })),
};

vi.mock('../../sources/supabaseClient', () => ({
  supabase: mockSupabase,
}));

describe('API Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('validateApiKey', () => {
    it('should validate a correct API key', async () => {
      const mockProvider = {
        id: 'provider-123',
        user_id: 'user-456',
        verification_status: 'verified',
      };

      mockSupabase.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({ data: mockProvider, error: null }),
            })),
          })),
        })),
      });

      const result = await apiService.validateApiKey('lc_valid_key');

      expect(result.valid).toBe(true);
      expect(result.providerId).toBe('provider-123');
      expect(result.userId).toBe('user-456');
    });

    it('should reject an invalid API key', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } }),
            })),
          })),
        })),
      });

      const result = await apiService.validateApiKey('invalid_key');

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid API key');
    });

    it('should handle database errors', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockRejectedValue(new Error('Database error')),
            })),
          })),
        })),
      });

      const result = await apiService.validateApiKey('test_key');

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Database error');
    });
  });

  describe('checkLicenseStatus', () => {
    it('should return license status for valid user and license', async () => {
      const mockUser = { id: 'user-123', school_id: 'school-456' };
      const mockSchoolLicense = {
        id: 'sl-789',
        quantity: 30,
        licenses: {
          id: 'license-123',
          title: 'Test License',
          valid_from: '2024-01-01',
          valid_until: '2024-12-31',
          type: 'klassenlizenz',
          permission: 'use',
          prohibition: 'commercialUse',
          duty: 'attribution',
          scope: 'schule',
        },
      };
      const mockAssignment = {
        id: 'assignment-123',
        assigned_to: null,
        assigned_at: null,
      };

      // Mock user lookup
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ data: mockUser, error: null }),
          })),
        })),
      });

      // Mock school license lookup
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({ data: mockSchoolLicense, error: null }),
            })),
          })),
        })),
      });

      // Mock assignment lookup
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            or: vi.fn(() => ({
              limit: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({ data: mockAssignment, error: null }),
              })),
            })),
          })),
        })),
      });

      const result = await apiService.checkLicenseStatus('pseudo-123', 'license-123');

      expect(result.success).toBe(true);
      expect(result.has_license).toBe(true);
      expect(result.license.title).toBe('Test License');
      expect(result.assignment.assigned).toBe(false);
    });

    it('should return false for non-existent user', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ data: null, error: { message: 'User not found' } }),
          })),
        })),
      });

      const result = await apiService.checkLicenseStatus('invalid-pseudo', 'license-123');

      expect(result.success).toBe(false);
      expect(result.has_license).toBe(false);
      expect(result.error).toBe('User not found');
    });

    it('should return false for expired license', async () => {
      const mockUser = { id: 'user-123', school_id: 'school-456' };
      const mockSchoolLicense = {
        id: 'sl-789',
        licenses: {
          id: 'license-123',
          title: 'Expired License',
          valid_from: '2020-01-01',
          valid_until: '2020-12-31', // Expired
          type: 'klassenlizenz',
        },
      };

      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ data: mockUser, error: null }),
          })),
        })),
      });

      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({ data: mockSchoolLicense, error: null }),
            })),
          })),
        })),
      });

      const result = await apiService.checkLicenseStatus('pseudo-123', 'license-123');

      expect(result.success).toBe(true);
      expect(result.has_license).toBe(false);
      expect(result.message).toBe('License expired or not yet valid');
    });
  });

  describe('getUserLicenses', () => {
    it('should return all valid licenses for a user', async () => {
      const mockUser = { id: 'user-123', school_id: 'school-456' };
      const mockSchoolLicenses = [
        {
          id: 'sl-1',
          quantity: 30,
          licenses: {
            id: 'license-1',
            title: 'Math License',
            valid_from: '2024-01-01',
            valid_until: '2024-12-31',
            type: 'klassenlizenz',
            subject: 'Mathematik',
            grade_level: '9',
            permission: 'use',
            prohibition: 'commercialUse',
            duty: 'attribution',
            scope: 'schule',
          },
          assignments: [],
        },
        {
          id: 'sl-2',
          quantity: 25,
          licenses: {
            id: 'license-2',
            title: 'Science License',
            valid_from: '2024-01-01',
            valid_until: '2024-12-31',
            type: 'klassenlizenz',
            subject: 'Naturwissenschaften',
            grade_level: '10',
            permission: 'use',
            prohibition: 'commercialUse',
            duty: 'attribution',
            scope: 'schule',
          },
          assignments: [{ assigned_to: 'pseudo-123', assigned_at: '2024-01-15' }],
        },
      ];

      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ data: mockUser, error: null }),
          })),
        })),
      });

      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({ data: mockSchoolLicenses, error: null }),
        })),
      });

      const result = await apiService.getUserLicenses('pseudo-123');

      expect(result.success).toBe(true);
      expect(result.licenses).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.licenses[0].title).toBe('Math License');
      expect(result.licenses[1].title).toBe('Science License');
    });

    it('should filter out expired licenses', async () => {
      const mockUser = { id: 'user-123', school_id: 'school-456' };
      const mockSchoolLicenses = [
        {
          id: 'sl-1',
          licenses: {
            id: 'license-1',
            title: 'Valid License',
            valid_from: '2024-01-01',
            valid_until: '2024-12-31',
            type: 'klassenlizenz',
          },
          assignments: [],
        },
        {
          id: 'sl-2',
          licenses: {
            id: 'license-2',
            title: 'Expired License',
            valid_from: '2020-01-01',
            valid_until: '2020-12-31', // Expired
            type: 'klassenlizenz',
          },
          assignments: [],
        },
      ];

      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ data: mockUser, error: null }),
          })),
        })),
      });

      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({ data: mockSchoolLicenses, error: null }),
        })),
      });

      const result = await apiService.getUserLicenses('pseudo-123');

      expect(result.success).toBe(true);
      expect(result.licenses).toHaveLength(1);
      expect(result.licenses[0].title).toBe('Valid License');
    });
  });

  describe('generateSsoUrl', () => {
    it('should generate a valid SSO URL', () => {
      const ssoUrl = apiService.generateSsoUrl('license-123', 'pseudo-456', 'http://return.url');

      expect(ssoUrl).toContain('/api/sso/redirect');
      expect(ssoUrl).toContain('license_id=license-123');
      expect(ssoUrl).toContain('user=pseudo-456');
      expect(ssoUrl).toContain('return_url=http%3A%2F%2Freturn.url');
      expect(ssoUrl).toContain('timestamp=');
    });
  });

  describe('Mock API Endpoints', () => {
    it('should provide mock LMS license check', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      // Mock the checkLicenseStatus method
      vi.spyOn(apiService, 'checkLicenseStatus').mockResolvedValue({
        success: true,
        has_license: true,
        license: { title: 'Test License' },
      });

      const result = await mockApiEndpoints.checkUserLicense('pseudo-123', 'license-456');

      expect(consoleSpy).toHaveBeenCalledWith('Mock LMS checking license:', {
        vidis_pseudonym: 'pseudo-123',
        license_id: 'license-456',
      });
      expect(result.success).toBe(true);
      expect(result.has_license).toBe(true);

      consoleSpy.mockRestore();
    });

    it('should provide mock SSO redirect', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const result = await mockApiEndpoints.redirectToContent('license-123', 'pseudo-456');

      expect(consoleSpy).toHaveBeenCalledWith('Mock SSO redirect:', expect.stringContaining('/api/sso/redirect'));
      expect(result.redirect_url).toContain('/api/sso/redirect');

      consoleSpy.mockRestore();
    });
  });
});
