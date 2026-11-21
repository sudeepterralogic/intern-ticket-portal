import { useState } from "react";
import type { Ticket, TicketStatus } from "../types/ticket";
import TicketRow from "./TicketRow";
import type { AgentsState } from "./AssignSelect";
import Icon from "./Icon";

type Props = {
  tickets: Ticket[];
  onSelect: (ticket: Ticket) => void;
  // Only passed for Admin: each row gets an assignment dropdown
  assignment?: {
    agentsState: AgentsState;
    onAssign: (ticketId: number, agentId: number | null) => Promise<string | null>;
  };
};

const FILTERS: ("All" | TicketStatus)[] = ["All", "Open", "In Progress", "Closed"];

function TicketList({ tickets, onSelect, assignment }: Props) {
  // Filtering happens here in the browser; the backend already sent
  // only the tickets this role is allowed to see.
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"All" | TicketStatus>("All");

  const query = search.trim().toLowerCase();
  const visible = tickets.filter(
    (ticket) =>
      (status === "All" || ticket.status === status) &&
      (query === "" ||
        ticket.title.toLowerCase().includes(query) ||
        String(ticket.id).includes(query) ||
        ticket.assignedTo.toLowerCase().includes(query)),
  );

  const countFor = (filter: "All" | TicketStatus) =>
    filter === "All" ? tickets.length : tickets.filter((t) => t.status === filter).length;

  return (
    <div className="card card-flush">
      <div className="toolbar">
        <div className="segmented">
          {FILTERS.map((filter) => (
            <button
              key={filter}
              type="button"
              className={status === filter ? "active" : ""}
              onClick={() => setStatus(filter)}
            >
              {filter}
              <span className="segmented-count">{countFor(filter)}</span>
            </button>
          ))}
        </div>

        <label className="search">
          <Icon name="search" size={16} />
          <input
            type="search"
            placeholder="Search by title, ID or agent"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
      </div>

      {visible.length === 0 ? (
        <div className="empty-state">
          <span className="empty-icon">
            <Icon name="inbox" size={24} />
          </span>
          <p className="empty-title">No tickets found</p>
          <p className="text-muted">
            {tickets.length === 0
              ? "Tickets will show up here once they are created."
              : "Try a different search or filter."}
          </p>
        </div>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Title</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Assigned To</th>
                <th aria-label="Actions" />
              </tr>
            </thead>

            <tbody>
              {visible.map((ticket) => (
                <TicketRow
                  key={ticket.id}
                  ticket={ticket}
                  onSelect={onSelect}
                  assignment={assignment}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default TicketList;
