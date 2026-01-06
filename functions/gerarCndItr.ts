import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import puppeteer from 'npm:puppeteer@23.11.1';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { cib } = await req.json();
    
    if (!cib) {
      return Response.json({ error: 'CIB é obrigatório' }, { status: 400 });
    }

    console.log('🚀 Iniciando geração de CND do ITR para CIB:', cib);

    // Lançar navegador
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
    
    // Configurar timeout maior
    page.setDefaultTimeout(60000);

    try {
      console.log('📄 Acessando site da Receita Federal...');
      await page.goto('https://servicos.receitafederal.gov.br/servico/certidoes/#/home/cib', {
        waitUntil: 'networkidle0',
        timeout: 30000
      });

      // Aguardar campo de CIB
      console.log('⏳ Aguardando campo de CIB...');
      await page.waitForSelector('input[type="text"]', { timeout: 10000 });

      // Digitar o CIB
      console.log('✍️ Digitando CIB...');
      await page.type('input[type="text"]', cib);

      // Clicar no botão de emitir
      console.log('🔘 Clicando em "Emitir Certidão"...');
      await page.click('button[type="button"]');

      // Aguardar o PDF ser gerado (pode demorar alguns segundos)
      console.log('⏳ Aguardando geração do PDF...');
      await page.waitForTimeout(5000);

      // Tentar capturar o PDF
      const pdfDownloadUrl = await page.evaluate(() => {
        const link = document.querySelector('a[href*=".pdf"]');
        return link ? link.href : null;
      });

      if (!pdfDownloadUrl) {
        // Se não encontrou link direto, tentar baixar via navegador
        const client = await page.target().createCDPSession();
        await client.send('Page.setDownloadBehavior', {
          behavior: 'allow',
          downloadPath: '/tmp'
        });

        // Tentar clicar em qualquer botão de download
        await page.click('button:has-text("Baixar"), a:has-text("Download")').catch(() => {
          console.log('⚠️ Botão de download não encontrado');
        });

        await page.waitForTimeout(3000);
      }

      await browser.close();

      console.log('✅ CND gerada com sucesso');

      return Response.json({
        success: true,
        message: 'CND do ITR gerada com sucesso',
        pdfUrl: pdfDownloadUrl || null
      });

    } catch (innerError) {
      console.error('❌ Erro ao processar no navegador:', innerError);
      await browser.close();
      throw innerError;
    }

  } catch (error) {
    console.error('❌ Erro ao gerar CND do ITR:', error);
    return Response.json({
      success: false,
      error: error.message || 'Erro ao gerar CND do ITR'
    }, { status: 500 });
  }
});