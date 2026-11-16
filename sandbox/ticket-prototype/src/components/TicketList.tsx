
import type { Ticket } from "../types/ticket";
import TicketRow from "./TicketRow";
import type { AgentsState } from "./AssignSelect";

type Props = {
  tickets: Ticket[];
  onSelect: (ticket: Ticket) => void;
  // Only passed for Admin: each row gets an assignment dropdown
  assignment?: {
    agentsState: AgentsState;
    onAssign: (ticketId: number, agentId: number | null) => Promise<string | null>;
  };
};

function TicketList({ tickets, onSelect, assignment }: Props) {
  if (tickets.length === 0) {
    return <p className="empty-message">No tickets found.</p>;
  }

  return (
    <div className="table-container">
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Title</th>
            <th>Priority</th>
            <th>Status</th>
            <th>Assigned To</th>
            <th>Action</th>
          </tr>
        </thead>

        <tbody>
          {tickets.map((ticket) => (
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
  );
}

export default TicketList;
