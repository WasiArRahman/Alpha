import { GoogleGenAI, Type, ThinkingLevel, Modality, FunctionDeclaration } from "@google/genai";
import { Message, Attachment } from "../types";

const API_KEY = process.env.GEMINI_API_KEY || "";

export const getAI = () => new GoogleGenAI({ apiKey: API_KEY });

const createTaskTool: FunctionDeclaration = {
  name: "create_task",
  parameters: {
    type: Type.OBJECT,
    description: "Create a new task for the user.",
    properties: {
      title: { type: Type.STRING, description: "The title of the task." }
    },
    required: ["title"]
  }
};

const listTasksTool: FunctionDeclaration = {
  name: "list_tasks",
  parameters: {
    type: Type.OBJECT,
    description: "List all tasks for the user.",
    properties: {
      status: { type: Type.STRING, enum: ["pending", "completed", "all"], description: "Filter tasks by status." }
    }
  }
};

const completeTaskTool: FunctionDeclaration = {
  name: "complete_task",
  parameters: {
    type: Type.OBJECT,
    description: "Mark a task as completed.",
    properties: {
      taskId: { type: Type.STRING, description: "The ID of the task to complete." }
    },
    required: ["taskId"]
  }
};

export const generateResponse = async (
  messages: Message[],
  systemInstruction?: string,
  useThinking = false,
  useSearch = false
) => {
  const ai = getAI();
  const model = useThinking ? "gemini-3.1-pro-preview" : "gemini-3-flash-preview";

  console.log("Generating AI response with model:", model);
  console.log("Messages count:", messages.length);

  const contents = messages.map(m => ({
    role: m.role,
    parts: [
      { text: m.content },
      ...(m.attachments || []).map(a => {
        if (a.base64 && a.type) {
          return {
            inlineData: {
              data: a.base64.split(',')[1],
              mimeType: a.type
            }
          };
        }
        return null;
      }).filter(Boolean) as any
    ]
  }));

  const config: any = {
    systemInstruction: systemInstruction || "You are Alpha, a highly advanced AI assistant. You are a master of code, logic, and creative prompts. When asked for code, provide clean, efficient, and well-documented solutions. When asked for prompts, create detailed and effective instructions. You can manage tasks for the user using the provided tools. If the user asks to create, list, or complete a task, use the appropriate tool. IMPORTANT: Always wrap code snippets and terminal commands in markdown code blocks (e.g., ```python or ```bash) so they can be easily copied by the user.",
    tools: [{ functionDeclarations: [createTaskTool, listTasksTool, completeTaskTool] }]
  };

  if (useThinking) {
    config.thinkingConfig = { thinkingLevel: ThinkingLevel.HIGH };
  }

  if (useSearch) {
    config.tools.push({ googleSearch: {} });
  }

  try {
    const response = await ai.models.generateContent({
      model,
      contents,
      config
    });

    console.log("AI Response received successfully");

    return {
      text: response.text,
      functionCalls: response.functionCalls
    };
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};

export const extractMemories = async (chatHistory: string) => {
  const ai = getAI();
  const prompt = `Analyze the following chat history and extract key facts about the user (preferences, personal info, work, etc.). 
  Return the facts as a JSON array of objects with "fact" and "category" fields.
  If no new facts are found, return an empty array.
  
  Chat History:
  ${chatHistory}`;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            fact: { type: Type.STRING },
            category: { type: Type.STRING }
          },
          required: ["fact", "category"]
        }
      }
    }
  });

  try {
    return JSON.parse(response.text || "[]");
  } catch (e) {
    console.error("Failed to parse memories:", e);
    return [];
  }
};

export const generateImage = async (prompt: string, aspectRatio: string = "1:1", negativePrompt?: string) => {
  const ai = getAI();
  
  // Combine prompt with negative prompt if provided
  const fullPrompt = negativePrompt 
    ? `${prompt}\n\n[Negative prompt: ${negativePrompt}]`
    : prompt;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-image",
    contents: { parts: [{ text: fullPrompt }] },
    config: {
      imageConfig: {
        aspectRatio: aspectRatio as any,
      }
    }
  });

  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      return `data:image/png;base64,${part.inlineData.data}`;
    }
  }
  return null;
};

export const generateVideo = async (prompt: string, aspectRatio: "16:9" | "9:16") => {
  const ai = getAI();
  let operation = await ai.models.generateVideos({
    model: 'veo-3.1-fast-generate-preview',
    prompt,
    config: {
      numberOfVideos: 1,
      resolution: '1080p',
      aspectRatio
    }
  });

  while (!operation.done) {
    await new Promise(resolve => setTimeout(resolve, 5000));
    operation = await ai.operations.getVideosOperation({ operation });
  }

  const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
  if (!downloadLink) return null;

  const response = await fetch(downloadLink, {
    method: 'GET',
    headers: { 'x-goog-api-key': API_KEY },
  });
  const blob = await response.blob();
  return URL.createObjectURL(blob);
};

export const textToSpeech = async (text: string) => {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-preview-tts",
    contents: [{ parts: [{ text }] }],
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: 'Kore' },
        },
      },
    },
  });

  const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  if (base64Audio) {
    return `data:audio/mpeg;base64,${base64Audio}`;
  }
  return null;
};
