import { supabase } from '../../sources/supabaseClient';

// API Service for LC-Kern external integrations
export class LCKernApiService {
  constructor() {
    this.baseUrl = window.location.origin;
  }

  // Validate API key
  async validateApiKey(apiKey) {
    try {
      const { data, error } = await supabase
        .from('anbieter_profile')
        .select('id, user_id, verification_status')
        .eq('api_key', apiKey)
        .eq('verification_status', 'verified')
        .single();

      if (error || !data) {
        return { valid: false, error: 'Invalid API key' };
      }

      return { valid: true, providerId: data.id, userId: data.user_id };
    } catch (error) {
      return { valid: false, error: error.message };
    }
  }

  // Check license status for a user (external API endpoint)
  async checkLicenseStatus(vidis_pseudonym, license_id) {
    try {
      // Get user by VIDIS pseudonym
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('id, school_id')
        .eq('vidis_pseudonym', vidis_pseudonym)
        .single();

      if (userError || !user) {
        return {
          success: false,
          error: 'User not found',
          has_license: false
        };
      }

      // Check if user's school has this license
      const { data: schoolLicense, error: licenseError } = await supabase
        .from('school_licenses')
        .select(`
          id,
          quantity,
          licenses (
            id,
            title,
            valid_from,
            valid_until,
            type,
            permission,
            prohibition,
            duty,
            scope
          )
        `)
        .eq('school_id', user.school_id)
        .eq('license_id', license_id)
        .single();

      if (licenseError || !schoolLicense) {
        return {
          success: true,
          has_license: false,
          message: 'License not available for this school'
        };
      }

      // Check if license is still valid
      const now = new Date();
      const validFrom = new Date(schoolLicense.licenses.valid_from);
      const validUntil = new Date(schoolLicense.licenses.valid_until);

      if (now < validFrom || now > validUntil) {
        return {
          success: true,
          has_license: false,
          message: 'License expired or not yet valid'
        };
      }

      // Check if user has an assignment
      const { data: assignment, error: assignmentError } = await supabase
        .from('assignments')
        .select('id, assigned_to, assigned_at')
        .eq('school_license_id', schoolLicense.id)
        .or(`assigned_to.is.null,assigned_to.eq.${vidis_pseudonym}`)
        .limit(1)
        .single();

      return {
        success: true,
        has_license: true,
        license: {
          id: schoolLicense.licenses.id,
          title: schoolLicense.licenses.title,
          type: schoolLicense.licenses.type,
          valid_until: schoolLicense.licenses.valid_until,
          permissions: {
            permission: schoolLicense.licenses.permission,
            prohibition: schoolLicense.licenses.prohibition,
            duty: schoolLicense.licenses.duty,
            scope: schoolLicense.licenses.scope
          }
        },
        assignment: assignment ? {
          assigned: !!assignment.assigned_to,
          assigned_at: assignment.assigned_at
        } : null
      };

    } catch (error) {
      return {
        success: false,
        error: error.message,
        has_license: false
      };
    }
  }

  // Get all licenses for a user (external API endpoint)
  async getUserLicenses(vidis_pseudonym) {
    try {
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('id, school_id')
        .eq('vidis_pseudonym', vidis_pseudonym)
        .single();

      if (userError || !user) {
        return {
          success: false,
          error: 'User not found',
          licenses: []
        };
      }

      const { data: schoolLicenses, error: licensesError } = await supabase
        .from('school_licenses')
        .select(`
          id,
          quantity,
          licenses (
            id,
            title,
            valid_from,
            valid_until,
            type,
            subject,
            grade_level,
            permission,
            prohibition,
            duty,
            scope
          ),
          assignments (
            id,
            assigned_to,
            assigned_at
          )
        `)
        .eq('school_id', user.school_id);

      if (licensesError) {
        return {
          success: false,
          error: licensesError.message,
          licenses: []
        };
      }

      const now = new Date();
      const validLicenses = schoolLicenses
        .filter(sl => {
          const validFrom = new Date(sl.licenses.valid_from);
          const validUntil = new Date(sl.licenses.valid_until);
          return now >= validFrom && now <= validUntil;
        })
        .map(sl => ({
          id: sl.licenses.id,
          title: sl.licenses.title,
          type: sl.licenses.type,
          subject: sl.licenses.subject,
          grade_level: sl.licenses.grade_level,
          valid_until: sl.licenses.valid_until,
          permissions: {
            permission: sl.licenses.permission,
            prohibition: sl.licenses.prohibition,
            duty: sl.licenses.duty,
            scope: sl.licenses.scope
          },
          assignment: sl.assignments.find(a => 
            a.assigned_to === vidis_pseudonym || !a.assigned_to
          )
        }));

      return {
        success: true,
        licenses: validLicenses,
        total: validLicenses.length
      };

    } catch (error) {
      return {
        success: false,
        error: error.message,
        licenses: []
      };
    }
  }

  // Log API access for monitoring
  async logApiAccess(endpoint, userId, responseStatus) {
    try {
      await supabase
        .from('api_access_logs')
        .insert({
          endpoint,
          user_id: userId,
          response_status: responseStatus,
          timestamp: new Date().toISOString()
        });
    } catch (error) {
      console.error('Failed to log API access:', error);
    }
  }

  // Generate SSO redirect URL for licensed content
  generateSsoUrl(license_id, vidis_pseudonym, return_url) {
    const params = new URLSearchParams({
      license_id,
      user: vidis_pseudonym,
      return_url,
      timestamp: Date.now(),
    });

    // In a real implementation, you would sign this URL
    return `${this.baseUrl}/api/sso/redirect?${params.toString()}`;
  }
}

// Export singleton instance
export const apiService = new LCKernApiService();

// Mock API endpoints for development/testing
export const mockApiEndpoints = {
  // Mock external LMS calling our API
  async checkUserLicense(vidis_pseudonym, license_id) {
    console.log('Mock LMS checking license:', { vidis_pseudonym, license_id });
    return await apiService.checkLicenseStatus(vidis_pseudonym, license_id);
  },

  // Mock external system getting user licenses
  async getUserLicenses(vidis_pseudonym) {
    console.log('Mock system getting user licenses:', vidis_pseudonym);
    return await apiService.getUserLicenses(vidis_pseudonym);
  },

  // Mock SSO redirect
  async redirectToContent(license_id, vidis_pseudonym) {
    const ssoUrl = apiService.generateSsoUrl(
      license_id, 
      vidis_pseudonym, 
      window.location.href
    );
    console.log('Mock SSO redirect:', ssoUrl);
    return { redirect_url: ssoUrl };
  }
};
