
import { useEffect, useState } from "react";
import type { Category, CreateTicketInput, TicketPriority } from "../types/ticket";
import { getCategories } from "../services/api";

type Props = {
  // Returns an error message, or null if the ticket was created.
  onAddTicket: (ticket: CreateTicketInput) => Promise<string | null>;
};

const PRIORITIES: TicketPriority[] = ["Low", "Medium", "High"];

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
    <form className="card form" onSubmit={handleSubmit}>
      <div className="field">
        <label htmlFor="ticket-title">Title</label>
        <input
          id="ticket-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Laptop won't connect to Wi-Fi"
          required
        />
      </div>

      <div className="field">
        <label htmlFor="ticket-description">Description</label>
        <textarea
          id="ticket-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What happened, and what did you expect?"
          required
        />
      </div>

      <div className="form-row">
        <div className="field">
          <label htmlFor="ticket-category">Category</label>
          <select
            id="ticket-category"
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
        </div>

        <div className="field">
          <span className="field-label">Priority</span>
          <div className="segmented segmented-full" role="radiogroup" aria-label="Priority">
            {PRIORITIES.map((value) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={priority === value}
                className={priority === value ? `active priority-${value.toLowerCase()}` : ""}
                onClick={() => setPriority(value)}
              >
                {value}
              </button>
            ))}
          </div>
        </div>
      </div>

      {error && <p className="alert alert-error">{error}</p>}

      <div className="form-actions">
        <button className="btn btn-primary" type="submit" disabled={submitting}>
          {submitting ? "Creating..." : "Create ticket"}
        </button>
      </div>
    </form>
  );
}

export default TicketForm;
