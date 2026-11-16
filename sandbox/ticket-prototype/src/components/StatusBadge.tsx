
import type { TicketStatus } from "../types/ticket";

type Props = {
  status: TicketStatus;
};

function StatusBadge({ status }: Props) {
  return (
    <span className={`status-badge ${status.toLowerCase().replace(" ", "-")}`}>
      {status}
    </span>
  );
}

export default StatusBadge;
