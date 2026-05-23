// src/screens/LoginScreen.js
// Öğretmen giriş ekranı. Listeden öğretmen seçip şifre girilir.

import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ActivityIndicator, KeyboardAvoidingView, Platform,
  ScrollView, StatusBar, Animated,
} from 'react-native';
import { authAPI } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { RENKLER, YAZI, BOSLUK, RADIUS, GOLGE } from '../theme';

export default function LoginScreen() {
  const { girisYap } = useAuth();

  const [ogretmenler, setOgretmenler] = useState([]);
  const [seciliOgretmen, setSeciliOgretmen] = useState(null);
  const [sifre, setSifre] = useState('');
  const [yukleniyor, setYukleniyor] = useState(false);
  const [listYukleniyor, setListYukleniyor] = useState(true);
  const [hata, setHata] = useState('');
  const [pickerAcik, setPickerAcik] = useState(false);
  const [sifreGoster, setSifreGoster] = useState(false);

  // Animasyon değerleri
  const fadeAnim = new Animated.Value(0);
  const slideAnim = new Animated.Value(30);

  useEffect(() => {
    // Giriş animasyonu
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
    ]).start();

    // Öğretmen listesini yükle
    authAPI.ogretmenleriGetir()
      .then(res => setOgretmenler(res.data))
      .catch(() => setHata('Sunucuya bağlanılamadı. IP adresini kontrol edin.'))
      .finally(() => setListYukleniyor(false));
  }, []);

  const girisYapHandler = async () => {
    if (!seciliOgretmen) {
      setHata('Lütfen öğretmeninizi seçin');
      return;
    }
    if (!sifre) {
      setHata('Lütfen şifrenizi girin');
      return;
    }

    setHata('');
    setYukleniyor(true);
    try {
      await girisYap(seciliOgretmen.id, sifre);
    } catch (err) {
      setHata(err.message || 'Giriş başarısız');
    } finally {
      setYukleniyor(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={RENKLER.lacivert} />
      
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Logo & Başlık */}
          <Animated.View
            style={[styles.headerBlok, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}
          >
            <View style={styles.logoKutu}>
              <Text style={styles.logoEmoji}>🏫</Text>
            </View>
            <Text style={styles.baslik}>İşletme Takip</Text>
            <Text style={styles.altBaslik}>Mesleki Eğitim Yönetim Sistemi</Text>
          </Animated.View>

          {/* Form Kartı */}
          <Animated.View style={[styles.kart, { opacity: fadeAnim }]}>
            <Text style={styles.formBaslik}>Öğretmen Girişi</Text>

            {/* Öğretmen Seçici */}
            <View style={styles.inputGrup}>
              <Text style={styles.etiket}>ÖĞRETMEN</Text>
              <TouchableOpacity
                style={[styles.picker, pickerAcik && styles.pickerAcik]}
                onPress={() => setPickerAcik(!pickerAcik)}
                activeOpacity={0.8}
              >
                <Text style={seciliOgretmen ? styles.pickerSecili : styles.pickerPlaceholder}>
                  {seciliOgretmen ? seciliOgretmen.ad_soyad : 'Öğretmen seçin...'}
                </Text>
                <Text style={styles.pickerOk}>{pickerAcik ? '▲' : '▼'}</Text>
              </TouchableOpacity>

              {pickerAcik && (
                <View style={styles.pickerListesi}>
                  {listYukleniyor ? (
                    <ActivityIndicator color={RENKLER.turuncu} style={{ padding: BOSLUK.md }} />
                  ) : ogretmenler.length === 0 ? (
                    <Text style={styles.listeBos}>Öğretmen bulunamadı</Text>
                  ) : (
                    ogretmenler.map((ogretmen) => (
                      <TouchableOpacity
                        key={ogretmen.id}
                        style={[
                          styles.pickerItem,
                          seciliOgretmen?.id === ogretmen.id && styles.pickerItemSecili,
                        ]}
                        onPress={() => {
                          setSeciliOgretmen(ogretmen);
                          setPickerAcik(false);
                          setHata('');
                        }}
                      >
                        <Text style={[
                          styles.pickerItemMetin,
                          seciliOgretmen?.id === ogretmen.id && styles.pickerItemMetinSecili,
                        ]}>
                          {ogretmen.ad_soyad}
                        </Text>
                        {seciliOgretmen?.id === ogretmen.id && (
                          <Text style={styles.checkIsaret}>✓</Text>
                        )}
                      </TouchableOpacity>
                    ))
                  )}
                </View>
              )}
            </View>

            {/* Şifre */}
            <View style={styles.inputGrup}>
              <Text style={styles.etiket}>ŞİFRE</Text>
              <View style={styles.sifreKutu}>
                <TextInput
                  style={styles.sifreInput}
                  placeholder="Şifrenizi girin"
                  placeholderTextColor={RENKLER.metinGri}
                  secureTextEntry={!sifreGoster}
                  value={sifre}
                  onChangeText={(t) => { setSifre(t); setHata(''); }}
                  keyboardType="default"
                  returnKeyType="done"
                  onSubmitEditing={girisYapHandler}
                />
                <TouchableOpacity
                  onPress={() => setSifreGoster(!sifreGoster)}
                  style={styles.sifreGozBtn}
                >
                  <Text style={styles.sifreGozIkon}>{sifreGoster ? '🙈' : '👁️'}</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Hata mesajı */}
            {hata ? (
              <View style={styles.hataKutu}>
                <Text style={styles.hataMetin}>⚠️  {hata}</Text>
              </View>
            ) : null}

            {/* Giriş Butonu */}
            <TouchableOpacity
              style={[styles.girisBtn, yukleniyor && styles.girisBtnDevre]}
              onPress={girisYapHandler}
              disabled={yukleniyor}
              activeOpacity={0.85}
            >
              {yukleniyor ? (
                <ActivityIndicator color={RENKLER.beyaz} />
              ) : (
                <Text style={styles.girisBtnMetin}>GİRİŞ YAP</Text>
              )}
            </TouchableOpacity>
          </Animated.View>

          {/* Alt bilgi */}
          <Text style={styles.altBilgi}>
            Şifrenizi unuttuysanız okul yöneticinizle iletişime geçin.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: RENKLER.lacivert,
  },
  flex: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: BOSLUK.xl,
    paddingTop: 60,
    paddingBottom: 40,
    alignItems: 'center',
  },

  // Header
  headerBlok: {
    alignItems: 'center',
    marginBottom: BOSLUK.xxxl,
  },
  logoKutu: {
    width: 90,
    height: 90,
    borderRadius: RADIUS.xl,
    backgroundColor: RENKLER.turuncu,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: BOSLUK.lg,
    ...GOLGE.turuncu,
  },
  logoEmoji: { fontSize: 44 },
  baslik: {
    fontSize: YAZI.xxxl,
    fontWeight: YAZI.extraKalin,
    color: RENKLER.metinBeyaz,
    letterSpacing: 1,
  },
  altBaslik: {
    fontSize: YAZI.sm,
    color: RENKLER.metinGri,
    marginTop: BOSLUK.xs,
    letterSpacing: 0.5,
  },

  // Kart
  kart: {
    width: '100%',
    backgroundColor: RENKLER.kart,
    borderRadius: RADIUS.xl,
    padding: BOSLUK.xxl,
    borderWidth: 1,
    borderColor: RENKLER.kartKenari,
    ...GOLGE.buyuk,
  },
  formBaslik: {
    fontSize: YAZI.xl,
    fontWeight: YAZI.kalin,
    color: RENKLER.metinBeyaz,
    marginBottom: BOSLUK.xl,
  },

  // Input grubu
  inputGrup: {
    marginBottom: BOSLUK.lg,
  },
  etiket: {
    fontSize: YAZI.xs,
    fontWeight: YAZI.kalin,
    color: RENKLER.turuncu,
    letterSpacing: 1.5,
    marginBottom: BOSLUK.sm,
  },

  // Picker
  picker: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: RENKLER.lacivert,
    borderWidth: 1,
    borderColor: RENKLER.kartKenari,
    borderRadius: RADIUS.md,
    paddingHorizontal: BOSLUK.lg,
    paddingVertical: BOSLUK.md,
    minHeight: 50,
  },
  pickerAcik: {
    borderColor: RENKLER.turuncu,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  pickerPlaceholder: {
    color: RENKLER.metinGri,
    fontSize: YAZI.md,
  },
  pickerSecili: {
    color: RENKLER.metinBeyaz,
    fontSize: YAZI.md,
    fontWeight: YAZI.orta,
  },
  pickerOk: {
    color: RENKLER.metinGri,
    fontSize: YAZI.sm,
  },
  pickerListesi: {
    backgroundColor: RENKLER.lacivertOrta,
    borderWidth: 1,
    borderTopWidth: 0,
    borderColor: RENKLER.turuncu,
    borderBottomLeftRadius: RADIUS.md,
    borderBottomRightRadius: RADIUS.md,
    overflow: 'hidden',
  },
  pickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: BOSLUK.lg,
    paddingVertical: BOSLUK.md,
    borderBottomWidth: 1,
    borderBottomColor: RENKLER.kartKenari,
  },
  pickerItemSecili: {
    backgroundColor: `${RENKLER.turuncu}20`,
  },
  pickerItemMetin: {
    color: RENKLER.metinAcik,
    fontSize: YAZI.md,
  },
  pickerItemMetinSecili: {
    color: RENKLER.turuncu,
    fontWeight: YAZI.kalin,
  },
  checkIsaret: {
    color: RENKLER.turuncu,
    fontWeight: YAZI.kalin,
  },
  listeBos: {
    color: RENKLER.metinGri,
    padding: BOSLUK.md,
    textAlign: 'center',
  },

  // Şifre
  sifreKutu: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: RENKLER.lacivert,
    borderWidth: 1,
    borderColor: RENKLER.kartKenari,
    borderRadius: RADIUS.md,
    minHeight: 50,
  },
  sifreInput: {
    flex: 1,
    color: RENKLER.metinBeyaz,
    fontSize: YAZI.md,
    paddingHorizontal: BOSLUK.lg,
    paddingVertical: BOSLUK.md,
  },
  sifreGozBtn: {
    paddingHorizontal: BOSLUK.md,
    paddingVertical: BOSLUK.sm,
  },
  sifreGozIkon: { fontSize: 18 },

  // Hata
  hataKutu: {
    backgroundColor: `${RENKLER.hata}20`,
    borderWidth: 1,
    borderColor: RENKLER.hata,
    borderRadius: RADIUS.md,
    padding: BOSLUK.md,
    marginBottom: BOSLUK.md,
  },
  hataMetin: {
    color: RENKLER.hata,
    fontSize: YAZI.sm,
  },

  // Giriş butonu
  girisBtn: {
    backgroundColor: RENKLER.turuncu,
    borderRadius: RADIUS.md,
    paddingVertical: BOSLUK.lg,
    alignItems: 'center',
    marginTop: BOSLUK.sm,
    ...GOLGE.turuncu,
  },
  girisBtnDevre: {
    opacity: 0.7,
  },
  girisBtnMetin: {
    color: RENKLER.beyaz,
    fontSize: YAZI.md,
    fontWeight: YAZI.extraKalin,
    letterSpacing: 2,
  },

  // Alt bilgi
  altBilgi: {
    color: RENKLER.metinGri,
    fontSize: YAZI.xs,
    textAlign: 'center',
    marginTop: BOSLUK.xl,
    lineHeight: 18,
  },
});
