export interface CivicAnalysis {
  category: string;
  severity: "Low" | "Medium" | "High" | "Critical";
  severity_score: number;
  confidence: number;
  title: string;
  description: string;
  hazards: string[];
  department: string;
  recommended_action: string;
  estimated_repair_time: string;
}

/**
 * Convert a File object into a base64 encoded string.
 */
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      // Extract the raw base64 data portion after the comma
      const base64 = result.split(",")[1];
      resolve(base64);
    };
    reader.onerror = (error) => reject(error);
  });
};

/**
 * Sends an uploaded civic issue image to the server-side proxy endpoint for AI analysis.
 * 
 * @param imageFile - The file uploaded by the user
 * @returns A promise resolving to the parsed CivicAnalysis JSON object
 */
export async function analyzeIssueImage(imageFile: File): Promise<CivicAnalysis> {
  try {
    const base64Data = await fileToBase64(imageFile);
    
    const response = await fetch("/api/analyze", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        imageBase64: base64Data,
        mimeType: imageFile.type,
      }),
    });

    if (!response.ok) {
      const errorJson = await response.json();
      throw new Error(errorJson.error || "Server failed to process image analysis");
    }

    const result = await response.json();
    return result.analysis;
  } catch (error: any) {
    console.error("Error analyzing issue image:", error);
    throw new Error(error.message || "Failed to analyze image. Please try again.");
  }
}
