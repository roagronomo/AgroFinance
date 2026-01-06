import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import puppeteer from 'npm:puppeteer@23.11.1';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { codigoImovel, ufSede, municipioSede, tipoPessoa, cpfCnpj, naturezaJuridica } = await req.json();
    
    if (!codigoImovel || !ufSede || !municipioSede || !tipoPessoa || !cpfCnpj) {
      return Response.json({ error: 'Todos os campos são obrigatórios' }, { status: 400 });
    }

    if (tipoPessoa === 'juridica' && !naturezaJuridica) {
      return Response.json({ error: 'Natureza jurídica é obrigatória para pessoa jurídica' }, { status: 400 });
    }

    console.log('🚀 Iniciando geração de CCIR do INCRA');
    console.log('📋 Dados:', { codigoImovel, ufSede, municipioSede, tipoPessoa, cpfCnpj, naturezaJuridica });

    const browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu'
      ]
    });

    const page = await browser.newPage();
    page.setDefaultTimeout(60000);

    try {
      console.log('📄 Acessando site do INCRA...');
      await page.goto('https://sncr.serpro.gov.br/ccir/emissao', {
        waitUntil: 'networkidle0',
        timeout: 30000
      });

      // Preencher código do imóvel
      console.log('✍️ Preenchendo código do imóvel...');
      await page.waitForSelector('input[name*="codigo"], input[id*="codigo"]', { timeout: 10000 });
      await page.type('input[name*="codigo"], input[id*="codigo"]', codigoImovel);

      // Selecionar UF
      console.log('📍 Selecionando UF...');
      await page.select('select[name*="uf"], select[id*="uf"]', ufSede);

      // Aguardar carregamento de municípios
      await page.waitForTimeout(1000);

      // Selecionar município (pode precisar digitar)
      console.log('🏙️ Selecionando município...');
      const municipioSelector = 'select[name*="municipio"], select[id*="municipio"]';
      const hasMunicipioSelect = await page.$(municipioSelector);
      
      if (hasMunicipioSelect) {
        await page.select(municipioSelector, municipioSede);
      } else {
        // Se não for select, pode ser input autocomplete
        await page.type('input[name*="municipio"], input[id*="municipio"]', municipioSede);
        await page.waitForTimeout(500);
        await page.keyboard.press('Enter');
      }

      // Selecionar tipo de pessoa
      console.log('👤 Selecionando tipo de pessoa...');
      if (tipoPessoa === 'fisica') {
        await page.click('input[type="radio"][value*="fisica"], input[type="radio"][id*="fisica"]');
      } else {
        await page.click('input[type="radio"][value*="juridica"], input[type="radio"][id*="juridica"]');
        
        // Para pessoa jurídica, selecionar natureza jurídica informada
        await page.waitForTimeout(500);
        console.log(`🏢 Selecionando natureza jurídica: ${naturezaJuridica}...`);
        
        try {
          // Tentar por value exato
          await page.select('select[name*="natureza"], select[id*="natureza"], select[name*="tipo"], select[id*="tipo"]', naturezaJuridica);
          console.log('✅ Natureza jurídica selecionada com sucesso');
        } catch (e) {
          console.log('⚠️ Tentando selecionar por texto visível...');
          // Tentar encontrar opção que contém o texto
          await page.evaluate((texto) => {
            const select = document.querySelector('select[name*="natureza"], select[id*="natureza"], select[name*="tipo"], select[id*="tipo"]');
            if (select) {
              const options = Array.from(select.options);
              const option = options.find(opt => opt.text.includes(texto) || opt.value.includes(texto));
              if (option) {
                select.value = option.value;
                select.dispatchEvent(new Event('change', { bubbles: true }));
              }
            }
          }, naturezaJuridica);
        }
      }

      // Preencher CPF/CNPJ
      console.log('🆔 Preenchendo CPF/CNPJ...');
      await page.type('input[name*="cpf"], input[name*="cnpj"], input[id*="cpf"], input[id*="cnpj"]', cpfCnpj);

      // Tentar resolver CAPTCHA automaticamente
      console.log('🤖 Tentando resolver CAPTCHA...');
      try {
        const captchaCheckbox = await page.$('input[type="checkbox"]');
        if (captchaCheckbox) {
          await captchaCheckbox.click();
          await page.waitForTimeout(2000);
        }
      } catch (captchaError) {
        console.log('⚠️ Não foi possível resolver CAPTCHA automaticamente');
      }

      // Clicar no botão de emitir
      console.log('🔘 Clicando em emitir...');
      const submitButton = await page.$('button[type="submit"], input[type="submit"], button:has-text("Emitir")');
      if (submitButton) {
        await submitButton.click();
      }

      // Aguardar geração do documento
      console.log('⏳ Aguardando geração do documento...');
      await page.waitForTimeout(5000);

      // Tentar capturar PDF
      const pdfUrl = await page.evaluate(() => {
        const link = document.querySelector('a[href*=".pdf"]');
        return link ? link.href : null;
      });

      await browser.close();

      if (pdfUrl) {
        console.log('✅ CCIR gerado com sucesso');
        return Response.json({
          success: true,
          message: 'CCIR do INCRA gerado com sucesso',
          pdfUrl
        });
      } else {
        console.log('⚠️ Documento gerado mas PDF não capturado automaticamente');
        return Response.json({
          success: true,
          message: 'Documento processado. Verifique sua pasta de downloads.',
          pdfUrl: null
        });
      }

    } catch (innerError) {
      console.error('❌ Erro ao processar no navegador:', innerError);
      await browser.close();
      throw innerError;
    }

  } catch (error) {
    console.error('❌ Erro ao gerar CCIR:', error);
    return Response.json({
      success: false,
      error: error.message || 'Erro ao gerar CCIR do INCRA. Pode ser necessário acessar manualmente devido ao CAPTCHA.'
    }, { status: 500 });
  }
});