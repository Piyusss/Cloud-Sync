import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useAuth, UserButton } from '@clerk/clerk-react';
import {
  Cloud, ArrowRight, UploadCloud, History, ShieldCheck,
  Boxes, Plus, Minus, Database, Server, HardDrive, ChevronDown,
} from 'lucide-react';
import { ThemeToggle } from '../theme/ThemeToggle';

/* ─────────────────────────────────────────────────────────────────────────────
   Motion primitives — dependency-free, respect prefers-reduced-motion
   ───────────────────────────────────────────────────────────────────────────── */

const prefersReduced =
  typeof window !== 'undefined' &&
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

function useInView<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
      setInView(true);
      return;
    }
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          obs.unobserve(el);
        }
      },
      { threshold: 0.18, rootMargin: '0px 0px -8% 0px' }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return { ref, inView };
}

function Reveal({
  children,
  delay = 0,
  y = 28,
  className = '',
}: {
  children: ReactNode;
  delay?: number;
  y?: number;
  className?: string;
}) {
  const { ref, inView } = useInView<HTMLDivElement>();
  const show = inView || prefersReduced;
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: show ? 1 : 0,
        transform: show ? 'none' : `translateY(${y}px)`,
        transition: prefersReduced
          ? 'none'
          : `opacity 0.7s ease ${delay}ms, transform 0.85s cubic-bezier(0.16,1,0.3,1) ${delay}ms`,
        willChange: 'opacity, transform',
      }}
    >
      {children}
    </div>
  );
}

// Curved dotted connector that follows the alternating (zig-zag) card layout.
// `dir='rl'` sweeps top-right → bottom-left, `dir='lr'` sweeps top-left → bottom-right.
// It "draws" downward on scroll via a clip-path wipe; the arrowhead lands on the end side.
function Connector({ dir }: { dir: 'lr' | 'rl' }) {
  const { ref, inView } = useInView<HTMLDivElement>();
  const show = inView || prefersReduced;

  // Cubic bezier across a 0..100 box; preserveAspectRatio="none" stretches it
  // to the full container width, and non-scaling-stroke keeps the dots crisp.
  const path =
    dir === 'rl'
      ? 'M 76 6 C 76 48, 24 52, 24 94'
      : 'M 24 6 C 24 48, 76 52, 76 94';
  const endLeft = dir === 'rl' ? '24%' : '76%';

  return (
    <div ref={ref} aria-hidden className="relative w-full h-28 sm:h-36 my-1">
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        className="w-full h-full overflow-visible"
        style={{
          clipPath: show ? 'inset(-10% 0 0 0)' : 'inset(-10% 0 100% 0)',
          transition: prefersReduced ? 'none' : 'clip-path 0.9s cubic-bezier(0.16,1,0.3,1)',
        }}
      >
        <path
          d={path}
          fill="none"
          stroke="rgb(var(--surface-700))"
          strokeWidth={1.5}
          strokeDasharray="1 7"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <div
        className="absolute bottom-0"
        style={{
          left: endLeft,
          transform: 'translateX(-50%)',
          opacity: show ? 1 : 0,
          transition: prefersReduced ? 'none' : 'opacity 0.45s ease 0.65s',
        }}
      >
        <ChevronDown className="w-5 h-5 text-surface-600" />
      </div>
    </div>
  );
}

// Subtle parallax for the decorative hero grid
function useParallax<T extends HTMLElement>(speed = -0.18) {
  const ref = useRef<T | null>(null);
  useEffect(() => {
    if (prefersReduced) return;
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        if (ref.current) {
          ref.current.style.transform = `translate3d(0, ${window.scrollY * speed}px, 0)`;
        }
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => {
      window.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(raf);
    };
  }, [speed]);
  return ref;
}

/* ─────────────────────────────────────────────────────────────────────────────
   Monochrome building blocks
   ───────────────────────────────────────────────────────────────────────────── */

function CodeBlock({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-lg border border-surface-800 bg-surface-950 overflow-hidden">
      <div className="flex items-center gap-1.5 px-4 py-2.5 border-b border-surface-800 bg-surface-900/50">
        <span className="w-2.5 h-2.5 rounded-full bg-surface-700" />
        <span className="w-2.5 h-2.5 rounded-full bg-surface-700" />
        <span className="w-2.5 h-2.5 rounded-full bg-surface-700" />
        <span className="ml-2 text-xs text-surface-500 font-mono">{title}</span>
      </div>
      <pre className="px-4 py-4 text-xs sm:text-[13px] leading-[1.7] font-mono text-surface-300 overflow-x-auto">
        {children}
      </pre>
    </div>
  );
}

const dim = 'text-surface-600';
const hi = 'text-white';

/* ── Per-feature visuals ──────────────────────────────────────────────────── */

function ChunkVisual() {
  return (
    <div className="rounded-lg border border-surface-800 bg-surface-900/40 p-5">
      <div className="grid grid-cols-8 gap-1.5">
        {Array.from({ length: 32 }).map((_, i) => (
          <div
            key={i}
            className="aspect-square rounded-sm"
            style={{ background: i < 22 ? 'rgb(var(--surface-200))' : 'rgb(var(--surface-800))' }}
          />
        ))}
      </div>
      <div className="flex items-center justify-between mt-4 text-xs font-mono">
        <span className="text-surface-400">chunk 22 / 32</span>
        <span className="text-surface-600">resuming · 3 parallel</span>
      </div>
    </div>
  );
}

function DedupVisual() {
  return (
    <CodeBlock title="dedup.sql">
      <div><span className={dim}>--</span> <span className={dim}>before any upload</span></div>
      <div><span className={hi}>SELECT</span> id, ref_count</div>
      <div><span className={hi}>FROM</span> physical_files</div>
      <div><span className={hi}>WHERE</span> hash = <span className="text-surface-200">'a1b2c3…'</span>;</div>
      <div className="h-3" />
      <div><span className={dim}>-- hit → skip transfer, ref_count++</span></div>
      <div className="text-surface-200">ref_count: 1 → 2</div>
    </CodeBlock>
  );
}

function VersionVisual() {
  const versions = [
    { v: 'v3', label: 'current', size: '2.4 MB', when: 'just now' },
    { v: 'v2', label: '', size: '2.1 MB', when: '3 days ago' },
    { v: 'v1', label: '', size: '1.8 MB', when: 'last week' },
  ];
  return (
    <div className="rounded-lg border border-surface-800 bg-surface-900/40 p-5 space-y-2.5">
      {versions.map((r, i) => (
        <div
          key={r.v}
          className="flex items-center gap-3 px-3 py-2.5 rounded-md border border-surface-800 bg-surface-950"
        >
          <span
            className="w-1.5 h-1.5 rounded-full"
            style={{ background: i === 0 ? 'rgb(var(--c-white))' : 'rgb(var(--surface-600))' }}
          />
          <span className="font-mono text-sm text-surface-200 w-8">{r.v}</span>
          {r.label && (
            <span className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded border border-surface-700 text-surface-300">
              {r.label}
            </span>
          )}
          <span className="ml-auto text-xs text-surface-500 font-mono">{r.size}</span>
          <span className="text-xs text-surface-600 hidden sm:block w-20 text-right">{r.when}</span>
        </div>
      ))}
    </div>
  );
}

function SecurityVisual() {
  return (
    <CodeBlock title="SecurityConfig.java">
      <div><span className={dim}>// every request verified against Clerk JWKS</span></div>
      <div>http.<span className="text-surface-200">oauth2ResourceServer</span>(o {'->'} o</div>
      <div>{'  '}.<span className="text-surface-200">jwt</span>(jwt {'->'} jwt</div>
      <div>{'    '}.jwtAuthenticationConverter(<span className={hi}>clerk</span>)));</div>
      <div className="h-3" />
      <div><span className={dim}>// per-user isolation at the query layer</span></div>
      <div><span className="text-surface-200">findByIdAndUserId</span>(fileId, userId)</div>
    </CodeBlock>
  );
}

function RedisVisual() {
  return (
    <div className="space-y-3">
      {/* redis-cli terminal — the app's real cache keys */}
      <CodeBlock title="redis-cli · Upstash">
        <div><span className={dim}>$</span> GET cloudsync:files::u42:root</div>
        <div className="text-white">  ↳ HIT · 8 ms</div>
        <div className="h-2.5" />
        <div><span className={dim}>$</span> KEYS cloudsync:*</div>
        <div className="text-surface-400">  1) cloudsync:user-dto::u42</div>
        <div className="text-surface-400">  2) cloudsync:files::u42:root</div>
        <div className="text-surface-400">  3) cloudsync:folders::u42:root</div>
        <div className="h-2.5" />
        <div><span className={dim}># on upload / delete / move</span></div>
        <div><span className="text-white">@CacheEvict</span> <span className={dim}>→ keys invalidated</span></div>
      </CodeBlock>

      {/* Redis HIT vs DB MISS */}
      <div className="rounded-lg border border-surface-800 bg-surface-900/40 p-4 space-y-3">
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono text-surface-200 w-20 shrink-0">Redis HIT</span>
          <div className="flex-1 h-1.5 rounded-full bg-surface-800 overflow-hidden">
            <div className="h-full rounded-full bg-white" style={{ width: '8%' }} />
          </div>
          <span className="text-xs font-mono text-surface-300 w-12 text-right">8 ms</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono text-surface-500 w-20 shrink-0">DB miss</span>
          <div className="flex-1 h-1.5 rounded-full bg-surface-800 overflow-hidden">
            <div className="h-full rounded-full" style={{ width: '92%', background: 'rgb(var(--surface-600))' }} />
          </div>
          <span className="text-xs font-mono text-surface-500 w-12 text-right">180 ms</span>
        </div>
      </div>
    </div>
  );
}

function ArchVisual() {
  const Box = ({ icon: Icon, label }: { icon: typeof Database; label: string }) => (
    <div className="flex items-center gap-2 px-3 py-2 rounded-md border border-surface-800 bg-surface-950">
      <Icon className="w-4 h-4 text-surface-400 shrink-0" />
      <span className="text-xs text-surface-300 font-mono">{label}</span>
    </div>
  );
  return (
    <div className="rounded-lg border border-surface-800 bg-surface-900/40 p-5">
      <div className="flex flex-col items-center gap-3">
        <div className="px-3 py-2 rounded-md border border-surface-700 bg-surface-900 text-xs font-mono text-surface-200">
          React 19 · TypeScript
        </div>
        <div className="w-px h-4 bg-surface-700" />
        <div className="px-3 py-2 rounded-md border border-surface-600 bg-surface-900 text-xs font-mono text-white">
          Spring Boot API · Java 21
        </div>
        <div className="w-px h-4 bg-surface-700" />
        <div className="grid grid-cols-3 gap-2 w-full">
          <Box icon={Database} label="Neon" />
          <Box icon={Server} label="Upstash" />
          <Box icon={HardDrive} label="B2" />
        </div>
        <p className="text-xs text-surface-600 pt-1">Swap any provider via env vars, no code changes.</p>
      </div>
    </div>
  );
}

/* ── Content ──────────────────────────────────────────────────────────────── */

const highlights: {
  icon: typeof UploadCloud;
  kicker: string;
  title: ReactNode;
  shortDesc: string;
  desc: string;
  visual: ReactNode;
}[] = [
  {
    icon: UploadCloud,
    kicker: 'Transfers',
    title: 'Resumable chunked uploads',
    shortDesc: '5 MB chunks, 3 in parallel. Drops mid-upload? Resumes from the last completed chunk.',
    desc: 'Files are split into 5 MB chunks and uploaded three at a time, each with its own retry and exponential backoff. Lose your connection at 99%? The transfer resumes from the last completed chunk - never from zero.',
    visual: <ChunkVisual />,
  },
  {
    icon: Boxes,
    kicker: 'Storage',
    title: 'Content-addressed deduplication',
    shortDesc: 'SHA-256 hashed before upload. Identical content stored once, shared by reference.',
    desc: 'Every file is hashed with SHA-256 before it leaves the browser. If that exact content already exists, the upload is skipped entirely and the object is shared via a reference count - a thousand identical files cost one.',
    visual: <DedupVisual />,
  },
  {
    icon: History,
    kicker: 'History',
    title: 'Versioning built in',
    shortDesc: 'Overwriting creates a version. Restore any previous state in one click.',
    desc: 'Overwriting a file never destroys the old one - it becomes a version. Restore any previous state with a click, while storage accounting tracks only the delta between versions.',
    visual: <VersionVisual />,
  },
  {
    icon: ShieldCheck,
    kicker: 'Security',
    title: 'Authenticated by default',
    shortDesc: 'Clerk JWTs verified on every request. Data isolated per user, share links support passwords.',
    desc: 'Sessions are issued by Clerk; the backend acts as an OAuth2 resource server, verifying every request against Clerk\'s rotating public keys. Data is isolated per user at the query layer, and share links support passwords and expiry.',
    visual: <SecurityVisual />,
  },
  {
    icon: Database,
    kicker: 'Redis · Upstash',
    title: <><span style={{ color: '#DC382C' }}>Redis</span> cached for instant reads</>,
    shortDesc: 'File lists and folders served from Redis. Single-digit ms reads, explicit invalidation on every write.',
    desc: 'Every hot path - file lists, folders, user metadata - is served from Redis. The backend uses a cache-aside pattern with explicit @CacheEvict invalidation on every upload, delete, and move, so reads land in single-digit milliseconds and never go stale. Search runs on Postgres full-text indexes.',
    visual: <RedisVisual />,
  },
  {
    icon: Boxes,
    kicker: 'Architecture',
    title: 'Cloud-native & pluggable',
    shortDesc: 'Spring Boot + Postgres + B2 + Redis. Swap any provider via env vars.',
    desc: 'Stateless Spring Boot services backed by Neon Postgres, Backblaze B2 object storage, and Upstash Redis. Every dependency is S3 or standards-compatible, so providers swap with an environment variable.',
    visual: <ArchVisual />,
  },
];

const metrics = [
  { value: '5 MB', label: 'upload chunk size' },
  { value: '2 GB', label: 'max file size' },
  { value: 'SHA-256', label: 'dedup hashing' },
  { value: '30 days', label: 'recycle-bin retention' },
];

const faqs: { q: string; qShort?: string; a: string }[] = [
  {
    q: 'What can I do with CloudSync?',
    a: 'Upload and organize files into folders, share them with public, password-protected, or expiring links, keep a full version history of every file, search across everything, and recover deleted files from a 30-day recycle bin.',
  },
  {
    q: 'How is my data secured?',
    qShort: 'How is data secured?',
    a: 'Authentication is handled by Clerk, and the API verifies every request against Clerk\'s public keys as an OAuth2 resource server. Your files are isolated per account at the database layer, transfers run over TLS, and share links can require a password or expire automatically.',
  },
  {
    q: 'How does it stay fast with large files?',
    qShort: 'How does it stay fast?',
    a: 'Large files upload in parallel 5 MB chunks with automatic retry and resume. Frequently accessed data is cached in Redis with explicit invalidation, and search uses Postgres full-text indexes, so reads stay quick without serving stale results.',
  },
  {
    q: 'Does it really store duplicate files only once?',
    qShort: 'Are duplicate files stored once?',
    a: 'Yes. Each upload is hashed with SHA-256; if identical content already exists, the upload is skipped and the existing object is referenced with a reference count. Deleting one copy never removes content another file still needs.',
  },
  {
    q: 'What does it cost?',
    a: 'New accounts start with 5 GB of free storage. The project runs entirely on free-tier cloud infrastructure (Neon, Backblaze B2, Upstash), making it ideal to self-host or evaluate at no cost.',
  },
  {
    q: 'Can I integrate with it or self-host?',
    qShort: 'Can I self-host it?',
    a: 'Object storage is S3-compatible and the backend exposes a clean REST API, so you can point it at AWS S3, Cloudflare R2, MinIO, or Backblaze B2 by changing environment variables with no code changes required.',
  },
];

function FaqItem({ q, a, qShort }: { q: string; a: string; qShort?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-surface-800">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="w-full flex items-center justify-between gap-4 py-5 text-left group"
      >
        <span className="text-sm sm:text-base font-medium text-surface-100 group-hover:text-white transition-colors">
          {qShort ? (
            <>
              <span className="sm:hidden">{qShort}</span>
              <span className="hidden sm:inline">{q}</span>
            </>
          ) : q}
        </span>
        <span className="shrink-0 w-6 h-6 rounded-full border border-surface-700 flex items-center justify-center text-surface-400 group-hover:text-white group-hover:border-surface-500 transition-colors">
          {open ? <Minus className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
        </span>
      </button>
      <div
        className="grid transition-all duration-300 ease-out"
        style={{ gridTemplateRows: open ? '1fr' : '0fr' }}
      >
        <div className="overflow-hidden">
          <p className="text-sm text-surface-400 leading-relaxed pb-5 pr-10">{a}</p>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   Page
   ───────────────────────────────────────────────────────────────────────────── */

export function LandingPage() {
  // No redirect — logged-in users can browse the landing page freely.
  const { isSignedIn, isLoaded } = useAuth();
  const gridRef = useParallax<HTMLDivElement>(-0.18);

  return (
    <div className="min-h-screen bg-surface-950 text-surface-100">

      {/* ── Nav ──────────────────────────────────────────────────────────── */}
      <nav className="border-b border-surface-800 sticky top-0 bg-surface-950/85 backdrop-blur-md z-30">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-white rounded flex items-center justify-center">
              <Cloud className="w-4 h-4 text-surface-950" />
            </div>
            <span className="font-semibold text-white">CloudSync</span>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-3">
            <ThemeToggle className="!p-1.5" />
            <Link
              to="/docs"
              className="hidden sm:inline-flex text-sm text-surface-400 hover:text-white transition-colors px-3 py-1.5"
            >
              Docs
            </Link>
            {!isLoaded ? null : isSignedIn ? (
              <>
                <Link to="/files" className="btn-primary text-sm px-3 sm:px-4 py-1.5 flex items-center gap-1.5">
                  <span className="hidden xs:inline">Open app</span>
                  <span className="xs:hidden">App</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
                <UserButton appearance={{ elements: { avatarBox: 'w-7 h-7' } }} />
              </>
            ) : (
              <>
                <Link to="/sign-in" className="hidden sm:inline-flex text-sm text-surface-400 hover:text-white transition-colors px-3 py-1.5">
                  Sign in
                </Link>
                <Link to="/sign-up" className="btn-primary text-sm px-3 sm:px-4 py-1.5">
                  Get started
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        <div
          ref={gridRef}
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.18]"
          style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, rgb(var(--surface-600)) 1px, transparent 0)',
            backgroundSize: '34px 34px',
            maskImage: 'radial-gradient(ellipse 70% 60% at 50% 30%, #000 40%, transparent 100%)',
            WebkitMaskImage: 'radial-gradient(ellipse 70% 60% at 50% 30%, #000 40%, transparent 100%)',
          }}
        />
        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 pt-16 sm:pt-24 pb-16 sm:pb-20 text-center">
          <Reveal>
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-bold text-white leading-[1.05] tracking-tight mb-5">
              Your <span style={{ color: '#66ff00' }}>files</span>.<br />
              <span className="text-surface-400">Stored right.</span>
            </h1>
          </Reveal>
          <Reveal delay={80}>
            <p className="text-surface-400 text-xs sm:text-[13px] max-w-xs sm:max-w-none sm:w-fit mx-auto mb-2 leading-relaxed sm:whitespace-nowrap">
              <span className="sm:hidden">Uploads, versioning, dedup, and sharing - done right.</span>
              <span className="hidden sm:inline">A cloud storage platform built like a real product: chunked resumable uploads, content-addressed deduplication, versioning, and secure sharing.</span>
            </p>
          </Reveal>
          <Reveal delay={160}>
            <div className="inline-flex items-center px-3 py-1 border border-surface-800 bg-surface-900/60 text-surface-400 text-xs font-medium mb-9 text-center max-w-xs sm:max-w-none">
              <span className="sm:hidden">Educational project</span>
              <span className="hidden sm:inline">Note: This Project is made for educational purposes by Piyush Raj</span>
            </div>
          </Reveal>
          <Reveal delay={240}>
            <div className="flex flex-wrap items-center justify-center gap-3">
              {!isLoaded ? null : isSignedIn ? (
                <Link to="/files" className="btn-primary flex items-center gap-2 px-5 py-2.5">
                  Go to your files <ArrowRight className="w-4 h-4" />
                </Link>
              ) : (
                <>
                  <Link to="/sign-up" className="btn-primary flex items-center gap-2 px-5 py-2.5">
                    Start for free <ArrowRight className="w-4 h-4" />
                  </Link>
                  <Link
                    to="/sign-in"
                    className="px-5 py-2.5 rounded-md border border-surface-700 text-surface-300 hover:text-white hover:border-surface-500 transition-colors text-sm font-medium"
                  >
                    Sign in
                  </Link>
                </>
              )}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── Engineering highlights (scroll-reveal) ───────────────────────── */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 pt-8 pb-10 sm:pt-12 sm:pb-16">
        <Reveal>
          <p className="text-center text-xs font-light uppercase tracking-[0.3em] text-surface-500 mb-12 sm:mb-16">
            Features
          </p>
        </Reveal>
        <div>
          {highlights.map((h, i) => {
            const flip = i % 2 === 1;
            return (
              <div key={h.kicker}>
                <div className="grid lg:grid-cols-2 gap-8 lg:gap-16 items-center">
                  <Reveal className={flip ? 'lg:order-2' : ''}>
                    <div>
                      <div className="inline-flex items-center gap-2 mb-4">
                        <span className="w-8 h-8 rounded-md border border-surface-800 bg-surface-900 flex items-center justify-center">
                          <h.icon className="w-4 h-4 text-surface-300" />
                        </span>
                        <span className="text-xs font-medium text-surface-500 uppercase tracking-[0.18em]">
                          {h.kicker}
                        </span>
                      </div>
                      <h3 className="text-xl sm:text-2xl font-semibold text-white mb-3 tracking-tight">
                        {h.title}
                      </h3>
                      <p className="text-surface-400 leading-relaxed max-w-md">
                        <span className="sm:hidden">{h.shortDesc}</span>
                        <span className="hidden sm:inline">{h.desc}</span>
                      </p>
                    </div>
                  </Reveal>
                  <Reveal delay={140} y={36} className={flip ? 'lg:order-1' : ''}>
                    {h.visual}
                  </Reveal>
                </div>
                {i < highlights.length - 1 && (
                  <Connector dir={i % 2 === 0 ? 'rl' : 'lr'} />
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Product preview ──────────────────────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
        <Reveal>
          <div className="text-center mb-12">
            <p className="text-xs font-medium text-surface-500 uppercase tracking-[0.2em] mb-3">
              The interface
            </p>
            <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Clean, fast, out of your way
            </h2>
          </div>
        </Reveal>
        <Reveal delay={120} y={40}>
          <div className="rounded-xl border border-surface-800 bg-surface-900 overflow-hidden shadow-2xl shadow-black/50">
            {/* window chrome */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-surface-800 bg-surface-950">
              <span className="w-2.5 h-2.5 rounded-full bg-surface-700" />
              <span className="w-2.5 h-2.5 rounded-full bg-surface-700" />
              <span className="w-2.5 h-2.5 rounded-full bg-surface-700" />
              <div className="ml-3 px-3 py-1 rounded bg-surface-900 border border-surface-800 text-[11px] font-mono text-surface-500">
                cloudsync.app/files
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-[200px_1fr]">
              {/* mock sidebar */}
              <div className="border-r border-surface-800 p-3 space-y-1 hidden sm:block">
                {['My Files', 'Search', 'Shared', 'Trash', 'Analytics'].map((item, i) => (
                  <div
                    key={item}
                    className={`flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs ${
                      i === 0 ? 'bg-surface-800 text-white' : 'text-surface-500'
                    }`}
                  >
                    <span className="w-3 h-3 rounded-sm bg-surface-700" />
                    {item}
                  </div>
                ))}
              </div>
              {/* mock file list */}
              <div className="p-4 sm:p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="h-4 w-24 rounded bg-surface-800" />
                  <div className="h-7 w-20 rounded-md bg-white/90" />
                </div>
                {[
                  ['Documents', '12 files'],
                  ['Photos', '48 files'],
                  ['project-spec.pdf', '2.4 MB'],
                  ['backup.zip', '1.1 GB'],
                  ['notes.md', '4 KB'],
                ].map(([name, meta], i) => (
                  <div
                    key={name}
                    className={`flex items-center gap-3 py-2.5 ${
                      i < 4 ? 'border-b border-surface-800/70' : ''
                    }`}
                  >
                    <span className="w-4 h-4 rounded-sm bg-surface-700 shrink-0" />
                    <span className="text-xs text-surface-300">{name}</span>
                    <span className="ml-auto text-xs text-surface-600 font-mono">{meta}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ── Metrics / specs band ─────────────────────────────────────────── */}
      <section className="border-y border-surface-800 bg-surface-900/30">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {metrics.map((m, i) => (
              <Reveal key={m.label} delay={i * 80}>
                <div className="text-center">
                  <p className="text-2xl sm:text-3xl font-bold text-white tracking-tight font-mono">
                    {m.value}
                  </p>
                  <p className="text-xs text-surface-500 mt-1.5">{m.label}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────────────────────── */}
      <section className="max-w-3xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
        <Reveal>
          <div className="text-center mb-10">
            <p className="text-xs font-medium text-surface-500 uppercase tracking-[0.2em] mb-3">
              Questions
            </p>
            <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              You Might Ask
            </h2>
          </div>
        </Reveal>
        <Reveal delay={100}>
          <div className="border-t border-surface-800">
            {faqs.map((f) => (
              <FaqItem key={f.q} q={f.q} qShort={f.qShort} a={f.a} />
            ))}
          </div>
        </Reveal>
      </section>

    </div>
  );
}
