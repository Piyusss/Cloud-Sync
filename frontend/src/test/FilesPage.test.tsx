import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { FilesPage } from '../pages/FilesPage';
import * as api from '../api';

vi.mock('../api', () => ({
  fileApi: {
    list: vi.fn().mockResolvedValue({ data: [] }),
    upload: vi.fn(),
    delete: vi.fn(),
    rename: vi.fn(),
    move: vi.fn(),
    download: vi.fn(),
  },
  folderApi: {
    list: vi.fn().mockResolvedValue({ data: [] }),
    create: vi.fn(),
    delete: vi.fn(),
    breadcrumb: vi.fn().mockResolvedValue({ data: [] }),
    rename: vi.fn(),
    listAll: vi.fn().mockResolvedValue({ data: [] }),
  },
  versionApi: {
    list: vi.fn().mockResolvedValue({ data: [] }),
    restore: vi.fn(),
    delete: vi.fn(),
  },
  shareApi: {
    create: vi.fn(),
    list: vi.fn().mockResolvedValue({ data: [] }),
    listAll: vi.fn().mockResolvedValue({ data: [] }),
    revoke: vi.fn(),
  },
  chunkApi: {
    init: vi.fn(),
    uploadChunk: vi.fn(),
    complete: vi.fn(),
    cancel: vi.fn(),
    status: vi.fn(),
  },
}));

vi.mock('../utils/chunkedUpload', () => ({
  chunkedUpload: vi.fn(),
}));

function renderFilesPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/files']}>
        <Routes>
          <Route path="/files" element={<FilesPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('FilesPage upload state machine', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.fileApi.list).mockResolvedValue({ data: [] } as any);
    vi.mocked(api.folderApi.list).mockResolvedValue({ data: [] } as any);
    vi.mocked(api.folderApi.breadcrumb).mockResolvedValue({ data: [] } as any);
  });

  it('renders an upload button', () => {
    renderFilesPage();
    expect(screen.getByRole('button', { name: /upload/i })).toBeInTheDocument();
  });

  it('shows empty-state prompt when no files or folders exist', async () => {
    renderFilesPage();
    await waitFor(() => {
      expect(screen.getByText(/drag files here/i)).toBeInTheDocument();
    });
  });

  it('shows file name in list after API returns files', async () => {
    vi.mocked(api.fileApi.list).mockResolvedValue({
      data: [
        {
          id: 'f1',
          name: 'invoice.pdf',
          size: 51200,
          contentType: 'application/pdf',
          folderId: null,
          createdAt: new Date().toISOString(),
        },
      ],
    } as any);

    renderFilesPage();

    await waitFor(() => {
      expect(screen.getByText('invoice.pdf')).toBeInTheDocument();
    });
  });

  it('shows folder name in list after API returns folders', async () => {
    vi.mocked(api.folderApi.list).mockResolvedValue({
      data: [
        {
          id: 'folder-1',
          name: 'Projects',
          userId: 'user-1',
          parentFolderId: null,
          createdAt: new Date().toISOString(),
        },
      ],
    } as any);

    renderFilesPage();

    await waitFor(() => {
      expect(screen.getByText('Projects')).toBeInTheDocument();
    });
  });
});
