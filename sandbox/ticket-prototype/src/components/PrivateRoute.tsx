
import { Navigate, Outlet } from "react-router-dom";

type Props = {
  isLoggedIn: boolean;
};

function PrivateRoute({ isLoggedIn }: Props) {
  if (!isLoggedIn) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}

export default PrivateRoute;
