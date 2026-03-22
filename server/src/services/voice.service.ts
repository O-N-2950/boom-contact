// server/src/services/voice.service.ts
// Transcription vocale via OpenAI Whisper
// 99 langues supportées, détection automatique, aucune config côté utilisateur

import { logger } from '../logger.js';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { createReadStream } from 'fs';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const WHISPER_URL = 'https://api.openai.com/v1/audio/transcriptions';

export interface TranscriptionResult {
  text: string;
  language: string;    // langue détectée (code ISO)
  duration: number;    // durée en secondes
  confidence?: number; // 0-1 si disponible
}

/**
 * Transcrit un fichier audio via OpenAI Whisper
 * @param audioBase64 - Audio encodé en base64 (WebM/MP4/MP3/WAV)
 * @param mimeType    - Type MIME de l'audio
 * @param hintLang    - Langue optionnelle pour améliorer la précision (ex: "fr", "de")
 */
export async function transcribeAudio(
  audioBase64: string,
  mimeType: string = 'audio/webm',
  hintLang?: string
): Promise<TranscriptionResult> {

  if (!OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY non configurée — transcription vocale indisponible');
  }

  // Sauvegarder l'audio dans un fichier temporaire
  const ext = mimeType.includes('webm') ? 'webm'
    : mimeType.includes('mp4') ? 'mp4'
    : mimeType.includes('wav') ? 'wav'
    : mimeType.includes('ogg') ? 'ogg'
    : 'webm';

  const tmpFile = path.join(os.tmpdir(), `boom_voice_${Date.now()}.${ext}`);

  try {
    // Écrire le fichier audio
    fs.writeFileSync(tmpFile, Buffer.from(audioBase64, 'base64'));

    const fileSizeKB = fs.statSync(tmpFile).size / 1024;
    logger.info('Voice transcription started', { fileSizeKB: Math.round(fileSizeKB), mimeType, hintLang });

    // Construire le FormData pour Whisper
    const { default: FormData } = await import('form-data');
    const form = new FormData();
    form.append('file', createReadStream(tmpFile), `audio.${ext}`);
    form.append('model', 'whisper-1');
    form.append('response_format', 'verbose_json'); // Pour obtenir la langue détectée
    if (hintLang) {
      form.append('language', hintLang); // Optionnel — améliore précision si connue
    }

    // Appel API Whisper
    const https = await import('https');
    const result = await new Promise<any>((resolve, reject) => {
      const headers = {
        ...form.getHeaders(),
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      };

      const options = {
        hostname: 'api.openai.com',
        path: '/v1/audio/transcriptions',
        method: 'POST',
        headers,
      };

      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            if (res.statusCode && res.statusCode >= 400) {
              reject(new Error(`Whisper API error ${res.statusCode}: ${parsed.error?.message || data}`));
            } else {
              resolve(parsed);
            }
          } catch {
            reject(new Error(`Failed to parse Whisper response: ${data}`));
          }
        });
      });

      req.on('error', reject);
      form.pipe(req);
    });

    logger.info('Voice transcription success', {
      language: result.language,
      duration: result.duration,
      textLength: result.text?.length,
    });

    return {
      text: result.text || '',
      language: result.language || 'unknown',
      duration: result.duration || 0,
    };

  } finally {
    // Nettoyer le fichier temporaire
    try { fs.unlinkSync(tmpFile); } catch { /* ignore */ }
  }
}
