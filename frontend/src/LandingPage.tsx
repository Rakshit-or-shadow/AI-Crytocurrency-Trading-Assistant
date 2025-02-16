import React from "react";
import { useNavigate } from "react-router-dom";
import "./LandingPage.css"; // Import the CSS file

const LandingPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="container">
      <h1>Welcome!</h1>
      <div className="options">
      <h3>Which company do you wanna trade?</h3>
        <button onClick={() => navigate("/NVDA")}>NVIDIA</button>
        <button onClick={() => navigate("GOOGL")}>GOOGLE</button>
        <button onClick={() => navigate("/APPL")}>APPLE</button>
        <button onClick={() => navigate("/META")}>META</button>
        <button onClick={() => navigate("/TSLA")}>TESLA</button>
        <button onClick={() => navigate("/MSFT")}>MICROSOFT</button>
        <button onClick={() => navigate("/PLTR")}>PALANTIR</button>
        <button onClick={() => navigate("/AMZN")}>AMAZON</button>
        <button onClick={() => navigate("/AMD")}>AMD</button>
        <button onClick={() => navigate("/INTC")}>INTEL</button>
      </div>
    </div>
  );
};

export default LandingPage;
