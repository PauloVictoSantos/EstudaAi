# Pasta das provas

Coloque aqui os PDFs, com qualquer nome, e rode:

```bash
npm run ingest:dry   # mostra o que foi reconhecido, sem gravar nada
npm run ingest       # grava as questões no MongoDB
```

Cada arquivo é reconhecido **pelo conteúdo**: prova ou gabarito, ano, dia, caderno e cor. Os nomes do INEP
variam todo ano (`2023_PV_impresso_D1_CD1.pdf`, `GAB_ENEM_2016_DIA_1_01_AZUL.pdf`,
`cad_5_gabarito_amarelo_12112017.pdf`…) e todos funcionam. Um arquivo sem ano no nome nem no texto herda o ano
da prova que estiver sem aquela peça. Exemplo: `2DIA_05_AMARELO_BAIXA.pdf` vira o 2º dia de 2018.

## O que é guardado

**Nenhum PDF é copiado nem salvo.** Para cada questão, o banco recebe:

- o **texto**: enunciado e alternativas, com parágrafos e quebras de poema;
- as **figuras**: fotos, gráficos, tabelas, tirinhas e mapas, recortados da página na posição em que aparecem;
- **fórmulas** com raiz e fração e **alternativas que são desenho**, como imagem igual ao caderno;
- o recorte da **questão inteira como impressa** (botão "Ver como no caderno"). Use `--sem-original` para não guardar;
- o **gabarito**, as anuladas e, se você fornecer os microdados, os **parâmetros TRI oficiais**.

## Parâmetros oficiais do INEP (opcional)

O INEP divulga os parâmetros a, b e c de cada item nos microdados do ENEM, cinco anos depois de cada edição
(veja "ENEM – Procedimentos de Análise"). Baixe os microdados do ano e copie para esta pasta o arquivo
`ITENS_PROVA_AAAA.csv`. A TRI do app passa a usar esses parâmetros no lugar da estimativa pelo acerto dos
alunos. O arquivo também traz as habilidades da matriz e os itens abandonados.

## PDFs com fonte quebrada

Alguns PDFs saem com o texto embaralhado, como "YLVmR WULFURPiWLFD" em vez de "visão tricromática":
- **Quando a fonte usa a ordem padrão de glifos**, como o 2º dia de 2018, o texto é decodificado na hora, inclusive os números.
- **Nos outros casos**, as linhas ilegíveis viram imagem, idênticas ao caderno. Com `GEMINI_API_KEY` definida, o Gemini também lê essas páginas: fornece o texto e recupera questões cujo número ficou ilegível.

## Outras provas (concursos, vestibulares)

Coloque a prova e o gabarito com o mesmo nome-base (`TJ-SP 2023.pdf` + `TJ-SP 2023 gabarito.pdf`), ou numa
subpasta própria. O gabarito também pode ser um `.txt` com linhas `1 A`, `2 C`...

Reprocessar: `npm run ingest` só refaz o que mudou; `npm run ingest -- --force` refaz tudo.
