import type { UserRole } from "../types/ticket";
import Icon, { type IconName } from "./Icon";

type Props = {
  page: string;
  role: UserRole;
  onNavigate: (page: string) => void;
};

type MenuItem = { id: string; label: string; icon: IconName };

function Sidebar({ page, role, onNavigate }: Props) {
  const menuItems: MenuItem[] = [
    { id: "dashboard", label: "Dashboard", icon: "dashboard" },
    { id: "tickets", label: role === "Agent" ? "My Tickets" : "All Tickets", icon: "ticket" },
    // Same rule as the /tickets/new route: Agents don't create tickets
    ...(role !== "Agent"
      ? [{ id: "create", label: "Create Ticket", icon: "plus" } as MenuItem]
      : []),
    ...(role === "Admin" ? [{ id: "users", label: "Users", icon: "users" } as MenuItem] : []),
  ];

  // The details page belongs to "tickets" in the menu
  const activeId = page === "details" ? "tickets" : page;

  return (
    <aside className="sidebar">
      <div className="brand">
        <span className="brand-logo">
          <Icon name="ticket" size={18} />
        </span>
        <span className="brand-name">Ticket Portal</span>
      </div>

      <p className="sidebar-section">Menu</p>
      <nav>
        {menuItems.map((item) => (
          <button
            key={item.id}
            className={activeId === item.id ? "active" : ""}
            onClick={() => onNavigate(item.id)}
          >
            <Icon name={item.icon} />
            <span>{item.label}</span>
          </button>
        ))}
      </nav>
    </aside>
  );
}

export default Sidebar;
