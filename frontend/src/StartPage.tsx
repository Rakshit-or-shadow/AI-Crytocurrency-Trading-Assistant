import React from "react";
import { useNavigate } from "react-router-dom";
import "./styles/StartPage.css";
import "./styles/main.css"; // Import global styles

const StartPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="start-container">
      <h1 className="title">Crypto Price Tracker</h1>
      <button className="play-button" onClick={() => navigate("/welcome")}>
        Start Tracking
      </button>
      <p className="credits">Developed by FailedInvestmentBankers</p>
    </div>
  );
};

export default StartPage;
