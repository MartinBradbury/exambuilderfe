import "bootstrap/dist/css/bootstrap.min.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ViewResults from "./pages/ViewResults";
import NavBar from "./components/NavBar";
import QuestionGenerator from "./pages/QuestionGenerator";

function App() {
  return (
    <>
      <BrowserRouter>
        <NavBar />
        <Routes>
          <Route index element={<Home />} />
          <Route path="login" element={<Login />} />
          <Route path="register" element={<Register />} />
          <Route path="question-generator" element={<QuestionGenerator />} />
          <Route path="/my-results" element={<ViewResults />} />
        </Routes>
      </BrowserRouter>
    </>
  );
}

export default App;
