import Button from "react-bootstrap/Button";
import Col from "react-bootstrap/Col";
import Form from "react-bootstrap/Form";
import Row from "react-bootstrap/Row";
import { useState, useContext } from "react";
import axios from "axios";
import { UserContext } from "../context/UserContext"; // 👈 import context
import "../styles/Login.css";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const { login } = useContext(UserContext); // 👈 get login from context
  const navigate = useNavigate();

  const [successMessage, setSuccessMessage] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isLoading) return;

    setIsLoading(true);
    try {
      const response = await axios.post(
        "http://127.0.0.1:8000/accounts/login/",
        formData
      );

      console.log("success", response.data);
      setSuccessMessage("Login Successful");
      setErrorMessage(null);

      // store tokens in local storage
      localStorage.setItem("accessToken", response.data.access);
      localStorage.setItem("refreshToken", response.data.refresh);

      // 👇 tell context about login (decode token + set user)
      login(response.data.access);
      navigate("/");

      setIsLoading(false);
    } catch (error) {
      console.log("error", error.response?.data);
      if (error.response && error.response.data) {
        Object.keys(error.response.data).forEach((field) => {
          const errorMessages = error.response.data[field];
          if (errorMessages && errorMessages.length > 0) {
            setErrorMessage(errorMessages[0]);
          }
        });
      }
      setIsLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <h2>Login to Your Account</h2>

        {errorMessage && (
          <p className="alert-message alert-error">{errorMessage}</p>
        )}
        {successMessage && (
          <p className="alert-message alert-success">{successMessage}</p>
        )}

        <Form onSubmit={handleSubmit}>
          <Form.Group as={Row} className="mb-3" controlId="formHorizontalEmail">
            <Form.Label column sm={3}>
              Email
            </Form.Label>
            <Col sm={9}>
              <Form.Control
                type="email"
                placeholder="Email"
                name="email"
                value={formData.email}
                onChange={handleChange}
              />
            </Col>
          </Form.Group>

          <Form.Group
            as={Row}
            className="mb-3"
            controlId="formHorizontalPassword"
          >
            <Form.Label column sm={3}>
              Password
            </Form.Label>
            <Col sm={9}>
              <Form.Control
                type="password"
                placeholder="Password"
                name="password"
                value={formData.password}
                onChange={handleChange}
              />
            </Col>
          </Form.Group>

          <Form.Group as={Row} className="mb-3">
            <Col sm={{ span: 9, offset: 3 }}>
              <Button
                type="submit"
                disabled={isLoading}
                className="btn-primary"
              >
                {isLoading ? "Logging in..." : "Login"}
              </Button>
            </Col>
          </Form.Group>
        </Form>
      </div>
    </div>
  );
}
