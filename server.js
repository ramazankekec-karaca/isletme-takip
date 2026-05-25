/**
 * server.js — Ana Express sunucusu
 * Başlatmak için: node server.js
 */

const express = require('express');
const cors = require('cors');
const path = require('path');

// Rotalar
const authRoutes = require('./src/routes/auth');
const ogrenciRoutes = require('./src/routes/ogrenciler');
const devamsizlikRoutes = require('./src/routes/devamsizlik');
const raporRoutes = require('./src/routes/raporlar');
const planlarRoutes = require('./src/routes/planlar');
const adminRoutes = require('./src/routes/admin');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Statik dosyalar (PDF/Word indirme için)
const outputDir = path.join(__dirname, 'data', 'output');
const fs = require('fs');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}
app.use('/files', express.static(outputDir));

// API Rotaları
app.use('/api/auth', authRoutes);
app.use('/api/ogrenciler', ogrenciRoutes);
app.use('/api/devamsizlik', devamsizlikRoutes);
app.use('/api/raporlar', raporRoutes);
app.use('/api/planlar', planlarRoutes);
app.use('/api/admin', adminRoutes);

// Sağlık kontrolü
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'İşletme Takip Sunucusu çalışıyor',
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint bulunamadı' });
});

// Hata handler
app.use((err, req, res, next) => {
  console.error('❌ Sunucu hatası:', err.message);
  res.status(500).json({ error: 'Sunucu hatası', details: err.message });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🚀 İşletme Takip Sunucusu başlatıldı`);
  console.log(`   Adres: http://localhost:${PORT}`);
  console.log(`   Sağlık: http://localhost:${PORT}/api/health\n`);
});

module.exports = app;
