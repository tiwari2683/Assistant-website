import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { Amplify } from 'aws-amplify';
import { AUTH_CONFIG } from './config';

Amplify.configure({
  Auth: {
    Cognito: {
      userPoolId: AUTH_CONFIG.USER_POOL_ID,
      userPoolClientId: AUTH_CONFIG.CLIENT_ID,
      loginWith: {
        email: true
      }
    }
  }
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
