/**
 * Collaborative Storytelling App Frontend Entry Point
 */

import React from 'react';
import { Provider, useDispatch, useSelector } from 'react-redux';
import { store, RootState, AppDispatch, logout } from './store/index.ts';

// Components & Views
import Navbar from './components/Navbar.tsx';
import Home from './pages/Home.tsx';
import Login from './pages/Login.tsx';
import Register from './pages/Register.tsx';
import StoryView from './pages/StoryView.tsx';
import Profile from './pages/Profile.tsx';

function MainApp() {
  const dispatch = useDispatch<AppDispatch>();
  const user = useSelector((state: RootState) => state.auth.user);

  // Simple state routing: 'home', 'login', 'register', 'storyView', 'profile'
  const [currentView, setCurrentView] = React.useState<string>('home');
  const [targetStoryId, setTargetStoryId] = React.useState<string | number | null>(null);

  // Share URL routing detection on initial render
  React.useEffect(() => {
    const path = window.location.pathname;
    const shareMatch = path.match(/\/story\/share\/([^\/]+)/);
    if (shareMatch) {
      const shareToken = shareMatch[1];
      setCurrentView('storyView');
      setTargetStoryId(shareToken);
      
      // Clean up URL representation in browser
      window.history.replaceState({}, document.title, '/');
    }
  }, []);

  const handleNavigate = (view: string, storyId?: number | string) => {
    setCurrentView(view);
    if (storyId !== undefined) {
      setTargetStoryId(storyId);
    } else {
      setTargetStoryId(null);
    }
  };

  const handleLogout = () => {
    dispatch(logout());
    setCurrentView('home');
  };

  return (
    <div className="min-h-screen bg-[#F9F7F2] text-[#1A1A1A] flex flex-col font-sans" id="app_root_layout">
      {/* Navbar always accessible */}
      <Navbar
        currentView={currentView}
        onNavigate={handleNavigate}
        user={user}
        onLogout={handleLogout}
      />

      {/* Dynamic View rendering */}
      <main className="flex-grow">
        {currentView === 'home' && (
          <Home onNavigate={handleNavigate} />
        )}
        
        {currentView === 'login' && (
          <Login onNavigate={handleNavigate} />
        )}
        
        {currentView === 'register' && (
          <Register onNavigate={handleNavigate} />
        )}

        {currentView === 'storyView' && targetStoryId !== null && (
          <StoryView 
            storyId={typeof targetStoryId === 'number' ? targetStoryId : (targetStoryId as any)} 
            onNavigate={handleNavigate} 
          />
        )}

        {currentView === 'profile' && (
          user ? (
            <Profile onNavigate={handleNavigate} />
          ) : (
            <Login onNavigate={handleNavigate} />
          )
        )}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <Provider store={store}>
      <MainApp />
    </Provider>
  );
}
