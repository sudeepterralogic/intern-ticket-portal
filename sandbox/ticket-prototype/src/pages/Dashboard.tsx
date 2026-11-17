
import type { Ticket, TicketStatus } from "../types/ticket";
import StatusBadge from "../components/StatusBadge";

type Props = {
  tickets: Ticket[];
  onSelect: (ticket: Ticket) => void;
};

function Dashboard({ tickets, onSelect }: Props) {
  const columns: TicketStatus[] = ["Open", "In Progress", "Closed"];

  return (
    <section>
      <h1>Ticket Board</h1>

      <div className="dashboard-cards">
        <div className="card">
          <h3>Total Tickets</h3>
          <p>{tickets.length}</p>
        </div>
        <div className="card">
          <h3>Open Tickets</h3>
          <p>{tickets.filter((t) => t.status === "Open").length}</p>
        </div>
        <div className="card">
          <h3>In Progress</h3>
          <p>{tickets.filter((t) => t.status === "In Progress").length}</p>
        </div>
        <div className="card">
          <h3>Closed Tickets</h3>
          <p>{tickets.filter((t) => t.status === "Closed").length}</p>
        </div>
      </div>

      <div className="ticket-board">
        {columns.map((column) => {
          const columnTickets = tickets.filter(
            (ticket) => ticket.status === column
          );

          return (
            <div className="ticket-column" key={column}>
              <h3>{column} ({columnTickets.length})</h3>

              {columnTickets.length === 0 ? (
                <p className="empty-message">No tickets</p>
              ) : (
                columnTickets.map((ticket) => (
                  <div
                    className="ticket-card"
                    key={ticket.id}
                    onClick={() => onSelect(ticket)}
                  >
                    <h4>#{ticket.id}</h4>
                    <h3>{ticket.title}</h3>
                    <p>Priority: {ticket.priority}</p>
                    <p>Assigned to: {ticket.assignedTo}</p>
                    <StatusBadge status={ticket.status} />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelect(ticket);
                      }}
                    >
                      View Ticket
                    </button>
                  </div>
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
