
import { Navigate, Outlet } from "react-router-dom";
import type { UserRole } from "../types/ticket";

type Props = {
  role: UserRole;
  allowedRoles: UserRole[];
};

function PermissionRoute({ role, allowedRoles }: Props) {
  if (!allowedRoles.includes(role)) {
    return <Navigate to="/access-denied" replace />;
  }

  return <Outlet />;
}

export default PermissionRoute;
