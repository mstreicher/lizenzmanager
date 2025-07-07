import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import VidisLogin from '../components/VidisLogin';

// Mock the OIDC service
const mockOidcService = {
  login: vi.fn(),
  getUser: vi.fn(),
  isAuthenticated: vi.fn(),
};

vi.mock('../services/oidcConfig', () => ({
  oidcService: mockOidcService,
}));

// Mock react-router-dom
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Wrapper component for router context
const RouterWrapper = ({ children }) => (
  <BrowserRouter>{children}</BrowserRouter>
);

describe('VidisLogin Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    import.meta.env.VITE_DEVELOPMENT_MODE = 'true';
  });

  it('should render VIDIS login button', () => {
    render(
      <RouterWrapper>
        <VidisLogin />
      </RouterWrapper>
    );

    expect(screen.getByText('🎓 VIDIS-Anmeldung')).toBeInTheDocument();
    expect(screen.getByText('🔐 Mit VIDIS anmelden')).toBeInTheDocument();
    expect(screen.getByText(/Melden Sie sich mit Ihren VIDIS-Zugangsdaten an/)).toBeInTheDocument();
  });

  it('should show development mode indicator', () => {
    render(
      <RouterWrapper>
        <VidisLogin />
      </RouterWrapper>
    );

    expect(screen.getByText(/Entwicklungsmodus/)).toBeInTheDocument();
    expect(screen.getByText(/VIDIS wird simuliert/)).toBeInTheDocument();
  });

  it('should handle VIDIS login click', async () => {
    const mockUser = {
      profile: {
        sub: 'mock-user-123',
        name: 'Max Mustermann',
        email: 'max.mustermann@schule.de',
        vidis_pseudonym: 'pseudo-789',
        role: 'schulleiter',
        school_id: 'school-456',
      },
    };

    mockOidcService.login.mockResolvedValue(mockUser);
    mockOidcService.getUser.mockResolvedValue(mockUser);

    render(
      <RouterWrapper>
        <VidisLogin />
      </RouterWrapper>
    );

    const loginButton = screen.getByText('🔐 Mit VIDIS anmelden');
    fireEvent.click(loginButton);

    await waitFor(() => {
      expect(mockOidcService.login).toHaveBeenCalled();
    });
  });

  it('should show loading state during login', async () => {
    mockOidcService.login.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

    render(
      <RouterWrapper>
        <VidisLogin />
      </RouterWrapper>
    );

    const loginButton = screen.getByText('🔐 Mit VIDIS anmelden');
    fireEvent.click(loginButton);

    expect(screen.getByText('Anmeldung läuft...')).toBeInTheDocument();
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('should display error message on login failure', async () => {
    const errorMessage = 'VIDIS login failed';
    mockOidcService.login.mockRejectedValue(new Error(errorMessage));

    render(
      <RouterWrapper>
        <VidisLogin />
      </RouterWrapper>
    );

    const loginButton = screen.getByText('🔐 Mit VIDIS anmelden');
    fireEvent.click(loginButton);

    await waitFor(() => {
      expect(screen.getByText(/Fehler bei der VIDIS-Anmeldung/)).toBeInTheDocument();
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });
  });

  it('should navigate to correct dashboard based on user role', async () => {
    const mockUsers = [
      { role: 'anbieter', expectedPath: '/anbieter' },
      { role: 'schulleiter', expectedPath: '/schule' },
      { role: 'admin', expectedPath: '/admin' },
    ];

    for (const { role, expectedPath } of mockUsers) {
      vi.clearAllMocks();

      const mockUser = {
        profile: {
          sub: 'mock-user-123',
          name: 'Test User',
          email: 'test@example.com',
          vidis_pseudonym: 'pseudo-123',
          role,
          school_id: 'school-456',
        },
      };

      mockOidcService.login.mockResolvedValue(mockUser);
      mockOidcService.getUser.mockResolvedValue(mockUser);

      // Mock successful Supabase operations
      const mockSupabaseResponse = {
        data: { id: 'user-123', role },
        error: null,
      };

      render(
        <RouterWrapper>
          <VidisLogin />
        </RouterWrapper>
      );

      const loginButton = screen.getByText('🔐 Mit VIDIS anmelden');
      fireEvent.click(loginButton);

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith(expectedPath);
      });
    }
  });

  it('should handle callback URL correctly', async () => {
    // Mock window.location.pathname
    Object.defineProperty(window, 'location', {
      value: { pathname: '/auth/callback' },
      writable: true,
    });

    const mockUser = {
      profile: {
        sub: 'callback-user',
        name: 'Callback User',
        email: 'callback@example.com',
        vidis_pseudonym: 'pseudo-callback',
        role: 'schulleiter',
        school_id: 'school-123',
      },
    };

    mockOidcService.getUser.mockResolvedValue(mockUser);

    render(
      <RouterWrapper>
        <VidisLogin />
      </RouterWrapper>
    );

    await waitFor(() => {
      expect(mockOidcService.getUser).toHaveBeenCalled();
    });

    // Reset location
    Object.defineProperty(window, 'location', {
      value: { pathname: '/' },
      writable: true,
    });
  });

  it('should handle missing VIDIS user data', async () => {
    mockOidcService.login.mockResolvedValue(null);
    mockOidcService.getUser.mockResolvedValue(null);

    render(
      <RouterWrapper>
        <VidisLogin />
      </RouterWrapper>
    );

    const loginButton = screen.getByText('🔐 Mit VIDIS anmelden');
    fireEvent.click(loginButton);

    await waitFor(() => {
      expect(screen.getByText(/Keine VIDIS-Benutzerdaten erhalten/)).toBeInTheDocument();
    });
  });

  it('should not show development mode indicator in production', () => {
    import.meta.env.VITE_DEVELOPMENT_MODE = 'false';

    render(
      <RouterWrapper>
        <VidisLogin />
      </RouterWrapper>
    );

    expect(screen.queryByText(/Entwicklungsmodus/)).not.toBeInTheDocument();
  });

  it('should disable button during loading', async () => {
    mockOidcService.login.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

    render(
      <RouterWrapper>
        <VidisLogin />
      </RouterWrapper>
    );

    const loginButton = screen.getByText('🔐 Mit VIDIS anmelden');
    fireEvent.click(loginButton);

    expect(loginButton).toBeDisabled();
  });
});
