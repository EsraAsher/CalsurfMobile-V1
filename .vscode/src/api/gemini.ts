// src/api/gemini.ts
import { GoogleGenAI } from "@google/genai";
import * as Location from 'expo-location';
import { FoodItem } from '../types/data'; 

// --- SETUP ---
const API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY; 
const ai = API_KEY ? new GoogleGenAI({ apiKey: API_KEY }) : null;

// --- 1. GET USER LOCATION ---
export async function getUserRegion(): Promise<string> {
    try {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
            return 'Global Average'; 
        }

        let location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low });
        let geocode = await Location.reverseGeocodeAsync({
            latitude: location.coords.latitude,
            longitude: location.coords.longitude
        });

        return geocode[0]?.country || 'Global Average'; 
    } catch (e) {
        console.error("Error getting location:", e);
        return 'Global Average';
    }
}

// --- 2. GET ACCURATE CALORIES (TEXT) ---
export async function getAccurateCalories(foodName: string, location: string): Promise<FoodItem> {
    if (!ai) throw new Error("Gemini API Key is missing.");

    const prompt = `
        You are an expert nutritionist. Provide a single JSON object with the nutritional estimate.
        
        **Food Item:** ${foodName}
        **User Region:** ${location}

        **CRITICAL INSTRUCTION:** Respond ONLY with a single valid JSON object:
        {
            "name": "string",
            "calories": number,
            "protein": number,
            "carbs": number,
            "fats": number,
            "servingSize": "string"
        }
        
        **NAME RULES:**
        - Keep the name SIMPLE and MINIMALISTIC
        - Use format: "Food with Food" (e.g., "Chicken with Rice")
        - DO NOT include:
          * Country/region names (e.g., "(India)", "(US)")
          * Words like "(Estimated)", "(Typical)", "(Average)"
          * Quantities or weights (e.g., "350g", "2 cups")
          * Serving descriptions (e.g., "1 plate", "medium bowl")
        - If multiple items, use "with" between them
        - Capitalize properly (e.g., "Grilled Chicken with Vegetables")
        
        Do not include markdown formatting.
    `;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.0-flash",
            contents: prompt,
            config: { responseMimeType: "application/json" }
        });

        const responseText = response.text;
        const cleanText = (typeof responseText === 'string' ? responseText : JSON.stringify(responseText)).trim();
        return JSON.parse(cleanText) as FoodItem;

    } catch (error) {
        console.error("Gemini API Error:", error);
        throw new Error("Could not get calorie data.");
    }
}

// --- 3. IDENTIFY FOOD FROM VOICE ---
export async function identifyFoodFromVoice(base64Audio: string): Promise<FoodItem | null> {
    if (!ai) return null;

    const prompt = `
        Listen to this voice log describing a meal. 
        Identify the main food item and estimate its calories and protein.
        
        **CRITICAL:** Respond ONLY with a valid JSON object:
        {
            "name": "string",
            "calories": number,
            "protein": number,
            "carbs": number,
            "fats": number,
            "servingSize": "string"
        }
        
        **NAME RULES:**
        - Keep the name SIMPLE and MINIMALISTIC
        - Use format: "Food with Food" (e.g., "Chicken with Rice")
        - DO NOT include:
          * Country/region names (e.g., "(India)", "(US)")
          * Words like "(Estimated)", "(Typical)", "(Average)")
          * Quantities or weights (e.g., "350g", "2 cups")
          * Serving descriptions (e.g., "1 plate", "medium bowl")
        - If multiple items, use "with" between them
        - Capitalize properly (e.g., "Grilled Chicken with Vegetables")
    `;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.0-flash",
            contents: [
                { role: 'user', parts: [{ text: prompt }, { inlineData: { mimeType: "audio/mp4", data: base64Audio } }] }
            ],
            config: { responseMimeType: "application/json" }
        });

        const responseText = response.text;
        const cleanText = (typeof responseText === 'string' ? responseText : JSON.stringify(responseText)).trim();
        return JSON.parse(cleanText) as FoodItem;

    } catch (error) {
        console.error("Gemini Audio Error:", error);
        return null;
    }
}

// --- 4. SURF AI COACHING CHAT (FIXED GREETING) ---
export async function getAiCoaching(userMessage: string, dailyLogs: any[]) {
    if (!ai) return "Error: AI not initialized.";

    // Summarize logs
    const today = new Date().toISOString().split('T')[0];
    const todaysItems = dailyLogs.filter(l => l.date === today);
    
    const totalCals = todaysItems.reduce((sum, item) => sum + item.calories, 0);
    const totalProt = todaysItems.reduce((sum, item) => sum + (item.protein || 0), 0);
    const foodList = todaysItems.map(i => `${i.name} (${i.calories}cal)`).join(', ');

    // 👇 UPDATED PROMPT TO STOP REPETITIVE GREETINGS
    const systemContext = `
        You are "Surf", a chill, supportive gym buddy and nutrition expert.
        
        Context about the user's day (${today}):
        - Total Calories Eaten: ${totalCals} (Goal: 2000)
        - Total Protein Eaten: ${totalProt}g (Goal: 150g)
        - Foods Eaten: ${foodList || "Nothing yet"}
        
        User's Question: "${userMessage}"
        
        Instructions:
        - **DO NOT introduce yourself** ("Ayy Surf here") in every message. Assume we are already in a conversation.
        - Only say your name if the user specifically asks who you are.
        - Keep your answer SHORT, tight, and casual. 
        - No long paragraphs. Talk like a text message.
        - Be supportive but real.
    `;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.0-flash",
            contents: [{ role: 'user', parts: [{ text: systemContext }] }],
        });

        const responseText = response.text;
        return typeof responseText === 'string' ? responseText : JSON.stringify(responseText);

    } catch (error) {
        console.error("Gemini Chat Error:", error);
        return "Surf is offline right now. Try again later!";
    }
}

// --- 5. CELEBRATION MESSAGE GENERATOR ---
export async function getCelebrationMessage(percentage: number): Promise<string> {
    if (!ai) return getDefaultCelebrationMessage(percentage);

    const prompt = `
        You are "Surf", an energetic fitness coach. The user just hit ${percentage}% of their daily calorie goal!
        
        Generate a SHORT, HYPE celebration message (15-25 words max).
        
        Rules:
        - Be enthusiastic and motivating
        - Use emojis sparingly (1-2 max)
        - Keep it casual like a text from a gym buddy
        - For 70%: Encourage to keep pushing
        - For 90%: Build excitement, almost there
        - For 100%: Full celebration mode
        
        Just return the message, nothing else.
    `;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.0-flash",
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
        });

        const responseText = response.text;
        return typeof responseText === 'string' ? responseText.trim() : getDefaultCelebrationMessage(percentage);

    } catch (error) {
        console.error("Gemini Celebration Error:", error);
        return getDefaultCelebrationMessage(percentage);
    }
}

function getDefaultCelebrationMessage(percentage: number): string {
    const messages = {
        70: "70% down! You're crushing it today. Keep that energy up! 🔥",
        90: "90% there! So close you can taste it. Finish strong! 💪",
        100: "100%! Yo that's what I'm talking about! Goal absolutely destroyed! 🎯"
    };
    return messages[percentage as 70 | 90 | 100] || "Great progress! Keep going! 💪";
}