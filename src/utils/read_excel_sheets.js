const xlsx = require('xlsx');

function formatDate(val) {
  if (!val) return '';
  if (val instanceof Date) {
    const d = String(val.getDate()).padStart(2, '0');
    const m = String(val.getMonth() + 1).padStart(2, '0');
    const y = val.getFullYear();
    return `${d}.${m}.${y}`;
  }
  const str = String(val).trim();
  const dateMatch = str.match(/(\d{1,2}[\.\-\/]\d{1,2}[\.\-\/]\d{2,4})/);
  if (dateMatch) {
    return dateMatch[1].replace(/[-/]/g, '.');
  }
  return str;
}

function readExcelSheets(filePath) {
  const wb = xlsx.readFile(filePath, { cellDates: true });

  let targetSheet = null;
  for (const name of wb.SheetNames) {
    const upper = name.toUpperCase();
    if (upper.includes('VER') && upper.includes('TABANI')) {
      targetSheet = wb.Sheets[name];
      break;
    }
  }

  // Eğer VERİ TABANI yoksa ilk sayfayı kullan
  if (!targetSheet) {
    targetSheet = wb.Sheets[wb.SheetNames[0]];
  }

  const rows = xlsx.utils.sheet_to_json(targetSheet, { header: 1, defval: '' });

  const ogretmenler = new Set();
  const ogrenciler = [];
  let colMap = {};
  let dataStarted = false;

  for (let r = 0; r < rows.length; r++) {
    const row = rows[r];
    if (!row || row.length === 0) continue;

    const strRow = row.map(c => (c !== null && c !== undefined) ? String(c).trim().toUpperCase() : '');

    if (!dataStarted) {
      const hasAdSoyad = strRow.some(c => c.includes('AD') && c.includes('SOYAD'));
      const hasNo = strRow.some(c => c.includes('NO'));

      if (hasAdSoyad && hasNo) {
        dataStarted = true;
        for (let i = 0; i < strRow.length; i++) {
          const c = strRow[i];
          if (c.includes('FORMÜL') || c.includes('FORMUL') || c.includes('SAYISI')) continue;

          if (c.includes('ÖĞR.NO') || c.includes('OGR.NO') || (c.includes('NO') && c.includes('ÖĞR'))) {
            colMap['ogrenci_no'] = i;
          } else if (c === 'NO' || c === 'NUMARA') {
            if (colMap['ogrenci_no'] === undefined) colMap['ogrenci_no'] = i;
          }

          if (c.includes('AD') && c.includes('SOYAD')) {
            colMap['ad_soyad'] = i;
          } else if (c === 'ŞUBE' || c === 'SINIF' || c === 'SUBE') {
            colMap['sube'] = i;
          } else if (c === 'DAL' || c === 'ALAN') {
            colMap['dal'] = i;
          } else if (c === 'ÖĞRETMEN' || c === 'OGRETMEN') {
            colMap['ogretmen'] = i;
          } else if (c === 'İŞLETME' || c === 'ISLETME' || c === 'İŞLETME ADI' || c === 'ISLETME ADI') {
            colMap['isletme_adi'] = i;
          } else if (c.includes('TEL')) {
            colMap['isyeri_telefonu'] = i;
          } else if (c.includes('ADRES')) {
            colMap['isyeri_adresi'] = i;
          } else if (c.includes('GİRİŞ') || c.includes('GIRIS') || c.includes('GİRİ') || c.includes('GIRI')) {
            colMap['ise_giris_tarihi'] = i;
          } else if (c.includes('USTA')) {
            colMap['usta_ogretici_adi'] = i;
          } else if (c === 'DEVAMSIZLIK' || (c.includes('DEVAM') && !c.includes('İŞLETME') && !c.includes('OKUL'))) {
            colMap['devamsizlik'] = i;
          }
        }
        continue;
      }
    }

    if (dataStarted) {
      const idxNo = colMap['ogrenci_no'];
      const idxAd = colMap['ad_soyad'];
      if (idxNo === undefined || idxAd === undefined) continue;

      const valNo = String(row[idxNo] || '').trim();
      const valAd = String(row[idxAd] || '').trim();

      // Sayı ile başlayan öğrenci numarası ve ad soyad doğrulaması
      if (!valNo || !/^\d+$/.test(valNo) || !valAd) continue;

      const getVal = (key) => {
        const i = colMap[key];
        if (i !== undefined && row[i] !== undefined && row[i] !== null) {
          if (row[i] instanceof Date) return formatDate(row[i]);
          return String(row[i]).trim();
        }
        return '';
      };

      const rawDevam = getVal('devamsizlik');
      let oDevam = 0;
      let iDevam = 0;
      if (rawDevam) {
        const strDevam = rawDevam.toUpperCase();
        const oMatch = strDevam.match(/OKUL\s*:\s*([\d\.]+)/);
        const iMatch = strDevam.match(/(?:İŞLETME|ISLETME)\s*:\s*([\d\.]+)/);
        if (oMatch) oDevam = parseInt(parseFloat(oMatch[1]), 10) || 0;
        if (iMatch) iDevam = parseInt(parseFloat(iMatch[1]), 10) || 0;
      }

      const ogrData = {
        ogrenci_no: valNo,
        ad_soyad: valAd,
        sube: getVal('sube'),
        dal: getVal('dal'),
        isletme_adi: getVal('isletme_adi'),
        ogretmen: getVal('ogretmen'),
        isyeri_telefonu: getVal('isyeri_telefonu'),
        isyeri_adresi: getVal('isyeri_adresi'),
        ise_giris_tarihi: formatDate(getVal('ise_giris_tarihi')),
        usta_ogretici_adi: getVal('usta_ogretici_adi'),
        okul_devamsizligi: oDevam,
        isletme_devamsizligi: iDevam
      };

      ogrenciler.push(ogrData);
      if (ogrData.ogretmen && ogrData.ogretmen.trim() !== '') {
        ogretmenler.add(ogrData.ogretmen.trim());
      }
    }
  }

  return {
    ogretmenler: Array.from(ogretmenler),
    ogrenciler
  };
}

module.exports = { readExcelSheets };
