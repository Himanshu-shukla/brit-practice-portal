'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Search, Moon, Sun, ArrowLeft, LogOut, ShieldCheck, User as UserIcon } from 'lucide-react';
import { api, post } from '@/lib/api-fetch';

export type User = { id: string; name: string; email: string; role: string; batchId: string };

export default function Portal({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    api<{ user: User }>('/api/v1/auth/me')
      .then((r) => {
        setUser(r.user);
        if (pathname.startsWith('/mentor') && r.user.role === 'learner') {
          router.replace('/dashboard');
        }
      })
      .catch(() => router.replace('/login'))
      .finally(() => setLoaded(true));
  }, [router, pathname]);

  // Dark mode effect
  useEffect(() => {
    const isDark = localStorage.getItem('brit-theme') === 'dark';
    setDarkMode(isDark);
    if (isDark) {
      document.body.classList.add('dark-mode');
      document.documentElement.setAttribute('data-theme', 'dark');
    }
  }, []);

  function toggleDarkMode() {
    const next = !darkMode;
    setDarkMode(next);
    if (next) {
      document.body.classList.add('dark-mode');
      document.documentElement.setAttribute('data-theme', 'dark');
      localStorage.setItem('brit-theme', 'dark');
    } else {
      document.body.classList.remove('dark-mode');
      document.documentElement.removeAttribute('data-theme');
      localStorage.setItem('brit-theme', 'light');
    }
  }

  function getInitials(name: string) {
    if (!name) return 'DL';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return parts[0].slice(0, 2).toUpperCase();
  }

  if (!loaded || !user) {
    return <div className="loading">Loading your learning space...</div>;
  }

  const isTest = pathname.startsWith('/test/');
  const isMentor = pathname.startsWith('/mentor');

  return (
    <div className="portalShell">
      <header className="portalHeader">
        <div className="portalHeaderInner">
          {/* BRAND AND BATCH BADGE */}
          <div className="brandGroup">
            {isTest && (
              <Link href="/dashboard" className="backBtn" title="Back to Dashboard">
                <ArrowLeft size={14} /> <span>Dashboard</span>
              </Link>
            )}

            {isMentor && (
              <Link href="/dashboard" className="backBtn" title="Back to Learner Portal">
                <ArrowLeft size={14} /> <span>Learner View</span>
              </Link>
            )}

            <Link href="/dashboard" className="brand">
              <div className="brandLogo">B</div>
              <span>BRIT Practice</span>
            </Link>

            <span className="batchBadge">
              {user.role === 'mentor' || user.role === 'admin'
                ? (isMentor ? 'Mentor Studio' : 'Instructor')
                : (user.batchId ? (user.batchId.startsWith('batch-') ? `Batch ${user.batchId.replace('batch-', '')}` : user.batchId) : 'Batch 1')}
            </span>
          </div>

          {/* RIGHT ACTIONS: SEARCH, DARK MODE, USER AVATAR */}
          <div className="portalHeaderActions">
            {user.role !== 'learner' && !isMentor && (
              <Link href="/mentor" className="btn btnSecondary btnSmall" style={{ padding: '4px 10px', fontSize: 12, gap: 5 }}>
                <ShieldCheck size={14} /> <span>Mentor Studio</span>
              </Link>
            )}
            <button
              className="headerIconBtn"
              onClick={() => window.dispatchEvent(new CustomEvent('toggle-quick-search'))}
              title="Search Questions"
              aria-label="Search Questions"
            >
              <Search size={16} />
            </button>

            <button
              className="headerIconBtn"
              onClick={toggleDarkMode}
              title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              aria-label="Toggle Dark Mode"
            >
              {darkMode ? <Sun size={16} /> : <Moon size={16} />}
            </button>

            {/* USER INITIALS AVATAR CIRCLE */}
            <div style={{ position: 'relative' }}>
              <button
                className="userAvatarBtn"
                onClick={() => setDropdownOpen((prev) => !prev)}
                title={`${user.name} (${user.email})`}
                aria-label="User Account"
              >
                {getInitials(user.name)}
              </button>

              {/* USER POPUP DROPDOWN */}
              {dropdownOpen && (
                <>
                  <div
                    style={{ position: 'fixed', inset: 0, zIndex: 59 }}
                    onClick={() => setDropdownOpen(false)}
                  />
                  <div className="userDropdownMenu">
                    <div className="userDropdownProfile">
                      <div style={{ fontWeight: 750, fontSize: 14 }}>{user.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{user.email}</div>
                      <div style={{ fontSize: 11, color: 'var(--brand)', marginTop: 2, fontWeight: 600 }}>
                        {user.role} · {user.batchId}
                      </div>
                    </div>

                    {user.role !== 'learner' && !isMentor && (
                      <Link
                        href="/mentor"
                        className="userDropdownItem"
                        onClick={() => setDropdownOpen(false)}
                      >
                        <ShieldCheck size={15} /> <span>Mentor Studio</span>
                      </Link>
                    )}

                    <button
                      className="userDropdownItem danger"
                      onClick={async () => {
                        await post('/api/v1/auth/logout', {}).catch(() => {});
                        router.replace('/login');
                        router.refresh();
                      }}
                    >
                      <LogOut size={15} /> <span>Sign out</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="portalMain">{children}</main>
    </div>
  );
}
