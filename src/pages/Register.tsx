import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState, register } from '../store/index.ts';
import { User, Mail, Lock, BookOpen, AlertCircle, ArrowRight } from 'lucide-react';

interface RegisterProps {
  onNavigate: (view: string) => void;
}

export default function Register({ onNavigate }: RegisterProps) {
  const dispatch = useDispatch<AppDispatch>();
  const { loading, error } = useSelector((state: RootState) => state.auth);

  const [username, setUsername] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [localError, setLocalError] = React.useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    if (!username.trim() || !email.trim() || !password || !confirmPassword) {
      setLocalError('All fields are required');
      return;
    }

    if (password !== confirmPassword) {
      setLocalError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setLocalError('Password must be at least 6 characters long');
      return;
    }

    try {
      await dispatch(register({ username, email, password })).unwrap();
      onNavigate('home');
    } catch (err) {
      // Handled by state error
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col justify-center px-4 py-12 sm:px-6 lg:px-8 bg-gray-50/50" id="register_page_container">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-950 text-white shadow-md">
          <BookOpen className="h-6 w-6" />
        </div>
        <h2 className="mt-6 text-center text-3xl font-sans font-extrabold tracking-tight text-gray-950">
          Create workspace account
        </h2>
        <p className="mt-2 text-center text-sm text-gray-500">
          Or{' '}
          <button
            onClick={() => onNavigate('login')}
            className="font-medium text-gray-950 hover:underline transition"
            id="register_to_login_link"
          >
            log into existing profile
          </button>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white px-4 py-8 shadow-2xl shadow-gray-100 border border-gray-100 sm:rounded-2xl sm:px-10">
          <form className="space-y-5" onSubmit={handleSubmit} id="register_form">
            {(localError || error) && (
              <div className="rounded-xl bg-red-50 p-3.5 border border-red-100 flex items-start space-x-2 text-red-700 text-sm">
                <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
                <span>{localError || error}</span>
              </div>
            )}

            {/* Username field */}
            <div>
              <label htmlFor="username" className="block text-xs font-mono font-bold uppercase tracking-widest text-gray-500">
                Pick a Pseudonym / Username
              </label>
              <div className="mt-1.5 relative rounded-xl shadow-sm">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-gray-400">
                  <User className="h-4 w-4" />
                </div>
                <input
                  id="username"
                  name="username"
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="block w-full rounded-xl border border-gray-200 bg-white pl-10 pr-4 py-3 text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-100 focus:border-gray-300 transition"
                  placeholder="bard_bob"
                />
              </div>
            </div>

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
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full rounded-xl border border-gray-200 bg-white pl-10 pr-4 py-3 text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-100 focus:border-gray-300 transition"
                  placeholder="bob@bard.com"
                />
              </div>
            </div>

            {/* Password field */}
            <div>
              <label htmlFor="password" className="block text-xs font-mono font-bold uppercase tracking-widest text-gray-500">
                Password
              </label>
              <div className="mt-1.5 relative rounded-xl shadow-sm">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-gray-400">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full rounded-xl border border-gray-200 bg-white pl-10 pr-4 py-3 text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-100 focus:border-gray-300 transition"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {/* Confirm Password field */}
            <div>
              <label htmlFor="confirmPassword" className="block text-xs font-mono font-bold uppercase tracking-widest text-gray-500">
                Confirm Password
              </label>
              <div className="mt-1.5 relative rounded-xl shadow-sm">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-gray-400">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="block w-full rounded-xl border border-gray-200 bg-white pl-10 pr-4 py-3 text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-100 focus:border-gray-300 transition"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {/* Create account button */}
            <div>
              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center space-x-2 rounded-xl bg-gray-950 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-gray-900 transition focus:outline-none focus:ring-2 focus:ring-indigo-500/25 disabled:bg-gray-200 disabled:text-gray-400"
                id="register_submit_btn"
              >
                <span>{loading ? 'Initializing account...' : 'Create Account'}</span>
                {!loading && <ArrowRight className="h-4 w-4" />}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
