import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import StartPage from "./StartPage";
import LandingPage from "./LandingPage";
import CompanyPage from "./CompanyPage";


const App: React.FC = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<StartPage />} />
        <Route path="/welcome" element={<LandingPage />} />
        <Route path="/company/:companyName" element={<CompanyPage />} /> {/* Dynamic Route */}
      </Routes>
    </Router>
  );
};

export default App;
