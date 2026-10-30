'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Mail, User, Lock, Eye, EyeOff, ArrowRight, Sparkles, CheckCircle2 } from 'lucide-react';
import { api } from '@/lib/api-fetch';

export default function Login() {
  const [mode, setMode] = useState<'username' | 'email'>('username');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');

    try {
      const res = await api<{ name: string; role: string }>('/api/v1/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          identifier: identifier.trim(),
          email: identifier.trim(),
          username: identifier.trim(),
          password
        }),
      });

      if (res.role === 'mentor' || res.role === 'admin') {
        router.push('/mentor');
      } else {
        router.push('/dashboard');
      }
      router.refresh();
    } catch (e: any) {
      setError(e.message || 'Login failed. Please check your credentials.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="authShell">
      {/* LEFT BRAND PANEL */}
      <aside className="authAside">
        <div className="brand">
          <div className="brandLogo">B</div>
          <span>BRIT Institute</span>
        </div>

        <div className="authAsideContent">
          <div>
            <h1>
              Practice daily.
              <br />
              Master every skill.
            </h1>
            <p>
              Excel, SQL, Python, Power BI and more. Build confidence through structured daily
              assessments, targeted revision, and measurable progress.
            </p>
          </div>

          <div className="authFeatureList">
            <div className="authFeatureItem">
              <div className="authFeatureIcon">
                <CheckCircle2 size={15} />
              </div>
              <span>Daily timed assessments mapped to your cohort syllabus</span>
            </div>
            <div className="authFeatureItem">
              <div className="authFeatureIcon">
                <CheckCircle2 size={15} />
              </div>
              <span>Instant feedback, detailed formulas & step explanations</span>
            </div>
            <div className="authFeatureItem">
              <div className="authFeatureIcon">
                <CheckCircle2 size={15} />
              </div>
              <span>Targeted revision attempts for incorrect questions</span>
            </div>
          </div>
        </div>

        <div className="authAsideFooter">
          BRIT Learning Experience · Assessment Portal
        </div>
      </aside>

      {/* RIGHT SIGN IN FORM */}
      <main className="authMain">
        <div className="authCard">
          {/* Mobile brand shown only on narrow screens */}
          <div className="authMobileBrand">
            <div className="brandLogo">B</div>
            <span style={{ fontWeight: 800, fontSize: 18 }}>BRIT Institute</span>
          </div>

          <div className="badge">
            <Sparkles size={13} style={{ marginRight: 4 }} />
            WELCOME BACK
          </div>

          <h2>Sign in to Practice</h2>
          <p className="tagline">Use the credentials provided by BRIT Institute.</p>

          {/* TAB SELECTOR: USERNAME VS EMAIL */}
          <div className="loginTabs" role="tablist" aria-label="Sign in method">
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'username'}
              className={`loginTab ${mode === 'username' ? 'active' : ''}`}
              onClick={() => setMode('username')}
            >
              <User size={15} />
              <span>Username</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'email'}
              className={`loginTab ${mode === 'email' ? 'active' : ''}`}
              onClick={() => setMode('email')}
            >
              <Mail size={15} />
              <span>Email Address</span>
            </button>
          </div>

          <form onSubmit={submit} className="stack">
            <div className="field">
              <label htmlFor="login-identifier">
                {mode === 'username' ? 'Username' : 'Email Address'}
              </label>
              <div className="inputWrap">
                <span className="inputIcon">
                  {mode === 'username' ? <User size={16} /> : <Mail size={16} />}
                </span>
                <input
                  id="login-identifier"
                  className="input inputWithIcon"
                  type="text"
                  value={identifier}
                  onChange={(e) => {
                    const val = e.target.value;
                    setIdentifier(val);
                    if (val.includes('@') && mode !== 'email') {
                      setMode('email');
                    }
                  }}
                  required
                  placeholder={
                    mode === 'username'
                      ? 'Enter your username (e.g. test, dandikridi)'
                      : 'Enter your email (e.g. you@example.com)'
                  }
                  autoComplete={mode === 'username' ? 'username' : 'email'}
                />
              </div>
            </div>

            <div className="field">
              <label htmlFor="login-password">Password</label>
              <div className="inputWrap">
                <span className="inputIcon">
                  <Lock size={16} />
                </span>
                <input
                  id="login-password"
                  className="input inputWithIcon"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••••••"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="inputTogglePassword"
                  onClick={() => setShowPassword(!showPassword)}
                  title={showPassword ? 'Hide password' : 'Show password'}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && <div className="error">{error}</div>}

            <button type="submit" className="btn" disabled={busy}>
              <span>{busy ? 'Signing in...' : 'Sign in'}</span>
              {!busy && <ArrowRight size={16} />}
            </button>
          </form>

          <p className="note">
            Sign in using either your assigned username or email address. Mentors and learners use the same portal login.
          </p>
        </div>
      </main>
    </div>
  );
}
