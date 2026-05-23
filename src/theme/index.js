// src/theme/index.js
// Uygulamanın tüm renk, tipografi ve boyut değerleri burada tanımlıdır.
// Tasarım değişikliği için tek yer burasıdır.

export const RENKLER = {
  // Ana renkler
  lacivert: '#0a192f',
  lacivertAcik: '#112240',
  lacivertOrta: '#1e3a5f',
  turuncu: '#ff4d00',
  turuncuAcik: '#ff6a2a',
  turuncuKoyu: '#cc3d00',

  // Nötr
  beyaz: '#ffffff',
  gri100: '#f8f9fa',
  gri200: '#e9ecef',
  gri300: '#dee2e6',
  gri400: '#ced4da',
  gri500: '#adb5bd',
  gri600: '#6c757d',
  gri700: '#495057',
  gri800: '#343a40',

  // Semantik
  basari: '#28a745',
  hata: '#dc3545',
  uyari: '#ffc107',
  bilgi: '#17a2b8',

  // Arka plan ve metin
  arkaplan: '#0a192f',
  kart: '#112240',
  kartKenari: '#1e3a5f',
  metinBeyaz: '#e6f1ff',
  metinGri: '#8892b0',
  metinAcik: '#ccd6f6',
};

export const YAZI = {
  // Font ailesi
  ailek: 'System', // Expo'da native font

  // Boyutlar
  xs: 11,
  sm: 13,
  md: 15,
  lg: 17,
  xl: 20,
  xxl: 24,
  xxxl: 30,

  // Ağırlıklar
  normal: '400',
  orta: '500',
  kalin: '600',
  cokKalin: '700',
  extraKalin: '800',
};

export const BOSLUK = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  devasa: 48,
};

export const RADIUS = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 20,
  tam: 999,
};

export const GOLGE = {
  kucuk: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  orta: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  buyuk: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 10,
  },
  turuncu: {
    shadowColor: '#ff4d00',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
};
