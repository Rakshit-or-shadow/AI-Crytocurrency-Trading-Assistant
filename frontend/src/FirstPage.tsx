import React from "react";
import { useNavigate } from "react-router-dom";

const MainPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col justify-between bg-gray-900 text-white">
      <div className="h-1/3 flex items-center justify-center bg-blue-500">
        <h1 className="text-4xl font-bold">Stock Market Simulator</h1>
      </div>
      <div className="h-1/3 flex items-center justify-center">
        <button
          className="px-10 py-5 text-2xl font-bold bg-green-500 hover:bg-green-600 rounded-lg shadow-lg"
          onClick={() => navigate("/landing")}
        >
          Play
        </button>
      </div>
      <div className="h-1/3 flex items-center justify-center bg-gray-800">
        <p className="text-lg">Credit: Rakshit, Gurbaaz, Anant</p>
      </div>
    </div>
  );
};

export default MainPage;
