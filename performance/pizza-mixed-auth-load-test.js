import http from 'k6/http';
import { check } from 'k6';
import { Rate } from 'k6/metrics';

const url = 'https://quickpizza.grafana.com/api/pizza';

const pizzaContractFailed = new Rate('pizza_contract_failed');

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
    'checks{scenario:authorized_traffic}': ['rate>0.99'],
    'checks{scenario:unauthorized_traffic}': ['rate>0.99'],

    'http_req_failed{traffic_type:authorized}': ['rate<0.01'],
    'http_req_failed{traffic_type:unauthorized}': ['rate<0.01'],

    'http_req_duration{traffic_type:authorized}': ['p(95)<1500'],
    'http_req_duration{traffic_type:unauthorized}': ['p(95)<1500'],

    dropped_iterations: ['count==0'],
    pizza_contract_failed: ['rate==0'],
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

  let body = null;
  let contractIsValid = false;

  if (response.status === 200) {
    try {
      body = response.json();

      contractIsValid =
        body !== null &&
        typeof body === 'object' &&
        body.pizza !== null &&
        typeof body.pizza === 'object' &&
        !Array.isArray(body.pizza) &&
        typeof body.pizza.name === 'string' &&
        body.pizza.name.trim().length > 0 &&
        Array.isArray(body.pizza.ingredients) &&
        body.pizza.ingredients.length > 0 &&
        body.pizza.ingredients.every(
          (ingredient) =>
            ingredient !== null &&
            typeof ingredient === 'object' &&
            typeof ingredient.name === 'string' &&
            ingredient.name.trim().length > 0 &&
            typeof ingredient.vegetarian === 'boolean'
        ) &&
        typeof body.calories === 'number' &&
        typeof body.vegetarian === 'boolean';
    } catch (error) {
      body = null;
      contractIsValid = false;
    }
  }

  check(response, {
    'authorized status is correct': (r) => r.status === 200,

    'authorized response contains pizza': () =>
      body !== null &&
      body.pizza !== null &&
      typeof body.pizza === 'object',

    'authorized response contract is valid': () => contractIsValid,
  });

  // Only authorized responses contribute to this contract metric.
  pizzaContractFailed.add(!contractIsValid);
}

export function unauthorizedPizza() {
  const response = http.post(url, payload, {
    headers: {
      'Content-Type': 'application/json',
    },

    // A 401 is the expected outcome for this request.
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