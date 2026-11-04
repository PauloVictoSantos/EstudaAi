import { describe, expect, it } from 'vitest';
import { answerFor, enemAreaByNumber, joinLines, layoutFromText, parseAnswerKey, parseLayout } from './parse';
import { isGarbled, layoutPage, type PageLayout } from './extract';
import { groupFiles, identify } from './identify';
import { parseItensProva, findOfficial } from './microdados';

const enemPage = `EXAME NACIONAL DO ENSINO MÉDIO
CIÊNCIAS HUMANAS E SUAS TECNOLOGIAS
Questões de 46 a 90
QUESTÃO 46
A Lei Áurea, assinada em 13 de maio de 1888, encerrou
formalmente a escravidão no Brasil. Esse marco ocorreu no
contexto do
AA Primeiro Reinado.
BB Período Regencial.
CC Segundo Reinado.
DD Governo Provisório.
EE Estado Novo.
QUESTÃO 47
O processo de crescimento desordenado das cidades em direção
às bordas é chamado de
A gentrificação.
B conurbação.
C periferização.
D êxodo urbano.
E metropolização.
*010175AZ12*
CH • 1º DIA • CADERNO 1 • AZUL`;
const fill = Array.from({ length: 10 }, (_, i) => `QUESTÃO ${48 + i}\nEnunciado da questão número ${48 + i} com texto suficiente.\nA um\nB dois\nC três\nD quatro\nE cinco`).join('\n');

describe('parseLayout', () => {
  const r = parseLayout(layoutFromText([enemPage, fill]), { year: 2023 });
  it('detecta ENEM e encontra todas as questões', () => {
    expect(r.isEnem).toBe(true);
    expect(r.questions.map(q => q.number).slice(0, 3)).toEqual([46, 47, 48]);
    expect(r.questions).toHaveLength(12);
  });
  it('letra duplicada (bolinha + letra) e enunciado começando com "A"', () => {
    const q = r.questions[0];
    expect(q.statement).toMatch(/^A Lei Áurea/);
    expect(q.options.map(o => o.t)).toEqual(['Primeiro Reinado.', 'Período Regencial.', 'Segundo Reinado.', 'Governo Provisório.', 'Estado Novo.']);
    expect(q.area).toBe('CH');
  });
  it('remove cabeçalho e código de barras', () => expect(r.questions[1].options[4].t).toBe('metropolização.'));
  it('para antes da proposta de redação', () => {
    const p = parseLayout(layoutFromText([`QUESTÃO 45\nEnunciado longo o bastante aqui.\nA a\nB b\nC c\nD d\nE e.\nPROPOSTA DE REDAÇÃO\nTexto motivador que não é alternativa.`]));
    expect(p.questions[0].options[4].t).toBe('e.');
  });
  it('inglês e espanhol com a mesma numeração', () => {
    const lang = (n: number) => `QUESTÃO 0${n}\nTexto da questão de língua ${n} suficiente.\nA a\nB b\nC c\nD d\nE e`;
    const p = parseLayout(layoutFromText([`EXAME NACIONAL DO ENSINO MÉDIO\nQuestões de 01 a 05 (opção inglês)\n${[1, 2, 3, 4, 5].map(lang).join('\n')}\n${[1, 2, 3, 4, 5].map(lang).join('\n')}\n${fill.replace(/QUESTÃO 4|QUESTÃO 5/g, 'QUESTÃO 1')}`]));
    expect(p.questions.slice(0, 10).map(q => q.variant)).toEqual([...Array(5).fill('ingles'), ...Array(5).fill('espanhol')]);
  });
});

describe('áreas por ano', () => {
  it('2016 começa por Humanas', () => expect([enemAreaByNumber(1, 2016), enemAreaByNumber(100, 2016)]).toEqual(['CH', 'LC']));
  it('2017+ começa por Linguagens', () => expect([enemAreaByNumber(1, 2017), enemAreaByNumber(100, 2023)]).toEqual(['LC', 'CN']));
});

describe('joinLines', () => {
  it('desfaz hifenização', () => expect(joinLines(['infor-', 'mação'])).toBe('informação'));
});

describe('parseAnswerKey', () => {
  it('lê pares, inglês/espanhol e anuladas', () => {
    const k = parseAnswerKey('QUESTÃO GABARITO\n1 A B\n2 C D\n46 C\n47 – C\n102 Anulado');
    expect(answerFor(k, { number: 1, variant: 'ingles' })).toBe('A');
    expect(answerFor(k, { number: 1, variant: 'espanhol' })).toBe('B');
    expect(k.get('47')).toBe('C');
    expect(k.get('102')).toBe('ANULADA');
  });
  it('lê tabela horizontal', () => expect([...parseAnswerKey('Questão 1 2 3 4\nResposta B D A C').values()]).toEqual(['B', 'D', 'A', 'C']));
});

describe('layout', () => {
  it('lê coluna esquerda inteira antes da direita', () => {
    const items = [
      { str: 'esquerda um', x: 40, y: 700, w: 200, h: 10 }, { str: 'direita um', x: 320, y: 700, w: 200, h: 10 },
      { str: 'esquerda dois', x: 40, y: 680, w: 200, h: 10 }, { str: 'direita dois', x: 320, y: 680, w: 200, h: 10 },
      { str: 'esquerda três', x: 40, y: 660, w: 200, h: 10 }, { str: 'direita três', x: 320, y: 660, w: 200, h: 10 },
      { str: 'esquerda quatro', x: 40, y: 640, w: 200, h: 10 }, { str: 'direita quatro', x: 320, y: 640, w: 200, h: 10 },
      { str: 'esquerda cinco', x: 40, y: 620, w: 200, h: 10 }, { str: 'direita cinco', x: 320, y: 620, w: 200, h: 10 },
    ];
    expect(layoutPage(items, 600).split('\n')).toEqual(['esquerda um', 'esquerda dois', 'esquerda três', 'esquerda quatro', 'esquerda cinco', 'direita um', 'direita dois', 'direita três', 'direita quatro', 'direita cinco']);
  });
  it('detecta fonte corrompida', () => {
    const bad = Array.from({ length: 40 }, () => ({ text: 'YLVmR WULFURPiWLFD SLJPHQWRV' }));
    const good = Array.from({ length: 40 }, () => ({ text: 'Muitos primatas possuem visão tricromática' }));
    expect([isGarbled(bad), isGarbled(good)]).toEqual([true, false]);
  });
  it('figura entre parágrafos vira bloco no lugar certo', () => {
    const [p] = layoutFromText(['QUESTÃO 10\nObserve a figura que mostra o gráfico abaixo.\nQual é o valor?\nA 1\nB 2\nC 3\nD 4\nE 5']) as PageLayout[];
    p.figures.push({ page: 1, col: 1, x0: 40, x1: 300, top: 72, bottom: 110 }); // entre a 1ª e a 2ª linha do enunciado
    p.lines[2].top = 120; p.lines[2].bottom = 130;
    p.lines.slice(3).forEach((l, i) => { l.top = 150 + i * 14; l.bottom = 160 + i * 14; });
    const q = parseLayout([p]).questions[0];
    expect(q.content.map(c => c.type)).toEqual(['text', 'figure', 'text']);
  });
});

describe('identificação dos arquivos do INEP', () => {
  it('nomes de anos diferentes', () => {
    expect(identify('2023_PV_impresso_D2_CD5.pdf', 'EXAME NACIONAL DO ENSINO MÉDIO 2º DIA CADERNO 5 AMARELO QUESTÃO 91', 32)).toMatchObject({ kind: 'prova', year: 2023, day: 2, caderno: 5, color: 'AMARELO' });
    expect(identify('GAB_ENEM_2016_DIA_1_01_AZUL.pdf', 'Gabarito 2016 ' + '1 B '.repeat(30), 1)).toMatchObject({ kind: 'gabarito', year: 2016, day: 1, caderno: 1, color: 'AZUL' });
    expect(identify('cad_5_gabarito_amarelo_12112017.pdf', 'CADERNO 5 Gabarito 2017 2° DIA', 1)).toMatchObject({ kind: 'gabarito', year: 2017, day: 2, caderno: 5 });
    expect(identify('enem_procedimentos_de_analise.pdf', 'EXAME NACIONAL DO ENSINO MÉDIO – ENEM PROCEDIMENTOS DE ANÁLISE', 30).kind).toBe('outro');
  });
  it('arquivo sem ano herda o ano da lacuna', () => {
    const e = (name: string, kind: 'prova' | 'gabarito', year: number | null, day: 1 | 2) => ({ name, id: { kind, year, day, caderno: day === 1 ? 1 : 5, color: null, enem: true } });
    const { groups } = groupFiles([e('p18d1', 'prova', 2018, 1), e('g18d1', 'gabarito', 2018, 1), e('g18d2', 'gabarito', 2018, 2), e('2DIA_05_AMARELO_BAIXA', 'prova', null, 2)]);
    expect(groups.find(g => g.year === 2018)!.files.map(f => f.name)).toContain('2DIA_05_AMARELO_BAIXA');
  });
});

describe('microdados INEP', () => {
  it('lê parâmetros e encontra o item pela cor e idioma', () => {
    const csv = 'CO_POSICAO;SG_AREA;CO_ITEM;TX_GABARITO;CO_HABILIDADE;IN_ITEM_ABAN;TX_MOTIVO_ABAN;NU_PARAM_A;NU_PARAM_B;NU_PARAM_C;TX_COR;CO_PROVA;TP_LINGUA;IN_ITEM_ADAPTADO\n1;LC;1;B;5;0;;2,1;0,8;0,17;AZUL;1;0;0\n1;LC;2;A;5;0;;1,5;1,2;0,2;AZUL;1;1;0\n46;CH;3;C;10;0;;3,0;0,5;0,1;AZUL;1;;0';
    const items = parseItensProva(new TextEncoder().encode(csv), 2023);
    expect(findOfficial(items, { year: 2023, number: 1, color: 'AZUL', variant: 'espanhol' })).toMatchObject({ a: 1.5, b: 1.2, c: 0.2, answer: 'A' });
    expect(findOfficial(items, { year: 2023, number: 46, color: 'AZUL', variant: null })?.skill).toBe(10);
  });
});
