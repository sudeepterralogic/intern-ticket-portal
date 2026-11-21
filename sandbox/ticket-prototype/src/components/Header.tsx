import type { UserRole } from "../types/ticket";
import Avatar from "./Avatar";
import Icon from "./Icon";
import { RoleBadge } from "./StatusBadge";

type Props = {
  username: string;
  role: UserRole;
  onLogout: () => void;
};

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function Header({ username, role, onLogout }: Props) {
  return (
    <header className="header">
      <div>
        <p className="header-greeting">{greeting()},</p>
        <h3 className="header-name">{username}</h3>
      </div>

      <div className="header-right">
        <div className="header-user">
          <Avatar name={username} size={34} />
          <RoleBadge role={role} />
        </div>

        <button className="btn btn-ghost" onClick={onLogout}>
          <Icon name="logout" size={16} />
          <span>Logout</span>
        </button>
      </div>
    </header>
  );
}

export default Header;
