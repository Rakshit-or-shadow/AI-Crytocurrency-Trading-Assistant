import React from "react";
import { useNavigate } from "react-router-dom";
import "./LandingPage.css"; 
import "./styles.css"


const LandingPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="container">
      <h1>Welcome!</h1>
      <div className="options">
      <h3>Which company do you wanna trade?</h3>
        <button onClick={() => navigate("/company/NVIDIA")}>NVIDIA</button>
        <button onClick={() => navigate("/company/ALPHABET")}>GOOGLE</button>
        <button onClick={() => navigate("company/APPLE")}>APPLE</button>
        <button onClick={() => navigate("/company/META")}>META</button>
        <button onClick={() => navigate("/company/TESLA")}>TESLA</button>
        <button onClick={() => navigate("/company/MICROSOFT")}>MICROSOFT</button>
        <button onClick={() => navigate("/company/PALANTIR")}>PALANTIR</button>
        <button onClick={() => navigate("/company/AMAZON")}>AMAZON</button>
        <button onClick={() => navigate("/company/AMD")}>AMD</button>
        <button onClick={() => navigate("/company/INTEL")}>INTEL</button>
      </div>
    </div>
  );
};

export default LandingPage;
