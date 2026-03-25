/**
 * social.service.ts — Publication automatique réseaux sociaux boom.contact
 *
 * Plateformes supportées :
 *   • Facebook  — Graph API v21 (Page Access Token)
 *   • Instagram — Meta Graph API (IG Business Account lié à la Page FB)
 *   • TikTok    — Content Posting API v2 (image + texte)
 *   • LinkedIn  — UGC API v2 (Company Page PEP's Swiss SA)
 *
 * Variables Railway nécessaires :
 *   FB_PAGE_ID              — ID numérique de la Page Facebook Boom.contact
 *   FB_PAGE_ACCESS_TOKEN    — Long-lived Page Access Token (jamais expirant)
 *   IG_USER_ID              — Instagram Business Account ID (lié à la Page FB)
 *   TIKTOK_ACCESS_TOKEN     — Token Content Posting API TikTok
 *   LINKEDIN_ORG_ID         — ID de la Company Page PEP's Swiss SA
 *   LINKEDIN_ACCESS_TOKEN   — Token OAuth w_organization_social (valable 60j)
 *   SOCIAL_SECRET           — Clé pour sécuriser l'endpoint /social/auto-publish
 */

import Anthropic from '@anthropic-ai/sdk';
import { db } from '../db/index.js';
import { schema } from '../db/schema.js';
import { eq, and, gte, desc, sql } from 'drizzle-orm';
import { logger } from '../logger.js';

const claude = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const FB_API   = `https://graph.facebook.com/v21.0`;
const TT_API   = `https://open.tiktokapis.com/v2`;
const LI_API   = `https://api.linkedin.com/v2`;

// ─── Types ────────────────────────────────────────────────────

export interface PublishResult {
  success: boolean;
  postId?: string;
  error?: string;
}

interface PostPayload {
  text: string;
  hashtags: string[];
  pillar: 'A' | 'B' | 'C' | 'D';
}

// ─── Angles de génération Claude ──────────────────────────────

const ANGLES = [
  // Douleur / stress — pilier A
  { pillar: 'A', angle: 'accident à l\'étranger sans parler la langue, stress total' },
  { pillar: 'A', angle: 'l\'autre conducteur qui veut rien signer, dispute au bord de la route' },
  { pillar: 'A', angle: 'constat papier mal rempli = assureur qui refuse d\'indemniser' },
  { pillar: 'A', angle: 'accident la nuit, pluie, téléphone déchargé, impossible de trouver les formulaires' },
  { pillar: 'A', angle: 'accident en vacances : location de voiture + assurance étrangère + panique' },
  // Démo — pilier B
  { pillar: 'B', angle: 'comment scanner un permis de circulation en 10 secondes' },
  { pillar: 'B', angle: 'le QR code : deux téléphones, un seul constat partagé en temps réel' },
  { pillar: 'B', angle: 'de l\'accident au PDF certifié en 5 minutes, les 5 étapes' },
  { pillar: 'B', angle: 'comment ça marche pour un piéton ou cycliste (mode solo)' },
  { pillar: 'B', angle: 'OCR 50 langues : permis chinois, russe, arabe, ça marche aussi' },
  // Éducation — pilier C
  { pillar: 'C', angle: '3 erreurs classiques sur un constat papier qui coûtent cher' },
  { pillar: 'C', angle: 'ce que tu dois TOUJOURS photographier avant de signer un constat' },
  { pillar: 'C', angle: 'accident sans blessé : tu es obligé d\'appeler la police ?' },
  { pillar: 'C', angle: 'constat européen : il est valable dans combien de pays exactement ?' },
  { pillar: 'C', angle: 'le croquis du constat : pourquoi il est décisif et comment bien le faire' },
  // Preuve — pilier D
  { pillar: 'D', angle: '1,3 million de constats par an en Europe : le marché du constat papier encore en 2026' },
  { pillar: 'D', angle: 'boom.contact : valable dans 150+ pays, lancé en Suisse par PEP\'s Swiss SA' },
  { pillar: 'D', angle: 'à partir de CHF/EUR 4.90 : moins cher qu\'un café pour être tranquille après un accident' },
  { pillar: 'D', angle: 'OCR Claude Vision, QR code temps réel, PDF certifié : la stack derrière boom.contact' },
  { pillar: 'D', angle: '3 crédits = 12.90 CHF : partageables par WhatsApp avec ta famille' },
];

const PLATFORM_RULES: Record<string, string> = {
  TikTok:    'Hook percutant OBLIGATOIRE dans les 5 premiers mots. Max 150 caractères. Ton 18-35 ans ultra direct. Max 4 hashtags. Pas de phrase longue.',
  Instagram: 'Caption storytelling. Appel à l\'action à la fin. Max 200 caractères + hashtags sur une ligne séparée. Max 7 hashtags.',
  Facebook:  'Post conversationnel, partageables. 200-350 caractères. Inclus le lien www.boom.contact. Max 5 hashtags discrets à la fin.',
  LinkedIn:  'Angle B2B : DRH, assureurs, gestionnaires de flottes. Stats ou chiffres concrets. 200-300 caractères pro. Max 4 hashtags pro.',
};

// ─── Générateur Claude ─────────────────────────────────────────

export async function generatePostContent(platform: string, pillar?: string): Promise<PostPayload> {
  // Sélectionner un angle non récemment utilisé
  const recentPosts = await db
    .select({ text: schema.socialPosts.text })
    .from(schema.socialPosts)
    .where(
      and(
        eq(schema.socialPosts.platform, platform),
        gte(schema.socialPosts.createdAt, new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))
      )
    )
    .orderBy(desc(schema.socialPosts.createdAt))
    .limit(20);

  const recentTexts = recentPosts.map(p => p.text.slice(0, 50));

  // Filtre par pilier si spécifié, sinon rotation équilibrée
  const filtered = pillar ? ANGLES.filter(a => a.pillar === pillar) : ANGLES;
  const available = filtered.filter(a =>
    !recentTexts.some(rt => rt.toLowerCase().includes(a.angle.split(' ').slice(0, 3).join(' ')))
  );
  const pool = available.length > 0 ? available : filtered;
  const chosen = pool[Math.floor(Math.random() * pool.length)];

  const prompt = `Tu es community manager pour boom.contact — application de constat amiable numérique par PEP's Swiss SA (PEP's Swiss SA).

PRODUIT :
- Constat amiable numérique, valable 150+ pays
- OCR 50 langues (scanne permis/carte verte automatiquement)
- QR code : les deux conducteurs sur un constat partagé en temps réel
- Double signature numérique + PDF certifié instantané
- À partir de CHF/EUR 4.90 — sans installation — www.boom.contact
- Langues : FR, DE, IT, EN

PLATEFORME : ${platform}
RÈGLES ${platform.toUpperCase()} : ${PLATFORM_RULES[platform]}
ANGLE DU POST : ${chosen.angle}

TON : tutoiement, direct, humain. INTERDIT : révolutionnaire, innovant, game-changer, em-dash (—).
Varie la longueur des phrases. Opinions concrètes, pas aseptiques.

Réponds en JSON strict UNIQUEMENT :
{"text":"...","hashtags":["hashtag1","hashtag2"]}

Hashtags SANS # dans la valeur. Texte sans hashtags (ils sont séparés).`;

  const response = await claude.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 400,
    messages: [{ role: 'user', content: prompt }],
  });

  const raw = (response.content[0] as { text: string }).text.trim();
  let parsed: { text: string; hashtags: string[] };

  try {
    const cleaned = raw.replace(/```json|```/g, '').trim();
    parsed = JSON.parse(cleaned);
  } catch {
    logger.warn('[SOCIAL] JSON parse fail, fallback', { raw: raw.slice(0, 100) });
    parsed = {
      text: `Accident à l'étranger ? boom.contact — constat en 5 min, 50 langues, 150+ pays. www.boom.contact`,
      hashtags: ['constat', 'accident', 'assurance', 'boomcontact'],
    };
  }

  return { text: parsed.text, hashtags: parsed.hashtags || [], pillar: chosen.pillar as 'A' | 'B' | 'C' | 'D' };
}

// ─── Facebook ──────────────────────────────────────────────────

export async function publishFacebook(payload: PostPayload): Promise<PublishResult> {
  const token  = process.env.FB_PAGE_ACCESS_TOKEN;
  const pageId = process.env.FB_PAGE_ID;

  if (!token || !pageId) {
    return { success: false, error: 'FB_PAGE_ACCESS_TOKEN ou FB_PAGE_ID manquant' };
  }

  const content = `${payload.text}\n\n${payload.hashtags.map(h => `#${h}`).join(' ')}`;

  try {
    const res = await fetch(`${FB_API}/${pageId}/feed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: content, access_token: token }),
    });
    const data: any = await res.json();

    if (data.id) {
      logger.info('[SOCIAL] ✅ Facebook publié', { postId: data.id });
      return { success: true, postId: data.id };
    }
    const err = data.error?.message || JSON.stringify(data);
    logger.error('[SOCIAL] ❌ Facebook', { error: err });
    return { success: false, error: err };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

// ─── Instagram (via Meta Graph API) ───────────────────────────

export async function publishInstagram(payload: PostPayload): Promise<PublishResult> {
  const token  = process.env.FB_PAGE_ACCESS_TOKEN; // Même token que FB
  const igId   = process.env.IG_USER_ID;

  if (!token || !igId) {
    return { success: false, error: 'IG_USER_ID ou FB_PAGE_ACCESS_TOKEN manquant' };
  }

  const caption = `${payload.text}\n.\n.\n${payload.hashtags.map(h => `#${h}`).join(' ')}`;

  try {
    // Étape 1 : créer le container (post texte seul = image requise par Meta)
    // On utilise une image OG de boom.contact hébergée sur le domaine
    const imageUrl = 'https://www.boom.contact/og-image.png';

    const containerRes = await fetch(`${FB_API}/${igId}/media`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image_url: imageUrl,
        caption,
        access_token: token,
      }),
    });
    const container: any = await containerRes.json();

    if (!container.id) {
      const err = container.error?.message || JSON.stringify(container);
      logger.error('[SOCIAL] ❌ Instagram container', { error: err });
      return { success: false, error: `Container: ${err}` };
    }

    // Étape 2 : publier le container
    const publishRes = await fetch(`${FB_API}/${igId}/media_publish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ creation_id: container.id, access_token: token }),
    });
    const published: any = await publishRes.json();

    if (published.id) {
      logger.info('[SOCIAL] ✅ Instagram publié', { postId: published.id });
      return { success: true, postId: published.id };
    }
    const err = published.error?.message || JSON.stringify(published);
    logger.error('[SOCIAL] ❌ Instagram publish', { error: err });
    return { success: false, error: err };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

// ─── TikTok (Content Posting API — image + texte) ─────────────

export async function publishTikTok(payload: PostPayload): Promise<PublishResult> {
  const token = process.env.TIKTOK_ACCESS_TOKEN;

  if (!token) {
    return { success: false, error: 'TIKTOK_ACCESS_TOKEN manquant' };
  }

  // TikTok Content Posting API ne supporte que les vidéos en direct post
  // Pour les photos : on utilise le Photo Post endpoint (disponible pour certains comptes)
  const caption = `${payload.text} ${payload.hashtags.map(h => `#${h}`).join(' ')}`.slice(0, 2200);

  try {
    // Initialiser le post photo
    const initRes = await fetch(`${TT_API}/post/publish/content/init/`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json; charset=UTF-8',
      },
      body: JSON.stringify({
        post_info: {
          title: caption,
          privacy_level: 'PUBLIC_TO_EVERYONE',
          disable_duet: false,
          disable_comment: false,
          disable_stitch: false,
        },
        source_info: {
          source: 'PULL_FROM_URL',
          photo_images: ['https://www.boom.contact/og-image.png'],
          photo_cover_index: 0,
        },
        post_mode: 'DIRECT_POST',
        media_type: 'PHOTO',
      }),
    });

    const data: any = await initRes.json();

    if (data.data?.publish_id) {
      logger.info('[SOCIAL] ✅ TikTok publié', { publishId: data.data.publish_id });
      return { success: true, postId: data.data.publish_id };
    }
    const err = data.error?.message || JSON.stringify(data);
    logger.error('[SOCIAL] ❌ TikTok', { error: err });
    return { success: false, error: err };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

// ─── LinkedIn (UGC API — Company Page) ────────────────────────

export async function publishLinkedIn(payload: PostPayload): Promise<PublishResult> {
  const token = process.env.LINKEDIN_ACCESS_TOKEN;
  const orgId = process.env.LINKEDIN_ORG_ID;

  if (!token || !orgId) {
    return { success: false, error: 'LINKEDIN_ACCESS_TOKEN ou LINKEDIN_ORG_ID manquant' };
  }

  const content = `${payload.text}\n\n${payload.hashtags.map(h => `#${h}`).join(' ')}`;

  try {
    const res = await fetch(`${LI_API}/ugcPosts`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'X-Restli-Protocol-Version': '2.0.0',
        'LinkedIn-Version': '202401',
      },
      body: JSON.stringify({
        author: `urn:li:organization:${orgId}`,
        lifecycleState: 'PUBLISHED',
        specificContent: {
          'com.linkedin.ugc.ShareContent': {
            shareCommentary: { text: content },
            shareMediaCategory: 'NONE',
          },
        },
        visibility: {
          'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC',
        },
      }),
    });

    const postId = res.headers.get('x-restli-id');
    const data: any = res.ok ? {} : await res.json();

    if (res.ok && postId) {
      logger.info('[SOCIAL] ✅ LinkedIn publié', { postId });
      return { success: true, postId };
    }
    const err = data.message || data.serviceErrorCode || `HTTP ${res.status}`;
    logger.error('[SOCIAL] ❌ LinkedIn', { error: err, status: res.status });
    return { success: false, error: err };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

// ─── Publication multi-plateformes ────────────────────────────

export async function publishToAllPlatforms(): Promise<Record<string, PublishResult>> {
  logger.info('[SOCIAL] 🚀 Démarrage publication quotidienne');

  const results: Record<string, PublishResult> = {};
  const platforms = ['Facebook', 'Instagram', 'TikTok', 'LinkedIn'] as const;

  for (const platform of platforms) {
    try {
      // Générer un contenu adapté à chaque plateforme
      const payload = await generatePostContent(platform);

      let result: PublishResult;
      if (platform === 'Facebook')  result = await publishFacebook(payload);
      else if (platform === 'Instagram') result = await publishInstagram(payload);
      else if (platform === 'TikTok')    result = await publishTikTok(payload);
      else                               result = await publishLinkedIn(payload);

      results[platform] = result;

      // Sauvegarder en DB
      await db.insert(schema.socialPosts).values({
        platform,
        pillar: payload.pillar,
        text: payload.text,
        hashtags: JSON.stringify(payload.hashtags),
        status: result.success ? 'posted' : 'failed',
        postedAt: result.success ? new Date() : null,
        generatedBy: 'claude',
      });

      logger.info(`[SOCIAL] ${result.success ? '✅' : '❌'} ${platform}`, {
        postId: result.postId,
        error: result.error,
      });
    } catch (e: any) {
      logger.error(`[SOCIAL] ❌ Exception ${platform}`, { error: e.message });
      results[platform] = { success: false, error: e.message };
    }
  }

  const ok = Object.values(results).filter(r => r.success).length;
  logger.info(`[SOCIAL] Publication terminée: ${ok}/${platforms.length} plateformes OK`);
  return results;
}

// ─── Vérification : déjà publié aujourd'hui ? ─────────────────

export async function hasPostedToday(platform: string): Promise<boolean> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const existing = await db
    .select({ id: schema.socialPosts.id })
    .from(schema.socialPosts)
    .where(
      and(
        eq(schema.socialPosts.platform, platform),
        eq(schema.socialPosts.status, 'posted'),
        gte(schema.socialPosts.postedAt, today)
      )
    )
    .limit(1);

  return existing.length > 0;
}
