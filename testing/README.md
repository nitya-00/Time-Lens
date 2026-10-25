# Testing

Automated API and service tests run with npm test. This folder contains performance and external load tests.

Run the opt-in performance smoke test:

    RUN_PERFORMANCE_TESTS=1 npm run test:performance --workspace=backend

Run the k6 load test only against a dedicated test deployment:

    API_BASE_URL=https://test-api.example.com k6 run testing/load/k6-smoke.js

Never point a load test at the production database or production API.
