import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import { 
  User, Story, Contributor, Comment, 
  CommentReaction, StoryVersion, RefreshToken 
} from './types.ts';

const DB_FILE = path.resolve(process.cwd(), 'db.json');

interface Schema {
  users: User[];
  stories: Story[];
  contributors: Contributor[];
  comments: Comment[];
  commentReactions: CommentReaction[];
  storyVersions: StoryVersion[];
  refreshTokens: RefreshToken[];
}

const emptySchema: Schema = {
  users: [],
  stories: [],
  contributors: [],
  comments: [],
  commentReactions: [],
  storyVersions: [],
  refreshTokens: []
};

// Seed Helper
function seedInitialData(schema: Schema): Schema {
  if (schema.users.length === 0) {
    const salt = bcrypt.genSaltSync(10);
    const passwordHash = bcrypt.hashSync('password123', salt);
    
    const u1: User = {
      id: 1,
      username: 'ryan_scribe',
      email: 'ryan@story.com',
      passwordHash,
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop',
      createdAt: new Date().toISOString()
    };
    
    const u2: User = {
      id: 2,
      username: 'alice_writer',
      email: 'alice@story.com',
      passwordHash,
      avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop',
      createdAt: new Date().toISOString()
    };
    
    const u3: User = {
      id: 3,
      username: 'bard_bob',
      email: 'bob@story.com',
      passwordHash,
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop',
      createdAt: new Date().toISOString()
    };

    schema.users = [u1, u2, u3];

    // Seed stories
    const s1: Story = {
      id: 1,
      title: 'The Whispering Shadows',
      content: 'Deep within the ancient forest of Eldervale, the trees did not merely grow; they watched. They whispered. It was said that the shadows here moved independent of the light, weaving stories of travelers who walked too far into the mist. Elena tightened her cloak, her heart hammering against her ribs, but her feet carried her forward anyway...',
      authorId: 1,
      commentsEnabled: true,
      shareToken: 'share-whispering-shadows',
      createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
      updatedAt: new Date(Date.now() - 3600000).toISOString()
    };

    const s2: Story = {
      id: 2,
      title: 'Neon Odyssey',
      content: 'Under the heavy mauve smog of Sector 9, Kai adjusted his cybernetic visor. Neon signs threw bright cyan and hot magenta light into the rain-slicked alley. The data shard was burning a hole in his pocket—literal heat from the encrypted core. He had twelve minutes to reach the uplink terminal before the corporate enforcers locked down the grid.',
      authorId: 2,
      commentsEnabled: true,
      shareToken: 'share-neon-odyssey',
      createdAt: new Date(Date.now() - 3600000 * 12).toISOString(),
      updatedAt: new Date(Date.now() - 3600000 * 2).toISOString()
    };

    schema.stories = [s1, s2];

    // Seed contributors
    schema.contributors = [
      { id: 1, storyId: 1, userId: 2 },
      { id: 2, storyId: 2, userId: 1 },
      { id: 3, storyId: 2, userId: 3 }
    ];

    // Seed comments
    schema.comments = [
      { id: 1, storyId: 1, userId: 2, content: 'This intro is fantastic! Love the suspense and sensory details of Elena.', createdAt: new Date(Date.now() - 3600000 * 10).toISOString() },
      { id: 2, storyId: 1, userId: 1, content: 'Thanks Alice! Im planning to write the next segment tonight.', createdAt: new Date(Date.now() - 3600000 * 9).toISOString() }
    ];

    // Seed versions
    schema.storyVersions = [
      { id: 1, storyId: 1, content: 'Deep within the ancient forest of Eldervale, the trees watched.', createdBy: 1, createdAt: new Date(Date.now() - 3600000 * 23).toISOString() }
    ];
  }
  return schema;
}

// Low-level read/write
export class Database {
  private schema: Schema | null = null;

  private load(): Schema {
    if (this.schema) return this.schema;

    try {
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        this.schema = JSON.parse(raw);
      } else {
        this.schema = JSON.parse(JSON.stringify(emptySchema));
      }
    } catch (e) {
      console.error('Error reading database file, using fallback empty schema', e);
      this.schema = JSON.parse(JSON.stringify(emptySchema));
    }

    // Always seed initial data if missing
    this.schema = seedInitialData(this.schema!);
    this.persist();
    return this.schema;
  }

  private persist() {
    if (!this.schema) return;
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(this.schema, null, 2), 'utf-8');
    } catch (e) {
      console.error('Failed to write database file', e);
    }
  }

  // Getters for individual collections
  get users(): User[] { return this.load().users; }
  get stories(): Story[] { return this.load().stories; }
  get contributors(): Contributor[] { return this.load().contributors; }
  get comments(): Comment[] { return this.load().comments; }
  get commentReactions(): CommentReaction[] { return this.load().commentReactions; }
  get storyVersions(): StoryVersion[] { return this.load().storyVersions; }
  get refreshTokens(): RefreshToken[] { return this.load().refreshTokens; }

  // Database operations
  
  // Users
  addUser(user: Omit<User, 'id' | 'createdAt'>): User {
    const db = this.load();
    const id = db.users.length > 0 ? Math.max(...db.users.map(u => u.id)) + 1 : 1;
    const newUser: User = {
      ...user,
      id,
      createdAt: new Date().toISOString()
    };
    db.users.push(newUser);
    this.persist();
    return newUser;
  }

  updateUser(id: number, fields: Partial<Omit<User, 'id' | 'createdAt'>>): User | null {
    const db = this.load();
    const idx = db.users.findIndex(u => u.id === id);
    if (idx === -1) return null;
    db.users[idx] = { ...db.users[idx], ...fields };
    this.persist();
    return db.users[idx];
  }

  getUserById(id: number): User | null {
    return this.users.find(u => u.id === id) || null;
  }

  getUserByEmail(email: string): User | null {
    return this.users.find(u => u.email.toLowerCase() === email.toLowerCase()) || null;
  }

  getUserByUsername(username: string): User | null {
    return this.users.find(u => u.username.toLowerCase() === username.toLowerCase()) || null;
  }

  // Stories
  addStory(story: Omit<Story, 'id' | 'createdAt' | 'updatedAt' | 'shareToken'>): Story {
    const db = this.load();
    const id = db.stories.length > 0 ? Math.max(...db.stories.map(s => s.id)) + 1 : 1;
    const shareToken = 'share_' + Math.random().toString(36).substring(2, 10);
    const newStory: Story = {
      ...story,
      id,
      shareToken,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    db.stories.push(newStory);
    this.persist();
    return newStory;
  }

  updateStory(id: number, fields: Partial<Pick<Story, 'title' | 'content' | 'commentsEnabled'>>): Story | null {
    const db = this.load();
    const idx = db.stories.findIndex(s => s.id === id);
    if (idx === -1) return null;
    db.stories[idx] = { 
      ...db.stories[idx], 
      ...fields,
      updatedAt: new Date().toISOString()
    };
    this.persist();
    return db.stories[idx];
  }

  deleteStory(id: number): boolean {
    const db = this.load();
    const len = db.stories.length;
    db.stories = db.stories.filter(s => s.id !== id);
    
    // Cascade delete contributors, comments, reactions, versions
    db.contributors = db.contributors.filter(c => c.storyId !== id);
    db.comments = db.comments.filter(c => c.storyId !== id);
    db.storyVersions = db.storyVersions.filter(v => v.storyId !== id);
    
    this.persist();
    return db.stories.length < len;
  }

  getStoryById(id: number): Story | null {
    return this.stories.find(s => s.id === id) || null;
  }

  getStoryByShareToken(token: string): Story | null {
    return this.stories.find(s => s.shareToken === token) || null;
  }

  // Contributors
  addContributor(storyId: number, userId: number): Contributor | null {
    const db = this.load();
    // Check if user is already contributor or the author
    const story = db.stories.find(s => s.id === storyId);
    if (!story) return null;
    if (story.authorId === userId) return null;

    const exists = db.contributors.find(c => c.storyId === storyId && c.userId === userId);
    if (exists) return exists;

    const id = db.contributors.length > 0 ? Math.max(...db.contributors.map(c => c.id)) + 1 : 1;
    const contrib = { id, storyId, userId };
    db.contributors.push(contrib);
    this.persist();
    return contrib;
  }

  removeContributor(storyId: number, userId: number): boolean {
    const db = this.load();
    const len = db.contributors.length;
    db.contributors = db.contributors.filter(c => !(c.storyId === storyId && c.userId === userId));
    this.persist();
    return db.contributors.length < len;
  }

  removeContributorById(id: number): boolean {
    const db = this.load();
    const len = db.contributors.length;
    db.contributors = db.contributors.filter(c => c.id !== id);
    this.persist();
    return db.contributors.length < len;
  }

  getContributorsByStory(storyId: number): Contributor[] {
    return this.contributors.filter(c => c.storyId === storyId);
  }

  // Comments
  addComment(storyId: number, userId: number, content: string): Comment {
    const db = this.load();
    const id = db.comments.length > 0 ? Math.max(...db.comments.map(c => c.id)) + 1 : 1;
    const newComment: Comment = {
      id,
      storyId,
      userId,
      content,
      createdAt: new Date().toISOString()
    };
    db.comments.push(newComment);
    this.persist();
    return newComment;
  }

  updateComment(id: number, content: string): Comment | null {
    const db = this.load();
    const idx = db.comments.findIndex(c => c.id === id);
    if (idx === -1) return null;
    db.comments[idx] = { ...db.comments[idx], content };
    this.persist();
    return db.comments[idx];
  }

  deleteComment(id: number): boolean {
    const db = this.load();
    const len = db.comments.length;
    db.comments = db.comments.filter(c => c.id !== id);
    // Delete associated reactions
    db.commentReactions = db.commentReactions.filter(r => r.commentId !== id);
    this.persist();
    return db.comments.length < len;
  }

  getCommentsByStory(storyId: number): Comment[] {
    return this.comments.filter(c => c.storyId === storyId);
  }

  // Comment Reactions
  addReaction(commentId: number, userId: number, reaction: string): CommentReaction {
    const db = this.load();
    // Remove if there is existing reaction by this user on this comment
    db.commentReactions = db.commentReactions.filter(
      r => !(r.commentId === commentId && r.userId === userId)
    );

    const id = db.commentReactions.length > 0 ? Math.max(...db.commentReactions.map(r => r.id)) + 1 : 1;
    const newReaction: CommentReaction = { id, commentId, userId, reaction };
    db.commentReactions.push(newReaction);
    this.persist();
    return newReaction;
  }

  removeReaction(commentId: number, userId: number): boolean {
    const db = this.load();
    const len = db.commentReactions.length;
    db.commentReactions = db.commentReactions.filter(
      r => !(r.commentId === commentId && r.userId === userId)
    );
    this.persist();
    return db.commentReactions.length < len;
  }

  getReactionsByComment(commentId: number): CommentReaction[] {
    return this.commentReactions.filter(r => r.commentId === commentId);
  }

  // Story Versions
  addVersion(storyId: number, content: string, createdBy: number): StoryVersion {
    const db = this.load();
    const id = db.storyVersions.length > 0 ? Math.max(...db.storyVersions.map(v => v.id)) + 1 : 1;
    const newVersion: StoryVersion = {
      id,
      storyId,
      content,
      createdBy,
      createdAt: new Date().toISOString()
    };
    db.storyVersions.push(newVersion);
    this.persist();
    return newVersion;
  }

  getVersionsByStory(storyId: number): StoryVersion[] {
    return this.storyVersions.filter(v => v.storyId === storyId);
  }

  // Refresh Tokens
  addRefreshToken(userId: number, token: string, expiresAt: string): RefreshToken {
    const db = this.load();
    // Clear old tokens for this user
    db.refreshTokens = db.refreshTokens.filter(t => t.userId !== userId);

    const id = db.refreshTokens.length > 0 ? Math.max(...db.refreshTokens.map(t => t.id)) + 1 : 1;
    const newRefreshToken: RefreshToken = { id, userId, token, expiresAt };
    db.refreshTokens.push(newRefreshToken);
    this.persist();
    return newRefreshToken;
  }

  getRefreshToken(token: string): RefreshToken | null {
    const db = this.load();
    return db.refreshTokens.find(t => t.token === token) || null;
  }

  deleteRefreshToken(token: string): boolean {
    const db = this.load();
    const len = db.refreshTokens.length;
    db.refreshTokens = db.refreshTokens.filter(t => t.token !== token);
    this.persist();
    return db.refreshTokens.length < len;
  }
}

export const dbService = new Database();
