import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import "./styles/style.css";

if ("serviceWorker" in navigator) navigator.serviceWorker.register("/service-worker.js").catch(()=>{});
createRoot(document.getElementById("root")).render(<BrowserRouter><App /></BrowserRouter>);
