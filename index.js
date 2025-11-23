import express from "express";
import helmet from "helmet";
import cors from "cors";
import rateLimit from "express-rate-limit";
import { extractUrl } from "./extractors.js";
import { verifySignature, signUrl } from "./signer.js";
import { apiLimiter } from "./rateLimiter.js";

const app = express();
app.set('trust proxy', 1);
app.use(helmet());
app.use(cors()); // CORS abierto para que InfinityFree pueda usarlo
app.use(apiLimiter); // protección básica por IP

const API_KEY = process.env.API_KEY || "yeflix2025";
const DAILY_LIMIT = parseInt(process.env.DAILY_LIMIT || "60", 10);

// in-memory quota (simple). Para producción usar DB/Redis.
const quotas = {};

function today() {
  return new Date().toISOString().slice(0,10);
}

function checkDaily(key){
  const t = today();
  if(!quotas[key] || quotas[key].date !== t) quotas[key] = { date: t, count: 0 };
  return quotas[key];
}

// Endpoint extract
app.get("/extract", async (req, res) => {
  try {
    const key = req.query.key;
    const url = req.query.url;
    if(!key || key !== API_KEY) return res.status(403).json({ error: "invalid key" });
    if(!url) return res.status(400).json({ error: "url missing" });

    const q = checkDaily(key);
    if(q.count >= DAILY_LIMIT) return res.status(429).json({ error: "daily limit exceeded" });
    q.count++;

    const result = await extractUrl(url);
    if(!result) return res.status(424).json({ error: "extraction failed" });

    // firmar URL (opcional) para que dure 1h
    const signed = signUrl(result, process.env.SIGNING_SECRET || "change_me", 3600);

    return res.json({ status: "success", url: signed });
  } catch(e){
    console.error("extract error:", e);
    return res.status(500).json({ error: "extract_error", detail: e.message || String(e) });
  }
});

// Endpoint to validate signature if needed
app.get("/validate", (req,res)=>{
  const { url } = req.query;
  if(!url) return res.status(400).json({ error: "url missing" });
  const ok = verifySignature(url, process.env.SIGNING_SECRET || "change_me");
  res.json({ valid: ok });
});

const PORT = parseInt(process.env.PORT || "10000", 10);
app.listen(PORT, ()=> console.log(`Yeflix Proxy listo en puerto ${PORT}`));
