import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Landing from "./Landing";
import MarketsPage from "./MarketsPage";
import CompanyPage from "./CompanyPage";
import BacktestPage from "./BacktestPage";
import Footer from "./Footer";

// The landing page has its own footer; the app screens share the small one
const WithFooter: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <>
    {children}
    <Footer />
  </>
);

const App: React.FC = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/app" element={<WithFooter><MarketsPage /></WithFooter>} />
        <Route path="/welcome" element={<Navigate to="/app" replace />} />
        <Route path="/crypto/:crypto" element={<WithFooter><CompanyPage /></WithFooter>} />
        <Route path="/backtest" element={<WithFooter><BacktestPage /></WithFooter>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
};

export default App;
