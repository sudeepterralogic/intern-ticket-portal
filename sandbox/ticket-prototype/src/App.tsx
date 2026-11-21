
import { useEffect, useState } from "react";
import {
  Routes,
  Route,
  Navigate,
  Outlet,
  useNavigate,
  useLocation,
  useParams,
} from "react-router-dom";

import type {
  Ticket,
  UserRole,
  TicketStatus,
  CreateTicketInput,
} from "./types/ticket";

import { useAppDispatch, useAppSelector } from "./store/hooks";
import {
  logout,
  restoreSession,
  selectCurrentUser,
  selectIsLoggedIn,
  selectRole,
} from "./store/authSlice";

import {
  getTickets,
  createTicket as createTicketApi,
  assignTicket as assignTicketApi,
  updateTicketStatus as updateTicketStatusApi,
  getAssignableAgents,
} from "./services/api";

import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import CreateTicket from "./pages/CreateTicket";
import TicketDetails from "./pages/TicketDetails";
import Users from "./pages/Users";

import Sidebar from "./components/Sidebar";
import Header from "./components/Header";
import TicketList from "./components/TicketList";
import type { AgentsState } from "./components/AssignSelect";
import Icon from "./components/Icon";

import PrivateRoute from "./components/PrivateRoute";
import PermissionRoute from "./components/PermissionRoute";

type Page = "dashboard" | "tickets" | "create" | "details" | "users";

// Layout for all protected pages
function AppLayout({
  page,
  role,
  username,
  onLogout,
  onNavigate,
}: {
  page: Page;
  role: UserRole;
  username: string;
  onLogout: () => void;
  onNavigate: (nextPage: string) => void;
}) {
  return (
    <div className="app-layout">
      <Sidebar
        page={page}
        role={role}
        onNavigate={onNavigate}
      />

      <main className="main-content">
        <Header
          username={username}
          role={role}
          onLogout={onLogout}
        />

        <div className="page-content">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

// Get ticket details using the ticket number in the URL
function TicketDetailsRoute({
  tickets,
  ticketsLoaded,
  role,
  agentsState,
  onUpdateStatus,
  onAssign,
  onBack,
}: {
  tickets: Ticket[];
  ticketsLoaded: boolean;
  role: UserRole;
  agentsState: AgentsState;
  onUpdateStatus: (id: number, status: TicketStatus) => Promise<string | null>;
  onAssign: (
    ticketId: number,
    agentId: number | null
  ) => Promise<string | null>;
  onBack: () => void;
}) {
  const { ticketNo } = useParams();

  if (!ticketsLoaded) {
    return <p>Loading ticket...</p>;
  }

  const selectedTicket = tickets.find(
    (ticket) => String(ticket.id) === ticketNo
  );

  if (!selectedTicket) {
    return <Navigate to="/tickets" replace />;
  }

  return (
    <TicketDetails
      ticket={selectedTicket}
      role={role}
      onUpdateStatus={onUpdateStatus}
      agentsState={agentsState}
      onAssign={onAssign}
      onBack={onBack}
    />
  );
}

function App() {
  const navigate = useNavigate();
  const location = useLocation();

  // Logged-in user, from the Redux store (store/authSlice.ts)
  const dispatch = useAppDispatch();
  const isLoggedIn = useAppSelector(selectIsLoggedIn);
  const role = useAppSelector(selectRole);
  const username = useAppSelector(selectCurrentUser)?.username ?? "";
  const checkingSession = !useAppSelector((state) => state.auth.sessionChecked);

  const [page, setPage] = useState<Page>("dashboard");

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [ticketsLoaded, setTicketsLoaded] = useState(false);

  const [agentsState, setAgentsState] = useState<AgentsState>({
    agents: [],
    loading: false,
    error: "",
  });

  // Update page based on URL
  useEffect(() => {
    const path = location.pathname;

    if (path === "/dashboard") {
      setPage("dashboard");
    } else if (path === "/tickets") {
      setPage("tickets");
    } else if (path === "/tickets/new") {
      setPage("create");
    } else if (path.startsWith("/tickets/")) {
      setPage("details");
    } else if (path === "/users") {
      setPage("users");
    }
  }, [location.pathname]);

  // Sidebar navigation
  const goToPage = (nextPage: Page) => {
    const paths: Record<Page, string> = {
      dashboard: "/dashboard",
      tickets: "/tickets",
      create: "/tickets/new",
      details: "/tickets",
      users: "/users",
    };

    navigate(paths[nextPage]);
  };

  // Check login session when application loads
  useEffect(() => {
    dispatch(restoreSession());
  }, [dispatch]);

  // Load tickets after login
  useEffect(() => {
    if (!isLoggedIn) {
      setTicketsLoaded(false);
      return;
    }

    setTicketsLoaded(false);

    getTickets()
      .then(setTickets)
      .catch((error) => {
        console.error("Load tickets error:", error);
      })
      .finally(() => {
        setTicketsLoaded(true);
      });
  }, [isLoggedIn]);

  // Load assignable agents for Admin
  useEffect(() => {
    if (role !== "Admin" || !isLoggedIn) return;

    if (page !== "tickets" && page !== "details") return;

    setAgentsState((previous) => ({
      ...previous,
      loading: true,
      error: "",
    }));

    getAssignableAgents()
      .then((agents) => {
        setAgentsState({
          agents,
          loading: false,
          error: "",
        });
      })
      .catch((error) => {
        setAgentsState({
          agents: [],
          loading: false,
          error:
            error instanceof Error
              ? error.message
              : "Unable to load agents",
        });
      });
  }, [page, role, isLoggedIn]);

  // Logout
  // (the auth and users slices reset themselves on logout)
  const handleLogout = async () => {
    try {
      await dispatch(logout());
    } finally {
      setTickets([]);
      setTicketsLoaded(false);

      setAgentsState({
        agents: [],
        loading: false,
        error: "",
      });

      navigate("/login", { replace: true });
    }
  };

  // Create ticket
  const addTicket = async (
    input: CreateTicketInput
  ): Promise<string | null> => {
    try {
      const savedTicket = await createTicketApi(input);

      setTickets((previous) => [
        savedTicket,
        ...previous,
      ]);

      navigate("/tickets");

      return null;
    } catch (error) {
      return error instanceof Error
        ? error.message
        : "Failed to create ticket.";
    }
  };

  // Assign or unassign ticket
  const assignTicket = async (
    ticketId: number,
    agentId: number | null
  ): Promise<string | null> => {
    if (role !== "Admin" || !isLoggedIn) {
      return "You are not allowed to do this.";
    }

    try {
      const updatedTicket = await assignTicketApi(
        ticketId,
        agentId
      );

      setTickets((previous) =>
        previous.map((ticket) =>
          ticket.id === ticketId ? updatedTicket : ticket
        )
      );

      getTickets()
        .then(setTickets)
        .catch((error) => {
          console.error("Reload tickets error:", error);
        });

      return null;
    } catch (error) {
      return error instanceof Error
        ? error.message
        : "Failed to assign ticket.";
    }
  };

  // Update ticket status (Admin, or the assigned Agent) -> saved on the backend
  const updateStatus = async (
    id: number,
    status: TicketStatus
  ): Promise<string | null> => {
    try {
      const updatedTicket = await updateTicketStatusApi(id, status);

      setTickets((previous) =>
        previous.map((ticket) =>
          ticket.id === id ? updatedTicket : ticket
        )
      );

      return null;
    } catch (error) {
      return error instanceof Error
        ? error.message
        : "Failed to update status.";
    }
  };

  // Open selected ticket
  const selectTicket = (ticket: Ticket) => {
    navigate(`/tickets/${ticket.id}`);
  };

  // Wait until session checking finishes
  if (checkingSession) {
    return (
      <div className="full-page-message">
        <span className="spinner" />
        <p className="text-muted">Loading your workspace...</p>
      </div>
    );
  }

  return (
    <Routes>
      {/* Login page */}
      <Route
        path="/login"
        element={
          isLoggedIn ? (
            <Navigate to="/dashboard" replace />
          ) : (
            <Login />
          )
        }
      />

      {/* Routes requiring login */}
      <Route element={<PrivateRoute isLoggedIn={isLoggedIn} />}>
        <Route
          element={
            <AppLayout
              page={page}
              role={role}
              username={username}
              onLogout={handleLogout}
              onNavigate={(nextPage) => {
                goToPage(nextPage as Page);
              }}
            />
          }
        >
          {/* Default page */}
          <Route
            index
            element={<Navigate to="/dashboard" replace />}
          />

          {/* Dashboard */}
          <Route
            path="/dashboard"
            element={
              <Dashboard
                tickets={tickets}
                onSelect={selectTicket}
              />
            }
          />

          {/* All Tickets */}
          <Route
            path="/tickets"
            element={
              <section>
                <div className="page-header">
                  <div>
                    <h1>{role === "Agent" ? "My Tickets" : "All Tickets"}</h1>
                    <p className="page-subtitle">
                      {role === "Admin"
                        ? "Every ticket in the system. Assign agents from the list."
                        : role === "Agent"
                          ? "Tickets assigned to you."
                          : "Tickets you have raised."}
                    </p>
                  </div>

                  {role !== "Agent" && (
                    <button
                      className="btn btn-primary"
                      onClick={() => navigate("/tickets/new")}
                    >
                      <Icon name="plus" size={16} /> New ticket
                    </button>
                  )}
                </div>

                {!ticketsLoaded ? (
                  <p className="field-hint">Loading tickets...</p>
                ) : (
                <TicketList
                  tickets={tickets}
                  onSelect={selectTicket}
                  assignment={
                    role === "Admin"
                      ? {
                          agentsState,
                          onAssign: assignTicket,
                        }
                      : undefined
                  }
                />
                )}
              </section>
            }
          />

          {/* Admin and User can create tickets */}
          <Route
            element={
              <PermissionRoute
                role={role}
                allowedRoles={["Admin", "User"]}
              />
            }
          >
            <Route
              path="/tickets/new"
              element={
                <CreateTicket onAddTicket={addTicket} />
              }
            />
          </Route>

          {/* Ticket Details */}
          <Route
            path="/tickets/:ticketNo"
            element={
              <TicketDetailsRoute
                tickets={tickets}
                ticketsLoaded={ticketsLoaded}
                role={role}
                agentsState={agentsState}
                onUpdateStatus={updateStatus}
                onAssign={assignTicket}
                onBack={() => navigate("/tickets")}
              />
            }
          />

          {/* Only Admin can open Users */}
          <Route
            element={
              <PermissionRoute
                role={role}
                allowedRoles={["Admin"]}
              />
            }
          >
            <Route
              path="/users"
              element={
                <Users />
              }
            />
          </Route>
        </Route>
      </Route>

      {/* Access denied */}
      <Route
        path="/access-denied"
        element={
          <div className="full-page-message">
            <p className="big-code">403</p>
            <h1>Access denied</h1>
            <p className="text-muted">
              You do not have permission to access this page.
            </p>
            <button className="btn btn-primary" onClick={() => navigate("/dashboard")}>
              Back to dashboard
            </button>
          </div>
        }
      />

      {/* Unknown URL */}
      <Route
        path="*"
        element={
          <div className="full-page-message">
            <p className="big-code">404</p>
            <h1>Page not found</h1>
            <p className="text-muted">The page you are looking for does not exist.</p>
            <button className="btn btn-primary" onClick={() => navigate("/dashboard")}>
              Back to dashboard
            </button>
          </div>
        }
      />
    </Routes>
  );
}

export default App;
