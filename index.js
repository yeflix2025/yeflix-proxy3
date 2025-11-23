import express from "express";
import axios from "axios";
import rateLimit from "express-rate-limit";
import * as cheerio from "cheerio";
import helmet from "helmet";

const app = express();

// Seguridad
app.use(helmet());

// API KEY
const API_KEY = "yeflix2025";

// Límite diario
const DAILY_LIMIT = 60;
let count = 0;

// Rate limit por minuto
app.use(rateLimit({
  windowMs: 60 * 1000,
  max: 50
}));

// Headers reales
const REAL_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0 Safari/537.36",
  "Accept": "*/*",
  "Accept-Language": "es-ES,es;q=0.9",
  "Referer": "https://mp4upload.com/",
  "Connection": "keep-alive"
};

// Función GET con cookies y redirecciones manuales
async function getPage(url) {
  const res = await axios.get(url, {
    headers: REAL_HEADERS,
    maxRedirects: 5,
    validateStatus: () => true
  });
  return res.data;
}

// EXTRACTOR UNIVERSAL V2
function extractVideo(html) {
  let m;

  // file: "URL"
  m = html.match(/file:\s*"(https?:\/\/[^"]+)"/i);
  if (m) return m[1];

  // sources:[{file:""}]
  m = html.match(/sources:\s*\[\s*\{[^}]*file:\s*"([^"]+)"/i);
  if (m) return m[1];

  // <source src="">
  m = html.match(/<source[^>]+src="([^"]+)"/i);
  if (m) return m[1];

  // video src=""
  m = html.match(/<video[^>]+src="([^"]+)"/i);
  if (m) return m[1];

  // MP4Upload script decode
  m = html.match(/player\.src\("([^"]+)"\)/i);
  if (m) return m[1];

  // Robotlink StreamTape
  m = html.match(/robotlink'\)\.innerHTML = '([^']+)'/i);
  if (m) return "https:" + m[1];

  // Buscar dentro de scripts
  const $ = cheerio.load(html);
  $("script").each((i, el) => {
    const txt = $(el).html();
    if (!txt) return;

    const s1 = txt.match(/https?:\/\/[^"']+\.mp4/);
    if (s1) m = s1;
  });

  if (m) return m[0];

  return null;
}

// RUTA PRINCIPAL
app.get("/extract", async (req, res) => {
  const key = req.query.key;
  const url = req.query.url;

  if (key !== API_KEY)
    return res.status(403).json({ error: "invalid key" });

  if (!url)
    return res.status(400).json({ error: "url missing" });

  if (count >= DAILY_LIMIT)
    return res.status(429).json({ error: "daily limit exceeded" });

  count++;

  try {
    const html = await getPage(url);
    const video = extractVideo(html);

    if (!video)
      return res.json({ error: "video not found" });

    return res.json({
      status: "success",
      file: video
    });

  } catch (e) {
    return res.json({
      error: "extract_error",
      detail: e.message
    });
  }
});

app.listen(3000, () => {
  console.log("Extractor V2 listo en puerto 3000");
});
