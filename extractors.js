import axios from "axios";

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36";

async function fetchHtml(url){
  const res = await axios.get(url, {
    headers: { "User-Agent": UA, Referer: url },
    timeout: 20000
  });
  return res.data;
}

export async function extractUrl(url){
  const lower = url.toLowerCase();
  try {
    if(lower.includes("mp4upload")) return await extractMp4upload(url);
    if(lower.includes("filemoon")) return await extractFilemoon(url);
    if(lower.includes("streamtape")) return await extractStreamtape(url);
    if(lower.includes("dood")) return await extractDood(url);
    if(lower.includes("mega")) return await extractMega(url);
    // fallback: try generic
    const html = await fetchHtml(url);
    return genericExtract(html);
  } catch(e){
    console.error("extractUrl error", e);
    return null;
  }
}

function genericExtract(html){
  let m;
  m = html.match(/file:\s*"(https?:\/\/[^"]+)"/i);
  if(m) return m[1];
  m = html.match(/<source[^>]+src="([^"]+)"/i);
  if(m) return m[1];
  m = html.match(/<video[^>]+src="([^"]+)"/i);
  if(m) return m[1];
  return null;
}

// Implementaciones por host (intentar varios patrones)
async function extractMp4upload(url){
  const html = await fetchHtml(url);
  // buscar file, sources, o scripts que contengan 'player' config
  let m = html.match(/file:\s*"(https?:\/\/[^"]+\.mp4[^"]*)"/i);
  if(m) return m[1];
  m = html.match(/"file"\s*:\s*"([^"]+)"/i);
  if(m) return m[1];
  // algunos mp4upload requieren una llamada adicional a /dl/...; buscar hrefs
  m = html.match(/https?:\/\/[^'"]+\/dl\/[^'"]+/i);
  if(m) return m[0];
  return null;
}

async function extractFilemoon(url){
  const html = await fetchHtml(url);
  let m = html.match(/sources:\s*\[\s*\{[^}]*file:\s*"([^"]+)"/i);
  if(m) return m[1];
  m = html.match(/file:"([^"]+)"/i);
  if(m) return m[1];
  return null;
}

async function extractStreamtape(url){
  const html = await fetchHtml(url);
  let m = html.match(/robotlink'\)\.innerHTML = '([^']+)'/i);
  if(m){
    let link = m[1];
    if(!link.startsWith("http")) link = "https:" + link;
    return link;
  }
  m = html.match(/sources:\s*\[\s*\{[^}]*file:\s*"([^"]+)"/i);
  if(m) return m[1];
  return null;
}

async function extractDood(url){
  const html = await fetchHtml(url);
  let m = html.match(/token=([^"']+)/i);
  if(m){
    // intentar llamar a dood API (si existe)
    try{
      const token = m[1];
      const api = `https://doodapi.com/api/download?${token}`;
      const r = await axios.get(api, { headers: { "User-Agent": UA }});
      return r.data?.downloadUrl || null;
    }catch(e){ console.error(e); }
  }
  // fallback
  return genericExtract(html);
}

async function extractMega(url){
  // Mega es especial — normalmente necesita SDK; devolvemos la URL original para que cliente gestione
  return url;
}
