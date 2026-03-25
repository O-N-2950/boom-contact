import Anthropic from '@anthropic-ai/sdk';
import { db } from '../db/index.js';
import { socialPosts } from '../db/schema.js';
import { eq, and, gte, count } from 'drizzle-orm';
import { logger } from '../logger.js';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const PLATFORMS = ['TikTok', 'Instagram', 'Facebook', 'LinkedIn'] as const;
const PILLARS   = ['A', 'B', 'C', 'D'] as const;

const PLATFORM_INSTRUCTIONS: Record<string, string> = {
  TikTok:    'Hook percutant dans les 3 premières secondes, 100-180 caractères, ton 18-35 ans, max 5 hashtags',
  Instagram: 'Caption engageante avec call-to-action final, 150-280 caractères, max 8 hashtags',
  Facebook:  'Post partageables dans groupes conducteurs/expats, ton chaleureux, 250-400 caractères, 4-6 hashtags',
  LinkedIn:  'B2B assureurs/flottes/polices/DRH, stats ROI concrètes, pro mais humain, 200-350 caractères, 3-5 hashtags pro',
};

const PILLAR_INSTRUCTIONS: Record<string, string> = {
  A: 'DOULEUR — scenario stress accident concret, frustration constat papier, situation absurde à l\'etranger',
  B: 'DEMO — montrer comment ca marche, etapes concretes, ce que voit l\'utilisateur',
  C: 'EDUCATION — ce que les gens savent pas sur les constats, droits apres accident, erreurs communes',
  D: 'PREUVE — stats reelles (150+ pays, 50 langues, 5 min, EUR 4.90), temoignage vraisemblable',
};

interface GeneratedPost {
  platform: string;
  pillar:   string;
  text:     string;
  hashtags: string[];
  staging:  string;
}

export async function generateDailyPosts(count = 4): Promise<number> {
  logger.info('[SocialGen] Démarrage génération quotidienne', { count });

  // Vérifie combien de posts pending il y a déjà
  const pending = await db.select({ c: count() })
    .from(socialPosts as any)
    .where(eq((socialPosts as any).status, 'pending'));
  const pendingCount = Number((pending[0] as any)?.c ?? 0);

  if (pendingCount >= 20) {
    logger.info('[SocialGen] Assez de posts en attente, skip', { pendingCount });
    return 0;
  }

  // Choisit 1 post par pilier (A/B/C/D) sur des plateformes variées
  const today = new Date().getDay(); // 0=dim … 6=sam
  const platformRotation = [
    ['TikTok', 'Instagram'],
    ['Facebook', 'LinkedIn'],
    ['TikTok', 'Facebook'],
    ['Instagram', 'LinkedIn'],
    ['TikTok', 'Instagram'],
    ['Facebook', 'LinkedIn'],
    ['TikTok', 'LinkedIn'],
  ][today];

  const jobs: { platform: string; pillar: string }[] = [];
  for (let i = 0; i < count; i++) {
    jobs.push({
      platform: platformRotation[i % platformRotation.length],
      pillar:   PILLARS[i % PILLARS.length],
    });
  }

  let generated = 0;

  for (const job of jobs) {
    try {
      const post = await generateOnePost(job.platform, job.pillar);
      await (db as any).insert(socialPosts).values({
        platform:     post.platform,
        pillar:       post.pillar,
        text:         post.text,
        hashtags:     JSON.stringify(post.hashtags),
        staging:      post.staging,
        status:       'pending',
        generatedBy:  'claude',
      });
      generated++;
      logger.info('[SocialGen] Post créé', { platform: post.platform, pillar: post.pillar });
    } catch (err) {
      logger.error('[SocialGen] Erreur génération', { job, error: String(err) });
    }
  }

  logger.info('[SocialGen] Génération terminée', { generated });
  return generated;
}

async function generateOnePost(platform: string, pillar: string): Promise<GeneratedPost> {
  const prompt = `Tu es community manager pour boom.contact (constat amiable numerique, PEP's Swiss SA, Groupe NEUKOMM).
Produit : OCR 50 langues, QR code, double signature, PDF certifie, 150+ pays, EUR/CHF 4.90, sans installation.
Ton : tutoiement, direct, parfois humour. BANNI : revolutionnaire, innovant, game-changer.

Plateforme : ${platform}
Instructions plateforme : ${PLATFORM_INSTRUCTIONS[platform]}

Pilier : ${pillar}
Instructions pilier : ${PILLAR_INSTRUCTIONS[pillar]}

Genere UN SEUL post. JSON UNIQUEMENT :
{"platform":"${platform}","pillar":"${pillar}","text":"...","hashtags":["..."],"staging":"note mise en scene courte"}`;

  const msg = await client.messages.create({
    model:      'claude-sonnet-4-20250514',
    max_tokens: 600,
    messages:   [{ role: 'user', content: prompt }],
  });

  let text = (msg.content[0] as any).text as string;
  if (text.includes('```json')) text = text.split('```json')[1].split('```')[0].trim();
  else if (text.includes('```')) text = text.split('```')[1].split('```')[0].trim();

  return JSON.parse(text) as GeneratedPost;
}

export async function getPendingPosts(platform?: string) {
  const where = platform
    ? and(
        eq((socialPosts as any).status, 'pending'),
        eq((socialPosts as any).platform, platform)
      )
    : eq((socialPosts as any).status, 'pending');

  return (db as any).select().from(socialPosts).where(where).orderBy((socialPosts as any).createdAt);
}

export async function approvePost(id: number) {
  return (db as any).update(socialPosts)
    .set({ status: 'approved' })
    .where(eq((socialPosts as any).id, id));
}

export async function markPosted(id: number) {
  return (db as any).update(socialPosts)
    .set({ status: 'posted', postedAt: new Date() })
    .where(eq((socialPosts as any).id, id));
}

export async function archivePost(id: number) {
  return (db as any).update(socialPosts)
    .set({ status: 'archived' })
    .where(eq((socialPosts as any).id, id));
}

// Seed initial : importe les 60 posts de la session 14
export async function seedInitialPosts(posts: GeneratedPost[]) {
  let inserted = 0;
  for (const p of posts) {
    try {
      await (db as any).insert(socialPosts).values({
        platform:    p.platform,
        pillar:      p.pillar,
        text:        p.text,
        hashtags:    JSON.stringify(p.hashtags),
        staging:     p.staging,
        status:      'pending',
        generatedBy: 'session14',
      });
      inserted++;
    } catch {}
  }
  logger.info('[SocialGen] Seed OK', { inserted });
  return inserted;
}

