import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { kml } from 'npm:@tmcw/togeojson@5.8.1';
import * as turf from 'npm:@turf/turf@7.0.0';
import proj4 from 'npm:proj4@2.11.0';
import { DOMParser } from 'npm:xmldom@0.6.0';
import { jsPDF } from 'npm:jspdf@2.5.2';
import { Document, Packer, Paragraph, Table, TableRow, TableCell, TextRun, AlignmentType, WidthType, HeadingLevel, BorderStyle } from 'npm:docx@8.5.0';

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
// PARTE 3: GERAÇÃO DO DOCX PROFISSIONAL
// ========================================================================

function generateProfessionalDOCX(params) {
  const { fazendaNome, matricula, municipio, areaHa, vertices, formatoCoordenadas } = params;
  
  console.log('Gerando documento DOCX profissional...');
  
  // Criar tabela de coordenadas
  const tableRows = [
    new TableRow({
      children: [
        new TableCell({
          children: [new Paragraph({ text: 'Vértice', alignment: AlignmentType.CENTER, bold: true })],
          width: { size: 15, type: WidthType.PERCENTAGE },
          shading: { fill: '3C5F36' }
        }),
        new TableCell({
          children: [new Paragraph({ text: 'Latitude', alignment: AlignmentType.CENTER, bold: true })],
          width: { size: 35, type: WidthType.PERCENTAGE },
          shading: { fill: '3C5F36' }
        }),
        new TableCell({
          children: [new Paragraph({ text: 'Longitude', alignment: AlignmentType.CENTER, bold: true })],
          width: { size: 35, type: WidthType.PERCENTAGE },
          shading: { fill: '3C5F36' }
        })
      ]
    })
  ];
  
  vertices.forEach(v => {
    tableRows.push(new TableRow({
      children: [
        new TableCell({ children: [new Paragraph({ text: v.label, alignment: AlignmentType.CENTER })] }),
        new TableCell({ children: [new Paragraph({ text: v.latFormatted, alignment: AlignmentType.CENTER })] }),
        new TableCell({ children: [new Paragraph({ text: v.lonFormatted, alignment: AlignmentType.CENTER })] })
      ]
    }));
  });
  
  const doc = new Document({
    sections: [{
      properties: {},
      children: [
        new Paragraph({
          text: `CROQUI DE LOCALIZAÇÃO`,
          heading: HeadingLevel.HEADING_1,
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 }
        }),
        new Paragraph({
          text: `Fazenda: ${fazendaNome}`,
          spacing: { after: 100 }
        }),
        new Paragraph({
          text: `Matrícula: ${matricula}`,
          spacing: { after: 100 }
        }),
        new Paragraph({
          text: `Município: ${municipio}`,
          spacing: { after: 100 }
        }),
        new Paragraph({
          text: `Área: ${areaHa.toFixed(2).replace('.', ',')} ha`,
          spacing: { after: 300 }
        }),
        new Paragraph({
          text: `Coordenadas Geográficas ${formatoCoordenadas === 'gms' ? '(Graus, Minutos e Segundos)' : '(Graus Decimais)'} - Datum: SIRGAS 2000`,
          heading: HeadingLevel.HEADING_2,
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 }
        }),
        new Table({
          rows: tableRows,
          width: { size: 100, type: WidthType.PERCENTAGE }
        }),
        new Paragraph({
          text: '',
          spacing: { after: 400 }
        }),
        new Paragraph({
          text: '________________________________________',
          alignment: AlignmentType.CENTER,
          spacing: { after: 100 }
        }),
        new Paragraph({
          text: 'Rodrigo Rodrigues Lopes do Nascimento',
          alignment: AlignmentType.CENTER,
          spacing: { after: 50 }
        }),
        new Paragraph({
          text: 'CPF: 005.789.781-64 | CREA-GO: 24423/D',
          alignment: AlignmentType.CENTER,
          spacing: { after: 50 }
        }),
        new Paragraph({
          text: 'Responsável Técnico',
          alignment: AlignmentType.CENTER,
          bold: true
        })
      ]
    }]
  });
  
  console.log('✓ Documento DOCX gerado com sucesso');
  return Packer.toBuffer(doc);
}

// ========================================================================
// PARTE 4: GERAÇÃO DO PDF PROFISSIONAL COM TEMPLATE TIMBRADO
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
  
  // ===== CABEÇALHO TIMBRADO - MODELO CERRADO =====
  // Faixa amarela superior
  doc.setFillColor(255, 193, 7);
  doc.rect(0, 0, pageWidth, 10, 'F');
  
  // Faixa verde com logo CERRADO
  doc.setFillColor(82, 115, 57);
  doc.rect(0, 10, pageWidth, 35, 'F');
  
  // Diagonal branca no canto direito
  doc.setFillColor(255, 255, 255);
  const diagPoints = [
    [pageWidth * 0.7, 10],
    [pageWidth, 10],
    [pageWidth, 45]
  ];
  doc.triangle(diagPoints[0][0], diagPoints[0][1], diagPoints[1][0], diagPoints[1][1], diagPoints[2][0], diagPoints[2][1], 'F');
  
  // Texto CERRADO (logo)
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('CERRADO', 25, 30);
  
  // Subtítulo
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text('Consultoria e Planejamento Agropecuário', 25, 36);
  
  // Informações de contato no topo (pequeno)
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(6.5);
  doc.text('Rua Duque de Caxias', pageWidth - 10, 3, { align: 'right' });
  doc.text('N° 175 - Bom Jesus, GO', pageWidth - 10, 6, { align: 'right' });
  doc.text('CNPJ: 36.877.747/0001-70', pageWidth - 65, 3);
  doc.text('Telefone: (64) 3608-3944', pageWidth - 65, 6);
  doc.text('E-mail: contato@cerradoconsultoria.agr.br', pageWidth - 65, 9);
  
  // ===== TÍTULO DO DOCUMENTO =====
  let yPos = 52;
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(`Croqui de Localização - ${fazendaNome}`, pageWidth / 2, yPos, { align: 'center' });
  
  yPos += 5;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Matrícula nº ${matricula} | Município: ${municipio} | Área: ${areaHa.toFixed(2).replace('.', ',')} ha`, pageWidth / 2, yPos, { align: 'center' });
  
  // ===== GRÁFICO DO CROQUI REDUZIDO =====
  yPos += 6;
  const graphWidth = 140;
  const graphHeight = 100;
  const graphX = (pageWidth - graphWidth) / 2;
  const graphY = yPos;
  
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
  
  // Desenha o polígono usando linhas conectadas
  doc.moveTo(polyPoints[0][0], polyPoints[0][1]);
  for (let i = 1; i < polyPoints.length; i++) {
    doc.lineTo(polyPoints[i][0], polyPoints[i][1]);
  }
  doc.lineTo(polyPoints[0][0], polyPoints[0][1]);
  doc.fillStroke();
  
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
  
  // Desenha a bússola (Rosa dos Ventos simplificada)
  const compassX = graphX + graphWidth - 20;
  const compassY = graphY + 20;
  const compassSize = 12;
  
  // Círculo externo
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.5);
  doc.circle(compassX, compassY, compassSize / 2);
  
  // Seta Norte (preenchida)
  doc.setFillColor(0, 0, 0);
  const northPoints = [
    [compassX, compassY - compassSize / 2],
    [compassX - 2, compassY],
    [compassX + 2, compassY]
  ];
  doc.triangle(northPoints[0][0], northPoints[0][1], northPoints[1][0], northPoints[1][1], northPoints[2][0], northPoints[2][1], 'F');
  
  // Seta Sul (branca)
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(0, 0, 0);
  const southPoints = [
    [compassX, compassY + compassSize / 2],
    [compassX - 2, compassY],
    [compassX + 2, compassY]
  ];
  doc.triangle(southPoints[0][0], southPoints[0][1], southPoints[1][0], southPoints[1][1], southPoints[2][0], southPoints[2][1], 'FD');
  
  // Letra N
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('N', compassX, compassY - compassSize / 2 - 2, { align: 'center' });
  
  // ===== TABELA DE COORDENADAS =====
  yPos = graphY + graphHeight + 8;
  
  doc.setTextColor(82, 115, 57);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  const coordLabel = formatoCoordenadas === 'gms' 
    ? 'Coordenadas Geográficas (Graus, Minutos e Segundos) - Datum: SIRGAS 2000'
    : 'Coordenadas Geográficas (Graus Decimais) - Datum: SIRGAS 2000';
  doc.text(coordLabel, pageWidth / 2, yPos, { align: 'center' });
  
  yPos += 4;
  
  // Cabeçalho da tabela
  const colWidth = 31;
  let xPos = 12;
  
  doc.setFillColor(82, 115, 57);
  doc.rect(xPos, yPos, colWidth, 6, 'F');
  doc.rect(xPos + colWidth, yPos, colWidth, 6, 'F');
  doc.rect(xPos + colWidth * 2, yPos, colWidth, 6, 'F');
  doc.rect(xPos + colWidth * 3, yPos, colWidth, 6, 'F');
  doc.rect(xPos + colWidth * 4, yPos, colWidth, 6, 'F');
  doc.rect(xPos + colWidth * 5, yPos, colWidth, 6, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(7.5);
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
  doc.setFontSize(6.5);
  
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
  yPos += 3;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(82, 115, 57);
  doc.text(`Área Total: ${areaHa.toFixed(2).replace('.', ',')} ha`, pageWidth / 2, yPos, { align: 'center' });
  
  // ===== ASSINATURA COM CERTIFICADO DIGITAL =====
  yPos += 5;
  
  // Box com informações do certificado (simulado)
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.3);
  const certBoxWidth = 80;
  const certBoxHeight = 10;
  const certBoxX = (pageWidth - certBoxWidth) / 2;
  doc.rect(certBoxX, yPos, certBoxWidth, certBoxHeight);
  
  doc.setFontSize(5.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0, 0, 0);
  const certLines = [
    'Assinado de forma digital por RODRIGO RODRIGUES LOPES DO',
    'NASCIMENTO:00578978164',
    'DN: c=BR, o=ICP-Brasil, ou=Certificado PF A3, ou=ARSERPRO, ou=Certificado PF A1,',
    'ou=25808960000128, cn=RODRIGO RODRIGUES LOPES DO NASCIMENTO:00578978164',
    'Dados: 2025.01.28 00:27:19 -03\'00\''
  ];
  let certY = yPos + 2.5;
  certLines.forEach(line => {
    doc.text(line, certBoxX + 2, certY);
    certY += 1.8;
  });
  
  yPos += certBoxHeight + 4;
  
  // Linha de assinatura
  doc.setLineWidth(0.4);
  doc.line(pageWidth / 2 - 40, yPos, pageWidth / 2 + 40, yPos);
  
  yPos += 3;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('Rodrigo Rodrigues Lopes do Nascimento', pageWidth / 2, yPos, { align: 'center' });
  
  yPos += 3;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text('CPF: 005.789.781-64 | CREA-GO: 24423/D', pageWidth / 2, yPos, { align: 'center' });
  
  yPos += 3;
  doc.setFont('helvetica', 'bold');
  doc.text('Responsável Técnico', pageWidth / 2, yPos, { align: 'center' });
  
  // ===== RODAPÉ TIMBRADO - MODELO CERRADO =====
  const footerY = pageHeight - 20;
  
  // Faixa verde com logo
  doc.setFillColor(82, 115, 57);
  doc.rect(0, footerY, pageWidth, 20, 'F');
  
  // Logo CERRADO no rodapé (menor)
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('CERRADO', 15, footerY + 12);
  
  // Divisor vertical
  doc.setDrawColor(255, 255, 255);
  doc.setLineWidth(0.5);
  doc.line(45, footerY + 4, 45, footerY + 16);
  
  // Informações de contato
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text('Rua Duque de Caxias', 50, footerY + 8);
  doc.text('N° 175 - Bom Jesus, GO', 50, footerY + 11);
  doc.text('CNPJ: 36.877.747/0001-70', 50, footerY + 14);
  
  // Divisor vertical
  doc.line(100, footerY + 4, 100, footerY + 16);
  
  doc.text('Telefone: (64) 3608-3944', 105, footerY + 10);
  doc.text('E-mail: contato@cerradoconsultoria.agr.br', 105, footerY + 13);
  
  console.log('✓ PDF profissional gerado com sucesso');
  return doc.output('arraybuffer');
}

// ========================================================================
// PARTE 5: GERAÇÃO DO ARQUIVO KML AJUSTADO
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
// PARTE 6: FUNÇÃO PRINCIPAL - ENDPOINT DENO
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
    
    // PASSO 2: Gera o DOCX profissional
    const docxBuffer = await generateProfessionalDOCX({ 
      fazendaNome, 
      matricula, 
      municipio, 
      areaHa: finalAreaHa, 
      vertices,
      formatoCoordenadas
    });
    
    // PASSO 3: Gera o PDF profissional
    const pdfBuffer = generateProfessionalPDF({ 
      fazendaNome, 
      matricula, 
      municipio, 
      areaHa: finalAreaHa, 
      vertices, 
      polygon: simplifiedPolygon,
      formatoCoordenadas
    });
    
    // PASSO 4: Gera o KML ajustado
    const kmlString = generateKMLString({ ...formData, ...geoResult });
    const kmlBuffer = new TextEncoder().encode(kmlString);
    
    // PASSO 5: Upload dos arquivos com nomes corretos
    console.log('\nFazendo upload dos arquivos gerados...');
    const nomeBase = `Croqui_${fazendaNome.replace(/\s+/g, '_')}_Mat_${matricula}`;
    
    const docxBlob = new Blob([docxBuffer], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
    const docxFile = new File([docxBlob], `${nomeBase}.docx`);
    const { file_url: docxUrl } = await base44.asServiceRole.integrations.Core.UploadFile({ file: docxFile });
    console.log('  ✓ DOCX:', docxUrl);
    
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
        docx_url: docxUrl,
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