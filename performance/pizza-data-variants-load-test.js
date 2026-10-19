import http from 'k6/http';
import { check } from 'k6';

const url = 'https://quickpizza.grafana.com/api/pizza';

const pizzaCases = {
  withoutBacon: {
    caseName: 'vegetarian_without_bacon',
    maxCalories: 800,
    excludedIngredient: 'bacon',
    minToppings: 2,
    maxToppings: 4,
  },
  withoutAnchovies: {
    caseName: 'vegetarian_without_anchovies',
    maxCalories: 650,
    excludedIngredient: 'anchovies',
    minToppings: 1,
    maxToppings: 3,
  },
  withoutHam: {
    caseName: 'vegetarian_without_ham',
    maxCalories: 700,
    excludedIngredient: 'ham',
    minToppings: 2,
    maxToppings: 5,
  },
};

export const options = {
    scenarios: {
      without_bacon: {
        executor: 'constant-arrival-rate',
        exec: 'testWithoutBacon',
        rate: 1,
        timeUnit: '1s',
        duration: '45s',
        preAllocatedVUs: 2,
        maxVUs: 4,
      },
      without_anchovies: {
        executor: 'constant-arrival-rate',
        exec: 'testWithoutAnchovies',
        rate: 1,
        timeUnit: '1s',
        duration: '45s',
        preAllocatedVUs: 2,
        maxVUs: 4,
      },
      without_ham: {
        executor: 'constant-arrival-rate',
        exec: 'testWithoutHam',
        rate: 1,
        timeUnit: '1s',
        duration: '45s',
        preAllocatedVUs: 2,
        maxVUs: 4,
      },
    },
  
    thresholds: {
      'checks{case_name:vegetarian_without_bacon}': ['rate>0.99'],
      'checks{case_name:vegetarian_without_anchovies}': ['rate>0.99'],
      'checks{case_name:vegetarian_without_ham}': ['rate>0.99'],
  
      'http_req_duration{case_name:vegetarian_without_bacon}': ['p(95)<1500'],
      'http_req_duration{case_name:vegetarian_without_anchovies}': ['p(95)<1500'],
      'http_req_duration{case_name:vegetarian_without_ham}': ['p(95)<1500'],
  
      http_req_failed: ['rate<0.01'],
      dropped_iterations: ['count==0'],
    },
  };

  export function testWithoutBacon() {
    runPizzaCase(pizzaCases.withoutBacon);
  }
  
  export function testWithoutAnchovies() {
    runPizzaCase(pizzaCases.withoutAnchovies);
  }
  
  export function testWithoutHam() {
    runPizzaCase(pizzaCases.withoutHam);
  }
  
  function runPizzaCase(testCase) {
    const payload = JSON.stringify({
      maxCaloriesPerSlice: testCase.maxCalories,
      mustBeVegetarian: true,
      excludedIngredients: [testCase.excludedIngredient],
      excludedTools: [],
      minNumberOfToppings: testCase.minToppings,
      maxNumberOfToppings: testCase.maxToppings,
    });
  
    const tags = {
      name: 'generate_pizza',
      case_name: testCase.caseName,
    };
  
    const response = http.post(url, payload, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'token abcdef0123456789',
      },
      tags,
    });
  
    let body = null;
  
    try {
      body = response.json();
    } catch {
      // The checks below report an invalid JSON response as a failure.
    }
  
    const ingredients = body?.pizza?.ingredients;
  
    const contractIsValid =
      typeof body?.pizza?.name === 'string' &&
      body.pizza.name.trim().length > 0 &&
      Array.isArray(ingredients) &&
      ingredients.length > 0 &&
      ingredients.every(
        (ingredient) =>
          typeof ingredient?.name === 'string' &&
          ingredient.name.trim().length > 0 &&
          typeof ingredient.vegetarian === 'boolean'
      ) &&
      Number.isFinite(body?.calories) &&
      typeof body?.vegetarian === 'boolean';
  
    check(
      response,
      {
        'status is 200': (r) => r.status === 200,
  
        'response contract is valid': () => contractIsValid,
  
        'vegetarian restriction is respected': () =>
          contractIsValid &&
          body.vegetarian === true &&
          ingredients.every((ingredient) => ingredient.vegetarian === true),
  
        'excluded ingredient is absent': () =>
          contractIsValid &&
          ingredients.every(
            (ingredient) =>
              ingredient.name.trim().toLowerCase() !==
              testCase.excludedIngredient.toLowerCase()
          ),
  
        'calorie limit is respected': () =>
          contractIsValid &&
          body.calories >= 0 &&
          body.calories <= testCase.maxCalories,
      },
      tags
    );
  }