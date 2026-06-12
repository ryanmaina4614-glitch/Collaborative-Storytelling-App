import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { io, Socket } from 'socket.io-client';
import { 
  AppDispatch, RootState, 
  fetchStory, updateStory, addContributor, removeContributor, localStoryUpdate 
} from '../store/index.ts';
import { 
  Users, Save, Share2, MessageCircle, History, UserPlus, 
  Trash2, X, ChevronLeft, Loader2, Play, Lock, FileText, Check, ShieldAlert
} from 'lucide-react';
import CommentSection from '../components/CommentSection.tsx';
import ShareModal from '../components/ShareModal.tsx';

interface StoryViewProps {
  storyId: number;
  onNavigate: (view: string) => void;
}

interface ActiveCollaborator {
  userId: number;
  username: string;
  avatarUrl: string | null;
  position: number;
}

interface Version {
  id: number;
  storyId: number;
  content: string;
  createdBy: number;
  creatorName: string;
  createdAt: string;
}

export default function StoryView({ storyId, onNavigate }: StoryViewProps) {
  const dispatch = useDispatch<AppDispatch>();
  const user = useSelector((state: RootState) => state.auth.user);
  const story = useSelector((state: RootState) => state.stories.currentStory);
  const loading = useSelector((state: RootState) => state.stories.loading);

  const [content, setContent] = React.useState('');
  const [title, setTitle] = React.useState('');
  const [commentsEnabled, setCommentsEnabled] = React.useState(true);
  
  // Side Panels Control
  const [showCommentsSidebar, setShowCommentsSidebar] = React.useState(true);
  const [showHistoryPanel, setShowHistoryPanel] = React.useState(false);
  const [showInvitePanel, setShowInvitePanel] = React.useState(false);
  const [isShareOpen, setIsShareOpen] = React.useState(false);

  // Invite form
  const [inviteUsername, setInviteUsername] = React.useState('');
  const [inviteError, setInviteError] = React.useState<string | null>(null);
  const [inviteSuccess, setInviteSuccess] = React.useState<string | null>(null);

  // Versions history
  const [versions, setVersions] = React.useState<Version[]>([]);
  const [historyLoading, setHistoryLoading] = React.useState(false);
  const [previewingVersion, setPreviewingVersion] = React.useState<Version | null>(null);

  // Real-time socket state
  const [socket, setSocket] = React.useState<Socket | null>(null);
  const [activeCollaborators, setActiveCollaborators] = React.useState<ActiveCollaborator[]>([]);
  const [isSaved, setIsSaved] = React.useState(true);
  const [typingUsers, setTypingUsers] = React.useState<{ [userId: number]: string }>({});

  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const autoSaveTimerRef = React.useRef<NodeJS.Timeout | null>(null);

  // 1. Fetch story details on load
  React.useEffect(() => {
    dispatch(fetchStory(storyId));
  }, [dispatch, storyId]);

  // 2. Load fields when story details arrive
  React.useEffect(() => {
    if (story && story.id === storyId) {
      setContent(story.content);
      setTitle(story.title);
      setCommentsEnabled(story.commentsEnabled);
    }
  }, [story, storyId]);

  // 3. Socket.io Connection & Events Handler
  React.useEffect(() => {
    if (!story || !user) return;

    // Connect to the same origin server
    const socketInstance = io(window.location.origin);
    setSocket(socketInstance);

    // Join story sandbox room
    socketInstance.emit('joinStory', {
      storyId: story.id,
      userId: user.id,
      username: user.username,
      avatarUrl: user.avatarUrl
    });

    // Listen for current active collaborator updates
    socketInstance.on('activeCollaborators', (list: ActiveCollaborator[]) => {
      // Filter out self
      setActiveCollaborators(list.filter(c => c.userId !== user.id));
    });

    // Listen for real-time text/title updates
    socketInstance.on('storyUpdated', (data: { content: string; title?: string; updatedBy?: number; isRestored?: boolean }) => {
      if (data.updatedBy !== user.id) {
        setContent(data.content);
        if (data.title !== undefined) {
          setTitle(data.title);
        }
        dispatch(localStoryUpdate({ content: data.content, title: data.title }));

        if (data.isRestored) {
          // Toast restore notification
          setInviteSuccess('Story state was rolled back to a previous snapshot by a collaborator!');
          setTimeout(() => setInviteSuccess(null), 4000);
          // Reload versions
          loadVersionHistory();
        }
      }
    });

    // Listen for partner cursor shifts
    socketInstance.on('cursorMoved', (data: { userId: number; position: number; username: string }) => {
      setActiveCollaborators(prev => 
        prev.map(c => c.userId === data.userId ? { ...c, position: data.position } : c)
      );
      
      // Briefly show typing states
      setTypingUsers(prev => ({ ...prev, [data.userId]: `${data.username} is editing...` }));
      const timer = setTimeout(() => {
        setTypingUsers(prev => {
          const dict = { ...prev };
          delete dict[data.userId];
          return dict;
        });
      }, 2000);
      return () => clearTimeout(timer);
    });

    // Listen for joins
    socketInstance.on('userJoined', (data: { username: string }) => {
      setInviteSuccess(`${data.username} joined the co-writing channel!`);
      setTimeout(() => setInviteSuccess(null), 3000);
    });

    // Listen for leaves
    socketInstance.on('userLeft', (data: { username: string }) => {
      setInviteSuccess(`${data.username} left the co-writing channel.`);
      setTimeout(() => setInviteSuccess(null), 3000);
    });

    return () => {
      socketInstance.emit('leaveStory');
      socketInstance.disconnect();
    };
  }, [story?.id, user?.id]);

  // Can the current user edit? (Author or Contributor)
  const isAuthor = story ? story.authorId === user?.id : false;
  const isContributor = story ? story.contributors.some(c => c.userId === user?.id) : false;
  const canEdit = isAuthor || isContributor;

  // Handle typing change (Live broadcast & status auto-save)
  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newVal = e.target.value;
    setContent(newVal);
    setIsSaved(false);

    // 1. Dispatch local redux representation change
    dispatch(localStoryUpdate({ content: newVal }));

    // 2. Emit Socket IO update event to collaborators
    if (socket && story) {
      socket.emit('storyUpdate', {
        storyId: story.id,
        content: newVal,
        title: title
      });
      socket.emit('cursorMove', {
        storyId: story.id,
        userId: user?.id,
        position: e.target.selectionStart
      });
    }

    // 3. Debounce persistence patch save
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(() => {
      handlePersistSave(newVal, title);
    }, 1500); // Save after 1.5s idle
  };

  // Helper cursor listener
  const handleCursorSelection = (e: React.SyntheticEvent<HTMLTextAreaElement>) => {
    if (socket && story && user) {
      socket.emit('cursorMove', {
        storyId: story.id,
        userId: user.id,
        position: e.currentTarget.selectionStart
      });
    }
  };

  // Persist story edit to Express Backend API
  const handlePersistSave = async (textVal: string, titleVal: string) => {
    if (!story) return;
    try {
      await dispatch(updateStory({
        id: story.id,
        fields: {
          title: titleVal,
          content: textVal,
          commentsEnabled: commentsEnabled
        }
      })).unwrap();
      setIsSaved(true);
    } catch (e) {
      console.error('AutoSave failed', e);
    }
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value;
    setTitle(newTitle);
    setIsSaved(false);

    dispatch(localStoryUpdate({ content: content, title: newTitle }));

    if (socket && story) {
      socket.emit('storyUpdate', {
        storyId: story.id,
        content: content,
        title: newTitle
      });
    }

    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(() => {
      handlePersistSave(content, newTitle);
    }, 1500);
  };

  const handleToggleComments = async () => {
    if (!story || !isAuthor) return;
    const toggled = !commentsEnabled;
    setCommentsEnabled(toggled);
    
    try {
      await dispatch(updateStory({
        id: story.id,
        fields: { commentsEnabled: toggled }
      })).unwrap();
    } catch (e) {
      console.error('Failed to toggle feedback privilege', e);
    }
  };

  // 4. Invite contributor
  const handleInviteInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteError(null);
    setInviteSuccess(null);

    if (!story || !inviteUsername.trim()) return;

    try {
      await dispatch(addContributor({
        storyId: story.id,
        username: inviteUsername.trim()
      })).unwrap();

      setInviteSuccess(`Invitation granted! ${inviteUsername} added as collaborator.`);
      setInviteUsername('');
      dispatch(fetchStory(story.id)); // Reload story metrics
    } catch (err: any) {
      setInviteError(err.message || 'Contributor nomination failed. Retrying.');
    }
  };

  // Remove collaborator
  const handleRevokeContributor = (assocId: number, name: string) => {
    if (!story) return;
    if (confirm(`Are you sure you want to revoke story editing rights for ${name}?`)) {
      dispatch(removeContributor(assocId)).unwrap().then(() => {
        setInviteSuccess(`Collaboration rights revoked for ${name}.`);
        setTimeout(() => setInviteSuccess(null), 3000);
        dispatch(fetchStory(story.id));
      });
    }
  };

  // 5. Version History Fetch
  const loadVersionHistory = async () => {
    if (!story) return;
    setHistoryLoading(true);
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch(`/api/stories/${story.id}/versions`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const list = await res.json();
        setVersions(list);
      }
    } catch (e) {
      console.error('Failed to load version timelines', e);
    } finally {
      setHistoryLoading(false);
    }
  };

  React.useEffect(() => {
    if (showHistoryPanel && story) {
      loadVersionHistory();
    }
  }, [showHistoryPanel, story?.id]);

  // Restore snapshot
  const handleRestoreVersion = async (version: Version) => {
    if (!story) return;
    if (confirm(`Roll back this manuscript to the version taken on ${new Date(version.createdAt).toLocaleString()}? This will create a new tracking version snapshot.`)) {
      try {
        const token = localStorage.getItem('accessToken');
        const res = await fetch(`/api/stories/${story.id}/restore/${version.id}`, {
          method: 'POST',
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json' 
          }
        });
        if (res.ok) {
          const updated = await res.json();
          setContent(updated.content);
          setTitle(updated.title);
          setPreviewingVersion(null);
          setShowHistoryPanel(false);
          dispatch(fetchStory(story.id)); // Sync Redux
          setInviteSuccess('Story snapshot restored successfully!');
          setTimeout(() => setInviteSuccess(null), 3000);
        }
      } catch (err) {
        console.error('Restore failed', err);
      }
    }
  };

  if (loading && !story) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-gray-400 min-h-[calc(100vh-4rem)] bg-white">
        <Loader2 className="h-8 w-8 animate-spin" />
        <p className="mt-2 text-sm">Aligning collaboration streams...</p>
      </div>
    );
  }

  if (!story) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center px-4 min-h-[calc(100vh-4rem)]">
        <ShieldAlert className="h-10 w-10 text-red-500 mb-3" />
        <h3 className="text-lg font-bold text-gray-900">Sandbox Unaccessible</h3>
        <p className="text-sm text-gray-500 max-w-md mt-1">
          This story sandbox could not be found. If it was shared, verify the share link or confirm permissions with the author.
        </p>
        <button
          onClick={() => onNavigate('home')}
          className="mt-6 rounded-xl bg-gray-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-gray-900"
        >
          Return to Anthology
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row h-[calc(100vh-4rem)] overflow-hidden bg-[#F9F7F2]" id="story_view_layout">
      
      {/* LEFT: Main Editing Stage */}
      <div className="flex-1 flex flex-col h-full overflow-hidden border-r border-stone-200">
        
        {/* Editor Title Panel Header */}
        <div className="px-5 py-3 border-b border-stone-200 flex flex-col gap-3 justify-between sm:flex-row sm:items-center bg-white/40">
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2">
              <button 
                onClick={() => onNavigate('home')}
                className="p-1 rounded-none text-stone-400 hover:text-stone-950 hover:bg-stone-100 transition mr-1"
                title="Back to Anthology"
                id="story_back_to_ant"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              
              {canEdit ? (
                <input
                  type="text"
                  value={title}
                  onChange={handleTitleChange}
                  className="font-serif font-semibold text-xl italic text-[#1A1A1A] bg-transparent border-b border-transparent hover:border-stone-200 focus:border-stone-400 focus:outline-none w-full max-w-md truncate py-0.5"
                  id="story_title_input"
                />
              ) : (
                <h1 className="font-serif font-semibold text-xl italic text-[#1A1A1A] truncate max-w-md">
                  {title}
                </h1>
              )}
            </div>

            <div className="flex items-center space-x-2 mt-1 pl-9">
              <span className="text-[9px] font-mono uppercase tracking-[0.15em] text-stone-450 font-semibold">
                By {story.authorName} ({isAuthor ? 'Author / You' : 'Collaborator'})
              </span>
              <span className="text-stone-300">•</span>
              <span className="flex items-center text-[9px] font-mono text-stone-500 tracking-wider">
                {isSaved ? (
                  <span className="text-emerald-700 font-bold uppercase tracking-wider flex items-center bg-emerald-50 px-2 py-0.5 border border-emerald-150">
                    <Check className="h-3 w-3 mr-0.5" />
                    Synced
                  </span>
                ) : (
                  <span className="text-amber-700 font-bold uppercase tracking-wider animate-pulse bg-amber-50 px-2 py-0.5 border border-amber-150">Saving draft...</span>
                )}
              </span>
            </div>
          </div>

          {/* Action Tools */}
          <div className="flex items-center space-x-2 shrink-0">
            {/* Live active collaborators bubbles wrapper */}
            {activeCollaborators.length > 0 && (
              <div className="flex items-center -space-x-1.5 border-r border-stone-200 pr-3 mr-2 hidden sm:flex">
                {activeCollaborators.map(c => (
                  <img
                    key={c.userId}
                    src={c.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${c.username}`}
                    alt={c.username}
                    referrerPolicy="no-referrer"
                    className="h-6 w-6 rounded-none ring-1 ring-stone-900 border border-stone-250 object-cover"
                    title={`${c.username} is connected`}
                  />
                ))}
              </div>
            )}

            {/* Invite button */}
            {isAuthor && (
              <button
                onClick={() => {
                  setShowInvitePanel(!showInvitePanel);
                  setShowHistoryPanel(false);
                }}
                className={`p-2 rounded-none border transition ${
                  showInvitePanel 
                    ? 'bg-stone-950 text-white border-stone-950' 
                    : 'bg-[#FDFCFB] text-stone-600 border-stone-300 hover:bg-stone-50'
                }`}
                title="Collaborators and Invites"
                id="story_invite_tools_btn"
              >
                <UserPlus className="h-4 w-4" />
              </button>
            )}

            {/* Version History Button */}
            {canEdit && (
              <button
                onClick={() => {
                  setShowHistoryPanel(!showHistoryPanel);
                  setShowInvitePanel(false);
                }}
                className={`p-2 rounded-none border transition ${
                  showHistoryPanel 
                    ? 'bg-stone-950 text-white border-stone-950' 
                    : 'bg-[#FDFCFB] text-stone-600 border-stone-300 hover:bg-stone-50'
                }`}
                title="Version Timelines"
                id="story_history_btn"
              >
                <History className="h-4 w-4" />
              </button>
            )}

            {/* Share button */}
            <button
              onClick={() => setIsShareOpen(true)}
              className="p-2 bg-[#FDFCFB] rounded-none border border-stone-300 text-stone-600 hover:bg-stone-50 transition"
              title="Share Story"
              id="story_share_btn"
            >
              <Share2 className="h-4 w-4" />
            </button>

            {/* Toggle Feedback sidebar */}
            <button
              onClick={() => setShowCommentsSidebar(!showCommentsSidebar)}
              className={`p-2 rounded-none border transition ${
                showCommentsSidebar 
                  ? 'bg-stone-950 text-white border-stone-950' 
                  : 'bg-[#FDFCFB] text-stone-600 border-stone-300 hover:bg-stone-50'
              }`}
              title="Toggle feedback sidebar"
              id="story_sidebar_comments_btn"
            >
              <MessageCircle className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Dynamic banner alerts */}
        {inviteSuccess && (
          <div className="bg-emerald-50 border-b border-emerald-100/80 text-emerald-800 text-xs py-2 px-5 flex items-center justify-between font-serif">
            <span>{inviteSuccess}</span>
            <button onClick={() => setInviteSuccess(null)} className="p-0.5 text-emerald-500 hover:text-emerald-800">
              <X className="h-3 w-3" />
            </button>
          </div>
        )}        {/* Text editor core panel */}
        <div className="flex-1 relative bg-[#FDFCFB] flex flex-col p-6 sm:p-10 md:p-12 overflow-hidden">
          {previewingVersion && (
            <div className="bg-amber-50/70 border border-amber-200 p-4 mb-5 flex items-center justify-between rounded-none">
              <div>
                <p className="text-xs font-semibold text-amber-900 font-serif">
                  Viewing Snapshot by {previewingVersion.creatorName} ({new Date(previewingVersion.createdAt).toLocaleString()})
                </p>
                <p className="text-[11px] text-amber-705 font-light">Edits are locked in preview mode. Click Restore below to apply this snapshot.</p>
              </div>
              <div className="flex space-x-2 shrink-0">
                <button
                  onClick={() => setPreviewingVersion(null)}
                  className="p-1 px-3 bg-white border border-stone-300 hover:bg-stone-50 rounded-none text-[10px] uppercase tracking-wider font-semibold text-stone-700 transition"
                >
                  Close Preview
                </button>
                <button
                  onClick={() => handleRestoreVersion(previewingVersion)}
                  className="p-1 px-3 bg-stone-900 border border-stone-950 text-white rounded-none text-[10px] uppercase tracking-wider font-semibold hover:bg-stone-800 transition"
                >
                  Restore Version
                </button>
              </div>
            </div>
          )}

          <div className="flex-1 w-full relative">
            <textarea
              ref={textareaRef}
              value={previewingVersion ? previewingVersion.content : content}
              onChange={handleContentChange}
              onKeyUp={handleCursorSelection}
              onSelect={handleCursorSelection}
              onClick={handleCursorSelection}
              disabled={!canEdit || !!previewingVersion}
              rows={24}
              className={`w-full h-full bg-transparent text-[#1A1A1A] placeholder-stone-300 font-serif text-lg leading-relaxed focus:outline-none resize-none font-light ${
                !canEdit ? 'cursor-not-allowed select-text' : ''
              }`}
              placeholder={canEdit ? "Pour your soul into pages. Live co-writers will synchronize with your keystrokes..." : "You have read-only access to this sandbox. Ask the author to invite you as an active contributor!"}
              id="story_manuscript_textarea"
            />
            
            {/* Real-time Partner editing overlays */}
            {Object.keys(typingUsers).length > 0 && (
              <div className="absolute bottom-4 right-4 bg-[#1A1A1A] text-white border border-stone-900 text-[10px] uppercase tracking-wider px-3.5 py-1.5 rounded-none shadow-none flex items-center space-x-2 z-10 animate-pulse">
                <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-450" />
                <span>
                  {Object.values(typingUsers).join(', ')}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Editor Bottom Info Rail */}
        <div className="px-5 py-2.5 border-t border-stone-200 flex items-center justify-between text-[10px] font-mono uppercase tracking-[0.15em] text-stone-400 bg-stone-55/10">
          <div className="flex items-center space-x-4">
            <span>Words: {content ? content.trim().split(/\s+/).filter(Boolean).length : 0}</span>
            <span>Ref: {content ? content.length : 0} Chars</span>
          </div>
          <div>
            {!canEdit && (
              <span className="text-red-700 font-semibold uppercase tracking-wider text-[9px] flex items-center bg-red-50 border border-red-150 px-2 py-0.5 rounded-none">
                <Lock className="h-3 w-3 mr-1" />
                Read-Only
              </span>
            )}
          </div>
        </div>
      </div>

      {/* RIGHT SLIDERS PANEL CONTAINER */}
      
      {/* 1. History Snapshots Panel */}
      {showHistoryPanel && canEdit && (
        <div className="w-full md:w-80 h-full border-b md:border-b-0 md:border-l border-stone-200 flex flex-col bg-[#FDFCFB]/95" id="history_flow_panel">
          <div className="p-4 border-b border-stone-200 flex items-center justify-between">
            <div>
              <h3 className="font-serif font-semibold text-[#1A1A1A] text-base italic">Version Ledger</h3>
              <p className="text-[9px] font-mono text-stone-400 uppercase tracking-widest font-bold">Auto-saved Snapshots</p>
            </div>
            <button onClick={() => setShowHistoryPanel(false)} className="p-1 rounded-none hover:bg-stone-100 text-stone-400">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
            {historyLoading ? (
              <div className="text-center py-8 text-xs font-mono uppercase tracking-wider text-stone-400">Loading ledger data...</div>
            ) : versions.length === 0 ? (
              <div className="text-center py-8 text-xs font-mono uppercase tracking-wider text-stone-400">No backup records. Snaps generated live.</div>
            ) : (
              versions.map((ver, idx) => (
                <div
                  key={ver.id}
                  onClick={() => setPreviewingVersion(ver)}
                  className={`border p-4 cursor-pointer text-left transition select-none rounded-none ${
                    previewingVersion?.id === ver.id 
                      ? 'bg-[#F6F4EF] border-stone-850 shadow-none' 
                      : 'border-stone-200 hover:border-stone-400 hover:bg-white/40 bg-[#FDFCFB]/40'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-stone-900 font-serif">Snapshot #{versions.length - idx}</span>
                    <span className="text-[9px] font-mono text-stone-400 font-semibold text-right">
                      {new Date(ver.createdAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-[11px] text-stone-500 font-serif font-light mt-2 truncate">
                    {ver.content || 'Blank draft'}
                  </p>
                  <div className="mt-2.5 pt-2 border-t border-stone-100 text-[9px] font-mono uppercase tracking-wider text-stone-400 flex items-center justify-between">
                    <span>By {ver.creatorName}</span>
                    <span>{new Date(ver.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* 2. Collaborative Invite lists Panel */}
      {showInvitePanel && isAuthor && (
        <div className="w-full md:w-80 h-full border-b md:border-b-0 md:border-l border-stone-200 flex flex-col bg-[#FDFCFB]/95 animate-slide-in" id="collaborators_invite_panel">
          <div className="p-4 border-b border-stone-200 flex items-center justify-between">
            <div>
              <h3 className="font-serif font-semibold text-[#1A1A1A] text-base italic">Collaborators Pool</h3>
              <p className="text-[9px] font-mono text-stone-400 uppercase tracking-widest font-bold">Editing Clearances</p>
            </div>
            <button onClick={() => setShowInvitePanel(false)} className="p-1 rounded-none hover:bg-stone-100 text-stone-400">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="p-4 space-y-6 flex-1 overflow-y-auto">
            {/* Invite Form */}
            <form onSubmit={handleInviteInvite} className="space-y-2">
              <label className="block text-[10px] font-mono font-bold uppercase tracking-[0.15em] text-stone-400">Nominate Collaborator</label>
              <div className="flex space-x-1.5">
                <input
                  type="text"
                  placeholder="Username (e.g. alice_writer)"
                  required
                  value={inviteUsername}
                  onChange={(e) => setInviteUsername(e.target.value)}
                  className="rounded-none border border-stone-300 px-3.5 py-2 text-xs w-full bg-white font-sans focus:outline-none focus:border-stone-900"
                  id="invite_username_field"
                />
                <button
                  type="submit"
                  className="rounded-none bg-[#1A1A1A] hover:bg-stone-850 border border-stone-955 text-white p-2 px-4 text-[10px] uppercase tracking-widest font-semibold transition"
                  id="invite_submit_btn"
                >
                  Invite
                </button>
              </div>
              {inviteError && (
                <p className="text-[10px] text-red-700 bg-red-50 p-2 border border-red-150 font-serif font-light">{inviteError}</p>
              )}
            </form>

            {/* List of current helpers */}
            <div className="space-y-2">
              <span className="block text-[10px] font-mono font-bold uppercase tracking-[0.15em] text-stone-400 font-bold">Authorized Writers</span>
              {story.contributors.length === 0 ? (
                <p className="p-5 text-center border border-dashed border-stone-300 rounded-none text-xs font-serif font-light text-stone-500">
                  This workbook is private. Nominate collaborators to write saga segments together!
                </p>
              ) : (
                <div className="space-y-2 border border-stone-150 bg-stone-50/20 rounded-none p-2">
                  {story.contributors.map(c => (
                    <div key={c.id} className="flex items-center justify-between p-2 rounded-none hover:bg-white hover:border-stone-300 transition border border-transparent">
                      <div className="flex items-center space-x-2">
                        <img
                          src={c.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${c.username}`}
                          alt={c.username}
                          referrerPolicy="no-referrer"
                          className="h-5 w-5 rounded-none object-cover border border-stone-200 bg-stone-100"
                        />
                        <span className="text-[11px] font-mono uppercase tracking-wider font-semibold text-stone-700">{c.username}</span>
                      </div>
                      <button
                        onClick={() => handleRevokeContributor(c.id, c.username)}
                        className="rounded-none p-1 text-stone-400 hover:text-red-700 transition"
                        title="Revoke clearance"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Privileges control box */}
            <div className="rounded-none border border-stone-200 bg-stone-50/50 p-4 space-y-3">
              <span className="block text-[10px] font-mono font-bold uppercase tracking-[0.15em] text-stone-400">Security Policies</span>
              <div className="flex items-center justify-between">
                <span className="text-xs text-stone-700 font-semibold serif">Enable Reader Feedback</span>
                <button
                  onClick={handleToggleComments}
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    commentsEnabled ? 'bg-stone-900' : 'bg-stone-200'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      commentsEnabled ? 'translate-x-4' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
              <p className="text-[10px] text-stone-400 font-serif font-light leading-relaxed">
                Turning this off disables commenting permissions for this entire tale workspace temporarily.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 3. Collapsible Reader Comments thread panel */}
      {showCommentsSidebar && (
        <div className="w-full md:w-80 h-full border-t md:border-t-0 border-l border-stone-200 flex flex-col bg-[#FDFCFB] shrink-0" id="comments_sidebar_container">
          <CommentSection 
            storyId={story.id} 
            commentsEnabled={commentsEnabled} 
            isAuthor={isAuthor} 
          />
        </div>
      )}

      {/* Static Share Modal overlay */}
      <ShareModal
        isOpen={isShareOpen}
        onClose={() => setIsShareOpen(false)}
        storyTitle={title}
        shareToken={story.shareToken}
      />
    </div>
  );
}
