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

// ─── VISION AGENT ──────────────────────────────────────────────────────────────
app.post("/api/analyze", async (req, res): Promise<any> => {
  try {
    const { imageBase64, mimeType } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ error: "Missing image data" });
    }

    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (!geminiApiKey) {
      return res.status(500).json({ error: "Gemini API key is not configured on the server" });
    }

    const ai = new GoogleGenAI({
      apiKey: geminiApiKey,
      httpOptions: { headers: { "User-Agent": "aistudio-build" } },
    });

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
* Identify specific hazards, local municipal departments in India (e.g., PWD, BBMP, Jal Board, BESCOM, MCD, local ward office, etc.), and realistic repair times.
* Return JSON with exactly these fields: category, severity, severity_score, confidence, title, description, hazards, department, recommended_action, estimated_repair_time
* category must be one of: Pothole | Water Leakage | Broken Streetlight | Garbage Dumping | Damaged Road | Encroachment | Drainage Issue | Other
* severity must be one of: Low | Medium | High | Critical
* severity_score is integer 1-10
* confidence is float 0.0-1.0
* hazards is array of strings`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [imagePart, { text: promptString }],
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
      const parsedData = JSON.parse(cleaned);
      return res.json({ analysis: parsedData });
    } catch (parseError) {
      console.error("Failed to parse Gemini response text:", textOutput, parseError);
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
        estimated_repair_time: "3-5 Days",
      };
      return res.json({ analysis: fallback, rawText: textOutput });
    }
  } catch (error: any) {
    console.error("Error in /api/analyze endpoint:", error);

    if (error.status === 429) {
      return res.json({
        analysis: {
          category: "Other",
          severity: "Medium",
          severity_score: 5,
          confidence: 0.5,
          title: "AI Service Temporarily Busy",
          description: "Gemini quota is temporarily unavailable. Please retry later.",
          hazards: [],
          department: "Local Municipal Corporation",
          recommended_action: "Please retry in a minute or submit the report manually.",
          estimated_repair_time: "Unknown",
        },
      });
    }

    return res.status(500).json({ error: error.message || "Internal server error during analysis" });
  }
});

// ─── COMPLAINT AGENT ───────────────────────────────────────────────────────────
app.post("/api/complaint", async (req, res): Promise<any> => {
  try {
    const { issueType, location, description, reporterName, dateOfIncident } = req.body;

    if (!issueType || !location || !description) {
      return res.status(400).json({ error: "Missing required fields (issueType, location, description)" });
    }

    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (!geminiApiKey) {
      return res.status(500).json({ error: "Gemini API key is not configured on the server" });
    }

    const ai = new GoogleGenAI({
      apiKey: geminiApiKey,
      httpOptions: { headers: { "User-Agent": "aistudio-build" } },
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
    return res.status(500).json({ error: error.message || "Internal server error during complaint generation" });
  }
});

// ─── ROUTING AGENT ─────────────────────────────────────────────────────────────
app.post("/api/route", async (req, res): Promise<any> => {
  try {
    const { category, severity, location } = req.body;

    if (!category || !severity) {
      return res.status(400).json({ error: "Missing required fields (category, severity)" });
    }

    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (!geminiApiKey) {
      return res.status(500).json({ error: "Gemini API key is not configured on the server" });
    }

    const ai = new GoogleGenAI({
      apiKey: geminiApiKey,
      httpOptions: { headers: { "User-Agent": "aistudio-build" } },
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
5. A clear escalation path as an array of strings (e.g., step 1: Ward Engineer, step 2: Assistant Executive Engineer, step 3: Chief Commissioner / Nodal Officer).
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
      const parsedData = JSON.parse(cleaned);
      return res.json({ routing: parsedData });
    } catch (parseError) {
      console.error("Failed to parse routing agent response:", textOutput, parseError);
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
    return res.status(500).json({ error: error.message || "Internal server error during routing" });
  }
});

// ─── SERVER START ──────────────────────────────────────────────────────────────
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
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

// ─── RESOLUTION AGENT ──────────────────────────────────────────────────────────
app.post("/api/resolve", async (req, res): Promise<any> => {
  try {
    const { afterImageBase64, mimeType, originalReport } = req.body;

    if (!afterImageBase64 || !originalReport) {
      return res.status(400).json({ error: "Missing image or original report data" });
    }

    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (!geminiApiKey) {
      return res.status(500).json({ error: "Gemini API key not configured" });
    }

    const ai = new GoogleGenAI({
      apiKey: geminiApiKey,
      httpOptions: { headers: { "User-Agent": "aistudio-build" } },
    });

    const imagePart = {
      inlineData: {
        mimeType: mimeType || "image/jpeg",
        data: afterImageBase64,
      },
    };

    const promptString = `You are an AI civic resolution verifier for India.
You are given details of a reported civic issue and an after photo submitted by a citizen claiming the issue is resolved.

Original Issue:
- Title: ${originalReport.title}
- Category: ${originalReport.category}
- Description: ${originalReport.description}
- Severity: ${originalReport.severity}

Analyze the after photo and determine if the issue is genuinely resolved.
Return ONLY valid JSON with no markdown or backticks.`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [imagePart, { text: promptString }],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            isResolved: { type: Type.BOOLEAN },
            fixQuality: {
              type: Type.STRING,
              description: "Must be: Poor | Partial | Complete",
            },
            confidence: { type: Type.NUMBER },
            verificationSummary: { type: Type.STRING },
            remainingConcerns: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
          },
          required: ["isResolved", "fixQuality", "confidence", "verificationSummary", "remainingConcerns"],
        },
      },
    });

    const textOutput = response.text;
    if (!textOutput) throw new Error("No response from Gemini");

    try {
      const cleaned = textOutput.trim()
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/```\s*$/i, "")
        .trim();
      const parsedData = JSON.parse(cleaned);
      return res.json({ verification: parsedData });
    } catch {
      return res.json({
        verification: {
          isResolved: false,
          fixQuality: "Poor",
          confidence: 0.3,
          verificationSummary: "Could not verify resolution automatically.",
          remainingConcerns: ["Manual inspection recommended"],
        },
      });
    }
  } catch (error: any) {
    console.error("Error in /api/resolve endpoint:", error);
    return res.status(500).json({ error: error.message || "Internal server error during resolution verification" });
  }
});