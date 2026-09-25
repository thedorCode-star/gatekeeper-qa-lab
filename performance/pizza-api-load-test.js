import http from 'k6/http';
import { check } from 'k6';

const excludedIngredients = ['anchovies', 'bacon'];

export const options = {
  discardResponseBodies: false,

  scenarios: {
    vegetarian_pizza_traffic: {
      executor: 'constant-arrival-rate',
      rate: 2,
      timeUnit: '1s',
      duration: '1m',
      preAllocatedVUs: 5,
      maxVUs: 10,
    },
  },

  thresholds: {
    'http_req_duration{name:generate_vegetarian_pizza}': ['p(95)<800'],
    http_req_failed: ['rate<0.01'],
    checks: ['rate>0.99'],
    dropped_iterations: ['count==0'],
  },
};

export default function () {
  const payload = JSON.stringify({
    maxCaloriesPerSlice: 800,
    mustBeVegetarian: true,
    excludedIngredients,
    excludedTools: [],
    maxNumberOfToppings: 4,
    minNumberOfToppings: 2,
  });

  const response = http.post(
    'https://quickpizza.grafana.com/api/pizza',
    payload,
    {
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'token abcdef0123456789',
      },
      tags: {
        name: 'generate_vegetarian_pizza',
      },
    }
  );

  const body = response.status === 200 ? response.json() : {};
  const ingredients = body.pizza?.ingredients ?? [];
  const ingredientNames = ingredients.map((ingredient) =>
    ingredient.name.toLowerCase()
  );

  check(response, {
    'status is 200': (r) => r.status === 200,
    'recommendation is vegetarian': () =>
      body.vegetarian === true &&
      ingredients.every((ingredient) => ingredient.vegetarian),
    'calories are within limit': () =>
      typeof body.calories === 'number' && body.calories <= 800,
    'excluded ingredients are absent': () =>
      !ingredientNames.some(
        (name) =>
          name.includes('anchov') || name.includes('bacon')
      ),
  });
}
