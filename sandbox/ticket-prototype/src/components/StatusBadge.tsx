import type { TicketPriority, TicketStatus, UserRole } from "../types/ticket";

const toClass = (value: string) => value.toLowerCase().replace(" ", "-");

export function StatusBadge({ status }: { status: TicketStatus }) {
  return (
    <span className={`badge status-${toClass(status)}`}>
      <span className="badge-dot" />
      {status}
    </span>
  );
}

export function PriorityBadge({ priority }: { priority: TicketPriority }) {
  return <span className={`badge priority-${toClass(priority)}`}>{priority}</span>;
}

export function RoleBadge({ role }: { role: UserRole }) {
  return <span className={`badge role-${toClass(role)}`}>{role}</span>;
}

export default StatusBadge;
