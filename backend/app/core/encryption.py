import base64
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.backends import default_backend
import os
from typing import Tuple

from app.core.config import settings


class EncryptionService:
    """
    AES-GCM encryption service for encrypting document chunks at rest.
    """
    
    def __init__(self):
        # Decode the base64-encoded key from settings
        self.key = base64.b64decode(settings.ENCRYPTION_KEY)
        if len(self.key) != 32:
            raise ValueError("Encryption key must be 32 bytes (256 bits)")
        self.aesgcm = AESGCM(self.key)
    
    def encrypt(self, plaintext: str) -> str:
        """
        Encrypt plaintext using AES-GCM.
        
        Returns: base64-encoded string containing nonce + ciphertext + tag
        """
        if not plaintext:
            return ""
        
        # Generate a random nonce (12 bytes for GCM)
        nonce = os.urandom(12)
        
        # Encrypt the plaintext
        plaintext_bytes = plaintext.encode('utf-8')
        ciphertext = self.aesgcm.encrypt(nonce, plaintext_bytes, None)
        
        # Combine nonce + ciphertext and encode as base64
        encrypted_data = nonce + ciphertext
        return base64.b64encode(encrypted_data).decode('utf-8')
    
    def decrypt(self, ciphertext_b64: str) -> str:
        """
        Decrypt ciphertext using AES-GCM.
        
        Args:
            ciphertext_b64: base64-encoded string containing nonce + ciphertext + tag
        
        Returns: decrypted plaintext string
        """
        if not ciphertext_b64:
            return ""
        
        try:
            # Decode from base64
            encrypted_data = base64.b64decode(ciphertext_b64)
            
            # Extract nonce (first 12 bytes) and ciphertext (rest)
            nonce = encrypted_data[:12]
            ciphertext = encrypted_data[12:]
            
            # Decrypt
            plaintext_bytes = self.aesgcm.decrypt(nonce, ciphertext, None)
            return plaintext_bytes.decode('utf-8')
        except Exception as e:
            raise ValueError(f"Decryption failed: {str(e)}")
    
    def encrypt_batch(self, plaintexts: list[str]) -> list[str]:
        """Encrypt multiple plaintexts."""
        return [self.encrypt(pt) for pt in plaintexts]
    
    def decrypt_batch(self, ciphertexts: list[str]) -> list[str]:
        """Decrypt multiple ciphertexts."""
        return [self.decrypt(ct) for ct in ciphertexts]


# Singleton instance
encryption_service = EncryptionService()
