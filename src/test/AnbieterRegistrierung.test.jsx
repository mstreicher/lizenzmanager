import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AnbieterRegistrierung from '../components/AnbieterRegistrierung';

// Mock Supabase
const mockSupabase = {
  auth: {
    getSession: vi.fn(),
  },
  from: vi.fn(() => ({
    insert: vi.fn(() => ({
      select: vi.fn(() => ({
        single: vi.fn(),
      })),
    })),
    update: vi.fn(() => ({
      eq: vi.fn(),
    })),
  })),
};

vi.mock('../../sources/supabaseClient', () => ({
  supabase: mockSupabase,
}));

describe('AnbieterRegistrierung Component', () => {
  const mockOnRegistrationComplete = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock successful session
    mockSupabase.auth.getSession.mockResolvedValue({
      data: {
        session: {
          user: { id: 'user-123' }
        }
      }
    });
  });

  it('should render registration form', () => {
    render(<AnbieterRegistrierung onRegistrationComplete={mockOnRegistrationComplete} />);

    expect(screen.getByText('🏢 Anbieter-Registrierung')).toBeInTheDocument();
    expect(screen.getByLabelText(/Firmenname/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Kontakt-E-Mail/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Adresse/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Spezialisierung/)).toBeInTheDocument();
    expect(screen.getByText('Registrierung einreichen')).toBeInTheDocument();
  });

  it('should show required field indicators', () => {
    render(<AnbieterRegistrierung onRegistrationComplete={mockOnRegistrationComplete} />);

    const requiredFields = screen.getAllByText('*');
    expect(requiredFields.length).toBeGreaterThan(0);
  });

  it('should handle form input changes', async () => {
    const user = userEvent.setup();
    render(<AnbieterRegistrierung onRegistrationComplete={mockOnRegistrationComplete} />);

    const companyNameInput = screen.getByLabelText(/Firmenname/);
    const emailInput = screen.getByLabelText(/Kontakt-E-Mail/);
    const phoneInput = screen.getByLabelText(/Telefon/);

    await user.type(companyNameInput, 'Test Company GmbH');
    await user.type(emailInput, 'contact@testcompany.de');
    await user.type(phoneInput, '+49 123 456789');

    expect(companyNameInput).toHaveValue('Test Company GmbH');
    expect(emailInput).toHaveValue('contact@testcompany.de');
    expect(phoneInput).toHaveValue('+49 123 456789');
  });

  it('should handle specialization selection', async () => {
    const user = userEvent.setup();
    render(<AnbieterRegistrierung onRegistrationComplete={mockOnRegistrationComplete} />);

    const specializationSelect = screen.getByLabelText(/Spezialisierung/);
    
    await user.selectOptions(specializationSelect, 'schulbuecher');
    expect(specializationSelect).toHaveValue('schulbuecher');

    await user.selectOptions(specializationSelect, 'software');
    expect(specializationSelect).toHaveValue('software');
  });

  it('should validate required fields', async () => {
    const user = userEvent.setup();
    render(<AnbieterRegistrierung onRegistrationComplete={mockOnRegistrationComplete} />);

    const submitButton = screen.getByText('Registrierung einreichen');
    await user.click(submitButton);

    // HTML5 validation should prevent submission
    const companyNameInput = screen.getByLabelText(/Firmenname/);
    expect(companyNameInput).toBeInvalid();
  });

  it('should submit form with valid data', async () => {
    const user = userEvent.setup();
    const mockInsertResponse = {
      data: { id: 'profile-123', api_key: 'lc_test_key' },
      error: null,
    };
    const mockUpdateResponse = { error: null };

    mockSupabase.from.mockReturnValueOnce({
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn().mockResolvedValue(mockInsertResponse),
        })),
      })),
    });

    mockSupabase.from.mockReturnValueOnce({
      update: vi.fn(() => ({
        eq: vi.fn().mockResolvedValue(mockUpdateResponse),
      })),
    });

    render(<AnbieterRegistrierung onRegistrationComplete={mockOnRegistrationComplete} />);

    // Fill out the form
    await user.type(screen.getByLabelText(/Firmenname/), 'Test Company GmbH');
    await user.type(screen.getByLabelText(/Kontakt-E-Mail/), 'contact@testcompany.de');
    await user.type(screen.getByLabelText(/Adresse/), 'Teststraße 123\n12345 Teststadt');
    await user.selectOptions(screen.getByLabelText(/Spezialisierung/), 'schulbuecher');

    const submitButton = screen.getByText('Registrierung einreichen');
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockOnRegistrationComplete).toHaveBeenCalledWith(mockInsertResponse.data);
    });
  });

  it('should show loading state during submission', async () => {
    const user = userEvent.setup();
    
    // Mock a delayed response
    mockSupabase.from.mockReturnValue({
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => new Promise(resolve => setTimeout(resolve, 100))),
        })),
      })),
    });

    render(<AnbieterRegistrierung onRegistrationComplete={mockOnRegistrationComplete} />);

    // Fill required fields
    await user.type(screen.getByLabelText(/Firmenname/), 'Test Company');
    await user.type(screen.getByLabelText(/Kontakt-E-Mail/), 'test@example.com');
    await user.type(screen.getByLabelText(/Adresse/), 'Test Address');
    await user.selectOptions(screen.getByLabelText(/Spezialisierung/), 'software');

    const submitButton = screen.getByText('Registrierung einreichen');
    await user.click(submitButton);

    expect(screen.getByText('Registrierung läuft...')).toBeInTheDocument();
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(submitButton).toBeDisabled();
  });

  it('should display error message on submission failure', async () => {
    const user = userEvent.setup();
    const errorMessage = 'Database connection failed';

    mockSupabase.from.mockReturnValue({
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({ data: null, error: { message: errorMessage } }),
        })),
      })),
    });

    render(<AnbieterRegistrierung onRegistrationComplete={mockOnRegistrationComplete} />);

    // Fill required fields
    await user.type(screen.getByLabelText(/Firmenname/), 'Test Company');
    await user.type(screen.getByLabelText(/Kontakt-E-Mail/), 'test@example.com');
    await user.type(screen.getByLabelText(/Adresse/), 'Test Address');
    await user.selectOptions(screen.getByLabelText(/Spezialisierung/), 'software');

    const submitButton = screen.getByText('Registrierung einreichen');
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/Fehler bei der Registrierung/)).toBeInTheDocument();
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });
  });

  it('should show success message after successful registration', async () => {
    const user = userEvent.setup();
    const mockResponse = {
      data: { id: 'profile-123', api_key: 'lc_test_key' },
      error: null,
    };

    mockSupabase.from.mockReturnValueOnce({
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn().mockResolvedValue(mockResponse),
        })),
      })),
    });

    mockSupabase.from.mockReturnValueOnce({
      update: vi.fn(() => ({
        eq: vi.fn().mockResolvedValue({ error: null }),
      })),
    });

    render(<AnbieterRegistrierung onRegistrationComplete={mockOnRegistrationComplete} />);

    // Fill and submit form
    await user.type(screen.getByLabelText(/Firmenname/), 'Test Company');
    await user.type(screen.getByLabelText(/Kontakt-E-Mail/), 'test@example.com');
    await user.type(screen.getByLabelText(/Adresse/), 'Test Address');
    await user.selectOptions(screen.getByLabelText(/Spezialisierung/), 'software');

    await user.click(screen.getByText('Registrierung einreichen'));

    await waitFor(() => {
      expect(screen.getByText('✅ Registrierung erfolgreich')).toBeInTheDocument();
      expect(screen.getByText(/Ein Administrator wird Ihre Angaben prüfen/)).toBeInTheDocument();
    });
  });

  it('should handle session error', async () => {
    const user = userEvent.setup();
    
    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: null }
    });

    render(<AnbieterRegistrierung onRegistrationComplete={mockOnRegistrationComplete} />);

    // Fill and submit form
    await user.type(screen.getByLabelText(/Firmenname/), 'Test Company');
    await user.type(screen.getByLabelText(/Kontakt-E-Mail/), 'test@example.com');
    await user.type(screen.getByLabelText(/Adresse/), 'Test Address');
    await user.selectOptions(screen.getByLabelText(/Spezialisierung/), 'software');

    await user.click(screen.getByText('Registrierung einreichen'));

    await waitFor(() => {
      expect(screen.getByText(/Nicht angemeldet/)).toBeInTheDocument();
    });
  });

  it('should include all form fields', () => {
    render(<AnbieterRegistrierung onRegistrationComplete={mockOnRegistrationComplete} />);

    // Check all expected form fields are present
    expect(screen.getByLabelText(/Firmenname/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Kontakt-E-Mail/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Telefon/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Website/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Adresse/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Steuernummer/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Umsatzsteuer-ID/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Spezialisierung/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Beschreibung/)).toBeInTheDocument();
  });

  it('should show privacy notice', () => {
    render(<AnbieterRegistrierung onRegistrationComplete={mockOnRegistrationComplete} />);

    expect(screen.getByText(/Pflichtfelder/)).toBeInTheDocument();
    expect(screen.getByText(/vertraulich behandelt/)).toBeInTheDocument();
  });
});
