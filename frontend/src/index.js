// Entry point React yang merender App dan mengaktifkan service worker
import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";
import * as serviceWorkerRegistration from "./serviceWorkerRegistration";

// Inisialisasi root untuk aplikasi React versi 18
const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

// Daftarkan service worker agar aplikasi memiliki kemampuan offline dasar
serviceWorkerRegistration.register();
