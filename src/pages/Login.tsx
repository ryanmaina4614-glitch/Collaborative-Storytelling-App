import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState, login } from '../store/index.ts';
import { Mail, Lock, BookOpen, AlertCircle, ArrowRight } from 'lucide-react';

interface LoginProps {
  onNavigate: (view: string) => void;
}

export default function Login({ onNavigate }: LoginProps) {
  const dispatch = useDispatch<AppDispatch>();
  const { loading, error } = useSelector((state: RootState) => state.auth);

  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    try {
      await dispatch(login({ email, password })).unwrap();
      onNavigate('home');
    } catch (err) {
      // Handled by state
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col justify-center px-4 py-12 sm:px-6 lg:px-8 bg-gray-50/50" id="login_page_container">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* Logo Icon */}
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-950 text-white shadow-md">
          <BookOpen className="h-6 w-6" />
        </div>
        <h2 className="mt-6 text-center text-3xl font-sans font-extrabold tracking-tight text-gray-950">
          Welcome back
        </h2>
        <p className="mt-2 text-center text-sm text-gray-500">
          Or{' '}
          <button
            onClick={() => onNavigate('register')}
            className="font-medium text-gray-950 hover:underline transition"
            id="login_to_register_link"
          >
            create a free workspace accounts
          </button>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white px-4 py-8 shadow-2xl shadow-gray-100 border border-gray-100 sm:rounded-2xl sm:px-10">
          <form className="space-y-6" onSubmit={handleSubmit} id="login_form">
            {error && (
              <div className="rounded-xl bg-red-50 p-3.5 border border-red-100 flex items-start space-x-2 text-red-700 text-sm animate-shake">
                <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Email field */}
            <div>
              <label htmlFor="email" className="block text-xs font-mono font-bold uppercase tracking-widest text-gray-500">
                Email Address
              </label>
              <div className="mt-1.5 relative rounded-xl shadow-sm">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-gray-400">
                  <Mail className="h-4 w-4" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full rounded-xl border border-gray-200 bg-white pl-10 pr-4 py-3 text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-100 focus:border-gray-300 transition"
                  placeholder="name@storyteller.com"
                />
              </div>
            </div>

            {/* Password field */}
            <div>
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="block text-xs font-mono font-bold uppercase tracking-widest text-gray-500">
                  Password
                </label>
              </div>
              <div className="mt-1.5 relative rounded-xl shadow-sm">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-gray-400">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full rounded-xl border border-gray-200 bg-white pl-10 pr-4 py-3 text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-100 focus:border-gray-300 transition"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {/* Login button */}
            <div>
              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center space-x-2 rounded-xl bg-gray-950 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-gray-900 transition focus:outline-none focus:ring-2 focus:ring-indigo-500/25 disabled:bg-gray-200 disabled:text-gray-400"
                id="login_submit_btn"
              >
                <span>{loading ? 'Authenticating...' : 'Sign In'}</span>
                {!loading && <ArrowRight className="h-4 w-4" />}
              </button>
            </div>
          </form>

          <div className="mt-6 border-t border-gray-100 pt-6">
            <h4 className="text-xs font-mono text-gray-400 font-semibold uppercase tracking-wider mb-2">Sandbox Credentials</h4>
            <div className="grid grid-cols-2 gap-2">
              <div 
                onClick={() => {
                  setEmail('ryan@story.com');
                  setPassword('password123');
                }}
                className="border border-gray-100 bg-gray-50/50 hover:bg-gray-50 rounded-lg p-2 text-[11px] text-gray-600 cursor-pointer select-none transition"
              >
                <p className="font-semibold text-gray-800">Ryan (Author)</p>
                <p className="truncate">ryan@story.com</p>
                <p className="font-mono text-gray-400 mt-0.5">password123</p>
              </div>

              <div 
                onClick={() => {
                  setEmail('alice@story.com');
                  setPassword('password123');
                }}
                className="border border-gray-100 bg-gray-50/50 hover:bg-gray-50 rounded-lg p-2 text-[11px] text-gray-600 cursor-pointer select-none transition"
              >
                <p className="font-semibold text-gray-800">Alice (Collaborator)</p>
                <p className="truncate">alice@story.com</p>
                <p className="font-mono text-gray-400 mt-0.5">password123</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
