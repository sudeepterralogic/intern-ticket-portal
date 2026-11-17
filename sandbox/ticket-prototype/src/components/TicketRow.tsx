
import type { Ticket } from "../types/ticket";
import StatusBadge from "./StatusBadge";
import AssignSelect, { type AgentsState } from "./AssignSelect";

type Props = {
  ticket: Ticket;
  onSelect: (ticket: Ticket) => void;
  // Only passed for Admin: shows a dropdown instead of the agent's name
  assignment?: {
    agentsState: AgentsState;
    onAssign: (ticketId: number, agentId: number | null) => Promise<string | null>;
  };
};

function TicketRow({ ticket, onSelect, assignment }: Props) {
  return (
    <tr>
      <td>#{ticket.id}</td>
      <td>{ticket.title}</td>
      <td>{ticket.priority}</td>
      <td><StatusBadge status={ticket.status} /></td>
      <td>
        {assignment ? (
          <AssignSelect
            ticket={ticket}
            agentsState={assignment.agentsState}
            onAssign={assignment.onAssign}
          />
        ) : (
          ticket.assignedTo
        )}
      </td>
      <td>
        <button onClick={() => onSelect(ticket)}>View</button>
      </td>
    </tr>
  );
}

export default TicketRow;
