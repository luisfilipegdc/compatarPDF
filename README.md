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
   - **Apenas unir** — copia as páginas como estão. O texto continua
     selecionável e nada perde qualidade; o arquivo final é a soma dos
     originais.
   - **Alta / Média / Menor** — cada página vira uma imagem JPEG. Reduz muito o
     tamanho de documentos digitalizados, mas o texto deixa de ser selecionável.
     Os controles de DPI, qualidade e escala de cinza ficam disponíveis para
     ajuste fino.
3. **Arquivo final** — defina o nome e o limite do seu provedor de email; se o
   resultado passar do limite, aparece um aviso.

As preferências (modo, DPI, qualidade, cinza, limite) ficam salvas no navegador.

## Qual modo escolher

| Situação | Modo |
| --- | --- |
| PDFs gerados por computador (notas, boletos, relatórios) | **Apenas unir** — já são pequenos e o texto é preservado |
| Digitalizações / fotos de documentos | **Média** ou **Menor** |
| Documento que precisa continuar pesquisável | **Apenas unir** |

A compressão por rasterização **aumenta** o tamanho de PDFs que são só texto ou
vetor — nesses casos use *Apenas unir*.

## Limitações conhecidas

- PDFs protegidos por senha não são lidos (aparece o aviso na lista de arquivos).
- No modo de compressão o texto vira imagem: não há OCR, então o resultado não é
  pesquisável.
- Páginas muito grandes são limitadas a ~24 megapixels de renderização, para não
  estourar o limite de canvas de navegadores móveis e do Safari.
- Documentos muito extensos consomem memória do navegador; o processamento é
  feito arquivo a arquivo e pode ser cancelado a qualquer momento.

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
