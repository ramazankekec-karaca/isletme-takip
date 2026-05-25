// src/screens/OgrenciDetayScreen.js
// Öğrenci detay ekranı: bilgiler, tel/harita butonları, devamsızlık modülü, evrak

import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Linking, Alert, ActivityIndicator, Platform, StatusBar,
  Modal, RefreshControl,
} from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { ogrenciAPI, devamsizlikAPI, raporAPI } from '../api/client';
import { API_BASE_URL } from '../api/client';
import { RENKLER, YAZI, BOSLUK, RADIUS, GOLGE } from '../theme';

export default function OgrenciDetayScreen({ route, navigation }) {
  const { ogrenci: ilkOgrenci } = route.params;
  const [ogrenci, setOgrenci] = useState(ilkOgrenci);
  const [yukleniyor, setYukleniyor] = useState(false);
  const [yenileniyor, setYenileniyor] = useState(false);
  const [evrakMenuAcik, setEvrakMenuAcik] = useState(false);
  const [raporYukleniyor, setRaporYukleniyor] = useState(false);

  useEffect(() => {
    navigation.setOptions({ title: ogrenci?.ad_soyad || 'Öğrenci Detayı' });
    guncelVeriGetir();
  }, []);

  const guncelVeriGetir = async () => {
    try {
      const res = await ogrenciAPI.detay(ogrenci.id);
      setOgrenci(res.data);
    } catch (err) {
      console.error('Detay yüklenemedi:', err.message);
    }
  };

  const onYenile = async () => {
    setYenileniyor(true);
    await guncelVeriGetir();
    setYenileniyor(false);
  };

  // ─── TELEFON AÇMA ─────────────────────────────────────────────────────────

  const telefoncaAr = async () => {
    if (!ogrenci.isyeri_telefonu) {
      Alert.alert('Hata', 'İşyeri telefonu kayıtlı değil');
      return;
    }
    let temizNo = ogrenci.isyeri_telefonu.replace(/\s/g, '');
    if (!temizNo.startsWith('0') && !temizNo.startsWith('+')) {
      temizNo = '0' + temizNo;
    }
    const url = `tel:${temizNo}`;
    const destekleniyor = await Linking.canOpenURL(url);
    if (destekleniyor) {
      Linking.openURL(url);
    } else {
      Alert.alert('Hata', 'Telefon uygulaması açılamadı');
    }
  };

  // ─── HARİTA AÇMA ──────────────────────────────────────────────────────────

  const haritadaGoster = async () => {
    if (!ogrenci.isyeri_adresi) {
      Alert.alert('Hata', 'İşyeri adresi kayıtlı değil');
      return;
    }
    const adres = encodeURIComponent(ogrenci.isyeri_adresi);
    const googleUrl = `https://www.google.com/maps/search/?api=1&query=${adres}`;
    Linking.openURL(googleUrl);
  };

  // Devamsızlık manuel ekleme/çıkarma fonksiyonları kaldırıldı çünkü Excel'den alınacak.

  // ─── RAPOR İNDİRME ────────────────────────────────────────────────────────

  const raporIndir = async (tip, format) => {
    setEvrakMenuAcik(false);
    setRaporYukleniyor(true);
    try {
      let yanit;
      if (tip === 'degerlendirme') {
        yanit = await raporAPI.ogrenciDegerlendirme(ogrenci.id, format);
      } else if (tip === 'ayrilma') {
        yanit = await raporAPI.ayrilmaFormu(ogrenci.id, format, {
          ayrilma_tarihi: new Date().toISOString().split('T')[0],
        });
      } else if (tip === 'ziyaret') {
        yanit = await raporAPI.ziyaretFormu(ogrenci.id, format, {
          ziyaret_tarihi: new Date().toISOString().split('T')[0],
        });
      }

      // Dosyayı indir
      const dosyaUrl = `${API_BASE_URL}${yanit.url}`;
      const uzanti = format === 'pdf' ? 'pdf' : 'pdf'; // Şimdilik hepsi PDF
      const dosyaAdi = `${FileSystem.documentDirectory}rapor_${Date.now()}.${uzanti}`;

      const indirme = await FileSystem.downloadAsync(dosyaUrl, dosyaAdi);

      if (indirme.status === 200) {
        const paylasimMevcut = await Sharing.isAvailableAsync();
        if (paylasimMevcut) {
          await Sharing.shareAsync(indirme.uri, {
            mimeType: format === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            dialogTitle: `${tip} raporu paylaş`,
          });
        } else {
          Alert.alert('Başarılı', `Rapor kaydedildi: ${indirme.uri}`);
        }
      }
    } catch (err) {
      Alert.alert('Hata', `Rapor oluşturulamadı: ${err.message}`);
    } finally {
      setRaporYukleniyor(false);
    }
  };

  // ─── YARDIMCI FONKSİYONLAR ────────────────────────────────────────────────

  const tarihFormatla = (tarihStr) => {
    if (!tarihStr) return 'Belirtilmemiş';
    if (tarihStr.includes('.')) return tarihStr;
    if (tarihStr.includes('-')) {
      const parts = tarihStr.split('-');
      if (parts.length === 3) {
        return `${parts[2]}.${parts[1]}.${parts[0]}`;
      }
    }
    return tarihStr;
  };

  const devamsizlikRengi = (sayi) => {
    if (sayi === 0) return RENKLER.basari;
    if (sayi <= 3) return RENKLER.uyari;
    return RENKLER.hata;
  };

  // ─── RENDER ───────────────────────────────────────────────────────────────

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={RENKLER.lacivert} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={yenileniyor} onRefresh={onYenile} tintColor={RENKLER.turuncu} />
        }
      >
        {/* ─── Üst Bilgi Kartı ─── */}
        <View style={styles.ustkart}>
          <View style={styles.avatarKutu}>
            <Text style={styles.avatarMetin}>
              {ogrenci?.ad_soyad ? ogrenci.ad_soyad.split(' ').map(k => k[0]).join('').toUpperCase().slice(0, 2) : '?'}
            </Text>
          </View>
          <Text style={styles.ogrenciAd}>{ogrenci?.ad_soyad || 'Bilinmiyor'}</Text>
          <Text style={styles.ogrenciNo}>#{ogrenci?.ogrenci_no || '-'}</Text>
          <View style={styles.etiketSatir}>
            <View style={styles.etiket}>
              <Text style={styles.etiketMetin}>📚 {ogrenci?.sube || '-'}</Text>

            </View>
            <View style={[styles.etiket, styles.etiketTuruncu]}>
              <Text style={[styles.etiketMetin, { color: RENKLER.turuncu }]}>⚙️ {ogrenci.dal}</Text>
            </View>
          </View>
        </View>

        {/* ─── Hızlı Eylemler ─── */}
        <View style={styles.hizliEylemler}>
          <TouchableOpacity
            style={[styles.hizliBtn, styles.hizliBtnTel]}
            onPress={telefoncaAr}
            activeOpacity={0.8}
          >
            <Text style={styles.hizliIkon}>📞</Text>
            <Text style={styles.hizliMetin}>Ara</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.hizliBtn, styles.hizliBtnHarita]}
            onPress={haritadaGoster}
            activeOpacity={0.8}
          >
            <Text style={styles.hizliIkon}>📍</Text>
            <Text style={styles.hizliMetin}>Harita</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.hizliBtn, styles.hizliBtnEvrak]}
            onPress={() => navigation.navigate('Tabs', { screen: 'Raporlar' })}
            activeOpacity={0.8}
          >
            <Text style={styles.hizliIkon}>📄</Text>
            <Text style={styles.hizliMetin}>Evrak</Text>
          </TouchableOpacity>
        </View>

        {/* ─── Devamsızlık Modülü ─── */}
        <View style={styles.bolum}>
          <Text style={styles.bolumBaslik}>📊 Devamsızlık Durumu</Text>

          {yukleniyor ? (
            <ActivityIndicator color={RENKLER.turuncu} style={{ marginVertical: BOSLUK.md }} />
          ) : (
            <View style={styles.devamsizlikGrid}>
              {/* Okul Devamsızlığı */}
              <View style={styles.devamsizlikKart}>
                <Text style={styles.devamsizlikTurBaslik}>🏫 Okul</Text>
                <Text style={[styles.devamsizlikSayi, { color: RENKLER.metinBeyaz }]}>
                  {ogrenci.okul_devamsizligi} gün
                </Text>
              </View>

              {/* İşletme Devamsızlığı */}
              <View style={styles.devamsizlikKart}>
                <Text style={styles.devamsizlikTurBaslik}>🏭 İşletme</Text>
                <Text style={[styles.devamsizlikSayi, { color: RENKLER.metinBeyaz }]}>
                  {ogrenci.isletme_devamsizligi} gün
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* ─── İşletme Bilgileri ─── */}
        <View style={styles.bolum}>
          <Text style={styles.bolumBaslik}>🏢 İşletme Bilgileri</Text>
          <View style={styles.bilgiKart}>
            <BilgiSatiri etiket="İşletme Adı" deger={ogrenci.isletme_adi} />
            <BilgiSatiri
              etiket="Telefon"
              deger={ogrenci.isyeri_telefonu}
              onPress={ogrenci.isyeri_telefonu ? telefoncaAr : null}
              vurgu
            />
            <BilgiSatiri
              etiket="Adres"
              deger={ogrenci.isyeri_adresi}
              onPress={ogrenci.isyeri_adresi ? haritadaGoster : null}
              vurgu
            />
            <BilgiSatiri etiket="İşe Giriş" deger={tarihFormatla(ogrenci.ise_giris_tarihi)} />
            <BilgiSatiri etiket="Usta Öğretici" deger={ogrenci.usta_ogretici_adi} son />
          </View>
        </View>

        {/* ─── Notlar ─── */}
        {ogrenci.notlar && (
          <View style={[styles.bolum, { marginBottom: BOSLUK.xxxl }]}>
            <Text style={styles.bolumBaslik}>📝 Notlar</Text>
            <View style={styles.bilgiKart}>
              <Text style={styles.notMetin}>{ogrenci.notlar}</Text>
            </View>
          </View>
        )}

        <View style={{ height: 60 }} />
      </ScrollView>

    </View>
  );
}

// ─── YARDIMCI BILEŞENLER ──────────────────────────────────────────────────────

function BilgiSatiri({ etiket, deger, onPress, vurgu, son }) {
  return (
    <TouchableOpacity
      style={[styles.bilgiSatir, son && styles.bilgiSatirSon]}
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <Text style={styles.bilgiEtiket}>{etiket}</Text>
      <Text style={[styles.bilgiDeger, vurgu && onPress && styles.bilgiDegerVurgu]} numberOfLines={2}>
        {deger || 'Belirtilmemiş'}
      </Text>
      {vurgu && onPress && <Text style={styles.bilgiOk}>›</Text>}
    </TouchableOpacity>
  );
}

function EvrakButon({ baslik, aciklama, onPDF, onWord }) {
  return (
    <View style={styles.evrakItem}>
      <View style={styles.evrakBilgi}>
        <Text style={styles.evrakBaslik}>{baslik}</Text>
        <Text style={styles.evrakAciklama}>{aciklama}</Text>
      </View>
      <View style={styles.evrakButonlar}>
        <TouchableOpacity style={styles.evrakBtnPDF} onPress={onPDF} activeOpacity={0.8}>
          <Text style={styles.evrakBtnMetin}>PDF</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.evrakBtnWord} onPress={onWord} activeOpacity={0.8}>
          <Text style={styles.evrakBtnMetin}>Word</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── STİLLER ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: RENKLER.lacivert,
  },

  // Üst kart
  ustkart: {
    alignItems: 'center',
    backgroundColor: RENKLER.lacivertAcik,
    paddingVertical: BOSLUK.xxl,
    paddingHorizontal: BOSLUK.xl,
    borderBottomWidth: 1,
    borderBottomColor: RENKLER.kartKenari,
  },
  avatarKutu: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: RENKLER.turuncu,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: BOSLUK.md,
    ...GOLGE.turuncu,
  },
  avatarMetin: {
    fontSize: YAZI.xxl,
    fontWeight: YAZI.extraKalin,
    color: RENKLER.beyaz,
  },
  ogrenciAd: {
    fontSize: YAZI.xxl,
    fontWeight: YAZI.extraKalin,
    color: RENKLER.metinBeyaz,
    textAlign: 'center',
  },
  ogrenciNo: {
    fontSize: YAZI.sm,
    color: RENKLER.metinGri,
    marginTop: BOSLUK.xs,
    marginBottom: BOSLUK.md,
  },
  etiketSatir: {
    flexDirection: 'row',
    gap: BOSLUK.sm,
  },
  etiket: {
    backgroundColor: RENKLER.lacivertOrta,
    borderRadius: RADIUS.tam,
    paddingHorizontal: BOSLUK.md,
    paddingVertical: BOSLUK.xs,
    borderWidth: 1,
    borderColor: RENKLER.kartKenari,
  },
  etiketTuruncu: {
    borderColor: `${RENKLER.turuncu}50`,
    backgroundColor: `${RENKLER.turuncu}10`,
  },
  etiketMetin: {
    fontSize: YAZI.sm,
    color: RENKLER.metinAcik,
    fontWeight: YAZI.orta,
  },

  // Hızlı eylemler
  hizliEylemler: {
    flexDirection: 'row',
    paddingHorizontal: BOSLUK.lg,
    paddingVertical: BOSLUK.md,
    gap: BOSLUK.md,
  },
  hizliBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: BOSLUK.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    gap: BOSLUK.xs,
  },
  hizliBtnTel: {
    backgroundColor: `${RENKLER.basari}15`,
    borderColor: `${RENKLER.basari}50`,
  },
  hizliBtnHarita: {
    backgroundColor: `${RENKLER.bilgi}15`,
    borderColor: `${RENKLER.bilgi}50`,
  },
  hizliBtnEvrak: {
    backgroundColor: `${RENKLER.turuncu}15`,
    borderColor: `${RENKLER.turuncu}50`,
  },
  hizliIkon: { fontSize: 24 },
  hizliMetin: {
    fontSize: YAZI.sm,
    color: RENKLER.metinAcik,
    fontWeight: YAZI.orta,
  },

  // Bölüm
  bolum: {
    marginHorizontal: BOSLUK.lg,
    marginTop: BOSLUK.lg,
  },
  bolumBaslik: {
    fontSize: YAZI.md,
    fontWeight: YAZI.kalin,
    color: RENKLER.metinBeyaz,
    marginBottom: BOSLUK.sm,
  },

  // Devamsızlık
  devamsizlikGrid: {
    flexDirection: 'row',
    gap: BOSLUK.md,
  },
  devamsizlikKart: {
    flex: 1,
    backgroundColor: RENKLER.kart,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: RENKLER.kartKenari,
    padding: BOSLUK.lg,
    alignItems: 'center',
    ...GOLGE.kucuk,
  },
  devamsizlikTurBaslik: {
    fontSize: YAZI.sm,
    color: RENKLER.metinGri,
    marginBottom: BOSLUK.xs,
  },
  devamsizlikSayi: {
    fontSize: 14,
    fontWeight: 'normal',
    lineHeight: 20,
  },
  devamsizlikBirim: {
    fontSize: YAZI.sm,
    color: RENKLER.metinGri,
    marginBottom: BOSLUK.md,
  },
  devamsizlikButonlar: {
    flexDirection: 'row',
    gap: BOSLUK.sm,
  },
  devBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: RENKLER.lacivert,
    borderWidth: 1,
    borderColor: RENKLER.kartKenari,
    alignItems: 'center',
    justifyContent: 'center',
  },
  devBtnEkle: {
    backgroundColor: RENKLER.turuncu,
    borderColor: RENKLER.turuncu,
  },
  devBtnMetin: {
    fontSize: YAZI.xl,
    fontWeight: YAZI.cokKalin,
    color: RENKLER.metinGri,
    lineHeight: 26,
  },

  // Bilgi kartı
  bilgiKart: {
    backgroundColor: RENKLER.kart,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: RENKLER.kartKenari,
    overflow: 'hidden',
    ...GOLGE.kucuk,
  },
  bilgiSatir: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: BOSLUK.lg,
    paddingVertical: BOSLUK.md,
    borderBottomWidth: 1,
    borderBottomColor: RENKLER.kartKenari,
  },
  bilgiSatirSon: { borderBottomWidth: 0 },
  bilgiEtiket: {
    width: 110,
    fontSize: YAZI.sm,
    color: RENKLER.metinGri,
    fontWeight: YAZI.orta,
  },
  bilgiDeger: {
    flex: 1,
    fontSize: YAZI.sm,
    color: RENKLER.metinAcik,
  },
  bilgiDegerVurgu: {
    color: RENKLER.turuncu,
    textDecorationLine: 'underline',
  },
  bilgiOk: {
    fontSize: 20,
    color: RENKLER.metinGri,
    marginLeft: BOSLUK.xs,
  },

  // Not
  notMetin: {
    fontSize: YAZI.md,
    color: RENKLER.metinAcik,
    lineHeight: 22,
    padding: BOSLUK.lg,
  },

  // Modal / Bottom Sheet
  modalArkaplan: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  bottomSheet: {
    backgroundColor: RENKLER.lacivertAcik,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    paddingHorizontal: BOSLUK.xl,
    paddingBottom: Platform.OS === 'ios' ? 40 : BOSLUK.xl,
    paddingTop: BOSLUK.md,
    borderTopWidth: 1,
    borderTopColor: RENKLER.kartKenari,
  },
  bottomSheetKulp: {
    width: 40,
    height: 4,
    backgroundColor: RENKLER.metinGri,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: BOSLUK.lg,
  },
  bottomSheetBaslik: {
    fontSize: YAZI.xl,
    fontWeight: YAZI.kalin,
    color: RENKLER.metinBeyaz,
    marginBottom: BOSLUK.xs,
  },
  bottomSheetAlt: {
    fontSize: YAZI.sm,
    color: RENKLER.metinGri,
    marginBottom: BOSLUK.lg,
  },

  // Evrak öğeleri
  evrakItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: BOSLUK.md,
    borderBottomWidth: 1,
    borderBottomColor: RENKLER.kartKenari,
  },
  evrakBilgi: { flex: 1, marginRight: BOSLUK.md },
  evrakBaslik: {
    fontSize: YAZI.md,
    fontWeight: YAZI.orta,
    color: RENKLER.metinBeyaz,
    marginBottom: 2,
  },
  evrakAciklama: {
    fontSize: YAZI.xs,
    color: RENKLER.metinGri,
  },
  evrakButonlar: {
    flexDirection: 'row',
    gap: BOSLUK.xs,
  },
  evrakBtnPDF: {
    backgroundColor: RENKLER.turuncu,
    borderRadius: RADIUS.sm,
    paddingHorizontal: BOSLUK.md,
    paddingVertical: BOSLUK.xs,
  },
  evrakBtnWord: {
    backgroundColor: RENKLER.lacivertOrta,
    borderRadius: RADIUS.sm,
    paddingHorizontal: BOSLUK.md,
    paddingVertical: BOSLUK.xs,
    borderWidth: 1,
    borderColor: RENKLER.kartKenari,
  },
  evrakBtnMetin: {
    fontSize: YAZI.xs,
    fontWeight: YAZI.kalin,
    color: RENKLER.beyaz,
  },

  // Rapor yükleniyor
  raporYukleniyor: {
    alignItems: 'center',
    paddingVertical: BOSLUK.xxl,
  },
  raporYukleniyorMetin: {
    color: RENKLER.metinGri,
    marginTop: BOSLUK.md,
    fontSize: YAZI.md,
  },

  // İptal butonu
  iptalBtn: {
    marginTop: BOSLUK.md,
    paddingVertical: BOSLUK.md,
    alignItems: 'center',
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: RENKLER.kartKenari,
  },
  iptalBtnMetin: {
    color: RENKLER.metinGri,
    fontSize: YAZI.md,
  },
});
