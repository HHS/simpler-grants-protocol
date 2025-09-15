import React, { useState } from "react";
import SwaggerUI from "swagger-ui-react";
import "swagger-ui-react/swagger-ui.css";

// Available OpenAPI versions
const availableVersions = [
  { version: "0.3.0", label: "v0.3.0 (Pre-release)" },
  { version: "0.2.0", label: "v0.2.0 (Latest)" },
  { version: "0.1.0", label: "v0.1.0" },
];

// Get the default version (latest)
const defaultVersion = availableVersions[1].version;

interface OpenApiDocsProps {
  className?: string;
}

// #########################################################
// URL parameter utilities
// #########################################################

const getUrlParams = () => {
  if (typeof window === "undefined") return { version: "" };
  const urlParams = new URLSearchParams(window.location.search);
  return {
    version: urlParams.get("version") || "",
  };
};

const updateUrlParams = (version: string) => {
  if (typeof window === "undefined") return;

  const url = new URL(window.location.href);
  url.searchParams.set("version", version);

  // Update URL without causing a page reload
  window.history.replaceState({}, "", url.toString());
};

const getValidVersion = (version: string, fallbackVersion: string): string => {
  if (!version || !availableVersions.some((v) => v.version === version)) {
    return fallbackVersion;
  }
  return version;
};

// #########################################################
// Styles matching SchemaSelector
// #########################################################

const styles = {
  versionSelector: {
    maxWidth: "480px",
  },
  selectLabel: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "0.5rem",
    fontWeight: "600",
    color: "var(--sl-color-text)",
  },
  select: {
    padding: "0.5rem",
    borderRadius: "6px",
    border: "1px solid var(--sl-color-gray-5)",
    fontSize: "16px",
    fontFamily: "system-ui, sans-serif",
    background: "var(--sl-color-black)",
    color: "var(--sl-color-white)",
  },
};

export default function OpenApiDocs({ className }: OpenApiDocsProps) {
  // #########################################################
  // Set up state management
  // #########################################################

  // Step 1: Read URL parameters on initial load
  const urlParams = getUrlParams();
  const initialVersion = getValidVersion(urlParams.version, defaultVersion);

  // Step 2: Create the state for the selected version
  const [selectedVersion, setSelectedVersion] = useState(initialVersion);
  const [key, setKey] = useState(0); // Force re-render when version changes

  // #########################################################
  // Handle version changes
  // #########################################################
  const handleVersionChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const newVersion = event.target.value;
    setSelectedVersion(newVersion);
    setKey((prev) => prev + 1); // Force SwaggerUI to re-render
    updateUrlParams(newVersion);
  };

  return (
    <div className={className}>
      <div style={styles.versionSelector}>
        <label style={styles.selectLabel}>
          API Version
          <select
            style={styles.select}
            value={selectedVersion}
            onChange={handleVersionChange}
          >
            {availableVersions.map(({ version, label }) => (
              <option key={version} value={version}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div id="swagger-container">
        <SwaggerUI
          key={key}
          url={`/openapi/openapi.${selectedVersion}.yaml`}
          supportedSubmitMethods={[]}
        />
      </div>
    </div>
  );
}
