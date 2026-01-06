import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import puppeteer from 'npm:puppeteer@23.11.1';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { cpf, dataNascimento } = await req.json();
    
    if (!cpf || !dataNascimento) {
      return Response.json({ error: 'CPF e data de nascimento são obrigatórios' }, { status: 400 });
    }

    console.log('🚀 Iniciando geração de CND de CPF:', cpf);

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
      console.log('📄 Acessando site da Receita Federal...');
      await page.goto('https://servicos.receitafederal.gov.br/servico/certidoes/#/home/cpf', {
        waitUntil: 'networkidle0',
        timeout: 30000
      });

      // Aguardar e preencher CPF
      console.log('✍️ Preenchendo CPF...');
      await page.waitForSelector('input[type="text"]', { timeout: 10000 });
      await page.type('input[type="text"]', cpf.replace(/\D/g, ''));

      // Preencher data de nascimento
      console.log('📅 Preenchendo data de nascimento...');
      const inputs = await page.$$('input');
      if (inputs.length > 1) {
        await inputs[1].type(dataNascimento);
      }

      // Clicar no botão de emitir
      console.log('🔘 Clicando em "Emitir Certidão"...');
      await page.click('button[type="button"]');

      // Aguardar o PDF ser gerado
      console.log('⏳ Aguardando geração do PDF...');
      await page.waitForTimeout(5000);

      const pdfDownloadUrl = await page.evaluate(() => {
        const link = document.querySelector('a[href*=".pdf"]');
        return link ? link.href : null;
      });

      await browser.close();

      console.log('✅ CND de CPF gerada com sucesso');

      return Response.json({
        success: true,
        message: 'CND de CPF gerada com sucesso',
        pdfUrl: pdfDownloadUrl || null
      });

    } catch (innerError) {
      console.error('❌ Erro ao processar no navegador:', innerError);
      await browser.close();
      throw innerError;
    }

  } catch (error) {
    console.error('❌ Erro ao gerar CND de CPF:', error);
    return Response.json({
      success: false,
      error: error.message || 'Erro ao gerar CND de CPF'
    }, { status: 500 });
  }
});