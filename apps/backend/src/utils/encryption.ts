import crypto from 'node:crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;

/**
 * Gets a valid 32-byte key from the environment variable.
 * If the provided key is not exactly 32 bytes, it is hashed using sha256 to produce a valid 32-byte key.
 */
function getKey(): Buffer {
    const rawKey = process.env.DB_ENCRYPTION_KEY;
    if (!rawKey) {
        throw new Error("DB_ENCRYPTION_KEY environment variable is not set. It is required for encrypting secrets.");
    }
    
    // If it's a 64 char hex string, parse it as buffer
    if (rawKey.length === 64 && /^[0-9a-fA-F]+$/.test(rawKey)) {
        return Buffer.from(rawKey, 'hex');
    }
    
    // If it's exactly 32 bytes long string, use it directly
    if (Buffer.byteLength(rawKey, 'utf8') === 32) {
        return Buffer.from(rawKey, 'utf8');
    }

    // Otherwise hash it to ensure 32 bytes
    return crypto.createHash('sha256').update(rawKey).digest();
}

/**
 * Encrypts a string using AES-256-GCM.
 * Returns the encrypted string in the format: iv:authTag:encryptedText (all hex)
 */
export function encryptString(text: string): string {
    const iv = crypto.randomBytes(IV_LENGTH);
    const key = getKey();
    
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag().toString('hex');
    
    return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

/**
 * Decrypts a string that was encrypted with encryptString.
 */
export function decryptString(encryptedData: string): string {
    if (!encryptedData || !encryptedData.includes(':')) return encryptedData; // Unencrypted fallback
    
    const parts = encryptedData.split(':');
    if (parts.length !== 3) return encryptedData; // Invalid format, return as is
    
    const [ivHex, authTagHex, encryptedHex] = parts;
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const key = getKey();
    
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
}
