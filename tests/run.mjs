// Suíte de testes do "Unir e Comprimir PDFs".
//   npm test
// Requer o Chromium do Playwright (npx playwright install chromium) ou a
// variável CHROME_PATH apontando para um Chrome/Chromium já instalado.
import fs from 'fs';
import path from 'path';
import { abrir, gerar, medir, fixtureCartao, fixtureDigitalizado, limparTmp, TMP, SHEET } from './helpers.mjs';

let passou = 0, falhou = 0;
const ok = (nome, condicao, detalhe = '') => {
  if(condicao){ passou++; console.log(`  ok   ${nome}${detalhe ? '  — ' + detalhe : ''}`); }
  else{ falhou++; console.log(`  FALHA ${nome}${detalhe ? '  — ' + detalhe : ''}`); }
};
const kb = n => (n / 1024).toFixed(0) + ' KB';

limparTmp();
const { browser, page, erros } = await abrir();

try{
  // ---------------------------------------------------------------- fixtures
  console.log('\nfixtures');
  const vetorial = await fixtureCartao(page, path.join(TMP, 'cartao-vetorial.pdf'));
  const digitalizado = await fixtureDigitalizado(page, vetorial, path.join(TMP, 'cartao-digitalizado.pdf'));
  const emBranco = await fixtureCartao(page, path.join(TMP, 'cartao-em-branco.pdf'), { comMarcas: false });
  fs.writeFileSync(path.join(TMP, 'nao-e-pdf.txt'), 'texto qualquer');
  fs.writeFileSync(path.join(TMP, 'quebrado.pdf'), '%PDF-1.4 conteudo invalido');
  // nome de arquivo hostil: precisa ser tratado como texto, nunca como HTML
  const hostil = path.join(TMP, '<img src=x onerror=window.__xss=1>.pdf');
  fs.copyFileSync(vetorial, hostil);
  console.log(`  cartão vetorial ${kb(fs.statSync(vetorial).size)} · digitalizado ${kb(fs.statSync(digitalizado).size)}`);

  // ------------------------------------------------------------ lista de PDFs
  console.log('\nlista de arquivos');
  await page.setInputFiles('#fileInput', [vetorial, digitalizado, hostil,
    path.join(TMP, 'nao-e-pdf.txt'), path.join(TMP, 'quebrado.pdf')]);
  await page.waitForFunction(() => document.querySelectorAll('#fileList li').length === 4);
  ok('arquivo não-PDF é recusado', await page.isVisible('#warn'),
    (await page.textContent('#warn')).trim());
  ok('nome de arquivo não vira HTML', !(await page.evaluate(() => !!window.__xss)));
  const nomes = await page.$$eval('#fileList li .name', ns => ns.map(n => n.textContent));
  ok('nome hostil aparece como texto', nomes.some(n => n.includes('<img src=x')));
  const metas = await page.$$eval('#fileList li .meta', ns => ns.map(n => n.textContent));
  ok('PDF inválido é sinalizado na lista', metas.some(m => /inválido|corrompido/i.test(m)));

  await page.$eval('#fileList li:nth-child(3) .rm', b => b.click());   // remove o hostil
  await page.click('#sortBtn');
  const ordem = await page.$$eval('#fileList li .name', ns => ns.map(n => n.textContent));
  ok('ordenação por nome', ordem.length === 3, ordem.join(' | '));

  // ------------------------------------------------------------ modo unir
  console.log('\nmodo "Apenas unir"');
  const unido = await gerar(page, [vetorial, digitalizado], { preset: 'merge', nome: 'unido' });
  const mUnido = await medir(page, unido);
  ok('junta as páginas na ordem', mUnido.paginas === 2, `${mUnido.paginas} páginas`);
  ok('preserva o texto selecionável', /AUDITORIA/.test(mUnido.texto), JSON.stringify(mUnido.texto.slice(0, 40)));
  ok('preserva o tamanho da página', mUnido.largura === SHEET.W && mUnido.altura === SHEET.H,
    `${mUnido.largura}x${mUnido.altura} pt`);
  ok('nome do arquivo ganha .pdf', (await page.getAttribute('#downloadLink', 'download')) === 'unido.pdf');

  // ------------------------------------------------------------- modo P/B
  console.log('\nmodo "Digitalizado P/B" (o que vai para auditoria)');
  const original = fs.statSync(digitalizado).size;
  for(const dpi of [200, 300]){
    const pb = await gerar(page, [digitalizado], { preset: 'pb', dpi, threshold: 12 });
    const m = await medir(page, pb);
    const marcadas = m.bolhas.filter(b => SHEET.marcadas[b.questao] === b.letra);
    const vazias = m.bolhas.filter(b => SHEET.marcadas[b.questao] !== b.letra);
    const detectadas = marcadas.filter(b => b.tinta > 0.55).length;
    const falsos = vazias.filter(b => b.tinta > 0.55).length;
    const fiduciais = Math.min(...m.fiduciais);

    console.log(`  ${dpi} dpi: ${kb(pb.length)} (${(pb.length / original * 100).toFixed(0)}% do digitalizado)`);
    ok(`${dpi} dpi: preserva as 10 marcas`, detectadas === 10, `${detectadas}/10`);
    ok(`${dpi} dpi: sem falso positivo`, falsos === 0, `${falsos} de ${vazias.length} bolhas vazias`);
    ok(`${dpi} dpi: marcas fiduciais sólidas`, fiduciais > 0.95, `menor: ${(fiduciais * 100).toFixed(0)}%`);
    ok(`${dpi} dpi: menor que o digitalizado`, pb.length < original, `${kb(pb.length)} < ${kb(original)}`);
    ok(`${dpi} dpi: mantém o tamanho da página`, m.largura === SHEET.W && m.altura === SHEET.H,
      `${m.largura}x${m.altura} pt`);
  }

  // O cinza-claro impresso vira preto sólido no P/B. É esperado, mas mexe no
  // que um leitor óptico mede — o teste registra o efeito para que uma
  // mudança futura no limiar não passe despercebida.
  const pbBranco = await gerar(page, [emBranco], { preset: 'pb', dpi: 200, threshold: 12 });
  const mBranco = await medir(page, pbBranco);
  const tintaMax = Math.max(...mBranco.bolhas.map(b => b.tinta));
  ok('bolha vazia continua longe do limiar de preenchida', tintaMax < 0.5,
    `pior caso ${(tintaMax * 100).toFixed(0)}% de tinta (limiar típico 55%)`);

  // --------------------------------------------------------------- JPEG
  console.log('\nmodos JPEG');
  const alta = await gerar(page, [digitalizado], { preset: 'alta' });
  const menor = await gerar(page, [digitalizado], { preset: 'pequena' });
  ok('Alta comprime o digitalizado', alta.length < original, `${kb(alta.length)} < ${kb(original)}`);
  ok('Menor é menor que Alta', menor.length < alta.length, `${kb(menor.length)} < ${kb(alta.length)}`);
  const mAlta = await medir(page, alta);
  ok('rasterização mantém o tamanho da página', mAlta.largura === SHEET.W && mAlta.altura === SHEET.H,
    `${mAlta.largura}x${mAlta.altura} pt`);

  // ------------------------------------------------------------- interface
  console.log('\ninterface');
  await page.check('input[name=preset][value=merge]', { force: true });
  ok('modo unir desativa os controles de imagem', await page.isDisabled('#dpi'));
  await page.check('input[name=preset][value=pb]', { force: true });
  ok('modo P/B desativa a qualidade JPEG', await page.isDisabled('#quality'));
  ok('modo P/B ativa o limiar', !(await page.isDisabled('#threshold')));
  await page.check('input[name=preset][value=media]', { force: true });
  ok('modo JPEG desativa o limiar', await page.isDisabled('#threshold'));

  await page.reload();
  ok('preferências sobrevivem ao recarregar',
    (await page.$eval('input[name=preset]:checked', r => r.value)) === 'media');

  // cancelamento no meio do processamento
  await page.setInputFiles('#fileInput', [digitalizado]);
  await page.waitForFunction(() => document.querySelectorAll('#fileList li').length === 1);
  await page.check('input[name=preset][value=alta]', { force: true });
  await page.$eval('#dpi', el => { el.value = '300'; el.dispatchEvent(new Event('input')); });
  await page.click('#runBtn');
  await page.click('#cancelBtn');
  await page.waitForFunction(() => document.getElementById('status').textContent === 'Cancelado.',
    null, { timeout: 60000 });
  ok('cancelar libera o botão gerar', !(await page.isDisabled('#runBtn')));
  ok('cancelar esconde o botão cancelar', await page.isHidden('#cancelBtn'));

  ok('nenhum erro no console', erros.length === 0, erros.join(' | '));
}catch(err){
  falhou++;
  console.log('\nERRO INESPERADO:', err && err.stack || err);
}finally{
  await browser.close();
}

console.log(`\n${passou} passaram, ${falhou} falharam\n`);
process.exit(falhou ? 1 : 0);
