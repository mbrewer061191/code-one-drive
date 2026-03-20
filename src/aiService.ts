
import { GoogleGenAI, Type } from "@google/genai";
import { Case } from './types';
import { initialAddressState, initialViolationState, VIOLATIONS_LIST } from './constants';

/**
 * Analyzes a photo using Gemini AI to extract property address and violation type.
 * @param photoFile The image file (File or Blob) to analyze.
 * @returns A partial Case object containing the extracted information.
 */
export const analyzePhotoWithAI = async (photoFile: File): Promise<Partial<Case>> => {
    // FIX: Always use a named parameter when initializing GoogleGenAI and use process.env.GEMINI_API_KEY directly as required.
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    // FIX: Enhanced toBase64 helper with proper Blob typing and error handling to avoid "Argument of type 'unknown' is not assignable to parameter of type 'Blob'" errors.
    const toBase64 = (file: Blob): Promise<string> => new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
            const result = reader.result as string;
            if (result) {
                // Extract base64 data from the data URL.
                resolve(result.split(',')[1]);
            } else {
                reject(new Error("Failed to read file contents."));
            }
        };
        reader.onerror = () => reject(new Error("FileReader error occurred while processing the photo."));
    });

    const base64Data = await toBase64(photoFile);
    
    // FIX: Use the preferred contents structure { parts: [...] } for multimodal prompts.
    const imagePart = {
        inlineData: {
            mimeType: photoFile.type || 'image/jpeg',
            data: base64Data,
        },
    };
    
    const textPart = {
        text: `Analyze this image for a code enforcement case. 
               Identify the property address and the primary violation type from the following list: 
               ${VIOLATIONS_LIST.map(v => v.type).join(', ')}. 
               If the address is partially visible, provide the visible parts.`
    };

    // FIX: Use ai.models.generateContent directly to query GenAI with both the model name and prompt.
    // Use 'gemini-3-flash-preview' as it is optimized for basic multimodal/text tasks.
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: { parts: [imagePart, textPart] },
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    address: {
                        type: Type.OBJECT,
                        properties: {
                            street: { type: Type.STRING }
                        },
                        required: ['street']
                    },
                    violationType: {
                        type: Type.STRING,
                        description: `One of the predefined violation types.`
                    }
                },
                required: ['address', 'violationType']
            }
        }
    });

    // FIX: Access response.text as a property (getter), not a method call.
    const jsonStr = response.text || '{}';
    try {
        const resultJson = JSON.parse(jsonStr);
        const matchedViolation = VIOLATIONS_LIST.find(v => v.type === resultJson.violationType) || initialViolationState;
        
        return {
            address: { 
                ...initialAddressState, 
                street: resultJson.address?.street || '' 
            },
            violation: matchedViolation,
        };
    } catch (parseError) {
        console.error("Failed to parse AI response JSON:", jsonStr);
        throw new Error("AI returned an invalid response format.");
    }
};

/**
 * Dummy function to maintain compatibility with existing components that might expect an AI service object.
 */
export const getAIService = () => ({});
