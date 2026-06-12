import { configureStore, createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { User, Story, Comment, ExtendedStory, ExtendedComment } from '../types.ts';

// Helper for calling API with token and handling token expiry / refresh
const apiRequest = async (url: string, options: RequestInit = {}): Promise<any> => {
  let accessToken = localStorage.getItem('accessToken');
  
  const headers = new Headers(options.headers || {});
  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }
  
  let response = await fetch(url, { ...options, headers });
  
  // If 401, try to refresh token
  if (response.status === 401) {
    const refreshToken = localStorage.getItem('refreshToken');
    if (refreshToken) {
      try {
        const refreshRes = await fetch('/api/refresh', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken })
        });
        
        if (refreshRes.ok) {
          const { accessToken: newAccessToken } = await refreshRes.json();
          localStorage.setItem('accessToken', newAccessToken);
          
          // Retry original request with new token
          headers.set('Authorization', `Bearer ${newAccessToken}`);
          response = await fetch(url, { ...options, headers });
        } else {
          // Refresh token expired or invalid - clear log in state
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          localStorage.removeItem('user');
          window.location.reload();
        }
      } catch (e) {
        console.error('Refresh token failed', e);
      }
    }
  }
  
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'API Request failed');
  }
  return data;
};

// --- AUTHENTICATION ASYNC THUNKS ---

export const login = createAsyncThunk(
  'auth/login',
  async (credentials: { email: string; password: string }) => {
    const data = await apiRequest('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials)
    });
    
    // Save to localStorage
    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    localStorage.setItem('user', JSON.stringify(data.user));
    
    return data;
  }
);

export const register = createAsyncThunk(
  'auth/register',
  async (fields: { username: string; email: string; password: string }) => {
    const data = await apiRequest('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fields)
    });
    
    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    localStorage.setItem('user', JSON.stringify(data.user));
    
    return data;
  }
);

export const logout = createAsyncThunk(
  'auth/logout',
  async () => {
    const refreshToken = localStorage.getItem('refreshToken');
    try {
      await apiRequest('/api/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken })
      });
    } catch (e) {
      // Ignore auth logout errors (e.g. if already expired)
    }
    
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
  }
);

export const updateProfile = createAsyncThunk(
  'auth/updateProfile',
  async (fields: { username?: string; avatarUrl?: string }) => {
    const user = await apiRequest('/api/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fields)
    });
    localStorage.setItem('user', JSON.stringify(user));
    return user;
  }
);

export const uploadAvatar = createAsyncThunk(
  'auth/uploadAvatar',
  async (avatarBase64: string) => {
    const data = await apiRequest('/api/profile/avatar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ avatarBase64 })
    });
    // Update token cached user
    const cached = localStorage.getItem('user');
    if (cached) {
      const parsed = JSON.parse(cached);
      parsed.avatarUrl = data.avatarUrl;
      localStorage.setItem('user', JSON.stringify(parsed));
    }
    return data.avatarUrl;
  }
);

// --- STORIES ASYNC THUNKS ---

export const fetchStories = createAsyncThunk(
  'stories/fetchStories',
  async (filters: { search?: string; myOwn?: boolean; contributed?: boolean } = {}) => {
    const query = new URLSearchParams();
    if (filters.search) query.append('search', filters.search);
    if (filters.myOwn) query.append('myOwn', 'true');
    if (filters.contributed) query.append('contributed', 'true');
    
    return await apiRequest(`/api/stories?${query.toString()}`);
  }
);

export const fetchStory = createAsyncThunk(
  'stories/fetchStory',
  async (idOrToken: string | number) => {
    return await apiRequest(`/api/stories/${idOrToken}`);
  }
);

export const createStory = createAsyncThunk(
  'stories/createStory',
  async (story: { title: string; content: string; commentsEnabled: boolean }) => {
    return await apiRequest('/api/stories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(story)
    });
  }
);

export const updateStory = createAsyncThunk(
  'stories/updateStory',
  async ({ id, fields }: { id: number; fields: { title?: string; content?: string; commentsEnabled?: boolean } }) => {
    return await apiRequest(`/api/stories/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fields)
    });
  }
);

export const deleteStory = createAsyncThunk(
  'stories/deleteStory',
  async (id: number) => {
    await apiRequest(`/api/stories/${id}`, { method: 'DELETE' });
    return id;
  }
);

export const addContributor = createAsyncThunk(
  'stories/addContributor',
  async ({ storyId, username }: { storyId: number; username: string }) => {
    return await apiRequest('/api/contributors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ storyId, username })
    });
  }
);

export const removeContributor = createAsyncThunk(
  'stories/removeContributor',
  async (assocId: number) => {
    await apiRequest(`/api/contributors/${assocId}`, { method: 'DELETE' });
    return assocId;
  }
);

// --- COMMENTS ASYNC THUNKS ---

export const fetchComments = createAsyncThunk(
  'comments/fetchComments',
  async (storyId: number) => {
    return await apiRequest(`/api/stories/${storyId}/comments`);
  }
);

export const addComment = createAsyncThunk(
  'comments/addComment',
  async ({ storyId, content }: { storyId: number; content: string }) => {
    return await apiRequest(`/api/stories/${storyId}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content })
    });
  }
);

export const editComment = createAsyncThunk(
  'comments/editComment',
  async ({ id, content }: { id: number; content: string }) => {
    return await apiRequest(`/api/comments/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content })
    });
  }
);

export const deleteComment = createAsyncThunk(
  'comments/deleteComment',
  async (id: number) => {
    await apiRequest(`/api/comments/${id}`, { method: 'DELETE' });
    return id;
  }
);

export const reactToComment = createAsyncThunk(
  'comments/reactToComment',
  async ({ id, reaction }: { id: number; reaction: string }) => {
    await apiRequest(`/api/comments/${id}/react`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reaction })
    });
    return { id, reaction };
  }
);

// --- PROFILE ASYNC THUNKS ---

export const fetchProfile = createAsyncThunk(
  'profile/fetchProfile',
  async () => {
    return await apiRequest('/api/profile');
  }
);


// --- REDUX SLICES ---

// Auth Slice
const initialUser: Omit<User, 'passwordHash'> | null = (() => {
  try {
    const cached = localStorage.getItem('user');
    return cached ? JSON.parse(cached) : null;
  } catch (e) {
    return null;
  }
})();

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user: initialUser,
    accessToken: localStorage.getItem('accessToken') || null,
    isAuthenticated: !!localStorage.getItem('accessToken'),
    loading: false,
    error: null as string | null
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      // Login
      .addCase(login.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.accessToken = action.payload.accessToken;
        state.isAuthenticated = true;
      })
      .addCase(login.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Login failed';
      })
      // Register
      .addCase(register.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(register.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.accessToken = action.payload.accessToken;
        state.isAuthenticated = true;
      })
      .addCase(register.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Registration failed';
      })
      // Logout
      .addCase(logout.fulfilled, (state) => {
        state.user = null;
        state.accessToken = null;
        state.isAuthenticated = false;
      })
      // Update profile
      .addCase(updateProfile.fulfilled, (state, action) => {
        state.user = action.payload;
      })
      // Upload avatar
      .addCase(uploadAvatar.fulfilled, (state, action) => {
        if (state.user) {
          state.user.avatarUrl = action.payload;
        }
      });
  }
});

// Stories Slice
const storiesSlice = createSlice({
  name: 'stories',
  initialState: {
    stories: [] as ExtendedStory[],
    currentStory: null as ExtendedStory | null,
    loading: false,
    error: null as string | null
  },
  reducers: {
    localStoryUpdate: (state, action: PayloadAction<{ content: string; title?: string }>) => {
      if (state.currentStory) {
        state.currentStory.content = action.payload.content;
        if (action.payload.title !== undefined) {
          state.currentStory.title = action.payload.title;
        }
      }
    }
  },
  extraReducers: (builder) => {
    builder
      // Fetch Stories
      .addCase(fetchStories.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchStories.fulfilled, (state, action) => {
        state.loading = false;
        state.stories = action.payload;
      })
      .addCase(fetchStories.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch stories';
      })
      // Fetch Single Story
      .addCase(fetchStory.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchStory.fulfilled, (state, action) => {
        state.loading = false;
        state.currentStory = action.payload;
      })
      .addCase(fetchStory.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch story';
      })
      // Update Story
      .addCase(updateStory.fulfilled, (state, action) => {
        if (state.currentStory && state.currentStory.id === action.payload.id) {
          state.currentStory.content = action.payload.content;
          state.currentStory.title = action.payload.title;
          state.currentStory.commentsEnabled = action.payload.commentsEnabled;
        }
        const idx = state.stories.findIndex(s => s.id === action.payload.id);
        if (idx !== -1) {
          state.stories[idx] = { ...state.stories[idx], ...action.payload };
        }
      })
      // Delete Story
      .addCase(deleteStory.fulfilled, (state, action) => {
        state.stories = state.stories.filter(s => s.id !== action.payload);
        if (state.currentStory && state.currentStory.id === action.payload) {
          state.currentStory = null;
        }
      })
      // Add contributor
      .addCase(addContributor.fulfilled, (state, action) => {
        if (state.currentStory && state.currentStory.id === action.payload.storyId) {
          if (!state.currentStory.contributors) state.currentStory.contributors = [];
          state.currentStory.contributors.push(action.payload);
        }
      })
      // Remove contributor
      .addCase(removeContributor.fulfilled, (state, action) => {
        if (state.currentStory) {
          state.currentStory.contributors = state.currentStory.contributors.filter(
            c => c.id !== action.payload
          );
        }
      });
  }
});

// Comments Slice
const commentsSlice = createSlice({
  name: 'comments',
  initialState: {
    comments: [] as ExtendedComment[],
    loading: false
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      // Fetch Comments
      .addCase(fetchComments.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchComments.fulfilled, (state, action) => {
        state.loading = false;
        state.comments = action.payload;
      })
      .addCase(fetchComments.rejected, (state) => {
        state.loading = false;
      })
      // Add Comment
      .addCase(addComment.fulfilled, (state, action) => {
        state.comments.push(action.payload);
      })
      // Edit Comment
      .addCase(editComment.fulfilled, (state, action) => {
        const idx = state.comments.findIndex(c => c.id === action.payload.id);
        if (idx !== -1) {
          state.comments[idx].content = action.payload.content;
        }
      })
      // Delete Comment
      .addCase(deleteComment.fulfilled, (state, action) => {
        state.comments = state.comments.filter(c => c.id !== action.payload);
      });
  }
});

// Profile Slice
const profileSlice = createSlice({
  name: 'profile',
  initialState: {
    user: null as Omit<User, 'passwordHash'> | null,
    stories: [] as (Story & { role: 'author' | 'contributor' })[],
    loading: false
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchProfile.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchProfile.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.stories = action.payload.stories;
      })
      .addCase(fetchProfile.rejected, (state) => {
        state.loading = false;
      });
  }
});

// Export local story sync action
export const { localStoryUpdate } = storiesSlice.actions;

// Store configuration
export const store = configureStore({
  reducer: {
    auth: authSlice.reducer,
    stories: storiesSlice.reducer,
    comments: commentsSlice.reducer,
    profile: profileSlice.reducer
  }
});

// Type helpers
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
