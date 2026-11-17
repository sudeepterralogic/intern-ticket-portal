
import { useEffect, useState } from "react";

import type {
  Ticket,
  UserRole,
  TicketStatus,
  ManagedUser,
  CreateUserInput,
  UpdateUserInput,
  CreateTicketInput,
} from "./types/ticket";

import {
  loginUser,
  logoutUser,
  refreshSession,
  getUsers,
  createUser as createUserApi,
  updateUser as updateUserApi,
  deleteUser as deleteUserApi,
  getTickets,
  createTicket as createTicketApi,
  assignTicket as assignTicketApi,
  getAssignableAgents,
} from './services/api';

import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import CreateTicket from "./pages/CreateTicket";
import TicketDetails from "./pages/TicketDetails";
import Users from "./pages/Users";

import Sidebar from "./components/Sidebar";
import Header from "./components/Header";
import TicketList from "./components/TicketList";
import type { AgentsState } from "./components/AssignSelect";

type Page = "dashboard" | "tickets" | "create" | "details" | "users";

function App() {
  const [username, setUsername] = useState("");
  const [role, setRole] = useState<UserRole>("User");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [page, setPage] = useState<Page>("dashboard");
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  // true while we check (on page load) if the refresh cookie still logs us in
  const [checkingSession, setCheckingSession] = useState(true);

  // Ticket data, loaded from the database through the backend
  const [tickets, setTickets] = useState<Ticket[]>([]);

  // Agents a ticket can be assigned to (Admin only), loaded from the backend
  const [agentsState, setAgentsState] = useState<AgentsState>({
    agents: [],
    loading: false,
    error: "",
  });

  // Users and agents, loaded from the database through the backend
  const [users, setUsers] = useState<ManagedUser[]>([]);

  // On page load / refresh: if the browser still has a valid refresh cookie,
  // POST /auth/refresh gives a new access token, so you stay logged in.
  useEffect(() => {
    refreshSession()
      .then((data) => {
        if (data) {
          setUsername(data.user.username);
          setRole(data.user.role);
          setIsLoggedIn(true);
        }
      })
      .finally(() => setCheckingSession(false));
  }, []);

  // After login, load the tickets from GET /api/tickets
  useEffect(() => {
    if (!isLoggedIn) return;

    getTickets()
      .then(setTickets)
      .catch((error) => console.error("Load tickets error:", error));
  }, [isLoggedIn]);

  // Admin opens All Tickets or a ticket's details -> load the assignable agents
  // (reloaded each time, so newly created or deactivated agents show up)
  useEffect(() => {
    if (role !== "Admin" || !isLoggedIn) return;
    if (page !== "tickets" && page !== "details") return;

    setAgentsState((previous) => ({ ...previous, loading: true, error: "" }));

    getAssignableAgents()
      .then((agents) => setAgentsState({ agents, loading: false, error: "" }))
      .catch((error) =>
        setAgentsState({
          agents: [],
          loading: false,
          error: error instanceof Error ? error.message : "Unable to load agents",
        })
      );
  }, [page, role, isLoggedIn]);

  // When an Admin opens the Users page, load the users from the database
  useEffect(() => {
    if (page !== "users" || role !== "Admin" || !isLoggedIn) return;

    getUsers()
      .then(setUsers)
      .catch((error) => console.error("Load users error:", error));
  }, [page, role, isLoggedIn]);

  // Login with username and password
  const handleLogin = async (
    username: string,
    password: string,
  ): Promise<boolean> => {
    try {
      const data = await loginUser(username, password);

      setUsername(data.user.username);
      setRole(data.user.role);
      setIsLoggedIn(true);
      setPage("dashboard");

      return true;
    } catch (error) {
      console.error("Login error:", error);
      return false;
    }
  };

  // Logout: tell the server to revoke the refresh token and clear the cookie
  const handleLogout = async () => {
    await logoutUser();

    setIsLoggedIn(false);
    setUsername("");
    setRole("User");
    setUsers([]);
    setTickets([]);
    setAgentsState({ agents: [], loading: false, error: "" });
    setSelectedTicket(null);
    setPage("dashboard");
  };

  // Create ticket
  // Create ticket -> saves to the database via POST /api/tickets
  // Returns an error message, or null if it worked.
  const addTicket = async (
    input: CreateTicketInput
  ): Promise<string | null> => {
    try {
      const savedTicket = await createTicketApi(input);
      setTickets((previous) => [savedTicket, ...previous]);
      setPage("tickets");
      return null;
    } catch (error) {
      return error instanceof Error ? error.message : "Failed to create ticket.";
    }
  };

  // Assign / unassign a ticket -> PATCH /api/tickets/:id/assign, then reload
  // the list so every page shows the saved data.
  // Returns an error message, or null if it worked.
  const assignTicket = async (
    ticketId: number,
    agentId: number | null
  ): Promise<string | null> => {
    if (role !== "Admin" || !isLoggedIn) return "You are not allowed to do this.";

    try {
      const updatedTicket = await assignTicketApi(ticketId, agentId);
      // Show the change right away, then refresh from the server
      setTickets((previous) =>
        previous.map((ticket) => (ticket.id === ticketId ? updatedTicket : ticket))
      );
      getTickets()
        .then(setTickets)
        .catch((error) => console.error("Reload tickets error:", error));
      return null;
    } catch (error) {
      return error instanceof Error ? error.message : "Failed to assign ticket.";
    }
  };

  // Update ticket status
  const updateStatus = (id: number, status: TicketStatus) => {
    setTickets((previous) =>
      previous.map((ticket) =>
        ticket.id === id ? { ...ticket, status } : ticket
      )
    );
  };

  // Create Agent or User -> saves to the database via POST /api/users
  // Returns an error message, or null if it worked.
  const createUser = async (
    newUser: CreateUserInput
  ): Promise<string | null> => {
    if (role !== "Admin" || !isLoggedIn) return "You are not allowed to do this.";

    const accountExists = users.some(
      (user) =>
        user.username.toLowerCase() === newUser.username.toLowerCase() ||
        user.email.toLowerCase() === newUser.email.toLowerCase()
    );

    if (accountExists) {
      return "Username or email already exists.";
    }

    try {
      const savedUser = await createUserApi(newUser);
      setUsers((previous) => [...previous, savedUser]);
      return null;
    } catch (error) {
      return error instanceof Error ? error.message : "Failed to create user.";
    }
  };

  // Edit Agent or User -> saves to the database via PUT /api/users/:id
  // Returns an error message, or null if it worked.
  const updateUser = async (
    id: number,
    changes: UpdateUserInput
  ): Promise<string | null> => {
    if (role !== "Admin" || !isLoggedIn) return "You are not allowed to do this.";

    try {
      const updatedUser = await updateUserApi(id, changes);
      setUsers((previous) =>
        previous.map((user) => (user.id === id ? updatedUser : user))
      );
      return null;
    } catch (error) {
      return error instanceof Error ? error.message : "Failed to update user.";
    }
  };

  // Delete Agent or User -> removes from the database via DELETE /api/users/:id
  const deleteUser = async (id: number) => {
    if (role !== "Admin" || !isLoggedIn) return;

    const confirmed = window.confirm(
      "Are you sure you want to delete this account?"
    );

    if (!confirmed) return;

    try {
      await deleteUserApi(id);
      setUsers((previous) => previous.filter((user) => user.id !== id));
    } catch (error) {
      alert(error instanceof Error ? error.message : "Failed to delete user.");
    }
  };

  // The backend already filters by role (User: own, Agent: assigned, Admin: all)
  const visibleTickets = tickets;

  // Select ticket
  const selectTicket = (ticket: Ticket) => {
    setSelectedTicket(ticket);
    setPage("details");
  };

  // While checking the refresh cookie on page load
  if (checkingSession) {
    return <p style={{ padding: "24px" }}>Loading...</p>;
  }

  // Login page
  if (!isLoggedIn) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="app-layout">
      <Sidebar
        page={page}
        role={role}
        onNavigate={(nextPage) => {
          setSelectedTicket(null);
          setPage(nextPage as Page);
        }}
      />

      <main className="main-content">
        <Header
          username={username}
          role={role}
          onLogout={handleLogout}
        />

        <div className="page-content">
          {page === "dashboard" && (
            <Dashboard
              tickets={visibleTickets}
              onSelect={selectTicket}
            />
          )}

          {page === "tickets" && (
            <section>
              <h1>All Tickets</h1>
              <TicketList
                tickets={visibleTickets}
                onSelect={selectTicket}
                assignment={
                  role === "Admin"
                    ? { agentsState, onAssign: assignTicket }
                    : undefined
                }
              />
            </section>
          )}

          {page === "create" && role !== "Agent" && (
            <CreateTicket onAddTicket={addTicket} />
          )}

          {page === "details" && selectedTicket && (
            <TicketDetails
              ticket={
                tickets.find(
                  (ticket) => ticket.id === selectedTicket.id
                )!
              }
              role={role}
              onUpdateStatus={updateStatus}
              agentsState={agentsState}
              onAssign={assignTicket}
              onBack={() => setPage("tickets")}
            />
          )}

          {page === "users" && (
            <Users
              currentRole={role}
              users={users}
              onCreateUser={createUser}
              onUpdateUser={updateUser}
              onDeleteUser={deleteUser}
            />
          )}
        </div>
      </main>
    </div>
  );
}

export default App;
