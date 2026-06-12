import React from 'react';
import { X, Copy, Check, Twitter, Facebook, Link2 } from 'lucide-react';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  storyTitle: string;
  shareToken: string;
}

export default function ShareModal({ isOpen, onClose, storyTitle, shareToken }: ShareModalProps) {
  const [copied, setCopied] = React.useState(false);

  if (!isOpen) return null;

  // Use the actual APP_URL if set, otherwise fallback to development address
  const baseAppUrl = window.location.origin;
  const shareUrl = `${baseAppUrl}/story/share/${shareToken}`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareToX = () => {
    const text = `Read or collaborate on our story "${storyTitle}" on CoWrite! ✍️`;
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(shareUrl)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const shareToFacebook = () => {
    const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-950/40 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-gray-100 bg-white p-6 shadow-2xl animate-scale-up">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-gray-50">
          <div>
            <h3 className="font-sans font-bold text-lg text-gray-950">Share this Story</h3>
            <p className="text-xs text-gray-500">Allow others to read or co-write with this link.</p>
          </div>
          <button 
            onClick={onClose}
            className="rounded-lg p-1 text-gray-400 hover:bg-gray-50 hover:text-gray-700 transition"
            id="share_close_btn"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Link Section */}
        <div className="mt-5">
          <label className="text-xs font-mono font-semibold text-gray-500 uppercase tracking-widest block mb-2">Collaboration Link</label>
          <div className="flex items-center space-x-2 rounded-xl border border-gray-100 bg-gray-50/50 p-1.5 focus-within:border-gray-200 focus-within:ring-2 focus-within:ring-gray-100 transition">
            <div className="flex items-center pl-2.5 text-gray-400">
              <Link2 className="h-4 w-4" />
            </div>
            <input 
              type="text" 
              readOnly 
              value={shareUrl}
              className="w-full bg-transparent px-2 text-sm text-gray-700 focus:outline-none select-all"
              id="share_direct_url_input"
            />
            <button
              onClick={copyToClipboard}
              className="flex items-center space-x-1.5 rounded-lg bg-gray-950 hover:bg-gray-900 px-3 py-1.5 text-xs font-medium text-white transition shrink-0 shadow-sm"
              id="share_copy_btn"
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5" />
                  <span>Copied</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Social Share buttons */}
        <div className="mt-6">
          <span className="text-xs font-mono font-semibold text-gray-500 uppercase tracking-widest block mb-3">Share on Socials</span>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={shareToX}
              className="flex items-center justify-center space-x-2 rounded-xl border border-gray-100 bg-white hover:bg-gray-50 py-2.5 text-sm font-medium text-gray-700 transition shadow-sm hover:border-gray-200"
              id="share_x_btn"
            >
              <Twitter className="h-4 w-4 text-sky-500" />
              <span>X (Twitter)</span>
            </button>
            
            <button
              onClick={shareToFacebook}
              className="flex items-center justify-center space-x-2 rounded-xl border border-gray-100 bg-white hover:bg-gray-50 py-2.5 text-sm font-medium text-gray-700 transition shadow-sm hover:border-gray-200"
              id="share_fb_btn"
            >
              <Facebook className="h-4 w-4 text-blue-600" />
              <span>Facebook</span>
            </button>
          </div>
        </div>

        <div className="mt-6 rounded-xl bg-amber-50/50 p-3.5 border border-amber-100/50 flex items-start space-x-2.5">
          <div className="text-amber-600 text-sm mt-0.5">💡</div>
          <p className="text-xs text-amber-800 leading-relaxed">
            Anyone with this link can view the story. Authors and active collaborators have full clearance to edit live or restore snapshots.
          </p>
        </div>
      </div>
    </div>
  );
}
