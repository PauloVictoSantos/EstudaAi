// Redação: temas, modos de escrita e o corretor local (usado quando não há ANTHROPIC_API_KEY).
export type SpanKind = 'erro' | 'meio' | 'certo' | 'ortografia' | 'sinonimo' | 'repeticao' | 'coesao' | 'sentido';
export type Severity = 'red' | 'yellow' | 'green';
export interface Span { start: number; end: number; kind: SpanKind; severity: Severity; explanation: string; suggestion?: string; replace?: string }
export type Comps = Record<'c1' | 'c2' | 'c3' | 'c4' | 'c5', number>;
export interface Theme { axis: string; title: string; texts: string[]; words: string[] }
export interface Analysis { spans: Span[]; competencias: Comps; source: 'ia' | 'local' }


export const TEMPLATES: Record<string, string> = {
  FULL: `Na obra [repertório sociocultural], observa-se [relação clara entre o repertório e o tema]. Entretanto, essa realidade ainda se faz presente no Brasil, uma vez que [tema da redação] constitui um desafio para a sociedade brasileira. Nesse sentido, destacam-se [causa 1] e [causa 2] como fatores que perpetuam esse cenário.

Em primeiro lugar, é necessário destacar [causa 1] como um dos principais entraves à resolução do problema. Isso ocorre porque [explique como e por que esse fator contribui para o problema]. Sob essa perspectiva, [pensador/dado/fato histórico pertinente] evidencia que [explique a relação entre o repertório e o tema]. Dessa forma, [consequência para a sociedade].

Além disso, [causa 2] intensifica esse problema no Brasil. Isso se deve ao fato de que [explique o funcionamento desse fator e sua relação com o tema]. Nesse contexto, [segundo repertório pertinente] permite compreender que [conecte claramente com a discussão]. Consequentemente, [impactos sociais], o que reforça a necessidade de medidas para enfrentar a questão.

Portanto, é fundamental combater [problema]. Para isso, [agente] deve [ação concreta], por meio de [meio de execução], a fim de [finalidade]. Ademais, [detalhamento], com o objetivo de garantir [resultado esperado]. Assim, será possível minimizar os impactos de [problema] e promover uma sociedade mais [justa/inclusiva/consciente].`,

  INTRO: `Na obra [repertório sociocultural], observa-se [relação clara entre o repertório e o tema]. Entretanto, essa realidade ainda se faz presente no Brasil, uma vez que [tema da redação] constitui um desafio para a sociedade brasileira. Nesse sentido, destacam-se [causa 1] e [causa 2] como fatores que perpetuam esse cenário.`,

  DEV: `Em primeiro lugar, é necessário destacar [causa 1] como um dos principais entraves à resolução do problema. Isso ocorre porque [explique como e por que esse fator contribui para o problema]. Sob essa perspectiva, [pensador/dado/fato histórico pertinente] evidencia que [explique a relação entre o repertório e o tema]. Dessa forma, [consequência para a sociedade].

Além disso, [causa 2] intensifica esse problema no Brasil. Isso se deve ao fato de que [explique o funcionamento desse fator e sua relação com o tema]. Nesse contexto, [segundo repertório pertinente] permite compreender que [conecte claramente com a discussão]. Consequentemente, [impactos sociais], o que reforça a necessidade de medidas para enfrentar a questão.`,

  CONC: `Portanto, é fundamental combater [problema]. Para isso, [agente] deve [ação concreta], por meio de [meio de execução], a fim de [finalidade]. Ademais, [detalhamento], com o objetivo de garantir [resultado esperado]. Assim, será possível minimizar os impactos de [problema] e promover uma sociedade mais [justa/inclusiva/consciente].`,
};


export const KINDS: Record<SpanKind, string> = {
  erro: 'Erro', meio: 'Parcial', certo: 'Acerto', ortografia: 'Ortografia', sinonimo: 'Sinônimo', repeticao: 'Repetição', coesao: 'Coesão', sentido: 'Sentido',
};

export const MODES: Record<string, { label: string; min: number; model: string; tip: string[] }> = {
  FULL: { label: 'Redação completa', min: 250, model: 'Introdução com repertório e tese → dois parágrafos de desenvolvimento, cada um com tópico frasal, argumento e exemplo → conclusão com proposta de intervenção completa (agente, ação, meio, finalidade e detalhamento).', tip: ['Tese clara no 1º parágrafo', 'Um argumento por parágrafo', 'Proposta com os 5 elementos'] },
  INTRO: { label: 'Introdução', min: 60, model: 'Segundo a Constituição Federal de 1988, todos têm direito à educação. Entretanto, essa garantia não se concretiza plenamente no Brasil, seja pela desigualdade de acesso, seja pela falta de investimento. Assim, é preciso discutir esse cenário.', tip: ['Repertório legitimado', 'Tese com dois eixos', 'Anuncie os argumentos'] },
  DEV: { label: 'Desenvolvimento', min: 90, model: 'Em primeiro lugar, cabe destacar que a exclusão digital limita a autonomia dos idosos. Isso ocorre porque serviços essenciais migraram para aplicativos, de modo que quem não domina a tecnologia passa a depender de terceiros. Dados do IBGE confirmam que essa parcela da população é a que menos acessa a internet.', tip: ['Tópico frasal', 'Explique a causa', 'Feche com dado ou exemplo'] },
  CONC: { label: 'Conclusão', min: 60, model: 'Portanto, cabe ao Ministério da Educação, em parceria com as prefeituras, criar cursos gratuitos de letramento digital para idosos, por meio de oficinas em centros comunitários, a fim de garantir sua autonomia no acesso a serviços públicos.', tip: ['Agente + ação', 'Meio/modo', 'Finalidade e detalhamento'] },
};
export const THEMES: Theme[] = [
  // ===== TECNOLOGIA (12) =====
  { axis: 'Tecnologia', title: 'Os vieses raciais dos sistemas de reconhecimento facial no Brasil', texts: [
    'Sistemas de reconhecimento facial vêm sendo adotados por polícias e empresas para identificar pessoas em tempo real.',
    'Estudos internacionais apontam que esses algoritmos erram mais ao identificar rostos de pessoas negras, o que pode gerar abordagens e prisões equivocadas.',
    'Sem transparência sobre como os sistemas são treinados e auditados, o risco de reproduzir o racismo estrutural por meio da tecnologia aumenta.',
  ], words: ['reconhecimento facial', 'viés', 'racismo', 'algoritmo', 'vigilância', 'segurança pública', 'transparência'] },
  { axis: 'Tecnologia', title: 'A invisibilidade do gerenciamento algorítmico sobre trabalhadores de aplicativos', texts: [
    'Motoristas e entregadores são avaliados, punidos e bloqueados por sistemas automatizados cujas regras raramente são explicadas.',
    'Muitos relatam não ter com quem conversar quando a conta é suspensa, o que gera perda imediata de renda.',
    'O debate sobre direitos desses trabalhadores passa pela necessidade de transparência nas decisões tomadas por algoritmos.',
  ], words: ['algoritmo', 'plataformas', 'bloqueio', 'transparência', 'renda', 'trabalhador', 'direitos'] },
  { axis: 'Tecnologia', title: 'Golpes digitais e a vulnerabilidade de pessoas com baixa escolarização', texts: [
    'Fraudes por mensagens, falsas centrais de atendimento e links maliciosos se espalham com rapidez pelo celular.',
    'Pessoas com pouca familiaridade com tecnologia e menor escolarização têm mais dificuldade de reconhecer sinais de golpe.',
    'Combater esse problema exige educação digital, responsabilização das plataformas e canais de denúncia acessíveis.',
  ], words: ['golpe', 'fraude', 'educação digital', 'vulnerabilidade', 'celular', 'denúncia', 'prevenção'] },
  { axis: 'Tecnologia', title: 'Barreiras de acessibilidade digital para pessoas com deficiência visual', texts: [
    'Sites e aplicativos sem descrição de imagens ou compatibilidade com leitores de tela excluem pessoas cegas e com baixa visão.',
    'A Lei Brasileira de Inclusão prevê acessibilidade na internet, mas a fiscalização ainda é frágil.',
    'Serviços essenciais, como bancos e órgãos públicos, ao migrarem para o meio digital, podem ampliar a exclusão se não forem acessíveis.',
  ], words: ['acessibilidade', 'deficiência visual', 'leitor de tela', 'inclusão', 'internet', 'direito', 'fiscalização'] },
  { axis: 'Tecnologia', title: 'A exclusão digital em comunidades ribeirinhas da Amazônia', texts: [
    'Em regiões de difícil acesso, a conexão à internet depende de infraestrutura cara, instável ou inexistente.',
    'Sem conexão, moradores têm dificuldade de acessar aulas remotas, benefícios sociais e atendimento de saúde.',
    'Levar internet a essas áreas é uma questão de cidadania e de redução de desigualdades regionais.',
  ], words: ['Amazônia', 'ribeirinhos', 'conectividade', 'desigualdade regional', 'infraestrutura', 'cidadania', 'internet'] },
  { axis: 'Tecnologia', title: 'A violência digital contra mulheres e a exposição de imagens íntimas', texts: [
    'A divulgação não autorizada de fotos e vídeos íntimos atinge majoritariamente mulheres e causa danos psicológicos e sociais profundos.',
    'A legislação brasileira criminaliza essa conduta, mas a retirada rápida do conteúdo e a responsabilização ainda são desafios.',
    'A culpabilização da vítima, muitas vezes presente na sociedade, dificulta as denúncias.',
  ], words: ['violência digital', 'mulheres', 'privacidade', 'exposição', 'legislação', 'denúncia', 'culpabilização'] },
  { axis: 'Tecnologia', title: 'A coleta de dados de crianças em plataformas educacionais digitais', texts: [
    'Aplicativos e plataformas usados em escolas coletam informações sobre hábitos e desempenho de estudantes.',
    'A Lei Geral de Proteção de Dados exige cuidado redobrado com dados de crianças e adolescentes.',
    'Muitas famílias e escolas desconhecem como essas informações são armazenadas e utilizadas por empresas.',
  ], words: ['dados pessoais', 'LGPD', 'crianças', 'privacidade', 'escola', 'plataformas', 'consentimento'] },
  { axis: 'Tecnologia', title: 'A telemedicina e o abandono de quem vive sem acesso à internet', texts: [
    'Consultas a distância ampliaram o acesso à saúde para parte da população, reduzindo deslocamentos.',
    'No entanto, quem não tem internet, aparelho adequado ou habilidade digital fica à margem desse serviço.',
    'A tecnologia só democratiza a saúde quando é acompanhada de infraestrutura e apoio à população mais vulnerável.',
  ], words: ['telemedicina', 'saúde', 'desigualdade', 'conectividade', 'acesso', 'SUS', 'inclusão'] },
  { axis: 'Tecnologia', title: 'O crescimento das apostas online entre jovens de baixa renda', texts: [
    'Plataformas de apostas usam publicidade intensa, inclusive com influenciadores, para atrair o público jovem.',
    'Muitos apostadores comprometem renda e acumulam dívidas na expectativa de ganhos rápidos.',
    'Especialistas associam o hábito a quadros de compulsão e defendem regulação mais rígida da propaganda.',
  ], words: ['apostas', 'bets', 'jovens', 'endividamento', 'compulsão', 'publicidade', 'regulação'] },
  { axis: 'Tecnologia', title: 'A inteligência artificial e o apagamento das línguas indígenas', texts: [
    'Ferramentas de tradução e assistentes virtuais são treinados majoritariamente em línguas de grande circulação.',
    'Línguas indígenas, com pouco material digitalizado, ficam fora desses sistemas e perdem espaço no ambiente digital.',
    'Projetos de documentação e tecnologia desenvolvidos com os próprios povos podem ajudar a preservar esse patrimônio.',
  ], words: ['inteligência artificial', 'línguas indígenas', 'diversidade linguística', 'preservação', 'tecnologia', 'patrimônio', 'povos originários'] },
  { axis: 'Tecnologia', title: 'O alto custo da tecnologia assistiva para pessoas com deficiência', texts: [
    'Cadeiras motorizadas, próteses e softwares de comunicação aumentam a autonomia de pessoas com deficiência.',
    'Esses itens costumam ter preços elevados e nem sempre são oferecidos pelo sistema público.',
    'A dificuldade de acesso limita a independência e a participação social de quem mais precisa.',
  ], words: ['tecnologia assistiva', 'deficiência', 'autonomia', 'custo', 'acesso', 'políticas públicas', 'inclusão'] },
  { axis: 'Tecnologia', title: 'O isolamento social de adolescentes nos jogos e redes online', texts: [
    'Adolescentes passam horas em jogos e redes, onde criam vínculos, mas também podem se afastar da convivência presencial.',
    'O uso excessivo está associado a queda no rendimento escolar e a problemas de sono e de saúde mental.',
    'Família, escola e poder público têm papel na promoção de um uso equilibrado das telas.',
  ], words: ['adolescência', 'jogos online', 'isolamento', 'saúde mental', 'telas', 'família', 'convivência'] },

  // ===== SAÚDE (13) =====
  { axis: 'Saúde', title: 'A pobreza menstrual e seus impactos na vida de meninas e mulheres', texts: [
    'Muitas meninas e mulheres não têm acesso a absorventes, água e banheiros adequados durante o período menstrual.',
    'A falta desses itens leva a faltas na escola e no trabalho e a riscos para a saúde.',
    'O tema ainda é cercado de tabu, o que dificulta o debate e a criação de políticas públicas.',
  ], words: ['pobreza menstrual', 'dignidade', 'absorventes', 'evasão escolar', 'tabu', 'políticas públicas', 'higiene'] },
  { axis: 'Saúde', title: 'A invisibilidade das pessoas com doenças raras no sistema de saúde', texts: [
    'Doenças raras afetam um número pequeno de pessoas, mas, somadas, atingem milhões de brasileiros.',
    'O diagnóstico costuma demorar anos e os medicamentos são, em geral, caros e de difícil acesso.',
    'Muitos pacientes recorrem à Justiça para garantir tratamento, o que evidencia falhas na assistência.',
  ], words: ['doenças raras', 'diagnóstico', 'medicamentos', 'judicialização', 'SUS', 'acesso', 'tratamento'] },
  { axis: 'Saúde', title: 'A mortalidade materna entre mulheres negras no Brasil', texts: [
    'Dados da saúde pública mostram que mulheres negras morrem mais por causas ligadas à gravidez e ao parto.',
    'Menor acesso ao pré-natal de qualidade e atendimento com menos escuta contribuem para esse cenário.',
    'Reduzir essas mortes exige combater o racismo institucional nos serviços de saúde.',
  ], words: ['mortalidade materna', 'racismo institucional', 'pré-natal', 'mulheres negras', 'desigualdade', 'parto', 'saúde pública'] },
  { axis: 'Saúde', title: 'Os obstáculos de acesso à saúde para a população em situação de rua', texts: [
    'Pessoas em situação de rua enfrentam maior exposição a doenças como tuberculose e problemas de pele.',
    'A exigência de documentos e comprovante de endereço e o preconceito dificultam o atendimento nas unidades.',
    'Estratégias como os consultórios na rua buscam levar o cuidado até quem está fora da rede tradicional.',
  ], words: ['situação de rua', 'atendimento', 'tuberculose', 'preconceito', 'consultório na rua', 'equidade', 'SUS'] },
  { axis: 'Saúde', title: 'A sobrecarga de familiares que cuidam de pessoas com demência', texts: [
    'O envelhecimento da população aumenta o número de casos de doenças como o Alzheimer.',
    'No Brasil, o cuidado costuma recair sobre familiares, sobretudo mulheres, sem apoio financeiro ou psicológico.',
    'A falta de serviços de apoio leva a esgotamento físico e emocional dos cuidadores.',
  ], words: ['Alzheimer', 'cuidadores', 'envelhecimento', 'sobrecarga', 'mulheres', 'apoio', 'saúde mental'] },
  { axis: 'Saúde', title: 'Os desafios da saúde da população trans no acesso ao SUS', texts: [
    'Pessoas trans relatam constrangimento e desrespeito ao nome social em serviços de saúde.',
    'O processo transexualizador no SUS existe, mas a oferta é concentrada em poucos centros e tem filas longas.',
    'O medo de discriminação faz muitas pessoas evitarem consultas, o que agrava problemas de saúde.',
  ], words: ['população trans', 'nome social', 'discriminação', 'SUS', 'processo transexualizador', 'acolhimento', 'direitos'] },
  { axis: 'Saúde', title: 'A espera por cirurgias eletivas e o agravamento de doenças', texts: [
    'Pacientes aguardam meses ou anos por procedimentos que não são de urgência, mas que afetam a qualidade de vida.',
    'A demora pode transformar quadros simples em graves, aumentando custos e sofrimento.',
    'A fila expõe a desigualdade entre quem pode pagar um plano particular e quem depende do sistema público.',
  ], words: ['cirurgia eletiva', 'fila', 'SUS', 'desigualdade', 'gestão', 'financiamento', 'qualidade de vida'] },
  { axis: 'Saúde', title: 'O diagnóstico tardio de autismo em adultos', texts: [
    'Por muito tempo, o autismo foi associado apenas à infância, e muitos adultos cresceram sem diagnóstico.',
    'A falta de identificação gera sofrimento, dificuldades no trabalho e rótulos injustos.',
    'O reconhecimento tardio mostra a necessidade de capacitar profissionais e ampliar a informação sobre o espectro.',
  ], words: ['autismo', 'diagnóstico tardio', 'neurodiversidade', 'adultos', 'informação', 'inclusão', 'capacitação'] },
  { axis: 'Saúde', title: 'A farmácia como primeiro atendimento e o risco da automedicação', texts: [
    'Em muitos bairros, a farmácia é o serviço de saúde mais próximo e acessível da população.',
    'A automedicação e o uso indevido de antibióticos podem causar intoxicações e resistência bacteriana.',
    'Fortalecer a atenção básica e a orientação farmacêutica é essencial para reduzir esses riscos.',
  ], words: ['automedicação', 'farmácia', 'antibióticos', 'atenção básica', 'orientação', 'risco', 'acesso'] },
  { axis: 'Saúde', title: 'A saúde de imigrantes e refugiados e as barreiras de idioma e documentação', texts: [
    'Imigrantes e refugiados têm direito ao atendimento no SUS, independentemente da situação migratória.',
    'Na prática, a barreira do idioma e o desconhecimento dos direitos dificultam o acesso.',
    'Intérpretes e materiais multilíngues podem tornar o cuidado mais acolhedor.',
  ], words: ['imigrantes', 'refugiados', 'idioma', 'SUS', 'acolhimento', 'direitos', 'xenofobia'] },
  { axis: 'Saúde', title: 'O estigma e o subdiagnóstico da anemia falciforme', texts: [
    'A anemia falciforme é uma doença hereditária mais comum na população negra, e causa dores intensas e complicações graves.',
    'O teste do pezinho identifica a doença, mas o acompanhamento médico especializado nem sempre é garantido.',
    'Pacientes relatam desconfiança ao buscar atendimento de urgência, o que evidencia o preconceito nos serviços.',
  ], words: ['anemia falciforme', 'população negra', 'teste do pezinho', 'preconceito', 'acompanhamento', 'saúde pública', 'dor'] },
  { axis: 'Saúde', title: 'O luto silenciado de famílias que vivem perdas gestacionais', texts: [
    'A perda de um bebê durante a gestação ou logo após o parto é uma experiência dolorosa e pouco discutida.',
    'Muitas mulheres ouvem frases que minimizam o sofrimento e não recebem acompanhamento psicológico.',
    'Protocolos de acolhimento nas maternidades podem ajudar a reduzir o impacto emocional.',
  ], words: ['luto', 'perda gestacional', 'acolhimento', 'maternidade', 'saúde mental', 'tabu', 'humanização'] },
  { axis: 'Saúde', title: 'As barreiras de comunicação no atendimento a pessoas surdas', texts: [
    'Pessoas surdas, usuárias da Libras, frequentemente enfrentam dificuldade para explicar sintomas e entender orientações médicas.',
    'A falta de intérpretes e de profissionais capacitados pode levar a diagnósticos errados.',
    'Garantir comunicação acessível é parte do direito à saúde e do respeito à autonomia do paciente.',
  ], words: ['surdez', 'Libras', 'comunicação', 'intérprete', 'saúde', 'acessibilidade', 'autonomia'] },

  // ===== MEIO AMBIENTE (12) =====
  { axis: 'Meio ambiente', title: 'O racismo ambiental e a desigual exposição a riscos nas periferias', texts: [
    'Comunidades pobres e negras estão mais próximas de lixões, indústrias poluentes e áreas sujeitas a alagamentos.',
    'Essa desigualdade na distribuição de riscos ambientais é chamada de racismo ambiental.',
    'Políticas de planejamento urbano e participação das comunidades são caminhos para reduzir o problema.',
  ], words: ['racismo ambiental', 'periferia', 'desigualdade', 'poluição', 'justiça ambiental', 'planejamento urbano', 'comunidades'] },
  { axis: 'Meio ambiente', title: 'O trabalho dos catadores de materiais recicláveis e o reconhecimento social', texts: [
    'Catadores realizam grande parte da reciclagem no Brasil, muitas vezes em condições precárias.',
    'A atividade reduz o volume de resíduos em aterros e gera renda, mas ainda é pouco valorizada.',
    'Cooperativas e a política nacional de resíduos sólidos buscam integrar esses trabalhadores à cadeia formal.',
  ], words: ['catadores', 'reciclagem', 'cooperativas', 'resíduos sólidos', 'valorização', 'renda', 'sustentabilidade'] },
  { axis: 'Meio ambiente', title: 'As ondas de calor e a vulnerabilidade de quem trabalha ao ar livre', texts: [
    'O aumento das temperaturas extremas expõe trabalhadores de obras, lavouras e ruas a riscos como desidratação e insolação.',
    'Moradias sem ventilação adequada agravam o impacto do calor em famílias de baixa renda.',
    'Adaptar o trabalho e as cidades ao calor é uma questão de saúde e de justiça social.',
  ], words: ['calor extremo', 'mudanças climáticas', 'trabalhadores', 'saúde', 'adaptação', 'vulnerabilidade', 'cidades'] },
  { axis: 'Meio ambiente', title: 'Os deslocados por eventos climáticos e a falta de proteção legal', texts: [
    'Enchentes, secas e deslizamentos forçam milhares de pessoas a deixarem suas casas.',
    'Diferentemente de refugiados de guerra, essas pessoas nem sempre têm reconhecimento legal ou apoio estruturado.',
    'O tema exige políticas de moradia, prevenção de desastres e acolhimento.',
  ], words: ['deslocados climáticos', 'enchentes', 'moradia', 'desastres', 'proteção', 'prevenção', 'migração'] },
  { axis: 'Meio ambiente', title: 'A falta de saneamento básico e as doenças nas periferias', texts: [
    'Milhões de brasileiros ainda vivem sem coleta de esgoto ou com abastecimento de água irregular.',
    'A ausência de saneamento favorece doenças como diarreias e hepatites, sobretudo entre crianças.',
    'O Marco Legal do Saneamento busca ampliar investimentos, mas o desafio de alcançar as áreas mais pobres permanece.',
  ], words: ['saneamento', 'esgoto', 'água', 'doenças', 'periferia', 'investimento', 'saúde pública'] },
  { axis: 'Meio ambiente', title: 'A contaminação por mercúrio do garimpo em comunidades da Amazônia', texts: [
    'O garimpo ilegal utiliza mercúrio, que contamina rios e se acumula nos peixes consumidos pela população local.',
    'Comunidades indígenas e ribeirinhas sofrem com problemas neurológicos e com a insegurança alimentar.',
    'O combate ao garimpo envolve fiscalização, alternativas econômicas e assistência à saúde.',
  ], words: ['garimpo', 'mercúrio', 'contaminação', 'rios', 'fiscalização', 'saúde', 'Amazônia'] },
  { axis: 'Meio ambiente', title: 'Os impactos da poluição dos mares sobre os pescadores artesanais', texts: [
    'Pescadores artesanais dependem da saúde dos ecossistemas costeiros para garantir o sustento.',
    'Vazamentos de óleo, esgoto e plástico reduzem a pesca e ameaçam a segurança alimentar dessas famílias.',
    'A categoria costuma ter pouca voz nas decisões e demora a receber reparação.',
  ], words: ['pescadores artesanais', 'poluição', 'oceanos', 'sustento', 'reparação', 'ecossistema', 'plástico'] },
  { axis: 'Meio ambiente', title: 'As mulheres do campo e a agricultura familiar diante das secas', texts: [
    'A agricultura familiar produz grande parte dos alimentos consumidos no Brasil, e as mulheres têm papel central nessa produção.',
    'Secas prolongadas, principalmente no Semiárido, comprometem a colheita e a renda dessas famílias.',
    'Tecnologias sociais, como cisternas, ajudam a garantir água e a permanência no campo.',
  ], words: ['agricultura familiar', 'seca', 'Semiárido', 'mulheres rurais', 'cisternas', 'água', 'segurança alimentar'] },
  { axis: 'Meio ambiente', title: 'O lixo eletrônico e os riscos do descarte inadequado de aparelhos', texts: [
    'Celulares, baterias e computadores contêm metais pesados que contaminam o solo e a água quando descartados no lixo comum.',
    'A troca frequente de aparelhos, estimulada pelo consumo, aumenta o volume desse resíduo.',
    'A logística reversa busca responsabilizar fabricantes, mas poucos consumidores sabem onde descartar.',
  ], words: ['lixo eletrônico', 'logística reversa', 'consumo', 'metais pesados', 'descarte', 'responsabilidade', 'sustentabilidade'] },
  { axis: 'Meio ambiente', title: 'As famílias que vivem em áreas de risco de deslizamento', texts: [
    'Encostas ocupadas sem planejamento sofrem com deslizamentos em períodos de chuva intensa.',
    'Sem alternativas de moradia acessível, famílias de baixa renda permanecem em locais perigosos.',
    'Sistemas de alerta, obras de contenção e habitação popular são medidas de prevenção.',
  ], words: ['deslizamento', 'áreas de risco', 'moradia', 'chuvas', 'prevenção', 'habitação popular', 'defesa civil'] },
  { axis: 'Meio ambiente', title: 'A poluição sonora e seus efeitos na saúde da população urbana', texts: [
    'O ruído constante do trânsito, de obras e de estabelecimentos afeta o sono e a concentração.',
    'A exposição prolongada está associada a estresse, hipertensão e perda auditiva.',
    'Moradores de áreas mais pobres costumam ter menos proteção contra o barulho, e a fiscalização é desigual.',
  ], words: ['poluição sonora', 'ruído', 'saúde', 'cidades', 'estresse', 'fiscalização', 'qualidade de vida'] },
  { axis: 'Meio ambiente', title: 'As queimadas e a saúde respiratória de crianças e idosos', texts: [
    'Em períodos de seca, a fumaça de queimadas reduz a qualidade do ar em cidades distantes dos focos de fogo.',
    'Crianças e idosos são mais sensíveis e sofrem mais com doenças respiratórias.',
    'A prevenção do fogo é também uma questão de saúde pública.',
  ], words: ['queimadas', 'qualidade do ar', 'saúde respiratória', 'crianças', 'idosos', 'prevenção', 'desmatamento'] },

  // ===== EDUCAÇÃO (13) =====
  { axis: 'Educação', title: 'A evasão escolar de meninas decorrente da gravidez na adolescência', texts: [
    'A gravidez precoce leva muitas adolescentes a interromperem os estudos.',
    'A responsabilidade pelo cuidado dos filhos recai quase sempre sobre elas, o que limita as chances de retorno.',
    'Educação sexual nas escolas e apoio à permanência das jovens mães são medidas importantes.',
  ], words: ['gravidez na adolescência', 'evasão escolar', 'educação sexual', 'meninas', 'permanência', 'desigualdade de gênero', 'futuro'] },
  { axis: 'Educação', title: 'O apoio insuficiente a estudantes com TDAH e dislexia nas escolas', texts: [
    'Transtornos de aprendizagem e de atenção afetam o desempenho escolar e podem ser confundidos com falta de esforço.',
    'Muitas escolas não têm profissionais capacitados nem recursos para adaptar o ensino.',
    'A inclusão efetiva depende de diagnóstico, formação docente e metodologias flexíveis.',
  ], words: ['TDAH', 'dislexia', 'inclusão', 'formação docente', 'aprendizagem', 'diagnóstico', 'adaptação'] },
  { axis: 'Educação', title: 'Os desafios da educação bilíngue para estudantes surdos', texts: [
    'A educação de surdos no Brasil deve considerar a Libras como primeira língua e o português como segunda.',
    'Na prática, muitos estudantes frequentam salas sem intérpretes ou professores fluentes em Libras.',
    'A falta de comunicação adequada compromete a alfabetização e o aprendizado.',
  ], words: ['educação bilíngue', 'Libras', 'surdos', 'intérprete', 'alfabetização', 'inclusão', 'escola'] },
  { axis: 'Educação', title: 'A educação no sistema prisional como caminho de reinserção', texts: [
    'Parte das pessoas privadas de liberdade tem baixa escolaridade e pouca formação profissional.',
    'Estudar na prisão pode reduzir a pena, por meio da remição, e ampliar as chances de emprego após a saída.',
    'A superlotação e a falta de estrutura, porém, limitam a oferta de vagas em cursos.',
  ], words: ['sistema prisional', 'remição', 'reinserção', 'escolaridade', 'ressocialização', 'oportunidade', 'direitos'] },
  { axis: 'Educação', title: 'O bullying contra estudantes LGBTQIAPN+ e a permanência na escola', texts: [
    'Estudantes LGBTQIAPN+ relatam agressões verbais e físicas no ambiente escolar.',
    'O medo e a discriminação levam à queda do rendimento e, em alguns casos, ao abandono dos estudos.',
    'Escolas acolhedoras e formação de professores ajudam a garantir o direito à educação a todos.',
  ], words: ['bullying', 'LGBTQIAPN+', 'discriminação', 'escola', 'acolhimento', 'respeito', 'evasão'] },
  { axis: 'Educação', title: 'O fechamento de escolas rurais e o distanciamento de estudantes do campo', texts: [
    'Milhares de escolas no campo foram fechadas nas últimas décadas, e os estudantes passaram a viajar longas distâncias.',
    'O transporte precário e a distância dificultam a frequência, sobretudo em períodos de chuva.',
    'A educação do campo busca respeitar a realidade e os saberes das comunidades rurais.',
  ], words: ['escola rural', 'educação do campo', 'transporte escolar', 'distância', 'comunidade', 'acesso', 'evasão'] },
  { axis: 'Educação', title: 'A invisibilidade de estudantes com altas habilidades e superdotação', texts: [
    'Estudantes com altas habilidades têm necessidades educacionais específicas, assim como outros públicos da educação especial.',
    'A falta de identificação pode levar ao desinteresse, ao isolamento e ao baixo rendimento.',
    'Poucas escolas contam com programas de enriquecimento e professores preparados para atendê-los.',
  ], words: ['superdotação', 'altas habilidades', 'educação especial', 'identificação', 'desinteresse', 'formação', 'inclusão'] },
  { axis: 'Educação', title: 'A permanência estudantil de cotistas nas universidades públicas', texts: [
    'As cotas ampliaram o acesso de estudantes negros, indígenas e de escolas públicas ao ensino superior.',
    'Garantir o ingresso, porém, não basta: custos com moradia, transporte e alimentação ameaçam a conclusão do curso.',
    'Programas de bolsas e assistência estudantil são decisivos para evitar o abandono.',
  ], words: ['cotas', 'permanência estudantil', 'ensino superior', 'assistência', 'desigualdade', 'bolsas', 'democratização'] },
  { axis: 'Educação', title: 'A matrícula de filhos de imigrantes e refugiados nas escolas brasileiras', texts: [
    'Crianças imigrantes têm direito à matrícula, mesmo sem documentação completa.',
    'A barreira do idioma e a falta de acolhimento podem gerar isolamento e atraso no aprendizado.',
    'Ensinar português como língua de acolhimento e valorizar a diversidade cultural fortalece a integração.',
  ], words: ['imigrantes', 'refugiados', 'matrícula', 'idioma', 'acolhimento', 'diversidade cultural', 'integração'] },
  { axis: 'Educação', title: 'A insegurança alimentar e o papel da merenda escolar', texts: [
    'Para muitos estudantes, a refeição servida na escola é a principal ou a única do dia.',
    'A fome prejudica a concentração, a saúde e a permanência na sala de aula.',
    'O Programa Nacional de Alimentação Escolar também incentiva a compra de alimentos da agricultura familiar.',
  ], words: ['merenda escolar', 'fome', 'segurança alimentar', 'aprendizagem', 'PNAE', 'agricultura familiar', 'permanência'] },
  { axis: 'Educação', title: 'Os estudantes-trabalhadores e a dificuldade de conciliar estudo e emprego', texts: [
    'Muitos jovens precisam trabalhar para ajudar a família e estudam no período noturno, após a jornada de trabalho.',
    'O cansaço e a falta de tempo reduzem o rendimento e aumentam o risco de abandono.',
    'Flexibilizar horários e oferecer apoio pode ajudar esses estudantes a concluir os estudos.',
  ], words: ['trabalho e estudo', 'ensino noturno', 'jovens', 'abandono', 'renda', 'flexibilização', 'desigualdade'] },
  { axis: 'Educação', title: 'A educação de jovens e adultos e o direito de aprender fora da idade esperada', texts: [
    'Milhões de brasileiros adultos não concluíram a educação básica por precisarem trabalhar ou por falta de escola.',
    'A educação de jovens e adultos é um direito, mas as matrículas vêm diminuindo.',
    'Estratégias que respeitem a experiência de vida dos alunos ajudam a mantê-los na sala de aula.',
  ], words: ['EJA', 'analfabetismo', 'educação básica', 'direito', 'adultos', 'oportunidade', 'reinserção'] },
  { axis: 'Educação', title: 'A formação de professores para lidar com a diversidade nas salas de aula', texts: [
    'Salas de aula reúnem estudantes com realidades, culturas e necessidades muito diferentes.',
    'Docentes relatam falta de formação para lidar com temas como inclusão, racismo e saúde mental.',
    'Investir em formação continuada e em valorização da carreira é essencial para uma escola mais justa.',
  ], words: ['formação docente', 'diversidade', 'inclusão', 'valorização', 'professores', 'escola', 'qualidade'] },

  // ===== CIDADANIA (13) =====
  { axis: 'Cidadania', title: 'A falta de documentação civil e a invisibilidade social de brasileiros', texts: [
    'Milhares de pessoas ainda vivem sem certidão de nascimento ou outros documentos básicos.',
    'Sem registro, ficam fora de programas sociais, do sistema de saúde e do mercado de trabalho formal.',
    'Mutirões de documentação e a simplificação de processos buscam garantir o direito à identidade.',
  ], words: ['documentação', 'certidão de nascimento', 'cidadania', 'invisibilidade', 'direitos', 'registro civil', 'acesso'] },
  { axis: 'Cidadania', title: 'A violência obstétrica e o desrespeito à autonomia da mulher no parto', texts: [
    'Procedimentos feitos sem consentimento, xingamentos e negação de acompanhante configuram violência obstétrica.',
    'Muitas mulheres só percebem que sofreram violência depois do parto.',
    'Informação sobre direitos e humanização do atendimento são caminhos para enfrentar o problema.',
  ], words: ['violência obstétrica', 'parto', 'autonomia', 'consentimento', 'humanização', 'direitos', 'mulheres'] },
  { axis: 'Cidadania', title: 'Os despejos forçados e o direito à moradia digna', texts: [
    'Famílias de baixa renda enfrentam ameaças de despejo em ocupações e imóveis alugados.',
    'A perda da casa afeta o emprego, a escola das crianças e a saúde de todos.',
    'O direito à moradia é garantido pela Constituição, mas depende de políticas habitacionais efetivas.',
  ], words: ['despejo', 'moradia', 'direito', 'habitação', 'ocupação', 'família', 'política pública'] },
  { axis: 'Cidadania', title: 'O abandono de pessoas idosas em instituições de longa permanência', texts: [
    'Muitos idosos vivem em abrigos e asilos, em alguns casos sem visitas ou contato com familiares.',
    'O abandono afetivo e a falta de estrutura adequada podem agravar problemas de saúde.',
    'O Estatuto da Pessoa Idosa prevê o dever da família, da sociedade e do Estado de assegurar o cuidado.',
  ], words: ['idosos', 'abandono afetivo', 'ILPI', 'cuidado', 'família', 'Estatuto da Pessoa Idosa', 'dignidade'] },
  { axis: 'Cidadania', title: 'Os obstáculos de acesso à Justiça para a população de baixa renda', texts: [
    'Quem não pode pagar um advogado depende da Defensoria Pública, que ainda não está presente em todas as comarcas.',
    'A linguagem jurídica complexa e a demora dos processos afastam o cidadão comum da Justiça.',
    'Ampliar a defensoria e informar a população sobre seus direitos é parte da construção da cidadania.',
  ], words: ['acesso à Justiça', 'Defensoria Pública', 'direitos', 'desigualdade', 'cidadania', 'linguagem jurídica', 'assistência'] },
  { axis: 'Cidadania', title: 'Os órfãos do feminicídio e a proteção de crianças que perdem a mãe', texts: [
    'Quando uma mulher é assassinada pelo companheiro, os filhos perdem a mãe e, muitas vezes, também o pai, que é preso.',
    'Essas crianças enfrentam trauma, mudança de lar e dificuldades financeiras.',
    'A legislação prevê pensão especial, mas a rede de apoio psicossocial ainda é limitada.',
  ], words: ['feminicídio', 'órfãos', 'proteção', 'pensão especial', 'trauma', 'rede de apoio', 'violência de gênero'] },
  { axis: 'Cidadania', title: 'A reinserção social de egressos do sistema prisional', texts: [
    'Ao deixarem a prisão, muitas pessoas enfrentam preconceito e dificuldade de conseguir emprego.',
    'Sem oportunidades, o risco de retorno ao crime aumenta.',
    'Programas de capacitação e parcerias com empresas ajudam na reintegração à sociedade.',
  ], words: ['egressos', 'reinserção', 'preconceito', 'emprego', 'reincidência', 'ressocialização', 'oportunidade'] },
  { axis: 'Cidadania', title: 'A maternidade no cárcere e os direitos de mulheres presas e de seus filhos', texts: [
    'Mulheres presas gestantes ou com filhos pequenos enfrentam condições que nem sempre respeitam suas necessidades básicas.',
    'A convivência entre mães e bebês é importante para o desenvolvimento da criança.',
    'Alternativas à prisão em casos específicos buscam proteger a infância.',
  ], words: ['mulheres presas', 'maternidade', 'cárcere', 'infância', 'direitos', 'prisão domiciliar', 'vínculo'] },
  { axis: 'Cidadania', title: 'Os adolescentes em medidas socioeducativas e a promessa de ressocialização', texts: [
    'Adolescentes que cometem atos infracionais devem cumprir medidas voltadas à educação, e não apenas à punição.',
    'Unidades superlotadas e sem atividades pedagógicas comprometem esse objetivo.',
    'O debate sobre juventude e violência exige olhar para a falta de oportunidades que antecede o ato infracional.',
  ], words: ['socioeducação', 'adolescentes', 'ressocialização', 'ECA', 'juventude', 'violência', 'oportunidades'] },
  { axis: 'Cidadania', title: 'A intolerância religiosa contra religiões de matriz africana', texts: [
    'Terreiros e praticantes de religiões como o candomblé e a umbanda sofrem ataques e discriminação.',
    'A Constituição garante a liberdade religiosa, mas o preconceito persiste, muitas vezes ligado ao racismo.',
    'Combater a intolerância envolve educação, respeito à diversidade e responsabilização dos agressores.',
  ], words: ['intolerância religiosa', 'candomblé', 'umbanda', 'racismo religioso', 'liberdade de crença', 'diversidade', 'respeito'] },
  { axis: 'Cidadania', title: 'A mobilidade urbana e as barreiras enfrentadas por pessoas com deficiência', texts: [
    'Calçadas esburacadas, ônibus sem acessibilidade e falta de sinalização limitam a circulação de pessoas com deficiência.',
    'Sem poder se deslocar, elas encontram dificuldade de estudar, trabalhar e usufruir do lazer.',
    'A acessibilidade deve ser prevista no planejamento das cidades, e não tratada como exceção.',
  ], words: ['mobilidade urbana', 'acessibilidade', 'deficiência', 'calçadas', 'transporte', 'direito de ir e vir', 'cidades'] },
  { axis: 'Cidadania', title: 'O acolhimento de migrantes venezuelanos e os desafios da integração', texts: [
    'O Brasil recebeu milhares de venezuelanos que deixaram seu país em busca de segurança e melhores condições de vida.',
    'A chegada em estados com poucos recursos, como Roraima, sobrecarrega serviços públicos e gera tensões locais.',
    'Programas de interiorização buscam distribuir os migrantes e facilitar sua inserção no mercado de trabalho.',
  ], words: ['migração', 'venezuelanos', 'acolhimento', 'interiorização', 'xenofobia', 'integração', 'serviços públicos'] },
  { axis: 'Cidadania', title: 'A discriminação contra pessoas com HIV e o direito ao sigilo', texts: [
    'Mesmo com tratamento eficaz e gratuito, pessoas que vivem com HIV ainda enfrentam estigma no trabalho e nas relações.',
    'O medo da exposição pode atrasar o diagnóstico e o início do tratamento.',
    'Informação de qualidade e respeito ao sigilo são essenciais para combater o preconceito.',
  ], words: ['HIV', 'estigma', 'sigilo', 'preconceito', 'tratamento', 'informação', 'direitos'] },

  // ===== CULTURA (12) =====
  { axis: 'Cultura', title: 'A valorização dos mestres e mestras da cultura popular', texts: [
    'Mestres e mestras mantêm vivas tradições como danças, cantos e ofícios transmitidos entre gerações.',
    'Muitos vivem em situação de vulnerabilidade, sem reconhecimento ou aposentadoria adequada.',
    'Políticas de registro e incentivo ao patrimônio imaterial buscam preservar esses saberes.',
  ], words: ['cultura popular', 'patrimônio imaterial', 'mestres', 'tradição', 'valorização', 'saberes', 'preservação'] },
  { axis: 'Cultura', title: 'A criminalização de manifestações culturais das periferias', texts: [
    'Ritmos e eventos como o funk e os bailes são, por vezes, associados ao crime e alvo de repressão.',
    'Essa visão ignora o papel dessas expressões como forma de lazer, identidade e renda para jovens periféricos.',
    'O debate envolve preconceito de classe e de raça sobre o que é considerado cultura legítima.',
  ], words: ['cultura periférica', 'funk', 'preconceito', 'juventude', 'criminalização', 'identidade', 'lazer'] },
  { axis: 'Cultura', title: 'O papel das bibliotecas comunitárias na formação de leitores', texts: [
    'Em regiões sem livrarias ou bibliotecas públicas, iniciativas comunitárias levam livros a crianças e adultos.',
    'Muitas dependem do trabalho voluntário e de doações para continuar funcionando.',
    'O incentivo à leitura contribui para a educação e para o exercício da cidadania.',
  ], words: ['bibliotecas comunitárias', 'leitura', 'livros', 'educação', 'voluntariado', 'acesso', 'cidadania'] },
  { axis: 'Cultura', title: 'A invisibilidade do trabalho das artesãs na economia da cultura', texts: [
    'Artesãs produzem peças que carregam história e identidade de suas comunidades.',
    'O trabalho costuma ser mal remunerado e tratado como complemento de renda, não como profissão.',
    'Valorizar o artesanato é reconhecer o saber tradicional e fortalecer a economia local.',
  ], words: ['artesanato', 'mulheres', 'trabalho', 'identidade', 'economia criativa', 'valorização', 'renda'] },
  { axis: 'Cultura', title: 'A representatividade de pessoas com deficiência na mídia', texts: [
    'Pessoas com deficiência aparecem pouco na televisão, no cinema e na publicidade, e frequentemente de forma estereotipada.',
    'A ausência reforça a ideia de que essas pessoas são incapazes ou dignas de pena.',
    'Maior participação em produções, dentro e fora das câmeras, ajuda a mudar essa imagem.',
  ], words: ['representatividade', 'deficiência', 'mídia', 'estereótipo', 'capacitismo', 'inclusão', 'visibilidade'] },
  { axis: 'Cultura', title: 'Os trabalhadores invisíveis por trás das grandes festas populares', texts: [
    'Festas como o Carnaval e o Boi-Bumbá movimentam a economia e o turismo.',
    'Costureiras, ambulantes, marceneiros e catadores trabalham em condições precárias e nem sempre recebem o devido reconhecimento.',
    'O valor cultural dessas festas depende também desses profissionais.',
  ], words: ['festas populares', 'Carnaval', 'trabalhadores', 'economia', 'reconhecimento', 'turismo', 'informalidade'] },
  { axis: 'Cultura', title: 'A gentrificação e a perda de identidade de bairros históricos', texts: [
    'A valorização imobiliária de regiões antigas pode expulsar moradores e comerciantes tradicionais.',
    'Com a mudança do perfil do bairro, hábitos, festas e vínculos comunitários vão desaparecendo.',
    'Políticas de preservação precisam proteger também as pessoas que dão vida ao patrimônio.',
  ], words: ['gentrificação', 'bairro', 'patrimônio', 'especulação imobiliária', 'identidade', 'comunidade', 'cidade'] },
  { axis: 'Cultura', title: 'A literatura de cordel como patrimônio e meio de informação popular', texts: [
    'O cordel, tradição forte no Nordeste, conta histórias em versos e circula em folhetos de baixo custo.',
    'Reconhecido como patrimônio cultural, ele enfrenta dificuldade de renovação de leitores e de poetas.',
    'Levar o cordel às escolas é uma forma de aproximar os jovens de sua própria cultura.',
  ], words: ['cordel', 'Nordeste', 'patrimônio cultural', 'oralidade', 'tradição', 'escola', 'literatura popular'] },
  { axis: 'Cultura', title: 'A cultura surda e o reconhecimento da identidade linguística', texts: [
    'Para muitas pessoas surdas, a surdez não é apenas uma deficiência, mas uma identidade cultural com língua própria.',
    'A Libras é reconhecida por lei, mas ainda é pouco conhecida pela população ouvinte.',
    'Valorizar essa cultura exige respeito à língua e participação dos surdos nas decisões que os afetam.',
  ], words: ['cultura surda', 'Libras', 'identidade', 'língua', 'respeito', 'diversidade', 'inclusão'] },
  { axis: 'Cultura', title: 'O etarismo na mídia e a invisibilidade do envelhecimento feminino', texts: [
    'Atrizes e apresentadoras mais velhas têm menos espaço na mídia do que seus colegas homens.',
    'A pressão por manter a aparência jovem reforça padrões de beleza inalcançáveis.',
    'Dar visibilidade a mulheres de diferentes idades ajuda a combater o preconceito contra o envelhecimento.',
  ], words: ['etarismo', 'envelhecimento', 'mulheres', 'mídia', 'padrão de beleza', 'preconceito', 'visibilidade'] },
  { axis: 'Cultura', title: 'O assédio contra mulheres no universo dos jogos eletrônicos', texts: [
    'Jogadoras relatam ofensas e ameaças em partidas online, o que as leva a esconder a identidade ou abandonar os jogos.',
    'Esse ambiente reforça a ideia equivocada de que o universo gamer é exclusivamente masculino.',
    'Moderação eficiente e campanhas de respeito contribuem para espaços mais seguros.',
  ], words: ['jogos eletrônicos', 'assédio', 'mulheres', 'machismo', 'moderação', 'respeito', 'comunidade online'] },
  { axis: 'Cultura', title: 'O preconceito contra os povos ciganos e a negação de sua cultura', texts: [
    'Os povos ciganos vivem no Brasil há séculos, mas ainda são alvo de estereótipos e discriminação.',
    'Muitas famílias enfrentam dificuldade de acesso a documentos, escola e saúde por causa do nomadismo e do preconceito.',
    'Conhecer a história e a cultura desse povo é um passo para combater a intolerância.',
  ], words: ['povos ciganos', 'preconceito', 'estereótipo', 'cultura', 'nomadismo', 'direitos', 'diversidade'] },

  // ===== TRABALHO (13) =====
  { axis: 'Trabalho', title: 'Os direitos das trabalhadoras domésticas e a desigualdade histórica', texts: [
    'O trabalho doméstico no Brasil é exercido, em sua maioria, por mulheres negras e de baixa renda.',
    'Apesar de avanços legais, muitas ainda trabalham sem carteira assinada e sem proteção social.',
    'A desvalorização dessa atividade reflete heranças do passado escravista.',
  ], words: ['trabalho doméstico', 'direitos', 'informalidade', 'mulheres negras', 'desigualdade', 'carteira assinada', 'valorização'] },
  { axis: 'Trabalho', title: 'O trabalho infantil em feiras, lavouras e no comércio familiar', texts: [
    'Muitas crianças ajudam a família na venda de produtos e no trabalho agrícola, o que muitas vezes é visto como algo natural.',
    'A atividade prejudica os estudos e expõe a riscos para a saúde e a segurança.',
    'Combater o problema envolve mudar a cultura e garantir renda mínima às famílias.',
  ], words: ['trabalho infantil', 'infância', 'educação', 'pobreza', 'cultura', 'proteção', 'fiscalização'] },
  { axis: 'Trabalho', title: 'A persistência do trabalho análogo à escravidão no Brasil contemporâneo', texts: [
    'Trabalhadores são encontrados em condições degradantes, com jornadas exaustivas e dívidas impostas pelo empregador.',
    'A situação ocorre no campo e também nas cidades, em setores como a construção civil e a confecção.',
    'A fiscalização e a punição de empregadores são essenciais, mas a vulnerabilidade econômica das vítimas dificulta as denúncias.',
  ], words: ['trabalho escravo', 'fiscalização', 'dignidade', 'vulnerabilidade', 'denúncia', 'direitos humanos', 'exploração'] },
  { axis: 'Trabalho', title: 'Os jovens que não estudam nem trabalham e a perda de perspectivas', texts: [
    'Uma parcela significativa de jovens brasileiros não está estudando nem empregada.',
    'A situação atinge mais mulheres, que muitas vezes assumem o cuidado de filhos e da casa.',
    'Programas de qualificação e primeiro emprego podem abrir novas oportunidades.',
  ], words: ['jovens', 'desemprego', 'qualificação', 'primeiro emprego', 'desigualdade de gênero', 'perspectiva', 'políticas públicas'] },
  { axis: 'Trabalho', title: 'O etarismo no mercado de trabalho e a exclusão de profissionais acima de 50 anos', texts: [
    'Profissionais mais velhos relatam dificuldade de recolocação, mesmo com experiência.',
    'Com o aumento da expectativa de vida, muitos precisam seguir trabalhando para complementar a renda.',
    'Empresas com equipes diversas em idade tendem a se beneficiar da troca de saberes entre gerações.',
  ], words: ['etarismo', 'mercado de trabalho', 'experiência', 'recolocação', 'envelhecimento', 'diversidade', 'gerações'] },
  { axis: 'Trabalho', title: 'A inserção de pessoas trans no mercado de trabalho formal', texts: [
    'Pessoas trans enfrentam preconceito em processos seletivos e, por isso, têm altas taxas de informalidade.',
    'Muitas abandonam a escola cedo por causa da discriminação, o que limita a qualificação.',
    'Programas de empregabilidade e ambientes de trabalho acolhedores ampliam as oportunidades.',
  ], words: ['pessoas trans', 'empregabilidade', 'preconceito', 'informalidade', 'diversidade', 'inclusão', 'oportunidade'] },
  { axis: 'Trabalho', title: 'Mães solo e a dificuldade de conciliar o trabalho e o cuidado dos filhos', texts: [
    'Milhões de famílias brasileiras são chefiadas por mulheres que criam os filhos sem a presença do pai.',
    'A falta de creches e de apoio dificulta a manutenção de empregos estáveis.',
    'A sobrecarga ressalta a desigualdade na divisão das responsabilidades familiares.',
  ], words: ['mães solo', 'creche', 'sobrecarga', 'desigualdade de gênero', 'renda', 'cuidado', 'família'] },
  { axis: 'Trabalho', title: 'O cumprimento da cota para pessoas com deficiência nas empresas', texts: [
    'A lei exige que empresas de determinado porte contratem pessoas com deficiência.',
    'Em muitos casos, as vagas são oferecidas em cargos de baixa qualificação e sem plano de carreira.',
    'Inclusão efetiva exige acessibilidade, capacitação e mudança da cultura organizacional.',
  ], words: ['Lei de Cotas', 'deficiência', 'inclusão', 'empresas', 'acessibilidade', 'carreira', 'capacitismo'] },
  { axis: 'Trabalho', title: 'O adoecimento mental de trabalhadores e a síndrome de burnout', texts: [
    'Jornadas longas, metas excessivas e a conectividade permanente favorecem o esgotamento profissional.',
    'O burnout foi reconhecido pela Organização Mundial da Saúde como um fenômeno ligado ao trabalho.',
    'Empresas e governos precisam repensar a organização do trabalho para proteger a saúde dos profissionais.',
  ], words: ['burnout', 'saúde mental', 'jornada de trabalho', 'estresse', 'produtividade', 'bem-estar', 'direitos trabalhistas'] },
  { axis: 'Trabalho', title: 'Os riscos de acidentes enfrentados por entregadores de aplicativos', texts: [
    'Entregadores circulam em motos e bicicletas sob pressão por rapidez, aumentando o risco de acidentes no trânsito.',
    'Sem vínculo formal, muitos ficam sem proteção em caso de afastamento ou lesão.',
    'O tema envolve segurança no trânsito e a discussão sobre a regulamentação da atividade.',
  ], words: ['entregadores', 'acidentes', 'trânsito', 'proteção social', 'regulamentação', 'pressão', 'segurança'] },
  { axis: 'Trabalho', title: 'A informalidade e a insegurança de vendedores ambulantes nas cidades', texts: [
    'Ambulantes garantem o sustento de milhares de famílias, mas trabalham sem direitos e sob risco de apreensão de mercadorias.',
    'A falta de contribuição à Previdência deixa muitos sem proteção na velhice.',
    'Políticas de formalização e espaços regulamentados podem equilibrar o uso do espaço urbano e a geração de renda.',
  ], words: ['ambulantes', 'informalidade', 'Previdência', 'renda', 'espaço urbano', 'formalização', 'direitos'] },
  { axis: 'Trabalho', title: 'O valor invisível do trabalho de cuidado não remunerado realizado por mulheres', texts: [
    'Mulheres dedicam, em média, mais horas por semana ao cuidado da casa e de familiares do que os homens.',
    'Esse trabalho não é contabilizado na economia, mas sustenta o funcionamento da sociedade.',
    'A divisão desigual limita as oportunidades de estudo, emprego e lazer das mulheres.',
  ], words: ['trabalho de cuidado', 'divisão sexual do trabalho', 'mulheres', 'desigualdade', 'economia do cuidado', 'tempo', 'igualdade'] },
  { axis: 'Trabalho', title: 'A revalidação de diplomas e o desperdício de talentos de refugiados', texts: [
    'Muitos refugiados chegam ao Brasil com formação superior, mas não conseguem exercer a profissão.',
    'O processo de revalidação de diplomas é caro, burocrático e demorado.',
    'Sem reconhecimento, profissionais qualificados acabam em empregos de baixa remuneração.',
  ], words: ['refugiados', 'revalidação de diploma', 'burocracia', 'qualificação', 'integração', 'trabalho', 'oportunidade'] },

  // ===== ECONOMIA (12) =====
  { axis: 'Economia', title: 'O superendividamento de aposentados e pensionistas pelo crédito consignado', texts: [
    'O crédito consignado, descontado direto do benefício, é oferecido de forma agressiva a idosos.',
    'Muitos contratam empréstimos sem compreender as taxas e acabam comprometendo boa parte da renda.',
    'A educação financeira e a fiscalização das instituições são formas de proteger esse público.',
  ], words: ['superendividamento', 'consignado', 'idosos', 'aposentadoria', 'educação financeira', 'juros', 'proteção ao consumidor'] },
  { axis: 'Economia', title: 'Os desertos alimentares e o acesso desigual a alimentos saudáveis', texts: [
    'Em muitas periferias e regiões rurais, é difícil encontrar mercados com frutas, verduras e legumes frescos.',
    'A oferta concentrada em alimentos ultraprocessados está ligada a obesidade e outras doenças.',
    'Feiras, hortas comunitárias e políticas de abastecimento ajudam a reduzir o problema.',
  ], words: ['desertos alimentares', 'alimentação saudável', 'periferia', 'ultraprocessados', 'hortas comunitárias', 'abastecimento', 'desigualdade'] },
  { axis: 'Economia', title: 'O peso do aluguel no orçamento de famílias de baixa renda', texts: [
    'Em grandes cidades, o aluguel consome grande parte da renda de trabalhadores de menor salário.',
    'O encarecimento da moradia leva muitas famílias a se afastarem dos centros, longe do emprego e de serviços.',
    'O debate envolve ampliação da oferta de habitação popular e regras para o mercado de locação.',
  ], words: ['aluguel', 'moradia', 'orçamento', 'habitação popular', 'desigualdade', 'cidades', 'custo de vida'] },
  { axis: 'Economia', title: 'A taxa rosa e o preço mais alto de produtos voltados às mulheres', texts: [
    'Produtos semelhantes, como lâminas e cosméticos, às vezes custam mais quando são vendidos para o público feminino.',
    'Esse fenômeno, chamado de taxa rosa, pesa ainda mais num cenário em que as mulheres ganham menos em média.',
    'Transparência nos preços e consciência do consumidor ajudam a reduzir a prática.',
  ], words: ['taxa rosa', 'consumo', 'mulheres', 'desigualdade salarial', 'preços', 'direito do consumidor', 'gênero'] },
  { axis: 'Economia', title: 'Os microempreendedores das periferias e os limites do empreendedorismo por necessidade', texts: [
    'Muitos moradores de periferias abrem pequenos negócios por falta de emprego formal.',
    'A falta de crédito, de orientação e de proteção social torna esses negócios frágeis.',
    'O apoio ao empreendedorismo local precisa ser acompanhado de políticas de qualificação e financiamento.',
  ], words: ['microempreendedor', 'periferia', 'crédito', 'informalidade', 'empreendedorismo', 'qualificação', 'renda'] },
  { axis: 'Economia', title: 'O cooperativismo como alternativa de geração de renda para grupos vulneráveis', texts: [
    'Cooperativas permitem que trabalhadores se organizem coletivamente para produzir e vender.',
    'Experiências com catadores, agricultores e costureiras mostram o potencial da economia solidária.',
    'A falta de apoio técnico e de crédito, porém, limita o crescimento desses grupos.',
  ], words: ['cooperativismo', 'economia solidária', 'geração de renda', 'coletivo', 'autonomia', 'crédito', 'trabalho'] },
  { axis: 'Economia', title: 'A aposentadoria de trabalhadores informais e a desproteção na velhice', texts: [
    'Quem trabalha sem carteira assinada e não contribui para a Previdência pode chegar à velhice sem renda garantida.',
    'Mulheres e trabalhadores de baixa renda são os mais afetados.',
    'Ampliar a proteção previdenciária é um desafio diante do aumento da população idosa.',
  ], words: ['Previdência', 'informalidade', 'aposentadoria', 'velhice', 'proteção social', 'contribuição', 'envelhecimento'] },
  { axis: 'Economia', title: 'A pobreza energética e o custo da energia para famílias de baixa renda', texts: [
    'Famílias pobres gastam proporcionalmente mais com energia elétrica e, em alguns casos, usam lenha ou gás de forma insegura.',
    'O aumento das tarifas reduz a renda disponível e pode levar ao corte do serviço.',
    'A tarifa social e o incentivo a fontes renováveis são alternativas para reduzir o problema.',
  ], words: ['pobreza energética', 'tarifa social', 'energia elétrica', 'renda', 'desigualdade', 'renováveis', 'consumo'] },
  { axis: 'Economia', title: 'O custo do transporte público no orçamento de trabalhadores das periferias', texts: [
    'Trabalhadores que moram longe do centro gastam parte importante do salário e muitas horas em deslocamentos.',
    'O alto custo das passagens limita o acesso a emprego, estudo e lazer.',
    'Propostas como a tarifa zero e o subsídio ao transporte entram no debate sobre mobilidade e justiça social.',
  ], words: ['transporte público', 'tarifa', 'periferia', 'mobilidade urbana', 'subsídio', 'tarifa zero', 'desigualdade'] },
  { axis: 'Economia', title: 'A educação financeira como lacuna na formação de jovens brasileiros', texts: [
    'Muitos jovens entram na vida adulta sem aprender a lidar com orçamento, crédito e investimentos.',
    'A facilidade de compras parceladas e de cartões estimula o consumo sem planejamento.',
    'Incluir o tema nas escolas pode ajudar a prevenir o endividamento e promover decisões mais conscientes.',
  ], words: ['educação financeira', 'jovens', 'endividamento', 'consumo', 'planejamento', 'escola', 'cartão de crédito'] },
  { axis: 'Economia', title: 'O acesso ao crédito para pequenos agricultores familiares', texts: [
    'Programas como o Pronaf oferecem financiamento a juros menores para a agricultura familiar.',
    'A burocracia e a exigência de garantias dificultam o acesso de agricultores mais pobres e distantes.',
    'Sem crédito, as famílias têm dificuldade de investir em tecnologia e aumentar a produção.',
  ], words: ['agricultura familiar', 'crédito rural', 'Pronaf', 'burocracia', 'produção', 'campo', 'desenvolvimento'] },
  { axis: 'Economia', title: 'O custo extra de viver com deficiência e a falta de apoio financeiro', texts: [
    'Pessoas com deficiência costumam ter gastos adicionais com saúde, transporte e adaptações.',
    'Ao mesmo tempo, enfrentam maiores taxas de desemprego e renda mais baixa.',
    'Benefícios como o BPC ajudam, mas critérios rígidos deixam muitas famílias de fora.',
  ], words: ['deficiência', 'BPC', 'custo', 'renda', 'proteção social', 'desigualdade', 'direitos'] },
];




// ---------- corretor local ----------
const SPELL: Record<string, string> = {
  concerteza: 'com certeza', derrepente: 'de repente', apartir: 'a partir', porisso: 'por isso', excessão: 'exceção', previlégio: 'privilégio',
  menas: 'menos', seje: 'seja', esteje: 'esteja', opnião: 'opinião', beneficiente: 'beneficente', impecílio: 'empecilho', paralizar: 'paralisar',
  atravéz: 'através', enchergar: 'enxergar', cidadões: 'cidadãos', mendingo: 'mendigo', asterístico: 'asterisco', cabeleleiro: 'cabeleireiro',
  mortandela: 'mortadela', previnir: 'prevenir', iorgute: 'iogurte', exitar: 'hesitar',
};
const INFORMAL: [RegExp, string, string][] = [
  [/\ba gente\b/gi, 'a sociedade', 'Expressão informal. Na norma culta, prefira "nós" ou um sujeito específico.'],
  [/\bpra\b/gi, 'para', 'Redução da fala. Use "para".'],
  [/\btá\b/gi, 'está', 'Redução da fala. Use "está".'],
  [/\bnéh?\b/gi, '', 'Marca de oralidade. Retire.'],
  [/\btipo assim\b/gi, '', 'Marca de oralidade. Retire.'],
  [/\b(?:hoje em dia|nos dias de hoje)\b/gi, 'na contemporaneidade', 'Clichê. Contextualize com um dado ou fato.'],
];
const VAGUE: [RegExp, string, string][] = [
  [/\bmuito importante\b/gi, 'fundamental', 'Adjetivo genérico. Um termo mais preciso fortalece a argumentação.'],
  [/\buma coisa\b/gi, 'um fator', '"Coisa" é vago. Nomeie o conceito.'],
  [/\binteressante\b/gi, 'relevante', 'Avaliação vaga. Diga por que é relevante.'],
];
const SYN: Record<string, string> = { idosos: 'essa parcela da população', problema: 'entrave', importante: 'relevante', sociedade: 'coletividade', pessoas: 'indivíduos', governo: 'poder público', situação: 'cenário', brasil: 'país' };
const STOP = new Set('sobre entre quando porque também ainda muito mesmo assim sendo forma maior todos todas cada sempre apenas outro outra outros outras estão sobre desse dessa disso nesse nessa nisso aquele aquela pelos pelas'.split(' '));
const GOOD_CONN = /\b(contudo|entretanto|todavia|no entanto|portanto|além disso|dessa forma|desse modo|nesse sentido|em primeiro lugar|em segundo lugar|por conseguinte|ademais|assim sendo|logo|sob esse viés)\b/gi;
const CAUSE = /\b(pois|porque|já que|visto que|uma vez que|devido a|em virtude de)\b/gi;
const REPERTOIRE = /\b(constitui[çc][ãa]o|segundo [A-ZÀ-Ú]\w+|de acordo com|conforme|IBGE|OMS|ONU|fil[óo]sofo|soci[óo]log[oa]|lei (?:n|maria)|declara[çc][ãa]o universal)/gi;
const AGENT = /\b(governo|minist[ée]rio|estado|poder p[úu]blico|prefeituras?|escolas?|m[íi]dia|ONGs?|fam[íi]lias?|sociedade civil|congresso)\b/i;
const ACTION = /\b(deve|devem|cabe|precisa|é necess[áa]rio|criar|promover|ampliar|implementar)\b/i;
const MEANS = /\b(por meio d[eoa]s?|mediante|atrav[ée]s d[eoa]s?|por interm[ée]dio)\b/i;
const GOAL = /\b(a fim de|para que|com o (?:objetivo|intuito)|com a finalidade)\b/i;
const DETAIL = /\b(como|por exemplo|tais como|gratuit[oa]s?|semanais|nas escolas|em parceria)\b/i;

const snap = (v: number) => Math.max(0, Math.min(200, Math.round(v / 40) * 40));

export function analyzeLocal(text: string, mode: string, themeWords: string[]): Analysis {
  const spans: Span[] = [];
  const add = (s: Span) => { if (!spans.some(x => x.start < s.end && s.start < x.end)) spans.push(s); };
  const lower = text.toLowerCase();

  for (const m of text.matchAll(/\p{L}+/gu)) {
    const w = m[0].toLowerCase(), fix = SPELL[w];
    if (fix) add({ start: m.index!, end: m.index! + m[0].length, kind: 'ortografia', severity: 'red', explanation: `Grafia incorreta.`, suggestion: `Escreva "${fix}".`, replace: fix });
  }
  for (const [re, rep, why] of INFORMAL) for (const m of text.matchAll(re)) add({ start: m.index!, end: m.index! + m[0].length, kind: 'erro', severity: 'red', explanation: why, suggestion: rep ? `Troque por "${rep}".` : 'Retire a expressão.', replace: rep });
  for (const [re, rep, why] of VAGUE) for (const m of text.matchAll(re)) add({ start: m.index!, end: m.index! + m[0].length, kind: 'sinonimo', severity: 'yellow', explanation: why, suggestion: `Ex.: "${rep}".`, replace: rep });
  for (const m of text.matchAll(/(^|\n)\s*(E)\s/g)) { const at = m.index! + m[0].indexOf('E'); add({ start: at, end: at + 1, kind: 'coesao', severity: 'red', explanation: 'Não inicie parágrafo com "E": ele não retoma o parágrafo anterior.', suggestion: 'Use "Além disso".', replace: 'Além disso,' }); }
  for (const m of text.matchAll(/\bonde\b/gi)) add({ start: m.index!, end: m.index! + 4, kind: 'coesao', severity: 'yellow', explanation: '"Onde" só retoma lugar físico. Se não for lugar, use "em que" ou "no qual".', suggestion: 'Troque por "em que".', replace: 'em que' });

  const counts = new Map<string, number[]>();
  for (const m of text.matchAll(/\p{L}{5,}/gu)) { const w = m[0].toLowerCase(); if (STOP.has(w)) continue; counts.set(w, [...(counts.get(w) ?? []), m.index!]); }
  for (const [w, idx] of counts) if (idx.length >= 3) idx.slice(1).forEach(i => add({ start: i, end: i + w.length, kind: 'repeticao', severity: 'yellow', explanation: `"${w}" aparece ${idx.length} vezes.`, suggestion: SYN[w] ? `Varie com "${SYN[w]}".` : 'Use um sinônimo ou pronome.', replace: SYN[w] }));

  for (const m of text.matchAll(GOOD_CONN)) add({ start: m.index!, end: m.index! + m[0].length, kind: 'certo', severity: 'green', explanation: 'Bom conectivo: articula as ideias.' });
  for (const m of text.matchAll(REPERTOIRE)) add({ start: m.index!, end: m.index! + m[0].length, kind: 'certo', severity: 'green', explanation: 'Repertório legitimado: fortalece a argumentação.' });
  spans.sort((a, b) => a.start - b.start);

  const words = (text.match(/\p{L}+/gu) || []).length, min = MODES[mode]?.min ?? 250, short = Math.min(1, words / min);
  const red = spans.filter(s => s.severity === 'red').length;
  const conn = new Set([...lower.matchAll(GOOD_CONN)].map(m => m[0])).size;
  const cause = [...lower.matchAll(CAUSE)].length, rep = [...text.matchAll(REPERTOIRE)].length;
  const themeHits = themeWords.filter(w => lower.includes(w.toLowerCase())).length;
  const repetitions = spans.filter(s => s.kind === 'repeticao').length;
  const lastPara = text.trim().split(/\n\s*\n/).pop() ?? '';
  const proposal = [AGENT, ACTION, MEANS, GOAL, DETAIL].filter(r => r.test(lastPara)).length;
  const competencias: Comps = {
    c1: snap((200 - red * 40) * (0.5 + short / 2)),
    c2: snap((80 + themeHits * 30 + (rep ? 40 : 0)) * short),
    c3: snap((60 + cause * 30 + rep * 30) * short),
    c4: snap((60 + conn * 30 - repetitions * 15) * short),
    c5: mode === 'FULL' || mode === 'CONC' ? snap(proposal * 40) : 0,
  };
  return { spans, competencias, source: 'local' };
}

/** Converte trechos citados (ex.: vindos do Claude) em posições no texto. */
export function quotesToSpans(text: string, items: (Omit<Span, 'start' | 'end'> & { quote: string })[]): Span[] {
  const out: Span[] = [];
  for (const { quote, ...rest } of items) {
    if (!quote) continue;
    let from = 0, at = -1;
    while ((at = text.indexOf(quote, from)) >= 0 && out.some(s => s.start < at + quote.length && at < s.end)) from = at + 1;
    if (at >= 0) out.push({ ...rest, start: at, end: at + quote.length, replace: rest.replace || undefined, suggestion: rest.suggestion || undefined });
  }
  return out.sort((a, b) => a.start - b.start);
}

/** Mantém os destaques no lugar enquanto o aluno digita (antes da nova correção chegar). */
export function mapSpans(spans: Span[], before: string, after: string): Span[] {
  let p = 0; while (p < before.length && p < after.length && before[p] === after[p]) p++;
  let s = 0; while (s < before.length - p && s < after.length - p && before[before.length - 1 - s] === after[after.length - 1 - s]) s++;
  const endOld = before.length - s, endNew = after.length - s, delta = after.length - before.length;
  return spans.flatMap(sp => {
    if (sp.end <= p) return [sp];
    if (sp.start >= endOld) return [{ ...sp, start: sp.start + delta, end: sp.end + delta }];
    const start = Math.min(sp.start, p), end = sp.end >= endOld ? sp.end + delta : endNew;
    return end > start ? [{ ...sp, start, end, replace: undefined }] : [];
  });
}

export const countWords = (t: string) => (t.match(/\p{L}+/gu) || []).length;
