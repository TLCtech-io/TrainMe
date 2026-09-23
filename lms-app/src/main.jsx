import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';

// StrictMode double-invokes effects in dev (mount / cleanup / mount). Keep it
// on: the player's SCORM path was hardened against exactly this (playbook
// 10.1), and dev should keep proving it.
createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
