import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { kml } from 'npm:@tmcw/togeojson@5.8.1';
import * as turf from 'npm:@turf/turf@7.0.0';
import proj4 from 'npm:proj4@2.11.0';
import { DOMParser } from 'npm:xmldom@0.6.0';
import { createCanvas } from 'npm:canvas@2.11.2';
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, ImageRun, AlignmentType, WidthType, VerticalAlign, Header, Footer, convertInchesToTwip } from 'npm:docx@8.5.0';

// ========================================================================
// PARTE 1: PROCESSAMENTO GEOESPACIAL - Leitura e Simplificação do KML
// ========================================================================

function parseKMLFromString(kmlContent) {
  try {
    console.log('Parseando KML...');
    const parser = new DOMParser();
    const dom = parser.parseFromString(kmlContent, 'text/xml');
    const geojson = kml(dom);
    
    console.log('GeoJSON gerado, features:', geojson.features.length);
    
    // Encontra o polígono no GeoJSON
    const polygonFeature = geojson.features.find(f => 
      f.geometry.type === 'Polygon' || f.geometry.type === 'MultiPolygon'
    );
    
    if (!polygonFeature) {
      throw new Error('Nenhum polígono encontrado no arquivo KML.');
    }
    
    // Se for MultiPolygon, pega o maior polígono
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
  
  // Se já tem poucos pontos, só ajusta a área
  if (originalPointCount <= maxPoints) {
    console.log('Polígono já tem poucos pontos, apenas ajustando área...');
    return adjustAreaToTarget(polygonFeature, targetAreaHa, toleranceHa);
  }
  
  // Tenta simplificar mantendo a forma
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
  
  // Ordena candidatos: prioriza menor número de pontos e melhor fidelidade de forma
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
    
    // Calcula fator de escala para ajustar a área
    const scaleFactor = Math.sqrt(targetAreaHa / currentAreaHa);
    const centroid = turf.centroid(current).geometry.coordinates;
    
    // Escala as coordenadas em relação ao centróide
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

function getUTMZone(lon) { 
  return Math.floor((lon + 180) / 6) + 1; 
}

function toUTM(lon, lat) {
  const zone = getUTMZone(lon);
  const hemisphere = lat >= 0 ? 'north' : 'south';
  const utmProj = `+proj=utm +zone=${zone} +${hemisphere} +datum=WGS84 +units=m +no_defs`;
  const wgs84Proj = '+proj=longlat +datum=WGS84 +no_defs';
  
  const [easting, northing] = proj4(wgs84Proj, utmProj, [lon, lat]);
  return { easting, northing, zone };
}

function formatCoord(decimal, suffix) {
  const abs = Math.abs(decimal);
  const deg = Math.floor(abs);
  const minDec = (abs - deg) * 60;
  const min = Math.floor(minDec);
  const sec = ((minDec - min) * 60).toFixed(2);
  return `${deg}°${String(min).padStart(2, '0')}'${String(sec).padStart(5, '0')}"${suffix}`;
}

function extractVertices(polygonFeature) {
  const coords = polygonFeature.geometry.coordinates[0].slice(0, -1);
  console.log(`Extraindo ${coords.length} vértices...`);
  
  return coords.map((coord, i) => {
    const utm = toUTM(coord[0], coord[1]);
    return { 
      id: i + 1, 
      label: `V${String(i + 1).padStart(2, '0')}`, 
      lat: coord[1], 
      lon: coord[0], 
      latFormatted: formatCoord(coord[1], 'S'), 
      lonFormatted: formatCoord(coord[0], 'W'), 
      ...utm 
    };
  });
}

// ========================================================================
// PARTE 3: GERAÇÃO DE IMAGEM PNG DO CROQUI
// ========================================================================

function generateCroquiImageBuffer(geoResult, areaHa) {
  console.log('Gerando imagem PNG do croqui...');
  
  const DPI = 300;
  const WIDTH_CM = 11;
  const HEIGHT_CM = 12;
  const WIDTH_PX = Math.round(WIDTH_CM / 2.54 * DPI);
  const HEIGHT_PX = Math.round(HEIGHT_CM / 2.54 * DPI);
  
  const canvas = createCanvas(WIDTH_PX, HEIGHT_PX);
  const ctx = canvas.getContext('2d');
  
  // Fundo branco
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, WIDTH_PX, HEIGHT_PX);
  
  // Margens
  const margin = { 
    left: WIDTH_PX * 0.12, 
    right: WIDTH_PX * 0.04, 
    top: HEIGHT_PX * 0.04, 
    bottom: HEIGHT_PX * 0.10 
  };
  
  const plotWidth = WIDTH_PX - margin.left - margin.right;
  const plotHeight = HEIGHT_PX - margin.top - margin.bottom;
  
  // Calcula bounds do polígono
  const coords = geoResult.polygon.geometry.coordinates[0];
  const lons = coords.map(c => c[0]);
  const lats = coords.map(c => c[1]);
  const lonMin = Math.min(...lons), lonMax = Math.max(...lons);
  const latMin = Math.min(...lats), latMax = Math.max(...lats);
  
  // Adiciona padding
  const lonPad = (lonMax - lonMin) * 0.08;
  const latPad = (latMax - latMin) * 0.08;
  let fLonMin = lonMin - lonPad, fLonMax = lonMax + lonPad;
  let fLatMin = latMin - latPad, fLatMax = latMax + latPad;
  
  // Ajusta aspect ratio
  const dataAspect = (fLonMax - fLonMin) / (fLatMax - fLatMin);
  const plotAspect = plotWidth / plotHeight;
  
  if (dataAspect > plotAspect) {
    const newLatRange = (fLonMax - fLonMin) / plotAspect;
    const latCenter = (fLatMin + fLatMax) / 2;
    fLatMin = latCenter - newLatRange / 2;
    fLatMax = latCenter + newLatRange / 2;
  } else {
    const newLonRange = (fLatMax - fLatMin) * plotAspect;
    const lonCenter = (fLonMin + fLonMax) / 2;
    fLonMin = lonCenter - newLonRange / 2;
    fLonMax = lonCenter + newLonRange / 2;
  }
  
  // Funções de conversão para pixel
  const toPixelX = lon => margin.left + ((lon - fLonMin) / (fLonMax - fLonMin)) * plotWidth;
  const toPixelY = lat => margin.top + ((fLatMax - lat) / (fLatMax - fLatMin)) * plotHeight;
  
  // Desenha o polígono
  ctx.strokeStyle = '#2d6a2e';
  ctx.lineWidth = 3;
  ctx.fillStyle = 'rgba(200, 220, 192, 0.7)';
  ctx.beginPath();
  coords.forEach((c, i) => {
    if (i === 0) ctx.moveTo(toPixelX(c[0]), toPixelY(c[1]));
    else ctx.lineTo(toPixelX(c[0]), toPixelY(c[1]));
  });
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  
  // Desenha os vértices e labels
  const fontSize = Math.round(WIDTH_PX * 0.022);
  ctx.font = `bold ${fontSize}px sans-serif`;
  ctx.fillStyle = '#1a4d1a';
  
  geoResult.vertices.forEach(v => {
    const x = toPixelX(v.lon);
    const y = toPixelY(v.lat);
    
    // Ponto do vértice
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fill();
    
    // Label do vértice
    ctx.fillText(v.label, x + 8, y - 8);
  });
  
  // Texto com a área
  const areaFontSize = Math.round(WIDTH_PX * 0.024);
  ctx.font = `bold ${areaFontSize}px sans-serif`;
  ctx.fillStyle = '#2d6a2e';
  ctx.textAlign = 'center';
  ctx.fillText(`Área: ${areaHa.toFixed(2).replace('.', ',')} ha`, WIDTH_PX / 2, HEIGHT_PX - 15);
  
  console.log('✓ Imagem PNG gerada com sucesso');
  return canvas.toBuffer('image/png');
}

// ========================================================================
// PARTE 4: GERAÇÃO DO DOCUMENTO WORD (DOCX)
// ========================================================================

async function generateDocxBuffer(params) {
  const { fazendaNome, matricula, municipio, areaHa, vertices, imageBuffer } = params;
  const GREEN_DARK = '2d6a2e';
  
  console.log('Gerando documento DOCX...');
  
  // Função para criar células do cabeçalho
  const headerCell = text => new TableCell({ 
    shading: { fill: GREEN_DARK }, 
    verticalAlign: VerticalAlign.CENTER, 
    children: [new Paragraph({ 
      alignment: AlignmentType.CENTER, 
      children: [new TextRun({ 
        text, 
        font: 'Calibri Light', 
        size: 18, 
        bold: true, 
        color: 'FFFFFF' 
      })] 
    })] 
  });
  
  // Função para criar células de dados
  const dataCell = text => new TableCell({ 
    verticalAlign: VerticalAlign.CENTER, 
    children: [new Paragraph({ 
      alignment: AlignmentType.CENTER, 
      children: [new TextRun({ 
        text, 
        font: 'Calibri Light', 
        size: 18 
      })] 
    })] 
  });
  
  // Cria tabela de coordenadas em duas colunas
  const halfCount = Math.ceil(vertices.length / 2);
  const tableRows = [
    new TableRow({ 
      tableHeader: true, 
      children: [
        headerCell('Vértice'), 
        headerCell('Latitude'), 
        headerCell('Longitude'), 
        headerCell('Vértice'), 
        headerCell('Latitude'), 
        headerCell('Longitude')
      ] 
    })
  ];
  
  for (let i = 0; i < halfCount; i++) {
    const v1 = vertices[i];
    const v2 = i + halfCount < vertices.length ? vertices[i + halfCount] : null;
    
    tableRows.push(new TableRow({ 
      children: [
        dataCell(v1.label), 
        dataCell(v1.latFormatted), 
        dataCell(v1.lonFormatted), 
        dataCell(v2 ? v2.label : ''), 
        dataCell(v2 ? v2.latFormatted : ''), 
        dataCell(v2 ? v2.lonFormatted : '')
      ] 
    }));
  }
  
  // Cria o documento
  const doc = new Document({
    sections: [{
      properties: { 
        page: { 
          margin: { 
            top: convertInchesToTwip(0.8), 
            bottom: convertInchesToTwip(0.6), 
            left: convertInchesToTwip(0.8), 
            right: convertInchesToTwip(0.8) 
          } 
        } 
      },
      headers: { 
        default: new Header({ 
          children: [new Paragraph({ 
            alignment: AlignmentType.CENTER, 
            children: [new TextRun({ 
              text: 'CERRADO CONSULTORIA', 
              font: 'Calibri Light', 
              size: 18, 
              bold: true, 
              color: GREEN_DARK 
            })] 
          })] 
        }) 
      },
      footers: { 
        default: new Footer({ 
          children: [new Paragraph({ 
            alignment: AlignmentType.CENTER, 
            children: [new TextRun({ 
              text: 'Cerrado Consultoria, Gestão de Propriedades Rurais.', 
              font: 'Calibri Light', 
              size: 16, 
              italics: true, 
              color: '888888' 
            })] 
          })] 
        }) 
      },
      children: [
        new Paragraph({ 
          alignment: AlignmentType.CENTER, 
          spacing: { after: 100 }, 
          children: [new TextRun({ 
            text: 'CROQUI DE LOCALIZAÇÃO', 
            font: 'Calibri Light', 
            size: 28, 
            bold: true, 
            color: GREEN_DARK 
          })] 
        }),
        new Paragraph({ 
          alignment: AlignmentType.CENTER, 
          spacing: { after: 60 }, 
          children: [new TextRun({ 
            text: `${fazendaNome} – Matrícula nº ${matricula}`, 
            font: 'Calibri Light', 
            size: 22, 
            bold: true 
          })] 
        }),
        new Paragraph({ 
          alignment: AlignmentType.CENTER, 
          spacing: { after: 150 }, 
          children: [new TextRun({ 
            text: `${municipio} – Área: ${areaHa.toFixed(2).replace('.', ',')} ha`, 
            font: 'Calibri Light', 
            size: 20 
          })] 
        }),
        new Paragraph({ 
          alignment: AlignmentType.CENTER, 
          spacing: { after: 150 }, 
          children: [new ImageRun({ 
            data: imageBuffer, 
            transformation: { width: 312, height: 340 } 
          })] 
        }),
        new Table({ 
          width: { size: 100, type: WidthType.PERCENTAGE }, 
          rows: tableRows 
        }),
        new Paragraph({ spacing: { before: 200 } }),
        new Paragraph({ 
          alignment: AlignmentType.CENTER, 
          children: [new TextRun({ 
            text: '________________________________________', 
            font: 'Calibri Light', 
            size: 20 
          })] 
        }),
        new Paragraph({ 
          alignment: AlignmentType.CENTER, 
          children: [new TextRun({ 
            text: 'Rodrigo Vieira de Moraes', 
            font: 'Calibri Light', 
            size: 20, 
            bold: true 
          })] 
        }),
        new Paragraph({ 
          alignment: AlignmentType.CENTER, 
          children: [new TextRun({ 
            text: 'Engenheiro Agrônomo – CREA-GO 1021570580', 
            font: 'Calibri Light', 
            size: 18 
          })] 
        }),
      ]
    }]
  });
  
  const buffer = await Packer.toBuffer(doc);
  console.log('✓ Documento DOCX gerado com sucesso');
  return buffer;
}

// ========================================================================
// PARTE 5: GERAÇÃO DO ARQUIVO KML FINAL
// ========================================================================

function generateKMLString(params) {
  const { polygon, fazendaNome } = params;
  
  console.log('Gerando arquivo KML final...');
  
  const coordString = polygon.geometry.coordinates[0]
    .map(c => `${c[0].toFixed(8)},${c[1].toFixed(8)},0`)
    .join(' ');
  
  const kml = `<?xml version="1.0" encoding="UTF-8"?>
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
  
  console.log('✓ Arquivo KML gerado com sucesso');
  return kml;
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
    const { fazendaNome, matricula, municipio, areaHa, maxPoints = 20 } = formData;
    
    console.log('Dados recebidos:');
    console.log(`  Fazenda: ${fazendaNome}`);
    console.log(`  Matrícula: ${matricula}`);
    console.log(`  Município: ${municipio}`);
    console.log(`  Área desejada: ${areaHa} ha`);
    console.log(`  Max pontos: ${maxPoints}`);
    
    // PASSO 1: Processa o KML e simplifica o polígono
    const polygonFeature = parseKMLFromString(kmlContent);
    const simplifiedPolygon = simplifyPolygonDynamic(polygonFeature, parseFloat(areaHa), parseInt(maxPoints));
    const vertices = extractVertices(simplifiedPolygon);
    const finalAreaHa = calcAreaHa(simplifiedPolygon);
    
    console.log(`\n✓ Polígono processado:`);
    console.log(`  Vértices: ${vertices.length}`);
    console.log(`  Área final: ${finalAreaHa.toFixed(2)} ha`);
    console.log(`  Diferença: ${Math.abs(finalAreaHa - parseFloat(areaHa)).toFixed(2)} ha`);
    
    const geoResult = { polygon: simplifiedPolygon, vertices };
    
    // PASSO 2: Gera a imagem PNG
    const imageBuffer = generateCroquiImageBuffer(geoResult, finalAreaHa);
    
    // PASSO 3: Gera o documento DOCX
    const docxBuffer = await generateDocxBuffer({ 
      fazendaNome, 
      matricula, 
      municipio, 
      areaHa: finalAreaHa, 
      vertices, 
      imageBuffer 
    });
    
    // PASSO 4: Gera o KML final
    const kmlString = generateKMLString({ ...formData, ...geoResult });
    const kmlBuffer = new TextEncoder().encode(kmlString);
    
    // PASSO 5: Upload dos arquivos
    console.log('\nFazendo upload dos arquivos gerados...');
    const nomeBase = fazendaNome.replace(/\s+/g, '_');
    
    const docxBlob = new Blob([docxBuffer], { 
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' 
    });
    const docxFile = new File([docxBlob], `Croqui_${nomeBase}_Mat_${matricula}.docx`);
    const { file_url: docxUrl } = await base44.asServiceRole.integrations.Core.UploadFile({ file: docxFile });
    console.log('  ✓ DOCX:', docxUrl);
    
    const pngBlob = new Blob([imageBuffer], { type: 'image/png' });
    const pngFile = new File([pngBlob], `Croqui_${nomeBase}.png`);
    const { file_url: pngUrl } = await base44.asServiceRole.integrations.Core.UploadFile({ file: pngFile });
    console.log('  ✓ PNG:', pngUrl);
    
    const kmlBlob = new Blob([kmlBuffer], { type: 'application/vnd.google-earth.kml+xml' });
    const kmlFile = new File([kmlBlob], `Croqui_${nomeBase}.kml`);
    const { file_url: kmlUrl } = await base44.asServiceRole.integrations.Core.UploadFile({ file: kmlFile });
    console.log('  ✓ KML:', kmlUrl);
    
    console.log('\n========================================');
    console.log('✓ CROQUI GERADO COM SUCESSO!');
    console.log('========================================\n');
    
    return Response.json({
      success: true,
      files: {
        docx_url: docxUrl,
        docx_filename: `Croqui_${nomeBase}_Mat_${matricula}.docx`,
        png_url: pngUrl,
        png_filename: `Croqui_${nomeBase}.png`,
        kml_url: kmlUrl,
        kml_filename: `Croqui_${nomeBase}.kml`
      },
      stats: {
        vertices_count: vertices.length,
        final_area_ha: parseFloat(finalAreaHa.toFixed(2)),
        area_difference_ha: parseFloat(Math.abs(finalAreaHa - parseFloat(areaHa)).toFixed(2))
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