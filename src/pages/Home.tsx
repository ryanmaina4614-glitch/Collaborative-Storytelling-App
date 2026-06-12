import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState, fetchStories, createStory, deleteStory } from '../store/index.ts';
import { Search, Loader2, Plus, Users, BookOpen, Clock, Heart, Trash2, ArrowRight } from 'lucide-react';

interface HomeProps {
  onNavigate: (view: string, storyId?: number) => void;
}

export default function Home({ onNavigate }: HomeProps) {
  const dispatch = useDispatch<AppDispatch>();
  const user = useSelector((state: RootState) => state.auth.user);
  const stories = useSelector((state: RootState) => state.stories.stories);
  const loading = useSelector((state: RootState) => state.stories.loading);

  const [activeTab, setActiveTab] = React.useState<'all' | 'mine' | 'collaborations'>('all');
  const [searchTerm, setSearchTerm] = React.useState('');
  const [debouncedSearch, setDebouncedSearch] = React.useState('');

  // Create Story Modal
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [newTitle, setNewTitle] = React.useState('');
  const [newContent, setNewContent] = React.useState('');
  const [newCommentsEnabled, setNewCommentsEnabled] = React.useState(true);
  const [createLoading, setCreateLoading] = React.useState(false);

  // Debouncing search term
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const loadStoriesList = React.useCallback(() => {
    const filters: any = { search: debouncedSearch };
    if (activeTab === 'mine') filters.myOwn = true;
    if (activeTab === 'collaborations') filters.contributed = true;
    dispatch(fetchStories(filters));
  }, [dispatch, activeTab, debouncedSearch]);

  React.useEffect(() => {
    loadStoriesList();
  }, [loadStoriesList]);

  const handleCreateStory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newContent.trim()) return;

    setCreateLoading(true);
    try {
      const created = await dispatch(createStory({
        title: newTitle,
        content: newContent,
        commentsEnabled: newCommentsEnabled
      })).unwrap();
      
      setIsModalOpen(false);
      setNewTitle('');
      setNewContent('');
      setNewCommentsEnabled(true);
      onNavigate('storyView', created.id);
    } catch (e) {
      console.error('Failed to create story', e);
    } finally {
      setCreateLoading(false);
    }
  };

  const handleDeleteStory = (e: React.MouseEvent, id: number) => {
    e.stopPropagation(); // Prevent opening the story
    if (confirm('Are you absolutely sure you want to delete this story? This will purge all associated comment threads and version history.')) {
      dispatch(deleteStory(id)).unwrap().then(() => {
        loadStoriesList();
      });
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 bg-transparent min-h-[calc(100vh-4rem)]" id="home_page_container">
      {/* Search and Title Zone */}
      <div className="md:flex md:items-center md:justify-between pb-6 mb-8 border-b border-stone-200/80">
        <div className="flex-1 min-w-0">
          <h2 className="text-3xl font-serif font-semibold italic tracking-tight text-[#1A1A1A] sm:text-4xl">Story Anthology</h2>
          <p className="mt-1.5 text-sm text-stone-550 max-w-2xl font-serif font-light leading-relaxed">
            Co-write grand tales, build rich lore, or write solo projects in our real-time sandboxed collaborate universe.
          </p>
        </div>
        
        {user && (
          <div className="mt-4 md:mt-0 md:ml-4 flex shrink-0">
            <button
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center space-x-1.5 rounded-none bg-[#1A1A1A] px-5 py-2.5 text-[11px] font-semibold uppercase tracking-widest text-[#F9F7F2] hover:bg-stone-800 transition shadow-none border border-stone-950"
              id="home_create_story_trigger"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Create Story</span>
            </button>
          </div>
        )}
      </div>

      {/* Tabs list & search input */}
      <div className="flex flex-col-reverse md:flex-row md:items-center md:justify-between gap-4 mb-8">
        {/* Navigation Tabs */}
        <div className="flex space-x-1 bg-stone-200/30 border border-stone-200/50 p-1 rounded-none w-fit" id="home_tabs_list">
          <button
            onClick={() => setActiveTab('all')}
            className={`text-[10px] font-bold uppercase tracking-[0.2em] px-3.5 py-1.5 rounded-none transition ${
              activeTab === 'all' 
                ? 'bg-[#1A1A1A] text-white shadow-none' 
                : 'text-stone-500 hover:text-black'
            }`}
            id="tab_all_stories"
          >
            All Sandboxes
          </button>
          {user && (
            <>
              <button
                onClick={() => setActiveTab('mine')}
                className={`text-[10px] font-bold uppercase tracking-[0.2em] px-3.5 py-1.5 rounded-none transition ${
                  activeTab === 'mine' 
                    ? 'bg-[#1A1A1A] text-white shadow-none' 
                    : 'text-stone-500 hover:text-black'
                }`}
                id="tab_my_stories"
              >
                My Originals
              </button>
              <button
                onClick={() => setActiveTab('collaborations')}
                className={`text-[10px] font-bold uppercase tracking-[0.2em] px-3.5 py-1.5 rounded-none transition ${
                  activeTab === 'collaborations' 
                    ? 'bg-[#1A1A1A] text-white shadow-none' 
                    : 'text-stone-500 hover:text-black'
                }`}
                id="tab_contributed_stories"
              >
                My Collaborations
              </button>
            </>
          )}
        </div>

        {/* Search input field */}
        <div className="relative rounded-none w-full md:max-w-xs border border-stone-300 bg-white/40 focus-within:border-stone-900 transition p-1">
          <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-stone-400">
            <Search className="h-3.5 w-3.5" />
          </div>
          <input
            type="text"
            placeholder="Search manuscripts, genres..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="block w-full bg-transparent pl-10 pr-4 py-1.5 text-xs text-stone-800 placeholder-stone-400 focus:outline-none tracking-wide font-sans"
            id="home_stories_search_input"
          />
        </div>
      </div>

      {/* Grid of stories */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-stone-400">
          <Loader2 className="h-7 w-7 animate-spin" />
          <p className="mt-2 text-xs uppercase tracking-widest font-mono">Synchronizing story files...</p>
        </div>
      ) : stories.length === 0 ? (
        <div className="text-center py-16 border border-stone-300 border-dashed bg-white/40 rounded-none">
          <BookOpen className="mx-auto h-8 w-8 text-stone-300" />
          <h3 className="mt-3 text-sm font-semibold font-serif text-stone-900">No Manuscripts Found</h3>
          <p className="mt-1 text-xs text-stone-500 font-serif font-light">
            We couldn't find any manuscript matching your filter settings.
          </p>
          {user && (
            <div className="mt-5">
              <button
                onClick={() => setIsModalOpen(true)}
                className="inline-flex items-center space-x-1.5 text-[11px] uppercase tracking-widest font-semibold text-stone-900 bg-transparent border border-stone-900 px-4 py-2 hover:bg-stone-50 transition"
              >
                <span>Write the First Tale</span>
                <ArrowRight className="h-3 w-3" />
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3" id="stories_grid_list">
          {stories.map((story) => {
            const isStoryAuthor = user ? story.authorId === user.id : false;
            return (
              <div
                key={story.id}
                onClick={() => onNavigate('storyView', story.id)}
                className="group relative flex flex-col justify-between border border-stone-350 bg-[#FDFCFB]/95 p-6 cursor-pointer hover:border-stone-800 active-glow transition duration-300"
                id={`story_card_${story.id}`}
              >
                <div className="space-y-4">
                  {/* Category/Header tag */}
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[8px] text-stone-400 uppercase font-bold tracking-widest bg-stone-100 px-2 py-0.5 border border-stone-200">
                      Manuscript #{story.id}
                    </span>
                    {isStoryAuthor && (
                      <button
                        onClick={(e) => handleDeleteStory(e, story.id)}
                        className="opacity-0 group-hover:opacity-100 p-1 text-stone-400 hover:text-red-700 transition z-10"
                        title="Delete story"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Title & snippet */}
                  <div className="space-y-2">
                    <h3 className="font-serif font-semibold text-xl text-[#1A1A1A] group-hover:italic transition-all duration-300 leading-tight">
                      {story.title}
                    </h3>
                    <p className="text-xs text-stone-650 font-serif font-light line-clamp-3 leading-relaxed">
                      {story.content || 'This canvas is empty. Start co-writing live!'}
                    </p>
                  </div>
                </div>

                {/* Footer specs */}
                <div className="mt-6 pt-4 border-t border-stone-150 flex items-center justify-between">
                  {/* Author badge */}
                  <div className="flex items-center space-x-2">
                    <img
                      src={story.authorAvatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${story.authorName}`}
                      alt={story.authorName}
                      referrerPolicy="no-referrer"
                      className="h-5 w-5 bg-stone-100 border border-stone-200 object-cover"
                    />
                    <span className="text-[10px] font-mono uppercase tracking-wider text-stone-500 font-semibold truncate max-w-[90px]" title={story.authorName}>
                      {story.authorName}
                    </span>
                  </div>

                  {/* Collaborators counter */}
                  {story.contributors && story.contributors.length > 0 && (
                    <div className="flex items-center space-x-1 bg-stone-50 border border-stone-200 px-2 py-0.5">
                      <Users className="h-3 w-3 text-stone-400" />
                      <span className="text-[9px] font-mono font-bold text-stone-500">
                        {story.contributors.length}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CREATE STORY DIALOG MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/50 backdrop-blur-xs animate-fade-in">
          <div className="relative w-full max-w-xl overflow-hidden border border-stone-300 bg-[#FDFCFB] p-8 shadow-md animate-scale-up">
            
            {/* Modal Title */}
            <div className="flex items-center justify-between pb-4 border-b border-stone-200">
              <div>
                <h3 className="font-serif font-semibold text-2xl italic text-[#1A1A1A]">Draft a New Masterpiece</h3>
                <p className="text-xs text-stone-500 mt-1">Lay the groundwork for your storytelling universe.</p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-stone-400 hover:text-stone-700 transition"
                id="home_create_close_btn"
              >
                <Plus className="h-5 w-5 rotate-45" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleCreateStory} className="space-y-5 mt-6" id="create_story_form">
              {/* Title input */}
              <div>
                <label className="block text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-stone-500 mb-1.5">Story Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Chronicles of Eldervale"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="block w-full border border-stone-300 bg-white px-3.5 py-2.5 text-sm text-stone-800 placeholder-stone-400 focus:outline-none focus:border-stone-900 transition font-serif"
                  id="create_story_input_title"
                />
              </div>

              {/* Initial content */}
              <div>
                <label className="block text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-stone-500 mb-1.5">Prologue / Story Body</label>
                <textarea
                  required
                  rows={6}
                  placeholder="Begin drafting the initial paragraphs. This sets up the scenery for subsequent collaborators to contribute!"
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  className="block w-full border border-stone-300 bg-white px-3.5 py-2.5 text-sm text-stone-800 placeholder-stone-400 focus:outline-none focus:border-stone-900 transition resize-none leading-relaxed font-serif font-light"
                  id="create_story_input_content"
                />
              </div>

              {/* Comments toggle checkbox */}
              <div className="flex items-center space-x-2.5 p-3 border border-stone-200 bg-stone-50/50">
                <input
                  type="checkbox"
                  id="comments_toggle"
                  checked={newCommentsEnabled}
                  onChange={(e) => setNewCommentsEnabled(e.target.checked)}
                  className="h-4 w-4 border-stone-300 text-stone-900 focus:ring-stone-900"
                />
                <label htmlFor="comments_toggle" className="text-xs text-stone-600 font-semibold cursor-pointer select-none">
                  Enable collaborator feedback thread (Comments)
                </label>
              </div>

              {/* Actions */}
              <div className="flex justify-end space-x-3 pt-5 border-t border-stone-200 mt-6">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="p-2.5 px-4 text-xs font-semibold uppercase tracking-[0.15em] text-stone-500 hover:text-stone-800 transition"
                  id="create_story_cancel_btn"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createLoading || !newTitle.trim() || !newContent.trim()}
                  className="bg-[#1A1A1A] px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.15em] text-white hover:bg-stone-800 transition disabled:bg-stone-100 disabled:text-stone-400 border border-stone-900"
                  id="create_story_submit_btn"
                >
                  {createLoading ? 'Carving Story...' : 'Deploy Story Sandbox'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
