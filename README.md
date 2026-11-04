# EstudaAI

Next.js 15 (App Router) + TypeScript + MongoDB + Motion + Gemini. Usa questões **reais** dos PDFs das provas,
com texto e imagens como no caderno.

## Rodar

1. Node 20+ e `npm install`.
2. **Terminal 1:** `npm run db` sobe um MongoDB local em `127.0.0.1:27017`, sem instalação. Os dados ficam em
   `.mongo-data/`, e esse terminal precisa ficar aberto. Se preferir, use um MongoDB próprio ou o Atlas e ajuste o `MONGODB_URI`.
3. Preencha `.env.local` (modelo em `.env.example`): `MONGODB_URI`, `AUTH_SECRET` e, se quiser, `GEMINI_API_KEY`.
4. **Terminal 2:** com os PDFs em `provas/` (veja [provas/LEIA-ME.md](provas/LEIA-ME.md)), rode `npm run ingest`, uma vez só, por uns 5 minutos.
5. `npm run dev` → http://localhost:3000

## Como os PDFs viram questões

| Etapa | Arquivo |
|---|---|
| Identifica prova/gabarito, ano, dia, caderno, cor | `src/lib/pdf/identify.ts` |
| Texto com posição, colunas, faixas largas, marca d'água, fonte quebrada | `src/lib/pdf/extract.ts` |
| Figuras: tinta da página que sobra depois de apagar o texto | `src/lib/pdf/extract.ts` (`detectFigures`) |
| Questões em blocos de texto + figura, alternativas (também em grade/imagem), fórmulas | `src/lib/pdf/parse.ts` |
| Leitura pelo Gemini de páginas com texto ilegível | `src/lib/pdf/ocr.ts` |
| Parâmetros oficiais do INEP (microdados) | `src/lib/pdf/microdados.ts` |
| Ingestão no MongoDB (imagens em WebP na coleção `images`) | `scripts/ingest.ts` |

## Métodos (conforme "ENEM – Procedimentos de Análise", Inep 2021)

- **TRI**: modelo logístico de 3 parâmetros, `P = c + (1 − c) / (1 + exp[−a(θ − b)])`, proficiência por EAP
  com 40 pontos de quadratura e priori normal, escala `100θ + 500` (`src/lib/tri.ts`). Usa os parâmetros oficiais
  quando o `ITENS_PROVA_AAAA.csv` é importado; senão, estima `b` pelo acerto dos alunos.
- **Análise clássica (TCT)**: % de acerto, % por alternativa, grupos superior/inferior de 27%, índice de
  discriminação e correlação bisserial por alternativa, com alerta de possível erro de gabarito (`src/lib/tct.ts`, tela `/analise`).

## Outras peças

| Parte | Onde |
|---|---|
| Caderno de erros (FSRS-4.5) | `src/lib/fsrs.ts` |
| XP, níveis, sequência, conquistas | `src/lib/game.ts`, `src/lib/progress.ts` |
| Redação: corretor local + Gemini | `src/lib/essay.ts`, `src/lib/ai.ts` |
| Gemini (JSON validado, imagens na explicação) | `src/lib/gemini.ts` |
| Offline: IndexedDB + service worker (imagens incluídas) | `src/lib/offline.ts`, `public/sw.js` |

Telas: `/login`, `/onboarding`, `/prova`, `/questoes`, `/redacao`, `/painel`, `/progresso`, `/analise`.
O gabarito nunca vai para o navegador durante a sessão: a correção acontece em `POST /api/attempts`.

## Testes

```bash
npm test          # TRI, TCT, FSRS, gamificação, parser, identificação de arquivos, microdados
npm run typecheck
```
