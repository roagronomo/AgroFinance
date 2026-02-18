import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { kml } from 'npm:@tmcw/togeojson@5.8.1';
import * as turf from 'npm:@turf/turf@7.0.0';
import proj4 from 'npm:proj4@2.11.0';
import { DOMParser } from 'npm:xmldom@0.6.0';
import jsPDF from 'npm:jspdf@2.5.2';

// ========================================================================
// PARTE 1: PROCESSAMENTO GEOESPACIAL
// ========================================================================

function parseKMLFromString(kmlContent) {
  try {
    console.log('Parseando KML...');
    const parser = new DOMParser();
    const dom = parser.parseFromString(kmlContent, 'text/xml');
    const geojson = kml(dom);
    
    console.log('GeoJSON gerado, features:', geojson.features.length);
    
    const polygonFeature = geojson.features.find(f => 
      f.geometry.type === 'Polygon' || f.geometry.type === 'MultiPolygon'
    );
    
    if (!polygonFeature) {
      throw new Error('Nenhum polígono encontrado no arquivo KML.');
    }
    
    if (polygonFeature.geometry.type === 'MultiPolygon') {
      console.log('MultiPolygon detectado, selecionando o maior...');
      let maxArea = 0, maxIdx = 0;
      polygonFeature.geometry.coordinates.forEach((coords, idx) => {
        const area = turf.area(turf.polygon(coords));
        if (area > maxArea) { 
          maxArea = area; 
          maxIdx = idx; 
        }
      });
      polygonFeature.geometry = { 
        type: 'Polygon', 
        coordinates: polygonFeature.geometry.coordinates[maxIdx] 
      };
    }
    
    console.log('Polígono selecionado com sucesso');
    return polygonFeature;
  } catch (error) {
    console.error('Erro ao parsear KML:', error);
    throw new Error(`Erro ao processar arquivo KML: ${error.message}`);
  }
}

function calcAreaHa(polygon) {
  const feature = polygon.type === 'Feature' ? polygon : turf.feature(polygon);
  return turf.area(feature) / 10000;
}

function simplifyPolygonDynamic(polygonFeature, targetAreaHa, maxPoints = 20, toleranceHa = 2.0) {
  const originalCoords = polygonFeature.geometry.coordinates[0];
  const originalPointCount = originalCoords.length - 1;
  const originalAreaHa = calcAreaHa(polygonFeature);
  
  console.log(`Simplificando polígono: ${originalPointCount} pontos, área original: ${originalAreaHa.toFixed(2)} ha, área alvo: ${targetAreaHa} ha`);
  console.log(`✓ CONFIRMAÇÃO: Estamos ajustando o KML de ${originalAreaHa.toFixed(2)} ha para a área desejada de ${targetAreaHa} ha`);
  
  if (originalPointCount <= maxPoints) {
    console.log('Polígono já tem poucos pontos, apenas ajustando área...');
    return adjustAreaToTarget(polygonFeature, targetAreaHa, toleranceHa);
  }
  
  const candidates = [];
  for (let exp = -5; exp <= -1.5; exp += 0.1) {
    try {
      const tolerance = Math.pow(10, exp);
      const simplified = turf.simplify(polygonFeature, { tolerance, highQuality: true });
      const pointCount = simplified.geometry.coordinates[0].length - 1;
      
      if (pointCount >= 4 && pointCount <= maxPoints) {
        const areaHa = calcAreaHa(simplified);
        const shapeFidelity = Math.abs(1 - (areaHa / originalAreaHa));
        candidates.push({ 
          polygon: simplified, 
          pointCount, 
          areaHa, 
          shapeFidelity,
          tolerance
        });
      }
    } catch (e) {
      console.warn(`Erro na simplificação com exp ${exp}:`, e.message);
    }
  }
  
  if (candidates.length === 0) {
    console.log('Nenhum candidato de simplificação encontrado, usando polígono original');
    return adjustAreaToTarget(polygonFeature, targetAreaHa, toleranceHa);
  }
  
  candidates.sort((a, b) => {
    const aGood = a.shapeFidelity < 0.3, bGood = b.shapeFidelity < 0.3;
    if (aGood && !bGood) return -1;
    if (!aGood && bGood) return 1;
    if (a.pointCount !== b.pointCount) return a.pointCount - b.pointCount;
    return a.shapeFidelity - b.shapeFidelity;
  });
  
  const best = candidates[0];
  console.log(`Melhor candidato: ${best.pointCount} pontos, fidelidade: ${best.shapeFidelity.toFixed(4)}`);
  
  return adjustAreaToTarget(best.polygon, targetAreaHa, toleranceHa);
}

function adjustAreaToTarget(polygonFeature, targetAreaHa, toleranceHa = 2.0, maxIterations = 15) {
  let current = JSON.parse(JSON.stringify(polygonFeature));
  
  console.log(`Ajustando área para ${targetAreaHa} ha (tolerância: ${toleranceHa} ha)...`);
  
  for (let i = 0; i < maxIterations; i++) {
    const currentAreaHa = calcAreaHa(current);
    const diff = Math.abs(currentAreaHa - targetAreaHa);
    
    console.log(`  Iteração ${i + 1}: área atual = ${currentAreaHa.toFixed(2)} ha, diferença = ${diff.toFixed(2)} ha`);
    
    if (diff <= toleranceHa) {
      console.log(`✓ Área ajustada com sucesso: ${currentAreaHa.toFixed(2)} ha`);
      return current;
    }
    
    const scaleFactor = Math.sqrt(targetAreaHa / currentAreaHa);
    const centroid = turf.centroid(current).geometry.coordinates;
    
    const scaledCoords = current.geometry.coordinates[0].map(coord => [
      centroid[0] + (coord[0] - centroid[0]) * scaleFactor, 
      centroid[1] + (coord[1] - centroid[1]) * scaleFactor
    ]);
    
    current.geometry.coordinates = [scaledCoords];
  }
  
  const finalAreaHa = calcAreaHa(current);
  console.log(`⚠ Área após ${maxIterations} iterações: ${finalAreaHa.toFixed(2)} ha (diferença: ${Math.abs(finalAreaHa - targetAreaHa).toFixed(2)} ha)`);
  
  return current;
}

// ========================================================================
// PARTE 2: COORDENADAS E VÉRTICES
// ========================================================================

function formatCoordDecimal(decimal) {
  return decimal.toFixed(6);
}

function formatCoordGMS(decimal, isLat) {
  const abs = Math.abs(decimal);
  const deg = Math.floor(abs);
  const minDec = (abs - deg) * 60;
  const min = Math.floor(minDec);
  const sec = ((minDec - min) * 60).toFixed(2);
  
  const direction = isLat ? (decimal >= 0 ? 'N' : 'S') : (decimal >= 0 ? 'E' : 'W');
  return `${deg}°${String(min).padStart(2, '0')}'${String(sec).padStart(5, '0')}"${direction}`;
}

function extractVertices(polygonFeature, formatoCoordenadas) {
  const coords = polygonFeature.geometry.coordinates[0].slice(0, -1);
  console.log(`Extraindo ${coords.length} vértices no formato: ${formatoCoordenadas}...`);
  
  return coords.map((coord, i) => {
    const vertice = { 
      id: i + 1, 
      label: `P${String(i + 1).padStart(2, '0')}`,
      lat: coord[1], 
      lon: coord[0]
    };
    
    if (formatoCoordenadas === 'gms') {
      vertice.latFormatted = formatCoordGMS(coord[1], true);
      vertice.lonFormatted = formatCoordGMS(coord[0], false);
    } else {
      vertice.latFormatted = formatCoordDecimal(coord[1]);
      vertice.lonFormatted = formatCoordDecimal(coord[0]);
    }
    
    return vertice;
  });
}

// ========================================================================
// PARTE 3: GERAÇÃO DO PDF PROFISSIONAL COM TEMPLATE TIMBRADO
// ========================================================================

function generateProfessionalPDF(params) {
  const { fazendaNome, matricula, municipio, areaHa, vertices, polygon, formatoCoordenadas } = params;
  
  console.log('Gerando PDF profissional com template timbrado...');
  
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });
  
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  
  // ===== CABEÇALHO TIMBRADO (NÃO MEXER) =====
  // Faixa amarela superior
  doc.setFillColor(255, 193, 7);
  doc.rect(0, 0, pageWidth, 15, 'F');
  
  // Faixa verde escura superior
  doc.setFillColor(60, 95, 54);
  doc.rect(0, 15, pageWidth, 25, 'F');
  
  // Textos do cabeçalho
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('Rua Duque de Caxias', pageWidth - 10, 22, { align: 'right' });
  doc.text('N° 175 - Bom Jesus, GO', pageWidth - 10, 26, { align: 'right' });
  doc.text('CNPJ: 36.877.747/0001-70', pageWidth - 10, 30, { align: 'right' });
  doc.text('Telefone: (64) 3608-3944', pageWidth - 10, 34, { align: 'right' });
  doc.text('E-mail: contato@cerradoconsultoria.agr.br', pageWidth - 10, 38, { align: 'right' });
  
  // ===== TÍTULO DO DOCUMENTO =====
  let yPos = 50;
  doc.setTextColor(60, 95, 54);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(`Croqui de Localização - ${fazendaNome}`, pageWidth / 2, yPos, { align: 'center' });
  
  yPos += 8;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(`Matrícula nº ${matricula} | Município: ${municipio} | Área: ${areaHa.toFixed(2).replace('.', ',')} ha`, pageWidth / 2, yPos, { align: 'center' });
  
  // ===== GRÁFICO DO CROQUI COM GRID E BÚSSOLA =====
  yPos += 10;
  const graphX = 25;
  const graphY = yPos;
  const graphWidth = 160;
  const graphHeight = 130;
  
  // Calcula os limites do polígono
  const coords = polygon.geometry.coordinates[0];
  const lons = coords.map(c => c[0]);
  const lats = coords.map(c => c[1]);
  const lonMin = Math.min(...lons), lonMax = Math.max(...lons);
  const latMin = Math.min(...lats), latMax = Math.max(...lats);
  
  const lonRange = lonMax - lonMin;
  const latRange = latMax - latMin;
  const padding = 0.1;
  const fLonMin = lonMin - lonRange * padding;
  const fLonMax = lonMax + lonRange * padding;
  const fLatMin = latMin - latRange * padding;
  const fLatMax = latMax + latRange * padding;
  
  // Funções de conversão
  const toPixelX = lon => graphX + ((lon - fLonMin) / (fLonMax - fLonMin)) * graphWidth;
  const toPixelY = lat => graphY + ((fLatMax - lat) / (fLatMax - fLatMin)) * graphHeight;
  
  // Desenha o grid
  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.1);
  for (let i = 0; i <= 10; i++) {
    const x = graphX + (i / 10) * graphWidth;
    const y = graphY + (i / 10) * graphHeight;
    doc.line(x, graphY, x, graphY + graphHeight);
    doc.line(graphX, y, graphX + graphWidth, y);
  }
  
  // Desenha borda do gráfico
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.3);
  doc.rect(graphX, graphY, graphWidth, graphHeight);
  
  // Desenha os eixos com labels
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(7);
  
  // Label eixo Y (Latitude)
  doc.text('Latitude (°)', 10, graphY + graphHeight / 2, { angle: 90, align: 'center' });
  
  // Valores do eixo Y
  for (let i = 0; i <= 4; i++) {
    const lat = fLatMin + (i / 4) * (fLatMax - fLatMin);
    const y = graphY + graphHeight - (i / 4) * graphHeight;
    doc.text(lat.toFixed(3), graphX - 3, y, { align: 'right' });
  }
  
  // Label eixo X (Longitude)
  doc.text('Longitude (°)', pageWidth / 2, graphY + graphHeight + 8, { align: 'center' });
  
  // Valores do eixo X
  for (let i = 0; i <= 4; i++) {
    const lon = fLonMin + (i / 4) * (fLonMax - fLonMin);
    const x = graphX + (i / 4) * graphWidth;
    doc.text(lon.toFixed(3), x, graphY + graphHeight + 4, { align: 'center' });
  }
  
  // Desenha o polígono preenchido
  doc.setFillColor(200, 220, 192);
  doc.setDrawColor(45, 106, 46);
  doc.setLineWidth(0.5);
  
  const polyPoints = coords.map(c => [toPixelX(c[0]), toPixelY(c[1])]);
  doc.polygon(polyPoints, 'FD');
  
  // Desenha os vértices e labels
  doc.setFillColor(26, 77, 26);
  doc.setTextColor(26, 77, 26);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  
  vertices.forEach(v => {
    const x = toPixelX(v.lon);
    const y = toPixelY(v.lat);
    doc.circle(x, y, 0.8, 'F');
    doc.text(v.label, x + 2, y - 1);
  });
  
  // Desenha a bússola (indicador Norte)
  const compassX = graphX + graphWidth - 15;
  const compassY = graphY + 15;
  
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.3);
  doc.line(compassX, compassY, compassX, compassY - 10);
  doc.line(compassX, compassY - 10, compassX - 2, compassY - 7);
  doc.line(compassX, compassY - 10, compassX + 2, compassY - 7);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('N', compassX, compassY - 12, { align: 'center' });
  
  // ===== TABELA DE COORDENADAS =====
  yPos = graphY + graphHeight + 15;
  
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  const coordLabel = formatoCoordenadas === 'gms' 
    ? 'Coordenadas Geográficas (Graus, Minutos e Segundos) - Datum: SIRGAS 2000'
    : 'Coordenadas Geográficas (Graus Decimais) - Datum: SIRGAS 2000';
  doc.text(coordLabel, pageWidth / 2, yPos, { align: 'center' });
  
  yPos += 5;
  
  // Cabeçalho da tabela
  const colWidth = 31.5;
  let xPos = 10;
  
  doc.setFillColor(60, 95, 54);
  doc.rect(xPos, yPos, colWidth, 6, 'F');
  doc.rect(xPos + colWidth, yPos, colWidth, 6, 'F');
  doc.rect(xPos + colWidth * 2, yPos, colWidth, 6, 'F');
  doc.rect(xPos + colWidth * 3, yPos, colWidth, 6, 'F');
  doc.rect(xPos + colWidth * 4, yPos, colWidth, 6, 'F');
  doc.rect(xPos + colWidth * 5, yPos, colWidth, 6, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('Vértice', xPos + colWidth / 2, yPos + 4, { align: 'center' });
  doc.text('Latitude', xPos + colWidth * 1.5, yPos + 4, { align: 'center' });
  doc.text('Longitude', xPos + colWidth * 2.5, yPos + 4, { align: 'center' });
  doc.text('Vértice', xPos + colWidth * 3.5, yPos + 4, { align: 'center' });
  doc.text('Latitude', xPos + colWidth * 4.5, yPos + 4, { align: 'center' });
  doc.text('Longitude', xPos + colWidth * 5.5, yPos + 4, { align: 'center' });
  
  yPos += 6;
  
  // Dados da tabela (duas colunas)
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  
  const halfCount = Math.ceil(vertices.length / 2);
  
  for (let i = 0; i < halfCount; i++) {
    const v1 = vertices[i];
    const v2 = i + halfCount < vertices.length ? vertices[i + halfCount] : null;
    
    const rowHeight = 5;
    
    // Primeira coluna de vértices
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.1);
    doc.rect(xPos, yPos, colWidth, rowHeight);
    doc.rect(xPos + colWidth, yPos, colWidth, rowHeight);
    doc.rect(xPos + colWidth * 2, yPos, colWidth, rowHeight);
    
    doc.text(v1.label, xPos + colWidth / 2, yPos + 3.5, { align: 'center' });
    doc.text(v1.latFormatted, xPos + colWidth * 1.5, yPos + 3.5, { align: 'center' });
    doc.text(v1.lonFormatted, xPos + colWidth * 2.5, yPos + 3.5, { align: 'center' });
    
    // Segunda coluna de vértices
    doc.rect(xPos + colWidth * 3, yPos, colWidth, rowHeight);
    doc.rect(xPos + colWidth * 4, yPos, colWidth, rowHeight);
    doc.rect(xPos + colWidth * 5, yPos, colWidth, rowHeight);
    
    if (v2) {
      doc.text(v2.label, xPos + colWidth * 3.5, yPos + 3.5, { align: 'center' });
      doc.text(v2.latFormatted, xPos + colWidth * 4.5, yPos + 3.5, { align: 'center' });
      doc.text(v2.lonFormatted, xPos + colWidth * 5.5, yPos + 3.5, { align: 'center' });
    }
    
    yPos += rowHeight;
  }
  
  // ===== ÁREA TOTAL =====
  yPos += 5;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text(`Área Total: ${areaHa.toFixed(2).replace('.', ',')} ha`, pageWidth / 2, yPos, { align: 'center' });
  
  // ===== ASSINATURA =====
  yPos += 10;
  doc.setLineWidth(0.3);
  doc.line(pageWidth / 2 - 40, yPos, pageWidth / 2 + 40, yPos);
  
  yPos += 4;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('Rodrigo Rodrigues Lopes do Nascimento', pageWidth / 2, yPos, { align: 'center' });
  
  yPos += 4;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text('CPF: 005.789.781-64 | CREA-GO: 24423/D', pageWidth / 2, yPos, { align: 'center' });
  
  yPos += 4;
  doc.setFont('helvetica', 'bold');
  doc.text('Responsável Técnico', pageWidth / 2, yPos, { align: 'center' });
  
  // ===== RODAPÉ TIMBRADO (NÃO MEXER) =====
  const footerY = pageHeight - 20;
  
  // Faixa verde escura inferior
  doc.setFillColor(60, 95, 54);
  doc.rect(0, footerY, pageWidth, 20, 'F');
  
  // Textos do rodapé
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Rua Duque de Caxias', pageWidth / 2 - 60, footerY + 10, { align: 'left' });
  doc.text('N° 175 - Bom Jesus, GO', pageWidth / 2 - 60, footerY + 14, { align: 'left' });
  doc.text('CNPJ: 36.877.747/0001-70', pageWidth / 2 - 60, footerY + 18, { align: 'left' });
  
  doc.text('Telefone: (64) 3608-3944', pageWidth / 2 + 20, footerY + 12, { align: 'left' });
  doc.text('E-mail: contato@cerradoconsultoria.agr.br', pageWidth / 2 + 20, footerY + 16, { align: 'left' });
  
  console.log('✓ PDF profissional gerado com sucesso');
  return doc.output('arraybuffer');
}

// ========================================================================
// PARTE 4: GERAÇÃO DO ARQUIVO KML AJUSTADO
// ========================================================================

function generateKMLString(params) {
  const { polygon, fazendaNome } = params;
  
  console.log('Gerando arquivo KML ajustado para a área desejada...');
  
  const coordString = polygon.geometry.coordinates[0]
    .map(c => `${c[0].toFixed(8)},${c[1].toFixed(8)},0`)
    .join(' ');
  
  const kmlStr = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>${fazendaNome}</name>
    <Placemark>
      <name>${fazendaNome}</name>
      <Polygon>
        <outerBoundaryIs>
          <LinearRing>
            <coordinates>${coordString}</coordinates>
          </LinearRing>
        </outerBoundaryIs>
      </Polygon>
    </Placemark>
  </Document>
</kml>`;
  
  console.log('✓ Arquivo KML ajustado gerado com sucesso');
  return kmlStr;
}

// ========================================================================
// FUNÇÃO PRINCIPAL - ENDPOINT DENO
// ========================================================================

Deno.serve(async (req) => {
  try {
    console.log('========================================');
    console.log('Iniciando geração de croqui...');
    console.log('========================================');
    
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Não autorizado' }, { status: 401 });
    }
    
    const { kmlContent, formData } = await req.json();
    const { fazendaNome, matricula, municipio, areaHa, maxPoints = 20, formatoCoordenadas = 'decimal' } = formData;
    
    console.log('Dados recebidos:');
    console.log(`  Fazenda: ${fazendaNome}`);
    console.log(`  Matrícula: ${matricula}`);
    console.log(`  Município: ${municipio}`);
    console.log(`  Área desejada: ${areaHa} ha`);
    console.log(`  Formato de coordenadas: ${formatoCoordenadas}`);
    
    // PASSO 1: Processa o KML e simplifica o polígono
    const polygonFeature = parseKMLFromString(kmlContent);
    const simplifiedPolygon = simplifyPolygonDynamic(polygonFeature, parseFloat(areaHa), parseInt(maxPoints));
    const vertices = extractVertices(simplifiedPolygon, formatoCoordenadas);
    const finalAreaHa = calcAreaHa(simplifiedPolygon);
    
    console.log(`\n✓ Polígono processado:`);
    console.log(`  Vértices: ${vertices.length}`);
    console.log(`  Área final: ${finalAreaHa.toFixed(2)} ha`);
    console.log(`  Diferença da área alvo: ${Math.abs(finalAreaHa - parseFloat(areaHa)).toFixed(2)} ha`);
    
    const geoResult = { polygon: simplifiedPolygon, vertices };
    
    // PASSO 2: Gera o PDF profissional
    const pdfBuffer = generateProfessionalPDF({ 
      fazendaNome, 
      matricula, 
      municipio, 
      areaHa: finalAreaHa, 
      vertices, 
      polygon: simplifiedPolygon,
      formatoCoordenadas
    });
    
    // PASSO 3: Gera o KML ajustado
    const kmlString = generateKMLString({ ...formData, ...geoResult });
    const kmlBuffer = new TextEncoder().encode(kmlString);
    
    // PASSO 4: Upload dos arquivos com nomes corretos
    console.log('\nFazendo upload dos arquivos gerados...');
    const nomeBase = `Croqui_${fazendaNome.replace(/\s+/g, '_')}_Mat_${matricula}`;
    
    const pdfBlob = new Blob([pdfBuffer], { type: 'application/pdf' });
    const pdfFile = new File([pdfBlob], `${nomeBase}.pdf`);
    const { file_url: pdfUrl } = await base44.asServiceRole.integrations.Core.UploadFile({ file: pdfFile });
    console.log('  ✓ PDF:', pdfUrl);
    
    const kmlBlob = new Blob([kmlBuffer], { type: 'application/vnd.google-earth.kml+xml' });
    const kmlFile = new File([kmlBlob], `${nomeBase}.kml`);
    const { file_url: kmlUrl } = await base44.asServiceRole.integrations.Core.UploadFile({ file: kmlFile });
    console.log('  ✓ KML:', kmlUrl);
    
    console.log('\n========================================');
    console.log('✓ CROQUI GERADO COM SUCESSO!');
    console.log('========================================\n');
    
    return Response.json({
      success: true,
      files: {
        docx_url: pdfUrl,
        docx_filename: `${nomeBase}.docx`,
        pdf_url: pdfUrl,
        pdf_filename: `${nomeBase}.pdf`,
        kml_url: kmlUrl,
        kml_filename: `${nomeBase}.kml`
      },
      stats: {
        vertices_count: vertices.length,
        final_area_ha: parseFloat(finalAreaHa.toFixed(2)),
        area_difference_ha: parseFloat(Math.abs(finalAreaHa - parseFloat(areaHa)).toFixed(2)),
        coordinate_format: formatoCoordenadas
      }
    });
    
  } catch (error) {
    console.error('\n❌ ERRO AO GERAR CROQUI:', error);
    console.error('Stack:', error.stack);
    
    return Response.json({
      success: false,
      error: error.message || 'Erro desconhecido ao gerar croqui'
    }, { status: 500 });
  }
});