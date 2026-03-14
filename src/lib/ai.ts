import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export interface ParsedRecipe {
  title: string;
  description: string;
  servings: number;
  prepTime: number | null;
  cookTime: number | null;
  cuisine: string | null;
  mealType: string | null;
  tags: string[];
  ingredients: {
    name: string;
    quantity: number | null;
    unit: string | null;
    group: string | null;
    toTaste: boolean;
  }[];
  steps: string[];
  imageUrl: string | null;
}

export async function extractRecipeFromHtml(
  html: string,
  url: string
): Promise<ParsedRecipe> {
  const message = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 4096,
    messages: [
      {
        role: "user",
        content: `Extract the recipe from this webpage HTML. The URL is: ${url}

Return a JSON object with this exact structure (no markdown, just JSON):
{
  "title": "Recipe title",
  "description": "Brief description",
  "servings": 4,
  "prepTime": 15,
  "cookTime": 30,
  "cuisine": "Italian",
  "mealType": "dinner",
  "tags": ["pasta", "quick"],
  "ingredients": [
    {"name": "ingredient name", "quantity": 1.5, "unit": "cups", "group": null, "toTaste": false},
    {"name": "salt", "quantity": null, "unit": null, "group": null, "toTaste": true}
  ],
  "steps": ["Step 1 text", "Step 2 text"],
  "imageUrl": "url or null"
}

For mealType use one of: breakfast, lunch, dinner, snack, dessert.
For quantities, convert fractions to decimals (1/4 = 0.25, 1/3 = 0.333, 1/2 = 0.5, 2/3 = 0.667, 3/4 = 0.75).
For ingredients with vague quantities like "to taste", "a pinch", "q.b.", or "as needed", set "toTaste": true and "quantity": null.
If a field is unknown, use null.

HTML content:
${html.slice(0, 50000)}`,
      },
    ],
  });

  const text =
    message.content[0].type === "text" ? message.content[0].text : "";
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("Could not parse AI response");
  return JSON.parse(jsonMatch[0]);
}

export async function smartSearch(
  query: string,
  recipes: { id: string; title: string; tags: string[]; cuisine: string | null; mealType: string | null; ingredientNames: string[] }[]
): Promise<string[]> {
  if (recipes.length === 0) return [];

  const recipeSummaries = recipes
    .map(
      (r) =>
        `ID:${r.id} | ${r.title} | tags:${r.tags.join(",")} | cuisine:${r.cuisine || "unknown"} | meal:${r.mealType || "any"} | ingredients:${r.ingredientNames.slice(0, 10).join(",")}`
    )
    .join("\n");

  const message = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: `Given this search query: "${query}"

Rank the following recipes by relevance. Return ONLY a JSON array of recipe IDs, most relevant first. Only include recipes that are at least somewhat relevant. If nothing matches, return an empty array.

Recipes:
${recipeSummaries}

Return format: ["id1", "id2", "id3"]`,
      },
    ],
  });

  const text =
    message.content[0].type === "text" ? message.content[0].text : "";
  const jsonMatch = text.match(/\[[\s\S]*?\]/);
  if (!jsonMatch) return [];
  return JSON.parse(jsonMatch[0]);
}

export interface MergedIngredient {
  name: string;
  quantity: string;
  category: string;
  checked?: boolean;
}

export async function mergeIngredients(
  ingredients: { name: string; quantity: number | null; unit: string | null; toTaste?: boolean }[]
): Promise<MergedIngredient[]> {
  const message = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 4096,
    messages: [
      {
        role: "user",
        content: `Merge and organize this shopping list. Combine duplicate ingredients, sum quantities, and group by store section.
Items marked "to taste" should keep "to taste" as their quantity — do not sum them with measured amounts.

Ingredients:
${ingredients.map((i) => `- ${i.toTaste ? "to taste" : `${i.quantity || ""} ${i.unit || ""}`} ${i.name}`.trim()).join("\n")}

Return ONLY a JSON array, no markdown:
[{"name": "Chicken breast", "quantity": "2 lbs", "category": "Meat & Seafood"}, ...]

Categories to use: Produce, Meat & Seafood, Dairy & Eggs, Bakery, Pantry & Dry Goods, Frozen, Condiments & Sauces, Beverages, Other`,
      },
    ],
  });

  const text =
    message.content[0].type === "text" ? message.content[0].text : "";
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) return [];
  return JSON.parse(jsonMatch[0]);
}

export async function extractRecipeFromImage(
  imageBase64: string,
  mimeType: string
): Promise<ParsedRecipe> {
  const message = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 4096,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: {
              type: "base64",
              media_type: mimeType as "image/jpeg" | "image/png" | "image/gif" | "image/webp",
              data: imageBase64,
            },
          },
          {
            type: "text",
            text: `Extract the recipe from this image. Return a JSON object with this exact structure (no markdown, just JSON):
{
  "title": "Recipe title",
  "description": "Brief description",
  "servings": 4,
  "prepTime": 15,
  "cookTime": 30,
  "cuisine": "Italian",
  "mealType": "dinner",
  "tags": ["pasta", "quick"],
  "ingredients": [
    {"name": "ingredient name", "quantity": 1.5, "unit": "cups", "group": null, "toTaste": false},
    {"name": "salt", "quantity": null, "unit": null, "group": null, "toTaste": true}
  ],
  "steps": ["Step 1 text", "Step 2 text"],
  "imageUrl": null
}

For quantities, convert fractions to decimals (1/4 = 0.25, 1/3 = 0.333, 1/2 = 0.5, 2/3 = 0.667, 3/4 = 0.75).
For ingredients with vague quantities like "to taste", "a pinch", "q.b.", or "as needed", set "toTaste": true and "quantity": null.`,
          },
        ],
      },
    ],
  });

  const text =
    message.content[0].type === "text" ? message.content[0].text : "";
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("Could not parse AI response");
  return JSON.parse(jsonMatch[0]);
}
