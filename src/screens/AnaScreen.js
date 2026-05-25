import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, ScrollView, Platform, TextInput, Modal } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { ogrenciAPI } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { RENKLER, YAZI, GOLGE, BOSLUK as SPACING, RADIUS as BORDER_RADIUS } from '../theme';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';

export default function AnaScreen({ navigation }) {
  const { kullanici, cikisYap } = useAuth();
  const [ogrenciler, setOgrenciler] = useState([]);
  const [tumOgrenciler, setTumOgrenciler] = useState([]);
  const [isletmeler, setIsletmeler] = useState([]);
  const [seciliIsletme, setSeciliIsletme] = useState('');
  const [aramaMetni, setAramaMetni] = useState('');
  const [yukleniyor, setYukleniyor] = useState(true);

  // Global Arama States
  const [searchModalVisible, setSearchModalVisible] = useState(false);
  const [globalAramaMetni, setGlobalAramaMetni] = useState('');
  const [globalAramaTipi, setGlobalAramaTipi] = useState('ogrenci'); // 'ogrenci' veya 'isyeri'
  const [globalAramaSonuclari, setGlobalAramaSonuclari] = useState([]);
  const [aramaYukleniyor, setAramaYukleniyor] = useState(false);

  // Öğretmen Filtresi (Sadece Admin için)
  const [ogretmenListesi, setOgretmenListesi] = useState([]);
  const [seciliOgretmenFiltre, setSeciliOgretmenFiltre] = useState('Tümü');

  // Dosya bilgilerini simüle ediyoruz (Gelecekte API'den çekilebilir)
  const [okulAdi, setOkulAdi] = useState("100. Yıl Mesleki Eğitim Merkezi");
  const [excelDosyaAdi, setExcelDosyaAdi] = useState("27.05.2026 İŞLETME TAKİP.xlsm");

  useEffect(() => {
    veriGetir();
  }, []);

  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity style={{ marginRight: 15 }} onPress={() => setSearchModalVisible(true)}>
          <Icon name="magnify" size={26} color="#444" />
        </TouchableOpacity>
      ),
    });
  }, [navigation]);

  // Global Arama Debounce Effect
  useEffect(() => {
    if (globalAramaMetni.length >= 2) {
      setAramaYukleniyor(true);
      const delay = setTimeout(async () => {
        try {
          const res = await ogrenciAPI.globalArama(globalAramaMetni, globalAramaTipi);
          setGlobalAramaSonuclari(res.data || []);
        } catch(e) {
          console.log(e);
          setGlobalAramaSonuclari([]);
        } finally {
          setAramaYukleniyor(false);
        }
      }, 500);
      return () => clearTimeout(delay);
    } else {
      setGlobalAramaSonuclari([]);
      setAramaYukleniyor(false);
    }
  }, [globalAramaMetni, globalAramaTipi]);

  const veriGetir = async () => {
    try {
      setYukleniyor(true);
      const response = await ogrenciAPI.listele();
      const data = response.data || [];
      
      setTumOgrenciler(data);

      const ogretmenSet = new Set();
      data.forEach(o => {
        if(o.ogretmen_adi) ogretmenSet.add(o.ogretmen_adi);
      });
      const ogretmenlerArr = Array.from(ogretmenSet).sort((a,b) => a.localeCompare(b, 'tr'));
      setOgretmenListesi(ogretmenlerArr);

      isletmeleriGrupla(data, seciliOgretmenFiltre);
      
    } catch (error) {
      console.error("Veri getirme hatası:", error);
    } finally {
      setYukleniyor(false);
    }
  };

  const isletmeleriGrupla = (data, filtre) => {
    let filtrelenmisData = data;
    if (filtre && filtre !== 'Tümü') {
      filtrelenmisData = data.filter(o => o.ogretmen_adi === filtre);
    }

    const islemteMap = new Map();
    filtrelenmisData.forEach(ogr => {
      if (ogr.isletme_adi && !islemteMap.has(ogr.isletme_adi)) {
        islemteMap.set(ogr.isletme_adi, {
          adi: ogr.isletme_adi,
          telefon: ogr.isyeri_telefonu,
          adres: ogr.isyeri_adresi,
          usta_ogretici: ogr.usta_ogretici_adi,
          ogrenciler: []
        });
      }
      if (ogr.isletme_adi) {
        islemteMap.get(ogr.isletme_adi).ogrenciler.push(ogr);
      }
    });
    
    const isletmeListesi = Array.from(islemteMap.values());
    isletmeListesi.sort((a, b) => a.adi.localeCompare(b.adi, 'tr'));
    setIsletmeler(isletmeListesi);
    
    if (isletmeListesi.length > 0) {
      setSeciliIsletme(isletmeListesi[0].adi);
      setOgrenciler(isletmeListesi[0].ogrenciler);
    } else {
      setSeciliIsletme('');
      setOgrenciler([]);
    }
  };

  const onOgretmenDegis = (itemValue) => {
    setSeciliOgretmenFiltre(itemValue);
    isletmeleriGrupla(tumOgrenciler, itemValue);
  };

  const onIsletmeDegis = (itemValue) => {
    setSeciliIsletme(itemValue);
    const isletme = isletmeler.find(i => i.adi === itemValue);
    if (isletme) {
      setOgrenciler(isletme.ogrenciler);
    }
  };

  if (yukleniyor) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={RENKLER.turuncu} />
      </View>
    );
  }

  const aktifIsletme = isletmeler.find(i => i.adi === seciliIsletme) || null;
  const toplamOgrenciSayisi = isletmeler.reduce((toplam, isl) => toplam + isl.ogrenciler.length, 0);

  // Arama sonuçları
  const aramaSonuclari = aramaMetni.trim() !== '' 
    ? tumOgrenciler.filter(ogr => {
        const aramaKucuk = aramaMetni.toLocaleLowerCase('tr');
        const adEslesiyor = ogr.ad_soyad && ogr.ad_soyad.toLocaleLowerCase('tr').includes(aramaKucuk);
        const isyeriEslesiyor = ogr.isletme_adi && ogr.isletme_adi.toLocaleLowerCase('tr').includes(aramaKucuk);
        return adEslesiyor || isyeriEslesiyor;
      })
    : [];

  // Ana ekranda platforma özel Scroll ayarı (Web'de daha rahat kaydırma için padding)
  const isWeb = Platform.OS === 'web';

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 100 }}>
      {/* Üst Kısım: Profil ve Okul Bilgileri */}
      <View style={styles.headerCard}>
        <View style={styles.profileContainer}>
          <View style={styles.profileAvatar}>
            <Icon name="account" size={50} color={RENKLER.gri} />
          </View>
          <Text style={styles.welcomeText}>
            Sayın {kullanici?.ad_soyad},{'\n'}İşletme Takip Sistemine Hoşgeldiniz
          </Text>

          {kullanici?.rol === 'admin' && (
            <TouchableOpacity style={styles.adminBackButton} onPress={() => navigation.navigate('AdminDashboard')}>
              <Icon name="arrow-left" size={20} color={RENKLER.turuncu} />
              <Text style={{color: RENKLER.turuncu, marginLeft: 4, fontSize: 12, fontWeight: 'bold'}}>Yönetici Paneli</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity style={styles.logoutButton} onPress={cikisYap}>
            <Icon name="logout" size={20} color={RENKLER.turuncu} />
          </TouchableOpacity>
        </View>

        <View style={styles.infoRow}>
          <View style={styles.infoIconBox}>
            <Icon name="school" size={24} color={RENKLER.lacivert} />
          </View>
          <View style={styles.infoTextContainer}>
            <Text style={styles.infoTitle}>Okulunuz</Text>
            <Text style={styles.infoValue}>{okulAdi}</Text>
          </View>
        </View>

        <View style={styles.infoRow}>
          <View style={[styles.infoIconBox, { backgroundColor: '#e8f5e9' }]}>
            <Icon name="file-excel" size={24} color="#4caf50" />
          </View>
          <View style={styles.infoTextContainer}>
            <Text style={styles.infoTitle}>Excel Dosyası</Text>
            <Text style={styles.infoValue}>{excelDosyaAdi}</Text>
          </View>
        </View>
      </View>

      {aramaMetni.trim() === '' ? (
        <>
          {/* İstatistikler */}
          <Text style={styles.sectionTitle}>Öğretmen İstatistikleri</Text>
          <View style={styles.statsContainer}>
            <View style={styles.statCard}>
              <Icon name="domain" size={28} color={RENKLER.lacivertAcik} />
              <Text style={styles.statTitle}>İşletme</Text>
              <Text style={styles.statValue}>{isletmeler.length}</Text>
            </View>
            <View style={styles.statCard}>
              <Icon name="account-group" size={28} color={RENKLER.lacivertAcik} />
              <Text style={styles.statTitle}>Öğrenci</Text>
              <Text style={styles.statValue}>{toplamOgrenciSayisi}</Text>
            </View>
          </View>

          {/* İşletme Seçimi */}
          <View style={styles.isletmeCard}>
            {kullanici?.rol === 'admin' && (
              <View style={{ marginBottom: SPACING.md }}>
                <View style={styles.isletmeHeader}>
                  <Icon name="account-tie" size={24} color={RENKLER.turuncu} />
                  <Text style={styles.isletmeListesiTitle}>Öğretmen Filtresi</Text>
                </View>
                {isWeb ? (
                  <select 
                    value={seciliOgretmenFiltre} 
                    onChange={(e) => onOgretmenDegis(e.target.value)}
                    style={styles.webSelect}
                  >
                    <option value="Tümü">Tümü</option>
                    {ogretmenListesi.map((ogr) => (
                      <option key={ogr} value={ogr}>{ogr}</option>
                    ))}
                  </select>
                ) : (
                  <View style={styles.pickerContainer}>
                    <Picker
                      selectedValue={seciliOgretmenFiltre}
                      onValueChange={onOgretmenDegis}
                      style={{ color: RENKLER.metinBeyaz }}
                    >
                      <Picker.Item label="Tümü" value="Tümü" color={RENKLER.lacivert} />
                      {ogretmenListesi.map(ogr => (
                        <Picker.Item key={ogr} label={ogr} value={ogr} color={RENKLER.lacivert} />
                      ))}
                    </Picker>
                  </View>
                )}
              </View>
            )}

            <View style={styles.isletmeHeader}>
              <Icon name="domain" size={24} color={RENKLER.turuncu} />
              <Text style={styles.isletmeListesiTitle}>İşletme Listesi</Text>
            </View>
            {isWeb ? (
              <select 
                value={seciliIsletme} 
                onChange={(e) => onIsletmeDegis(e.target.value)}
                style={styles.webSelect}
              >
                {isletmeler.map((isl) => (
                  <option key={isl.adi} value={isl.adi}>{isl.adi}</option>
                ))}
              </select>
            ) : (
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={seciliIsletme}
                  onValueChange={onIsletmeDegis}
                  style={{ color: RENKLER.metinBeyaz }}
                >
                  {isletmeler.map(isl => (
                    <Picker.Item key={isl.adi} label={isl.adi} value={isl.adi} color={RENKLER.lacivert} />
                  ))}
                </Picker>
              </View>
            )}
            
            {aktifIsletme && (
              <View style={styles.isletmeDetay}>
                <Text style={styles.subTitle}>Usta Öğretici(ler)</Text>
                <View style={styles.detailBox}>
                  <View style={styles.detailRow}>
                    <Icon name="account-hard-hat" size={24} color={RENKLER.gri} />
                    <View style={styles.detailText}>
                      <Text style={styles.detailLabel}>{aktifIsletme.adi}</Text>
                      <Text style={styles.detailMain}>{aktifIsletme.usta_ogretici || 'Bilinmiyor'}</Text>
                    </View>
                    <Icon name="camera" size={24} color={RENKLER.turuncu} />
                  </View>
                </View>

                <View style={styles.detailBox}>
                  <View style={styles.detailRow}>
                    <Icon name="phone" size={24} color={RENKLER.lacivert} />
                    <View style={styles.detailText}>
                      <Text style={styles.detailLabel}>Telefon</Text>
                      <Text style={styles.detailMain}>{aktifIsletme.telefon || 'Belirtilmemiş'}</Text>
                    </View>
                  </View>
                </View>

                <View style={styles.detailBox}>
                  <View style={styles.detailRow}>
                    <Icon name="map-marker" size={24} color={RENKLER.lacivert} />
                    <View style={styles.detailText}>
                      <Text style={styles.detailLabel}>Adres</Text>
                      <Text style={styles.detailMain}>{aktifIsletme.adres || 'Belirtilmemiş'}</Text>
                    </View>
                  </View>
                </View>
              </View>
            )}
          </View>

          {/* Öğrenciler Listesi */}
          {aktifIsletme && (
            <View style={styles.ogrencilerContainer}>
              <Text style={styles.subTitle}>Öğrenciler</Text>
              {ogrenciler.map(ogr => (
                <TouchableOpacity 
                  key={ogr.id} 
                  style={styles.ogrenciCard}
                  onPress={() => navigation.navigate('OgrenciDetay', { ogrenci: ogr })}
                >
                  <View style={styles.ogrenciRow}>
                    <Icon name="account" size={30} color={RENKLER.gri} style={styles.ogrenciIcon} />
                    <View style={styles.ogrenciTextContainer}>
                      <Text style={styles.ogrenciAd}>{ogr.ad_soyad}</Text>
                      <Text style={styles.ogrenciDetay}>{ogr.sube} - {ogr.alan}</Text>
                    </View>
                    <Icon name="camera" size={24} color={RENKLER.turuncu} />
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </>
      ) : (
        /* Arama Sonuçları Görünümü */
        <View style={styles.ogrencilerContainer}>
          <Text style={styles.subTitle}>Arama Sonuçları ({aramaSonuclari.length})</Text>
          {aramaSonuclari.length > 0 ? (
            aramaSonuclari.map(ogr => (
              <TouchableOpacity 
                key={ogr.id} 
                style={styles.ogrenciCard}
                onPress={() => {
                  setAramaMetni(''); // Aramayı temizle
                  navigation.navigate('OgrenciDetay', { ogrenci: ogr });
                }}
              >
                <View style={styles.ogrenciRow}>
                  <Icon name="account" size={30} color={RENKLER.gri} style={styles.ogrenciIcon} />
                  <View style={styles.ogrenciTextContainer}>
                    <Text style={styles.ogrenciAd}>{ogr.ad_soyad}</Text>
                    <Text style={styles.ogrenciDetay}>{ogr.isletme_adi} | {ogr.sube}</Text>
                  </View>
                  <Icon name="chevron-right" size={24} color={RENKLER.turuncu} />
                </View>
              </TouchableOpacity>
            ))
          ) : (
            <Text style={{color: RENKLER.metinGri, padding: 20, textAlign: 'center'}}>Sonuç bulunamadı.</Text>
          )}
        </View>
      )}


      {/* Global Arama Modal */}
      <Modal visible={searchModalVisible} animationType="fade" transparent={true} onRequestClose={() => setSearchModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            
            <View style={styles.searchBox}>
              <Icon name="magnify" size={24} color="#666" style={{marginLeft: 10}}/>
              <TextInput 
                style={styles.modalInput}
                placeholder={globalAramaTipi === 'ogrenci' ? "Öğrenci adı veya okul numarası" : (globalAramaTipi === 'isyeri' ? "İşyeri adı..." : "İşyeri Öğrencileri")}
                value={globalAramaMetni}
                onChangeText={setGlobalAramaMetni}
                autoFocus={true}
              />
              {globalAramaMetni.length > 0 && (
                <TouchableOpacity onPress={() => setGlobalAramaMetni('')} style={{padding: 10}}>
                  <Icon name="close-circle" size={20} color="#999" />
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.tabContainer}>
              <TouchableOpacity 
                style={[styles.tabButton, (globalAramaTipi === 'ogrenci' || globalAramaTipi === 'isyeri_ogrencileri') && styles.tabButtonActive]} 
                onPress={() => { setGlobalAramaTipi('ogrenci'); setGlobalAramaMetni(''); }}
              >
                <Text style={[styles.tabText, (globalAramaTipi === 'ogrenci' || globalAramaTipi === 'isyeri_ogrencileri') && styles.tabTextActive]}>Öğrenci</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.tabButton, globalAramaTipi === 'isyeri' && styles.tabButtonActive]} 
                onPress={() => { setGlobalAramaTipi('isyeri'); setGlobalAramaMetni(''); }}
              >
                <Text style={[styles.tabText, globalAramaTipi === 'isyeri' && styles.tabTextActive]}>İşyeri</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.sonucContainer}>
              {aramaYukleniyor ? (
                <ActivityIndicator size="large" color={RENKLER.turuncu} style={{marginTop: 20}} />
              ) : globalAramaSonuclari.length === 0 ? (
                <Text style={styles.aramaBilgiMetni}>Arama yapmak için bir metin girin</Text>
              ) : (
                <FlatList
                  data={globalAramaSonuclari}
                  keyExtractor={(item, index) => item.id ? item.id.toString() : index.toString()}
                  renderItem={({item}) => {
                    if (globalAramaTipi === 'isyeri') {
                      return (
                        <TouchableOpacity style={styles.sonucItem} onPress={() => { setGlobalAramaTipi('isyeri_ogrencileri'); setGlobalAramaMetni(item.isletme_adi || ''); }}>
                          <Icon name="domain" size={24} color={RENKLER.lacivert} style={{marginRight: 10}} />
                          <View style={styles.sonucTextContainer}>
                            <Text style={styles.sonucBaslik}>{item.isletme_adi}</Text>
                            {item.usta_ogretici_adi ? <Text style={styles.sonucDetay}>Usta Öğretici: {item.usta_ogretici_adi}</Text> : null}
                          </View>
                          <Icon name="chevron-right" size={20} color="#ccc" />
                        </TouchableOpacity>
                      )
                    } else {
                      return (
                        <TouchableOpacity style={styles.sonucItem} onPress={() => { setSearchModalVisible(false); navigation.navigate('OgrenciDetay', { ogrenci: item }); }}>
                          <View style={styles.ogrenciAvatarModal}>
                            <Text style={styles.ogrenciAvatarText}>{item.ad_soyad ? item.ad_soyad.charAt(0) : '?'}</Text>
                          </View>
                          <View style={styles.sonucTextContainer}>
                            <Text style={styles.sonucBaslik}>{item.ad_soyad || 'Bilinmiyor'} {item.ogrenci_no ? `(${item.ogrenci_no})` : ''}</Text>
                            <Text style={styles.sonucDetay}>{item.isletme_adi || 'İşyeri Yok'} {item.ogretmen_adi ? `- ${item.ogretmen_adi}` : ''}</Text>
                          </View>
                        </TouchableOpacity>
                      )
                    }
                  }}
                />
              )}
            </View>

          </View>
        </View>
      </Modal>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: RENKLER.arkaplan, // Dark mode'da lacivert, şu an açık tema kullanılıyorsa ona göre
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCard: {
    backgroundColor: RENKLER.kart,
    margin: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    ...GOLGE,
  },
  profileContainer: {
    alignItems: 'center',
    marginBottom: SPACING.lg,
    position: 'relative',
  },
  profileAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: RENKLER.lacivertAcik,
    marginBottom: SPACING.sm,
  },
  welcomeText: {
    fontSize: YAZI.md,
    color: RENKLER.metinBeyaz,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  logoutButton: {
    position: 'absolute',
    right: 0,
    top: 0,
    padding: 10,
  },
  adminBackButton: {
    position: 'absolute',
    left: 0,
    top: 0,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.sm,
  },
  infoIconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e3f2fd',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  infoTextContainer: {
    flex: 1,
  },
  infoTitle: {
    fontSize: YAZI.xs,
    color: RENKLER.gri600,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: YAZI.sm,
    fontWeight: YAZI.kalin,
    color: RENKLER.lacivert,
  },
  sectionTitle: {
    fontSize: YAZI.md,
    fontWeight: YAZI.kalin,
    color: RENKLER.metinBeyaz,
    textAlign: 'center',
    marginVertical: SPACING.sm,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.md,
  },
  statCard: {
    flex: 1,
    backgroundColor: RENKLER.kart,
    marginHorizontal: 5,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    alignItems: 'center',
    ...GOLGE,
  },
  statTitle: {
    fontSize: YAZI.sm,
    color: RENKLER.metinGri,
    marginTop: 5,
  },
  statValue: {
    fontSize: YAZI.xl,
    fontWeight: 'bold',
    color: RENKLER.metinBeyaz,
    marginTop: 5,
  },
  isletmeCard: {
    backgroundColor: RENKLER.kart,
    margin: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    ...GOLGE,
  },
  isletmeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  isletmeListesiTitle: {
    fontSize: YAZI.sm,
    color: RENKLER.metinGri,
    marginLeft: 8,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: BORDER_RADIUS.sm,
    marginBottom: SPACING.md,
  },
  webSelect: {
    width: '100%',
    padding: 10,
    borderRadius: 8,
    borderColor: '#e0e0e0',
    marginBottom: 15,
    fontSize: 16,
    color: RENKLER.lacivert,
    fontWeight: 'bold',
  },
  isletmeDetay: {
    marginTop: SPACING.sm,
  },
  subTitle: {
    fontSize: YAZI.sm,
    color: RENKLER.metinBeyaz,
    marginBottom: SPACING.sm,
  },
  detailBox: {
    backgroundColor: RENKLER.lacivertAcik,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailText: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  detailLabel: {
    fontSize: YAZI.xs,
    color: RENKLER.metinGri,
  },
  detailMain: {
    fontSize: YAZI.sm,
    fontWeight: YAZI.kalin,
    color: RENKLER.metinBeyaz,
  },
  ogrencilerContainer: {
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.xl,
  },
  ogrenciCard: {
    backgroundColor: RENKLER.kart,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    ...GOLGE,
  },
  ogrenciRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ogrenciIcon: {
    backgroundColor: RENKLER.lacivertAcik,
    borderRadius: 20,
    padding: 5,
  },
  ogrenciTextContainer: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  ogrenciAd: {
    fontSize: YAZI.md,
    color: RENKLER.metinBeyaz,
    fontWeight: 'bold',
  },
  ogrenciDetay: {
    fontSize: YAZI.xs,
    color: RENKLER.metinGri,
    marginTop: 2,
  },
  aramaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: BORDER_RADIUS.md,
    marginTop: SPACING.md,
    paddingHorizontal: SPACING.sm,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  aramaIkon: {
    marginRight: SPACING.xs,
  },
  aramaInput: {
    flex: 1,
    color: '#333333',
    paddingVertical: SPACING.sm,
    fontSize: YAZI.md,
    outlineStyle: 'none'
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  modalContent: {
    backgroundColor: '#fff',
    width: '100%',
    borderRadius: 15,
    overflow: 'hidden',
    maxHeight: '80%'
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingVertical: 5
  },
  modalInput: {
    flex: 1,
    padding: 15,
    fontSize: 16,
    color: '#333',
    outlineStyle: 'none'
  },
  tabContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#eee'
  },
  tabButton: {
    flex: 1,
    padding: 15,
    alignItems: 'center',
    backgroundColor: '#fafafa'
  },
  tabButtonActive: {
    backgroundColor: '#fff',
    borderBottomWidth: 2,
    borderBottomColor: '#8a2be2' // Mor renk (görseldeki gibi)
  },
  tabText: {
    fontSize: 14,
    color: '#666'
  },
  tabTextActive: {
    color: '#8a2be2', // Mor renk
    fontWeight: 'bold'
  },
  sonucContainer: {
    minHeight: 150,
    maxHeight: 400
  },
  aramaBilgiMetni: {
    textAlign: 'center',
    marginTop: 30,
    color: '#666',
    fontSize: 14
  },
  sonucItem: {
    flexDirection: 'row',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
    alignItems: 'center'
  },
  ogrenciAvatarModal: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e6e6fa',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10
  },
  ogrenciAvatarText: {
    color: '#8a2be2',
    fontWeight: 'bold',
    fontSize: 16
  },
  sonucTextContainer: {
    flex: 1
  },
  sonucBaslik: {
    fontSize: 15,
    fontWeight: '500',
    color: '#333'
  },
  sonucDetay: {
    fontSize: 12,
    color: '#777',
    marginTop: 2
  }
});
