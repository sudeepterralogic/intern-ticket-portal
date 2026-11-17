
import type { UserRole } from "../types/ticket";

type Props = {
  username: string;
  role: UserRole;
  onLogout: () => void;
};

function Header({ username, role, onLogout }: Props) {
  return (
    <header className="header">
      <div>
        <h3>Welcome, {username}</h3>
        <p>{role}</p>
      </div>

      <button onClick={onLogout}>Logout</button>
    </header>
  );
}

export default Header;
