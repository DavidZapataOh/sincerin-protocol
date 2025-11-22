import crypto from 'crypto';
import { Keypair } from '@stellar/stellar-sdk';

export class EncryptionService {
  /**
   * Generate random symmetric key (AES-256)
   */
  static generateSymmetricKey(): Buffer {
    return crypto.randomBytes(32); // 256 bits
  }

  /**
   * Encrypt data with AES-256-GCM
   */
  static encryptWithSymmetricKey(data: string, symmetricKey: Buffer): Buffer {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', symmetricKey, iv);

    let encrypted = cipher.update(data, 'utf8');
    encrypted = Buffer.concat([encrypted, cipher.final()]);

    const authTag = cipher.getAuthTag();

    // Return: iv + authTag + encrypted
    return Buffer.concat([iv, authTag, encrypted]);
  }

  /**
   * Decrypt data with AES-256-GCM
   */
  static decryptWithSymmetricKey(encryptedData: Buffer, symmetricKey: Buffer): string {
    const iv = encryptedData.slice(0, 16);
    const authTag = encryptedData.slice(16, 32);
    const encrypted = encryptedData.slice(32);

    const decipher = crypto.createDecipheriv('aes-256-gcm', symmetricKey, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, undefined, 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  /**
   * Encrypt symmetric key for a Stellar address (simplified hash-based encryption)
   * In production, use proper ECIES with the address's public key
   */
  static encryptSymmetricKeyForAddress(symmetricKey: Buffer, address: string): Buffer {
    // Hash the address to create a deterministic encryption key
    const addressHash = crypto.createHash('sha256').update(address).digest();

    const cipher = crypto.createCipheriv(
      'aes-256-cbc',
      addressHash,
      Buffer.alloc(16, 0) // Zero IV for deterministic demo
    );

    let encrypted = cipher.update(symmetricKey);
    encrypted = Buffer.concat([encrypted, cipher.final()]);

    return encrypted;
  }

  /**
   * Decrypt symmetric key using Stellar secret key
   * The secret key's corresponding address is used for decryption
   */
  static decryptSymmetricKeyForAddress(
    encryptedKey: Buffer,
    secretKey: string
  ): Buffer {
    try {
      // Get address from secret key
      const keypair = Keypair.fromSecret(secretKey);
      const address = keypair.publicKey();

      // Use same hash-based decryption (mirror of encryption)
      const addressHash = crypto.createHash('sha256').update(address).digest();

      const decipher = crypto.createDecipheriv(
        'aes-256-cbc',
        addressHash,
        Buffer.alloc(16, 0) // Same zero IV
      );

      let decrypted = decipher.update(encryptedKey);
      decrypted = Buffer.concat([decrypted, decipher.final()]);

      return decrypted;
    } catch (error: any) {
      throw new Error(`Decryption failed: ${error.message}`);
    }
  }

  /**
   * Create encrypted index from signature (used for user authentication)
   * This mimics the client-side encryption process
   */
  static createEncryptedIndex(signature: string, serverAddress: string): Buffer {
    // Hash the signature
    const signatureHash = crypto.createHash('sha256').update(signature).digest();

    // Encrypt hash for server manager
    return this.encryptSymmetricKeyForAddress(signatureHash, serverAddress);
  }

  /**
   * Decrypt user index using server's secret key
   */
  static decryptUserIndex(encryptedIndex: Buffer, serverSecretKey: string): Buffer {
    return this.decryptSymmetricKeyForAddress(encryptedIndex, serverSecretKey);
  }

  /**
   * Create hex string from buffer with 0x prefix
   */
  static toHex(buffer: Buffer): string {
    return '0x' + buffer.toString('hex');
  }

  /**
   * Create buffer from hex string (with or without 0x prefix)
   */
  static fromHex(hex: string): Buffer {
    const cleanHex = hex.startsWith('0x') ? hex.slice(2) : hex;
    return Buffer.from(cleanHex, 'hex');
  }
}
