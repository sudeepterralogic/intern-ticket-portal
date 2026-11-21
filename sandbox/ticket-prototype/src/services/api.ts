
import type {
  Category,
  CreateTicketInput,
  CreateUserInput,
  ManagedUser,
  Ticket,
  TicketPriority,
  TicketStatus,
  UpdateUserInput,
  UserRole,
} from '../types/ticket';

import {
  http,
  refreshAccessToken,
  setAccessToken,
  type LoginResponse,
} from './http';

// All API calls of the app. Each function uses the shared axios instance
// (services/http.ts), which attaches the token, refreshes it on 401 and
// turns every failure into an ApiError { status, message }.
//
// Components must NOT import axios; they dispatch Redux thunks (store/)
// or, for data not in the store yet (tickets, categories), call these.

export type { LoginResponse };

// ---------- Auth ----------

// POST /auth/login -> access token in the body, refresh token set as a cookie
export async function loginUser(username: string, password: string): Promise<LoginResponse> {
  const { data } = await http.post<LoginResponse>('/auth/login', { username, password });
  setAccessToken(data.access_token);
  return data;
}

// POST /auth/refresh -> new access token from the cookie, or null if not logged in
export function refreshSession(): Promise<LoginResponse | null> {
  return refreshAccessToken();
}

// POST /auth/logout -> server revokes the refresh token and clears the cookie
export async function logoutUser(): Promise<void> {
  setAccessToken(null);
  await http.post('/auth/logout').catch(() => undefined);
}

// ---------- Tickets ----------

// The backend uses enum values (OPEN, MEDIUM...), the UI uses labels (Open, Medium...)
const STATUS_LABELS: Record<string, TicketStatus> = {
  OPEN: 'Open',
  IN_PROGRESS: 'In Progress',
  CLOSED: 'Closed',
};

const STATUS_TO_API: Record<TicketStatus, string> = {
  Open: 'OPEN',
  'In Progress': 'IN_PROGRESS',
  Closed: 'CLOSED',
};

const PRIORITY_TO_API: Record<TicketPriority, string> = {
  Low: 'LOW',
  Medium: 'MEDIUM',
  High: 'HIGH',
};

const PRIORITY_LABELS: Record<string, TicketPriority> = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
};

// A ticket exactly as the backend returns it
type ApiTicket = {
  id: number;
  title: string;
  description: string;
  status: string;
  priority: string;
  createdAt: string;
  createdBy: { id: number; name: string; email: string };
  assignedTo: { id: number; name: string; email: string } | null;
  category: Category | null;
};

function toTicket(t: ApiTicket): Ticket {
  return {
    id: t.id,
    title: t.title,
    description: t.description,
    status: STATUS_LABELS[t.status] ?? 'Open',
    priority: PRIORITY_LABELS[t.priority] ?? 'Medium',
    assignedTo: t.assignedTo?.name ?? 'Unassigned',
    assignedToId: t.assignedTo?.id ?? null,
    createdBy: t.createdBy.name,
    createdAt: new Date(t.createdAt).toLocaleDateString(),
    category: t.category?.name,
  };
}

// GET /tickets -> the backend already filters by role
// (User: own tickets, Agent: assigned tickets, Admin: all)
export async function getTickets(): Promise<Ticket[]> {
  const { data } = await http.get<ApiTicket[]>('/tickets');
  return data.map(toTicket);
}

// POST /tickets -> creates the ticket for the logged-in user
export async function createTicket(input: CreateTicketInput): Promise<Ticket> {
  const { data } = await http.post<ApiTicket>('/tickets', {
    title: input.title,
    description: input.description,
    category: input.categoryId,
    priority: PRIORITY_TO_API[input.priority],
  });
  return toTicket(data);
}

// PATCH /tickets/:id/assign (Admin only) -> null unassigns the ticket.
// Returns the updated ticket, including the assigned agent's name.
export async function assignTicket(
  id: number,
  assignedToId: number | null,
): Promise<Ticket> {
  const { data } = await http.patch<ApiTicket>(`/tickets/${id}/assign`, {
    assignedTo: assignedToId,
  });
  return toTicket(data);
}

// PATCH /tickets/:id/status (Admin, or the Agent the ticket is assigned to).
// Returns the updated ticket.
export async function updateTicketStatus(
  id: number,
  status: TicketStatus,
): Promise<Ticket> {
  const { data } = await http.patch<ApiTicket>(`/tickets/${id}/status`, {
    status: STATUS_TO_API[status],
  });
  return toTicket(data);
}

// GET /categories (public route)
export async function getCategories(): Promise<Category[]> {
  const { data } = await http.get<Category[]>('/categories');
  return data;
}

// ---------- Users (Admin only) ----------

// Agents a ticket can be assigned to: role Agent and still active.
// Reuses GET /users?role=Agent (the backend also rejects inactive agents).
export async function getAssignableAgents(): Promise<ManagedUser[]> {
  const agents = await getUsers({ role: 'Agent', limit: 100 });
  return agents.filter((agent) => agent.isActive !== false);
}

export type PaginatedUsers = {
  data: ManagedUser[];
  meta: { page: number; limit: number; total: number; totalPages: number };
};

// GET /users is paginated: returns { data, meta }. We ask for up to 100.
export async function getUsers(
  options: { page?: number; limit?: number; search?: string; role?: UserRole } = {},
): Promise<ManagedUser[]> {
  const { data } = await http.get<PaginatedUsers>('/users', {
    params: {
      page: options.page ?? 1,
      limit: options.limit ?? 100,
      search: options.search || undefined, // undefined = not sent
      role: options.role,
    },
  });
  return data.data;
}

export async function createUser(user: CreateUserInput): Promise<ManagedUser> {
  const { data } = await http.post<ManagedUser>('/users', user);
  return data;
}

// PUT /users/:id -> returns the updated user (without password)
export async function updateUser(
  id: number,
  changes: UpdateUserInput,
): Promise<ManagedUser> {
  const { data } = await http.put<ManagedUser>(`/users/${id}`, changes);
  return data;
}

export async function deleteUser(id: number): Promise<void> {
  await http.delete(`/users/${id}`);
}
