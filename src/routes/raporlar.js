/**
 * raporlar.js — Word ve PDF rapor oluşturma API'si
 *
 * POST /api/raporlar/ogrenci-degerlendirme  → Öğrenci Değerlendirme Formu
 * POST /api/raporlar/ayrilma-formu          → İşyerinden Ayrılma Formu
 * POST /api/raporlar/ziyaret-formu          → Aylık Ziyaret Formu
 */

const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const db = require('../database/db');
const { authMiddleware } = require('../middleware/authMiddleware');
const { olusturOgretmenRaporuWord, olusturDegerlendirmeWord } = require('../utils/generate_word');

router.use(authMiddleware);

// Çıktı klasörü (backend/data/output)
const outputDir = path.join(__dirname, '../../data/output');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

/**
 * @route   GET /api/raporlar/ayrilma-sablon
 * @desc    İşyerinden Ayrılma Formu (Sözleşme Fesih) boş şablon linklerini döner
 */
router.get('/ayrilma-sablon', (req, res) => {
  res.json({
    message: 'Şablon dosyaları hazır',
    baslik: 'İşyerinden Ayrılma Formu (Sözleşme Fesih)',
    pdf_url: '/files/Ayrilma_Formu_Sablon.pdf',
    word_url: '/files/Ayrilma_Formu_Sablon.docx',
    excel_url: '/files/Ayrilma_Formu_Sablon.xlsx'
  });
});

/**
 * Öğrenci verilerini veritabanından çeken yardımcı fonksiyon
 */
function getOgrenci(ogrenci_id, ogretmen_id) {
  return db.prepare(`
    SELECT o.*, og.ad_soyad as ogretmen_adi
    FROM ogrenciler o
    JOIN ogretmenler og ON o.ogretmen_id = og.id
    WHERE o.id = ? AND o.ogretmen_id = ?
  `).get(ogrenci_id, ogretmen_id);
}

/**
 * Tarihi Türkçe formata çevirir: 2024-09-02 → 02/09/2024
 */
function formatTarih(tarihStr) {
  if (!tarihStr) return '___/___/______';
  const [yil, ay, gun] = tarihStr.split('-');
  return `${gun}/${ay}/${yil}`;
}

/**
 * POST /api/raporlar/ogrenci-degerlendirme
 * Öğrenci Değerlendirme Formu (Excel ve PDF)
 */
router.post('/ogrenci-degerlendirme', async (req, res) => {
  const { ogrenciler } = req.body; // Artık çoklu öğrenci desteği var

  if (!ogrenciler || !Array.isArray(ogrenciler) || ogrenciler.length === 0) {
    return res.status(400).json({ error: 'Öğrenci listesi boş olamaz' });
  }

  const ogretmenId = req.user.id;
  const ogrenciVerileri = [];

  for (const ogrId of ogrenciler) {
    const ogrenci = getOgrenci(ogrId, ogretmenId);
    if (ogrenci) {
      ogrenciVerileri.push(ogrenci);
    }
  }

  if (ogrenciVerileri.length === 0) {
    return res.status(404).json({ error: 'Öğrenci bulunamadı' });
  }

  // İkili gruplar halinde işlemek istiyorsanız (Eğer çoklu gönderilirse ilk ikisi alınır, 
  // ya da frontend ikili ikili istek atabilir. Şimdilik ilk iki öğrenciyi kullanıyoruz).
  const islenecekOgrenciler = ogrenciVerileri.slice(0, 2);

  try {
    const dataJson = JSON.stringify({ students: islenecekOgrenciler });
    const dataBase64 = Buffer.from(dataJson).toString('base64');
    const pyScript = path.join(__dirname, '../utils/generate_reports.py');
    
    // Python script'ini çalıştır
    const { exec } = require('child_process');
    const komut = `python3 "${pyScript}" degerlendirme ${dataBase64} "${outputDir}"`;
    
    exec(komut, (error, stdout, stderr) => {
      if (error) {
        console.error('Python Hatası (stderr):', stderr);
        console.error('Python Hatası (stdout):', stdout);
        return res.status(500).json({ error: 'Rapor üretilemedi', details: stdout || stderr });
      }
      
      try {
        const lines = stdout.split('\n');
        const jsonLine = lines.find(l => l.includes('xlsx_file'));
        const sonuc = JSON.parse(jsonLine);
        
        Promise.all([
          olusturDegerlendirmePDF(islenecekOgrenciler, `degerlendirme_${Date.now()}`),
          olusturDegerlendirmeWord(islenecekOgrenciler, path.join(outputDir, `degerlendirme_word_${Date.now()}.docx`))
        ]).then(([pdfYol, wordYol]) => {
          return res.json({
            message: 'Rapor oluşturuldu',
            pdf_url: `/files/${path.basename(pdfYol)}`,
            word_url: `/files/${path.basename(wordYol)}`,
            xlsx_url: `/files/${sonuc.xlsx_file}`
          });
        }).catch(err => {
          console.error('Word/PDF hatası:', err);
          return res.json({
            message: 'Rapor oluşturuldu',
            pdf_url: null,
            word_url: null,
            xlsx_url: `/files/${sonuc.xlsx_file}`
          });
        });
      } catch (parseErr) {
        console.error('Çıktı ayrıştırma hatası:', stdout);
        return res.status(500).json({ error: 'Rapor oluşturulamadı', details: stdout });
      }
    });

  } catch (err) {
    console.error('Rapor oluşturma hatası:', err);
    res.status(500).json({ error: 'Rapor oluşturulamadı', details: err.message });
  }
});

/**
 * POST /api/raporlar/ogretmen-raporu
 * Öğretmen Raporu (Excel) - Seçilen Öğrenciler İçin
 */
router.post('/ogretmen-raporu', async (req, res) => {
  const { ogrenciler } = req.body;

  if (!ogrenciler || !Array.isArray(ogrenciler) || ogrenciler.length === 0) {
    return res.status(400).json({ error: 'Öğrenci listesi boş olamaz' });
  }

  const ogretmenId = req.user.id;
  const ogrenciVerileri = [];

  for (const ogrId of ogrenciler) {
    const ogrenci = getOgrenci(ogrId, ogretmenId);
    if (ogrenci) {
      ogrenciVerileri.push(ogrenci);
    }
  }

  if (ogrenciVerileri.length === 0) {
    return res.status(404).json({ error: 'Öğrenci bulunamadı' });
  }

  try {
    const dataJson = JSON.stringify({ students: ogrenciVerileri });
    const dataBase64 = Buffer.from(dataJson).toString('base64');
    const pyScript = path.join(__dirname, '../utils/generate_reports.py');
    
    const { exec } = require('child_process');
    const komut = `python3 "${pyScript}" ogretmen ${dataBase64} "${outputDir}"`;
    
    exec(komut, (error, stdout, stderr) => {
      if (error) {
        console.error('Python Hatası (stderr):', stderr);
        console.error('Python Hatası (stdout):', stdout);
        return res.status(500).json({ error: 'Rapor üretilemedi', details: stdout || stderr });
      }
      
      try {
        const lines = stdout.split('\n');
        const jsonLine = lines.find(l => l.includes('xlsx_file'));
        const sonuc = JSON.parse(jsonLine);
        
        Promise.all([
          olusturOgretmenRaporuPDF(ogrenciVerileri, `ogretmen_${Date.now()}`),
          olusturOgretmenRaporuWord(ogrenciVerileri, path.join(outputDir, `ogretmen_word_${Date.now()}.docx`))
        ]).then(([pdfYol, wordYol]) => {
          return res.json({
            message: 'Rapor oluşturuldu',
            pdf_url: `/files/${path.basename(pdfYol)}`,
            word_url: `/files/${path.basename(wordYol)}`,
            xlsx_url: `/files/${sonuc.xlsx_file}`
          });
        }).catch(err => {
          console.error('Word/PDF hatası:', err);
          return res.json({
            message: 'Rapor oluşturuldu',
            pdf_url: null,
            word_url: null,
            xlsx_url: `/files/${sonuc.xlsx_file}`
          });
        });
      } catch (parseErr) {
        console.error('Çıktı ayrıştırma hatası:', stdout);
        return res.status(500).json({ error: 'Rapor oluşturulamadı', details: stdout });
      }
    });

  } catch (err) {
    console.error('Rapor oluşturma hatası:', err);
    res.status(500).json({ error: 'Rapor oluşturulamadı', details: err.message });
  }
});

/**
 * POST /api/raporlar/ayrilma-formu
 * İşyerinden Ayrılma Formu (PDF)
 */
router.post('/ayrilma-formu', async (req, res) => {
  const { ogrenci_id, format = 'pdf', ayrilma_tarihi, ayrilma_nedeni } = req.body;

  const ogrenci = getOgrenci(ogrenci_id, req.user.id);
  if (!ogrenci) {
    return res.status(404).json({ error: 'Öğrenci bulunamadı' });
  }

  try {
    const dosyaAdi = `ayrilma_${ogrenci.ogrenci_no}_${Date.now()}`;
    const ekBilgiler = { ayrilma_tarihi, ayrilma_nedeni };

    if (format === 'pdf') {
      const dosyaYolu = await olusturAyrilmaPDF(ogrenci, dosyaAdi, ekBilgiler);
      const indirmeUrl = `/files/${path.basename(dosyaYolu)}`;
      return res.json({ message: 'PDF oluşturuldu', url: indirmeUrl, format: 'pdf' });
    } else if (format === 'word') {
      const dosyaYolu = await olusturAyrilmaWord(ogrenci, dosyaAdi, ekBilgiler);
      const indirmeUrl = `/files/${path.basename(dosyaYolu)}`;
      return res.json({ message: 'Word belgesi oluşturuldu', url: indirmeUrl, format: 'word' });
    }
  } catch (err) {
    console.error('Rapor oluşturma hatası:', err);
    res.status(500).json({ error: 'Rapor oluşturulamadı', details: err.message });
  }
});

/**
 * POST /api/raporlar/ziyaret-formu
 * Aylık Ziyaret Formu (PDF)
 */
router.post('/ziyaret-formu', async (req, res) => {
  const { ogrenci_id, format = 'pdf', ziyaret_tarihi, ziyaret_notlari } = req.body;

  const ogrenci = getOgrenci(ogrenci_id, req.user.id);
  if (!ogrenci) {
    return res.status(404).json({ error: 'Öğrenci bulunamadı' });
  }

  try {
    const dosyaAdi = `ziyaret_${ogrenci.ogrenci_no}_${Date.now()}`;
    const ekBilgiler = { ziyaret_tarihi, ziyaret_notlari };

    if (format === 'pdf') {
      const dosyaYolu = await olusturZiyaretPDF(ogrenci, dosyaAdi, ekBilgiler);
      const indirmeUrl = `/files/${path.basename(dosyaYolu)}`;
      return res.json({ message: 'PDF oluşturuldu', url: indirmeUrl, format: 'pdf' });
    } else if (format === 'word') {
      const dosyaYolu = await olusturZiyaretWord(ogrenci, dosyaAdi, ekBilgiler);
      const indirmeUrl = `/files/${path.basename(dosyaYolu)}`;
      return res.json({ message: 'Word belgesi oluşturuldu', url: indirmeUrl, format: 'word' });
    }
  } catch (err) {
    console.error('Rapor oluşturma hatası:', err);
    res.status(500).json({ error: 'Rapor oluşturulamadı', details: err.message });
  }
});

// ─── PDF OLUŞTURMA FONKSİYONLARI ──────────────────────────────────────────────

const fontRegular = path.join(__dirname, '../assets/fonts/Roboto-Regular.ttf');
const fontBold = path.join(__dirname, '../assets/fonts/Roboto-Bold.ttf');

function setupDocFonts(doc) {
  doc.registerFont('Regular', fontRegular);
  doc.registerFont('Bold', fontBold);
}

function olusturDegerlendirmePDF(ogrenciler, dosyaAdi) {
  return new Promise((resolve, reject) => {
    const PDFDocument = require('pdfkit');
    const dosyaYolu = path.join(outputDir, `${dosyaAdi}.pdf`);
    const doc = new PDFDocument({ margin: 20, size: 'A4', layout: 'landscape' });
    setupDocFonts(doc);
    
    const stream = fs.createWriteStream(dosyaYolu);
    doc.pipe(stream);

    if (!Array.isArray(ogrenciler)) {
      ogrenciler = [ogrenciler];
    }

    for (let i = 0; i < ogrenciler.length; i += 2) {
      if (i > 0) doc.addPage();
      const s1 = ogrenciler[i];
      const s2 = ogrenciler[i + 1];

      drawStudentEvaluation(doc, s1, 20);

      if (s2) {
        drawStudentEvaluation(doc, s2, 430);
      }
    }

    doc.end();
    stream.on('finish', () => resolve(dosyaYolu));
    stream.on('error', reject);
  });
}

function drawStudentEvaluation(doc, ogrenci, startX) {
  const width = 390;
  let currentY = 20;

  // Outer Border
  doc.rect(startX, currentY, width, 550).stroke();

  // Header
  doc.fontSize(11).font('Bold').text("ÇIRAK ÖĞRENCİNİN İŞLETMELERDE MESLEK EĞİTİMİ", startX, currentY + 10, { width, align: 'center' });
  doc.text("DEĞERLENDİRME FORMU", startX, currentY + 25, { width, align: 'center' });
  
  currentY += 45;
  doc.moveTo(startX, currentY).lineTo(startX + width, currentY).stroke();

  // Info Section
  currentY += 10;
  doc.fontSize(10).font('Bold').text("Çırak Öğrencinin", startX + 10, currentY);
  doc.text("İş Yeri Sahibinin/Usta Öğr.", startX + 200, currentY);

  currentY += 15;
  doc.font('Regular').fontSize(9);
  doc.text(`Adı Soyadı: ${ogrenci.ad_soyad || ""}`, startX + 10, currentY);
  doc.text(`Adı Soyadı: ${ogrenci.usta_ogretici_adi || ""}`, startX + 200, currentY);

  currentY += 15;
  doc.text(`Sınıfı: ${ogrenci.sube || ""}`, startX + 10, currentY);
  doc.text(`İmza:`, startX + 200, currentY);

  currentY += 15;
  doc.text(`Numarası: ${ogrenci.ogrenci_no || ""}`, startX + 10, currentY);

  currentY += 15;
  doc.text(`Meslek Alan/Dalı: ${ogrenci.dal || ""}`, startX + 10, currentY);

  currentY += 15;
  doc.text(`Form Düzenleme Tarihi: ..../..../202...`, startX + 10, currentY);

  currentY += 20;
  doc.moveTo(startX, currentY).lineTo(startX + width, currentY).stroke();

  // Sections
  const sections = [
    { title: "A-İşe Yatkınlığı/Çalışma Verimi (-100 puan)", items: ["1-Takım tezgah ve avadanlıkları kullanma becerisi", "2-Yapacağı işi ve malzemeyi uygun kullanma"] },
    { title: "B-İşe Devamlılığı (-100 puan)", items: ["1-Bilgi beceriyi işine katabilmesi", "2-İşi öğrenme yeteneği"] },
    { title: "C-Çevreye Uyumu (-100 puan)", items: ["1-İşbaşına paydos saatlerine uyumu", "2-İşyeri kurallarına uyumu"] },
    { title: "D-Tutum ve Davranışları (-100 puan)", items: ["1-İş güvenliğine uygun çalışması", "2-İş disiplinine uyumu", "3-Amirlere saygısı", "4-Eğitime katkısı"] }
  ];

  sections.forEach((sec, idx) => {
    currentY += 10;
    doc.font('Bold').fontSize(9).text(sec.title, startX + 10, currentY);
    currentY += 15;
    doc.font('Regular').fontSize(8);
    sec.items.forEach(item => {
      doc.text(item, startX + 20, currentY);
      currentY += 12;
    });

    doc.font('Bold').fontSize(8).text("Rakamla   Yazıyla", startX + width - 100, currentY - 30);
    doc.rect(startX + width - 100, currentY - 18, 40, 20).stroke();
    doc.rect(startX + width - 60, currentY - 18, 40, 20).stroke();
    
    currentY += 10;
    if (idx < 3) {
      doc.strokeColor('#aaaaaa').moveTo(startX, currentY).lineTo(startX + width, currentY).stroke().strokeColor('#000000');
    }
  });

  doc.moveTo(startX, currentY).lineTo(startX + width, currentY).stroke();

  currentY += 15;
  doc.text("........................................................................................", startX, currentY, { width, align: 'center' });
  currentY += 20;
  doc.text("........................................................................................", startX, currentY, { width, align: 'center' });

  // Footer
  currentY += 20;
  doc.moveTo(startX, currentY).lineTo(startX + width, currentY).stroke();
  doc.moveTo(startX + width / 2, currentY).lineTo(startX + width / 2, currentY + 70).stroke(); // inner vertical
  
  currentY += 10;
  doc.font('Bold').fontSize(10);
  doc.text("Usta Öğreticinin", startX + 10, currentY);
  doc.text("Koordinatör Öğretmenin", startX + (width / 2) + 10, currentY);

  currentY += 15;
  doc.font('Regular').fontSize(9);
  doc.text(`Adı Soyadı: ${ogrenci.usta_ogretici_adi || ".................."}`, startX + 10, currentY);
  doc.text(`Adı Soyadı: ${ogrenci.ogretmen_adi || ".................."}`, startX + (width / 2) + 10, currentY);

  currentY += 20;
  doc.text(`İmza: ........................`, startX + 10, currentY);
  doc.text(`İmza: ........................`, startX + (width / 2) + 10, currentY);
}

function olusturOgretmenRaporuPDF(ogrenciler, dosyaAdi) {
  return new Promise((resolve, reject) => {
    const PDFDocument = require('pdfkit');
    const dosyaYolu = path.join(outputDir, `${dosyaAdi}.pdf`);
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    setupDocFonts(doc);
    
    const stream = fs.createWriteStream(dosyaYolu);
    doc.pipe(stream);

    ogrenciler.forEach((ogrenci, index) => {
      if (index > 0) doc.addPage();
      
      pdfHeader(doc, 'KOORDİNATÖR ÖĞRETMEN RAPORU');
      
      doc.moveDown();
      doc.fontSize(12).font('Bold').text('ÖĞRENCİNİN', { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(10).font('Regular');
      
      const bilgiler = [
        ['Adı Soyadı', ogrenci.ad_soyad],
        ['Alan/Dal', ogrenci.dal],
        ['Sınıfı', ogrenci.sube],
        ['Numarası', ogrenci.ogrenci_no],
        ['Usta Öğreticisi', ogrenci.usta_ogretici_adi],
        ['İşyeri Adresi', ogrenci.isyeri_adresi],
      ];

      bilgiler.forEach(([etiket, deger]) => {
        doc.font('Bold').text(`${etiket}: `, { continued: true })
           .font('Regular').text(deger || '-');
      });

      doc.moveDown(2);
      doc.fontSize(12).font('Bold').text('ÖĞRETMENİN GÖRÜŞLERİ :', { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(10).font('Regular');
      doc.text('Yukarıda bilgileri yazılı olan ve işyerinde sözleşmeli çırak olarak çalışan okulumuz öğrencisinin durumu incelenmiş olup, aşağıdaki hususlar tespit edilmiştir:');
      
      doc.moveDown();
      for (let i = 0; i < 6; i++) {
        doc.text('_________________________________________________________________________');
        doc.moveDown(0.5);
      }

      doc.moveDown(2);
      doc.text(`Tarih: ${new Date().toLocaleDateString('tr-TR')}`, { align: 'right' });
      doc.text('İmza: _________________', { align: 'right' });
      doc.text(`Koordinatör Öğretmen: ${ogrenci.ogretmen_adi || ''}`, { align: 'right' });
      
      pdfFooter(doc);
    });

    doc.end();
    stream.on('finish', () => resolve(dosyaYolu));
    stream.on('error', reject);
  });
}

function olusturAyrilmaPDF(ogrenci, dosyaAdi, ekBilgiler) {
  return new Promise((resolve, reject) => {
    const PDFDocument = require('pdfkit');
    const dosyaYolu = path.join(outputDir, `${dosyaAdi}.pdf`);
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    setupDocFonts(doc);
    
    const stream = fs.createWriteStream(dosyaYolu);
    doc.pipe(stream);

    pdfHeader(doc, 'İŞYERİNDEN AYRILMA FORMU');
    pdfOgrenciBilgileri(doc, ogrenci);

    doc.moveDown();
    doc.fontSize(12).font('Bold').text('AYRILMA BİLGİLERİ', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(10).font('Regular');
    doc.text(`Ayrılma Tarihi: ${formatTarih(ekBilgiler.ayrilma_tarihi)}`);
    doc.moveDown(0.5);
    doc.text(`Ayrılma Nedeni: ${ekBilgiler.ayrilma_nedeni || '____________________________________________'}`);
    doc.moveDown();
    doc.text('Ayrılma Şekli: (  ) Kendi İsteği ile   (  ) İşveren Kararıyla   (  ) Diğer');
    doc.moveDown(2);

    pdfImzaBolumu(doc, ogrenci.ogretmen_adi, ogrenci.usta_ogretici_adi);
    pdfFooter(doc);

    doc.end();
    stream.on('finish', () => resolve(dosyaYolu));
    stream.on('error', reject);
  });
}

function olusturZiyaretPDF(ogrenci, dosyaAdi, ekBilgiler) {
  return new Promise((resolve, reject) => {
    const PDFDocument = require('pdfkit');
    const dosyaYolu = path.join(outputDir, `${dosyaAdi}.pdf`);
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    setupDocFonts(doc);
    
    const stream = fs.createWriteStream(dosyaYolu);
    doc.pipe(stream);

    pdfHeader(doc, 'AYLIK ZİYARET FORMU');
    pdfOgrenciBilgileri(doc, ogrenci);

    doc.moveDown();
    doc.fontSize(12).font('Bold').text('ZİYARET BİLGİLERİ', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(10).font('Regular');
    doc.text(`Ziyaret Tarihi: ${formatTarih(ekBilgiler.ziyaret_tarihi)}`);
    doc.moveDown(0.5);
    doc.text('Ziyaret Amacı: Aylık Rutin Denetim');
    doc.moveDown();
    doc.text('Gözlemler ve Notlar:');
    doc.moveDown(0.3);
    doc.text(ekBilgiler.ziyaret_notlari || '');
    doc.moveDown(0.3);
    // Yazı alanı için boş satırlar
    for (let i = 0; i < 5; i++) {
      doc.text('_______________________________________________', { indent: 20 });
      doc.moveDown(0.2);
    }

    doc.moveDown();
    doc.text('Öğrencinin Durumu: (  ) İyi   (  ) Orta   (  ) Geliştirilmeli');
    doc.moveDown(2);

    pdfImzaBolumu(doc, ogrenci.ogretmen_adi, ogrenci.usta_ogretici_adi);
    pdfFooter(doc);

    doc.end();
    stream.on('finish', () => resolve(dosyaYolu));
    stream.on('error', reject);
  });
}

// ─── WORD OLUŞTURMA FONKSİYONLARI ─────────────────────────────────────────────



function olusturAyrilmaWord(ogrenci, dosyaAdi, ekBilgiler) {
  return olusturAyrilmaPDF(ogrenci, dosyaAdi + '_word', ekBilgiler);
}

function olusturZiyaretWord(ogrenci, dosyaAdi, ekBilgiler) {
  return olusturZiyaretPDF(ogrenci, dosyaAdi + '_word', ekBilgiler);
}

// ─── YARDIMCI PDF FONKSİYONLARI ───────────────────────────────────────────────

function pdfHeader(doc, baslik) {
  doc.fontSize(18).font('Bold')
    .fillColor('#0a192f')
    .text('MESLEKİ EĞİTİM TAKİP SİSTEMİ', { align: 'center' });
  doc.moveDown(0.3);
  doc.fontSize(14).font('Bold')
    .fillColor('#ff4d00')
    .text(baslik, { align: 'center' });
  doc.moveDown(0.5);
  doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#0a192f').lineWidth(2).stroke();
  doc.moveDown(0.8);
  doc.fillColor('#000000');
}

function pdfOgrenciBilgileri(doc, ogrenci) {
  doc.fontSize(12).font('Bold').text('ÖĞRENCİ BİLGİLERİ', { underline: true });
  doc.moveDown(0.5);
  doc.fontSize(10).font('Regular');

  const bilgiler = [
    ['Öğrenci No', ogrenci.ogrenci_no],
    ['Ad Soyad', ogrenci.ad_soyad],
    ['Şube', ogrenci.sube],
    ['Dal', ogrenci.dal],
    ['Öğretmen', ogrenci.ogretmen_adi],
    ['İşletme Adı', ogrenci.isletme_adi || '-'],
    ['İşyeri Adresi', ogrenci.isyeri_adresi || '-'],
    ['İşe Giriş Tarihi', formatTarih(ogrenci.ise_giris_tarihi)],
    ['Usta Öğretici', ogrenci.usta_ogretici_adi || '-'],
    ['Okul Devamsızlığı', `${ogrenci.okul_devamsizligi} gün`],
    ['İşletme Devamsızlığı', `${ogrenci.isletme_devamsizligi} gün`],
  ];

  bilgiler.forEach(([etiket, deger]) => {
    doc.font('Bold').text(`${etiket}: `, { continued: true })
      .font('Regular').text(deger);
  });
}

function pdfImzaBolumu(doc, ogretmenAdi, ustaAdi) {
  const y = doc.y;
  doc.fontSize(10).font('Regular');
  doc.text('_________________________', 80, y);
  doc.text('_________________________', 350, y);
  doc.text(`Öğretmen: ${ogretmenAdi || ''}`, 80, y + 20, { width: 200 });
  doc.text(`Usta Öğretici: ${ustaAdi || ''}`, 350, y + 20, { width: 200 });
  doc.text('Tarih: ___/___/______', 80, y + 40);
  doc.text('Tarih: ___/___/______', 350, y + 40);
  doc.moveDown(3);
}

function pdfFooter(doc) {
  const bottomY = doc.page.height - 50;
  doc.fontSize(8).fillColor('#888888')
    .text(
      `Bu belge ${new Date().toLocaleDateString('tr-TR')} tarihinde otomatik oluşturulmuştur.`,
      50, bottomY, { align: 'center', width: 495 }
    );
}

module.exports = router;
