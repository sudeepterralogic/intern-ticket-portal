import type { Ticket, TicketStatus, UserRole } from "../types/ticket";
import { PriorityBadge, StatusBadge } from "../components/StatusBadge";
import AssignSelect, { type AgentsState } from "../components/AssignSelect";
import StatusSelect from "../components/StatusSelect";
import { Person } from "../components/Avatar";
import Icon from "../components/Icon";
import { useAppSelector } from "../store/hooks";
import { selectCurrentUser } from "../store/authSlice";

type Props = {
  ticket: Ticket;
  role: UserRole;
  onUpdateStatus: (id: number, status: TicketStatus) => Promise<string | null>;
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
  const currentUserId = useAppSelector(selectCurrentUser)?.id;
  // Same rule as the backend: Admin, or the Agent assigned to this ticket
  const canUpdateStatus =
    role === "Admin" ||
    (role === "Agent" && ticket.assignedToId === currentUserId);

  return (
    <section>
      <button className="btn btn-link" onClick={onBack}>
        <Icon name="back" size={16} /> Back to tickets
      </button>

      <div className="page-header">
        <div>
          <p className="ticket-id">Ticket #{ticket.id}</p>
          <h1>{ticket.title}</h1>
        </div>
        <div className="header-badges">
          <StatusBadge status={ticket.status} />
          <PriorityBadge priority={ticket.priority} />
        </div>
      </div>

      <div className="details-layout">
        <div className="card">
          <h3 className="card-title">Description</h3>
          <p className="description">{ticket.description}</p>
        </div>

        <aside className="card details-side">
          <h3 className="card-title">Details</h3>

          <dl className="meta-list">
            <div>
              <dt>Status</dt>
              <dd>
                {canUpdateStatus ? (
                  <StatusSelect ticket={ticket} onUpdateStatus={onUpdateStatus} />
                ) : (
                  <StatusBadge status={ticket.status} />
                )}
              </dd>
            </div>

            <div>
              <dt>Assigned to</dt>
              <dd>
                {role === "Admin" ? (
                  <AssignSelect ticket={ticket} agentsState={agentsState} onAssign={onAssign} />
                ) : (
                  <Person name={ticket.assignedTo} empty={ticket.assignedToId === null} />
                )}
              </dd>
            </div>

            <div>
              <dt>Priority</dt>
              <dd><PriorityBadge priority={ticket.priority} /></dd>
            </div>

            {ticket.category && (
              <div>
                <dt>Category</dt>
                <dd><span className="tag">{ticket.category}</span></dd>
              </div>
            )}

            <div>
              <dt>Created by</dt>
              <dd><Person name={ticket.createdBy} /></dd>
            </div>

            <div>
              <dt>Created on</dt>
              <dd>{ticket.createdAt}</dd>
            </div>
          </dl>
        </aside>
      </div>
    </section>
  );
}

export default TicketDetails;
