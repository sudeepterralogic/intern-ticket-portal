import type { Ticket, TicketStatus } from "../types/ticket";
import { PriorityBadge } from "../components/StatusBadge";
import { Person } from "../components/Avatar";
import Icon, { type IconName } from "../components/Icon";

type Props = {
  tickets: Ticket[];
  onSelect: (ticket: Ticket) => void;
};

const COLUMNS: { status: TicketStatus; icon: IconName; tone: string }[] = [
  { status: "Open", icon: "open", tone: "info" },
  { status: "In Progress", icon: "progress", tone: "warning" },
  { status: "Closed", icon: "closed", tone: "success" },
];

function Dashboard({ tickets, onSelect }: Props) {
  const count = (status: TicketStatus) => tickets.filter((t) => t.status === status).length;

  const stats: { label: string; value: number; icon: IconName; tone: string }[] = [
    { label: "Total Tickets", value: tickets.length, icon: "ticket", tone: "primary" },
    ...COLUMNS.map((c) => ({ label: c.status, value: count(c.status), icon: c.icon, tone: c.tone })),
  ];

  return (
    <section>
      <div className="page-header">
        <div>
          <h1>Dashboard</h1>
          <p className="page-subtitle">An overview of every ticket you can see.</p>
        </div>
      </div>

      <div className="stat-grid">
        {stats.map((stat) => (
          <div className="stat-card" key={stat.label}>
            <span className={`stat-icon tone-${stat.tone}`}>
              <Icon name={stat.icon} size={20} />
            </span>
            <div>
              <p className="stat-label">{stat.label}</p>
              <p className="stat-value">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="board">
        {COLUMNS.map((column) => {
          const columnTickets = tickets.filter((ticket) => ticket.status === column.status);

          return (
            <div className="board-column" key={column.status}>
              <div className="board-column-header">
                <span className={`column-dot tone-${column.tone}`} />
                <h3>{column.status}</h3>
                <span className="count-pill">{columnTickets.length}</span>
              </div>

              {columnTickets.length === 0 ? (
                <div className="board-empty">No tickets here</div>
              ) : (
                columnTickets.map((ticket) => (
                  <button
                    type="button"
                    className="board-card"
                    key={ticket.id}
                    onClick={() => onSelect(ticket)}
                  >
                    <div className="board-card-top">
                      <span className="ticket-id">#{ticket.id}</span>
                      <PriorityBadge priority={ticket.priority} />
                    </div>
                    <p className="board-card-title">{ticket.title}</p>
                    {ticket.category && <span className="tag">{ticket.category}</span>}
                    <div className="board-card-footer">
                      <Person
                        name={ticket.assignedTo}
                        empty={ticket.assignedToId === null}
                      />
                      <span className="text-subtle">{ticket.createdAt}</span>
                    </div>
                  </button>
                ))
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

export default Dashboard;
