import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import StartPage from "./StartPage";
import LandingPage from "./LandingPage";
import CompanyPage from "./CompanyPage";
import BacktestPage from "./BacktestPage";
import Footer from "./Footer";

const App: React.FC = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<StartPage />} />
        <Route path="/welcome" element={<LandingPage />} />
        <Route path="/crypto/:crypto" element={<CompanyPage />} /> {/* Dynamic Route for Cryptos */}
        <Route path="/backtest" element={<BacktestPage />} />
      </Routes>
      <Footer />
    </Router>
  );
};

export default App;
