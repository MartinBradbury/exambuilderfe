import "bootstrap/dist/css/bootstrap.min.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ViewResults from "./pages/ViewResults";
import NavBar from "./components/NavBar";
import QuestionGenerator from "./pages/QuestionGenerator";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Account from "./pages/Account";
import VerifyEmail from "./pages/VerifyEmail";
import TermsOfService from "./pages/TermsOfService";
import PaidPlanTerms from "./pages/PaidPlanTerms";
import RefundPolicy from "./pages/RefundPolicy";

function App() {
  return (
    <>
      <BrowserRouter>
        <NavBar />
        <Routes>
          <Route index element={<Home />} />
          <Route path="login" element={<Login />} />
          <Route path="forgot-password" element={<ForgotPassword />} />
          <Route path="reset-password" element={<ResetPassword />} />
          <Route path="verify-email" element={<VerifyEmail />} />
          <Route path="register" element={<Register />} />
          <Route path="account" element={<Account />} />
          <Route path="terms" element={<TermsOfService />} />
          <Route path="paid-plan-terms" element={<PaidPlanTerms />} />
          <Route path="refund-policy" element={<RefundPolicy />} />
          <Route path="question-generator" element={<QuestionGenerator />} />
          <Route path="/my-results" element={<ViewResults />} />
        </Routes>
      </BrowserRouter>
    </>
  );
}

export default App;
