import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, TouchableOpacity, 
  ActivityIndicator, TextInput, Modal, Alert, Linking
} from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { planAPI } from '../api/client';
import { RENKLER, YAZI, GOLGE, BOSLUK, RADIUS } from '../theme';

export default function PlanlaScreen() {
  const [yukleniyor, setYukleniyor] = useState(true);
  const [gruplar, setGruplar] = useState([]);
  const [atanmamisIsletmeler, setAtanmamisIsletmeler] = useState([]);
  const [sonZiyaretMap, setSonZiyaretMap] = useState({});
  
  // Modal State
  const [modalGorunur, setModalGorunur] = useState(false);
  const [yeniGrupAdi, setYeniGrupAdi] = useState('');
  const [yeniGrupTarihi, setYeniGrupTarihi] = useState(''); // YYYY-MM-DD
  const [kaydediliyor, setKaydediliyor] = useState(false);

  // Çoklu Seçim State
  const [seciliIsletmeler, setSeciliIsletmeler] = useState([]);
  const [topluTarih, setTopluTarih] = useState('');

  // Açılır/Kapanır Grup State
  const [acikGruplar, setAcikGruplar] = useState({});

  const grupAcKapat = (grupId) => {
    setAcikGruplar(prev => ({
      ...prev,
      [grupId]: !prev[grupId]
    }));
  };

  // Tarih Seçici Modal State
  const [tarihModalGorunur, setTarihModalGorunur] = useState(false);
  const [seciliAy, setSeciliAy] = useState(new Date().getMonth());
  const [seciliYil, setSeciliYil] = useState(new Date().getFullYear());

  // İşletme Taşıma State
  const [tasinacakIsletme, setTasinacakIsletme] = useState(null);
  const [tasiModalGorunur, setTasiModalGorunur] = useState(false);

  useEffect(() => {
    veriGetir();
  }, []);

  const veriGetir = async () => {
    try {
      setYukleniyor(true);
      const res = await planAPI.listele();
      setGruplar(res.gruplar || []);
      setAtanmamisIsletmeler(res.atanmamisIsletmeler || []);
      setSonZiyaretMap(res.sonZiyaretMap || {});
    } catch (error) {
      console.error("Plan verisi getirme hatası:", error);
      Alert.alert('Hata', 'Veriler alınamadı');
    } finally {
      setYukleniyor(false);
    }
  };

  const grupEkle = async () => {
    if (!yeniGrupAdi.trim()) {
      Alert.alert('Uyarı', 'Lütfen grup adı girin');
      return;
    }
    
    try {
      setKaydediliyor(true);
      await planAPI.grupEkle(yeniGrupAdi, yeniGrupTarihi);
      setModalGorunur(false);
      setYeniGrupAdi('');
      setYeniGrupTarihi('');
      veriGetir(); // Verileri yenile
    } catch (error) {
      Alert.alert('Hata', 'Grup oluşturulamadı');
    } finally {
      setKaydediliyor(false);
    }
  };

  const grupSil = (grupId) => {
    Alert.alert('Onay', 'Bu grubu silmek istediğinize emin misiniz? (İşletmeler boşa çıkacaktır)', [
      { text: 'İptal', style: 'cancel' },
      { 
        text: 'Sil', 
        style: 'destructive',
        onPress: async () => {
          try {
            await planAPI.grupSil(grupId);
            veriGetir();
          } catch (error) {
            Alert.alert('Hata', 'Grup silinemedi');
          }
        }
      }
    ]);
  };

  const isletmeTasi = async (hedefGrupId) => {
    if (!tasinacakIsletme) return;

    try {
      setKaydediliyor(true);
      await planAPI.isletmeAta(tasinacakIsletme, hedefGrupId);
      setTasiModalGorunur(false);
      setTasinacakIsletme(null);
      veriGetir();
    } catch (error) {
      Alert.alert('Hata', 'İşletme taşınamadı');
    } finally {
      setKaydediliyor(false);
    }
  };

  const tasiModalAc = (isletmeAdi) => {
    setTasinacakIsletme(isletmeAdi);
    setTasiModalGorunur(true);
  };

  const isletmeSecToggle = (isletmeAdi) => {
    setSeciliIsletmeler(prev => {
      if (prev.includes(isletmeAdi)) {
        return prev.filter(i => i !== isletmeAdi);
      } else {
        return [...prev, isletmeAdi];
      }
    });
  };

  const topluPlanOlustur = async () => {
    if (!topluTarih.trim()) {
      Alert.alert('Uyarı', 'Lütfen ziyaret tarihi girin');
      return;
    }
    try {
      setKaydediliyor(true);
      await planAPI.tarihKaydet(seciliIsletmeler, topluTarih);
      Alert.alert('Başarılı', 'Seçilen işletmeler için ziyaret tarihi kaydedildi!');
      setSeciliIsletmeler([]);
      setTopluTarih('');
      veriGetir();
    } catch (error) {
      Alert.alert('Hata', 'Ziyaret tarihi kaydedilemedi');
    } finally {
      setKaydediliyor(false);
    }
  };

  const haritadaAc = async () => {
    try {
      setKaydediliyor(true);
      const res = await planAPI.mapsLink(seciliIsletmeler);
      if (res.mapsUrl) {
        Linking.openURL(res.mapsUrl);
      }
    } catch (error) {
      Alert.alert('Hata', error.response?.data?.error || 'Adresler bulunamadı veya harita açılamadı');
    } finally {
      setKaydediliyor(false);
    }
  };

  // Takvim oluşturma fonksiyonu
  const gunleriGetir = () => {
    const gunSayisi = new Date(seciliYil, seciliAy + 1, 0).getDate();
    return Array.from({ length: gunSayisi }, (_, i) => i + 1);
  };

  const aylar = [
    'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 
    'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
  ];

  const tarihOnayla = (gun) => {
    // Format: YYYY-MM-DD veya DD.MM.YYYY
    const aa = (seciliAy + 1).toString().padStart(2, '0');
    const gg = gun.toString().padStart(2, '0');
    setTopluTarih(`${gg}.${aa}.${seciliYil}`);
    setTarihModalGorunur(false);
  };

  if (yukleniyor) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={RENKLER.turuncu} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={{ padding: BOSLUK.md, paddingBottom: 100 }}>
        
        {/* Gruplar Başlığı ve Ekle Butonu */}
        <View style={[styles.headerRow, { justifyContent: 'flex-end' }]}>
          <TouchableOpacity style={styles.addBtn} onPress={() => setModalGorunur(true)}>
            <Icon name="plus" size={20} color={RENKLER.beyaz} />
            <Text style={styles.addBtnText}>Yeni Grup</Text>
          </TouchableOpacity>
        </View>

        {/* Atanmamış İşletmeler (En Üstte) */}
        <Text style={[styles.pageTitle, { marginTop: BOSLUK.sm }]}>Gruba Eklenmeyen İşletmeler ({atanmamisIsletmeler.length})</Text>
        <View style={[styles.grupCard, {marginBottom: BOSLUK.lg}]}>
          {atanmamisIsletmeler.length === 0 ? (
            <Text style={styles.emptyGrupText}>Tüm işletmeler planlandı!</Text>
          ) : (
            atanmamisIsletmeler.map(isl => {
              const sonZiyaret = sonZiyaretMap[isl];
              return (
                <View key={isl} style={styles.isletmeItem}>
                  <Icon name="help-circle-outline" size={24} color={RENKLER.metinGri} />
                  <View style={{flex: 1, marginLeft: 10}}>
                    <Text style={styles.isletmeText}>{isl}</Text>
                    {sonZiyaret && <Text style={{fontSize: YAZI.xs, color: RENKLER.metinGri}}>Son Ziyaret: {sonZiyaret}</Text>}
                  </View>
                  <TouchableOpacity onPress={() => tasiModalAc(isl)} style={{padding: 5}}>
                    <Icon name="plus-circle" size={20} color={RENKLER.basari} />
                  </TouchableOpacity>
                </View>
              );
            })
          )}
        </View>

        <Text style={[styles.pageTitle, { marginTop: BOSLUK.sm }]}>Oluşturulan Gruplar ({gruplar.length})</Text>

        {/* Oluşturulan Gruplar */}
        {gruplar.length === 0 ? (
          <View style={styles.emptyCard}>
            <Icon name="calendar-blank" size={40} color={RENKLER.gri500} />
            <Text style={styles.emptyText}>Henüz hiç grup oluşturmadınız.</Text>
          </View>
        ) : (
          gruplar.map(grup => (
            <View key={grup.id} style={styles.grupCard}>
              <TouchableOpacity 
                style={styles.grupHeader}
                onPress={() => grupAcKapat(grup.id)}
                activeOpacity={0.7}
              >
                <View style={{flex: 1}}>
                  <Text style={styles.grupAdi}>{grup.grup_adi} <Text style={{fontSize:YAZI.sm, color: RENKLER.metinGri}}>({grup.isletmeler ? grup.isletmeler.length : 0})</Text></Text>
                  {grup.ziyaret_tarihi ? (
                    <Text style={styles.grupTarihi}>
                      <Icon name="calendar" size={12} /> {grup.ziyaret_tarihi}
                    </Text>
                  ) : null}
                </View>
                <View style={{flexDirection: 'row', alignItems: 'center'}}>
                  <TouchableOpacity onPress={() => grupSil(grup.id)} style={styles.deleteBtn}>
                    <Icon name="trash-can-outline" size={20} color={RENKLER.hata} />
                  </TouchableOpacity>
                  <Icon 
                    name={acikGruplar[grup.id] ? "chevron-up" : "chevron-down"} 
                    size={24} 
                    color={RENKLER.metinGri} 
                    style={{marginLeft: 10}}
                  />
                </View>
              </TouchableOpacity>

              {acikGruplar[grup.id] && (
                <View style={styles.isletmeListesi}>
                {grup.isletmeler && grup.isletmeler.length > 0 ? (
                  grup.isletmeler.map(isl => {
                    const secili = seciliIsletmeler.includes(isl);
                    const sonZiyaret = sonZiyaretMap[isl];
                    return (
                      <TouchableOpacity 
                        key={isl} 
                        style={[styles.isletmeItem, secili && styles.isletmeItemSecili]}
                        onPress={() => isletmeSecToggle(isl)}
                      >
                        <Icon 
                          name={secili ? "check-box-outline" : "checkbox-blank-outline"} 
                          size={24} 
                          color={secili ? RENKLER.basari : RENKLER.metinGri} 
                        />
                        <View style={{flex: 1, marginLeft: 10}}>
                          <Text style={styles.isletmeText}>{isl}</Text>
                          {sonZiyaret && <Text style={{fontSize: YAZI.xs, color: RENKLER.metinGri}}>Son Ziyaret: {sonZiyaret}</Text>}
                        </View>
                        <TouchableOpacity onPress={() => tasiModalAc(isl)} style={{padding: 5}}>
                          <Icon name="swap-horizontal" size={20} color={RENKLER.turuncu} />
                        </TouchableOpacity>
                      </TouchableOpacity>
                    );
                  })
                ) : (
                  <Text style={styles.emptyGrupText}>Bu grupta işletme yok.</Text>
                )}
              </View>
              )}
            </View>
          ))
        )}
      </ScrollView>

      {/* SEÇİLEN İŞLETMELER İÇİN ALT BAR */}
      {seciliIsletmeler.length > 0 && (
        <View style={styles.bottomBar}>
          <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: BOSLUK.xs}}>
            <Text style={styles.bottomBarTitle}>{seciliIsletmeler.length} işletme seçildi</Text>
            <TouchableOpacity onPress={() => setSeciliIsletmeler([])} style={{padding: 5}}>
              <Text style={{color: RENKLER.metinGri, fontWeight: 'bold'}}>İptal Et</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.bottomBarInputRow}>
            <TouchableOpacity 
              style={styles.bottomBarInputBtn} 
              onPress={() => setTarihModalGorunur(true)}
            >
              <Text style={{color: topluTarih ? RENKLER.metinBeyaz : RENKLER.gri500}}>
                {topluTarih || "Tarih Seçin..."}
              </Text>
              <Icon name="calendar" size={20} color={RENKLER.metinGri} />
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.bottomBarBtn} onPress={topluPlanOlustur} disabled={kaydediliyor}>
              <Text style={styles.bottomBarBtnText}>Plan Oluştur</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.mapsBtn} onPress={haritadaAc} disabled={kaydediliyor}>
            <Icon name="google-maps" size={20} color={RENKLER.beyaz} />
            <Text style={styles.mapsBtnText}>Google Maps'te Rota Çiz</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* TARİH SEÇİCİ MODAL */}
      <Modal visible={tarihModalGorunur} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, {padding: BOSLUK.md}]}>
            <View style={styles.takvimHeader}>
              <TouchableOpacity onPress={() => setSeciliYil(y => y - 1)}>
                <Icon name="chevron-double-left" size={24} color={RENKLER.metinBeyaz} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => {
                if(seciliAy === 0) { setSeciliAy(11); setSeciliYil(y => y - 1); }
                else setSeciliAy(a => a - 1);
              }}>
                <Icon name="chevron-left" size={24} color={RENKLER.metinBeyaz} />
              </TouchableOpacity>
              
              <Text style={styles.takvimTitle}>{aylar[seciliAy]} {seciliYil}</Text>
              
              <TouchableOpacity onPress={() => {
                if(seciliAy === 11) { setSeciliAy(0); setSeciliYil(y => y + 1); }
                else setSeciliAy(a => a + 1);
              }}>
                <Icon name="chevron-right" size={24} color={RENKLER.metinBeyaz} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setSeciliYil(y => y + 1)}>
                <Icon name="chevron-double-right" size={24} color={RENKLER.metinBeyaz} />
              </TouchableOpacity>
            </View>

            <View style={styles.takvimGrid}>
              {gunleriGetir().map(gun => (
                <TouchableOpacity 
                  key={gun} 
                  style={styles.takvimGunBtn}
                  onPress={() => tarihOnayla(gun)}
                >
                  <Text style={styles.takvimGunText}>{gun}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity 
              style={[styles.modalBtnCancel, {marginTop: BOSLUK.md}]} 
              onPress={() => setTarihModalGorunur(false)}
            >
              <Text style={styles.modalBtnCancelText}>İptal</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* YENİ GRUP MODALI */}
      <Modal visible={modalGorunur} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Yeni Ziyaret Grubu</Text>
            
            <Text style={styles.label}>Grup Adı (Örn: Pazartesi Ziyaretleri)</Text>
            <TextInput
              style={styles.input}
              value={yeniGrupAdi}
              onChangeText={setYeniGrupAdi}
              placeholder="Grubun Adı..."
              placeholderTextColor={RENKLER.gri500}
              cursorColor={RENKLER.turuncu}
              selectionColor={RENKLER.turuncu}
            />

            <Text style={styles.label}>Ziyaret Tarihi (İsteğe Bağlı)</Text>
            <TextInput
              style={styles.input}
              value={yeniGrupTarihi}
              onChangeText={setYeniGrupTarihi}
              placeholder="GG.AA.YYYY veya Metin"
              placeholderTextColor={RENKLER.gri500}
              cursorColor={RENKLER.turuncu}
              selectionColor={RENKLER.turuncu}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalBtnCancel} onPress={() => setModalGorunur(false)}>
                <Text style={styles.modalBtnCancelText}>İptal</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalBtnSave} onPress={grupEkle} disabled={kaydediliyor}>
                <Text style={styles.modalBtnSaveText}>{kaydediliyor ? 'Ekleniyor...' : 'Ekle'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* İŞLETME TAŞIMA MODALI */}
      <Modal visible={tasiModalGorunur} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>İşletmeyi Taşı</Text>
            <Text style={styles.tasiIsletmeAdi}>{tasinacakIsletme}</Text>
            
            <Text style={styles.label}>Hedef Grup Seçin:</Text>
            
            <ScrollView style={styles.hedefGrupListesi}>
              {/* Gruptan çıkarma seçeneği */}
              <TouchableOpacity 
                style={styles.hedefGrupItem}
                onPress={() => isletmeTasi(null)}
              >
                <Icon name="close-circle-outline" size={20} color={RENKLER.hata} />
                <Text style={styles.hedefGrupText}>Gruptan Çıkar (Planlanmamışa Al)</Text>
              </TouchableOpacity>

              {gruplar.map(g => (
                <TouchableOpacity 
                  key={g.id}
                  style={styles.hedefGrupItem}
                  onPress={() => isletmeTasi(g.id)}
                >
                  <Icon name="folder-outline" size={20} color={RENKLER.turuncu} />
                  <Text style={styles.hedefGrupText}>{g.grup_adi}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <TouchableOpacity style={[styles.modalBtnCancel, { marginTop: BOSLUK.md }]} onPress={() => setTasiModalGorunur(false)}>
              <Text style={styles.modalBtnCancelText}>İptal Et</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: RENKLER.arkaplan,
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: BOSLUK.md,
  },
  pageTitle: {
    fontSize: YAZI.lg,
    fontWeight: 'bold',
    color: RENKLER.metinBeyaz,
    marginBottom: BOSLUK.sm,
  },
  addBtn: {
    flexDirection: 'row',
    backgroundColor: RENKLER.turuncu,
    paddingHorizontal: BOSLUK.md,
    paddingVertical: BOSLUK.sm,
    borderRadius: RADIUS.md,
    alignItems: 'center',
  },
  addBtnText: {
    color: RENKLER.beyaz,
    fontWeight: 'bold',
    marginLeft: BOSLUK.xs,
  },
  emptyCard: {
    backgroundColor: RENKLER.kart,
    padding: BOSLUK.xl,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
    ...GOLGE,
  },
  emptyText: {
    color: RENKLER.metinGri,
    marginTop: BOSLUK.sm,
    fontSize: YAZI.md,
  },
  grupCard: {
    backgroundColor: RENKLER.kart,
    borderRadius: RADIUS.lg,
    padding: BOSLUK.md,
    marginBottom: BOSLUK.md,
    ...GOLGE,
  },
  grupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottomWidth: 1,
    borderBottomColor: RENKLER.lacivertAcik,
    paddingBottom: BOSLUK.sm,
    marginBottom: BOSLUK.sm,
  },
  grupAdi: {
    fontSize: YAZI.md,
    fontWeight: 'bold',
    color: RENKLER.turuncu,
  },
  grupTarihi: {
    fontSize: YAZI.xs,
    color: RENKLER.metinGri,
    marginTop: 2,
  },
  deleteBtn: {
    padding: 5,
  },
  isletmeListesi: {
    marginTop: BOSLUK.xs,
  },
  isletmeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: RENKLER.lacivertAcik,
    padding: BOSLUK.sm,
    borderRadius: RADIUS.sm,
    marginBottom: BOSLUK.xs,
  },
  isletmeItemSecili: {
    backgroundColor: RENKLER.lacivertOrta,
    borderColor: RENKLER.turuncu,
    borderWidth: 1,
  },
  isletmeText: {
    color: RENKLER.metinBeyaz,
    fontSize: YAZI.sm,
    flex: 1,
  },
  emptyGrupText: {
    color: RENKLER.metinGri,
    fontSize: YAZI.sm,
    fontStyle: 'italic',
    textAlign: 'center',
    padding: BOSLUK.sm,
  },

  // MODAL STYLES
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: BOSLUK.lg,
  },
  modalContent: {
    backgroundColor: RENKLER.kart,
    width: '90%',
    maxWidth: 400,
    borderRadius: RADIUS.lg,
    padding: BOSLUK.lg,
    ...GOLGE,
  },
  modalTitle: {
    fontSize: YAZI.lg,
    fontWeight: 'bold',
    color: RENKLER.metinBeyaz,
    marginBottom: BOSLUK.md,
    textAlign: 'center',
  },
  label: {
    color: RENKLER.metinGri,
    fontSize: YAZI.sm,
    marginBottom: BOSLUK.xs,
    marginTop: BOSLUK.sm,
  },
  input: {
    backgroundColor: RENKLER.lacivertAcik,
    borderWidth: 1,
    borderColor: RENKLER.lacivertOrta,
    borderRadius: RADIUS.sm,
    padding: BOSLUK.sm,
    color: RENKLER.metinBeyaz,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: BOSLUK.lg,
  },
  modalBtnCancel: {
    flex: 1,
    padding: BOSLUK.sm,
    backgroundColor: RENKLER.lacivertAcik,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    marginRight: BOSLUK.sm,
  },
  modalBtnCancelText: {
    color: RENKLER.metinBeyaz,
    fontWeight: 'bold',
  },
  modalBtnSave: {
    flex: 1,
    padding: BOSLUK.sm,
    backgroundColor: RENKLER.turuncu,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    marginLeft: BOSLUK.sm,
  },
  modalBtnSaveText: {
    color: RENKLER.beyaz,
    fontWeight: 'bold',
  },

  tasiIsletmeAdi: {
    color: RENKLER.turuncu,
    fontSize: YAZI.md,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: BOSLUK.md,
  },
  hedefGrupListesi: {
    maxHeight: 200,
    marginTop: BOSLUK.sm,
  },
  hedefGrupItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: BOSLUK.md,
    backgroundColor: RENKLER.lacivertAcik,
    borderRadius: RADIUS.sm,
    marginBottom: BOSLUK.xs,
  },
  hedefGrupText: {
    color: RENKLER.metinBeyaz,
    marginLeft: BOSLUK.sm,
    fontSize: YAZI.sm,
  },

  // ALT BAR
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: RENKLER.kart,
    padding: BOSLUK.md,
    borderTopWidth: 1,
    borderTopColor: RENKLER.lacivertOrta,
    ...GOLGE,
  },
  bottomBarTitle: {
    color: RENKLER.turuncu,
    fontWeight: 'bold',
    marginBottom: BOSLUK.xs,
  },
  bottomBarInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: BOSLUK.sm,
  },
  bottomBarInputBtn: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: RENKLER.lacivertAcik,
    borderRadius: RADIUS.sm,
    padding: BOSLUK.sm,
    marginRight: BOSLUK.sm,
  },
  bottomBarBtn: {
    backgroundColor: RENKLER.basari,
    paddingHorizontal: BOSLUK.md,
    paddingVertical: BOSLUK.sm,
    borderRadius: RADIUS.sm,
  },
  bottomBarBtnText: {
    color: RENKLER.beyaz,
    fontWeight: 'bold',
  },
  mapsBtn: {
    flexDirection: 'row',
    backgroundColor: '#4285F4',
    padding: BOSLUK.sm,
    borderRadius: RADIUS.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapsBtnText: {
    color: RENKLER.beyaz,
    fontWeight: 'bold',
    marginLeft: BOSLUK.xs,
  },

  // TAKVİM STYLES
  takvimHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: BOSLUK.md,
    backgroundColor: RENKLER.lacivert,
    padding: BOSLUK.sm,
    borderRadius: RADIUS.sm,
  },
  takvimTitle: {
    color: RENKLER.turuncu,
    fontSize: YAZI.md,
    fontWeight: 'bold',
  },
  takvimGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
  },
  takvimGunBtn: {
    width: '14%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 5,
    borderRadius: 20,
    backgroundColor: RENKLER.lacivertAcik,
    marginHorizontal: '0.14%',
  },
  takvimGunText: {
    color: RENKLER.metinBeyaz,
    fontSize: YAZI.sm,
  },
});
