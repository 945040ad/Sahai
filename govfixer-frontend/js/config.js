// ============================================================
// Sahai — Config
// Replace API_URL with your deployed API Gateway URL after deploy.sh
//
// Set DEMO_MODE = true to run a fully interactive demo without
// a backend (uses realistic mock responses).
// ============================================================

const CONFIG = {
  API_URL: "https://YOUR_API_GATEWAY_URL/chat",  // <-- REPLACE THIS after deployment
  DEFAULT_LANGUAGE: "en-IN",
  DEMO_MODE: true,  // Set to false once your API is deployed
};
