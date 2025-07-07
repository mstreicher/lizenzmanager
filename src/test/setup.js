import '@testing-library/jest-dom'

// Mock environment variables for tests
Object.defineProperty(import.meta, 'env', {
  value: {
    VITE_SUPABASE_URL: 'https://test.supabase.co',
    VITE_SUPABASE_ANON_KEY: 'test-key',
    VITE_VIDIS_OIDC_ISSUER: 'https://vidis-mock.example.com',
    VITE_VIDIS_CLIENT_ID: 'test-client',
    VITE_VIDIS_CLIENT_SECRET: 'test-secret',
    VITE_VIDIS_REDIRECT_URI: 'http://localhost:5173/auth/callback',
    VITE_VIDIS_SCOPES: 'openid profile email',
    VITE_DEVELOPMENT_MODE: 'true'
  }
})

// Mock Supabase client
vi.mock('../../sources/supabaseClient', () => ({
  supabase: {
    auth: {
      signInWithPassword: vi.fn(),
      getSession: vi.fn(),
      signOut: vi.fn(),
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(),
        })),
        order: vi.fn(),
      })),
      insert: vi.fn(),
      update: vi.fn(() => ({
        eq: vi.fn(),
      })),
      delete: vi.fn(() => ({
        eq: vi.fn(),
      })),
    })),
  },
}))
