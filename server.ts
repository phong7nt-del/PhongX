import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import "dotenv/config"; // Ensure env vars are loaded

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });

  app.post("/api/gemini/advice", async (req, res) => {
    try {
      const { prompt, tonData } = req.body;
      let fullPrompt = prompt;
      if (tonData) {
        fullPrompt += "\n\nDữ liệu khách hàng nợ:\n" + JSON.stringify(tonData);
      }
      
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: fullPrompt,
        config: {
          systemInstruction: "Bạn là một chuyên gia tư vấn quản lý thu hồi nợ. Hãy đưa ra lời khuyên thiết thực, chuyên nghiệp và hiệu quả về các công việc cần làm để xử lý tồn nợ hiện hữu cho khách hàng. Trả lời bằng tiếng Việt, định dạng rõ ràng.",
        }
      });
      res.json({ text: response.text });
    } catch (error) {
      console.error("Gemini API Error:", error);
      res.status(500).json({ error: "Lỗi khi tạo tư vấn." });
    }
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
