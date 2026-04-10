import { useContext } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { UserContext } from "../context/UserContextObject";

export default function ProtectedRoute() {
  const { user, authReady } = useContext(UserContext) || {};
  const location = useLocation();

  if (!authReady) {
    return null;
  }

  if (!user) {
    return <Navigate to="/access-denied" replace state={{ from: location }} />;
  }

  return <Outlet />;
}
