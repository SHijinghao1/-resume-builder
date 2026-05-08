import { GoogleGenAI } from "@google/genai";
import OpenAI from "openai";

export interface CustomThemeConfig {
  id?: string;
  name?: string;
  primaryColor: string;
  secondaryColor: string;
  headingColor: string;
  textColor: string;
  backgroundColor: string;
  fontFamily: string;
  lineHeight: number;
  fontSize?: string;
  layout?: 'standard' | 'modern-sidebar' | 'centered';
}

export interface AIProviderConfig {
  apiKey: string;
  modelId: string;
  provider: 'deepseek' | 'doubao' | 'openai' | 'gemini';
}

function getProviderClient(config: AIProviderConfig) {
  if (config.provider === 'gemini') {
    let apiKey = config.apiKey;
    if (!apiKey) {
      try {
        // Safe access to process.env.GEMINI_API_KEY which is defined in vite.config.ts
        apiKey = process.env.GEMINI_API_KEY || "";
      } catch (e) {
        apiKey = "";
      }
    }
    return new GoogleGenAI({ apiKey: apiKey || "" });
  }
  
  let baseURL = undefined;
  if (config.provider === 'deepseek') baseURL = "https://api.deepseek.com";
  if (config.provider === 'doubao') baseURL = "https://ark.cn-beijing.volces.com/api/v3";
  
  return new OpenAI({
    apiKey: config.apiKey || "",
    baseURL: baseURL,
    dangerouslyAllowBrowser: true
  });
}

export async function analyzeResumeTemplate(base64Image: string, aiConfig: AIProviderConfig): Promise<CustomThemeConfig> {
  const prompt = `Analyze the visual style of this resume image. 
  Extract the following attributes to replicate its design as a template:
  1. Primary color (used for main accents, borders, or highlights).
  2. Secondary color (used for thin lines, subtle accents).
  3. Heading color (color used for section titles).
  4. Text color (main body text color).
  5. Background color.
  6. Font family preference (sans-serif, serif, or monospace).
  7. Compactness (line height).
  
  Return the result in JSON format.`;

  try {
    if (aiConfig.provider === 'gemini') {
      const ai = getProviderClient(aiConfig) as GoogleGenAI;
      const model = ai.getGenerativeModel({ model: aiConfig.modelId || "gemini-1.5-flash" });
      
      const result = await model.generateContent([
        {
          inlineData: {
            mimeType: "image/png",
            data: base64Image.split(",")[1] || base64Image,
          },
        },
        { text: prompt },
      ]);

      const text = result.response.text();
      // Extract JSON from potential markdown blocks
      const jsonStr = text.includes('```json') 
        ? text.split('```json')[1].split('```')[0]
        : text.includes('```') 
          ? text.split('```')[1].split('```')[0]
          : text;
          
      return JSON.parse(jsonStr.trim()) as CustomThemeConfig;
    } else {
      // Non-Gemini providers might not support vision or JSON schema natively in the same way
      const openai = getProviderClient(aiConfig) as OpenAI;
      const model = aiConfig.modelId;
      
      if (!model) {
        throw new Error(`请先在设置中配置 ${aiConfig.provider === 'doubao' ? '豆包' : 'DeepSeek'} 的模型 ID (endpoint ID)`);
      }

      const response = await openai.chat.completions.create({
        model: model,
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: prompt + " OUTPUT ONLY RAW JSON." },
              { type: "image_url", image_url: { url: base64Image.startsWith('data') ? base64Image : `data:image/png;base64,${base64Image}` } }
            ],
          },
        ],
        response_format: { type: "json_object" }
      });

      return JSON.parse(response.choices[0].message.content || '{}') as CustomThemeConfig;
    }
  } catch (error) {
    console.error('Template analysis failed:', error);
    throw error;
  }
}

export async function polishResumeContent(markdown: string, aiConfig: AIProviderConfig): Promise<string> {
  const prompt = `You are a professional resume editor. Please optimize the following resume content.
  Guidelines:
  1. Fix any grammar errors or typos.
  2. Use more professional, action-oriented language.
  3. KEEP THE MARKDOWN STRUCTURE EXACTLY THE SAME.
  4. Keep it in the same language as the input.
  
  Resume Content:
  ${markdown}`;

  try {
    if (aiConfig.provider === 'gemini') {
      const ai = getProviderClient(aiConfig) as GoogleGenAI;
      const model = ai.getGenerativeModel({ model: aiConfig.modelId || "gemini-1.5-flash" });
      const result = await model.generateContent(prompt);
      return result.response.text()?.trim() || markdown;
    } else {
      const openai = getProviderClient(aiConfig) as OpenAI;
      const model = aiConfig.modelId;
      
      if (!model) {
        throw new Error(`请先在设置中配置 ${aiConfig.provider === 'doubao' ? '豆包' : 'DeepSeek'} 的模型 ID (endpoint ID)`);
      }

      const response = await openai.chat.completions.create({
        model: model,
        messages: [{ role: "user", content: prompt }],
      });
      return response.choices[0].message.content || markdown;
    }
  } catch (error) {
    console.error('Polish content failed:', error);
    throw error;
  }
}
