// npm run ingest            → lê ./provas e grava questões (texto + imagens) no MongoDB
// npm run ingest -- --force → reprocessa mesmo as provas que não mudaram
// npm run ingest:dry        → só mostra o que foi encontrado, sem tocar no banco
//   --sem-original          → não guarda o recorte "como no caderno" (economiza espaço)
//
// Coloque os PDFs em provas/ com qualquer nome: cada arquivo é identificado pelo conteúdo
// (prova ou gabarito, ano, dia, caderno, cor). ITENS_PROVA_AAAA.csv dos microdados do INEP
// adiciona os parâmetros oficiais da TRI. Nenhum PDF é copiado: guardamos o texto e os recortes.
import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { analyzePdf, extractPdfText } from '../src/lib/pdf/extract';
import { answerFor, parseAnswerKey, parseLayout, type AnswerKey, type Block, type ParsedQuestion } from '../src/lib/pdf/parse';
import { classifySubject } from '../src/lib/pdf/subjects';
import { groupFiles, identify, type FileEntry, type Group } from '../src/lib/pdf/identify';
import { findOfficial, parseItensProva, type OfficialItem } from '../src/lib/pdf/microdados';
import { ocrQuestions } from '../src/lib/pdf/ocr';
import { hasGemini } from '../src/lib/gemini';

const args = new Set(process.argv.slice(2));
const DRY = args.has('--dry'), FORCE = args.has('--force'), NO_ORIGINAL = args.has('--sem-original');
const DIR = path.resolve(process.env.PROVAS_DIR || './provas');
const log = (s: string) => console.log(s);

async function listFiles(dir: string): Promise<string[]> {
  const out: string[] = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...(await listFiles(full)));
    else if (/\.(pdf|txt|csv)$/i.test(e.name) && !/^leia-me/i.test(e.name)) out.push(full);
  }
  return out;
}

const sha = (buf: Uint8Array) => createHash('sha256').update(buf).digest('hex');

async function main() {
  const files = await listFiles(DIR).catch(() => { throw new Error(`Pasta ${DIR} não encontrada. Crie-a e coloque os PDFs dentro.`); });
  if (!files.length) { log(`Nenhum arquivo em ${DIR}. Veja provas/LEIA-ME.md.`); return; }

  // 1) identificar cada arquivo
  const official: OfficialItem[] = [];
  const entries: (FileEntry & { full: string; sha: string; pages: number })[] = [];
  const txtKeys = new Map<string, string>();
  for (const f of files) {
    const bytes = new Uint8Array(await readFile(f));
    const name = path.basename(f);
    if (/\.csv$/i.test(f)) {
      const year = +(name.match(/(20\d\d)/)?.[1] ?? 0);
      if (/ITENS_PROVA/i.test(name) && year) { const items = parseItensProva(bytes, year); official.push(...items); log(`◆ ${name}: parâmetros oficiais de ${items.length} itens (${year})`); }
      continue;
    }
    if (/\.txt$/i.test(f)) { txtKeys.set(name.replace(/\.txt$/i, '').replace(/[\s_.-]*(gabarito|gab|gb)[\s_.-]*/gi, ' ').trim().toLowerCase(), new TextDecoder().decode(bytes)); continue; }
    const { pages, pageCount } = await extractPdfText(bytes);
    const id = identify(name, pages.slice(0, 2).join('\n'), pageCount);
    // prova não-ENEM dentro de subpasta: a subpasta dá nome à prova
    const folder = path.relative(DIR, path.dirname(f));
    entries.push({ name: folder && !id.enem ? path.join(folder, name) : name, id, full: f, sha: sha(bytes), pages: pageCount });
  }
  const { groups, ignored } = groupFiles(entries);
  log('\nArquivos identificados:');
  for (const g of groups) log(`  ${g.title}: ${g.files.map(f => `${f.name} [${f.id.kind}${f.id.day ? ` ${f.id.day}º dia` : ''}${f.id.color ? ` ${f.id.color.toLowerCase()}` : ''}]`).join(', ')}`);
  for (const i of ignored) log(`  – ${i.name}: ${i.reason}`);

  const c = DRY ? null : await (await import('../src/lib/db')).cols();
  for (const g of groups) await ingestGroup(g, entries, official, txtKeys, c);
  if (c) await (await import('../src/lib/db')).closeDb();
}

type Cols = Awaited<ReturnType<typeof import('../src/lib/db')['cols']>>;

async function ingestGroup(g: Group, entries: { name: string; full: string; sha: string; pages: number }[], official: OfficialItem[], txtKeys: Map<string, string>, c: Cols | null) {
  const files = g.files.map(f => ({ ...f, ...entries.find(e => e.name === f.name)! }));
  const existing = c ? await c.sources.findOne({ slug: g.key }) : null;
  const same = existing && existing.files.length === files.length && files.every(fi => existing.files.some(x => x.sha256 === fi.sha));
  if (same && !FORCE) { log(`\n= ${g.title}: sem mudanças (${existing.questionCount} questões). Use --force para reprocessar.`); return; }
  log(`\n▸ ${g.title}`);

  const key: AnswerKey = new Map();
  const merge = (k: AnswerKey) => { for (const [n, v] of k) if (!key.has(n)) key.set(n, v); };
  for (const f of files.filter(f => f.id.kind === 'gabarito')) {
    const { pages } = await extractPdfText(new Uint8Array(await readFile(f.full)));
    const k = parseAnswerKey(pages.join('\n')); merge(k);
    log(`  gabarito ${f.name}: ${k.size} respostas`);
  }
  const txt = txtKeys.get(g.title.toLowerCase()); if (txt) merge(parseAnswerKey(txt));

  type Q = ParsedQuestion & { file: string; day: number | null; color: string | null; caderno: number | null; crop: Awaited<ReturnType<typeof analyzePdf>>['crop'] };
  const parsed: Q[] = [];
  const skipped: { file: string; number: number; reason: string }[] = [];
  const opened: Awaited<ReturnType<typeof analyzePdf>>[] = [];
  for (const f of files.filter(f => f.id.kind === 'prova').sort((a, b) => (a.id.day ?? 0) - (b.id.day ?? 0))) {
    const t0 = Date.now();
    const a = await analyzePdf(new Uint8Array(await readFile(f.full)));
    opened.push(a);
    const garbled = a.pages.filter(p => p.garbled).length;
    // Sempre a leitura local: texto e recortes saem do próprio PDF (linhas ilegíveis viram imagem)
    const r = parseLayout(a.pages, { year: g.year, enem: g.enem });
    if (r.answerKeyText) merge(parseAnswerKey(r.answerKeyText));
    skipped.push(...r.skipped.map(s => ({ ...s, file: f.name })));
    let qs: ParsedQuestion[] = r.questions;
    if (garbled > a.pages.length * 0.3) {
      if (!hasGemini()) {
        log(`  ! ${f.name}: fonte sem mapa de caracteres em ${garbled} de ${a.pages.length} páginas. As questões aparecem como imagem do caderno;`);
        log(`    defina GEMINI_API_KEY para ter também o texto (busca e explicações).`);
      } else {
        // O Gemini lê as páginas e fornece só o texto; as imagens continuam sendo recortes exatos do PDF
        log(`  ${f.name}: fonte quebrada em ${garbled} páginas → lendo o texto com o Gemini…`);
        const ocr = await ocrQuestions(a.pages, n => a.pagePng(n, 2), log, g.year);
        for (const q of qs) {
          const o = ocr.find(x => x.number === q.number && x.variant === q.variant) ?? ocr.find(x => x.number === q.number);
          if (!o) continue;
          q.statement = o.statement;
          for (const op of q.options) { const t = o.options.find(x => x.k === op.k)?.t; if (t) { op.t = t; if (op.figure) op.figure.alt = t; } }
        }
        // questões que a leitura local não achou entram pela leitura do Gemini (figuras recortadas da página)
        qs = [...qs, ...ocr.filter(o => !qs.some(q => q.number === o.number && q.variant === o.variant))];
      }
    }
    for (const q of qs) {
      if (parsed.some(p => p.number === q.number && p.variant === q.variant)) { skipped.push({ file: f.name, number: q.number, reason: 'número repetido em outro caderno do mesmo grupo' }); continue; }
      parsed.push({ ...q, file: f.name, day: f.id.day, color: f.id.color, caderno: f.id.caderno, crop: a.crop });
    }
    log(`  caderno ${f.name}: ${a.pages.length} páginas, ${qs.length} questões, ${qs.reduce((n, q) => n + q.content.filter(b => b.type === 'figure').length + q.options.filter(o => o.figure).length, 0)} imagens (${((Date.now() - t0) / 1000).toFixed(0)} s)`);
  }

  const final = parsed.map(q => {
    const off = findOfficial(official, { ...q, year: g.year });
    const a = answerFor(key, q) ?? off?.answer ?? null;
    const annulled = a === 'ANULADA' || !!off?.abandoned;
    return { ...q, answer: !annulled && a && q.options.some(o => o.k === a) ? a : null, annulled, params: off && !off.abandoned ? { a: off.a, b: off.b, c: off.c, source: 'inep' as const, ...(off.skill ? { skill: off.skill } : {}) } : undefined };
  });
  const keyed = final.filter(q => q.answer).length;
  log(`  → ${final.length} questões, ${keyed} com gabarito${final.some(q => q.params) ? `, ${final.filter(q => q.params).length} com parâmetros oficiais do INEP` : ''}${final.some(q => q.annulled) ? `, ${final.filter(q => q.annulled).length} anuladas` : ''}`);
  if (skipped.length) log(`  → ${skipped.length} ignoradas: ${skipped.slice(0, 8).map(s => `${s.number} (${s.reason})`).join('; ')}${skipped.length > 8 ? '…' : ''}`);

  if (!c) {
    for (const q of final.slice(0, 1)) log(`\n  [${q.number}${q.variant ? ' ' + q.variant : ''}] ${q.area} · ${classifySubject(q.area, q.statement, q.variant)} · gabarito ${q.answer ?? '—'}\n  ${q.statement.slice(0, 200).replace(/\n/g, ' ')}…\n  ${q.options.map(o => `${o.k}) ${o.figure ? '[imagem] ' : ''}${o.t.slice(0, 50)}`).join('\n  ')}`);
    for (const a of opened) await a.close();
    return;
  }

  const { ObjectId, Binary } = await import('../src/lib/db');
  const now = new Date();
  const src = await c.sources.findOneAndUpdate(
    { slug: g.key },
    { $set: { title: g.title, kind: g.enem ? 'ENEM' : 'OUTRA', files: files.map(f => ({ name: f.name, sha256: f.sha, pages: f.pages, role: f.id.kind === 'gabarito' ? 'gabarito' : 'prova' })), questionCount: final.length, keyedCount: keyed, skipped, status: keyed ? 'PARSED' : 'NEEDS_KEY', ingestedAt: now } },
    { upsert: true, returnDocument: 'after' },
  );
  const sourceId = src!._id;
  let n = 0, bytes = 0;
  for (const q of final) {
    const doc = await c.questions.findOneAndUpdate(
      { sourceId, number: q.number, variant: q.variant },
      { $setOnInsert: { stats: { attempts: 0, correct: 0 } }, $set: { updatedAt: now } },
      { upsert: true, returnDocument: 'after' },
    );
    const questionId = doc!._id;
    await c.images.deleteMany({ questionId });
    const save = async (kind: 'figure' | 'option' | 'original', page: number, box: Parameters<Q['crop']>[1], scale: number, alt?: string) => {
      const im = await q.crop(page, box, scale);
      const _id = new ObjectId();
      await c.images.insertOne({ _id, sourceId, questionId, kind, mime: 'image/webp', data: new Binary(im.data), w: im.w, h: im.h });
      bytes += im.data.length;
      return { img: String(_id), w: Math.round(im.w / scale), h: Math.round(im.h / scale), ...(alt ? { alt } : {}) };
    };
    const content = [];
    for (const b of q.content as Block[]) content.push(b.type === 'text' ? b : { type: 'figure' as const, ...(await save('figure', b.page, b.box, 2, b.alt)) });
    const options = [];
    for (const o of q.options) options.push({ k: o.k, t: o.t, ...(o.figure ? { img: await save('option', o.figure.page, o.figure.box, 2, o.t) } : {}) });
    const original = [];
    if (!NO_ORIGINAL) for (const r of q.regions) original.push(await save('original', r.page, r.box, 1.6));
    await c.questions.updateOne({ _id: questionId }, {
      $set: {
        area: q.area, subject: classifySubject(q.area, q.statement, q.variant), statement: q.statement, content, options, original,
        answer: q.answer, annulled: q.annulled, page: q.page, file: q.file, year: g.year, day: q.day, color: q.color, caderno: q.caderno, updatedAt: now,
        ...(q.params ? { params: q.params } : {}),
      },
      $unset: { explanations: '', ...(q.params ? {} : { params: '' }) } as Record<string, ''>,
    });
    if (++n % 20 === 0) log(`  … ${n}/${final.length} salvas`);
  }
  for (const a of opened) await a.close();
  log(`  ✓ "${g.title}" salvo (${(bytes / 1048576).toFixed(1)} MB de imagens)`);
}

main().catch(e => { console.error(e instanceof Error ? e.message : e); process.exit(1); });
