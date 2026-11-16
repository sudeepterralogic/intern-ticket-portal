
import { useState } from "react";
import type { FormEvent } from "react";
import type {
  UserRole,
  ManagedUser,
  CreateUserInput,
  UpdateUserInput,
} from "../types/ticket";

type Props = {
  currentRole: UserRole;
  users: ManagedUser[];
  // Both return an error message, or null when it worked
  onCreateUser: (user: CreateUserInput) => Promise<string | null>;
  onUpdateUser: (id: number, changes: UpdateUserInput) => Promise<string | null>;
  onDeleteUser: (id: number) => void;
};

function Users({
  currentRole,
  users,
  onCreateUser,
  onUpdateUser,
  onDeleteUser,
}: Props) {
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"Agent" | "User">("User");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // null = creating a new user; a user = editing that user
  const [editingUser, setEditingUser] = useState<ManagedUser | null>(null);

  if (currentRole !== "Admin") {
    return <p>You do not have permission to view users.</p>;
  }

  const resetForm = () => {
    setEditingUser(null);
    setName("");
    setUsername("");
    setEmail("");
    setPassword("");
    setRole("User");
  };

  // "Edit" button: put that user's details into the form
  const startEdit = (user: ManagedUser) => {
    setEditingUser(user);
    setName(user.name);
    setUsername(user.username);
    setEmail(user.email);
    setPassword(""); // empty = keep the current password
    setRole(user.role === "Agent" ? "Agent" : "User");
    setError("");
    setSuccess("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const cancelEdit = () => {
    resetForm();
    setError("");
    setSuccess("");
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    let errorMessage: string | null;

    if (editingUser) {
      // EDIT -> PUT /api/users/:id  (send only the fields that changed)
      const changes: UpdateUserInput = {};
      if (name.trim() !== editingUser.name) changes.name = name.trim();
      if (username.trim() !== editingUser.username) changes.username = username.trim();
      if (email.trim() !== editingUser.email) changes.email = email.trim();
      if (role !== editingUser.role) changes.role = role;
      if (password) changes.password = password;

      if (Object.keys(changes).length === 0) {
        setError("Nothing was changed.");
        return;
      }

      setIsSaving(true);
      errorMessage = await onUpdateUser(editingUser.id, changes);
      setIsSaving(false);

      if (!errorMessage) {
        setSuccess(`"${username.trim()}" updated successfully.`);
      }
    } else {
      // CREATE -> POST /api/users  (don't send an id: the database creates it)
      setIsSaving(true);
      errorMessage = await onCreateUser({
        name: name.trim(),
        username: username.trim(),
        email: email.trim(),
        password,
        role,
      });
      setIsSaving(false);

      if (!errorMessage) {
        setSuccess(`${role} "${username.trim()}" created successfully.`);
      }
    }

    if (errorMessage) {
      setError(errorMessage);
      return;
    }

    resetForm();
  };

  const isEditing = editingUser !== null;

  return (
    <section>
      <h1>User Management</h1>

      <form className="ticket-form" onSubmit={handleSubmit}>
        <h2>
          {isEditing
            ? `Edit ${editingUser.role}: ${editingUser.username}`
            : "Create Agent / User"}
        </h2>

        <label>Name</label>
        <input
          type="text"
          placeholder="Enter full name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          required
        />

        <label>Username</label>
        <input
          type="text"
          placeholder="Enter username (used to log in)"
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          required
        />

        <label>Email</label>
        <input
          type="email"
          placeholder="Enter email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />

        <label>Password</label>
        <input
          type="password"
          placeholder={
            isEditing
              ? "Leave blank to keep the current password"
              : "Enter password"
          }
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required={!isEditing}
          minLength={6}
        />

        <label>Role</label>
        <select
          value={role}
          onChange={(event) =>
            setRole(event.target.value as "Agent" | "User")
          }
        >
          <option value="User">User</option>
          <option value="Agent">Agent</option>
        </select>

        <button type="submit" disabled={isSaving}>
          {isSaving
            ? "Saving..."
            : isEditing
              ? "Save Changes"
              : "Create Account"}
        </button>

        {isEditing && (
          <button
            type="button"
            onClick={cancelEdit}
            disabled={isSaving}
            style={{ marginTop: "8px", background: "#64748b" }}
          >
            Cancel
          </button>
        )}

        {error && <p className="error-message">{error}</p>}
        {success && <p style={{ color: "#15803d" }}>{success}</p>}
      </form>

      <h2>All Users and Agents</h2>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Username</th>
              <th>Email</th>
              <th>Role</th>
              <th>Action</th>
            </tr>
          </thead>

          <tbody>
            {users.length === 0 ? (
              <tr>
                <td colSpan={5}>No users or agents created yet.</td>
              </tr>
            ) : (
              users.map((user) => (
                <tr key={user.id}>
                  <td>{user.name}</td>
                  <td>{user.username}</td>
                  <td>{user.email}</td>
                  <td>{user.role}</td>
                  <td>
                    {user.role !== "Admin" && (
                      <div style={{ display: "flex", gap: "8px" }}>
                        <button
                          type="button"
                          onClick={() => startEdit(user)}
                          style={{ background: "#f59e0b" }}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteUser(user.id)}
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default Users;
