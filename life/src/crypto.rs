use aes_gcm::aead::{Aead, Generate, KeyInit, Payload};
use aes_gcm::{Aes256Gcm, Nonce};
use thiserror::Error;

#[derive(Clone)]
pub struct TokenCipher(Aes256Gcm);

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct EncryptedSecret {
    pub ciphertext: Vec<u8>,
    pub nonce: Vec<u8>,
}

#[derive(Debug, Error)]
pub enum CryptoError {
    #[error("invalid AES-256-GCM key")]
    InvalidKey,
    #[error("secret encryption failed")]
    Encryption,
    #[error("secret decryption failed")]
    Decryption,
    #[error("invalid AES-256-GCM nonce")]
    InvalidNonce,
    #[error("decrypted secret is not UTF-8")]
    InvalidUtf8(#[from] std::string::FromUtf8Error),
}

impl TokenCipher {
    pub fn new(key: &[u8; 32]) -> Result<Self, CryptoError> {
        Aes256Gcm::new_from_slice(key)
            .map(Self)
            .map_err(|_| CryptoError::InvalidKey)
    }

    pub fn encrypt(
        &self,
        plaintext: &str,
        associated_data: &[u8],
    ) -> Result<EncryptedSecret, CryptoError> {
        let nonce = Nonce::generate();
        let ciphertext = self
            .0
            .encrypt(
                &nonce,
                Payload {
                    msg: plaintext.as_bytes(),
                    aad: associated_data,
                },
            )
            .map_err(|_| CryptoError::Encryption)?;
        Ok(EncryptedSecret {
            ciphertext,
            nonce: nonce.to_vec(),
        })
    }

    pub fn decrypt(
        &self,
        encrypted: &EncryptedSecret,
        associated_data: &[u8],
    ) -> Result<String, CryptoError> {
        let nonce =
            Nonce::try_from(encrypted.nonce.as_slice()).map_err(|_| CryptoError::InvalidNonce)?;
        let plaintext = self
            .0
            .decrypt(
                &nonce,
                Payload {
                    msg: &encrypted.ciphertext,
                    aad: associated_data,
                },
            )
            .map_err(|_| CryptoError::Decryption)?;
        String::from_utf8(plaintext).map_err(CryptoError::from)
    }
}

#[cfg(test)]
mod tests {
    use super::TokenCipher;

    #[test]
    fn cipher_should_round_trip_with_matching_associated_data() {
        let cipher = TokenCipher::new(&[7_u8; 32]).unwrap();
        let encrypted = cipher.encrypt("refresh-token", b"connector-id").unwrap();

        let decrypted = cipher.decrypt(&encrypted, b"connector-id").unwrap();

        assert_eq!(decrypted, "refresh-token");
    }

    #[test]
    fn cipher_should_reject_different_associated_data() {
        let cipher = TokenCipher::new(&[7_u8; 32]).unwrap();
        let encrypted = cipher.encrypt("refresh-token", b"connector-id").unwrap();

        let result = cipher.decrypt(&encrypted, b"another-connector");

        assert!(result.is_err());
    }
}
