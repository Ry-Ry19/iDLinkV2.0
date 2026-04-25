/**
 * LEARNER'S NOTE:
 * main.tsx is the entry point of the React application.
 * It uses createRoot to mount the App component into the DOM element with id="root".
 * The index.css styles are imported here and applied globally to the entire application.
 */
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);
