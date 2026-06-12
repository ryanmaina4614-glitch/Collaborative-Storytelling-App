import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState, fetchProfile, updateProfile, uploadAvatar } from '../store/index.ts';
import { User, Shield, Camera, LayoutGrid, Check, Edit2, Loader2, ArrowRight } from 'lucide-react';

interface ProfileProps {
  onNavigate: (view: string, storyId?: number) => void;
}

export default function Profile({ onNavigate }: ProfileProps) {
  const dispatch = useDispatch<AppDispatch>();
  const activeUser = useSelector((state: RootState) => state.auth.user);
  const { user: profileUser, stories, loading } = useSelector((state: RootState) => state.profile);

  const [username, setUsername] = React.useState('');
  const [isEditingUsername, setIsEditingUsername] = React.useState(false);
  const [updateLoading, setUpdateLoading] = React.useState(false);
  const [saveSuccess, setSaveSuccess] = React.useState(false);

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    dispatch(fetchProfile());
  }, [dispatch]);

  React.useEffect(() => {
    if (profileUser) {
      setUsername(profileUser.username);
    }
  }, [profileUser]);

  const handleUsernameSave = async () => {
    if (!username.trim() || username.trim() === profileUser?.username) {
      setIsEditingUsername(false);
      return;
    }

    setUpdateLoading(true);
    try {
      await dispatch(updateProfile({ username: username.trim() })).unwrap();
      setIsEditingUsername(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
      dispatch(fetchProfile());
    } catch (e: any) {
      alert(e.message || 'Failed to update username');
    } finally {
      setUpdateLoading(false);
    }
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = reader.result as string;
      setUpdateLoading(true);
      try {
        await dispatch(uploadAvatar(base64)).unwrap();
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 2000);
        dispatch(fetchProfile());
      } catch (err: any) {
        alert(err.message || 'Failed to sync avatar profile');
      } finally {
        setUpdateLoading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const authoredStories = stories.filter(s => s.role === 'author');
  const collaboratedStories = stories.filter(s => s.role === 'contributor');

  if (loading && !profileUser) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-gray-400 min-h-[calc(100vh-4rem)] bg-white">
        <Loader2 className="h-8 w-8 animate-spin" />
        <p className="mt-2 text-sm">Compiling your creative portfolio...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 bg-white min-h-[calc(100vh-4rem)]" id="profile_page_container">
      {/* Top Banner with glass background card */}
      <div className="relative rounded-2xl border border-gray-100 bg-gray-50/40 p-6 sm:p-8 overflow-hidden mb-8 shadow-sm">
        <div className="relative flex flex-col sm:flex-row sm:items-center sm:space-x-6 gap-4">
          
          {/* Avatar Area with Trigger */}
          <div className="relative h-20 w-20 shrink-0 mx-auto sm:mx-0">
            <img
              src={profileUser?.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${profileUser?.username}`}
              alt={profileUser?.username}
              referrerPolicy="no-referrer"
              className="h-20 w-20 rounded-2xl border-2 border-white object-cover bg-gray-100 shadow-sm"
              id="profile_avatar_img"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-lg bg-gray-950 text-white hover:bg-gray-900 transition shadow-md"
              title="Change Avatar"
              id="profile_avatar_upload_trigger"
            >
              <Camera className="h-3.5 w-3.5" />
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleAvatarChange}
              accept="image/*"
              className="hidden"
            />
          </div>

          {/* User Details Area */}
          <div className="flex-1 text-center sm:text-left space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              {isEditingUsername ? (
                <div className="flex items-center space-x-1.5 justify-center sm:justify-start">
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="rounded-lg border border-gray-200 px-2.5 py-1 text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-gray-100"
                    id="profile_username_input"
                  />
                  <button
                    onClick={handleUsernameSave}
                    disabled={updateLoading}
                    className="p-1 px-2.5 bg-gray-950 text-white rounded-lg text-xs font-semibold hover:bg-gray-900 transition flex items-center space-x-1"
                    id="profile_username_save_btn"
                  >
                    <Check className="h-3.5 w-3.5" />
                    <span>Save</span>
                  </button>
                </div>
              ) : (
                <div className="flex items-center space-x-2 justify-center sm:justify-start">
                  <h1 className="text-xl font-bold text-gray-950" id="profile_username_display">
                    {profileUser?.username}
                  </h1>
                  <button
                    onClick={() => setIsEditingUsername(true)}
                    className="p-1 text-gray-400 hover:text-gray-900 rounded-lg transition hover:bg-white"
                    title="Edit username"
                    id="profile_username_edit_trigger"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}

              {saveSuccess && (
                <span className="text-xs text-green-600 bg-green-50 border border-green-100 rounded-full px-2 py-0.5 font-medium ml-2 animate-fade-in">
                  Profile Synced
                </span>
              )}
            </div>

            <div className="flex items-center justify-center sm:justify-start space-x-3 text-xs font-mono text-gray-500">
              <span className="flex items-center">
                <Shield className="h-3.5 w-3.5 mr-1" />
                Author Level 1
              </span>
              <span>•</span>
              <span>Member since {profileUser && new Date(profileUser.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short' })}</span>
            </div>
          </div>
          
          {/* Quick numbers */}
          <div className="flex justify-center sm:justify-end space-x-8 pt-4 border-t border-gray-100 sm:border-t-0 sm:pt-0">
            <div className="text-center">
              <span className="block text-2xl font-black text-gray-950">{authoredStories.length}</span>
              <span className="block text-xs text-gray-400 font-mono uppercase tracking-widest">Originals</span>
            </div>
            <div className="text-center">
              <span className="block text-2xl font-black text-gray-950">{collaboratedStories.length}</span>
              <span className="block text-xs text-gray-400 font-mono uppercase tracking-widest">Collaborations</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main split grid */}
      <div className="grid gap-8 md:grid-cols-2">
        {/* Authored Grid */}
        <div className="space-y-4" id="authored_stories_container">
          <div className="flex items-center space-x-2 border-b border-gray-50 pb-2">
            <LayoutGrid className="h-4 w-4 text-gray-400" />
            <h2 className="text-sm font-mono font-bold uppercase tracking-widest text-gray-600">Original Publications ({authoredStories.length})</h2>
          </div>

          {authoredStories.length === 0 ? (
            <p className="text-xs text-gray-400 py-6 italic">
              You haven't authored any original stories yet. Go to Browse to start your first sandbox!
            </p>
          ) : (
            <div className="space-y-3">
              {authoredStories.map(story => (
                <div
                  key={story.id}
                  onClick={() => onNavigate('storyView', story.id)}
                  className="group flex flex-col justify-between p-4 border border-gray-100 bg-white hover:border-gray-200 hover:shadow-sm rounded-xl cursor-pointer transition"
                >
                  <div>
                    <h3 className="text-sm font-semibold text-gray-950 group-hover:text-black transition">
                      {story.title}
                    </h3>
                    <p className="text-xs text-gray-500 mt-1 line-clamp-2 leading-relaxed">
                      {story.content || 'Start editing your story drafts!'}
                    </p>
                  </div>
                  <div className="mt-3 text-[10px] text-gray-400 font-mono text-right">
                    Last touched {new Date(story.updatedAt).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Collaborated Grid */}
        <div className="space-y-4" id="collaborated_stories_container">
          <div className="flex items-center space-x-2 border-b border-gray-50 pb-2">
            <Camera className="h-4 w-4 text-gray-400 rotate-180" />
            <h2 className="text-sm font-mono font-bold uppercase tracking-widest text-gray-600">Collaborator Credits ({collaboratedStories.length})</h2>
          </div>

          {collaboratedStories.length === 0 ? (
            <p className="text-xs text-gray-400 py-6 italic">
              You haven't contributed to any other author's stories yet. Ask an author to invite you as a collaborator!
            </p>
          ) : (
            <div className="space-y-3">
              {collaboratedStories.map(story => (
                <div
                  key={story.id}
                  onClick={() => onNavigate('storyView', story.id)}
                  className="group flex flex-col justify-between p-4 border border-gray-100 bg-white hover:border-gray-200 hover:shadow-sm rounded-xl cursor-pointer transition"
                >
                  <div>
                    <h3 className="text-sm font-semibold text-gray-950 group-hover:text-black transition">
                      {story.title}
                    </h3>
                    <p className="text-xs text-gray-500 mt-1 line-clamp-2 leading-relaxed">
                      {story.content}
                    </p>
                  </div>
                  <div className="mt-3 text-[10px] text-gray-500 flex items-center justify-between">
                    <span>By author #{story.authorId}</span>
                    <span className="font-mono text-gray-400 text-[10px]">Touched {new Date(story.updatedAt).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
