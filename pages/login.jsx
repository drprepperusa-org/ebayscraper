import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { createClient } from '@supabase/supabase-js';
import Head from 'next/head';
import { Eye, EyeOff, Loader2, Search, UserPlus, LogIn } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [sb, setSb] = useState(null);
  const [tab, setTab] = useState('signin');
  const [alert, setAlert] = useState(null);
  const [loading, setLoading] = useState(false);

  const [siEmail, setSiEmail] = useState('');
  const [siPassword, setSiPassword] = useState('');
  const [siShowPw, setSiShowPw] = useState(false);

  const [suName, setSuName] = useState('');
  const [suEmail, setSuEmail] = useState('');
  const [suPassword, setSuPassword] = useState('');
  const [suConfirm, setSuConfirm] = useState('');
  const [suShowPw, setSuShowPw] = useState(false);
  const [suShowConfirm, setSuShowConfirm] = useState(false);
  const [pwScore, setPwScore] = useState(0);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/config');
        const cfg = await res.json();
        if (!cfg.supabaseUrl || !cfg.supabaseAnonKey) return;
        const client = createClient(cfg.supabaseUrl, cfg.supabaseAnonKey);
        setSb(client);
        const { data: { session } } = await client.auth.getSession();
        if (session) router.replace('/');
      } catch (e) {
        setAlert({ type: 'error', msg: 'Failed to initialize: ' + e.message });
      }
    })();
  }, [router]);

  function checkStrength(pw) {
    let s = 0;
    if (pw.length >= 8) s++;
    if (pw.length >= 12) s++;
    if (/[A-Z]/.test(pw)) s++;
    if (/[0-9]/.test(pw)) s++;
    if (/[^A-Za-z0-9]/.test(pw)) s++;
    setPwScore(s);
  }

  const levels = [
    { w: '20%', color: 'bg-red-500', text: 'text-red-400', label: 'Very weak' },
    { w: '40%', color: 'bg-orange-500', text: 'text-orange-400', label: 'Weak' },
    { w: '60%', color: 'bg-yellow-500', text: 'text-yellow-400', label: 'Fair' },
    { w: '80%', color: 'bg-blue-400', text: 'text-blue-400', label: 'Strong' },
    { w: '100%', color: 'bg-emerald-500', text: 'text-emerald-400', label: 'Very strong' },
  ];
  const level = levels[Math.min(pwScore, 4)];

  async function handleSignIn(e) {
    e.preventDefault();
    if (!sb) return setAlert({ type: 'error', msg: 'Supabase not initialized' });
    setLoading(true); setAlert(null);
    try {
      const { data, error } = await sb.auth.signInWithPassword({ email: siEmail, password: siPassword });
      if (error) { setAlert({ type: 'error', msg: error.message }); setLoading(false); return; }
      if (data?.session) router.push('/');
      else { setAlert({ type: 'error', msg: 'No session returned' }); setLoading(false); }
    } catch (err) { setAlert({ type: 'error', msg: err.message }); setLoading(false); }
  }

  async function handleSignUp(e) {
    e.preventDefault();
    if (!sb) return setAlert({ type: 'error', msg: 'Supabase not initialized' });
    if (suPassword !== suConfirm) return setAlert({ type: 'error', msg: 'Passwords do not match' });
    if (suPassword.length < 8) return setAlert({ type: 'error', msg: 'Min 8 characters' });
    setLoading(true); setAlert(null);
    try {
      const { error } = await sb.auth.signUp({
        email: suEmail, password: suPassword,
        options: { data: { display_name: suName } }
      });
      if (error) { setAlert({ type: 'error', msg: error.message }); setLoading(false); return; }
      setAlert({ type: 'success', msg: 'Account created! Check your email to confirm, then sign in.' });
      setLoading(false);
      setTimeout(() => setTab('signin'), 2000);
    } catch (err) { setAlert({ type: 'error', msg: err.message }); setLoading(false); }
  }

  return (
    <>
      <Head><title>Login — eBay DDR4 RAM Scraper</title></Head>
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          {/* Brand */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-3 mb-3">
              <Search className="w-8 h-8 text-violet-500" />
              <h1 className="text-2xl font-bold text-white">DDR4 Deal Scraper</h1>
            </div>
            <p className="text-sm text-gray-500">Sign in to access the deal dashboard</p>
          </div>

          {/* Card */}
          <div className="bg-dark-surface border border-dark-border rounded-xl p-8">
            {/* Tabs */}
            <div className="flex border-b border-dark-border mb-6">
              <button
                onClick={() => { setTab('signin'); setAlert(null); }}
                className={`flex-1 pb-3 text-sm font-semibold border-b-2 transition-colors flex items-center justify-center gap-2 ${tab === 'signin' ? 'text-violet-400 border-violet-500' : 'text-gray-500 border-transparent hover:text-gray-300'}`}
              >
                <LogIn className="w-4 h-4" /> Sign In
              </button>
              <button
                onClick={() => { setTab('signup'); setAlert(null); }}
                className={`flex-1 pb-3 text-sm font-semibold border-b-2 transition-colors flex items-center justify-center gap-2 ${tab === 'signup' ? 'text-violet-400 border-violet-500' : 'text-gray-500 border-transparent hover:text-gray-300'}`}
              >
                <UserPlus className="w-4 h-4" /> Create Account
              </button>
            </div>

            {/* Alert */}
            {alert && (
              <div className={`p-3 rounded-lg text-sm mb-4 border ${alert.type === 'error' ? 'bg-red-500/10 text-red-400 border-red-500/25' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25'}`}>
                {alert.msg}
              </div>
            )}

            {/* Sign In */}
            {tab === 'signin' && (
              <form onSubmit={handleSignIn} className="space-y-5">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Email Address</label>
                  <input type="email" value={siEmail} onChange={e => setSiEmail(e.target.value)} placeholder="you@example.com" required
                    className="w-full px-4 py-2.5 bg-dark-bg border border-dark-border rounded-lg text-gray-200 text-sm outline-none focus:border-violet-500 transition-colors placeholder:text-gray-600" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Password</label>
                  <div className="relative">
                    <input type={siShowPw ? 'text' : 'password'} value={siPassword} onChange={e => setSiPassword(e.target.value)} placeholder="Enter your password" required
                      className="w-full px-4 py-2.5 pr-12 bg-dark-bg border border-dark-border rounded-lg text-gray-200 text-sm outline-none focus:border-violet-500 transition-colors placeholder:text-gray-600" />
                    <button type="button" onClick={() => setSiShowPw(!siShowPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
                      {siShowPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <button type="submit" disabled={loading}
                  className="w-full py-3 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2">
                  {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Please wait...</> : <><LogIn className="w-4 h-4" /> Sign In</>}
                </button>
              </form>
            )}

            {/* Sign Up */}
            {tab === 'signup' && (
              <form onSubmit={handleSignUp} className="space-y-5">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Display Name</label>
                  <input type="text" value={suName} onChange={e => setSuName(e.target.value)} placeholder="Your name" required
                    className="w-full px-4 py-2.5 bg-dark-bg border border-dark-border rounded-lg text-gray-200 text-sm outline-none focus:border-violet-500 transition-colors placeholder:text-gray-600" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Email Address</label>
                  <input type="email" value={suEmail} onChange={e => setSuEmail(e.target.value)} placeholder="you@example.com" required
                    className="w-full px-4 py-2.5 bg-dark-bg border border-dark-border rounded-lg text-gray-200 text-sm outline-none focus:border-violet-500 transition-colors placeholder:text-gray-600" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Password</label>
                  <div className="relative">
                    <input type={suShowPw ? 'text' : 'password'} value={suPassword} onChange={e => { setSuPassword(e.target.value); checkStrength(e.target.value); }} placeholder="Min 8 characters" required minLength={8}
                      className="w-full px-4 py-2.5 pr-12 bg-dark-bg border border-dark-border rounded-lg text-gray-200 text-sm outline-none focus:border-violet-500 transition-colors placeholder:text-gray-600" />
                    <button type="button" onClick={() => setSuShowPw(!suShowPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
                      {suShowPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {suPassword.length > 0 && (
                    <div className="mt-2">
                      <div className="h-1 bg-dark-surface2 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all ${level.color}`} style={{ width: level.w }} />
                      </div>
                      <p className={`text-xs mt-1 ${level.text}`}>{level.label}</p>
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Confirm Password</label>
                  <div className="relative">
                    <input type={suShowConfirm ? 'text' : 'password'} value={suConfirm} onChange={e => setSuConfirm(e.target.value)} placeholder="Re-enter password" required
                      className="w-full px-4 py-2.5 pr-12 bg-dark-bg border border-dark-border rounded-lg text-gray-200 text-sm outline-none focus:border-violet-500 transition-colors placeholder:text-gray-600" />
                    <button type="button" onClick={() => setSuShowConfirm(!suShowConfirm)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
                      {suShowConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <button type="submit" disabled={loading}
                  className="w-full py-3 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2">
                  {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Please wait...</> : <><UserPlus className="w-4 h-4" /> Create Account</>}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
