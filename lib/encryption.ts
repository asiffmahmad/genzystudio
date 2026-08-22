import crypto from 'crypto';

// Use a fallback for local development if not provided
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default-insecure-32-byte-key-xyz'; 
const ALGORITHM = 'aes-256-gcm';

export function encrypt(text: string): string {
  // Generate random IV
  const iv = crypto.randomBytes(16);
  
  // Create cipher
  const cipher = crypto.createCipheriv(
    ALGORITHM, 
    Buffer.from(ENCRYPTION_KEY.padEnd(32, '0').slice(0, 32)), // Ensure exactly 32 bytes
    iv
  );
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag().toString('hex');
  
  // Format: iv:authTag:encryptedText
  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

export function decrypt(encryptedData: string): string {
  try {
    const parts = encryptedData.split(':');
    if (parts.length !== 3) throw new Error('Invalid encrypted format');
    
    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encryptedText = parts[2];
    
    const decipher = crypto.createDecipheriv(
      ALGORITHM, 
      Buffer.from(ENCRYPTION_KEY.padEnd(32, '0').slice(0, 32)), 
      iv
    );
    
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('Decryption failed', error);
    return ''; // Or throw if you want strict failure
  }
}
