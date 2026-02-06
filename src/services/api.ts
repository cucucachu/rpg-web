import type {
  User,
  WorldSummary,
  WorldDetail,
  Message,
  LoginRequest,
  RegisterRequest,
  TokenResponse,
} from '../types';

const API_BASE = '/api';

class ApiError extends Error {
  status: number;
  
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = 'ApiError';
  }
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = localStorage.getItem('token');
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  
  // Merge existing headers
  if (options.headers) {
    const existingHeaders = options.headers as Record<string, string>;
    Object.assign(headers, existingHeaders);
  }
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
    throw new ApiError(response.status, error.detail || 'Request failed');
  }
  
  return response.json();
}

// Auth endpoints
export const auth = {
  async register(data: RegisterRequest): Promise<TokenResponse> {
    const result = await request<TokenResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    localStorage.setItem('token', result.access_token);
    return result;
  },
  
  async login(data: LoginRequest): Promise<TokenResponse> {
    const result = await request<TokenResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    localStorage.setItem('token', result.access_token);
    return result;
  },
  
  async me(): Promise<User> {
    return request<User>('/auth/me');
  },
  
  logout() {
    localStorage.removeItem('token');
  },
  
  getToken(): string | null {
    return localStorage.getItem('token');
  },
  
  isAuthenticated(): boolean {
    return !!localStorage.getItem('token');
  },
};

// World endpoints
export interface CreateWorldResponse {
  id: string;
  name: string;
  description: string;
  role: string;
}

export const worlds = {
  async list(): Promise<WorldSummary[]> {
    return request<WorldSummary[]>('/worlds');
  },
  
  async get(worldId: string): Promise<WorldDetail> {
    return request<WorldDetail>(`/worlds/${worldId}`);
  },
  
  async create(name: string): Promise<CreateWorldResponse> {
    return request<CreateWorldResponse>('/worlds', {
      method: 'POST',
      body: JSON.stringify({ name }),
    });
  },
  
  async getMessages(
    worldId: string,
    options?: { limit?: number; before?: string }
  ): Promise<{ messages: Message[]; has_more: boolean; total: number }> {
    const params = new URLSearchParams();
    if (options?.limit) params.set('limit', String(options.limit));
    if (options?.before) params.set('before', options.before);
    
    const query = params.toString();
    return request(`/worlds/${worldId}/messages${query ? `?${query}` : ''}`);
  },
  
  async createWorldCode(
    worldId: string,
    options?: { max_uses?: number; expires_in_hours?: number }
  ): Promise<{ code: string; world_id: string; expires_at: string | null; max_uses: number | null }> {
    return request(`/worlds/${worldId}/code`, {
      method: 'POST',
      body: JSON.stringify(options || {}),
    });
  },
  
  async join(code: string): Promise<{ world_id: string; world_name: string; role: string }> {
    return request('/worlds/join', {
      method: 'POST',
      body: JSON.stringify({ code }),
    });
  },
  
  async setCharacter(worldId: string, characterId: string): Promise<void> {
    await request(`/worlds/${worldId}/character?character_id=${characterId}`, {
      method: 'PATCH',
    });
  },
};

// Message endpoints (new architecture)
export interface SendMessageResponse {
  user_message: Message;
  gm_message: Message | null;
}

export const messages = {
  /**
   * Send a message to the GM agent.
   * This is a BLOCKING call that waits for the agent to respond.
   * May take 10-60 seconds depending on agent complexity.
   */
  async send(worldId: string, content: string): Promise<SendMessageResponse> {
    return request<SendMessageResponse>(`/worlds/${worldId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    });
  },
  
  /**
   * Get message history for a world.
   */
  async getHistory(
    worldId: string,
    options?: { limit?: number; before?: string }
  ): Promise<{ messages: Message[]; has_more: boolean; total: number }> {
    const params = new URLSearchParams();
    if (options?.limit) params.set('limit', String(options.limit));
    if (options?.before) params.set('before', options.before);
    
    const query = params.toString();
    return request(`/worlds/${worldId}/messages${query ? `?${query}` : ''}`);
  },
  
  /**
   * Get processing status for a world.
   */
  async getStatus(worldId: string): Promise<{ world_id: string; processing: boolean }> {
    return request(`/worlds/${worldId}/messages/status`);
  },
  
  /**
   * Create an SSE connection for streaming messages.
   * Returns an EventSource that emits:
   * - message: New message added
   * - status: Processing status changed
   * - ping: Keep-alive
   */
  createStream(worldId: string): EventSource {
    const token = localStorage.getItem('token');
    // Note: EventSource doesn't support custom headers, so we pass token as query param
    const url = `${API_BASE}/worlds/${worldId}/messages/stream?token=${token}`;
    return new EventSource(url);
  },
};

// Event types
export interface GameEvent {
  id: string;
  world_id: string;
  game_time: number;
  location_id?: string | null;
  name: string;
  description: string;
  participants: string;
  changes: string;
  tags: string[];
  created_at?: string | null;
}

export interface EventsListResponse {
  events: GameEvent[];
  total: number;
  has_more: boolean;
}

// Events API (game events from MCP)
export const events = {
  /**
   * Get events for a world.
   * Returns newest events, displayed in chronological order (oldest at top).
   * Use 'before' to load older events.
   */
  async list(
    worldId: string,
    options?: { limit?: number; before?: string }
  ): Promise<EventsListResponse> {
    const params = new URLSearchParams();
    if (options?.limit) params.set('limit', String(options.limit));
    if (options?.before) params.set('before', options.before);
    
    const query = params.toString();
    return request<EventsListResponse>(`/worlds/${worldId}/events${query ? `?${query}` : ''}`);
  },
  
  /**
   * Create an SSE connection for streaming events.
   * Returns an EventSource that emits:
   * - connected: Connection established
   * - event: New event recorded
   * - error: Stream error
   */
  createStream(worldId: string): EventSource {
    const token = localStorage.getItem('token');
    const url = `${API_BASE}/worlds/${worldId}/events/stream?token=${token}`;
    return new EventSource(url);
  },
};

// Agent activity types
export interface AgentActivity {
  id: string;
  world_id: string;
  node_name: string;
  activity_type: string;
  content: string;
  created_at: string;
}

// Agent activity API (internal agent state streaming)
export const activity = {
  /**
   * Create an SSE connection for streaming agent activity.
   * Returns an EventSource that emits:
   * - activity: New agent activity record
   * - ping: Keep-alive
   */
  createStream(worldId: string): EventSource {
    const token = localStorage.getItem('token');
    const url = `${API_BASE}/worlds/${worldId}/activity/stream?token=${token}`;
    return new EventSource(url);
  },
};

export { ApiError };
