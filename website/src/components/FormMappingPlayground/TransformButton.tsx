import React from "react";
import { styles } from "./styles";

interface TransformButtonProps {
  onClick: (e: React.FormEvent) => void;
}

export const TransformButton: React.FC<TransformButtonProps> = ({
  onClick,
}) => (
  <button type="button" style={styles.button} onClick={onClick}>
    Prefill target form
  </button>
);
