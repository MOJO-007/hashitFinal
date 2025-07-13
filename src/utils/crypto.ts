// src/utils/crypto.ts

async function getKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
    const enc = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(password), { name: 'PBKDF2' }, false, ['deriveKey']);
    return crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' }, keyMaterial, { name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
}

export async function encryptFile(file: File, password: string): Promise<Blob> {
    const fileBuffer = await file.arrayBuffer();
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const key = await getKey(password, salt);
    const encryptedContent = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, fileBuffer);
    const finalBuffer = new Uint8Array(salt.length + iv.length + encryptedContent.byteLength);
    finalBuffer.set(salt, 0);
    finalBuffer.set(iv, salt.length);
    finalBuffer.set(new Uint8Array(encryptedContent), salt.length + iv.length);
    return new Blob([finalBuffer]);
}

export async function decryptFile(encryptedData: ArrayBuffer, password: string): Promise<Blob> {
    try {
        const salt = new Uint8Array(encryptedData.slice(0, 16));
        const iv = new Uint8Array(encryptedData.slice(16, 28));
        const data = new Uint8Array(encryptedData.slice(28));
        const key = await getKey(password, salt);
        const decryptedContent = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, data);
        return new Blob([decryptedContent]);
    } catch (error) {
        throw new Error("Decryption failed. The provided password may be incorrect.");
    }
}

/**
 * [NEW] Hashes a file using SHA-256.
 * @param file The file to hash.
 * @returns A promise that resolves to the SHA-256 hash as a hex string.
 */
export async function sha256(file: File): Promise<string> {
    const fileBuffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', fileBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    // Prepend '0x' to make it a valid hex string for ethers.js
    const hashHex = '0x' + hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
}