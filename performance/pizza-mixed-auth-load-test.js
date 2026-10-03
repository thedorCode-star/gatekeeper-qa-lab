import http from 'k6/http';
import { check } from 'k6';

const url = 'https://quickpizza.grafana.com/api/pizza';

const payload = JSON.stringify({
  maxCaloriesPerSlice: 800,
  mustBeVegetarian: true,
  excludedIngredients: ['anchovies', 'bacon'],
  excludedTools: [],
  maxNumberOfToppings: 4,
  minNumberOfToppings: 2,
});

export const options = {
  scenarios: {
    authorized_traffic: {
      executor: 'constant-arrival-rate',
      exec: 'authorizedPizza',
      rate: 1,
      timeUnit: '1s',
      duration: '45s',
      preAllocatedVUs: 3,
      maxVUs: 8,
    },

    unauthorized_traffic: {
      executor: 'constant-arrival-rate',
      exec: 'unauthorizedPizza',
      rate: 1,
      timeUnit: '1s',
      duration: '45s',
      preAllocatedVUs: 3,
      maxVUs: 8,
    },
  },

  thresholds: {
    'checks{scenario:authorized_traffic}': ['rate>0.95'],
    'checks{scenario:unauthorized_traffic}': ['rate>0.99'],
    'http_req_failed{traffic_type:authorized}': ['rate<0.05'],
    'http_req_failed{traffic_type:unauthorized}': ['rate<0.01'],
    'http_req_duration{traffic_type:authorized}': ['p(95)<1500'],
    'http_req_duration{traffic_type:unauthorized}': ['p(95)<1500'],
    dropped_iterations: ['count==0'],
  },
};

export function authorizedPizza() {
  const response = http.post(url, payload, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'token abcdef0123456789',
    },
    tags: {
      name: 'authorized_pizza',
      traffic_type: 'authorized',
    },
  });

  check(response, {
    'authorized status is correct': (r) => r.status === 200,
    'authorized response contains pizza': (r) =>
      r.body.includes('pizza'),
  });
}

export function unauthorizedPizza() {
  const response = http.post(url, payload, {
    headers: {
      'Content-Type': 'application/json',
    },

    responseCallback: http.expectedStatuses(401),

    tags: {
      name: 'unauthorized_pizza',
      traffic_type: 'unauthorized',
    },
  });

  check(response, {
    'unauthorized status is correct': (r) => r.status === 401,
    'unauthorized response exposes no pizza': (r) =>
      !r.body.toLowerCase().includes('pizza'),
  });
}