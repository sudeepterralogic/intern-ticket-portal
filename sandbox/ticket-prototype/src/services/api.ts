
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

const API_URL = 'http://localhost:3000/api';

export type LoginResponse = {
  access_token: string;
  user: {
    id: number;
    name: string;
    username: string;
    email: string;
    role: 'Admin' | 'Agent' | 'User';
  };
};

// ---------- Token handling ----------
//
// ACCESS token  -> kept here in memory only (not localStorage), lives 15 min,
//                  sent as  Authorization: Bearer <token>
// REFRESH token -> kept by the BROWSER in an HttpOnly cookie. Our JavaScript
//                  can't read it; the browser sends it to /api/auth/* when we
//                  use  credentials: 'include'.
let accessToken: string | null = null;

// Reads the JSON body and throws a readable error if the request failed.
// NestJS sends `message` as a string, or as a string[] for validation errors.
async function handleResponse<T>(response: Response, fallback: string): Promise<T> {
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message = Array.isArray(data.message)
      ? data.message.join(', ')
      : data.message;
    throw new Error(message || fallback);
  }

  return data as T;
}

// POST /auth/login -> access token in the body, refresh token set as a cookie
export async function loginUser(username: string, password: string): Promise<LoginResponse> {
  const response = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    credentials: 'include', // allow the browser to SAVE the refresh cookie
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ username, password }),
  });

  const data = await handleResponse<LoginResponse>(response, 'Login failed');
  accessToken = data.access_token;
  return data;
}

// POST /auth/refresh -> uses the cookie to get a NEW access token.
// Returns null if there is no valid session (not logged in).
// If several requests need a refresh at once, they share one call.
let refreshPromise: Promise<LoginResponse | null> | null = null;

export function refreshSession(): Promise<LoginResponse | null> {
  refreshPromise ??= (async () => {
    try {
      const response = await fetch(`${API_URL}/auth/refresh`, {
        method: 'POST',
        credentials: 'include', // SEND the refresh cookie
      });
      if (!response.ok) {
        accessToken = null;
        return null;
      }
      const data = (await response.json()) as LoginResponse;
      accessToken = data.access_token;
      return data;
    } catch {
      return null;
    } finally {
      refreshPromise = null;
    }
  })();
  return refreshPromise;
}

// POST /auth/logout -> server revokes the refresh token and clears the cookie
export async function logoutUser(): Promise<void> {
  accessToken = null;
  await fetch(`${API_URL}/auth/logout`, {
    method: 'POST',
    credentials: 'include',
  }).catch(() => undefined);
}

// fetch() for protected routes: adds the access token, and if the server
// says 401 (token expired), refreshes once and tries again.
async function authFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const send = () =>
    fetch(`${API_URL}${path}`, {
      ...init,
      headers: {
        ...(init.headers ?? {}),
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
    });

  let response = await send();

  if (response.status === 401 && (await refreshSession())) {
    response = await send();
  }

  return response;
}

// ---------- Tickets ----------

// The backend uses enum values (OPEN, MEDIUM...), the UI uses labels (Open, Medium...)
const STATUS_LABELS: Record<string, TicketStatus> = {
  OPEN: 'Open',
  IN_PROGRESS: 'In Progress',
  CLOSED: 'Closed',
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
  const response = await authFetch('/tickets');
  const data = await handleResponse<ApiTicket[]>(response, 'Unable to fetch tickets');
  return data.map(toTicket);
}

// POST /tickets -> creates the ticket for the logged-in user
export async function createTicket(input: CreateTicketInput): Promise<Ticket> {
  const response = await authFetch('/tickets', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: input.title,
      description: input.description,
      category: input.categoryId,
      priority: PRIORITY_TO_API[input.priority],
    }),
  });

  const data = await handleResponse<ApiTicket>(response, 'Unable to create ticket');
  return toTicket(data);
}

// PATCH /tickets/:id/assign (Admin only) -> null unassigns the ticket.
// Returns the updated ticket, including the assigned agent's name.
export async function assignTicket(
  id: number,
  assignedToId: number | null,
): Promise<Ticket> {
  const response = await authFetch(`/tickets/${id}/assign`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ assignedTo: assignedToId }),
  });

  const data = await handleResponse<ApiTicket>(response, 'Unable to assign ticket');
  return toTicket(data);
}

// GET /categories (public route)
export async function getCategories(): Promise<Category[]> {
  const response = await authFetch('/categories');
  return handleResponse<Category[]>(response, 'Unable to fetch categories');
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
  const params = new URLSearchParams({
    page: String(options.page ?? 1),
    limit: String(options.limit ?? 100),
  });
  if (options.search) params.set('search', options.search);
  if (options.role) params.set('role', options.role);

  const response = await authFetch(`/users?${params}`);
  const result = await handleResponse<PaginatedUsers>(response, 'Unable to fetch users');
  return result.data;
}

export async function createUser(user: CreateUserInput): Promise<ManagedUser> {
  const response = await authFetch('/users', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(user),
  });

  return handleResponse<ManagedUser>(response, 'Unable to create user');
}

// PUT /users/:id -> returns the updated user (without password)
export async function updateUser(
  id: number,
  changes: UpdateUserInput,
): Promise<ManagedUser> {
  const response = await authFetch(`/users/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(changes),
  });

  return handleResponse<ManagedUser>(response, 'Unable to update user');
}

export async function deleteUser(id: number) {
  const response = await authFetch(`/users/${id}`, { method: 'DELETE' });
  return handleResponse(response, 'Unable to delete user');
}
