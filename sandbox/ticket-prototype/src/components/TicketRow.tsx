import type { Ticket } from "../types/ticket";
import { PriorityBadge, StatusBadge } from "./StatusBadge";
import AssignSelect, { type AgentsState } from "./AssignSelect";
import { Person } from "./Avatar";
import Icon from "./Icon";

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
      <td className="ticket-id">#{ticket.id}</td>
      <td>
        <p className="cell-title">{ticket.title}</p>
        <p className="cell-sub">
          {ticket.category ? `${ticket.category} · ` : ""}by {ticket.createdBy} · {ticket.createdAt}
        </p>
      </td>
      <td><PriorityBadge priority={ticket.priority} /></td>
      <td><StatusBadge status={ticket.status} /></td>
      <td>
        {assignment ? (
          <AssignSelect
            ticket={ticket}
            agentsState={assignment.agentsState}
            onAssign={assignment.onAssign}
          />
        ) : (
          <Person name={ticket.assignedTo} empty={ticket.assignedToId === null} />
        )}
      </td>
      <td className="cell-action">
        <button className="btn btn-ghost btn-sm" onClick={() => onSelect(ticket)}>
          View <Icon name="arrow" size={14} />
        </button>
      </td>
    </tr>
  );
}

export default TicketRow;
