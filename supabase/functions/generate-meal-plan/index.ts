import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Verify auth
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { timeframe, budget, max_cook_time, servings, dietary_restrictions, available_ingredients, skill_level } =
      await req.json();

    const prompt = `You are a meal planning assistant for university students on a tight budget.
Generate a ${timeframe} meal plan with the following constraints:
- Total budget: $${budget} USD for the ${timeframe}
- Max cook time per meal: ${max_cook_time} minutes
- Servings per meal: ${servings}
- Dietary restrictions: ${dietary_restrictions.length > 0 ? dietary_restrictions.join(', ') : 'none'}
- Cooking skill level: ${skill_level}
- Available ingredients to prefer (use these first): ${available_ingredients.length > 0 ? available_ingredients.join(', ') : 'any common grocery items'}

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
Ensure the total cost of all meals stays within the $${budget} budget.`;

    const geminiResponse = await fetch(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 8192,
          responseMimeType: 'application/json',
        },
      }),
    });

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      throw new Error(`Gemini API error: ${geminiResponse.status} - ${errorText}`);
    }

    const geminiData = await geminiResponse.json();
    const textContent = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!textContent) {
      throw new Error('No content returned from Gemini');
    }

    // Parse the JSON response
    const mealPlan = JSON.parse(textContent);

    return new Response(JSON.stringify(mealPlan), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
