import React from "react";
import { useNavigate } from "react-router-dom";
import "./styles/StartPage.css";
import "./styles/main.css"; // Import global styles

const StartPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="start-container">
      <h1 className="title">Crypto Trading Simulator</h1>
      <button className="play-button" onClick={() => navigate("/welcome")}>
        Start Trading
      </button>
      <h4 className="credits">Developed by FailedInvestmentBankers - HackED_2025</h4>
    </div>
  );
};

export default StartPage;
