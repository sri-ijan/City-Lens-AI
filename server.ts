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

// API endpoint to analyze a civic issue image
app.post("/api/analyze", async (req, res): Promise<any> => {
  try {
    const { imageBase64, mimeType } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ error: "Missing image data" });
    }

    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (!geminiApiKey) {
      return res
        .status(500)
        .json({ error: "Gemini API key is not configured on the server" });
    }

    const ai = new GoogleGenAI({
      apiKey: geminiApiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });

    const imagePart = {
      inlineData: {
        mimeType: mimeType || "image/jpeg",
        data: imageBase64,
      },
    };

    const promptString = `You are an AI civic infrastructure inspector for India.
Analyze the uploaded image carefully.

IMPORTANT: If the image does NOT show a real-world civic infrastructure issue 
(e.g. it's a logo, screenshot, person, animal, indoor photo, or unrelated image), 
set "is_civic_issue" to false and "category" to "Not Applicable".

Only analyze actual outdoor civic problems like potholes, garbage, broken 
streetlights, water leakage, damaged roads, drainage issues, encroachments.
* If the image is NOT a real outdoor civic infrastructure issue 
  (logo, screenshot, person, indoor photo, animal, etc.), 
  set "is_civic_issue" to false and "category" to "Not Applicable".
* If it IS a civic issue, set "is_civic_issue" to true.

Return ONLY valid JSON with these fields:
- is_civic_issue: boolean
- category, severity, severity_score, confidence, title, 
  description, hazards, department, recommended_action, 
  estimated_repair_time`;

    // Call the model using generateContent with a strict schema to guarantee valid JSON
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [imagePart, promptString],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,

          properties: {
            is_civic_issue: {
              type: Type.BOOLEAN,
              description:
                "True if image shows a real civic infrastructure issue, false otherwise",
            },
            category: {
              type: Type.STRING,
              description:
                "Must be: Pothole | Water Leakage | Broken Streetlight | Garbage Dumping | Damaged Road | Encroachment | Drainage Issue | Other",
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
              description:
                "A confidence score from 0.0 to 1.0 representing the AI certainty",
            },
            title: {
              type: Type.STRING,
              description:
                "A brief, clear title for the reported issue (e.g., Large pothole near water drain)",
            },
            description: {
              type: Type.STRING,
              description:
                "A factual, detailed summary describing only what is visually evident in the image",
            },
            hazards: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description:
                "An array of specific physical or environmental hazards identified",
            },
            department: {
              type: Type.STRING,
              description:
                "The specific Indian civic department responsible (e.g., Public Works Department (PWD), Municipal Corporation, State Electricity Board, Jal Board)",
            },
            recommended_action: {
              type: Type.STRING,
              description:
                "A concrete, actionable recommendation to resolve the issue safely",
            },
            estimated_repair_time: {
              type: Type.STRING,
              description:
                "Reasonable timeline for resolving the issue (e.g., '24 Hours', '2-3 Days', '1 Week', '2 Weeks')",
            },
          },
          required: [
             "is_civic_issue",
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
      const cleaned = textOutput
        .trim()
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/```\s*$/i, "")
        .trim();
      const parsedData = JSON.parse(cleaned); // ✅

      return res.json({ analysis: parsedData });
    } catch (parseError) {
      console.error(
        "Failed to parse Gemini response text:",
        textOutput,
        parseError,
      );

      // Fallback object matching the required schema
      const fallback = {
        category: "Other",
        severity: "Medium",
        severity_score: 5,
        confidence: 0.5,
        title: "Detected Civic Issue",
        description:
          "The visual content indicates a possible municipal issue. Details could not be fully parsed automatically.",
        hazards: ["General public obstruction"],
        department: "Local Municipal Corporation",
        recommended_action: "Inspect the location and review safety protocols.",
        estimated_repair_time: "3-5 Days",
      };
      return res.json({ analysis: fallback, rawText: textOutput });
    }
  } catch (error: any) {
    console.error("Error in /api/analyze endpoint:", error);
    return res.status(500).json({
      error: error.message || "Internal server error during analysis",
    });
  }
});

// API endpoint to generate a formal municipal complaint letter
app.post("/api/complaint", async (req, res): Promise<any> => {
  try {
    const { issueType, location, description, reporterName, dateOfIncident } =
      req.body;

    if (!issueType || !location || !description) {
      return res.status(400).json({
        error: "Missing required fields (issueType, location, description)",
      });
    }

    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (!geminiApiKey) {
      return res
        .status(500)
        .json({ error: "Gemini API key is not configured on the server" });
    }

    const ai = new GoogleGenAI({
      apiKey: geminiApiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });

    const promptString = `You are an expert civic legal advisor and public advocate in India.
Generate a formal, authoritative, yet respectful legal complaint letter addressed to the relevant municipal commissioner or department head (e.g., Municipal Corporation, PWD, Jal Board, BESCOM, etc.) based on the following details:

- Issue Type: ${issueType}
- Location: ${location}
- Description: ${description}
- Reporter's Name: ${reporterName || "Concerned Citizen"}
- Date of Incident / Discovery: ${dateOfIncident || "Recent"}

The letter should:
1. Have a professional layout with a Subject line, formal salutation, body paragraphs, and a sign-off.
2. Quote relevant Indian civic responsibility norms or standard public nuisance rules (e.g., under the Municipal Corporation Act or standard environmental regulations) to make it highly persuasive and legally grounded.
3. Be clear, polished, structured, and ready to be printed or emailed.
4. DO NOT use markdown headers, bold headers or code blocks. Just return the pure plain text of the letter.`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: promptString,
    });

    const textOutput = response.text;
    if (!textOutput) {
      throw new Error("No response text received from Gemini");
    }

    return res.json({ complaint: textOutput.trim() });
  } catch (error: any) {
    console.error("Error in /api/complaint endpoint:", error);
    return res.status(500).json({
      error:
        error.message || "Internal server error during complaint generation",
    });
  }
});

// API endpoint for server-side Routing Agent
app.post("/api/route", async (req, res): Promise<any> => {
  try {
    const { category, severity, location } = req.body;

    if (!category || !severity) {
      return res
        .status(400)
        .json({ error: "Missing required fields (category, severity)" });
    }

    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (!geminiApiKey) {
      return res
        .status(500)
        .json({ error: "Gemini API key is not configured on the server" });
    }

    const ai = new GoogleGenAI({
      apiKey: geminiApiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });

    const promptString = `You are an AI civic routing agent for India.
Determine the responsible municipal department and routing path for the following reported issue:
- Category: ${category}
- Severity: ${severity}
- Location: ${location || "Unknown Location"}

Analyze and determine:
1. The exact responsible Indian municipal department (e.g., Public Works Department (PWD), Bruhat Bengaluru Mahanagara Palike (BBMP), Delhi Jal Board, BESCOM, Municipal Corporation of Delhi (MCD), etc.).
2. A short department code (e.g., PWD, BBMP, DJB, BESCOM, MCD).
3. The priority level: P1 (Critical/urgent, danger to life/property), P2 (High priority, major disruption), P3 (Medium priority, standard issue), P4 (Low priority, cosmetic/minor).
4. Estimated days to resolve (a number).
5. A clear escalation path as an array of strings (e.g., step 1: Ward Engineer, step 2: Assistant Executive Engineer, step 3: Chief Commissioner / Nodal Officer, etc. specific to that department).
6. A quick contact hint (e.g., phone number, email, or app/portal name).

Return ONLY valid raw JSON conforming to the specified schema.`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: promptString,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            department: { type: Type.STRING },
            departmentCode: { type: Type.STRING },
            priority: {
              type: Type.STRING,
              description: "Must be: P1 | P2 | P3 | P4",
            },
            estimatedDays: { type: Type.INTEGER },
            escalationPath: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            contactHint: { type: Type.STRING },
          },
          required: [
            "department",
            "departmentCode",
            "priority",
            "estimatedDays",
            "escalationPath",
            "contactHint",
          ],
        },
      },
    });

    const textOutput = response.text;
    if (!textOutput) {
      throw new Error("No response text received from Gemini");
    }

    try {
      const cleaned = textOutput
        .trim()
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/```\s*$/i, "")
        .trim();
      const parsedData = JSON.parse(cleaned); // ✅

      return res.json({ routing: parsedData });
    } catch (parseError) {
      console.error(
        "Failed to parse routing agent response:",
        textOutput,
        parseError,
      );
      const fallback = {
        department: "Local Municipal Ward Office",
        departmentCode: "WARD",
        priority: "P3",
        estimatedDays: 7,
        escalationPath: ["Ward Inspector", "Assistant Commissioner"],
        contactHint: "Contact local ward control room",
      };
      return res.json({ routing: fallback });
    }
  } catch (error: any) {
    console.error("Error in /api/route endpoint:", error);
    return res
      .status(500)
      .json({ error: error.message || "Internal server error during routing" });
  }
});

// API endpoint for Resolution Verification Agent
app.post("/api/resolve", async (req, res): Promise<any> => {
  try {
    const { afterImageBase64, mimeType, originalReport } = req.body;

    if (!afterImageBase64 || !originalReport) {
      return res.status(400).json({
        error: "Missing required fields (afterImageBase64, originalReport)",
      });
    }

    const { title, category, description, severity } = originalReport;
    if (!title || !category || !description || !severity) {
      return res.status(400).json({
        error:
          "Missing original report fields (title, category, description, severity)",
      });
    }

    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (!geminiApiKey) {
      return res
        .status(500)
        .json({ error: "Gemini API key is not configured on the server" });
    }

    const ai = new GoogleGenAI({
      apiKey: geminiApiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });

    const imagePart = {
      inlineData: {
        data: afterImageBase64,
        mimeType: mimeType || "image/jpeg",
      },
    };

    const promptString = `You are an AI civic resolution verifier for India.
You are given details of a reported civic issue and an 'after' photo submitted by a citizen claiming the issue is resolved.

Original Issue:
- Title: ${title}
- Category: ${category}  
- Description: ${description}
- Severity: ${severity}

Analyze the after photo and determine:
1. Is the issue genuinely resolved?
2. Quality of the fix (Poor/Partial/Complete)
3. Confidence score (0.0-1.0)
4. What is visible in the after photo
5. Any remaining concerns

Return ONLY valid JSON.`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [imagePart, promptString],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            isResolved: { type: Type.BOOLEAN },
            fixQuality: {
              type: Type.STRING,
              enum: ["Poor", "Partial", "Complete"],
            },
            confidence: { type: Type.NUMBER },
            verificationSummary: { type: Type.STRING },
            remainingConcerns: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
          },
          required: [
            "isResolved",
            "fixQuality",
            "confidence",
            "verificationSummary",
            "remainingConcerns",
          ],
        },
      },
    });

    const textOutput = response.text;
    if (!textOutput) {
      throw new Error("No response text received from Gemini");
    }

    try {
      const cleaned = textOutput
        .trim()
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/```\s*$/i, "")
        .trim();
      const parsedData = JSON.parse(cleaned); // ✅

      return res.json({ resolution: parsedData });
    } catch (parseError) {
      console.error(
        "Failed to parse resolution agent response:",
        textOutput,
        parseError,
      );
      return res.status(500).json({ error: "Failed to parse AI response" });
    }
  } catch (error: any) {
    console.error("Error in /api/resolve endpoint:", error);
    return res.status(500).json({
      error:
        error.message || "Internal server error during resolution verification",
    });
  }
});

// API endpoint for City Intelligence Insights
app.post("/api/insights", async (req, res): Promise<any> => {
  try {
    const { reports } = req.body;

    if (!reports || !Array.isArray(reports) || reports.length === 0) {
      return res
        .status(400)
        .json({ error: "No reports provided for analysis." });
    }

    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (!geminiApiKey) {
      return res
        .status(500)
        .json({ error: "Gemini API key is not configured on the server" });
    }

    const ai = new GoogleGenAI({
      apiKey: geminiApiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });

    // Extract relevant brief data to stay within token limits and optimize analysis speed
    const simplifiedReports = reports.map((r) => ({
      title: r.analysis?.title || "Untitled",
      category: r.analysis?.category || "Other",
      description: r.analysis?.description || "",
      severity: r.analysis?.severity || "Medium",
      department: r.analysis?.department || "General",
      landmark: r.landmark || "Unknown Location",
      status: r.status || "Pending",
      createdAt: r.createdAt || "",
    }));

    const promptString = `You are a City Intelligence Insight Agent.
Analyze the following list of civic reports submitted by citizens and generate a structured city intelligence report focusing on hotspots, trends, escalation risks, and predictions.

Civic Reports:
${JSON.stringify(simplifiedReports)}

Analyze the reports and determine:
1. An overall concise visual summary of the municipal situation and civic patterns (1-2 sentences).
2. A list of key insights. Ensure each insight represents a true hotspot, trend, escalation, or prediction.
3. The number of critical severity reports.
4. The most affected category of issues.

Return ONLY valid JSON matching the requested schema.`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [promptString],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            insights: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  description: { type: Type.STRING },
                  type: {
                    type: Type.STRING,
                    enum: ["hotspot", "trend", "escalation", "prediction"],
                  },
                  severity: {
                    type: Type.STRING,
                    enum: ["info", "warning", "critical"],
                  },
                  affectedArea: { type: Type.STRING },
                  recommendedAction: { type: Type.STRING },
                },
                required: [
                  "title",
                  "description",
                  "type",
                  "severity",
                  "affectedArea",
                  "recommendedAction",
                ],
              },
            },
            summary: { type: Type.STRING },
            criticalCount: { type: Type.NUMBER },
            mostAffectedCategory: { type: Type.STRING },
          },
          required: [
            "insights",
            "summary",
            "criticalCount",
            "mostAffectedCategory",
          ],
        },
      },
    });

    const textOutput = response.text;
    if (!textOutput) {
      throw new Error("No response text received from Gemini");
    }

    try {
      const parsedData = JSON.parse(textOutput.trim());
      return res.json({ insights: parsedData });
    } catch (parseError) {
      console.error(
        "Failed to parse city insights response:",
        textOutput,
        parseError,
      );
      return res.status(500).json({ error: "Failed to parse AI response" });
    }
  } catch (error: any) {
    console.error("Error in /api/insights endpoint:", error);
    return res.status(500).json({
      error:
        error.message || "Internal server error during insights generation",
    });
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
    console.log(
      `[CityLens Server] Running on http://0.0.0.0:${PORT} in ${process.env.NODE_ENV || "development"} mode`,
    );
  });
}

startServer().catch((err) => {
  console.error("Failed to start full-stack server:", err);
});
