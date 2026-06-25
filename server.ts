import express from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";
import { createServer as createViteServer } from "vite";

// Load environment variables
dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT || "3000", 10);

// Set up JSON body parser with increased limit to handle base64 image uploads
app.use(express.json({ limit: "15mb" }));

// Initialize the modern Google GenAI SDK
const geminiApiKey = process.env.GEMINI_API_KEY;
const ai = new GoogleGenAI({
  apiKey: geminiApiKey,
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build",
    },
  },
});

// API endpoint to analyze a civic issue image
app.post("/api/analyze", async (req, res): Promise<any> => {
  try {
    const { imageBase64, mimeType } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ error: "Missing image data" });
    }

    if (!geminiApiKey) {
      return res.status(500).json({ error: "Gemini API key is not configured on the server" });
    }

    const imagePart = {
      inlineData: {
        mimeType: mimeType || "image/jpeg",
        data: imageBase64,
      },
    };

    const promptString = `You are an AI civic infrastructure inspector for India.
Analyze the uploaded image and return ONLY valid raw JSON representing the identified issue.

Rules:
* Be factual and precise.
* Describe only visible evidence.
* Identify specific hazards, local municipal departments in India (e.g., PWD, BBMP, Jal Board, BESCOM, MCD, local ward office, etc.), and realistic repair times.`;

    // Call the model using generateContent with a strict schema to guarantee valid JSON
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-lite",
      contents: [imagePart, promptString],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            category: {
              type: Type.STRING,
              description: "Must be: Pothole | Water Leakage | Broken Streetlight | Garbage Dumping | Damaged Road | Encroachment | Drainage Issue | Other",
            },
            severity: {
              type: Type.STRING,
              description: "Must be: Low | Medium | High | Critical",
            },
            severity_score: {
              type: Type.INTEGER,
              description: "Score out of 10 representing risk (1-10)",
            },
            confidence: {
              type: Type.NUMBER,
              description: "A confidence score from 0.0 to 1.0 representing the AI certainty",
            },
            title: {
              type: Type.STRING,
              description: "A brief, clear title for the reported issue (e.g., Large pothole near water drain)",
            },
            description: {
              type: Type.STRING,
              description: "A factual, detailed summary describing only what is visually evident in the image",
            },
            hazards: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "An array of specific physical or environmental hazards identified",
            },
            department: {
              type: Type.STRING,
              description: "The specific Indian civic department responsible (e.g., Public Works Department (PWD), Municipal Corporation, State Electricity Board, Jal Board)",
            },
            recommended_action: {
              type: Type.STRING,
              description: "A concrete, actionable recommendation to resolve the issue safely",
            },
            estimated_repair_time: {
              type: Type.STRING,
              description: "Reasonable timeline for resolving the issue (e.g., '24 Hours', '2-3 Days', '1 Week', '2 Weeks')",
            },
          },
          required: [
            "category",
            "severity",
            "severity_score",
            "confidence",
            "title",
            "description",
            "hazards",
            "department",
            "recommended_action",
            "estimated_repair_time",
          ],
        },
      },
    });

    const textOutput = response.text;
    if (!textOutput) {
      throw new Error("No response text received from Gemini");
    }

    // Try parsing the returned response
    try {
      const parsedData = JSON.parse(textOutput.trim());
      return res.json({ analysis: parsedData });
    } catch (parseError) {
      console.error("Failed to parse Gemini response text:", textOutput, parseError);
      
      // Fallback object matching the required schema
      const fallback = {
        category: "Other",
        severity: "Medium",
        severity_score: 5,
        confidence: 0.5,
        title: "Detected Civic Issue",
        description: "The visual content indicates a possible municipal issue. Details could not be fully parsed automatically.",
        hazards: ["General public obstruction"],
        department: "Local Municipal Corporation",
        recommended_action: "Inspect the location and review safety protocols.",
        estimated_repair_time: "3-5 Days"
      };
      return res.json({ analysis: fallback, rawText: textOutput });
    }
  } catch (error: any) {
    console.error("Error in /api/analyze endpoint:", error);
    return res.status(500).json({ error: error.message || "Internal server error during analysis" });
  }
});

// Configure Vite middleware or production static files
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    // In development mode, integrate Vite as middleware
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // In production mode, serve compiled static files from dist
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[CityLens Server] Running on http://0.0.0.0:${PORT} in ${process.env.NODE_ENV || "development"} mode`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start full-stack server:", err);
});
