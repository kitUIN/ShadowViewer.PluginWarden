import { GoogleGenAI } from "@google/genai";
import { PluginData } from "../types";

// Helper to get safe instance
const getAiInstance = () => {
  if (!process.env.API_KEY) {
    throw new Error("API_KEY not set in environment variables");
  }
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

export const generateMarketingDescription = async (plugin: PluginData): Promise<string> => {
  try {
    const ai = getAiInstance();
    const prompt = `
      You are a copywriter for the ShadowViewer Plugin Store.
      Create a short, exciting, and emoji-rich marketing description (max 30 words) for the following plugin based on its technical data.
      Highlight its version and affiliation.

      Plugin Data:
      ${JSON.stringify(plugin, null, 2)}
    `;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    return response.text || "No description generated.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Error generating description. Please check API Key.";
  }
};

export const analyzeDependencies = async (plugin: PluginData, allPlugins: PluginData[]): Promise<string> => {
  try {
    const ai = getAiInstance();
    const prompt = `
      Analyze the dependencies for the plugin "${plugin.Name}".
      
      Target Plugin:
      ${JSON.stringify(plugin, null, 2)}

      Available Plugins in Store:
      ${JSON.stringify(allPlugins.map(p => ({ id: p.Id, version: p.Version })), null, 2)}

      Output a short status report (2 sentences). State if dependencies are met based on the 'Need' range.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    return response.text || "Analysis failed.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Error analyzing dependencies.";
  }
};
