import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import './i18n'; // Internacionalización para XYZ Dashboard
import App from './App';

// #xyz-rainbow #xyz-rainbowtechnology #rainbowtechnology.xyz
// Inicialización de la raíz de React

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
