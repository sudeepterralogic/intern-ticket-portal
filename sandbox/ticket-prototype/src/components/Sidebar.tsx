
import type { UserRole } from "../types/ticket";

type Props = {
  page: string;
  role: UserRole;
  onNavigate: (page: string) => void;
};

function Sidebar({ page, role, onNavigate }: Props) {
  const menuItems = [
    { id: "dashboard", label: "Dashboard" },
    { id: "tickets", label: "All Tickets" },
    { id: "create", label: "Create Ticket" },
    ...(role === "Admin" ? [{ id: "users", label: "Users" }] : []),
  ];

  return (
    <aside className="sidebar">
      <h2>Ticket Portal</h2>

      <nav>
        {menuItems.map((item) => (
          <button
            key={item.id}
            className={page === item.id ? "active" : ""}
            onClick={() => onNavigate(item.id)}
          >
            {item.label}
          </button>
        ))}
      </nav>
    </aside>
  );
}

export default Sidebar;
