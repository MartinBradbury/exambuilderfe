import Nav from "react-bootstrap/Nav";
import Navbar from "react-bootstrap/Navbar";
import { useContext, useState, useEffect } from "react";
import axios from "axios";
import { UserContext } from "../context/UserContext";
import "../styles/NavBar.css";

function NavBar() {
  const { user, logout } = useContext(UserContext); // user state comes from context
  const [username, setUsername] = useState("");

  useEffect(() => {
    const fetchUser = async () => {
      const token = localStorage.getItem("accessToken");
      if (!token) {
        setUsername("");
        return;
      }

      try {
        const response = await axios.get(
          "http://127.0.0.1:8000/accounts/user/",
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        setUsername(response.data.username);
      } catch (err) {
        console.error("Error fetching user:", err);
        setUsername("");
      }
    };

    fetchUser();
  }, [user]);

  return (
    <Navbar expand="lg" className="site-navbar">
      <Navbar.Brand href="/">Exam Question Generator</Navbar.Brand>
      <Navbar.Toggle aria-controls="basic-navbar-nav" />
      <Navbar.Collapse id="basic-navbar-nav">
        <Nav className="me-auto">
          {/* When NOT logged in */}
          {!user && (
            <>
              <Nav.Link href="/login">Login</Nav.Link>
              <Nav.Link href="/register">Register</Nav.Link>
            </>
          )}

          {/* When logged in */}
          {user && (
            <>
              <Nav.Link href="/question-generator">Generate Questions</Nav.Link>
              <Nav.Link href="/my-results">My Feedback</Nav.Link>
            </>
          )}
        </Nav>

        {/* Optional greeting */}
        {user ? (
          <div>
            <h2>Hello, {username}!</h2>
            <button className="btn-logout" onClick={logout}>
              Logout
            </button>
          </div>
        ) : (
          <h2>Please login</h2>
        )}
      </Navbar.Collapse>
    </Navbar>
  );
}

export default NavBar;
