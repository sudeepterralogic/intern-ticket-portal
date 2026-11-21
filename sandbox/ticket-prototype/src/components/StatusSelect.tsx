import { useState } from "react";
import type { Ticket, TicketStatus } from "../types/ticket";

type Props = {
  ticket: Ticket;
  // Returns an error message, or null if the new status was saved.
  onUpdateStatus: (ticketId: number, status: TicketStatus) => Promise<string | null>;
};

const STATUSES: TicketStatus[] = ["Open", "In Progress", "Closed"];

// Shown to the Admin, and to the Agent the ticket is assigned to.
// Saves the status on the backend (PATCH /tickets/:id/status).
function StatusSelect({ ticket, onUpdateStatus }: Props) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleChange = async (status: TicketStatus) => {
    if (status === ticket.status) return;

    setError("");
    setSaving(true);
    const errorMessage = await onUpdateStatus(ticket.id, status);
    setSaving(false);

    if (errorMessage) setError(errorMessage);
  };

  return (
    <div className="inline-field">
      <select
        value={ticket.status}
        className="select-sm"
        disabled={saving}
        onChange={(e) => handleChange(e.target.value as TicketStatus)}
      >
        {STATUSES.map((status) => (
          <option key={status} value={status}>
            {status}
          </option>
        ))}
      </select>

      {saving && <small className="field-hint">Saving...</small>}
      {error && <small className="field-error">{error}</small>}
    </div>
  );
}

export default StatusSelect;
