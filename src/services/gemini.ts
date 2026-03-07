import { GoogleGenAI, Type, FunctionDeclaration } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY;
const ai = new GoogleGenAI({ apiKey });

const fileSystemTools: FunctionDeclaration[] = [
  {
    name: "list_files",
    description: "List all files and folders in the assistant's virtual file system.",
    parameters: { type: Type.OBJECT, properties: {} }
  },
  {
    name: "create_file",
    description: "Create a new file with content.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        name: { type: Type.STRING, description: "The name of the file." },
        content: { type: Type.STRING, description: "The content to write into the file." }
      },
      required: ["name", "content"]
    }
  },
  {
    name: "delete_file",
    description: "Delete a file or folder.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        name: { type: Type.STRING, description: "The name of the file or folder to delete." }
      },
      required: ["name"]
    }
  }
];

export const geminiService = {
  async chat(messages: any[], systemInstruction: string) {
    const response = await ai.models.generateContent({
      model: "gemini-3.1-pro-preview",
      contents: messages,
      config: {
        systemInstruction,
        tools: [{ functionDeclarations: fileSystemTools }]
      }
    });
    return response;
  },

  async generateImage(prompt: string) {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-image",
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        imageConfig: { aspectRatio: "1:1" }
      }
    });
    
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    return null;
  }
};
