import React from "react";

interface Props {
  children?: React.ReactNode;
}

// Shown next to every signal, recommendation and AI decision.
const RiskNote: React.FC<Props> = ({ children }) => (
  <p className="notice" role="note">
    <strong>Not financial advice.</strong> Trading crypto carries risk. {children}
  </p>
);

export default RiskNote;
