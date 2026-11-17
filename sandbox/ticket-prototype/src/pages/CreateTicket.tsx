
import TicketForm from "../components/TicketForm";
import type { CreateTicketInput } from "../types/ticket";

type Props = {
  onAddTicket: (ticket: CreateTicketInput) => Promise<string | null>;
};

function CreateTicket({ onAddTicket }: Props) {
  return (
    <section>
      <h1>Create New Ticket</h1>
      <TicketForm onAddTicket={onAddTicket} />
    </section>
  );
}

export default CreateTicket;
