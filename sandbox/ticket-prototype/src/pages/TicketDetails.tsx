
import type { Ticket, TicketStatus, UserRole } from "../types/ticket";
import StatusBadge from "../components/StatusBadge";
import AssignSelect, { type AgentsState } from "../components/AssignSelect";

type Props = {
  ticket: Ticket;
  role: UserRole;
  onUpdateStatus: (id: number, status: TicketStatus) => void;
  agentsState: AgentsState;
  onAssign: (ticketId: number, agentId: number | null) => Promise<string | null>;
  onBack: () => void;
};

function TicketDetails({
  ticket,
  role,
  onUpdateStatus,
  agentsState,
  onAssign,
  onBack,
}: Props) {
  return (
    <section className="details-card">
      <button onClick={onBack}>Back to Tickets</button>

      <h1>Ticket #{ticket.id}</h1>
      <h2>{ticket.title}</h2>

      <p><strong>Description:</strong> {ticket.description}</p>
      <p><strong>Priority:</strong> {ticket.priority}</p>
      {role === "Admin" ? (
        <div>
          <label><strong>Assigned To</strong></label>
          <AssignSelect
            ticket={ticket}
            agentsState={agentsState}
            onAssign={onAssign}
          />
        </div>
      ) : (
        <p><strong>Assigned To:</strong> {ticket.assignedTo}</p>
      )}
      <p><strong>Created By:</strong> {ticket.createdBy}</p>
      <p><strong>Created At:</strong> {ticket.createdAt}</p>
      <p><strong>Status:</strong> <StatusBadge status={ticket.status} /></p>

      {role !== "User" && (
        <div>
          <label>Update Status</label>
          <select
            value={ticket.status}
            onChange={(e) =>
              onUpdateStatus(ticket.id, e.target.value as TicketStatus)
            }
          >
            <option value="Open">Open</option>
            <option value="In Progress">In Progress</option>
            <option value="Closed">Closed</option>
          </select>
        </div>
      )}
    </section>
  );
}

export default TicketDetails;
