// Utilidades dos testes: sobe o Chromium, abre o index.html e monta os PDFs de
// fixture. As fixtures são geradas com o pdf-lib e o pdf.js que já estão
// embutidos na própria página — os testes não precisam de nada além do
// Playwright.
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const TMP = path.join(ROOT, 'tests', 'tmp');
export const APP = pathToFileURL(path.join(ROOT, 'index.html')).href;

// Geometria do cartão-resposta de teste, em pontos. Compartilhada entre quem
// desenha a fixture e quem confere o resultado.
export const SHEET = {
  W: 595, H: 842,
  bubbleX: i => 100 + i * 22,
  bubbleY: r => 700 - r * 22,
  raio: 7.5,
  linhas: 10,
  colunas: 5,
  letras: 'ABCDE',
  // resposta marcada por questão (1-based); as de `leves` simulam lápis fraco
  marcadas: { 1: 'C', 2: 'A', 3: 'E', 4: 'B', 5: 'D', 6: 'A', 7: 'C', 8: 'C', 9: 'B', 10: 'E' },
  leves: [4, 9],
  fiduciais: [420, 398, 376, 320],   // y das marcas quadradas em x=45
  fiducialLado: 11,
};

export async function abrir(){
  const browser = await chromium.launch(
    process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {});
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const erros = [];
  page.on('pageerror', e => erros.push('pageerror: ' + e.message));
  page.on('console', m => { if(m.type() === 'error') erros.push('console: ' + m.text()); });
  await page.goto(APP);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  return { browser, page, erros };
}

const b64ParaArquivo = (b64, destino) => {
  fs.mkdirSync(path.dirname(destino), { recursive: true });
  fs.writeFileSync(destino, Buffer.from(b64, 'base64'));
  return destino;
};

// Cartão-resposta vetorial, com barra preta sólida, bolhas marcadas (algumas
// fracas) e marcas fiduciais — os elementos que a binarização precisa preservar.
export async function fixtureCartao(page, destino, { comMarcas = true } = {}){
  const b64 = await page.evaluate(async ({ S, comMarcas }) => {
    const { PDFDocument, StandardFonts, rgb } = PDFLib;
    const doc = await PDFDocument.create();
    const fonte = await doc.embedFont(StandardFonts.Helvetica);
    const negrito = await doc.embedFont(StandardFonts.HelveticaBold);
    const p = doc.addPage([S.W, S.H]);

    p.drawRectangle({ x: 40, y: S.H - 52, width: S.W - 80, height: 26, color: rgb(0, 0, 0) });
    p.drawText('CARTAO RESPOSTA - AUDITORIA',
      { x: 50, y: S.H - 45, size: 12, font: negrito, color: rgb(1, 1, 1) });

    for(let r = 0; r < S.linhas; r++){
      const y = 700 - r * 22, q = r + 1;
      p.drawText(String(q), { x: 78, y: y - 3, size: 9, font: negrito });
      for(let i = 0; i < S.colunas; i++){
        const x = 100 + i * 22;
        p.drawCircle({ x, y, size: S.raio, borderWidth: 0.7, borderColor: rgb(0, 0, 0) });
        const marcada = comMarcas && S.marcadas[q] === S.letras[i];
        if(marcada){
          const g = S.leves.includes(q) ? 0.42 : 0.06;   // lápis fraco x caneta
          p.drawCircle({ x, y, size: S.raio - 1.2, color: rgb(g, g, g) });
        }else{
          p.drawText(S.letras[i], { x: x - 2.2, y: y - 2.5, size: 7, font: fonte });
        }
      }
    }
    p.drawRectangle({ x: 78, y: 700 - (S.linhas - 1) * 22 - 14,
      width: 130, height: (S.linhas - 1) * 22 + 28, borderWidth: 0.9, borderColor: rgb(0, 0, 0) });
    for(const y of S.fiduciais){
      p.drawRectangle({ x: 45, y, width: S.fiducialLado, height: S.fiducialLado, color: rgb(0, 0, 0) });
    }
    const bytes = await doc.save();
    let s = ''; for(const b of bytes) s += String.fromCharCode(b);
    return btoa(s);
  }, { S: { ...SHEET, bubbleX: undefined, bubbleY: undefined }, comMarcas });
  return b64ParaArquivo(b64, destino);
}

// Página com a mesma forma complexa repetida muitas vezes — é o padrão que o
// otimizador de formas existe para resolver (as bolinhas de um cartão-resposta
// desenhadas curva a curva, uma vez para cada questão).
export async function fixtureFormasRepetidas(page, destino, copias = 60){
  const b64 = await page.evaluate(async ({ copias }) => {
    const { PDFDocument, PDFName } = PDFLib;
    const doc = await PDFDocument.create();
    const p = doc.addPage([595, 842]);

    // Círculo aproximado por 4 curvas de Bézier, escrito curva a curva — o
    // mesmo padrão que os geradores de cartão-resposta produzem, uma vez para
    // cada bolinha, em vez de reaproveitar um símbolo.
    const r = 9.6180339, k = r * 0.5522847;
    const curvas = (x, y) => [
      `${x + r} ${y} m`,
      `${x + r} ${y + k} ${x + k} ${y + r} ${x} ${y + r} c`,
      `${x - k} ${y + r} ${x - r} ${y + k} ${x - r} ${y} c`,
      `${x - r} ${y - k} ${x - k} ${y - r} ${x} ${y - r} c`,
      `${x + k} ${y - r} ${x + r} ${y - k} ${x + r} ${y} c`,
      'h', 'S',
    ].join('\n');

    const partes = ['0 0 0 RG', '1 w'];
    for(let i = 0; i < copias; i++){
      partes.push(curvas(60 + (i % 10) * 48.5, 780 - Math.floor(i / 10) * 47.5));
    }
    const txt = partes.join('\n') + '\n';
    const dados = new Uint8Array(txt.length);
    for(let i = 0; i < txt.length; i++) dados[i] = txt.charCodeAt(i);
    p.node.set(PDFName.of('Contents'), doc.context.register(doc.context.flateStream(dados)));

    const bytes = await doc.save();
    let s = ''; for(const b of bytes) s += String.fromCharCode(b);
    return btoa(s);
  }, { copias });
  return b64ParaArquivo(b64, destino);
}

// Rasteriza um PDF e devolve outro PDF que simula uma digitalização: sombra
// diagonal do scanner, ruído e recompressão JPEG.
export async function fixtureDigitalizado(page, origem, destino, dpi = 300){
  const entrada = fs.readFileSync(origem).toString('base64');
  const b64 = await page.evaluate(async ({ entrada, dpi }) => {
    const bytes = Uint8Array.from(atob(entrada), c => c.charCodeAt(0));
    const pdf = await pdfjsLib.getDocument({ data: bytes }).promise;
    const pg = await pdf.getPage(1);
    const vp = pg.getViewport({ scale: dpi / 72 });
    const cv = document.createElement('canvas');
    cv.width = Math.ceil(vp.width); cv.height = Math.ceil(vp.height);
    const ctx = cv.getContext('2d', { willReadFrequently: true });
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, cv.width, cv.height);
    await pg.render({ canvasContext: ctx, viewport: vp }).promise;

    const img = ctx.getImageData(0, 0, cv.width, cv.height);
    const d = img.data;
    let semente = 12345;
    const rnd = () => (semente = (semente * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
    for(let y = 0, i = 0; y < cv.height; y++){
      const sombra = 1 - 0.22 * (y / cv.height);
      for(let x = 0; x < cv.width; x++, i += 4){
        const v = (12 + d[i] * 0.95) * (sombra - 0.14 * (x / cv.width)) + (rnd() - 0.5) * 10;
        const c = Math.max(0, Math.min(255, v));
        d[i] = d[i+1] = d[i+2] = c;
      }
    }
    ctx.putImageData(img, 0, 0);
    const blob = await new Promise(r => cv.toBlob(r, 'image/jpeg', 0.88));
    const jpg = new Uint8Array(await blob.arrayBuffer());

    const { PDFDocument } = PDFLib;
    const doc = await PDFDocument.create();
    const emb = await doc.embedJpg(jpg);
    const pt = { w: vp.width / (dpi / 72), h: vp.height / (dpi / 72) };
    doc.addPage([pt.w, pt.h]).drawImage(emb, { x: 0, y: 0, width: pt.w, height: pt.h });
    const out = await doc.save();
    let s = ''; for(const b of out) s += String.fromCharCode(b);
    return btoa(s);
  }, { entrada, dpi });
  return b64ParaArquivo(b64, destino);
}

// Executa o app pela interface e devolve os bytes do PDF gerado, lendo direto
// do blob do link de download (dispensa a plumbing de download do Playwright).
export async function gerar(page, arquivos, opcoes = {}){
  const { preset = 'merge', dpi, quality, gray, threshold, nome, otimizar } = opcoes;
  await page.evaluate(() => {
    document.getElementById('clearBtn').click();
  });
  await page.setInputFiles('#fileInput', arquivos);
  await page.waitForFunction(n => document.querySelectorAll('#fileList li').length === n,
    arquivos.length, { timeout: 30000 });
  await page.check(`input[name=preset][value=${preset}]`, { force: true });
  const set = async (id, valor, evento) => {
    if(valor === undefined) return;
    await page.$eval('#' + id, (el, v) => {
      if(el.type === 'checkbox') el.checked = v; else el.value = String(v);
    }, valor);
    await page.$eval('#' + id, (el, ev) => el.dispatchEvent(new Event(ev)), evento);
  };
  await set('dpi', dpi, 'input');
  await set('quality', quality, 'input');
  await set('grayscale', gray, 'change');
  await set('threshold', threshold, 'input');
  await set('otimizar', otimizar, 'change');
  if(nome) await page.fill('#outName', nome);

  await page.click('#runBtn');
  await page.waitForFunction(
    () => document.getElementById('result').style.display === 'block'
       || /Erro|Cancelado|Não foi/.test(document.getElementById('status').textContent),
    null, { timeout: 300000 });
  const status = await page.textContent('#status');
  if(!/Concluído/.test(status)) throw new Error('geração falhou: ' + status);
  const b64 = await page.evaluate(async () => {
    const buf = await (await fetch(document.getElementById('downloadLink').href)).arrayBuffer();
    let s = ''; const b = new Uint8Array(buf);
    for(let i = 0; i < b.length; i += 8192) s += String.fromCharCode(...b.subarray(i, i + 8192));
    return btoa(s);
  });
  return Buffer.from(b64, 'base64');
}

// Mede o PDF gerado: páginas, texto extraível, tinta dentro de cada bolha e
// solidez das marcas fiduciais. Tudo com o pdf.js da própria página.
export async function medir(page, pdfBytes, dpi = 300){
  const entrada = pdfBytes.toString('base64');
  return page.evaluate(async ({ entrada, dpi, S }) => {
    const bytes = Uint8Array.from(atob(entrada), c => c.charCodeAt(0));
    const pdf = await pdfjsLib.getDocument({ data: bytes }).promise;
    const pg = await pdf.getPage(1);
    const escala = dpi / 72;
    const vp = pg.getViewport({ scale: escala });
    const cv = document.createElement('canvas');
    cv.width = Math.ceil(vp.width); cv.height = Math.ceil(vp.height);
    const ctx = cv.getContext('2d', { willReadFrequently: true });
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, cv.width, cv.height);
    await pg.render({ canvasContext: ctx, viewport: vp }).promise;
    const img = ctx.getImageData(0, 0, cv.width, cv.height).data;
    const escuro = (x, y) => img[((y * cv.width + x) << 2)] < 128;

    const disco = (cxPt, cyPt, rPt) => {
      const cx = cxPt * escala, cy = (S.H - cyPt) * escala, r = rPt * escala;
      let n = 0, tinta = 0;
      for(let y = Math.floor(cy - r); y <= cy + r; y++){
        for(let x = Math.floor(cx - r); x <= cx + r; x++){
          if(x < 0 || y < 0 || x >= cv.width || y >= cv.height) continue;
          if((x - cx) ** 2 + (y - cy) ** 2 > r * r) continue;
          n++; if(escuro(x, y)) tinta++;
        }
      }
      return n ? tinta / n : 0;
    };
    const caixa = (xPt, yPt, lado) => {
      let n = 0, tinta = 0;
      for(let y = Math.ceil((S.H - yPt - lado) * escala); y < (S.H - yPt) * escala; y++){
        for(let x = Math.ceil(xPt * escala); x < (xPt + lado) * escala; x++){
          if(x < 0 || y < 0 || x >= cv.width || y >= cv.height) continue;
          n++; if(escuro(x, y)) tinta++;
        }
      }
      return n ? tinta / n : 0;
    };

    const bolhas = [];
    for(let r = 0; r < S.linhas; r++){
      for(let i = 0; i < S.colunas; i++){
        bolhas.push({
          questao: r + 1, letra: S.letras[i],
          tinta: disco(100 + i * 22, 700 - r * 22, S.raio - 2.5),
        });
      }
    }
    const texto = (await pg.getTextContent()).items.map(t => t.str).join(' ').trim();
    return {
      paginas: pdf.numPages,
      largura: Math.round(vp.width / escala), altura: Math.round(vp.height / escala),
      texto,
      bolhas,
      fiduciais: S.fiduciais.map(y => caixa(45, y, S.fiducialLado)),
    };
  }, { entrada, dpi, S: { ...SHEET, bubbleX: undefined, bubbleY: undefined } });
}

// Renderiza a mesma página dos dois PDFs e mede a diferença de pixels.
export async function comparar(page, pdfA, pdfB, pagina = 1, dpi = 150){
  return page.evaluate(async ({ a, b, pagina, dpi }) => {
    const render = async (b64) => {
      const pdf = await pdfjsLib.getDocument({ data: Uint8Array.from(atob(b64), c => c.charCodeAt(0)) }).promise;
      const pg = await pdf.getPage(pagina);
      const vp = pg.getViewport({ scale: dpi / 72 });
      const cv = document.createElement('canvas');
      cv.width = Math.ceil(vp.width); cv.height = Math.ceil(vp.height);
      const ctx = cv.getContext('2d', { willReadFrequently: true });
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, cv.width, cv.height);
      await pg.render({ canvasContext: ctx, viewport: vp }).promise;
      const texto = (await pg.getTextContent()).items.map(t => t.str).join(' ').replace(/\s+/g,' ').trim();
      return { img: ctx.getImageData(0, 0, cv.width, cv.height), texto, paginas: pdf.numPages };
    };
    const A = await render(a), B = await render(b);
    if(A.img.width !== B.img.width || A.img.height !== B.img.height){
      return { erro: 'tamanhos diferentes', mesmoTexto: A.texto === B.texto };
    }
    let diferentes = 0, maior = 0;
    for(let k = 0; k < A.img.data.length; k += 4){
      const d = Math.abs(A.img.data[k] - B.img.data[k]);
      if(d > maior) maior = d;
      if(d > 32) diferentes++;
    }
    const total = A.img.data.length / 4;
    return { diferentes, pct: diferentes / total * 100, maior,
             mesmoTexto: A.texto === B.texto, paginasA: A.paginas, paginasB: B.paginas };
  }, { a: pdfA.toString('base64'), b: pdfB.toString('base64'), pagina, dpi });
}

export function limparTmp(){
  fs.rmSync(TMP, { recursive: true, force: true });
  fs.mkdirSync(TMP, { recursive: true });
}
