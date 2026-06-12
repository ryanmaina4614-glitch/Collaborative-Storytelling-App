import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { dbService } from './src/db.ts';
import { createServer as createViteServer } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);

// Use a fallback JWT secret if not configured in .env
const JWT_SECRET = process.env.JWT_SECRET || 'storytelling_super_secret_jwt_key';
const REFRESH_SECRET = process.env.REFRESH_SECRET || 'storytelling_super_secret_refresh_key';
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));

// Setup socket.io
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Middleware for authentication
export const requireAuth = (req: any, res: any, next: any) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Missing or invalid token format' });
  }

  const token = authHeader.split('Bearer ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    req.userId = decoded.userId;
    req.userEmail = decoded.email;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Unauthorized: Invalid or expired token' });
  }
};

// --- AUTHENTICATION ENDPOINTS ---

// Register
app.post('/api/register', (req, res) => {
  try {
    const { username, email, password } = req.body;
    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Username, email and password are required' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    if (dbService.getUserByEmail(normalizedEmail)) {
      return res.status(400).json({ error: 'Email already exists' });
    }

    if (dbService.getUserByUsername(username.trim())) {
      return res.status(400).json({ error: 'Username already taken' });
    }

    const salt = bcrypt.genSaltSync(10);
    const passwordHash = bcrypt.hashSync(password, salt);

    const newUser = dbService.addUser({
      username: username.trim(),
      email: normalizedEmail,
      passwordHash,
      avatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(username.trim())}`,
    });

    const accessToken = jwt.sign({ userId: newUser.id, email: newUser.email }, JWT_SECRET, { expiresIn: '15m' });
    const refreshToken = jwt.sign({ userId: newUser.id }, REFRESH_SECRET, { expiresIn: '7d' });

    dbService.addRefreshToken(newUser.id, refreshToken, new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString());

    const { passwordHash: _, ...userWithoutPassword } = newUser;
    res.status(201).json({
      accessToken,
      refreshToken,
      user: userWithoutPassword
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Login
app.post('/api/login', (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = dbService.getUserByEmail(email.toLowerCase().trim());
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const validPassword = bcrypt.compareSync(password, user.passwordHash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const accessToken = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: '15m' });
    const refreshToken = jwt.sign({ userId: user.id }, REFRESH_SECRET, { expiresIn: '7d' });

    dbService.addRefreshToken(user.id, refreshToken, new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString());

    const { passwordHash: _, ...userWithoutPassword } = user;
    res.json({
      accessToken,
      refreshToken,
      user: userWithoutPassword
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Refresh Token
app.post('/api/refresh', (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token is required' });
    }

    const savedToken = dbService.getRefreshToken(refreshToken);
    if (!savedToken || new Date(savedToken.expiresAt) < new Date()) {
      if (savedToken) dbService.deleteRefreshToken(refreshToken);
      return res.status(401).json({ error: 'Invalid or expired refresh token' });
    }

    try {
      const decoded = jwt.verify(refreshToken, REFRESH_SECRET) as any;
      const user = dbService.getUserById(decoded.userId);
      if (!user) {
         return res.status(401).json({ error: 'User associated with token not found' });
      }

      const accessToken = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: '15m' });
      res.json({ accessToken });
    } catch (e) {
      return res.status(401).json({ error: 'Invalid refresh token signature' });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Logout
app.post('/api/logout', (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (refreshToken) {
      dbService.deleteRefreshToken(refreshToken);
    }
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --- STORIES ENDPOINTS ---

// Get all stories
app.get('/api/stories', (req, res) => {
  try {
    const { search, myOwn, contributed } = req.query;
    const storiesList = dbService.stories;
    const users = dbService.users;
    const allContributors = dbService.contributors;

    let filtered = [...storiesList];

    // Simple search
    if (search) {
      const q = String(search).toLowerCase();
      filtered = filtered.filter(s => s.title.toLowerCase().includes(q) || s.content.toLowerCase().includes(q));
    }

    // Extended mapping
    let extendedStories = filtered.map(story => {
      const author = users.find(u => u.id === story.authorId);
      const contribs = allContributors
        .filter(c => c.storyId === story.id)
        .map(c => {
          const u = users.find(usr => usr.id === c.userId);
          return {
            id: c.id,
            userId: c.userId,
            username: u ? u.username : 'Unknown',
            avatarUrl: u ? u.avatarUrl : null
          };
        });

      return {
        ...story,
        authorName: author ? author.username : 'Unknown Author',
        authorAvatar: author ? author.avatarUrl : null,
        contributors: contribs
      };
    });

    // Filters (requires authentication context usually, but we check query flags first)
    // If auth header is passed, decrypt to support filtering
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.split('Bearer ')[1];
        const decoded = jwt.verify(token, JWT_SECRET) as any;
        const currentUserId = decoded.userId;

        if (myOwn === 'true') {
          extendedStories = extendedStories.filter(s => s.authorId === currentUserId);
        } else if (contributed === 'true') {
          extendedStories = extendedStories.filter(s => 
            s.authorId === currentUserId || s.contributors.some(c => c.userId === currentUserId)
          );
        }
      } catch (e) {
        // Carry on with unfiltered or ignore filter requests on auth error
      }
    }

    res.json(extendedStories);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get a single story by ID (or Share Token!)
app.get('/api/stories/:id', (req, res) => {
  try {
    const idParam = req.params.id;
    let story = null;

    // Check if ID is numeric, otherwise check share token
    if (/^\d+$/.test(idParam)) {
      story = dbService.getStoryById(parseInt(idParam));
    } else {
      story = dbService.getStoryByShareToken(idParam);
    }

    if (!story) {
      return res.status(404).json({ error: 'Story not found' });
    }

    const author = dbService.users.find(u => u.id === story!.authorId);
    const contributors = dbService.contributors
      .filter(c => c.storyId === story!.id)
      .map(c => {
        const u = dbService.users.find(usr => usr.id === c.userId);
        return {
          id: c.id,
          userId: c.userId,
          username: u ? u.username : 'Unknown',
          avatarUrl: u ? u.avatarUrl : null
        };
      });

    const extendedStory = {
      ...story,
      authorName: author ? author.username : 'Unknown Author',
      authorAvatar: author ? author.avatarUrl : null,
      contributors
    };

    res.json(extendedStory);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Create Story
app.post('/api/stories', requireAuth, (req: any, res) => {
  try {
    const { title, content, commentsEnabled } = req.body;
    if (!title || content === undefined) {
      return res.status(400).json({ error: 'Title and content are required' });
    }

    const story = dbService.addStory({
      title: title.trim(),
      content: content,
      authorId: req.userId,
      commentsEnabled: commentsEnabled !== false
    });

    // Automatically save version 1
    dbService.addVersion(story.id, content, req.userId);

    res.status(201).json(story);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Update Story (Author or Contributor)
app.patch('/api/stories/:id', requireAuth, (req: any, res) => {
  try {
    const storyId = parseInt(req.params.id);
    const story = dbService.getStoryById(storyId);
    if (!story) {
      return res.status(404).json({ error: 'Story not found' });
    }

    // Auth rules check: Must be author or contributor
    const isAuthor = story.authorId === req.userId;
    const isContributor = dbService.contributors.some(
      c => c.storyId === storyId && c.userId === req.userId
    );

    if (!isAuthor && !isContributor) {
      return res.status(403).json({ error: 'Forbidden: Only Author or Contributors can edit stories' });
    }

    const { title, content, commentsEnabled } = req.body;
    const previousContent = story.content;

    const updated = dbService.updateStory(storyId, {
      title: title !== undefined ? title.trim() : story.title,
      content: content !== undefined ? content : story.content,
      commentsEnabled: commentsEnabled !== undefined ? commentsEnabled : story.commentsEnabled
    });

    // Save a new version if content changed
    if (content !== undefined && content !== previousContent) {
      dbService.addVersion(storyId, content, req.userId);
    }

    // Broad socket message to notify room users of update
    io.to(`story-${storyId}`).emit('storyUpdated', {
      storyId,
      content: content !== undefined ? content : story.content,
      updatedBy: req.userId,
      title: title !== undefined ? title.trim() : story.title
    });

    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Delete Story (Author only)
app.delete('/api/stories/:id', requireAuth, (req: any, res) => {
  try {
    const storyId = parseInt(req.params.id);
    const story = dbService.getStoryById(storyId);
    if (!story) {
      return res.status(404).json({ error: 'Story not found' });
    }

    // Author only
    if (story.authorId !== req.userId) {
      return res.status(403).json({ error: 'Forbidden: Only the Author can delete this story' });
    }

    dbService.deleteStory(storyId);
    res.json({ success: true, message: 'Story deleted successfully' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});


// --- CONTRIBUTORS ENDPOINTS ---

// Add contributor
app.post('/api/contributors', requireAuth, (req: any, res) => {
  try {
    const { storyId, username } = req.body;
    if (!storyId || !username) {
      return res.status(400).json({ error: 'Story ID and Username are required' });
    }

    const story = dbService.getStoryById(parseInt(storyId));
    if (!story) {
      return res.status(404).json({ error: 'Story not found' });
    }

    // Only Author can add contributors
    if (story.authorId !== req.userId) {
      return res.status(403).json({ error: 'Forbidden: Only the Author can add collaborators' });
    }

    const userToAdd = dbService.getUserByUsername(username.trim());
    if (!userToAdd) {
      return res.status(404).json({ error: `User "${username}" not found` });
    }

    if (userToAdd.id === req.userId) {
      return res.status(400).json({ error: 'You are already the author of this story' });
    }

    const contrib = dbService.addContributor(story.id, userToAdd.id);
    if (!contrib) {
      return res.status(400).json({ error: 'Failed to add. User may already be a collaborator.' });
    }

    res.status(201).json({
      id: contrib.id,
      userId: userToAdd.id,
      username: userToAdd.username,
      avatarUrl: userToAdd.avatarUrl
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get contributors list by Story Id
app.get('/api/contributors/:storyId', (req, res) => {
  try {
    const storyId = parseInt(req.params.storyId);
    const contribs = dbService.getContributorsByStory(storyId).map(c => {
      const u = dbService.getUserById(c.userId);
      return {
        id: c.id,
        userId: c.userId,
        username: u ? u.username : 'Unknown',
        avatarUrl: u ? u.avatarUrl : null
      };
    });
    res.json(contribs);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Remove contributor (Author only)
app.delete('/api/contributors/:id', requireAuth, (req: any, res) => {
  try {
    const contribId = parseInt(req.params.id);
    const db = dbService;
    const list = db.contributors;
    const contr = list.find(c => c.id === contribId);

    if (!contr) {
      return res.status(404).json({ error: 'Contributor association not found' });
    }

    const story = db.getStoryById(contr.storyId);
    if (!story) {
      return res.status(404).json({ error: 'Story not found' });
    }

    // Author only or contributor removing themselves
    if (story.authorId !== req.userId && contr.userId !== req.userId) {
      return res.status(403).json({ error: 'Forbidden: Only the Author or the Collaborator themselves can remove collaboration' });
    }

    db.removeContributorById(contribId);
    res.json({ success: true, message: 'Contributor removed successfully' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});


// --- COMMENTS ENDPOINTS ---

// Get all comments for a story
app.get('/api/stories/:id/comments', (req, res) => {
  try {
    const storyId = parseInt(req.params.id);
    const commentsList = dbService.getCommentsByStory(storyId);
    const users = dbService.users;
    const reactions = dbService.commentReactions;

    const extendedComments = commentsList.map(comment => {
      const commenter = users.find(u => u.id === comment.userId);
      const commentReactions = reactions.filter(r => r.commentId === comment.id);

      // Group reactions
      const groupedMap = new Map<string, { reaction: string; count: number; userIds: number[] }>();
      commentReactions.forEach(r => {
        if (!groupedMap.has(r.reaction)) {
          groupedMap.set(r.reaction, { reaction: r.reaction, count: 0, userIds: [] });
        }
        const g = groupedMap.get(r.reaction)!;
        g.count++;
        g.userIds.push(r.userId);
      });

      return {
        ...comment,
        username: commenter ? commenter.username : 'Deleted User',
        avatarUrl: commenter ? commenter.avatarUrl : null,
        reactions: Array.from(groupedMap.values())
      };
    });

    res.json(extendedComments);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Post comment
app.post('/api/stories/:id/comments', requireAuth, (req: any, res) => {
  try {
    const storyId = parseInt(req.params.id);
    const { content } = req.body;
    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Comment content cannot be empty' });
    }

    const story = dbService.getStoryById(storyId);
    if (!story) {
      return res.status(404).json({ error: 'Story not found' });
    }

    if (!story.commentsEnabled) {
      return res.status(403).json({ error: 'Comments are disabled for this story' });
    }

    const newComment = dbService.addComment(storyId, req.userId, content.trim());
    const commenter = dbService.getUserById(req.userId);

    const extendedComment = {
      ...newComment,
      username: commenter ? commenter.username : 'Unknown',
      avatarUrl: commenter ? commenter.avatarUrl : null,
      reactions: []
    };

    res.status(201).json(extendedComment);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Edit comment
app.patch('/api/comments/:id', requireAuth, (req: any, res) => {
  try {
    const commentId = parseInt(req.params.id);
    const comment = dbService.comments.find(c => c.id === commentId);

    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    if (comment.userId !== req.userId) {
      return res.status(403).json({ error: 'Forbidden: You can only edit your own comments' });
    }

    const { content } = req.body;
    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Comment content cannot be empty' });
    }

    const updated = dbService.updateComment(commentId, content.trim());
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Delete comment
app.delete('/api/comments/:id', requireAuth, (req: any, res) => {
  try {
    const commentId = parseInt(req.params.id);
    const comment = dbService.comments.find(c => c.id === commentId);

    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    // Check if user is comment owner or story author
    const story = dbService.getStoryById(comment.storyId);
    const isStoryAuthor = story ? story.authorId === req.userId : false;

    if (comment.userId !== req.userId && !isStoryAuthor) {
      return res.status(403).json({ error: 'Forbidden: You can only delete your own comments, or if you are the story author' });
    }

    dbService.deleteComment(commentId);
    res.json({ success: true, message: 'Comment deleted successfully' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// React to Comment
app.post('/api/comments/:id/react', requireAuth, (req: any, res) => {
  try {
    const commentId = parseInt(req.params.id);
    const { reaction } = req.body; // e.g., '👍', '❤️', '😂', '😮'

    if (!reaction) {
      return res.status(400).json({ error: 'Reaction type is required' });
    }

    const comment = dbService.comments.find(c => c.id === commentId);
    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    const reactions = dbService.getReactionsByComment(commentId);
    const existing = reactions.find(r => r.userId === req.userId && r.reaction === reaction);

    if (existing) {
      dbService.removeReaction(commentId, req.userId);
    } else {
      dbService.addReaction(commentId, req.userId, reaction);
    }

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});


// --- VERSIONS ENDPOINTS ---

// Get all versions for a story
app.get('/api/stories/:id/versions', requireAuth, (req: any, res) => {
  try {
    const storyId = parseInt(req.params.id);
    const story = dbService.getStoryById(storyId);
    if (!story) {
      return res.status(404).json({ error: 'Story not found' });
    }

    // Auth verification: Author or Contributor
    const isAuthor = story.authorId === req.userId;
    const isContributor = dbService.contributors.some(
      c => c.storyId === storyId && c.userId === req.userId
    );

    if (!isAuthor && !isContributor) {
      return res.status(403).json({ error: 'Forbidden: Only collaborators can view version history' });
    }

    const dbVersions = dbService.getVersionsByStory(storyId);
    const users = dbService.users;

    const extendedVersions = dbVersions.map(v => {
      const creator = users.find(u => u.id === v.createdBy);
      return {
        ...v,
        creatorName: creator ? creator.username : 'Unknown'
      };
    }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    res.json(extendedVersions);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Restore version
app.post('/api/stories/:id/restore/:versionId', requireAuth, (req: any, res) => {
  try {
    const storyId = parseInt(req.params.id);
    const versionId = parseInt(req.params.versionId);

    const story = dbService.getStoryById(storyId);
    if (!story) {
      return res.status(404).json({ error: 'Story not found' });
    }

    // Auth verification: Author or Contributor
    const isAuthor = story.authorId === req.userId;
    const isContributor = dbService.contributors.some(
      c => c.storyId === storyId && c.userId === req.userId
    );

    if (!isAuthor && !isContributor) {
      return res.status(403).json({ error: 'Forbidden: Only collaborators can restore older versions' });
    }

    const versions = dbService.getVersionsByStory(storyId);
    const targetVersion = versions.find(v => v.id === versionId);
    if (!targetVersion) {
      return res.status(404).json({ error: 'Version not found' });
    }

    // Update story content to the target version
    const updated = dbService.updateStory(storyId, { content: targetVersion.content });
    
    // Add a new version indicating this restore event
    dbService.addVersion(storyId, targetVersion.content, req.userId);

    // Socket broadcast
    io.to(`story-${storyId}`).emit('storyUpdated', {
      storyId,
      content: targetVersion.content,
      updatedBy: req.userId,
      isRestored: true
    });

    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});


// --- PROFILE ENDPOINTS ---

// Get logged-in user profile, and their stories
app.get('/api/profile', requireAuth, (req: any, res) => {
  try {
    const user = dbService.getUserById(req.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const { passwordHash: _, ...userWithoutPassword } = user;

    // Get stories authored or contributed by user
    const authored = dbService.stories
      .filter(s => s.authorId === req.userId)
      .map(s => ({
        ...s,
        role: 'author' as const
      }));

    const collaborated = dbService.stories
      .filter(s => dbService.contributors.some(c => c.storyId === s.id && c.userId === req.userId))
      .map(s => ({
        ...s,
        role: 'contributor' as const
      }));

    res.json({
      user: userWithoutPassword,
      stories: [...authored, ...collaborated]
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Update Profile
app.patch('/api/profile', requireAuth, (req: any, res) => {
  try {
    const { username, avatarUrl } = req.body;
    const db = dbService;

    const updates: any = {};
    if (username) {
      const cleaned = username.trim();
      const existingUser = db.getUserByUsername(cleaned);
      if (existingUser && existingUser.id !== req.userId) {
        return res.status(400).json({ error: 'Username is already taken' });
      }
      updates.username = cleaned;
    }

    if (avatarUrl) {
      updates.avatarUrl = avatarUrl;
    }

    const updated = db.updateUser(req.userId, updates);
    if (!updated) {
      return res.status(404).json({ error: 'User not found' });
    }

    const { passwordHash: _, ...userWithoutPassword } = updated;
    res.json(userWithoutPassword);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Avatar upload (Base64 is directly supported)
app.post('/api/profile/avatar', requireAuth, (req: any, res) => {
  try {
    const { avatarBase64 } = req.body;
    if (!avatarBase64) {
      return res.status(400).json({ error: 'Avatar base64 image content is required' });
    }

    // We emulate a Cloudinary upload by returning the base64 or caching it safely.
    // In our JSON database, we can update user profile's avatarUrl directly with the data URI (base64).
    // This is super fast and requires no external keys!
    const updated = dbService.updateUser(req.userId, { avatarUrl: avatarBase64 });
    if (!updated) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ success: true, avatarUrl: avatarBase64 });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});


// --- REAL-TIME CHAT/COLLABORATION HANDLERS (SOCKET IO) ---

// Active cursor database (in-memory)
interface ActiveUserCursor {
  userId: number;
  username: string;
  avatarUrl: string | null;
  position: { line: number; ch: number } | number;
}

const activeCursorsMap = new Map<string, ActiveUserCursor[]>();

io.on('connection', (socket) => {
  let currentRoom: string | null = null;
  let currentUserData: { userId: number; username: string; avatarUrl: string | null } | null = null;

  // Join Story room
  socket.on('joinStory', ({ storyId, userId, username, avatarUrl }) => {
    const room = `story-${storyId}`;
    socket.join(room);
    currentRoom = room;

    currentUserData = { userId, username, avatarUrl };

    // Register active cursor
    if (!activeCursorsMap.has(room)) {
      activeCursorsMap.set(room, []);
    }
    
    // Remote client duplicate logins
    const currentList = activeCursorsMap.get(room)!;
    const existingIdx = currentList.findIndex(c => c.userId === userId);
    if (existingIdx !== -1) {
      currentList[existingIdx] = { userId, username, avatarUrl, position: 0 };
    } else {
      currentList.push({ userId, username, avatarUrl, position: 0 });
    }

    // Notify others in room
    io.to(room).emit('activeCollaborators', currentList);
    socket.to(room).emit('userJoined', { userId, username });
  });

  // Story updates (real-time live typing)
  socket.on('storyUpdate', ({ storyId, content, title }) => {
    const room = `story-${storyId}`;
    // Notify all other users in room
    socket.to(room).emit('storyUpdated', { storyId, content, updatedBy: currentUserData?.userId, title });
  });

  // Cursor updates
  socket.on('cursorMove', ({ storyId, userId, position }) => {
    const room = `story-${storyId}`;
    const list = activeCursorsMap.get(room);
    if (list) {
      const idx = list.findIndex(c => c.userId === userId);
      if (idx !== -1) {
        list[idx].position = position;
        // Broadcast cursors list to others
        socket.to(room).emit('cursorMoved', { userId, position, username: list[idx].username });
      }
    }
  });

  // Disconnect/leave
  const leaveFn = () => {
    if (currentRoom && currentUserData) {
      socket.leave(currentRoom);
      const list = activeCursorsMap.get(currentRoom);
      if (list) {
        const updatedList = list.filter(c => c.userId !== currentUserData!.userId);
        activeCursorsMap.set(currentRoom, updatedList);
        io.to(currentRoom).emit('activeCollaborators', updatedList);
        io.to(currentRoom).emit('userLeft', { userId: currentUserData!.userId, username: currentUserData!.username });
      }
    }
  };

  socket.on('leaveStory', leaveFn);
  socket.on('disconnect', leaveFn);
});


// --- INTEGRATE VITE FOR MIDDLEWARE ROUTING ---

const startServer = async () => {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Collaborative Storytelling Server running on port ${PORT}`);
  });
};

startServer().catch((e) => {
  console.error('Failed to start fullstack server:', e);
});
