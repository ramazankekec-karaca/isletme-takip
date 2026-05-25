const fs = require('fs');
const path = require('path');
const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, BorderStyle, WidthType, AlignmentType, convertInchesToTwip, TabStopType, TabStopPosition, PageOrientation, VerticalAlign } = require('docx');

// 1.5 cm to twips (1 cm = 567 twips)
const MARGIN_TWIPS = 851;
const MARGIN_8MM_TWIPS = 454;
const MARGIN_7MM_TWIPS = 397;

/**
 * Öğrenci listesi için Öğretmen Raporu (Word) üretir.
 */
async function olusturOgretmenRaporuWord(ogrenciler, dosyaYolu) {
  const children = [];

  ogrenciler.forEach((ogrenci, index) => {
    // Sayfa Başı (İlk sayfa hariç)
    if (index > 0) {
      children.push(new Paragraph({ text: "", pageBreakBefore: true }));
    }

    // Başlık
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({ text: "İŞLETMELERDE MESLEK EĞİTİMİ", bold: true, size: 24, font: "Times New Roman" }),
        ],
      })
    );
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({ text: "KOORDİNATÖR ÖĞRETMEN RAPORU", bold: true, size: 24, font: "Times New Roman", underline: {} }),
        ],
        spacing: { after: 200 },
      })
    );

    // Öğrenci Bilgileri Tablosu
    const table = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: {
        top: { style: BorderStyle.NONE },
        bottom: { style: BorderStyle.NONE },
        left: { style: BorderStyle.NONE },
        right: { style: BorderStyle.NONE },
        insideHorizontal: { style: BorderStyle.NONE },
        insideVertical: { style: BorderStyle.NONE },
      },
      rows: [
        createRow("ÖĞRENCİNİN", ":", "", true),
        createRow("Adı Soyadı", ":", ogrenci.ad_soyad || ""),
        createRow("Alan/Dal", ":", ogrenci.dal || ""),
        createRow("Sınıfı", ":", ogrenci.sube || ""),
        createRow("Numarası", ":", ogrenci.ogrenci_no || ""),
        createRow("Usta öğreticisi", ":", ogrenci.usta_ogretici_adi || ""),
        createRow("İşyeri Adresi", ":", ogrenci.isyeri_adresi || ""),
        createRow("", "", ""), // extra address line
        createRow("İşyeri Telefonu", ":", ogrenci.isyeri_telefonu || ""),
        createRow("Teorik Eğt Geldiği Gün", ":", ogrenci.okul_gunleri || ""),
      ],
    });
    
    children.push(table);
    children.push(new Paragraph({ text: "", spacing: { after: 100 } }));

    // Öğretmenin Görüşleri
    children.push(
      new Paragraph({
        children: [
          new TextRun({ text: "ÖĞRETMENİN GÖRÜŞLERİ :", bold: true, size: 22, font: "Times New Roman", underline: {} }),
        ],
        spacing: { after: 100 },
      })
    );
    
    // Metin Kutusu içeriği
    const goruslerTable = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: {
        top: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
        bottom: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
        left: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
        right: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
      },
      rows: [
        new TableRow({
          children: [
            new TableCell({
              margins: { top: 150, bottom: 150, left: 150, right: 150 },
              children: [
                new Paragraph({
                  text: "Yukarıda bilgileri yazılı olan ve işyerinde sözleşmeli çırak olarak çalışan okulumuz öğrencisinin aşağıda belirttiğim nedenlerden dolayı sözleşmesinin fesh edilmesi gerekmektedir.",
                  font: "Times New Roman",
                  size: 22,
                  indent: { firstLine: 720 },
                  spacing: { after: 100 }
                }),
                new Paragraph({
                  text: "Bilgilerinize arz ederim.",
                  font: "Times New Roman",
                  size: 22,
                  indent: { firstLine: 720 }
                })
              ],
            }),
          ],
        }),
      ],
    });
    
    children.push(goruslerTable);
    children.push(new Paragraph({ text: "", spacing: { after: 100 } }));

    // Açıklama kısmı
    children.push(
      new Paragraph({
        children: [
          new TextRun({ text: "AÇIKLAMA: ", size: 22, font: "Times New Roman" }),
          new TextRun({ text: ".".repeat(105), size: 22, font: "Times New Roman" }),
        ],
        spacing: { after: 50 }
      })
    );
    
    for(let i=0; i<5; i++) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: ".".repeat(120), size: 22, font: "Times New Roman" }),
          ],
          spacing: { after: 50 }
        })
      );
    }
    
    children.push(new Paragraph({ text: "", spacing: { after: 100 } }));

    // İmza bölümü
    const imzaTable = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: {
        top: { style: BorderStyle.NONE },
        bottom: { style: BorderStyle.NONE },
        left: { style: BorderStyle.NONE },
        right: { style: BorderStyle.NONE },
        insideHorizontal: { style: BorderStyle.NONE },
        insideVertical: { style: BorderStyle.NONE },
      },
      rows: [
        new TableRow({
          children: [
            new TableCell({ width: { size: 50, type: WidthType.PERCENTAGE }, children: [] }), // Boş sol taraf
            new TableCell({
              width: { size: 50, type: WidthType.PERCENTAGE },
              children: [
                new Paragraph({ text: `Tarih :  ...../...../202...`, font: "Times New Roman", size: 22, spacing: { after: 50 } }),
                new Paragraph({ text: `İmza  :`, font: "Times New Roman", size: 22, spacing: { after: 50 } }),
                new Paragraph({ text: `         .....................................`, font: "Times New Roman", size: 22, spacing: { after: 50 } }),
                new Paragraph({ text: `         Koordinatör Öğretmen`, font: "Times New Roman", size: 22 }),
              ]
            })
          ]
        })
      ]
    });
    
    children.push(imzaTable);
  });

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: MARGIN_7MM_TWIPS,
              bottom: MARGIN_7MM_TWIPS,
              left: MARGIN_7MM_TWIPS,
              right: MARGIN_7MM_TWIPS,
            },
          },
        },
        children: children,
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  fs.writeFileSync(dosyaYolu, buffer);
  return dosyaYolu;
}

// Yardımcı fonksiyon
function createRow(col1, col2, col3, isUnderline = false) {
  return new TableRow({
    children: [
      new TableCell({
        width: { size: 25, type: WidthType.PERCENTAGE },
        children: [
          new Paragraph({
            children: [
              new TextRun({ text: col1, bold: isUnderline, underline: isUnderline ? {} : undefined, font: "Times New Roman", size: 22 })
            ],
          }),
        ],
      }),
      new TableCell({
        width: { size: 5, type: WidthType.PERCENTAGE },
        children: [
          new Paragraph({
            children: [
              new TextRun({ text: col2, font: "Times New Roman", size: 22, bold: isUnderline })
            ]
          }),
        ],
      }),
      new TableCell({
        width: { size: 70, type: WidthType.PERCENTAGE },
        children: [
          new Paragraph({
            children: [
              new TextRun({ text: col3 ? ` ${col3}` : "", font: "Times New Roman", size: 22 })
            ]
          }),
        ],
      }),
    ],
  });
}

module.exports = {
  olusturOgretmenRaporuWord,
  olusturDegerlendirmeWord
};

/**
 * Öğrenci Değerlendirme Formu (Word) üretir.
 * İstenilen: Yatay sayfa, 2 öğrenci yan yana, üst/alt 1.5cm, sağ/sol 8mm.
 */
async function olusturDegerlendirmeWord(ogrenciler, dosyaYolu) {
  const children = [];

  for (let i = 0; i < ogrenciler.length; i += 2) {
    const student1 = ogrenciler[i];
    const student2 = ogrenciler[i + 1];

    if (i > 0) {
      children.push(new Paragraph({ text: "", pageBreakBefore: true }));
    }

    const rowChildren = [];

    // Left Student
    rowChildren.push(
      new TableCell({
        width: { size: 48, type: WidthType.PERCENTAGE },
        margins: { top: 100, bottom: 100, left: 100, right: 100 },
        borders: {
          top: { style: BorderStyle.DOUBLE, size: 4, color: "000000" },
          bottom: { style: BorderStyle.DOUBLE, size: 4, color: "000000" },
          left: { style: BorderStyle.DOUBLE, size: 4, color: "000000" },
          right: { style: BorderStyle.DOUBLE, size: 4, color: "000000" },
        },
        children: createEvaluationFormContent(student1)
      })
    );

    // Middle spacer
    rowChildren.push(
      new TableCell({
        width: { size: 4, type: WidthType.PERCENTAGE },
        borders: {
          top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE }
        },
        children: [new Paragraph("")]
      })
    );

    // Right Student (if exists)
    if (student2) {
      rowChildren.push(
        new TableCell({
          width: { size: 48, type: WidthType.PERCENTAGE },
          margins: { top: 100, bottom: 100, left: 100, right: 100 },
          borders: {
            top: { style: BorderStyle.DOUBLE, size: 4, color: "000000" },
            bottom: { style: BorderStyle.DOUBLE, size: 4, color: "000000" },
            left: { style: BorderStyle.DOUBLE, size: 4, color: "000000" },
            right: { style: BorderStyle.DOUBLE, size: 4, color: "000000" },
          },
          children: createEvaluationFormContent(student2)
        })
      );
    } else {
      rowChildren.push(
        new TableCell({
          width: { size: 48, type: WidthType.PERCENTAGE },
          borders: {
            top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE }
          },
          children: [new Paragraph("")]
        })
      );
    }

    const pageTable = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: {
        top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE },
        insideVertical: { style: BorderStyle.NONE }, insideHorizontal: { style: BorderStyle.NONE }
      },
      rows: [new TableRow({ children: rowChildren })]
    });

    children.push(pageTable);
  }

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            size: { orientation: PageOrientation.LANDSCAPE },
            margin: {
              top: MARGIN_7MM_TWIPS,
              bottom: MARGIN_7MM_TWIPS,
              left: MARGIN_7MM_TWIPS,
              right: MARGIN_7MM_TWIPS,
            },
          },
        },
        children: children,
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  fs.writeFileSync(dosyaYolu, buffer);
  return dosyaYolu;
}

function createEvaluationFormContent(ogrenci) {
  const content = [];

  // Header Box
  content.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.SINGLE, size: 2 }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } },
      rows: [
        new TableRow({
          children: [
            new TableCell({
              margins: { top: 60, bottom: 60 },
              children: [
                new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "ÇIRAK ÖĞRENCİNİN İŞLETMELERDE MESLEK EĞİTİMİ", bold: true, size: 22 })] }),
                new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "DEĞERLENDİRME FORMU", bold: true, size: 22 })], spacing: { before: 40 } })
              ]
            })
          ]
        })
      ]
    })
  );

  // Info Box
  content.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.SINGLE, size: 2 }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE }, insideVertical: { style: BorderStyle.NONE }, insideHorizontal: { style: BorderStyle.NONE } },
      rows: [
        new TableRow({
          children: [
            new TableCell({
              width: { size: 55, type: WidthType.PERCENTAGE },
              margins: { top: 60, bottom: 60 },
              children: [
                new Paragraph({ children: [new TextRun({ text: "Çırak Öğrencinin", bold: true, underline: {}, size: 20 })], spacing: { after: 40 } }),
                new Paragraph({ children: [new TextRun({ text: `Adı Soyadı       : ${ogrenci.ad_soyad || ""}`, size: 18 })], spacing: { after: 20 } }),
                new Paragraph({ children: [new TextRun({ text: `Sınıfı               : ${ogrenci.sube || ""}`, size: 18 })], spacing: { after: 20 } }),
                new Paragraph({ children: [new TextRun({ text: `Numarası         : ${ogrenci.ogrenci_no || ""}`, size: 18 })], spacing: { after: 20 } }),
                new Paragraph({ children: [new TextRun({ text: `Meslek Alan/Dalı : ${ogrenci.dal || ""}`, size: 18 })], spacing: { after: 20 } }),
                new Paragraph({ children: [new TextRun({ text: `Form Düzenleme Tarihi: ..../..../202...`, size: 18 })], spacing: { after: 20 } }),
              ]
            }),
            new TableCell({
              width: { size: 45, type: WidthType.PERCENTAGE },
              margins: { top: 60, bottom: 60 },
              children: [
                new Paragraph({ children: [new TextRun({ text: "İş Yeri Sahibinin/Usta Öğreticinin", bold: true, underline: {}, size: 20 })], spacing: { after: 40 } }),
                new Paragraph({ children: [new TextRun({ text: `Adı Soyadı : ${ogrenci.usta_ogretici_adi || ""}`, size: 18 })], spacing: { after: 20 } }),
                new Paragraph({ children: [new TextRun({ text: `İmza       : `, size: 18 })] })
              ]
            })
          ]
        })
      ]
    })
  );

  // Sections
  const sections = [
    {
      title: "A-İşe Yatkınlığı/Çalışma Verimi (-100 puan)",
      items: [
        "1-Takım tezgah ve avadanlıkları kullanma becerisi, kullanma konusu ve mesleki bilgi seviyesi",
        "2-Yapacağı işi, kullanacağı avadanlığı ve malzemeyi uygun kullanma."
      ]
    },
    {
      title: "B-İşe Devamlılığı (-100 puan)",
      items: [
        "1-Bilgi beceriyi işine ne derece katabildiği, değerlendirmesi",
        "2-İşi öğrenme ve yapabilme yeteneği"
      ]
    },
    {
      title: "C-Çevreye Uyumu (-100 puan)",
      items: [
        "1-İşbaşına paydos saatlerine uyumu",
        "2-İşyeri kurallarına ve işbirliği içinde çalışması"
      ]
    },
    {
      title: "D-Tutum ve Davranışları (-100 puan)",
      items: [
        "1-İş güvenliğine uygun çalışması",
        "2-Usta ve atölye şeflerine karşı mazeretsiz davranışı",
        "3-İş disiplinine uyumu",
        "4-İşyeri amirlerine ve yetkililerine saygısı",
        "5-Arkadaşlarına karşı tutumu",
        "6-Okul, atölye, sınıf vb eğitimine katkısı"
      ]
    }
  ];

  sections.forEach((sec, idx) => {
    content.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: {
          top: { style: BorderStyle.NONE },
          bottom: idx === 3 ? { style: BorderStyle.SINGLE, size: 2 } : { style: BorderStyle.DASHED, size: 1 },
          left: { style: BorderStyle.NONE },
          right: { style: BorderStyle.NONE },
          insideVertical: { style: BorderStyle.NONE },
          insideHorizontal: { style: BorderStyle.NONE }
        },
        rows: [
          new TableRow({
            children: [
              new TableCell({
                width: { size: 60, type: WidthType.PERCENTAGE },
                margins: { top: 40, bottom: 40 },
                children: [
                  new Paragraph({ children: [new TextRun({ text: sec.title, bold: true, italic: true, size: 18 })], spacing: { after: 30 } }),
                  ...sec.items.map(item => new Paragraph({ children: [new TextRun({ text: item, size: 16 })], indent: { left: 300 }, spacing: { after: 30 } }))
                ]
              }),
              new TableCell({
                width: { size: 40, type: WidthType.PERCENTAGE },
                verticalAlign: VerticalAlign.CENTER,
                margins: { left: 100 },
                children: [createScoreTable()]
              })
            ]
          })
        ]
      })
    );
  });

  // Dots spacing
  content.push(new Paragraph({ text: "........................................................................................................................................", size: 18, alignment: AlignmentType.CENTER, spacing: { before: 40 } }));
  content.push(new Paragraph({ text: "........................................................................................................................................", size: 18, alignment: AlignmentType.CENTER, spacing: { after: 40 } }));

  // Footer Box
  content.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: { top: { style: BorderStyle.SINGLE, size: 2 }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE }, insideVertical: { style: BorderStyle.SINGLE, size: 2 }, insideHorizontal: { style: BorderStyle.NONE } },
      rows: [
        new TableRow({
          children: [
            new TableCell({
              width: { size: 50, type: WidthType.PERCENTAGE },
              margins: { top: 80, bottom: 80, left: 100 },
              children: [
                new Paragraph({ children: [new TextRun({ text: "Usta Öğreticinin", bold: true, size: 18 })], spacing: { after: 40 } }),
                new Paragraph({ children: [new TextRun({ text: `Adı Soyadı : ${ogrenci.usta_ogretici_adi || ".................."}`, size: 18 })], spacing: { after: 40 } }),
                new Paragraph({ children: [new TextRun({ text: `İmza       : ........................`, size: 18 })] })
              ]
            }),
            new TableCell({
              width: { size: 50, type: WidthType.PERCENTAGE },
              margins: { top: 80, bottom: 80, left: 100 },
              children: [
                new Paragraph({ children: [new TextRun({ text: "Koordinatör Öğretmenin", bold: true, size: 18 })], spacing: { after: 40 } }),
                new Paragraph({ children: [new TextRun({ text: `Adı Soyadı : ${ogrenci.ogretmen_adi || ".................."}`, size: 18 })], spacing: { after: 40 } }),
                new Paragraph({ children: [new TextRun({ text: `İmza       : ........................`, size: 18 })] })
              ]
            })
          ]
        })
      ]
    })
  );

  return content;
}

function createScoreTable() {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: { top: { style: BorderStyle.SINGLE, size: 1 }, bottom: { style: BorderStyle.SINGLE, size: 1 }, left: { style: BorderStyle.SINGLE, size: 1 }, right: { style: BorderStyle.SINGLE, size: 1 }, insideVertical: { style: BorderStyle.SINGLE, size: 1 }, insideHorizontal: { style: BorderStyle.SINGLE, size: 1 } },
    rows: [
      new TableRow({
        children: [
          new TableCell({ margins: { top: 60, bottom: 60 }, children: [new Paragraph({ text: "Rakamla", alignment: AlignmentType.CENTER, size: 18, bold: true })] }),
          new TableCell({ margins: { top: 60, bottom: 60 }, children: [new Paragraph({ text: "Yazıyla", alignment: AlignmentType.CENTER, size: 18, bold: true })] })
        ]
      }),
      new TableRow({
        children: [
          new TableCell({ margins: { top: 100, bottom: 100 }, children: [new Paragraph({ text: ". . . . . .", alignment: AlignmentType.CENTER, size: 18 })] }),
          new TableCell({ margins: { top: 100, bottom: 100 }, children: [new Paragraph({ text: ". . . . . .", alignment: AlignmentType.CENTER, size: 18 })] })
        ]
      })
    ]
  });
}
