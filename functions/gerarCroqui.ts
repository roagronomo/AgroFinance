import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import * as tj from 'npm:@tmcw/togeojson@5.8.1';
import * as turf from 'npm:@turf/turf@7.0.0';
import proj4 from 'npm:proj4@2.11.0';
import { DOMParser } from 'npm:xmldom@0.6.0';
import { createCanvas } from 'npm:canvas@2.11.2';
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, ImageRun, AlignmentType, WidthType, VerticalAlign, Header, Footer, convertInchesToTwip } from 'npm:docx@8.5.0';

// ==================================================================
// PROCESSAMENTO GEOESPACIAL
// ==================================================================

function parseKMLFromString(kmlContent) {
  const dom = new DOMParser().parseFromString(kmlContent, 'text/xml');
  const geojson = tj.kml(dom);
  const polygonFeature = geojson.features.find(f => f.geometry.type === 'Polygon' || f.geometry.type === 'MultiPolygon');
  
  if (!polygonFeature) throw new Error('Nenhum polígono encontrado no arquivo KML.');
  
  if (polygonFeature.geometry.type === 'MultiPolygon') {
    let maxArea = 0, maxIdx = 0;
    polygonFeature.geometry.coordinates.forEach((coords, idx) => {
      const area = turf.area(turf.polygon(coords));
      if (area > maxArea) { maxArea = area; maxIdx = idx; }
    });
    polygonFeature.geometry = { type: 'Polygon', coordinates: polygonFeature.geometry.coordinates[maxIdx] };
  }
  
  return polygonFeature;
}

function calcAreaHa(polygon) {
  return turf.area(polygon.type === 'Feature' ? polygon : turf.feature(polygon)) / 10000;
}

function simplifyPolygonDynamic(polygonFeature, targetAreaHa, maxPoints = 20, toleranceHa = 2.0) {
  const originalCoords = polygonFeature.geometry.coordinates[0];
  const originalPointCount = originalCoords.length - 1;
  
  if (originalPointCount <= maxPoints) {
    return adjustAreaToTarget(polygonFeature, targetAreaHa, toleranceHa);
  }
  
  const candidates = [];
  for (let exp = -5; exp <= -1.5; exp += 0.1) {
    try {
      const simplified = turf.simplify(polygonFeature, { tolerance: Math.pow(10, exp), highQuality: true });
      const pointCount = simplified.geometry.coordinates[0].length - 1;
      if (pointCount >= 4 && pointCount <= maxPoints) {
        const areaHa = calcAreaHa(simplified);
        candidates.push({ 
          polygon: simplified, 
          pointCount, 
          areaHa, 
          shapeFidelity: Math.abs(1 - (areaHa / calcAreaHa(polygonFeature))) 
        });
      }
    } catch (e) {}
  }
  
  if (candidates.length === 0) return adjustAreaToTarget(polygonFeature, targetAreaHa, toleranceHa);
  
  candidates.sort((a, b) => {
    const aGood = a.shapeFidelity < 0.3, bGood = b.shapeFidelity < 0.3;
    if (aGood && !bGood) return -1;
    if (!aGood && bGood) return 1;
    if (a.pointCount !== b.pointCount) return a.pointCount - b.pointCount;
    return a.shapeFidelity - b.shapeFidelity;
  });
  
  return adjustAreaToTarget(candidates[0].polygon, targetAreaHa, toleranceHa);
}

function adjustAreaToTarget(polygonFeature, targetAreaHa, toleranceHa = 2.0, maxIterations = 10) {
  let current = JSON.parse(JSON.stringify(polygonFeature));
  
  for (let i = 0; i < maxIterations; i++) {
    const currentAreaHa = calcAreaHa(current);
    if (Math.abs(currentAreaHa - targetAreaHa) <= toleranceHa) return current;
    
    const scaleFactor = Math.sqrt(targetAreaHa / currentAreaHa);
    const centroid = turf.centroid(current).geometry.coordinates;
    const scaledCoords = current.geometry.coordinates[0].map(c => [
      centroid[0] + (c[0] - centroid[0]) * scaleFactor, 
      centroid[1] + (c[1] - centroid[1]) * scaleFactor
    ]);
    current.geometry.coordinates = [scaledCoords];
  }
  
  return current;
}

function getUTMZone(lon) { 
  return Math.floor((lon + 180) / 6) + 1; 
}

function toUTM(lon, lat) {
  const zone = getUTMZone(lon);
  const utmProj = `+proj=utm +zone=${zone} +${lat >= 0 ? 'north' : 'south'} +datum=WGS84 +units=m +no_defs`;
  const [easting, northing] = proj4('+proj=longlat +datum=WGS84 +no_defs', utmProj, [lon, lat]);
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
  return polygonFeature.geometry.coordinates[0].slice(0, -1).map((coord, i) => {
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

// ==================================================================
// GERAÇÃO DE IMAGEM
// ==================================================================

function generateCroquiImageBuffer(geoResult, areaHa) {
  const DPI = 300, WIDTH_CM = 11, HEIGHT_CM = 12;
  const WIDTH_PX = Math.round(WIDTH_CM / 2.54 * DPI);
  const HEIGHT_PX = Math.round(HEIGHT_CM / 2.54 * DPI);
  const canvas = createCanvas(WIDTH_PX, HEIGHT_PX);
  const ctx = canvas.getContext('2d');
  
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, WIDTH_PX, HEIGHT_PX);
  
  const margin = { 
    left: WIDTH_PX * 0.12, 
    right: WIDTH_PX * 0.04, 
    top: HEIGHT_PX * 0.04, 
    bottom: HEIGHT_PX * 0.10 
  };
  
  const plotWidth = WIDTH_PX - margin.left - margin.right;
  const plotHeight = HEIGHT_PX - margin.top - margin.bottom;
  
  const coords = geoResult.polygon.geometry.coordinates[0];
  const lons = coords.map(c => c[0]);
  const lats = coords.map(c => c[1]);
  const lonMin = Math.min(...lons), lonMax = Math.max(...lons);
  const latMin = Math.min(...lats), latMax = Math.max(...lats);
  
  const lonPad = (lonMax - lonMin) * 0.08;
  const latPad = (latMax - latMin) * 0.08;
  let fLonMin = lonMin - lonPad, fLonMax = lonMax + lonPad;
  let fLatMin = latMin - latPad, fLatMax = latMax + latPad;
  
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
  
  const toPixelX = lon => margin.left + ((lon - fLonMin) / (fLonMax - fLonMin)) * plotWidth;
  const toPixelY = lat => margin.top + ((fLatMax - lat) / (fLatMax - fLatMin)) * plotHeight;
  
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
  
  const fontSize = Math.round(WIDTH_PX * 0.022);
  ctx.font = `bold ${fontSize}px sans-serif`;
  ctx.fillStyle = '#1a4d1a';
  
  geoResult.vertices.forEach(v => {
    const x = toPixelX(v.lon), y = toPixelY(v.lat);
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillText(v.label, x + 8, y - 8);
  });
  
  const areaFontSize = Math.round(WIDTH_PX * 0.024);
  ctx.font = `bold ${areaFontSize}px sans-serif`;
  ctx.fillStyle = '#2d6a2e';
  ctx.textAlign = 'center';
  ctx.fillText(`Área: ${areaHa.toFixed(2).replace('.', ',')} ha`, WIDTH_PX / 2, HEIGHT_PX - 15);
  
  return canvas.toBuffer('image/png');
}

// ==================================================================
// GERAÇÃO DE DOCX
// ==================================================================

async function generateDocxBuffer(params) {
  const { fazendaNome, matricula, municipio, areaHa, vertices, imageBuffer } = params;
  const GREEN_DARK = '2d6a2e';
  
  const headerCell = text => new TableCell({ 
    shading: { fill: GREEN_DARK }, 
    verticalAlign: VerticalAlign.CENTER, 
    children: [new Paragraph({ 
      alignment: AlignmentType.CENTER, 
      children: [new TextRun({ text, font: 'Calibri Light', size: 18, bold: true, color: 'FFFFFF' })] 
    })] 
  });
  
  const dataCell = text => new TableCell({ 
    verticalAlign: VerticalAlign.CENTER, 
    children: [new Paragraph({ 
      alignment: AlignmentType.CENTER, 
      children: [new TextRun({ text, font: 'Calibri Light', size: 18 })] 
    })] 
  });
  
  const halfCount = Math.ceil(vertices.length / 2);
  const tableRows = [new TableRow({ 
    tableHeader: true, 
    children: [
      headerCell('Vértice'), 
      headerCell('Latitude'), 
      headerCell('Longitude'), 
      headerCell('Vértice'), 
      headerCell('Latitude'), 
      headerCell('Longitude')
    ] 
  })];
  
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
  
  return await Packer.toBuffer(doc);
}

// ==================================================================
// GERAÇÃO DE KML
// ==================================================================

function generateKMLString(params) {
  const { polygon, fazendaNome } = params;
  const coordString = polygon.geometry.coordinates[0]
    .map(c => `${c[0].toFixed(8)},${c[1].toFixed(8)},0`)
    .join(' ');
  
  return `<?xml version="1.0" encoding="UTF-8"?>
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
}

// ==================================================================
// FUNÇÃO PRINCIPAL
// ==================================================================

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { kmlContent, formData } = await req.json();
    const { fazendaNome, matricula, municipio, areaHa, maxPoints = 20 } = formData;
    
    console.log('Iniciando processamento do croqui para:', fazendaNome);
    
    // 1. Processamento Geoespacial
    const polygonFeature = parseKMLFromString(kmlContent);
    const simplifiedPolygon = simplifyPolygonDynamic(polygonFeature, parseFloat(areaHa), parseInt(maxPoints));
    const vertices = extractVertices(simplifiedPolygon);
    const geoResult = { polygon: simplifiedPolygon, vertices };
    
    console.log('Polígono processado com', vertices.length, 'vértices');
    
    // 2. Geração da Imagem PNG
    const imageBuffer = generateCroquiImageBuffer(geoResult, parseFloat(areaHa));
    
    // 3. Geração do DOCX
    const docxBuffer = await generateDocxBuffer({ 
      fazendaNome, 
      matricula, 
      municipio, 
      areaHa, 
      vertices, 
      imageBuffer 
    });
    
    // 4. Geração do KML Final
    const kmlString = generateKMLString({ ...formData, ...geoResult });
    const kmlBuffer = new TextEncoder().encode(kmlString);
    
    // 5. Upload dos arquivos gerados
    const nomeBase = fazendaNome.replace(/\s+/g, '_');
    
    const docxBlob = new Blob([docxBuffer], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
    const docxFile = new File([docxBlob], `Croqui_${nomeBase}_Mat_${matricula}.docx`);
    const { file_url: docxUrl } = await base44.asServiceRole.integrations.Core.UploadFile({ file: docxFile });
    
    const pngBlob = new Blob([imageBuffer], { type: 'image/png' });
    const pngFile = new File([pngBlob], `Croqui_${nomeBase}.png`);
    const { file_url: pngUrl } = await base44.asServiceRole.integrations.Core.UploadFile({ file: pngFile });
    
    const kmlBlob = new Blob([kmlBuffer], { type: 'application/vnd.google-earth.kml+xml' });
    const kmlFile = new File([kmlBlob], `Croqui_${nomeBase}.kml`);
    const { file_url: kmlUrl } = await base44.asServiceRole.integrations.Core.UploadFile({ file: kmlFile });
    
    console.log('Croqui gerado com sucesso!');
    
    return Response.json({
      success: true,
      files: {
        docx_url: docxUrl,
        docx_filename: `Croqui_${nomeBase}_Mat_${matricula}.docx`,
        png_url: pngUrl,
        png_filename: `Croqui_${nomeBase}.png`,
        kml_url: kmlUrl,
        kml_filename: `Croqui_${nomeBase}.kml`
      }
    });
    
  } catch (error) {
    console.error('Erro ao gerar croqui:', error);
    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
});