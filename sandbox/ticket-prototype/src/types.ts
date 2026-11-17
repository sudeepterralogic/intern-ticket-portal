// Day-2 types (copied from the 03-Nov TypeScript notes) — reused here.

export enum Role {
  Admin = 'ADMIN',
  Agent = 'AGENT',
  User = 'USER',
}

export enum TicketStatus {
  Open = 'OPEN',
  InProgress = 'IN_PROGRESS',
  Resolved = 'RESOLVED',
  Closed = 'CLOSED',
}

export enum TicketPriority {
  Low = 'LOW',
  Medium = 'MEDIUM',
  High = 'HIGH',
  Critical = 'CRITICAL',
}

export interface User {
  id: number;
  name: string;
  role: Role;
}

export interface Ticket {
  id: number;
  title: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  assignedTo?: User; // optional here: a brand-new ticket is not assigned yet
}

// Utility types from Day-2 (Pick) in action:
// the form only edits these three fields, so we "pick" them from Ticket.
export type TicketFormValues = Pick<Ticket, 'title' | 'description' | 'priority'>;

// The three filter tabs.
export type Filter = 'ALL' | 'OPEN' | 'RESOLVED';
