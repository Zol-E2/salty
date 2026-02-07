import { GenerateMealPlanRequest, GeneratedMeal } from './types';

const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY ?? '';
const GEMINI_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

export async function generateMealPlan(
  request: GenerateMealPlanRequest
): Promise<GeneratedMeal[]> {
  if (!GEMINI_API_KEY) {
    throw new Error(
      'Gemini API key is not configured. Set EXPO_PUBLIC_GEMINI_API_KEY in your .env.local file.'
    );
  }

  const {
    timeframe,
    budget,
    max_cook_time,
    servings,
    dietary_restrictions,
    available_ingredients,
    skill_level,
    daily_calories,
  } = request;

  const prompt = `You are a meal planning assistant for university students on a tight budget.
Generate a ${timeframe} meal plan with the following constraints:
- Total budget: $${budget} USD for the ${timeframe}
- Max cook time per meal: ${max_cook_time} minutes
- Servings per meal: ${servings}
- Dietary restrictions: ${dietary_restrictions.length > 0 ? dietary_restrictions.join(', ') : 'none'}
- Cooking skill level: ${skill_level}
- Available ingredients to prefer (use these first): ${available_ingredients.length > 0 ? available_ingredients.join(', ') : 'any common grocery items'}
${daily_calories ? `- Daily calorie target: ${daily_calories} calories per day (distribute across all meals for the day.)` : ''}

Generate ${timeframe === 'day' ? '3-4' : timeframe === 'week' ? '21' : '60'} meals covering breakfast, lunch, dinner${timeframe !== 'day' ? ', and snacks' : ''}.
Keep meals simple, affordable, and student-friendly. Focus on cheap staples like rice, pasta, beans, eggs, frozen vegetables.

Return ONLY valid JSON with no markdown formatting, no code fences, just the raw JSON object in this exact format:
{
  "meals": [
    {
      "name": "Meal Name",
      "description": "Brief 1-sentence description",
      "meal_type": "breakfast",
      "day": 1,
      "ingredients": [{"name": "rice", "quantity": "1", "unit": "cup", "estimated_cost": 0.30}],
      "instructions": [{"step": 1, "text": "Step description"}],
      "calories": 400,
      "protein_g": 15,
      "carbs_g": 50,
      "fat_g": 10,
      "estimated_cost": 2.50,
      "prep_time_min": 5,
      "cook_time_min": 15,
      "difficulty": "easy",
      "image_search_term": "fried rice with vegetables"
    }
  ]
}

meal_type must be one of: breakfast, lunch, dinner, snack
difficulty must be one of: easy, medium, hard
day is the day number starting from 1
Ensure the total cost of all meals stays within the $${budget} budget${daily_calories ? ` and the meals hit the daily calorie target: ${daily_calories} calories per day` : ''}.`;

  const response = await fetch(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 65536,
        responseMimeType: 'application/json',
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
  }

  const geminiData = await response.json();

  const finishReason = geminiData.candidates?.[0]?.finishReason;
  if (finishReason === 'MAX_TOKENS') {
    throw new Error(
      'Response was cut short. Try generating a shorter meal plan.'
    );
  }

  const textContent = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!textContent) {
    throw new Error('No content returned from Gemini');
  }

  let mealPlan;
  try {
    mealPlan = JSON.parse(textContent);
  } catch {
    throw new Error(
      'Failed to parse meal plan response. Try generating again.'
    );
  }

  return mealPlan.meals as GeneratedMeal[];
}
