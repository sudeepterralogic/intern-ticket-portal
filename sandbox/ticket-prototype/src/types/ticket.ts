
export type UserRole = "Admin" | "Agent" | "User";

export type TicketStatus = "Open" | "In Progress" | "Closed";

export type TicketPriority = "Low" | "Medium" | "High";

export type Ticket = {
  id: number;
  title: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  assignedTo: string;          // agent's name, or "Unassigned"
  assignedToId: number | null; // null when the ticket is unassigned
  createdBy: string;
  createdAt: string;
  category?: string;
};

export type Category = {
  id: number;
  name: string;
};

// What the Create Ticket form sends to POST /api/tickets.
// (Assigning an agent is a separate Admin action: PATCH /tickets/:id/assign)
export type CreateTicketInput = {
  title: string;
  description: string;
  priority: TicketPriority;
  categoryId: number;
};

// A user as returned by the backend (GET/POST /api/users).
// The password is never sent back to the frontend.
export type ManagedUser = {
  id: number;
  name: string;
  username: string;
  email: string;
  role: UserRole;
  isActive?: boolean;
};

// What the "Create Agent / User" form sends to POST /api/users.
export type CreateUserInput = {
  name: string;
  username: string;
  email: string;
  password: string;
  role: "Agent" | "User";
};

// What the Edit form sends to PUT /api/users/:id.
// Every field is optional: only the changed fields are sent.
export type UpdateUserInput = Partial<CreateUserInput>;
