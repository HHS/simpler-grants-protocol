import React from "react";
import { schemas } from "@/lib/schemas";
import { styles } from "./styles";

interface SchemaSelectorProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
}

export const SchemaSelector: React.FC<SchemaSelectorProps> = ({
  label,
  value,
  onChange,
}) => (
  <div>
    <label style={styles.selectLabel}>
      {label}
      <select
        style={styles.select}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {Object.values(schemas).map((opt) => (
          <option key={opt.id} value={opt.id}>
            {opt.label}
          </option>
        ))}
      </select>
    </label>
  </div>
);
