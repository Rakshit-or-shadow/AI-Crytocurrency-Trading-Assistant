import React from "react";
import { useNavigate } from "react-router-dom";
import "./styles/LandingPage.css"; 
import "./styles/main.css";

const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  
  // List of top 10 cryptocurrencies
  const topCryptos = [
    "Bitcoin", "Ethereum", "Solana", "Ripple", "Cardano",
    "Dogecoin", "Polygon", "Litecoin", "Polkadot", "Bitcoin Cash"
  ];

  return (
    <div className="container">
      <h1>Welcome!</h1>
      <h3>Select a Cryptocurrency:</h3>
      <div className="options">
       
        {topCryptos.map((crypto) => (
          <button key={crypto} onClick={() => navigate(`/crypto/${crypto}`)}>
            {crypto}
          </button>
        ))}
      </div>
    </div>
  );
};

export default LandingPage;
