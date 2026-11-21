import TicketForm from "../components/TicketForm";
import type { CreateTicketInput } from "../types/ticket";

type Props = {
  onAddTicket: (ticket: CreateTicketInput) => Promise<string | null>;
};

function CreateTicket({ onAddTicket }: Props) {
  return (
    <section>
      <div className="page-header">
        <div>
          <h1>Create ticket</h1>
          <p className="page-subtitle">
            Describe the problem. An admin will assign it to an agent.
          </p>
        </div>
      </div>
      <TicketForm onAddTicket={onAddTicket} />
    </section>
  );
}

export default CreateTicket;
