// src/screens/OgrenciListesiScreen.js
// Ana ekran: Giriş yapan öğretmenin öğrenci listesi + arama/filtre

import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput,
  TouchableOpacity, ActivityIndicator, RefreshControl,
  StatusBar, Platform,
} from 'react-native';
import { ogrenciAPI } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { RENKLER, YAZI, BOSLUK, RADIUS, GOLGE } from '../theme';

export default function OgrenciListesiScreen({ navigation }) {
  const { kullanici, cikisYap } = useAuth();

  const [ogrenciler, setOgrenciler] = useState([]);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [yenileniyor, setYenileniyor] = useState(false);
  const [aramaMetni, setAramaMetni] = useState('');
  const [subeler, setSubeler] = useState([]);
  const [dallar, setDallar] = useState([]);
  const [seciliSube, setSeciliSube] = useState('');
  const [seciliDal, setSeciliDal] = useState('');
  const [filtrePaneli, setFiltrePaneli] = useState(false);

  const verileriYukle = useCallback(async (filtreler = {}) => {
    try {
      const res = await ogrenciAPI.listele({
        sube: filtreler.sube || seciliSube || undefined,
        dal: filtreler.dal || seciliDal || undefined,
        arama: filtreler.arama !== undefined ? filtreler.arama : aramaMetni || undefined,
      });
      setOgrenciler(res.data);
    } catch (err) {
      console.error('Öğrenciler yüklenemedi:', err.message);
    }
  }, [seciliSube, seciliDal, aramaMetni]);

  useEffect(() => {
    const ilkYukleme = async () => {
      setYukleniyor(true);
      try {
        const [_, filtreRes] = await Promise.all([
          verileriYukle(),
          ogrenciAPI.filtreleriGetir(),
        ]);
        // Filtreler için bağımsız çağrı
        const filtreYanit = await ogrenciAPI.filtreleriGetir();
        setSubeler(filtreYanit.subeler);
        setDallar(filtreYanit.dallar);
      } finally {
        setYukleniyor(false);
      }
    };
    ilkYukleme();
  }, []);

  useEffect(() => {
    // Arama ve filtre değişince 400ms bekle (debounce)
    const timer = setTimeout(() => verileriYukle(), 400);
    return () => clearTimeout(timer);
  }, [aramaMetni, seciliSube, seciliDal]);

  const onYenile = async () => {
    setYenileniyor(true);
    await verileriYukle();
    setYenileniyor(false);
  };

  const filtreTemizle = () => {
    setSeciliSube('');
    setSeciliDal('');
    setAramaMetni('');
  };

  const devamsizlikRengi = (toplam) => {
    if (toplam === 0) return RENKLER.basari;
    if (toplam <= 3) return RENKLER.uyari;
    return RENKLER.hata;
  };

  const renderOgrenci = ({ item, index }) => (
    <TouchableOpacity
      style={[styles.ogrenciKart, { marginTop: index === 0 ? 0 : BOSLUK.sm }]}
      onPress={() => navigation.navigate('OgrenciDetay', { ogrenci: item })}
      activeOpacity={0.85}
    >
      {/* Sol çizgi - dal rengi */}
      <View style={styles.kartSolCizgi} />

      <View style={styles.kartIcerik}>
        <View style={styles.kartUst}>
          <View style={styles.kartBaslik}>
            <Text style={styles.ogrenciAd}>{item.ad_soyad}</Text>
            <Text style={styles.ogrenciNo}>#{item.ogrenci_no}</Text>
          </View>
          <View style={styles.subeDalEtiketler}>
            <View style={styles.etiketKutu}>
              <Text style={styles.etiketMetin}>{item.sube}</Text>
            </View>
            <View style={[styles.etiketKutu, styles.dalEtiket]}>
              <Text style={styles.etiketMetin}>{item.dal}</Text>
            </View>
          </View>
        </View>

        <View style={styles.kartAlt}>
          <View style={styles.isletmeBilgi}>
            <Text style={styles.isletmeIkon}>🏢</Text>
            <Text style={styles.isletmeAd} numberOfLines={1}>
              {item.isletme_adi || 'İşletme belirtilmemiş'}
            </Text>
          </View>

          <View style={styles.devamsizliklar}>
            <View style={styles.devamsizlikBadge}>
              <Text style={styles.devamsizlikIkon}>🏫</Text>
              <Text style={[styles.devamsizlikSayi, { color: devamsizlikRengi(item.okul_devamsizligi) }]}>
                {item.okul_devamsizligi}
              </Text>
            </View>
            <View style={[styles.devamsizlikBadge, { marginLeft: BOSLUK.sm }]}>
              <Text style={styles.devamsizlikIkon}>🏭</Text>
              <Text style={[styles.devamsizlikSayi, { color: devamsizlikRengi(item.isletme_devamsizligi) }]}>
                {item.isletme_devamsizligi}
              </Text>
            </View>
          </View>
        </View>
      </View>

      <Text style={styles.detayOk}>›</Text>
    </TouchableOpacity>
  );

  const renderBosListe = () => (
    <View style={styles.bosListe}>
      <Text style={styles.bosListeEmoji}>🔍</Text>
      <Text style={styles.bosListeMetin}>Öğrenci bulunamadı</Text>
      <Text style={styles.bosListeAlt}>Arama veya filtre kriterlerinizi değiştirin</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={RENKLER.lacivert} />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerHosgeldin}>Hoş geldiniz,</Text>
          <Text style={styles.headerIsim}>{kullanici?.ad_soyad}</Text>
        </View>
        <TouchableOpacity onPress={cikisYap} style={styles.cikisBtn} activeOpacity={0.8}>
          <Text style={styles.cikisBtnMetin}>Çıkış</Text>
        </TouchableOpacity>
      </View>

      {/* Arama çubuğu */}
      <View style={styles.aramaKonteyner}>
        <View style={styles.aramaKutu}>
          <Text style={styles.aramaIkon}>🔍</Text>
          <TextInput
            style={styles.aramaInput}
            placeholder="Ad, numara veya işletme ara..."
            placeholderTextColor={RENKLER.metinGri}
            value={aramaMetni}
            onChangeText={setAramaMetni}
          />
          {aramaMetni ? (
            <TouchableOpacity onPress={() => setAramaMetni('')}>
              <Text style={styles.aramaTemizle}>✕</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        <TouchableOpacity
          style={[styles.filtreBtn, (seciliSube || seciliDal) && styles.filtreBtnAktif]}
          onPress={() => setFiltrePaneli(!filtrePaneli)}
          activeOpacity={0.8}
        >
          <Text style={styles.filtreIkon}>⚙️</Text>
        </TouchableOpacity>
      </View>

      {/* Filtre Paneli */}
      {filtrePaneli && (
        <View style={styles.filtrePaneli}>
          <Text style={styles.filtreBaslik}>Şube Filtresi</Text>
          <View style={styles.filtreSecenekler}>
            <TouchableOpacity
              style={[styles.filtreSecim, !seciliSube && styles.filtreSecimAktif]}
              onPress={() => setSeciliSube('')}
            >
              <Text style={[styles.filtreSecimMetin, !seciliSube && styles.filtreSecimMetinAktif]}>Tümü</Text>
            </TouchableOpacity>
            {subeler.map(sube => (
              <TouchableOpacity
                key={sube}
                style={[styles.filtreSecim, seciliSube === sube && styles.filtreSecimAktif]}
                onPress={() => setSeciliSube(seciliSube === sube ? '' : sube)}
              >
                <Text style={[styles.filtreSecimMetin, seciliSube === sube && styles.filtreSecimMetinAktif]}>
                  {sube}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={[styles.filtreBaslik, { marginTop: BOSLUK.md }]}>Dal Filtresi</Text>
          <View style={styles.filtreSecenekler}>
            <TouchableOpacity
              style={[styles.filtreSecim, !seciliDal && styles.filtreSecimAktif]}
              onPress={() => setSeciliDal('')}
            >
              <Text style={[styles.filtreSecimMetin, !seciliDal && styles.filtreSecimMetinAktif]}>Tümü</Text>
            </TouchableOpacity>
            {dallar.map(dal => (
              <TouchableOpacity
                key={dal}
                style={[styles.filtreSecim, seciliDal === dal && styles.filtreSecimAktif]}
                onPress={() => setSeciliDal(seciliDal === dal ? '' : dal)}
              >
                <Text style={[styles.filtreSecimMetin, seciliDal === dal && styles.filtreSecimMetinAktif]}>
                  {dal}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {(seciliSube || seciliDal) && (
            <TouchableOpacity style={styles.filtreTemizleBtn} onPress={filtreTemizle}>
              <Text style={styles.filtreTemizleBtnMetin}>Filtreleri Temizle</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* İstatistik şeridi */}
      <View style={styles.istatistikSerit}>
        <Text style={styles.istatistikMetin}>
          {yukleniyor ? '...' : `${ogrenciler.length} öğrenci`}
          {(seciliSube || seciliDal || aramaMetni) ? ' (filtrelenmiş)' : ''}
        </Text>
      </View>

      {/* Liste */}
      {yukleniyor ? (
        <ActivityIndicator color={RENKLER.turuncu} size="large" style={{ flex: 1 }} />
      ) : (
        <FlatList
          data={ogrenciler}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderOgrenci}
          contentContainerStyle={styles.listeIcerik}
          ListEmptyComponent={renderBosListe}
          refreshControl={
            <RefreshControl
              refreshing={yenileniyor}
              onRefresh={onYenile}
              tintColor={RENKLER.turuncu}
              colors={[RENKLER.turuncu]}
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: RENKLER.lacivert,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: BOSLUK.xl,
    paddingTop: Platform.OS === 'ios' ? 60 : BOSLUK.xl,
    paddingBottom: BOSLUK.lg,
    backgroundColor: RENKLER.lacivertAcik,
    borderBottomWidth: 1,
    borderBottomColor: RENKLER.kartKenari,
  },
  headerHosgeldin: {
    fontSize: YAZI.sm,
    color: RENKLER.metinGri,
  },
  headerIsim: {
    fontSize: YAZI.lg,
    fontWeight: YAZI.kalin,
    color: RENKLER.metinBeyaz,
  },
  cikisBtn: {
    backgroundColor: `${RENKLER.hata}20`,
    borderWidth: 1,
    borderColor: RENKLER.hata,
    borderRadius: RADIUS.sm,
    paddingHorizontal: BOSLUK.md,
    paddingVertical: BOSLUK.xs,
  },
  cikisBtnMetin: {
    color: RENKLER.hata,
    fontSize: YAZI.sm,
    fontWeight: YAZI.kalin,
  },

  // Arama
  aramaKonteyner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: BOSLUK.lg,
    paddingVertical: BOSLUK.md,
    backgroundColor: RENKLER.lacivertAcik,
    gap: BOSLUK.sm,
  },
  aramaKutu: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: RENKLER.lacivert,
    borderRadius: RADIUS.md,
    paddingHorizontal: BOSLUK.md,
    borderWidth: 1,
    borderColor: RENKLER.kartKenari,
    minHeight: 44,
  },
  aramaIkon: { fontSize: 16, marginRight: BOSLUK.sm },
  aramaInput: {
    flex: 1,
    color: RENKLER.metinBeyaz,
    fontSize: YAZI.md,
    paddingVertical: BOSLUK.sm,
  },
  aramaTemizle: {
    color: RENKLER.metinGri,
    fontSize: YAZI.md,
    paddingLeft: BOSLUK.sm,
  },
  filtreBtn: {
    width: 44,
    height: 44,
    backgroundColor: RENKLER.lacivert,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: RENKLER.kartKenari,
  },
  filtreBtnAktif: {
    borderColor: RENKLER.turuncu,
    backgroundColor: `${RENKLER.turuncu}15`,
  },
  filtreIkon: { fontSize: 20 },

  // Filtre paneli
  filtrePaneli: {
    backgroundColor: RENKLER.kart,
    paddingHorizontal: BOSLUK.lg,
    paddingVertical: BOSLUK.md,
    borderBottomWidth: 1,
    borderBottomColor: RENKLER.kartKenari,
  },
  filtreBaslik: {
    fontSize: YAZI.xs,
    fontWeight: YAZI.kalin,
    color: RENKLER.turuncu,
    letterSpacing: 1,
    marginBottom: BOSLUK.sm,
  },
  filtreSecenekler: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: BOSLUK.sm,
  },
  filtreSecim: {
    paddingHorizontal: BOSLUK.md,
    paddingVertical: BOSLUK.xs,
    borderRadius: RADIUS.tam,
    backgroundColor: RENKLER.lacivert,
    borderWidth: 1,
    borderColor: RENKLER.kartKenari,
  },
  filtreSecimAktif: {
    backgroundColor: RENKLER.turuncu,
    borderColor: RENKLER.turuncu,
  },
  filtreSecimMetin: {
    fontSize: YAZI.sm,
    color: RENKLER.metinGri,
  },
  filtreSecimMetinAktif: {
    color: RENKLER.beyaz,
    fontWeight: YAZI.kalin,
  },
  filtreTemizleBtn: {
    marginTop: BOSLUK.md,
    alignSelf: 'flex-start',
  },
  filtreTemizleBtnMetin: {
    color: RENKLER.hata,
    fontSize: YAZI.sm,
    textDecorationLine: 'underline',
  },

  // İstatistik
  istatistikSerit: {
    paddingHorizontal: BOSLUK.lg,
    paddingVertical: BOSLUK.sm,
    backgroundColor: RENKLER.lacivertAcik,
  },
  istatistikMetin: {
    fontSize: YAZI.sm,
    color: RENKLER.metinGri,
  },

  // Liste
  listeIcerik: {
    padding: BOSLUK.lg,
    paddingBottom: BOSLUK.xxxl,
  },

  // Öğrenci kartı
  ogrenciKart: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: RENKLER.kart,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: RENKLER.kartKenari,
    overflow: 'hidden',
    ...GOLGE.kucuk,
  },
  kartSolCizgi: {
    width: 4,
    alignSelf: 'stretch',
    backgroundColor: RENKLER.turuncu,
  },
  kartIcerik: {
    flex: 1,
    padding: BOSLUK.md,
  },
  kartUst: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: BOSLUK.sm,
  },
  kartBaslik: { flex: 1, marginRight: BOSLUK.sm },
  ogrenciAd: {
    fontSize: YAZI.md,
    fontWeight: YAZI.kalin,
    color: RENKLER.metinBeyaz,
  },
  ogrenciNo: {
    fontSize: YAZI.xs,
    color: RENKLER.metinGri,
    marginTop: 2,
  },
  subeDalEtiketler: {
    flexDirection: 'row',
    gap: BOSLUK.xs,
  },
  etiketKutu: {
    backgroundColor: `${RENKLER.lacivertOrta}`,
    borderRadius: RADIUS.sm,
    paddingHorizontal: BOSLUK.sm,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: RENKLER.kartKenari,
  },
  dalEtiket: {
    borderColor: `${RENKLER.turuncu}40`,
    backgroundColor: `${RENKLER.turuncu}10`,
  },
  etiketMetin: {
    fontSize: YAZI.xs,
    color: RENKLER.metinAcik,
    fontWeight: YAZI.orta,
  },
  kartAlt: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  isletmeBilgi: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  isletmeIkon: { fontSize: 13, marginRight: 4 },
  isletmeAd: {
    flex: 1,
    fontSize: YAZI.sm,
    color: RENKLER.metinGri,
  },
  devamsizliklar: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  devamsizlikBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: RENKLER.lacivert,
    borderRadius: RADIUS.sm,
    paddingHorizontal: BOSLUK.sm,
    paddingVertical: 2,
  },
  devamsizlikIkon: { fontSize: 12, marginRight: 3 },
  devamsizlikSayi: {
    fontSize: YAZI.sm,
    fontWeight: YAZI.kalin,
  },
  detayOk: {
    fontSize: 24,
    color: RENKLER.metinGri,
    paddingHorizontal: BOSLUK.sm,
  },

  // Boş liste
  bosListe: {
    alignItems: 'center',
    paddingVertical: BOSLUK.devasa,
  },
  bosListeEmoji: { fontSize: 50, marginBottom: BOSLUK.md },
  bosListeMetin: {
    fontSize: YAZI.lg,
    fontWeight: YAZI.kalin,
    color: RENKLER.metinBeyaz,
    marginBottom: BOSLUK.sm,
  },
  bosListeAlt: {
    fontSize: YAZI.sm,
    color: RENKLER.metinGri,
    textAlign: 'center',
  },
});
