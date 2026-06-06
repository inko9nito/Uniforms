import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@atlaskit/css-reset';
import { setGlobalTheme } from '@atlaskit/tokens';
import App from './App';

// Inject the Atlassian Design System token CSS variables (light mode). All
// Atlaskit components and our token() lookups resolve against these.
setGlobalTheme({ colorMode: 'light' }).catch(() => {
  /* tokens fall back to their hard-coded defaults if this ever fails */
});

const root = document.getElementById('root');
if (!root) throw new Error('Missing #root element');

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
