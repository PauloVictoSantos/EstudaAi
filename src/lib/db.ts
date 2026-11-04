import { Binary, MongoClient, ObjectId, type Db } from 'mongodb';
import type { Area } from './areas';
import type { Ability, ItemParams } from './tri';
import type { Card } from './fsrs';
import type { Streak } from './game';

export interface Exam {
  name: string;
  type: 'ENEM' | 'CONCURSO' | 'OUTRA';
  date: string; // AAAA-MM-DD
  sourceIds: ObjectId[];
  hasEssay: boolean;
  essayScores: (number | null)[] | null;
  abilities: Record<string, Ability>;
  plan: { weeks: number; days: number; week1: { f: string; q: string }[] } | null;
}
export interface GameState { xp: number; questions: number; reviews: number; essays: number; s: Streak; days: Record<string, 'study' | 'freeze'> }
export interface UserDoc { _id: ObjectId; email: string; passwordHash: string; createdAt: Date; exam: Exam | null; game: GameState }

export interface SourceDoc {
  _id: ObjectId; slug: string; title: string; kind: 'ENEM' | 'OUTRA';
  files: { name: string; sha256: string; pages: number; role: 'prova' | 'gabarito' }[];
  questionCount: number; keyedCount: number; skipped: { file: string; number: number; reason: string }[];
  status: 'PARSED' | 'NEEDS_KEY'; ingestedAt: Date;
}
export interface Explanation { wrong: string; right: string; why: string; next: string }
/** Imagem recortada do caderno (figura, alternativa-desenho ou a questão inteira). */
export interface ImageRef { img: string; w: number; h: number; alt?: string }
/** Conteúdo do enunciado na ordem do caderno. */
export type ContentBlock = { type: 'text'; text: string } | ({ type: 'figure' } & ImageRef);
export interface QuestionDoc {
  _id: ObjectId; sourceId: ObjectId; number: number; variant: string | null; area: Area; subject: string;
  /** texto puro (busca, IA); a exibição usa `content` */
  statement: string; content: ContentBlock[];
  options: { k: string; t: string; img?: ImageRef }[];
  /** recortes da questão inteira, como impressa no caderno */
  original: ImageRef[];
  answer: string | null; annulled: boolean; page: number; file: string;
  year: number | null; day: number | null; color: string | null; caderno: number | null;
  /** parâmetros oficiais do INEP (microdados ITENS_PROVA), na escala (0,1) */
  params?: ItemParams & { source: 'inep'; skill?: number };
  stats: { attempts: number; correct: number; choices?: Record<string, number> };
  explanations?: Record<string, Explanation>; updatedAt: Date;
}
export interface ImageDoc { _id: ObjectId; sourceId: ObjectId; questionId: ObjectId; kind: 'figure' | 'option' | 'original'; mime: string; data: Binary; w: number; h: number }
export interface AttemptDoc {
  _id: ObjectId; userId: ObjectId; sessionId: ObjectId | null; questionId: ObjectId; area: Area; subject: string;
  chosen: string; correct: boolean; timeMs: number; item: ItemParams; createdAt: Date; offline?: boolean;
}
export interface SessionDoc {
  _id: ObjectId; userId: ObjectId; mode: 'SMART' | 'SINGLE' | 'MIXED'; size: number; picked: string[];
  startAbilities: Record<string, Ability>; startedAt: Date; endedAt: Date | null;
}
export interface CardDoc { _id: ObjectId; userId: ObjectId; questionId: ObjectId; chosen: string; card: Card; createdAt: Date }
export interface EssayDoc {
  _id: ObjectId; userId: ObjectId; themeTitle: string; mode: string; text: string;
  comps: Record<'c1' | 'c2' | 'c3' | 'c4' | 'c5', number>; total: number; words: number; createdAt: Date;
}

const g = globalThis as unknown as { _mongo?: Promise<MongoClient>; _indexes?: Promise<unknown> };

export async function db(): Promise<Db> {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI não definido (veja .env.example)');
  g._mongo ??= new MongoClient(uri, { serverSelectionTimeoutMS: 5000 }).connect();
  let client: MongoClient;
  try { client = await g._mongo; } catch (e) {
    // não guarda a falha: a próxima requisição tenta de novo (ex.: o Mongo subiu depois do app)
    g._mongo = undefined; g._indexes = undefined;
    throw new Error(`Não foi possível conectar ao MongoDB em ${uri.replace(/\/\/[^@]*@/, '//***@')}. Ele está rodando? Use "npm run db" para subir um local. (${e instanceof Error ? e.message : e})`);
  }
  const d = client.db(process.env.MONGODB_DB || 'estudaai');
  g._indexes ??= ensureIndexes(d);
  await g._indexes;
  return d;
}

export async function closeDb() { if (g._mongo) { (await g._mongo).close(); g._mongo = undefined; g._indexes = undefined; } }

export async function cols() {
  const d = await db();
  return {
    users: d.collection<UserDoc>('users'),
    sources: d.collection<SourceDoc>('sources'),
    questions: d.collection<QuestionDoc>('questions'),
    attempts: d.collection<AttemptDoc>('attempts'),
    sessions: d.collection<SessionDoc>('sessions'),
    cards: d.collection<CardDoc>('cards'),
    essays: d.collection<EssayDoc>('essays'),
    images: d.collection<ImageDoc>('images'),
  };
}

async function ensureIndexes(d: Db) {
  await Promise.all([
    d.collection('users').createIndex({ email: 1 }, { unique: true }),
    d.collection('sources').createIndex({ slug: 1 }, { unique: true }),
    d.collection('questions').createIndex({ sourceId: 1, number: 1, variant: 1 }, { unique: true }),
    d.collection('questions').createIndex({ sourceId: 1, area: 1, subject: 1 }),
    d.collection('attempts').createIndex({ userId: 1, createdAt: -1 }),
    d.collection('attempts').createIndex({ userId: 1, questionId: 1 }),
    d.collection('cards').createIndex({ userId: 1, questionId: 1 }, { unique: true }),
    d.collection('essays').createIndex({ userId: 1, createdAt: -1 }),
    d.collection('images').createIndex({ questionId: 1 }),
    d.collection('images').createIndex({ sourceId: 1 }),
  ]);
}

export const oid = (s: string) => (ObjectId.isValid(s) ? new ObjectId(s) : null);
export { Binary, ObjectId };
