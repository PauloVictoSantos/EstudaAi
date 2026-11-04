import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { cols, oid } from '@/lib/db';
import { explainQuestion, hasAI } from '@/lib/ai';

/** Explicação do erro. Gerada pelo Gemini uma vez por alternativa errada e guardada na questão. */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if (user instanceof NextResponse) return user;
  const chosen = new URL(req.url).searchParams.get('chosen') ?? '';
  const id = oid((await params).id);
  const { questions } = await cols();
  const q = id && (await questions.findOne({ _id: id }));
  if (!q || !q.answer) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
  const right = q.options.find(o => o.k === q.answer)?.t ?? '';
  const basic = { wrong: `Você marcou ${chosen}.`, right: '', why: `A alternativa correta é ${q.answer}: “${right}”.`, next: `Releia o enunciado procurando a informação que leva a ${q.answer} e refaça outra questão de ${q.subject}.` };

  const cached = q.explanations?.[chosen];
  if (cached) return NextResponse.json({ explanation: cached, ai: true });
  if (!hasAI() || !q.options.some(o => o.k === chosen)) return NextResponse.json({ explanation: basic, ai: false });
  // Imagens da questão (figuras do enunciado e alternativas-desenho) vão junto para o Gemini
  const { images } = await cols();
  const ids = [...(q.content ?? []).flatMap(b => (b.type === 'figure' ? [b.img] : [])), ...q.options.flatMap(o => (o.img ? [o.img.img] : []))].slice(0, 8);
  const docs = ids.length ? await images.find({ _id: { $in: ids.map(id => oid(id)!).filter(Boolean) } }).toArray() : [];
  const pics = ids.flatMap(id => {
    const d = docs.find(x => String(x._id) === id);
    const opt = q.options.find(o => o.img?.img === id);
    return d ? [{ data: Buffer.from(d.data.buffer), mime: d.mime, label: opt ? `Alternativa ${opt.k}:` : 'Figura do enunciado:' }] : [];
  });
  for (let i = 0; i < 2; i++) {
    try {
      const explanation = await explainQuestion(q, chosen, pics);
      await questions.updateOne({ _id: q._id }, { $set: { [`explanations.${chosen}`]: explanation } });
      return NextResponse.json({ explanation, ai: true });
    } catch (e) {
      if (!(e instanceof Error && e.message === 'LLM_INVALID_OUTPUT')) break; // só repete em saída inválida
    }
  }
  return NextResponse.json({ explanation: basic, ai: false });
}
