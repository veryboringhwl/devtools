import { createRoot } from "react-dom/client";
import { Toaster } from "sonner";

import { App } from "./App.tsx";
import { ErrorBoundary } from "./components/ErrorBoundary.tsx";

const container = document.getElementById("root");
if (container) {
  createRoot(container).render(
    <ErrorBoundary>
      <App />
      <Toaster
        position="bottom-right"
        theme="dark"
        toastOptions={{
          style: {
            background: "#1e1e1e",
            border: "1px solid #3c4043",
            color: "#bdc1c6",
            fontSize: "12px",
            fontFamily: "monospace"
          }
        }}
      />
    </ErrorBoundary>
  );
}
