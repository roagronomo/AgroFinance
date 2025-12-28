import React from 'react';

const RelatorioProducao = ({ cliente, municipio, produtos, imoveisPorProduto, imoveisCliente }) => {
  const formatNumber = (value) => {
    if (value === null || value === undefined) return "0,00";
    return new Intl.NumberFormat('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const today = new Date().toLocaleDateString('pt-BR');

  const getImovelById = (id) => {
    return imoveisCliente.find(imovel => imovel.id === id);
  };

  const getImoveisComArea = (imoveisLista) => {
    if (!imoveisLista || imoveisLista.length === 0) return [];
    return imoveisLista.map(item => ({
      ...getImovelById(item.id),
      area_utilizada: item.area_utilizada
    })).filter(Boolean).filter(item => item.nome_imovel);
  };

  const themeColors = [
    { border: '#2E7D32', bg: '#E4FCE9', text: '#2E7D32' }, // Verde
    { border: '#1565C0', bg: '#E3F2FD', text: '#1565C0' }, // Azul
    { border: '#C62828', bg: '#FFEBEE', text: '#C62828' }, // Vermelho
    { border: '#FF8F00', bg: '#FFF8E1', text: '#FF8F00' }, // Âmbar
    { border: '#4527A0', bg: '#EDE7F6', text: '#4527A0' }, // Roxo
  ];

  const renderHeader = () => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '8px', borderBottom: '2px solid #009540', marginBottom: '12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{ width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68cdb2d792e5fbfc65ac3e5d/2517f400d_LogoSemente2.png" alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
        </div>
        <div>
          <h1 style={{ fontSize: '18px', fontWeight: 'bold', color: '#1C1C1C', margin: '0' }}>Cerrado Consultoria</h1>
          <p style={{ fontSize: '12px', color: '#1C1C1C', margin: '0' }}>Relatório de Produção Agrícola</p>
        </div>
      </div>
      <div style={{ textAlign: 'right', fontSize: '12px', color: '#1C1C1C' }}>
        <p style={{ margin: '0', fontWeight: '600' }}>Data: {today}</p>
      </div>
    </div>
  );

  const renderProducerInfo = () => (
    <div style={{ backgroundColor: 'white', padding: '8px', borderRadius: '4px', marginBottom: '12px', border: '1px solid #CCCCCC' }}>
      <h2 style={{ fontSize: '14px', fontWeight: 'bold', color: '#1C1C1C', margin: '0 0 8px 0', borderBottom: '1px solid #CCCCCC', paddingBottom: '4px' }}>DADOS DO PRODUTOR</h2>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px', fontSize: '11px', color: '#1C1C1C' }}>
        <div><strong>Nome:</strong> {cliente?.nome || 'N/A'}</div>
        <div><strong>E-mail:</strong> {cliente?.email || 'N/A'}</div>
        <div><strong>CPF/CNPJ:</strong> {cliente?.cpf || 'N/A'}</div>
        <div><strong>Telefone:</strong> {cliente?.celular || cliente?.telefone_fixo || 'N/A'}</div>
      </div>
      <div style={{ marginTop: '8px', paddingTop: '4px', borderTop: '1px solid #CCCCCC' }}>
        <p style={{ fontSize: '12px', fontWeight: '600', color: '#1C1C1C', margin: '0' }}>
          <strong>Município das Lavouras:</strong> {municipio || 'N/A'}
        </p>
      </div>
    </div>
  );
  
  if (!produtos || Object.keys(produtos).length === 0) {
    return null;
  }

  return (
    <div className="relatorio">
      <style type="text/css" media="print">
        {`
          @page {
            size: A4 portrait;
            margin: 10mm;
          }
          body, html {
            margin: 0 !important;
            padding: 0 !important;
            overflow: visible;
            height: auto;
            background-color: white;
            width: 100% !important;
            max-width: 100% !important;
          }
          * {
            box-sizing: border-box;
            overflow: visible !important;
            color: #1C1C1C;
          }
          .page-break {
            page-break-before: always;
          }
          .relatorio, .conteudo-principal, .pagina, .container {
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
          }
        `}
      </style>

      {Object.keys(produtos)
        .sort((a, b) => parseInt(a) - parseInt(b))
        .filter(key => produtos[key])
        .map((key, index) => {
          const produto = produtos[key];
          const imoveisDoProduto = imoveisPorProduto[key] || [];
          const theme = themeColors[index % themeColors.length];

          return (
            <div key={key} className={index > 0 ? 'page-break' : ''} style={{ backgroundColor: 'white', padding: '5mm', width: '100%', maxWidth: '100%', margin: '0' }}>
              {renderHeader()}
              {renderProducerInfo()}

              <div style={{ marginBottom: '8px', border: `2px solid ${theme.border}`, borderRadius: '6px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                <div style={{ backgroundColor: theme.bg, color: theme.text, padding: '10px 16px', borderRadius: '4px 4px 0 0', borderBottom: `1px solid ${theme.border}` }}>
                  <h2 style={{ fontSize: '16px', fontWeight: 'bold', margin: '0', color: theme.text, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    PRODUTO {key}: {produto.produto_principal || 'NÃO INFORMADO'}
                  </h2>
                </div>
                <div style={{ padding: '8px', backgroundColor: 'white' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '8px', fontSize: '10px', paddingBottom: '4px', borderBottom: '1px solid #CCCCCC' }}>
                    <div><strong style={{ color: '#1C1C1C' }}>Atividade:</strong> <span style={{ color: '#1C1C1C' }}>{produto.atividade || 'N/A'}</span></div>
                    <div><strong style={{ color: '#1C1C1C' }}>Ciclo:</strong> <span style={{ color: '#1C1C1C' }}>{produto.ciclo || 'N/A'}</span></div>
                    <div><strong style={{ color: '#1C1C1C' }}>Período Comercialização:</strong> <span style={{ color: '#1C1C1C' }}>{produto.periodo_comercializacao || 'N/A'}</span></div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '10px', marginBottom: '8px' }}>
                    <div style={{ backgroundColor: '#E0F7E9', padding: '8px', borderRadius: '4px' }}>
                      <h4 style={{ fontSize: '11px', fontWeight: 'bold', textAlign: 'center', color: '#1C1C1C', margin: '0 0 6px 0' }}>ÚLTIMO ANO ({produto.ultimo_ano || 'N/A'})</h4>
                      <div style={{ display: 'grid', gap: '2px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#1C1C1C' }}>Início Plantio:</span><span style={{ color: '#1C1C1C' }}>{produto.inicio_plantio_ultimo || 'N/A'}</span></div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#1C1C1C' }}>Início Colheita:</span><span style={{ color: '#1C1C1C' }}>{produto.inicio_colheita_ultimo || 'N/A'}</span></div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#1C1C1C' }}>Área Plantada:</span><span style={{ color: '#1C1C1C' }}>{formatNumber(produto.area_plantada)} ha</span></div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#1C1C1C' }}>Produtividade:</span><span style={{ color: '#1C1C1C' }}>{formatNumber(produto.produtividade_obtida)} {produto.unidade_produtividade_obtida || 'Kg/ha'}</span></div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#1C1C1C' }}>Preço Unitário:</span><span style={{ color: '#1C1C1C' }}>{formatNumber(produto.preco_unitario_obtido)} {produto.unidade_preco_obtido || 'R$/Kg'}</span></div>
                      </div>
                    </div>
                    <div style={{ backgroundColor: '#E0ECFF', padding: '8px', borderRadius: '4px' }}>
                      <h4 style={{ fontSize: '11px', fontWeight: 'bold', textAlign: 'center', color: '#1C1C1C', margin: '0 0 6px 0' }}>ANO PREVISTO ({produto.ano_previsto || 'N/A'})</h4>
                      <div style={{ display: 'grid', gap: '2px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#1C1C1C' }}>Início Plantio:</span><span style={{ color: '#1C1C1C' }}>{produto.inicio_plantio_previsto || 'N/A'}</span></div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#1C1C1C' }}>Início Colheita:</span><span style={{ color: '#1C1C1C' }}>{produto.inicio_colheita_previsto || 'N/A'}</span></div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#1C1C1C' }}>Área Prevista:</span><span style={{ color: '#1C1C1C' }}>{formatNumber(produto.area_prevista)} ha</span></div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#1C1C1C' }}>Produtividade:</span><span style={{ color: '#1C1C1C' }}>{formatNumber(produto.produtividade_prevista)} {produto.unidade_produtividade_prevista || 'Kg/ha'}</span></div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#1C1C1C' }}>Preço Previsto:</span><span style={{ color: '#1C1C1C' }}>{formatNumber(produto.preco_unitario_previsto)} {produto.unidade_preco_previsto || 'R$/Kg'}</span></div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#1C1C1C' }}>Sistema RTA:</span><span style={{ color: '#1C1C1C' }}>{produto.sistema_producao_previsto || 'N/A'}</span></div>
                      </div>
                    </div>
                  </div>

                  <div style={{ paddingTop: '8px' }}>
                    <h3 style={{ fontSize: '11px', fontWeight: 'bold', color: '#1C1C1C', margin: '0 0 4px 0', borderTop: '1px solid #CCCCCC', paddingTop: '8px', textTransform: 'uppercase' }}>LOCALIZAÇÃO DA LAVOURA</h3>
                    <table style={{ width: '100%', fontSize: '10px', borderCollapse: 'collapse' }}>
                      <tbody>
                        {getImoveisComArea(imoveisDoProduto).map((imovel, i) => (
                          <tr key={i} style={{ borderBottom: '1px solid #CCCCCC' }}>
                            <td style={{ padding: '4px', textAlign: 'left', color: '#1C1C1C' }}><strong>Fazenda:</strong> {imovel.nome_imovel || 'N/A'}</td>
                            <td style={{ padding: '4px', textAlign: 'center', color: '#1C1C1C' }}><strong>Matrícula:</strong> {imovel.matricula_numero || 'N/A'}</td>
                            <td style={{ padding: '4px', textAlign: 'right', color: '#1C1C1C' }}><strong>Área Utilizada:</strong> {formatNumber(imovel.area_utilizada)} ha</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
    </div>
  );
};

export default RelatorioProducao;