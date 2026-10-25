import http from 'k6/http'
import { check, sleep } from 'k6'

export const options = {
  vus: 10,
  duration: '30s',
  thresholds: { http_req_failed: ['rate<0.01'], http_req_duration: ['p(95)<500'] },
}

const baseUrl = __ENV.API_BASE_URL
if (!baseUrl) throw new Error('Set API_BASE_URL to a dedicated test deployment before running this load test.')

export default function () {
  const response = http.get(baseUrl + '/api/health')
  check(response, { 'health endpoint is successful': value => value.status === 200 })
  sleep(1)
}
