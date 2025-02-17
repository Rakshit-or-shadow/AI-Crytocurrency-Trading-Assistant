import React from "react";
import { useNavigate } from "react-router-dom";
import "./styles/main.css"; // Import global styles
import "./styles/StartPage.css"



const StartPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="start-container">
      <h1 className="title">Stock Trading Simulator</h1>
      <button className="play-button" onClick={() => navigate("/welcome")}>
        Play
      </button>
      <p className="credits">Developed by FailedInvestmentBankers</p>
    </div>
  );
};

export default StartPage;
