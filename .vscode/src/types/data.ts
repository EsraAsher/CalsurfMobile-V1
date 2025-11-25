// src/types/data.ts

// --- Core Data Structures ---

/**
 * Interface for a single food item added to the tracker.
 */
export interface FoodItem {
    name: string;
    calories: number;
    protein?: number; // Optional 
    carbs?: number;   // Optional
    fats?: number;    // Optional
    servingSize?: string; // Context for the user (e.g., "1 large egg")
}

/**
 * Interface for a logged entry (like a meal).
 */
export interface LogEntry {
    id: string; 
    name: string; 
    items: FoodItem[];
    totalCalories: number;
    totalProtein: number;
    createdAt: Date;
}

// --- Server Structures ---

/**
 * Maps directly to your DailyLog data.
 */
export interface DailyLogItem {
    id: string;
    date: string; // YYYY-MM-DD
    calories: number;
    protein: number;
    userId: string;
    // UI specific fields
    name?: string;
    isEaten: boolean;
    timeEaten?: string;
    mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
    // Aggregate totals
    totalCalories: number;
    totalProtein: number;
    items?: FoodItem[]; 
}

export interface MealTemplate {
    id: string;
    createdAt: Date;
    name: string;
    totalCalories: number;
    totalProtein: number;
    items: FoodItem[]; 
}