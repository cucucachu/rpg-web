// User types
export interface User {
  id: string;
  email: string;
  display_name: string;
  created_at: string;
}

// World types
export interface WorldSummary {
  id: string;
  name: string;
  description: string;
  role: 'god' | 'mortal';
  character_id: string | null;
  character_name: string | null;
  last_activity: string | null;  // ISO timestamp of most recent message
  last_viewed: string | null;    // ISO timestamp when user last viewed this world
}

export interface WorldDetail extends WorldSummary {
  settings: Record<string, unknown>;
  game_time: number;
  character: Record<string, unknown> | null;
}

// Message types
export interface Message {
  id: string;
  world_id: string;
  user_id: string | null;
  character_name: string;
  display_name: string | null;  // User's display name (for player messages)
  content: string;
  message_type: 'player' | 'gm' | 'system';
  created_at: string;
}

// WebSocket event types
export interface WSPlayerMessage {
  type: 'player_message';
  user_id: string;
  character_name: string;
  content: string;
  created_at: string;
}

export interface WSGMChunk {
  type: 'gm_chunk';
  content: string;
}

export interface WSGMDone {
  type: 'gm_done';
}

export interface WSToolCall {
  type: 'tool_call';
  tool_name: string;
  tool_args: Record<string, unknown>;
}

export interface WSToolResult {
  type: 'tool_result';
  tool_name: string;
}

export interface WSConnected {
  type: 'connected';
  users: { user_id: string; character_name: string }[];
  your_character: string;
}

export interface WSUserJoined {
  type: 'user_joined';
  user_id: string;
  character_name: string;
}

export interface WSUserLeft {
  type: 'user_left';
  user_id: string;
  character_name: string;
}

export interface WSError {
  type: 'error';
  content: string;
}

export type WSEvent =
  | WSPlayerMessage
  | WSGMChunk
  | WSGMDone
  | WSToolCall
  | WSToolResult
  | WSConnected
  | WSUserJoined
  | WSUserLeft
  | WSError;

// Bug report types
export interface BugReport {
  id: string;
  trace_id: string;
  user_id: string;
  description: string;
}

// Auth types
export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  display_name: string;
  invite_code: string;  // Required - gates who can create accounts
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  user: User;
}
