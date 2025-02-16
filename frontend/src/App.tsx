import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import LandingPage from "./LandingPage";

const Explore: React.FC = () => <h2>Explore Page</h2>;
const Learn: React.FC = () => <h2>Learn Page</h2>;
const Trade: React.FC = () => <h2>Stock Trading Page</h2>;
const Contact: React.FC = () => <h2>Contact Us</h2>;

const App: React.FC = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/explore" element={<Explore />} />
        <Route path="/learn" element={<Learn />} />
        <Route path="/trade" element={<Trade />} />
        <Route path="/contact" element={<Contact />} />
      </Routes>
    </Router>
  );
};

export default App;
