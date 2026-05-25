const fs = require('fs');
const path = require('path');
const { Document, Packer, Paragraph, TextRun, AlignmentType, UnderlineType } = require('docx');
const PDFDocument = require('pdfkit');
const xlsx = require('xlsx');

const outputDir = path.join(__dirname, '../../public/templates');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Ortak Metinler
const baslik = "100. YIL MESLEKİ EĞİTİM MERKEZİ MÜDÜRLÜĞÜNE\nSELÇUKLU";
const ogrenciBaslik = "Çırak Öğrencinin Bilgileri";
const paragrafText = "Yukarıda bilgileri yazılı olan ve işyerimde sözleşmeli çırak olarak çalışan, okulunuz öğrencisi, çıraklık sözleşmesindeki tüm sorumluluklarımı yerine getirdiğim halde hiçbir mazeret göstermeden işyerimden ....../....../20.... tarihinde ayrılmıştır. Adı geçen öğrencinin sözleşmesi feshedilmiştir.";
const arzText = "Gereğini bilgilerinize arz ederim.";

// 1. WORD ŞABLONU ÜRETİMİ
async function generateWord() {
  const doc = new Document({
    sections: [{
      properties: {},
      children: [
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: "100. YIL MESLEKİ EĞİTİM MERKEZİ MÜDÜRLÜĞÜNE", bold: true, size: 28 })],
        }),
        new Paragraph({
          alignment: AlignmentType.RIGHT,
          children: [new TextRun({ text: "SELÇUKLU", bold: true, size: 28 })],
        }),
        new Paragraph({ text: "", spacing: { after: 400 } }),
        new Paragraph({
          children: [new TextRun({ text: "Çırak Öğrencinin Bilgileri", bold: true, size: 24, underline: { type: UnderlineType.SINGLE } })],
        }),
        new Paragraph({ text: "", spacing: { after: 200 } }),
        new Paragraph({ children: [new TextRun({ text: "*Adı ve Soyadı              : ..............................................................", bold: true, size: 24 })] }),
        new Paragraph({ text: "", spacing: { after: 100 } }),
        new Paragraph({ children: [new TextRun({ text: "*TC Kimlik NO               : ..............................................................", bold: true, size: 24 })] }),
        new Paragraph({ text: "", spacing: { after: 100 } }),
        new Paragraph({ children: [new TextRun({ text: "*Okul NO    / SINIF         : .............................../...............................", bold: true, size: 24 })] }),
        new Paragraph({ text: "", spacing: { after: 100 } }),
        new Paragraph({ children: [new TextRun({ text: "Alan/Dal (Meslek)           : ..............................................................", bold: true, size: 24 })] }),
        new Paragraph({ text: "", spacing: { after: 400 } }),
        new Paragraph({
          text: paragrafText,
          spacing: { after: 400 },
          indent: { firstLine: 720 },
        }),
        new Paragraph({
          text: arzText,
          spacing: { after: 400 },
          indent: { firstLine: 720 },
        }),
        new Paragraph({ text: "Fesih Gerekçesi: ....................................................................................................................................................." }),
        new Paragraph({ text: "......................................................................................................................................................................" }),
        new Paragraph({ text: "", spacing: { after: 400 } }),
        new Paragraph({ children: [new TextRun({ text: "Usta Adı Soyadı:                                                                                      ..../....../20...", size: 24 })] }),
        new Paragraph({ text: "......................................" }),
        new Paragraph({ text: "", spacing: { after: 200 } }),
        new Paragraph({ children: [new TextRun({ text: "Usta Tel:.........................                                                                        İMZA ve KAŞE", size: 24 })] }),
        new Paragraph({ text: "Usta TC:........................." }),
        new Paragraph({ text: "", spacing: { after: 400 } }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: "Koord. Öğr: ...........................................", size: 24 })],
        }),
      ],
    }],
  });

  const buffer = await Packer.toBuffer(doc);
  fs.writeFileSync(path.join(outputDir, 'Ayrilma_Formu_Sablon.docx'), buffer);
}

// 2. PDF ŞABLONU ÜRETİMİ
function generatePDF() {
  return new Promise((resolve) => {
    const doc = new PDFDocument({ margin: 50 });
    const stream = fs.createWriteStream(path.join(outputDir, 'Ayrilma_Formu_Sablon.pdf'));
    doc.pipe(stream);
    
    doc.registerFont('Arial', 'C:/Windows/Fonts/arial.ttf');
    doc.registerFont('Arial-Bold', 'C:/Windows/Fonts/arialbd.ttf');

    // Font ayarı (Türkçe karakter desteği için Arial kullanıyoruz)
    doc.font('Arial-Bold').fontSize(14).text("100. YIL MESLEKİ EĞİTİM MERKEZİ MÜDÜRLÜĞÜNE", { align: 'center' });
    doc.text("SELÇUKLU", { align: 'right' });
    doc.moveDown(2);

    doc.fontSize(12).text("Çırak Öğrencinin Bilgileri", { underline: true });
    doc.moveDown(1);
    
    const lh = 20;
    doc.text("*Adı ve Soyadı              : ..............................................................", { lineGap: 10 });
    doc.text("*TC Kimlik NO               : ..............................................................", { lineGap: 10 });
    doc.text("*Okul NO    / SINIF         : .............................../...............................", { lineGap: 10 });
    doc.text("Alan/Dal (Meslek)           : ..............................................................", { lineGap: 10 });
    doc.moveDown(2);

    doc.font('Arial').text(paragrafText, { align: 'justify', indent: 30, lineGap: 5 });
    doc.moveDown(1);
    doc.text(arzText, { indent: 30 });
    doc.moveDown(2);

    doc.text("Fesih Gerekçesi:............................................................................................................", { lineGap: 5 });
    doc.text(".................................................................................................................................", { lineGap: 5 });
    doc.moveDown(2);

    const startY = doc.y;
    doc.text("Usta Adı Soyadı:", 50, startY);
    doc.text("..../....../20...", 400, startY, { align: 'right' });
    doc.text("......................................", 50, startY + 15);
    
    doc.text("Usta Tel:.........................", 50, startY + 45);
    doc.text("İMZA ve KAŞE", 400, startY + 45, { align: 'right' });
    doc.text("Usta TC:.........................", 50, startY + 65);
    
    doc.moveDown(4);
    doc.text("Koord. Öğr: ...........................................", 50, doc.y, { align: 'center' });

    doc.end();
    stream.on('finish', resolve);
  });
}

// 3. EXCEL ŞABLONU ÜRETİMİ
function generateExcel() {
  const wb = xlsx.utils.book_new();
  const wsData = [
    ["", "100. YIL MESLEKİ EĞİTİM MERKEZİ MÜDÜRLÜĞÜNE"],
    ["", "", "", "", "SELÇUKLU"],
    [""],
    ["Çırak Öğrencinin Bilgileri"],
    ["*Adı ve Soyadı", ":", ".............................................................."],
    ["*TC Kimlik NO", ":", ".............................................................."],
    ["*Okul NO / SINIF", ":", ".............................../..............................."],
    ["Alan/Dal (Meslek)", ":", ".............................................................."],
    [""],
    ["", "Yukarıda bilgileri yazılı olan ve işyerimde sözleşmeli çırak olarak çalışan, okulunuz"],
    ["", "öğrencisi, çıraklık sözleşmesindeki tüm sorumluluklarımı yerine getirdiğim halde"],
    ["", "hiçbir mazeret göstermeden işyerimden ....../....../20.... tarihinde ayrılmıştır."],
    ["", "Adı geçen öğrencinin sözleşmesi feshedilmiştir."],
    [""],
    ["", "Gereğini bilgilerinize arz ederim."],
    [""],
    ["Fesih Gerekçesi:", "........................................................................................................................"],
    ["", "........................................................................................................................"],
    [""],
    ["Usta Adı Soyadı:", "", "", "..../....../20..."],
    ["......................................"],
    [""],
    ["Usta Tel:.........................", "", "", "İMZA ve KAŞE"],
    ["Usta TC:........................."],
    [""],
    ["", "", "Koord. Öğr: ..........................................."]
  ];

  const ws = xlsx.utils.aoa_to_sheet(wsData);
  // Sütun genişlikleri
  ws['!cols'] = [{ wch: 25 }, { wch: 5 }, { wch: 30 }, { wch: 15 }, { wch: 20 }];
  
  xlsx.utils.book_append_sheet(wb, ws, "Şablon");
  xlsx.writeFile(wb, path.join(outputDir, 'Ayrilma_Formu_Sablon.xlsx'));
}

async function main() {
  await generateWord();
  await generatePDF();
  generateExcel();
  console.log("Şablonlar başarıyla oluşturuldu:", outputDir);
}

main().catch(console.error);
