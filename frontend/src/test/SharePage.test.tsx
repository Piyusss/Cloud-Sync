import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { SharePage } from '../pages/SharePage';
import * as api from '../api';

vi.mock('../api', () => ({
  publicShareApi: {
    info: vi.fn(),
    download: vi.fn(),
  },
}));

vi.mock('../utils/format', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../utils/format')>();
  return {
    ...actual,
    formatBytes: (n: number) => `${n} B`,
    triggerUrlDownload: vi.fn(),
  };
});

function renderSharePage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/share/test-token']}>
        <Routes>
          <Route path="/share/:token" element={<SharePage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

const passwordProtectedInfo = {
  fileName: 'secret.pdf',
  size: 1024,
  contentType: 'application/pdf',
  passwordProtected: true,
};

const openInfo = {
  fileName: 'photo.jpg',
  size: 2048,
  contentType: 'image/jpeg',
  passwordProtected: false,
};

describe('SharePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows file name and size for a public link', async () => {
    vi.mocked(api.publicShareApi.info).mockResolvedValue({ data: openInfo } as any);

    renderSharePage();

    await waitFor(() => {
      expect(screen.getByText('photo.jpg')).toBeInTheDocument();
    });
    expect(screen.getByText('2048 B')).toBeInTheDocument();
    expect(screen.queryByPlaceholderText(/enter password/i)).not.toBeInTheDocument();
  });

  it('shows password input when link is password-protected', async () => {
    vi.mocked(api.publicShareApi.info).mockResolvedValue({ data: passwordProtectedInfo } as any);

    renderSharePage();

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/enter password to download/i)).toBeInTheDocument();
    });
  });

  it('download button is disabled when password field is empty', async () => {
    vi.mocked(api.publicShareApi.info).mockResolvedValue({ data: passwordProtectedInfo } as any);

    renderSharePage();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /download/i })).toBeDisabled();
    });
  });

  it('shows wrong-password error after a failed 403 download attempt', async () => {
    vi.mocked(api.publicShareApi.info).mockResolvedValue({ data: passwordProtectedInfo } as any);
    vi.mocked(api.publicShareApi.download).mockRejectedValue({
      response: { status: 403, data: { message: 'Invalid password' } },
    });

    renderSharePage();

    const input = await screen.findByPlaceholderText(/enter password to download/i);
    await userEvent.type(input, 'wrongpass');
    await userEvent.click(screen.getByRole('button', { name: /download/i }));

    await waitFor(() => {
      expect(screen.getByText(/wrong password/i)).toBeInTheDocument();
    });
  });

  it('shows not-found state when link does not exist', async () => {
    vi.mocked(api.publicShareApi.info).mockRejectedValue({ response: { status: 404 } });

    renderSharePage();

    await waitFor(() => {
      expect(screen.getByText(/link not found or expired/i)).toBeInTheDocument();
    });
  });
});
