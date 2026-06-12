/**
 * Collaborative Storytelling App Shared Types
 */

export interface User {
  id: number;
  username: string;
  email: string;
  passwordHash: string;
  avatarUrl: string | null;
  createdAt: string;
}

export interface Story {
  id: number;
  title: string;
  content: string;
  authorId: number;
  commentsEnabled: boolean;
  shareToken: string; // UUID/Random string
  createdAt: string;
  updatedAt: string;
}

export interface Contributor {
  id: number;
  storyId: number;
  userId: number;
}

export interface Comment {
  id: number;
  storyId: number;
  userId: number;
  content: string;
  createdAt: string;
}

export interface CommentReaction {
  id: number;
  commentId: number;
  userId: number;
  reaction: string; // Emoji or string like "like", "love", "funny"
}

export interface StoryVersion {
  id: number;
  storyId: number;
  content: string;
  createdBy: number;
  createdAt: string;
}

export interface RefreshToken {
  id: number;
  userId: number;
  token: string;
  expiresAt: string;
}

// Client-facing structures
export interface UserSession {
  accessToken: string;
  user: Omit<User, 'passwordHash'>;
}

export interface ExtendedStory extends Story {
  authorName: string;
  authorAvatar: string | null;
  contributors: { id: number; username: string; avatarUrl: string | null; userId: number }[];
}

export interface ExtendedComment extends Comment {
  username: string;
  avatarUrl: string | null;
  reactions: { reaction: string; count: number; userIds: number[] }[];
}
