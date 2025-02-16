import React from "react";
import { useNavigate } from "react-router-dom";
import "./styles.css"; // Import the CSS file

const LandingPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="container">
      <h1>Welcome!</h1>
      <div className="options">
      <h3>Which company do you wanna trade?</h3>
        <button onClick={() => navigate("/explore")}>Company1</button>
        <button onClick={() => navigate("/learn")}>Company2</button>
        <button onClick={() => navigate("/trade")}>Company3</button>
        <button onClick={() => navigate("/contact")}>Company4</button>
        <button onClick={() => navigate("/contact")}>Company5</button>
        <button onClick={() => navigate("/contact")}>Company6</button>
        <button onClick={() => navigate("/contact")}>Company7</button>
        <button onClick={() => navigate("/contact")}>Company8</button>
        <button onClick={() => navigate("/contact")}>Company9</button>
        <button onClick={() => navigate("/contact")}>Company10</button>
      </div>
    </div>
  );
};

export default LandingPage;
