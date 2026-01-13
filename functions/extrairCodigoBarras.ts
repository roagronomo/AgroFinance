import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { file_url } = await req.json();

    if (!file_url) {
      return Response.json({ error: 'URL do arquivo não fornecida' }, { status: 400 });
    }

    console.log('Extraindo código de barras do arquivo:', file_url);

    // Usar a IA para extrair o código de barras do PDF
    const response = await base44.integrations.Core.InvokeLLM({
      prompt: `Analise este documento e extraia APENAS o código de barras do boleto. 

O código de barras é uma sequência de 47 ou 48 dígitos numéricos.

Retorne SOMENTE os números do código de barras, sem espaços, pontos ou outros caracteres.
Se não encontrar um código de barras válido, retorne a string "NAO_ENCONTRADO".

Exemplo de código de barras válido:
23793381286000000001235687101234567890123456

Importante: retorne apenas os números, nada mais.`,
      file_urls: file_url
    });

    let codigoBarras = null;

    if (response && typeof response === 'string') {
      const codigo = response.trim().replace(/\D/g, '');
      
      // Validar se é um código de barras válido (47 ou 48 dígitos)
      if (codigo.length >= 47 && codigo.length <= 48) {
        codigoBarras = codigo;
        console.log('Código de barras extraído:', codigoBarras);
      } else {
        console.log('Código de barras não encontrado ou inválido');
      }
    }

    return Response.json({
      success: true,
      codigo_barras: codigoBarras,
      encontrado: codigoBarras !== null
    });

  } catch (error) {
    console.error('Erro ao extrair código de barras:', error);
    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
});