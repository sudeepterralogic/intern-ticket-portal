
import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import type { ManagedUser, UpdateUserInput } from "../types/ticket";

import { useAppDispatch, useAppSelector } from "../store/hooks";
import { selectRole } from "../store/authSlice";
import {
  createUser,
  deleteUser,
  fetchUsers,
  selectUsers,
  selectUsersError,
  selectUsersStatus,
  updateUser,
} from "../store/usersSlice";
import Avatar from "../components/Avatar";
import Icon from "../components/Icon";
import { RoleBadge } from "../components/StatusBadge";

// Reads users from the Redux store and changes them with thunks.
// No API calls here: the thunks call services/api.ts (axios).
function Users() {
  const dispatch = useAppDispatch();
  const currentRole = useAppSelector(selectRole);
  const users = useAppSelector(selectUsers);
  const listStatus = useAppSelector(selectUsersStatus);
  const listError = useAppSelector(selectUsersError);

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

  // Load the list when the page opens (Admin only; the backend returns 403 otherwise)
  useEffect(() => {
    if (currentRole === "Admin") {
      dispatch(fetchUsers());
    }
  }, [dispatch, currentRole]);

  if (currentRole !== "Admin") {
    return <p className="alert alert-error">You do not have permission to view users.</p>;
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

    // unwrap() throws the thunk's rejectWithValue message when it fails
    let errorMessage: string | null = null;

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
      try {
        await dispatch(updateUser({ id: editingUser.id, changes })).unwrap();
      } catch (message) {
        errorMessage = String(message);
      }
      setIsSaving(false);

      if (!errorMessage) {
        setSuccess(`"${username.trim()}" updated successfully.`);
      }
    } else {
      // CREATE -> POST /api/users  (don't send an id: the database creates it)
      setIsSaving(true);
      try {
        await dispatch(
          createUser({
            name: name.trim(),
            username: username.trim(),
            email: email.trim(),
            password,
            role,
          }),
        ).unwrap();
      } catch (message) {
        errorMessage = String(message);
      }
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

  const handleDelete = async (id: number) => {
    if (!window.confirm("Are you sure you want to delete this account?")) return;

    try {
      await dispatch(deleteUser(id)).unwrap();
    } catch (message) {
      alert(String(message));
    }
  };

  const isEditing = editingUser !== null;

  return (
    <section>
      <div className="page-header">
        <div>
          <h1>Users</h1>
          <p className="page-subtitle">Create and manage agent and user accounts.</p>
        </div>
      </div>

      <div className="users-layout">
        <form className="card form" onSubmit={handleSubmit}>
          <h3 className="card-title">
            {isEditing
              ? `Edit ${editingUser.role}: ${editingUser.username}`
              : "New account"}
          </h3>

          <div className="field">
            <label htmlFor="user-name">Full name</label>
            <input
              id="user-name"
              type="text"
              placeholder="e.g. Priya Sharma"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
            />
          </div>

          <div className="field">
            <label htmlFor="user-username">Username</label>
            <input
              id="user-username"
              type="text"
              placeholder="Used to sign in"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              required
            />
          </div>

          <div className="field">
            <label htmlFor="user-email">Email</label>
            <input
              id="user-email"
              type="email"
              placeholder="name@company.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </div>

          <div className="field">
            <label htmlFor="user-password">Password</label>
            <input
              id="user-password"
              type="password"
              placeholder={
                isEditing
                  ? "Leave blank to keep the current password"
                  : "At least 6 characters"
              }
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required={!isEditing}
              minLength={6}
            />
          </div>

          <div className="field">
            <span className="field-label">Role</span>
            <div className="segmented segmented-full" role="radiogroup" aria-label="Role">
              {(["User", "Agent"] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={role === value}
                  className={role === value ? "active" : ""}
                  onClick={() => setRole(value)}
                >
                  {value}
                </button>
              ))}
            </div>
          </div>

          {error && <p className="alert alert-error">{error}</p>}
          {success && <p className="alert alert-success">{success}</p>}

          <div className="form-actions">
            {isEditing && (
              <button
                type="button"
                className="btn btn-ghost"
                onClick={cancelEdit}
                disabled={isSaving}
              >
                Cancel
              </button>
            )}
            <button className="btn btn-primary" type="submit" disabled={isSaving}>
              {isSaving
                ? "Saving..."
                : isEditing
                  ? "Save changes"
                  : "Create account"}
            </button>
          </div>
        </form>

        <div className="card card-flush">
          <div className="toolbar">
            <h3>All accounts</h3>
            <span className="count-pill">{users.length}</span>
          </div>

          {listStatus === "loading" && <p className="field-hint pad">Loading users...</p>}
          {listError && <p className="alert alert-error pad">{listError}</p>}

          {users.length === 0 && listStatus !== "loading" ? (
            <div className="empty-state">
              <span className="empty-icon">
                <Icon name="users" size={24} />
              </span>
              <p className="empty-title">No accounts yet</p>
              <p className="text-muted">Create your first agent or user with the form.</p>
            </div>
          ) : (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th aria-label="Actions" />
                  </tr>
                </thead>

                <tbody>
                  {users.map((user) => (
                    <tr
                      key={user.id}
                      className={editingUser?.id === user.id ? "row-selected" : ""}
                    >
                      <td>
                        <span className="person">
                          <Avatar name={user.name} size={32} />
                          <span>
                            <span className="cell-title">{user.name}</span>
                            <span className="cell-sub">@{user.username}</span>
                          </span>
                        </span>
                      </td>
                      <td className="text-muted">{user.email}</td>
                      <td><RoleBadge role={user.role} /></td>
                      <td className="cell-action">
                        {user.role !== "Admin" && (
                          <div className="row-actions">
                            <button
                              type="button"
                              className="icon-btn"
                              title="Edit"
                              aria-label={`Edit ${user.username}`}
                              onClick={() => startEdit(user)}
                            >
                              <Icon name="edit" size={16} />
                            </button>
                            <button
                              type="button"
                              className="icon-btn icon-btn-danger"
                              title="Delete"
                              aria-label={`Delete ${user.username}`}
                              onClick={() => handleDelete(user.id)}
                            >
                              <Icon name="trash" size={16} />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

export default Users;
