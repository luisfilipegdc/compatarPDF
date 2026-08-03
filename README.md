# Unir e Comprimir PDFs

Ferramenta de página única para juntar vários PDFs em um só arquivo e, se quiser,
reduzir o tamanho até caber em um anexo de email.

**Tudo roda no navegador** — nenhum arquivo é enviado a servidor algum. O
`index.html` é autocontido (as bibliotecas estão embutidas), então funciona
offline, direto do disco, ou publicado em qualquer hospedagem estática.

## Como usar

Abra o `index.html` no navegador (duplo clique já basta) ou publique o
repositório no GitHub Pages e acesse a URL.

1. **Arquivos** — arraste os PDFs ou clique para escolher. Reordene com as
   setas, remova com o `✕`, ou use *Ordenar por nome* (ordenação numérica:
   `doc2` vem antes de `doc10`).
2. **Qualidade e tamanho** — escolha um modo:
   - **Apenas unir** (padrão) — copia as páginas como estão. O texto continua
     selecionável e nada perde qualidade. Vem com a **otimização de formas
     repetidas** ligada: cada desenho que se repete no documento (as bolinhas
     de um cartão-resposta, por exemplo) passa a ser desenhado uma vez só e
     reaproveitado. Continua tudo vetorial — em um cartão-resposta real isso
     tirou 90% do tamanho sem alterar um pixel.
   - **Alta / Média / Menor** — cada página vira uma imagem JPEG. Reduz muito o
     tamanho de documentos digitalizados, mas o texto deixa de ser selecionável.
     Os controles de DPI, qualidade e escala de cinza ficam disponíveis para
     ajuste fino.
   - **Digitalizado P/B** — cada página vira preto e branco puro (1 bit), como
     fazem os scanners de documento. Traço nítido e arquivo muito menor que o
     JPEG; o limiar é adaptativo, então corrige sombra de scanner e papel
     amarelado. Não serve para fotos.
3. **Arquivo final** — defina o nome e o limite do seu provedor de email; se o
   resultado passar do limite, aparece um aviso.

As preferências (modo, DPI, qualidade, cinza, limite) ficam salvas no navegador.

## Qual modo escolher

| Situação | Modo |
| --- | --- |
| PDFs gerados por computador (notas, boletos, cartões-resposta em branco) | **Apenas unir** — já são pequenos e nada se perde |
| Documento digitalizado, com traço fino ou texto miúdo | **Digitalizado P/B** |
| Digitalização com foto, carimbo colorido ou assinatura em cor | **Alta** |
| Documento que precisa continuar pesquisável | **Apenas unir** |

A compressão por rasterização **aumenta** o tamanho de PDFs que são só texto ou
vetor — nesses casos use *Apenas unir*.

### Medições

**Otimização de formas repetidas**, em um cartão-resposta vetorial real de 29
páginas gerado pela estuda.com:

| | |
| --- | --- |
| Tamanho | 8,1 MB → **774 KB** (90% menor) |
| Tempo | 4,9 s |
| Trabalho feito | 10.487 desenhos repetidos → 143 formas reaproveitadas |
| Texto | idêntico nas 29 páginas |
| Diferença visual a 150 dpi | pior página: 0,028% dos pixels, todos em borda de antialiasing |

Unindo esse arquivo com um lote de 294 páginas pela interface: 11,8 MB → 4,65 MB
em 7 segundos, 323 páginas na ordem certa.

**Modos de compressão**, com os PDFs de teste do próprio projeto (um
cartão-resposta digitalizado a 300 dpi e um cartão-resposta vetorial de 29
páginas):

| Modo | Digitalizado (893 KB) | Vetorial 29 pág. (8,3 MB) |
| --- | --- | --- |
| Apenas unir | 893 KB (100%) | 8,3 MB (100%) |
| Alta | 111 KB (12%) | 5,7 MB (69%) |
| Média | 35 KB (4%) | 3,1 MB (37%) |
| Digitalizado P/B 200 dpi | 10 KB (1%) | 0,77 MB (9%) |
| Digitalizado P/B 300 dpi | 21 KB (2%) | 1,6 MB (19%) |

No documento digitalizado de teste, o modo P/B preservou as 10 marcas
preenchidas (inclusive as fracas, a lápis), sem nenhum falso positivo pelo
critério usual de leitura óptica, e manteve as marcas fiduciais sólidas.

## Cartão-resposta e leitura óptica

Se o PDF vai ser auditado ou lido por sistema óptico, vale a pena saber o que
cada modo faz com ele:

- **Cartão em branco, gerado por sistema** (o arquivo ainda é vetorial): use
  *Apenas unir*. Ele já está pequeno, o QR code fica intacto e o texto
  permanece selecionável. Rasterizar aqui só piora.
- **Cartão preenchido e digitalizado**: o modo *Digitalizado P/B* é o que dá o
  melhor resultado — muito menor e mais legível que o JPEG.
- **Cuidado com o cinza impresso**: muitos cartões trazem as letras A–E
  impressas em cinza-claro dentro das bolhas, de propósito, para não confundir
  o leitor óptico. O modo P/B transforma esse cinza em preto sólido: nos
  testes deste projeto a tinta escura dentro da grade de respostas passou de
  12,7% para 22%. Antes de converter um lote inteiro, passe uma folha pelo
  sistema de leitura e confira.
- **Nunca use Média ou Menor em cartão-resposta.** É o ajuste que borra o
  traço fino e deixa a letra chapada — a diferença fica visível a olho nu.

## Limitações conhecidas

- PDFs protegidos por senha não são lidos (aparece o aviso na lista de arquivos).
- No modo de compressão o texto vira imagem: não há OCR, então o resultado não é
  pesquisável.
- Páginas muito grandes são limitadas a ~24 megapixels de renderização, para não
  estourar o limite de canvas de navegadores móveis e do Safari.
- Documentos muito extensos consomem memória do navegador; o processamento é
  feito arquivo a arquivo e pode ser cancelado a qualquer momento.
- A otimização do modo *Apenas unir* elimina **desenhos repetidos**, não cópias
  de fontes. Ao juntar arquivos do mesmo gerador, cada um traz sua própria cópia
  das fontes embutidas, e isso continua duplicado — unificar essas cópias
  quebrou a extração de texto em teste, então ficou de fora (veja
  [docs/PROMPT-GERACAO-CARTOES.md](docs/PROMPT-GERACAO-CARTOES.md)).
- Em PDFs sem desenhos repetidos (texto corrido, digitalizações) a otimização
  não encontra nada e o arquivo sai do mesmo tamanho. Ela não é um compressor
  genérico.

## Estrutura

```
index.html   aplicação inteira (interface + pdf.js + pdf-lib embutidos)
```

## Bibliotecas embutidas

- [pdf.js](https://mozilla.github.io/pdf.js/) 3.11.174 — renderização das
  páginas (Apache-2.0, Mozilla Foundation)
- [pdf-lib](https://github.com/Hopding/pdf-lib) — criação e cópia de páginas do
  PDF de saída (MIT)

As notas de licença originais estão preservadas dentro do `index.html`.

## Gerando os cartões-resposta

Se você também gera os cartões, o tamanho do PDF é decidido lá, não aqui: entre
dois lotes reais medidos neste projeto, um saiu com 14 KB por página e outro com
287 KB por página — 21× maior, pelo modo como as bolhas foram desenhadas. Em um
limite de 30 MB, isso é a diferença entre caber 2.100 páginas e caber 104.

O padrão que dá certo, junto com um prompt pronto para o gerador, está em
[docs/PROMPT-GERACAO-CARTOES.md](docs/PROMPT-GERACAO-CARTOES.md).

## Testes

```
npm install
npx playwright install chromium   # ou defina CHROME_PATH para um Chrome existente
npm test
```

A suíte sobe a página em um Chromium, monta os PDFs de teste com o próprio
pdf-lib embutido (nenhuma fixture binária no repositório) e confere, entre
outras coisas: nome de arquivo não vira HTML, PDF inválido é sinalizado, o modo
*Apenas unir* preserva texto e tamanho de página, e o modo *Digitalizado P/B*
mantém as 10 marcas preenchidas, sem falso positivo e com as marcas fiduciais
sólidas.
