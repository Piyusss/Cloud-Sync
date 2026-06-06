import { useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import mermaid from 'mermaid';
import { Cloud, Menu, X, ChevronDown, ArrowLeft, Hash } from 'lucide-react';
import { useTheme } from '../theme/ThemeProvider';

/* ─────────────────────────────────────────────────────────────────────────────
   Mermaid — grayscale-themed diagrams (follow the app's light/dark theme)
   ───────────────────────────────────────────────────────────────────────────── */

const MERMAID_DARK = {
  background: '#0a0a0a',
  primaryColor: '#171717',
  primaryBorderColor: '#525252',
  primaryTextColor: '#e5e5e5',
  secondaryColor: '#1c1c1c',
  tertiaryColor: '#0a0a0a',
  lineColor: '#737373',
  textColor: '#a3a3a3',
  mainBkg: '#171717',
  nodeBorder: '#525252',
  clusterBkg: '#0f0f0f',
  clusterBorder: '#404040',
  titleColor: '#e5e5e5',
  edgeLabelBackground: '#0a0a0a',
  actorBkg: '#171717',
  actorBorder: '#525252',
  actorTextColor: '#e5e5e5',
  signalColor: '#a3a3a3',
  signalTextColor: '#a3a3a3',
  labelBoxBkgColor: '#171717',
  labelBoxBorderColor: '#525252',
  labelTextColor: '#e5e5e5',
  noteBkgColor: '#262626',
  noteTextColor: '#e5e5e5',
  noteBorderColor: '#525252',
  sequenceNumberColor: '#0a0a0a',
};

// Inverted grayscale for light mode.
const MERMAID_LIGHT = {
  background: '#fafafa',
  primaryColor: '#f5f5f5',
  primaryBorderColor: '#a3a3a3',
  primaryTextColor: '#171717',
  secondaryColor: '#ededed',
  tertiaryColor: '#fafafa',
  lineColor: '#737373',
  textColor: '#525252',
  mainBkg: '#f5f5f5',
  nodeBorder: '#a3a3a3',
  clusterBkg: '#f0f0f0',
  clusterBorder: '#d4d4d4',
  titleColor: '#171717',
  edgeLabelBackground: '#fafafa',
  actorBkg: '#f5f5f5',
  actorBorder: '#a3a3a3',
  actorTextColor: '#171717',
  signalColor: '#525252',
  signalTextColor: '#525252',
  labelBoxBkgColor: '#f5f5f5',
  labelBoxBorderColor: '#a3a3a3',
  labelTextColor: '#171717',
  noteBkgColor: '#e5e5e5',
  noteTextColor: '#171717',
  noteBorderColor: '#a3a3a3',
  sequenceNumberColor: '#fafafa',
};

function initMermaid(isDark: boolean) {
  mermaid.initialize({
    startOnLoad: false,
    securityLevel: 'loose',
    theme: 'base',
    fontFamily: 'Inter, system-ui, sans-serif',
    themeVariables: isDark ? MERMAID_DARK : MERMAID_LIGHT,
  });
}

function Mermaid({ chart }: { chart: string }) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [svg, setSvg] = useState('');
  const [err, setErr] = useState('');
  useEffect(() => {
    // Re-initialise with the active palette before each render so diagrams
    // re-theme when the user toggles light/dark.
    initMermaid(isDark);
    let cancelled = false;
    const id = 'mmd-' + Math.random().toString(36).slice(2, 9);
    mermaid
      .render(id, chart.trim())
      .then(({ svg }) => !cancelled && setSvg(svg))
      .catch((e) => !cancelled && setErr(String(e?.message ?? e)));
    return () => {
      cancelled = true;
    };
  }, [chart, isDark]);

  if (err) {
    return (
      <pre className="my-5 rounded-lg border border-surface-800 bg-surface-900/40 p-4 text-xs text-surface-500 overflow-x-auto">
        {err}
      </pre>
    );
  }
  return (
    <div
      className="my-6 overflow-x-auto rounded-lg border border-surface-800 bg-surface-900/40 p-4 sm:p-6 flex justify-center [&_svg]:max-w-full [&_svg]:h-auto"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   Doc primitives
   ───────────────────────────────────────────────────────────────────────────── */

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-20 pt-10 first:pt-0">
      <h2 className="group relative text-2xl font-bold text-white tracking-tight mb-4">
        <a
          href={`#${id}`}
          aria-label="Link to section"
          className="hidden sm:block absolute -left-6 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <Hash className="w-4 h-4 text-surface-600" />
        </a>
        {title}
      </h2>
      <div className="space-y-4 text-[15px] leading-relaxed text-surface-300">{children}</div>
    </section>
  );
}

function Sub({ children }: { children: ReactNode }) {
  return <h3 className="text-base font-semibold text-surface-100 mt-7 mb-2">{children}</h3>;
}

function P({ children }: { children: ReactNode }) {
  return <p className="text-surface-400 leading-relaxed">{children}</p>;
}

function UL({ items }: { items: ReactNode[] }) {
  return (
    <ul className="space-y-1.5 pl-1">
      {items.map((it, i) => (
        <li key={i} className="flex gap-2.5 text-surface-400">
          <span className="mt-2 w-1 h-1 rounded-full bg-surface-600 shrink-0" />
          <span>{it}</span>
        </li>
      ))}
    </ul>
  );
}

function Code({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <div className="my-4 rounded-lg border border-surface-800 bg-surface-950 overflow-hidden">
      {title && (
        <div className="px-4 py-2 border-b border-surface-800 bg-surface-900/50 text-xs font-mono text-surface-500">
          {title}
        </div>
      )}
      <pre className="px-4 py-3.5 text-xs sm:text-[13px] leading-[1.7] font-mono text-surface-300 overflow-x-auto">
        {children}
      </pre>
    </div>
  );
}

function Callout({ children }: { children: ReactNode }) {
  return (
    <div className="my-4 rounded-lg border border-surface-700 bg-surface-900/60 px-4 py-3 text-sm text-surface-300">
      {children}
    </div>
  );
}

function Endpoints({ rows }: { rows: { method: string; path: string; desc: string }[] }) {
  return (
    <div className="my-4 rounded-lg border border-surface-800 overflow-x-auto">
      <table className="w-full text-sm min-w-[480px]">
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className={i > 0 ? 'border-t border-surface-800' : ''}>
              <td className="px-4 py-2.5 align-top">
                <span className="font-mono text-xs px-1.5 py-0.5 rounded border border-surface-700 text-surface-200">
                  {r.method}
                </span>
              </td>
              <td className="px-2 py-2.5 font-mono text-[13px] text-surface-200 whitespace-nowrap">{r.path}</td>
              <td className="px-4 py-2.5 text-surface-500 text-[13px]">{r.desc}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   Navigation manifest (sidebar + search + scroll-spy)
   ───────────────────────────────────────────────────────────────────────────── */

const NAV: { group: string; items: { id: string; label: string }[] }[] = [
  {
    group: 'Project Overview',
    items: [
      { id: 'introduction', label: 'Introduction' },
      { id: 'problem', label: 'Problem statement' },
      { id: 'objectives', label: 'Key objectives' },
      { id: 'users', label: 'Target users' },
      { id: 'features', label: 'Core features' },
    ],
  },
  {
    group: 'System Architecture',
    items: [
      { id: 'architecture-overview', label: 'High-level overview' },
      { id: 'components', label: 'Components' },
      { id: 'data-flow', label: 'Data flow' },
      { id: 'request-lifecycle', label: 'Request lifecycle' },
    ],
  },
  {
    group: 'Technical Deep Dive',
    items: [
      { id: 'frontend', label: 'Frontend' },
      { id: 'backend', label: 'Backend' },
      { id: 'database', label: 'Database schema' },
      { id: 'auth', label: 'Authentication' },
      { id: 'api-structure', label: 'API structure' },
      { id: 'storage', label: 'File storage' },
      { id: 'caching', label: 'Caching' },
      { id: 'security', label: 'Security' },
      { id: 'performance', label: 'Performance' },
      { id: 'scalability', label: 'Scalability' },
    ],
  },
  {
    group: 'Engineering Decisions',
    items: [
      { id: 'stack-rationale', label: 'Stack rationale' },
      { id: 'tradeoffs', label: 'Trade-offs' },
      { id: 'challenges', label: 'Challenges' },
      { id: 'roadmap', label: 'Roadmap' },
    ],
  },
  {
    group: 'Visual Documentation',
    items: [
      { id: 'diagram-architecture', label: 'Architecture diagram' },
      { id: 'diagram-upload', label: 'Upload flow' },
      { id: 'diagram-auth', label: 'Auth sequence' },
      { id: 'diagram-erd', label: 'ER diagram' },
      { id: 'diagram-workflow', label: 'User workflow' },
    ],
  },
  {
    group: 'Developer Guide',
    items: [
      { id: 'setup', label: 'Setup' },
      { id: 'env', label: 'Environment' },
      { id: 'local-dev', label: 'Local development' },
      { id: 'deployment', label: 'Deployment' },
      { id: 'contributing', label: 'Contributing' },
    ],
  },
  {
    group: 'API Reference',
    items: [
      { id: 'api-overview', label: 'Conventions' },
      { id: 'api-files', label: 'Files' },
      { id: 'api-folders', label: 'Folders' },
      { id: 'api-chunks', label: 'Chunked uploads' },
      { id: 'api-shares', label: 'Sharing' },
      { id: 'api-errors', label: 'Errors' },
    ],
  },
];

const ALL_ITEMS = NAV.flatMap((g) => g.items);

/* ─────────────────────────────────────────────────────────────────────────────
   Sidebar
   ───────────────────────────────────────────────────────────────────────────── */

function Sidebar({
  activeId,
  onNavigate,
}: {
  activeId: string;
  onNavigate: (id: string) => void;
}) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  return (
    <div className="flex flex-col h-full">
      <nav className="flex-1 overflow-y-auto pr-1 space-y-5 text-sm">
        {NAV.map((g) => {
          const isCollapsed = collapsed[g.group];
          return (
            <div key={g.group}>
              <button
                onClick={() => setCollapsed((c) => ({ ...c, [g.group]: !c[g.group] }))}
                className="w-full flex items-center justify-between px-1 mb-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-surface-500 hover:text-surface-300 transition-colors"
              >
                {g.group}
                <ChevronDown
                  className={`w-3.5 h-3.5 transition-transform ${isCollapsed ? '-rotate-90' : ''}`}
                />
              </button>
              {!isCollapsed && (
                <div className="space-y-0.5 border-l border-surface-800 ml-1">
                  {g.items.map((it) => (
                    <button
                      key={it.id}
                      onClick={() => onNavigate(it.id)}
                      className={`block w-full text-left pl-3.5 pr-2 py-1.5 -ml-px border-l transition-colors ${
                        activeId === it.id
                          ? 'border-white text-white'
                          : 'border-transparent text-surface-400 hover:text-surface-100 hover:border-surface-600'
                      }`}
                    >
                      {it.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   Page
   ───────────────────────────────────────────────────────────────────────────── */

export function DocsPage() {
  const [activeId, setActiveId] = useState(ALL_ITEMS[0].id);
  const [mobileNav, setMobileNav] = useState(false);

  // Scroll-spy: highlight the section nearest the top of the viewport
  useEffect(() => {
    const headings = ALL_ITEMS.map((it) => document.getElementById(it.id)).filter(
      (el): el is HTMLElement => !!el
    );
    if (!headings.length) return;
    const obs = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActiveId(visible[0].target.id);
      },
      { rootMargin: '-80px 0px -70% 0px', threshold: 0 }
    );
    headings.forEach((h) => obs.observe(h));
    return () => obs.disconnect();
  }, []);

  const goTo = (id: string) => {
    setMobileNav(false);
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setActiveId(id);
    }
  };

  return (
    <div className="min-h-screen bg-surface-950 text-surface-100">
      {/* Top bar */}
      <header className="sticky top-0 z-40 h-14 border-b border-surface-800 bg-surface-950/90 backdrop-blur-md">
        <div className="h-full max-w-[1400px] mx-auto px-4 sm:px-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileNav(true)}
              className="lg:hidden text-surface-400 hover:text-white"
              aria-label="Open navigation"
            >
              <Menu className="w-5 h-5" />
            </button>
            <Link to="/" className="flex items-center gap-2">
              <div className="w-7 h-7 bg-white rounded flex items-center justify-center">
                <Cloud className="w-4 h-4 text-surface-950" />
              </div>
              <span className="font-semibold text-white hidden sm:inline">CloudSync</span>
              <span className="text-surface-600">/</span>
              <span className="text-surface-300 text-sm">Docs</span>
            </Link>
          </div>
          <Link
            to="/"
            className="flex items-center gap-1.5 text-sm text-surface-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> <span className="hidden sm:inline">Back to site</span>
          </Link>
        </div>
      </header>

      <div className="max-w-[1400px] mx-auto flex">
        {/* Desktop sidebar */}
        <aside className="hidden lg:block w-64 shrink-0 border-r border-surface-800">
          <div className="sticky top-14 h-[calc(100vh-3.5rem)] overflow-y-auto p-5">
            <Sidebar activeId={activeId} onNavigate={goTo} />
          </div>
        </aside>

        {/* Mobile drawer */}
        {mobileNav && (
          <div className="lg:hidden fixed inset-0 z-50 flex">
            <div className="absolute inset-0 bg-black/60" onClick={() => setMobileNav(false)} />
            <div className="relative w-72 max-w-[80%] bg-surface-950 border-r border-surface-800 p-5 overflow-y-auto">
              <div className="flex justify-end mb-2">
                <button onClick={() => setMobileNav(false)} className="text-surface-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <Sidebar activeId={activeId} onNavigate={goTo} />
            </div>
          </div>
        )}

        {/* Content */}
        <main className="flex-1 min-w-0 px-5 sm:px-10 py-10 max-w-3xl">
          {/* Title */}
          <div className="mb-2 text-xs font-medium text-surface-500 uppercase tracking-[0.2em]">
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight mb-3">
            CloudSync  Documentation
          </h1>
          <p className="text-surface-400 leading-relaxed mb-2">
            A complete reference to the architecture, engineering decisions, data flow, and
            operational design of CloudSync - written so anyone can understand the system without
            reading the source.
          </p>

          <div className="divide-y divide-surface-900">

            {/* ── 1. PROJECT OVERVIEW ───────────────────────────────────────── */}
            <Section id="introduction" title="Introduction">
              <P>
                CloudSync is a full-stack cloud storage platform (a Google Drive-style product)
                built to demonstrate production-grade engineering: chunked resumable uploads,
                content-addressed deduplication, versioning, Redis caching, and token-based auth.
              </P>
            </Section>

            <Section id="problem" title="Problem statement">
              <P>
                Naive file-storage apps fail predictably - uploads break at 99%, duplicate files
                waste space, overwrites lose history, and every read hits the database. CloudSync
                addresses each directly:
              </P>
              <UL
                items={[
                  'Resumable chunked uploads survive flaky networks.',
                  'SHA-256 deduplication stores duplicate content once.',
                  'Versioning preserves history; Redis caching keeps reads fast.',
                ]}
              />
            </Section>

            <Section id="objectives" title="Key objectives">
              <UL
                items={[
                  'Resilience — uploads resume and chunks retry.',
                  'Efficiency — store unique bytes once; cache hot reads.',
                  'Security — every request authenticated, data isolated per user.',
                  'Portability — swap infrastructure providers via env vars.',
                ]}
              />
            </Section>

            <Section id="users" title="Target users">
              <UL
                items={[
                  'End users wanting reliable personal storage with sharing.',
                  'Developers evaluating the architecture as a reference.',
                  'Recruiters assessing real engineering depth.',
                ]}
              />
            </Section>

            <Section id="features" title="Core features & capabilities">
              <UL
                items={[
                  'Chunked, resumable, parallel uploads with deduplication.',
                  'File versioning with one-click restore.',
                  'Share links - public, password-protected, or expiring.',
                  'Full-text search, recycle bin, and storage analytics.',
                  'Redis caching with explicit invalidation on every write.',
                ]}
              />
            </Section>

            {/* ── 2. SYSTEM ARCHITECTURE ────────────────────────────────────── */}
            <Section id="architecture-overview" title="High-level architecture">
              <P>
                CloudSync is a single-page React client talking to a stateless Spring Boot API,
                which is backed by three managed services: PostgreSQL for metadata, Redis for
                caching, and S3-compatible object storage for file bytes. Authentication is delegated
                to Clerk.
              </P>
              <Mermaid
                chart={`graph TD
  U["User · Browser"] --> FE["React 19 + TypeScript SPA"]
  FE -->|"sign in / up"| CK["Clerk · hosted auth"]
  FE -->|"REST + Bearer JWT"| API["Spring Boot API · Java 21"]
  API -->|"verify JWT (JWKS)"| CK
  API --> PG[("PostgreSQL · Neon")]
  API --> RD[("Redis · Upstash")]
  API --> S3[("Object Storage · Backblaze B2")]`}
              />
            </Section>

            <Section id="components" title="Components">
              <Sub>Frontend</Sub>
              <P>React 19 + TypeScript + Vite, Tailwind for styling, TanStack Query for server state, React Router for navigation, and the Clerk React SDK for auth.</P>
              <Sub>Backend</Sub>
              <P>Spring Boot 3 (Java 21) with Spring Security as an OAuth2 resource server, Spring Data JPA, Flyway migrations, and the MinIO Java SDK for S3-compatible storage.</P>
              <Sub>Data & infrastructure</Sub>
              <UL
                items={[
                  'PostgreSQL (Neon) — all metadata: users, files, folders, versions, shares, activity.',
                  'Redis (Upstash) — cache for file lists, folders, and user profiles.',
                  'Object storage (Backblaze B2 / MinIO) — raw file bytes, content-addressed.',
                  'Clerk — identity, sessions, and JWT issuance.',
                ]}
              />
            </Section>

            <Section id="data-flow" title="Data flow">
              <P>
                Metadata and bytes travel on separate paths. The database never stores file content -
                it stores a <span className="font-mono text-surface-200">storage_key</span> pointing
                at an object. A read for a file list touches only Postgres/Redis; downloading streams
                bytes straight from object storage.
              </P>
              <Mermaid
                chart={`sequenceDiagram
  participant B as Browser
  participant A as Spring Boot API
  participant R as Redis
  participant P as Postgres
  B->>A: GET /api/files?folderId=… (Bearer JWT)
  A->>A: Verify JWT, resolve userId
  A->>R: GET cloudvault:files::user:folder
  alt cache hit
    R-->>A: cached DTO list
  else cache miss
    A->>P: SELECT … WHERE user_id = ?
    P-->>A: rows
    A->>R: SET key (TTL 5m)
  end
  A-->>B: 200 application/json`}
              />
            </Section>

            <Section id="request-lifecycle" title="Request lifecycle">
              <P>Every authenticated request follows the same pipeline:</P>
              <UL
                items={[
                  'CORS + OAuth2 filters verify the Clerk JWT against JWKS.',
                  'A converter maps the token subject to an internal user UUID (created on first sign-in).',
                  'Thin controllers delegate to services; a global handler maps errors to JSON.',
                ]}
              />
            </Section>

            {/* ── 3. TECHNICAL DEEP DIVE ────────────────────────────────────── */}
            <Section id="frontend" title="Frontend architecture">
              <P>
                A Vite SPA where TanStack Query owns all server state - each view is a query keyed by
                resource and scope, invalidated after mutations. No global store.
              </P>
              <UL
                items={[
                  'Auth: ClerkProvider + a thin AuthContext for the user profile.',
                  'A single Axios instance attaches the Clerk JWT on every request.',
                  'A dedicated utility drives chunked uploads and reports progress.',
                ]}
              />
            </Section>

            <Section id="backend" title="Backend architecture">
              <P>
                Organized by feature package (<span className="font-mono text-surface-200">file, folder, chunk, share, search, analytics, trash, …</span>),
                each with its own entity, repository, service, and controller. Logic lives in
                services; controllers stay thin.
              </P>
              <Code title="layering">
{`Controller   → HTTP, @AuthenticationPrincipal UUID userId
Service      → business logic, @Transactional, @Cacheable/@CacheEvict
Repository   → Spring Data JPA
Entity       → JPA-mapped table row
MinioClient  → S3-compatible object storage`}
              </Code>
            </Section>

            <Section id="database" title="Database schema & relationships">
              <P>
                Schema is managed by Flyway migrations (V1–V10). Core tables: <span className="font-mono text-surface-200">users, files, folders, file_versions, physical_files, shared_links, activities, upload_sessions, upload_chunks</span>.
              </P>
              <UL
                items={[
                  'files → physical_files: many files can share one object (dedup).',
                  'file_versions → files; folders self-reference to form the tree.',
                  'physical_files.ref_count: bytes are deleted only when it reaches zero.',
                ]}
              />
              <Callout>See the <a href="#diagram-erd" className="text-white underline underline-offset-2">ER diagram</a> for the full relationship map.</Callout>
            </Section>

            <Section id="auth" title="Authentication & authorization">
              <P>
                Authentication is delegated to Clerk. The frontend uses Clerk’s hosted sign-in/up;
                the backend is a stateless OAuth2 resource server that verifies each request’s JWT
                against Clerk’s JWKS endpoint. There are no passwords or sessions stored server-side.
              </P>
              <UL
                items={[
                  'The JWT subject (Clerk user id) maps to an internal UUID via findOrCreateByClerkId.',
                  'Authorization is enforced at the query layer - every query is scoped by userId (e.g. findByIdAndUserId), so users can never read another user’s data.',
                  'Public share endpoints are the only unauthenticated routes (GET /api/share/**).',
                ]}
              />
            </Section>

            <Section id="api-structure" title="API structure">
              <P>
                A REST API under <span className="font-mono text-surface-200">/api</span>. Resources
                map to packages: files, folders, chunks, shares, search, analytics, trash, jobs.
                Responses are JSON; downloads stream binary with a Content-Disposition header. See the
                <a href="#api-overview" className="text-white underline underline-offset-2"> API Reference</a> for the full list.
              </P>
            </Section>

            <Section id="storage" title="File storage architecture">
              <P>
                File bytes live in S3-compatible object storage (Backblaze B2 in production, MinIO
                locally), never in the database. Storage is <em>content-addressed</em> by SHA-256 hash
                and tracked in <span className="font-mono text-surface-200">physical_files</span> with
                a reference count - uploading existing content adds only a metadata row, transferring
                no bytes.
              </P>
              <Code title="storage key">
{`physical_files
  hash         varchar(64)  -- SHA-256, unique
  storage_key  varchar(500) -- object key in the bucket
  ref_count    int          -- logical files pointing here
  size         bigint`}
              </Code>
            </Section>

            <Section id="caching" title="Caching">
              <P>
                Redis caches the hot read paths - file lists, folder lists, and the user profile —
                using a cache-aside pattern. Every write path (<span className="font-mono text-surface-200">upload, delete, restore, move</span>)
                invalidates the affected keys explicitly with{' '}
                <span className="font-mono text-surface-200">@CacheEvict</span>, so reads are fast and
                never stale.
              </P>
              <Code title="cache keys">
{`cloudvault:user-dto::<userId>          TTL 5m
cloudvault:files::<userId>:<folder>    TTL 5m
cloudvault:folders::<userId>:<parent>  TTL 10m`}
              </Code>
              <Callout>
                Cache invalidation is the hard part: self-invocation bypasses Spring’s proxy, so
                evictions that can’t use annotations are done programmatically through the CacheManager.
              </Callout>
            </Section>

            <Section id="security" title="Security implementation">
              <UL
                items={[
                  'Stateless Clerk-JWT verification; keys rotate automatically.',
                  'Per-user data isolation enforced in every query.',
                  'Share passwords BCrypt-hashed; secrets supplied via env vars.',
                ]}
              />
            </Section>

            <Section id="performance" title="Performance optimizations">
              <UL
                items={[
                  'Redis-cached reads → single-digit-millisecond responses.',
                  'Parallel chunk uploads; client-side hash skips duplicate transfers.',
                  'Postgres GIN full-text index; downloads stream straight from storage.',
                ]}
              />
            </Section>

            <Section id="scalability" title="Scalability considerations">
              <UL
                items={[
                  'Stateless API scales horizontally — no sticky sessions.',
                  'Storage, Postgres, and Redis scale independently of the app tier.',
                  'Dedup curbs storage growth; chunking bounds request memory.',
                ]}
              />
            </Section>

            {/* ── 4. ENGINEERING DECISIONS ──────────────────────────────────── */}
            <Section id="stack-rationale" title="Technology stack rationale">
              <UL
                items={[
                  'Spring Boot + Java 21 — mature security, transactions, and JPA.',
                  'PostgreSQL — relational integrity plus native full-text search.',
                  'Redis for caching; S3-compatible storage for portable file bytes.',
                  'Clerk offloads auth; React + TanStack Query for declarative server state.',
                ]}
              />
            </Section>

            <Section id="tradeoffs" title="Design trade-offs">
              <UL
                items={[
                  'Managed services over self-hosting — faster, free tiers; latency offset by caching.',
                  'Delegated auth (Clerk) — less control, but fewer security bugs.',
                  'Dedup + cache-aside add write-path complexity for big storage and read wins.',
                ]}
              />
            </Section>

            <Section id="challenges" title="Challenges & solutions">
              <Sub>Resumable uploads</Sub>
              <P>Splitting into 5 MB chunks, uploading 3 in parallel with per-chunk retry/backoff, then merging server-side via a streamed multi-object concatenation.</P>
              <Sub>Cache invalidation correctness</Sub>
              <P>Spring’s @CacheEvict is bypassed on self-invocation; writes that originate inside a bean evict programmatically through the CacheManager to guarantee consistency.</P>
              <Sub>Auth migration</Sub>
              <P>Moving from custom JWT to Clerk required mapping external identities to internal UUIDs without breaking existing data - solved with just-in-time provisioning plus email-based linking.</P>
            </Section>

            <Section id="roadmap" title="Future improvements & roadmap">
              <UL
                items={[
                  'WebSocket notifications (upload complete, file shared).',
                  'Distributed storage nodes with consistent hashing.',
                  'Differential / block-level sync.',
                ]}
              />
            </Section>

            {/* ── 5. VISUAL DOCUMENTATION ───────────────────────────────────── */}
            <Section id="diagram-architecture" title="Architecture diagram">
              <Mermaid
                chart={`graph LR
  subgraph Client
    FE["React SPA"]
  end
  subgraph "Edge"
    CK["Clerk Auth"]
  end
  subgraph "Application Tier"
    API["Spring Boot API"]
  end
  subgraph "Data Tier"
    PG[("Postgres")]
    RD[("Redis")]
    S3[("Object Storage")]
  end
  FE --> CK
  FE --> API
  API --> CK
  API --> PG
  API --> RD
  API --> S3`}
              />
            </Section>

            <Section id="diagram-upload" title="Upload flow (chunked + dedup)">
              <Mermaid
                chart={`flowchart TD
  A["Select file"] --> B["SHA-256 hash in browser"]
  B --> C{"hash already in
  physical_files?"}
  C -->|yes| D["Create metadata only
  ref_count++ · no bytes sent"]
  C -->|no| E["Split into 5 MB chunks"]
  E --> F["Upload 3 in parallel
  per-chunk retry + resume"]
  F --> G["Complete → merge chunks
  into one object"]
  G --> H["Register physical_file
  + file row"]
  D --> Z(["Done"])
  H --> Z`}
              />
            </Section>

            <Section id="diagram-auth" title="Authentication sequence">
              <Mermaid
                chart={`sequenceDiagram
  participant U as User
  participant FE as Frontend
  participant CK as Clerk
  participant API as Backend
  U->>CK: Sign in (hosted UI)
  CK-->>FE: Session + JWT
  FE->>API: Request + Bearer JWT
  API->>CK: Fetch JWKS (cached)
  API->>API: Verify signature, read subject
  API->>API: findOrCreateByClerkId → UUID
  API-->>FE: Authorized response`}
              />
            </Section>

            <Section id="diagram-erd" title="Entity-relationship diagram">
              <Mermaid
                chart={`erDiagram
  users ||--o{ files : owns
  users ||--o{ folders : owns
  users ||--o{ activities : logs
  users ||--o{ shared_links : creates
  folders ||--o{ files : contains
  folders ||--o{ folders : "nests"
  files ||--o{ file_versions : "has history"
  files ||--o{ shared_links : "shared via"
  physical_files ||--o{ files : "referenced by"
  upload_sessions ||--o{ upload_chunks : "split into"
  users {
    uuid id PK
    string email
    string clerk_id
    bigint storage_used
  }
  files {
    uuid id PK
    uuid user_id FK
    uuid folder_id FK
    uuid physical_file_id FK
    string name
    bigint size
    boolean is_deleted
  }
  physical_files {
    uuid id PK
    string hash
    string storage_key
    int ref_count
  }`}
              />
            </Section>

            <Section id="diagram-workflow" title="User workflow">
              <Mermaid
                chart={`flowchart LR
  S["Sign up"] --> U["Upload files"]
  U --> O["Organize in folders"]
  O --> SH["Share links"]
  O --> V["Version history"]
  O --> SE["Search"]
  U --> D["Delete → Trash"]
  D --> R["Restore (30d)"]
  V --> RS["Restore version"]`}
              />
            </Section>

            {/* ── 6. DEVELOPER GUIDE ────────────────────────────────────────── */}
            <Section id="setup" title="Project setup">
              <P>Prerequisites: Java 21, Maven, Node 18+, and Docker (for local Postgres / Redis / MinIO).</P>
              <Code title="clone & infra">
{`git clone <repo> && cd GRAVITY-CLOUD
docker compose up -d        # postgres, redis, minio`}
              </Code>
            </Section>

            <Section id="env" title="Environment configuration">
              <P>
                All configuration is environment-driven. Locally, the app falls back to Docker
                defaults; in production, a git-ignored <span className="font-mono text-surface-200">backend/.env</span>{' '}
                (auto-loaded via spring-dotenv) supplies cloud credentials.
              </P>
              <Code title="backend/.env (excerpt)">
{`DB_URL=jdbc:postgresql://<neon-host>/neondb?user=…&password=…&sslmode=require
STORAGE_ENDPOINT=https://s3.<region>.backblazeb2.com
STORAGE_ACCESS_KEY=…  STORAGE_SECRET_KEY=…  STORAGE_BUCKET=…
REDIS_HOST=<db>.upstash.io  REDIS_PORT=6379  REDIS_PASSWORD=…  REDIS_SSL=true
CLERK_JWKS_URI=https://<domain>.clerk.accounts.dev/.well-known/jwks.json
CORS_ORIGINS=http://localhost:5173`}
              </Code>
              <P>Frontend reads <span className="font-mono text-surface-200">VITE_CLERK_PUBLISHABLE_KEY</span> and <span className="font-mono text-surface-200">VITE_API_URL</span> from <span className="font-mono text-surface-200">frontend/.env</span>.</P>
            </Section>

            <Section id="local-dev" title="Local development workflow">
              <Code title="run">
{`# Backend  (http://localhost:8080)
cd backend && mvn spring-boot:run

# Frontend (http://localhost:5173)
cd frontend && npm install && npm run dev`}
              </Code>
              <P>Flyway applies all migrations automatically on first boot. With no <span className="font-mono text-surface-200">.env</span>, everything points at the local Docker services.</P>
            </Section>

            <Section id="deployment" title="Deployment">
              <UL
                items={[
                  'Provision Neon (Postgres), Upstash (Redis), Backblaze B2 (storage), and a Clerk app.',
                  'Backend → any container host (Railway / Render / a VPS); set the env vars from .env.',
                  'Frontend → Vercel (Vite preset); set VITE_* vars; point VITE_API_URL at the deployed API.',
                  'On boot, Flyway migrates the production database; no manual schema steps.',
                ]}
              />
            </Section>

            <Section id="contributing" title="Contribution guidelines">
              <UL
                items={[
                  'Branch from main; keep changes focused and scoped to one feature package.',
                  'Match existing patterns: thin controllers, logic in services, queries scoped by userId.',
                  'Add a Flyway migration (never edit an applied one) for schema changes.',
                  'Run mvn compile and tsc --noEmit before opening a PR.',
                ]}
              />
            </Section>

            {/* ── 7. API REFERENCE ──────────────────────────────────────────── */}
            <Section id="api-overview" title="API conventions">
              <P>
                Base path <span className="font-mono text-surface-200">/api</span>. All routes except
                public share GETs require an <span className="font-mono text-surface-200">Authorization: Bearer &lt;clerk-jwt&gt;</span>{' '}
                header. Request and response bodies are JSON unless downloading file bytes.
              </P>
            </Section>

            <Section id="api-files" title="Files">
              <Endpoints
                rows={[
                  { method: 'GET', path: '/api/files', desc: 'List files in a folder (cached).' },
                  { method: 'GET', path: '/api/files/all', desc: 'List all of a user’s files.' },
                  { method: 'POST', path: '/api/files/upload', desc: 'Single-shot upload (multipart, optional hash).' },
                  { method: 'GET', path: '/api/files/{id}/download', desc: 'Stream file bytes.' },
                  { method: 'DELETE', path: '/api/files/{id}', desc: 'Soft-delete to recycle bin.' },
                  { method: 'GET', path: '/api/files/{id}/versions', desc: 'List versions.' },
                  { method: 'POST', path: '/api/files/{id}/versions/{vid}/restore', desc: 'Restore a version.' },
                ]}
              />
            </Section>

            <Section id="api-folders" title="Folders">
              <Endpoints
                rows={[
                  { method: 'GET', path: '/api/folders', desc: 'List folders under a parent (cached).' },
                  { method: 'POST', path: '/api/folders', desc: 'Create a folder.' },
                  { method: 'GET', path: '/api/folders/{id}/breadcrumb', desc: 'Path from root to folder.' },
                  { method: 'DELETE', path: '/api/folders/{id}', desc: 'Recursively delete folder + contents.' },
                ]}
              />
            </Section>

            <Section id="api-chunks" title="Chunked uploads">
              <Endpoints
                rows={[
                  { method: 'POST', path: '/api/chunks/init', desc: 'Start a session; returns {duplicate} if hash matches.' },
                  { method: 'POST', path: '/api/chunks/{id}/chunk', desc: 'Upload one chunk (idempotent).' },
                  { method: 'GET', path: '/api/chunks/{id}/status', desc: 'Which chunks are received (for resume).' },
                  { method: 'POST', path: '/api/chunks/{id}/complete', desc: 'Merge chunks into the final object.' },
                  { method: 'DELETE', path: '/api/chunks/{id}', desc: 'Cancel and clean up temp chunks.' },
                ]}
              />
            </Section>

            <Section id="api-shares" title="Sharing">
              <Endpoints
                rows={[
                  { method: 'POST', path: '/api/files/{id}/share', desc: 'Create a link (optional password / expiry).' },
                  { method: 'GET', path: '/api/files/{id}/shares', desc: 'List a file’s links.' },
                  { method: 'DELETE', path: '/api/share/{token}', desc: 'Revoke a link (auth required).' },
                  { method: 'GET', path: '/api/share/{token}', desc: 'Public: link metadata.' },
                  { method: 'GET', path: '/api/share/{token}/download', desc: 'Public: download (password as query if set).' },
                ]}
              />
            </Section>

            <Section id="api-errors" title="Error handling">
              <P>Errors return a consistent JSON shape with an appropriate HTTP status:</P>
              <Code title="error response">
{`{
  "timestamp": "2026-05-31T10:00:00",
  "message": "Storage limit exceeded",
  "status": 400
}`}
              </Code>
              <UL
                items={[
                  '400 — validation or business-rule failure (e.g. quota exceeded).',
                  '401 — missing or invalid token.',
                  '403 — password required/incorrect on a protected share link.',
                  '500 — unexpected server error (generic message; details logged).',
                ]}
              />
            </Section>
          </div>

          <div className="mt-16 pt-6 border-t border-surface-800 text-sm text-surface-600">
            CloudSync — Spring Boot · React · PostgreSQL · Redis · S3-compatible storage
          </div>
        </main>
      </div>
    </div>
  );
}
