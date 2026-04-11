import "bootstrap/dist/css/bootstrap.min.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ViewResults from "./pages/ViewResults";
import NavBar from "./components/NavBar";
import ProtectedRoute from "./components/ProtectedRoute";
import GuestOnlyRoute from "./components/GuestOnlyRoute";
import QuestionGenerator from "./pages/QuestionGenerator";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Account from "./pages/Account";
import VerifyEmail from "./pages/VerifyEmail";
import TermsOfService from "./pages/TermsOfService";
import PaidPlanTerms from "./pages/PaidPlanTerms";
import RefundPolicy from "./pages/RefundPolicy";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import AccessDenied from "./pages/AccessDenied";
import NotFound from "./pages/NotFound";
import Specification from "./pages/Specification";
import Progress from "./pages/Progress";

function App() {
  return (
    <>
      <BrowserRouter>
        <NavBar />
        <Routes>
          <Route index element={<Home />} />
          <Route path="access-denied" element={<AccessDenied />} />
          <Route path="specification" element={<Specification />} />
          <Route path="terms" element={<TermsOfService />} />
          <Route path="privacy-policy" element={<PrivacyPolicy />} />
          <Route path="paid-plan-terms" element={<PaidPlanTerms />} />
          <Route path="refund-policy" element={<RefundPolicy />} />
          <Route element={<GuestOnlyRoute />}>
            <Route path="login" element={<Login />} />
            <Route path="register" element={<Register />} />
          </Route>
          <Route element={<ProtectedRoute />}>
            <Route path="forgot-password" element={<ForgotPassword />} />
            <Route path="reset-password" element={<ResetPassword />} />
            <Route path="verify-email" element={<VerifyEmail />} />
            <Route path="account" element={<Account />} />
            <Route path="progress" element={<Progress />} />
            <Route path="question-generator" element={<QuestionGenerator />} />
            <Route path="my-results" element={<ViewResults />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </>
  );
}

export default App;
