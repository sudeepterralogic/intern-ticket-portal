
import { useEffect, useState } from "react";
import type { Category, CreateTicketInput, TicketPriority } from "../types/ticket";
import { getCategories } from "../services/api";

type Props = {
  // Returns an error message, or null if the ticket was created.
  onAddTicket: (ticket: CreateTicketInput) => Promise<string | null>;
};

function TicketForm({ onAddTicket }: Props) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<TicketPriority>("Medium");
  const [categoryId, setCategoryId] = useState<number | "">("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Load the categories for the dropdown from GET /api/categories
  useEffect(() => {
    getCategories()
      .then((list) => {
        setCategories(list);
        if (list.length > 0) setCategoryId(list[0].id);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Unable to load categories"));
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");

    if (!title.trim() || !description.trim()) {
      return;
    }

    if (categoryId === "") {
      setError("Please choose a category.");
      return;
    }

    setSubmitting(true);
    const errorMessage = await onAddTicket({
      title: title.trim(),
      description: description.trim(),
      priority,
      categoryId,
    });
    setSubmitting(false);

    if (errorMessage) {
      setError(errorMessage);
      return;
    }

    setTitle("");
    setDescription("");
    setPriority("Medium");
  };

  return (
    <form className="ticket-form" onSubmit={handleSubmit}>
      <label>Ticket Title</label>
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Enter ticket title"
        required
      />

      <label>Description</label>
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Enter ticket description"
        required
      />

      <label>Category</label>
      <select
        value={categoryId}
        onChange={(e) => setCategoryId(Number(e.target.value))}
        required
      >
        {categories.length === 0 && <option value="">No categories available</option>}
        {categories.map((category) => (
          <option key={category.id} value={category.id}>
            {category.name}
          </option>
        ))}
      </select>

      <label>Priority</label>
      <select
        value={priority}
        onChange={(e) => setPriority(e.target.value as TicketPriority)}
      >
        <option value="Low">Low</option>
        <option value="Medium">Medium</option>
        <option value="High">High</option>
      </select>

      {error && <p className="error-text" style={{ color: "crimson" }}>{error}</p>}

      <button type="submit" disabled={submitting}>
        {submitting ? "Creating..." : "Create Ticket"}
      </button>
    </form>
  );
}

export default TicketForm;
