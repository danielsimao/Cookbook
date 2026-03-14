export interface IngredientInput {
  name: string;
  quantity: string;
  unit: string;
  group: string;
  toTaste: boolean;
}

export const MEAL_TYPES = ["breakfast", "lunch", "dinner", "snack", "dessert"];

export function emptyIngredient(): IngredientInput {
  return { name: "", quantity: "", unit: "", group: "", toTaste: false };
}
