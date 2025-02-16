import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import StartPage from "./StartPage";
import LandingPage from "./LandingPage";

const App: React.FC = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<StartPage />} /> {/* Default Start Page */}
        <Route path="/welcome" element={<LandingPage />} /> {/* Welcome Page */}
      </Routes>
    </Router>
  );
};

export default App;
