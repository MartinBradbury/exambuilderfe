import Button from "react-bootstrap/Button";
import Col from "react-bootstrap/Col";
import Form from "react-bootstrap/Form";
import Row from "react-bootstrap/Row";
import { useState } from "react";
import axios from "axios";
import "../styles/Register.css";

function Register() {
  const [successMessage, setSuccessMessage] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const [formData, setFormData] = useState({
    username: "",
    email: "email",
    password1: "password1",
    password2: "password2",
  });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isLoading) {
      return;
    }
    setIsLoading(true);
    try {
      const response = await axios.post(
        "https://exambuilder-efae14d59f03.herokuapp.com/accounts/register/",
        formData
      );
      console.log("success", response.data);
      setSuccessMessage("Registration Successful");
      setErrorMessage(null);
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
    <div className="register-page">
      <div className="register-card">
        <h2>Create Your Account</h2>

        {errorMessage && (
          <p className="alert-message alert-error">{errorMessage}</p>
        )}
        {successMessage && (
          <p className="alert-message alert-success">{successMessage}</p>
        )}

        <Form onSubmit={handleSubmit}>
          <Form.Group
            as={Row}
            className="mb-3"
            controlId="formHorizontalUsername"
          >
            <Form.Label column sm={3}>
              Username
            </Form.Label>
            <Col sm={9}>
              <Form.Control
                type="text"
                placeholder="Username"
                name="username"
                value={formData.username}
                onChange={handleChange}
              />
            </Col>
          </Form.Group>

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
            controlId="formHorizontalPassword1"
          >
            <Form.Label column sm={3}>
              Password
            </Form.Label>
            <Col sm={9}>
              <Form.Control
                type="password"
                placeholder="Password"
                name="password1"
                value={formData.password1}
                onChange={handleChange}
              />
            </Col>
          </Form.Group>

          <Form.Group
            as={Row}
            className="mb-3"
            controlId="formHorizontalPassword2"
          >
            <Form.Label column sm={3}>
              Repeat Password
            </Form.Label>
            <Col sm={9}>
              <Form.Control
                type="password"
                placeholder="Repeat Password"
                name="password2"
                value={formData.password2}
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
                {isLoading ? "Registering..." : "Register"}
              </Button>
            </Col>
          </Form.Group>
        </Form>
      </div>
    </div>
  );
}

export default Register;
