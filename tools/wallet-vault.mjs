// Encrypts the wallet page's personal card content into wallet/vault.json (AES-GCM, 128-bit key).
// The key never goes into the repo: it is written to the NFC card as the link's #fragment and
// the page keeps it in the visitor's localStorage.
//
//   node tools/wallet-vault.mjs encrypt payload.json                    new random key, printed once
//   WALLET_KEY=<key> node tools/wallet-vault.mjs encrypt payload.json   same key (card stays valid)
//   WALLET_KEY=<key> node tools/wallet-vault.mjs decrypt > payload.json content back for editing
//
// payload.json: { cards: { id, snap, insta: "<card inner HTML>" }, links: { snap, insta: { href, label } },
//                 images: { snap, insta, photo: "file.png|.jpg" | "data:..." } }  (file paths are relative to payload.json)
// Keep payload.json out of the repo; it holds the plain text.
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const VAULT = resolve(dirname(fileURLToPath(import.meta.url)), "../wallet/vault.json");
const { subtle } = globalThis.crypto;
const b64u = (bytes) => Buffer.from(bytes).toString("base64url");
const unb64u = (s) => new Uint8Array(Buffer.from(s, "base64url"));

async function importKey(k) {
  if (!/^[A-Za-z0-9_-]{22}$/.test(k)) throw new Error("WALLET_KEY must be 22 base64url characters");
  return subtle.importKey("raw", unb64u(k), "AES-GCM", false, ["encrypt", "decrypt"]);
}

async function encrypt(payloadPath) {
  const payload = JSON.parse(readFileSync(payloadPath, "utf8"));
  for (const [name, src] of Object.entries(payload.images ?? {})) {
    if (!src.startsWith("data:")) {
      const type = /\.jpe?g$/i.test(src) ? "image/jpeg" : "image/png";
      const file = readFileSync(resolve(dirname(payloadPath), src));
      payload.images[name] = `data:${type};base64,${file.toString("base64")}`;
    }
  }
  const fresh = !process.env.WALLET_KEY;
  const k = process.env.WALLET_KEY || b64u(globalThis.crypto.getRandomValues(new Uint8Array(16)));
  const iv = globalThis.crypto.getRandomValues(new Uint8Array(12));
  const ct = await subtle.encrypt({ name: "AES-GCM", iv }, await importKey(k), new TextEncoder().encode(JSON.stringify(payload)));
  writeFileSync(VAULT, JSON.stringify({ v: 1, iv: b64u(iv), ct: b64u(new Uint8Array(ct)) }) + "\n");
  console.error(`wrote ${VAULT}`);
  if (fresh) console.error(`new key (store it safely, it is not saved anywhere): ${k}`);
}

async function decrypt() {
  const vault = JSON.parse(readFileSync(VAULT, "utf8"));
  const key = await importKey(process.env.WALLET_KEY ?? "");
  const plain = await subtle.decrypt({ name: "AES-GCM", iv: unb64u(vault.iv) }, key, unb64u(vault.ct));
  process.stdout.write(JSON.stringify(JSON.parse(new TextDecoder().decode(plain)), null, 1) + "\n");
}

const [cmd, arg] = process.argv.slice(2);
if (cmd === "encrypt" && arg) await encrypt(arg);
else if (cmd === "decrypt") await decrypt();
else {
  console.error("usage: wallet-vault.mjs encrypt <payload.json> | decrypt");
  process.exit(1);
}
