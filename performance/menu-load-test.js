import http from 'k6/http';
import { check } from 'k6';

export const options = {
  discardResponseBodies: false,

  scenarios: {
    menu_traffic: {
      executor: 'constant-arrival-rate',
      rate: 2,
      timeUnit: '1s',
      duration: '2m',
      preAllocatedVUs: 2,
      maxVUs: 5,
    },
  },

  thresholds: {
    http_req_duration: ['p(95)<800'],
    http_req_failed: ['rate<0.01'],
    checks: ['rate>0.99'],
    dropped_iterations: ['count==0'],
  },
};

export default function () {
  const response = http.get('https://test.k6.io/');

  check(response, {
    'status is successful': (r) => r.status >= 200 && r.status < 400,
    'expected page content exists': (r) => r.body.includes('QuickPizza'),
  });
}
