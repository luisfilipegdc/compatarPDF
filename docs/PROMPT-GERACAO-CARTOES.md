# Prompt para gerar os cartões-resposta

Cole o bloco abaixo no chat que gera os cartões. Ele fixa o padrão que já deu
certo — o lote do 8º ano saiu com **294 páginas em 3,88 MB (13,5 KB por
página)** — e evita o padrão ruim, medido em outro lote: **287 KB por página**,
21× maior, por desenhar cada página com ~17 mil segmentos de curva.

Na prática, o limite de 30 MB da plataforma significa:

| Padrão | KB por página | Cabe em 30 MB |
| --- | --- | --- |
| Bom (o do 8º ano) | ~14 KB | ~2.100 páginas |
| Ruim (curvas em excesso) | ~287 KB | ~104 páginas |

---

## Prompt (copie a partir daqui)

Gere os cartões-resposta em PDF seguindo exatamente este padrão técnico. O
arquivo será impresso, preenchido à mão pelos alunos, digitalizado e enviado a
uma plataforma de correção óptica com limite de 30 MB — cada exigência abaixo
existe por causa disso.

**Formato do arquivo**

1. Um único PDF, página A4 retrato (595 × 842 pt), uma página por aluno, sem
   página de rosto ou separadores.
2. Conteúdo 100% vetorial: texto como texto (fonte de verdade) e formas como
   formas. O texto precisa continuar selecionável no PDF final.
3. Orçamento de tamanho: **no máximo 15 KB por página**. Ao terminar, informe
   o número de páginas, o tamanho total e o tamanho médio por página. Se passar
   de 15 KB/página, corrija antes de entregar.

**O que não fazer** (cada item já estourou o tamanho de um lote real)

4. Não converta texto ou formas em contorno/outline.
5. Não desenhe círculos com dezenas de segmentos de curva: uma bolha é um
   círculo simples (4 curvas de Bézier) ou um `<circle>` do SVG.
6. Não gere o PDF rasterizando a página (nada de "imprimir como imagem",
   captura de tela, ou embutir a página inteira como PNG/JPEG).
7. Não repita, em cada página, elementos gráficos pesados que poderiam ser
   definidos uma única vez.
8. Não aplique compressão JPEG em nada do cartão.

**Layout de cada página**

9. Cabeçalho: título "Cartão-Resposta", código e nome da escola, turma, código
   do simulado e trimestre.
10. Campo NOME COMPLETO com o nome do aluno impresso, e uma linha para
    ASSINATURA.
11. QR code de identificação do aluno, no canto superior direito, como imagem
    pequena (≈1 KB por página, preto e branco). O QR precisa sair nítido: não
    o redimensione para um tamanho que não seja múltiplo inteiro dos seus
    módulos, e não o comprima com perda.
12. Blocos de instruções e de exemplo de preenchimento.
13. Grade de respostas em colunas de 20 questões, numeradas em sequência, com
    as alternativas A–E.

**Exigências da leitura óptica** (não altere sem testar uma folha)

14. Marcas fiduciais: quadrados pretos sólidos, do mesmo tamanho, sempre nas
    mesmas coordenadas em todas as páginas. Elas são a referência de
    alinhamento do leitor — não podem variar de posição entre alunos.
15. As bolhas devem ter diâmetro e espaçamento constantes, iguais em todas as
    páginas.
16. As letras A–E impressas dentro das bolhas ficam em **cinza-claro** (algo
    como 20–25% de preto). Isso é proposital: se forem escuras, a leitora pode
    confundir a letra impressa com a marca do aluno.
17. Dentro da bolha não entra mais nada além dessa letra clara.
18. Fundo branco, sem marca-d'água, sem textura e sem faixa colorida atrás da
    grade de respostas.

**Entrega**

19. Entregue o PDF pronto e o relatório de tamanho pedido no item 3.

## Por que um único PDF, e não um arquivo por aluno

O item 1 da lista acima é o que mais pesa no tamanho final, e é fácil de errar.
Medição feita com o lote do 8º ano, pegando as mesmas 10 páginas:

| Entrega | Por página |
| --- | --- |
| 10 arquivos de 1 página cada | 150,8 KB |
| as mesmas 10 páginas em um único PDF | 25,3 KB |

São **6× de diferença** sem nenhuma diferença visual: num PDF único a fonte e os
recursos compartilhados ficam guardados uma vez só; em arquivos separados, cada
um carrega a sua própria cópia.

Parte disso **dá para consertar depois, parte não**:

- **A repetição de desenhos, sim.** O modo *Apenas unir* carimba as formas
  repetidas: num cartão-resposta real isso levou 8,1 MB a 774 KB, 90% menor,
  sem mudar um pixel. É por isso que o passo de gerar as bolinhas com poucos
  segmentos importa menos do que parecia — mas gerar direito continua melhor,
  porque evita 10 mil operadores por página desde o começo.
- **A duplicação de fontes, não.** Cada arquivo separado traz sua própria cópia
  das fontes embutidas e isso permanece. Foi testado unificar os objetos
  idênticos byte a byte: o arquivo caía de 445 KB para 166 KB, mas os cartões
  usam fontes Type3 (cada glifo é um stream próprio), e fazer duas fontes
  distintas compartilharem os mesmos glifos quebrou a extração de texto da
  segunda página em diante — o nome do aluno saía como `&/$5$` em vez de
  `CLARA`. O PDF continuava renderizando certo, o que torna o problema
  silencioso. Por isso essa parte ficou de fora.

Ou seja: peça o lote inteiro em um PDF só, desde a geração.

## Depois de gerar

- Para juntar vários lotes em um arquivo só, use o modo **Apenas unir** desta
  ferramenta: ele não altera nada do conteúdo.
- Não passe o cartão em branco pelos modos Média/Menor: eles borram o traço
  fino e chapam as letras.
- Depois que os cartões voltarem preenchidos e digitalizados, aí sim o modo
  **Digitalizado P/B** é o indicado — e leia antes a seção sobre leitura óptica
  no [README](../README.md).
