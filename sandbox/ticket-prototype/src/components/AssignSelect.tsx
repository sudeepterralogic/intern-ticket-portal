
import { useState } from "react";
import type { ManagedUser, Ticket } from "../types/ticket";

// The agents list, loaded once in App and shared by every dropdown
export type AgentsState = {
  agents: ManagedUser[];
  loading: boolean;
  error: string;
};

type Props = {
  ticket: Ticket;
  agentsState: AgentsState;
  // Returns an error message, or null if the assignment was saved.
  onAssign: (ticketId: number, agentId: number | null) => Promise<string | null>;
};

// Admin-only dropdown: "Unassigned" + the agents fetched from the backend
function AssignSelect({ ticket, agentsState, onAssign }: Props) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const { agents, loading, error: loadError } = agentsState;

  if (loading) {
    return <span className="field-hint">Loading agents...</span>;
  }

  if (loadError) {
    return <span className="field-error">{loadError}</span>;
  }

  const handleChange = async (value: string) => {
    const agentId = value === "" ? null : Number(value);
    if (agentId === ticket.assignedToId) return;

    setError("");
    setSaving(true);
    const errorMessage = await onAssign(ticket.id, agentId);
    setSaving(false);

    if (errorMessage) setError(errorMessage);
  };

  return (
    <div className="inline-field">
      <select
        value={ticket.assignedToId ?? ""}
        className="select-sm"
        disabled={saving}
        onChange={(e) => handleChange(e.target.value)}
      >
        <option value="">Unassigned</option>
        {agents.map((agent) => (
          <option key={agent.id} value={agent.id}>
            {agent.name}
          </option>
        ))}
      </select>

      {saving && <small className="field-hint">Saving...</small>}
      {agents.length === 0 && (
        <small className="field-hint">No active agents available.</small>
      )}
      {error && <small className="field-error">{error}</small>}
    </div>
  );
}

export default AssignSelect;
