const ALGORITHM = 'AES-GCM';

async function getKey(): Promise<CryptoKey> {
  const keyStr = process.env.WORDPRESS_ENCRYPTION_KEY;
  if (!keyStr || keyStr.length !== 32) {
    throw new Error("WORDPRESS_ENCRYPTION_KEY environment variable must be exactly 32 characters long.");
  }
  const enc = new TextEncoder();
  return await crypto.subtle.importKey(
    "raw",
    enc.encode(keyStr),
    ALGORITHM,
    false,
    ["encrypt", "decrypt"]
  );
}

function bufferToHex(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

function hexToBuffer(hex: string): ArrayBuffer {
  const bytes = new Uint8Array(Math.ceil(hex.length / 2));
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substring(i * 2, i * 2 + 2), 16);
  }
  return bytes.buffer;
}

export async function encrypt(text: string): Promise<string> {
  if (!text) return text;
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const enc = new TextEncoder();
  const key = await getKey();
  
  const encrypted = await crypto.subtle.encrypt(
    { name: ALGORITHM, iv },
    key,
    enc.encode(text)
  );
  
  return `${bufferToHex(iv)}:${bufferToHex(encrypted)}`;
}

export async function decrypt(text: string): Promise<string> {
  if (!text) return text;
  const parts = text.split(':');
  if (parts.length !== 2) throw new Error("Invalid format");
  
  const iv = hexToBuffer(parts[0]);
  const encryptedData = hexToBuffer(parts[1]);
  const key = await getKey();
  
  const decrypted = await crypto.subtle.decrypt(
    { name: ALGORITHM, iv },
    key,
    encryptedData
  );
  
  const dec = new TextDecoder();
  return dec.decode(decrypted);
}
