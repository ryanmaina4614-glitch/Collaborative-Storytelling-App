import React from 'react';
import { BookOpen, User, LogOut, ChevronDown } from 'lucide-react';

interface NavbarProps {
  currentView: string;
  onNavigate: (view: string) => void;
  user: any;
  onLogout: () => void;
}

export default function Navbar({ currentView, onNavigate, user, onLogout }: NavbarProps) {
  const [dropdownOpen, setDropdownOpen] = React.useState(false);

  return (
    <nav className="sticky top-0 z-30 w-full border-b border-stone-200/60 bg-white/60 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8 h-16">
        {/* Logo */}
        <div 
          onClick={() => onNavigate('home')} 
          className="flex cursor-pointer items-center space-x-2.5 transition hover:opacity-90"
          id="nav_logo"
        >
          <div className="flex h-9 w-9 items-center justify-center border border-stone-900 bg-stone-950 font-serif text-sm font-semibold italic text-[#F9F7F2]">
            CW
          </div>
          <div>
            <span className="font-serif font-semibold text-lg italic tracking-tighter text-[#1A1A1A] block leading-none">CoWrite.</span>
            <span className="font-mono text-[9px] text-stone-500 uppercase tracking-[0.2em]">FOLIO EDITOR</span>
          </div>
        </div>

        {/* Navigation Actions */}
        <div className="flex items-center space-x-4">
          {user ? (
            <div className="relative flex items-center space-x-6">
              <button
                onClick={() => onNavigate('home')}
                className={`text-[11px] font-medium uppercase tracking-[0.18em] transition-all pb-1 ${
                  currentView === 'home' 
                    ? 'text-black border-b border-black' 
                    : 'text-stone-500 hover:text-black border-b border-transparent'
                }`}
                id="nav_btn_home"
              >
                Browse
              </button>

              <button
                onClick={() => onNavigate('profile')}
                className={`text-[11px] font-medium uppercase tracking-[0.18em] transition-all pb-1 ${
                  currentView === 'profile' 
                    ? 'text-black border-b border-black' 
                    : 'text-stone-500 hover:text-black border-b border-transparent'
                }`}
                id="nav_btn_profile"
              >
                Portfolio
              </button>

              {/* User Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center space-x-2 border border-stone-200 bg-white/40 px-2 py-1 transition hover:bg-stone-50"
                  id="nav_user_profile_trigger"
                >
                  <img
                    src={user.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.username}`}
                    alt={user.username}
                    referrerPolicy="no-referrer"
                    className="h-5 w-5 bg-stone-100 object-cover"
                  />
                  <span className="text-[10px] uppercase font-semibold text-stone-700 hidden sm:inline max-w-[120px] truncate tracking-wider">
                    {user.username}
                  </span>
                  <ChevronDown className="h-3 w-3 text-stone-500" />
                </button>

                {dropdownOpen && (
                  <>
                    <div 
                      className="fixed inset-0 z-40" 
                      onClick={() => setDropdownOpen(false)} 
                    />
                    <div className="absolute right-0 mt-2 w-52 origin-top-right border border-stone-200 bg-[#FDFCFB] p-2 shadow-sm focus:outline-none z-50 animate-fade-in-up">
                      <div className="px-3 py-2 border-b border-stone-100 mb-1">
                        <p className="text-[9px] font-mono text-stone-400 uppercase tracking-wider">Editor Context</p>
                        <p className="text-sm font-semibold font-serif text-[#1A1A1A] truncate">{user.username}</p>
                        <p className="text-[10px] text-stone-500 truncate">{user.email}</p>
                      </div>

                      <button
                        onClick={() => {
                          setDropdownOpen(false);
                          onNavigate('profile');
                        }}
                        className="flex w-full items-center px-3 py-1.5 text-xs text-stone-700 hover:bg-stone-50 transition tracking-wide"
                        id="nav_dropdown_item_profile"
                      >
                        <User className="mr-2 h-3.5 w-3.5 text-stone-400" />
                        My Profile
                      </button>

                      <button
                        onClick={() => {
                          setDropdownOpen(false);
                          onLogout();
                        }}
                        className="flex w-full items-center px-3 py-1.5 text-xs text-red-700 hover:bg-red-50/50 transition tracking-wide border-t border-stone-100 mt-1"
                        id="nav_dropdown_item_logout"
                      >
                        <LogOut className="mr-2 h-3.5 w-3.5 opacity-75" />
                        Log Out
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center space-x-3">
              <button
                onClick={() => onNavigate('login')}
                className="text-[11px] uppercase tracking-[0.15em] text-stone-600 hover:text-black px-2 py-1.5 transition"
                id="nav_btn_login"
              >
                Log In
              </button>
              <button
                onClick={() => onNavigate('register')}
                className="text-[11px] uppercase tracking-[0.15em] bg-stone-900 text-white px-4 py-2 hover:bg-black transition"
                id="nav_btn_signup"
              >
                Get Started
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
