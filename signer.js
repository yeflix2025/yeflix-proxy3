import CryptoJS from "crypto-js";
import url from "url";

export function signUrl(targetUrl, secret, ttlSeconds=3600){
  try {
    const expires = Math.floor(Date.now()/1000) + ttlSeconds;
    const data = `${targetUrl}|${expires}`;
    const hash = CryptoJS.HmacSHA256(data, secret).toString();
    const signed = `${targetUrl}?_e=${expires}&_s=${hash}`;
    return signed;
  } catch(e){ return targetUrl; }
}

export function verifySignature(signedUrl, secret){
  try {
    const parsed = url.parse(signedUrl, true);
    const _e = parsed.query._e;
    const _s = parsed.query._s;
    if(!_e || !_s) return false;
    const expires = parseInt(_e,10);
    if(Date.now()/1000 > expires) return false;
    const base = `${parsed.protocol}//${parsed.host}${parsed.pathname}`;
    const original = signedUrl.split("?_e=")[0];
    const data = `${original}|${_e}`;
    const hash = CryptoJS.HmacSHA256(data, secret).toString();
    return hash === _s;
  } catch(e){ return false; }
}
