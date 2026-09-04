# Workflow preferences

- Keeps project scope documented in a PROJECT.md and expects the agent to read and follow that scope. Confidence: 0.7
- Keeps the design system (visual tokens, typography, component styling) documented in PROJECT.md and expects it applied consistently across the UI. Confidence: 0.8
- Prefers semantically meaningful icons for map markers (e.g., motorcycles for couriers, location pins for delivery points) over generic colored dots/shapes. Confidence: 0.5
- Prefers emoji icons for map markers (e.g., 🛵 for couriers/delivery) and is comfortable swapping custom SVG icons for emojis. Confidence: 0.7
- Builds the platform incrementally in stages ("etapas"/"versiones"), scoping each stage to a minimal slice (e.g., first stage only registers orders with a few fields) before expanding. Confidence: 0.5
- Tests API endpoints by opening the URL directly in a browser (a GET request), so POST-only routes surface as 405 and cause confusion; may prefer endpoints to also handle GET for easier browser debugging. Confidence: 0.5
- Uses Postman to test API endpoints (asks for the request body to paste into Postman); uses the Postman web client with Cloud Agent, which cannot reach localhost, so prefers testing guidance that also covers the desktop agent or terminal (e.g., PowerShell/curl). Confidence: 0.6
