import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch, fetchComments, addComment, editComment, deleteComment, reactToComment } from '../store/index.ts';
import { Send, Smile, Edit2, Trash2, Check, X, ShieldAlert } from 'lucide-react';
import { ExtendedComment } from '../types.ts';

interface CommentSectionProps {
  storyId: number;
  commentsEnabled: boolean;
  isAuthor: boolean;
}

const COMMON_REACTIONS = ['👍', '❤️', '😂', '🎉', '😮'];

export default function CommentSection({ storyId, commentsEnabled, isAuthor }: CommentSectionProps) {
  const dispatch = useDispatch<AppDispatch>();
  const comments = useSelector((state: RootState) => state.comments.comments);
  const loading = useSelector((state: RootState) => state.comments.loading);
  const user = useSelector((state: RootState) => state.auth.user);

  const [newCommentText, setNewCommentText] = React.useState('');
  const [editingCommentId, setEditingCommentId] = React.useState<number | null>(null);
  const [editingText, setEditingText] = React.useState('');

  React.useEffect(() => {
    dispatch(fetchComments(storyId));
  }, [dispatch, storyId]);

  const handlePostComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim()) return;
    dispatch(addComment({ storyId, content: newCommentText })).unwrap().then(() => {
      setNewCommentText('');
    });
  };

  const handleStartEdit = (comment: ExtendedComment) => {
    setEditingCommentId(comment.id);
    setEditingText(comment.content);
  };

  const handleSaveEdit = (id: number) => {
    if (!editingText.trim()) return;
    dispatch(editComment({ id, content: editingText })).unwrap().then(() => {
      setEditingCommentId(null);
      dispatch(fetchComments(storyId));
    });
  };

  const handleDelete = (id: number) => {
    dispatch(deleteComment(id)).unwrap().then(() => {
      dispatch(fetchComments(storyId));
    });
  };

  const handleReactionToggle = (commentId: number, emoji: string) => {
    if (!user) return;
    dispatch(reactToComment({ id: commentId, reaction: emoji })).unwrap().then(() => {
      // Reload comments to sync reaction state
      dispatch(fetchComments(storyId));
    });
  };

  return (
    <div className="flex flex-col h-full bg-[#FDFCFB]/95 border-l border-stone-200 w-full" id="comment_section_container">
      {/* Title & Stats */}
      <div className="p-4 border-b border-stone-200 flex items-center justify-between bg-white/30">
        <div>
          <h3 className="font-serif font-semibold text-[#1A1A1A] text-base italic">Discussion</h3>
          <span className="font-mono text-[9px] text-stone-400 font-bold tracking-widest uppercase">
            {comments.length} Logged{comments.length !== 1 ? 's' : ' Note'}
          </span>
        </div>
      </div>

      {/* Main Comment Flow List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5" id="comments_flow_list">
        {!commentsEnabled ? (
          <div className="flex flex-col items-center justify-center py-10 text-center rounded-none bg-stone-50 border border-stone-200 p-4">
            <ShieldAlert className="h-7 w-7 text-stone-400 mb-2" />
            <h4 className="text-sm font-semibold font-serif text-stone-800">Comments Locked</h4>
            <p className="text-[11px] text-stone-500 font-serif font-light mt-1">The author has restricted commenting privileges for this story.</p>
          </div>
        ) : comments.length === 0 ? (
          <div className="text-center py-12 text-stone-400 text-xs font-mono uppercase tracking-wider">
            No comments yet. Start the commentary loop below!
          </div>
        ) : (
          comments.map((comment) => {
            const isCommentOwner = user ? comment.userId === user.id : false;
            const canDelete = isCommentOwner || isAuthor;

            return (
              <div key={comment.id} className="relative group flex items-start space-x-3 border border-stone-200/50 bg-white/60 p-3" id={`comment_row_${comment.id}`}>
                {/* Avatar */}
                <img
                  src={comment.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${comment.username}`}
                  alt={comment.username}
                  referrerPolicy="no-referrer"
                  className="h-7 w-7 rounded-none border border-stone-350 object-cover mt-0.5 bg-stone-100"
                />

                <div className="flex-1 space-y-1">
                  {/* Metadata */}
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-stone-700">{comment.username}</span>
                    <span className="text-[9px] text-stone-400 font-mono">
                      {new Date(comment.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  {editingCommentId === comment.id ? (
                    /* Edit State Form */
                    <div className="mt-1 space-y-1.5 bg-stone-50 p-2.5 rounded-none border border-stone-200">
                      <textarea
                        value={editingText}
                        onChange={(e) => setEditingText(e.target.value)}
                        rows={2}
                        className="w-full text-xs font-serif bg-white border border-stone-300 p-2 focus:outline-none focus:border-stone-900"
                      />
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={() => setEditingCommentId(null)}
                          className="p-1 px-2.5 rounded-none text-[9px] uppercase tracking-wider font-semibold text-stone-500 hover:text-stone-800 transition"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleSaveEdit(comment.id)}
                          className="p-1 px-2.5 bg-stone-900 border border-stone-955 text-[#F9F7F2] rounded-none text-[9px] uppercase tracking-wider font-semibold hover:bg-stone-850 transition"
                        >
                          Save
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Display State & Reactions */
                    <div className="space-y-2">
                      <p className="text-xs text-stone-800 font-serif italic font-light whitespace-pre-wrap leading-relaxed">"{comment.content}"</p>
                      
                      {/* Active reaction pills */}
                      <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                        {comment.reactions && comment.reactions.map((r) => {
                          const userHasReacted = user ? r.userIds.includes(user.id) : false;
                          return (
                            <button
                              key={r.reaction}
                              onClick={() => handleReactionToggle(comment.id, r.reaction)}
                              className={`flex items-center space-x-1 rounded-none px-2 py-0.5 text-[9px] border transition ${
                                userHasReacted 
                                  ? 'bg-[#1A1A1A] border-stone-900 text-white' 
                                  : 'bg-stone-50/50 hover:bg-stone-100 border-stone-200 text-stone-500'
                              }`}
                            >
                              <span>{r.reaction}</span>
                              <span className="font-mono text-[9px] font-bold">{r.count}</span>
                            </button>
                          );
                        })}

                        {/* Inline reaction picker trigger */}
                        {user && (
                          <div className="relative inline-block dropdown group-hover:opacity-100 md:opacity-0 transition">
                            <button 
                              className="rounded-none border border-stone-300 bg-white w-4 h-4 flex items-center justify-center text-stone-400 hover:text-stone-700 hover:bg-stone-100 text-[9px]"
                              title="React"
                            >
                              <Smile className="h-3 w-3" />
                            </button>
                            <div className="hidden hover:flex group-hover:block absolute left-0 bottom-6 bg-[#FDFCFB] border border-stone-300 rounded-none py-1 px-1.5 shadow-sm flex items-center space-x-1 z-30">
                              {COMMON_REACTIONS.map(emoji => (
                                <button
                                  key={emoji}
                                  onClick={() => handleReactionToggle(comment.id, emoji)}
                                  className="hover:scale-125 transition text-sm p-1"
                                >
                                  {emoji}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Hover controls */}
                {!editingCommentId && (isCommentOwner || canDelete) && (
                  <div className="absolute right-1 top-1 hidden group-hover:flex items-center space-x-1.5 bg-white/95 border border-stone-200 pl-2 pr-1 py-0.5">
                    {isCommentOwner && (
                      <button
                        onClick={() => handleStartEdit(comment)}
                        className="p-1 text-stone-400 hover:text-stone-800 transition"
                        title="Edit comment"
                      >
                        <Edit2 className="h-3 w-3" />
                      </button>
                    )}
                    {canDelete && (
                      <button
                        onClick={() => handleDelete(comment.id)}
                        className="p-1 text-stone-400 hover:text-red-700 transition"
                        title="Delete comment"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Input box */}
      {commentsEnabled && user && (
        <form onSubmit={handlePostComment} className="p-4 border-t border-stone-200 bg-stone-50/50" id="comment_post_form">
          <div className="flex items-center space-x-2 rounded-none border border-stone-300 bg-white p-1.5 focus-within:border-stone-900 transition">
            <input
              type="text"
              placeholder="Provide clean feedback..."
              value={newCommentText}
              onChange={(e) => setNewCommentText(e.target.value)}
              className="w-full text-xs bg-transparent px-2 text-stone-800 placeholder-stone-400 focus:outline-none tracking-wide"
              id="comment_input_box"
            />
            <button
              type="submit"
              disabled={!newCommentText.trim()}
              className="flex h-7 w-7 items-center justify-center rounded-none bg-[#1A1A1A] text-white hover:bg-stone-850 disabled:bg-stone-50 disabled:text-stone-300 border border-stone-955"
              id="comment_submit_btn"
            >
              <Send className="h-3 w-3" />
            </button>
          </div>
        </form>
      )}

      {commentsEnabled && !user && (
        <div className="p-4 border-t border-gray-50 bg-gray-50 text-center text-xs text-gray-500">
          Please log in to participate in the feedback thread.
        </div>
      )}
    </div>
  );
}
