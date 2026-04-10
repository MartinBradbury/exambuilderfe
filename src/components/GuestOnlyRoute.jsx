import { useContext } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { UserContext } from "../context/UserContextObject";

export default function GuestOnlyRoute() {
  const { user, authReady } = useContext(UserContext) || {};

  if (!authReady) {
    return null;
  }

  if (user) {
    return <Navigate to="/account" replace />;
  }

  return <Outlet />;
}
