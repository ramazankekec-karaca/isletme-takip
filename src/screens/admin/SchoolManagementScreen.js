import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, TextInput } from 'react-native';
import { RENKLER } from '../../theme';
import { adminAPI } from '../../api/client';

export default function SchoolManagementScreen() {
  const [okullar, setOkullar] = useState([]);
  const [aramaMetni, setAramaMetni] = useState('');
  const [yeniOkul, setYeniOkul] = useState('');
  const [duzenlenenOkulId, setDuzenlenenOkulId] = useState(null);
  const [duzenlenenOkulAdi, setDuzenlenenOkulAdi] = useState('');
  const [yukleniyor, setYukleniyor] = useState(true);

  useEffect(() => {
    fetchOkullar();
  }, []);

  const fetchOkullar = async () => {
    try {
      const res = await adminAPI.okullar();
      const sorted = res.data.sort((a, b) => (a.okul_adi || '').localeCompare(b.okul_adi || '', 'tr'));
      setOkullar(sorted);
    } catch (error) {
      alert('Okullar yüklenemedi.');
    } finally {
      setYukleniyor(false);
    }
  };

  const ekleOkul = async () => {
    if (!yeniOkul) return;
    try {
      await adminAPI.okulEkle({ okul_adi: yeniOkul });
      setYeniOkul('');
      fetchOkullar();
    } catch (error) {
      alert('Eklerken hata oluştu.');
    }
  };

  const guncelleOkul = async () => {
    if (!duzenlenenOkulAdi) return;
    try {
      await adminAPI.okulGuncelle(duzenlenenOkulId, { okul_adi: duzenlenenOkulAdi });
      setDuzenlenenOkulId(null);
      setDuzenlenenOkulAdi('');
      fetchOkullar();
    } catch (error) {
      alert('Güncellenirken hata oluştu.');
    }
  };

  const silOkul = async (id) => {
    try {
      await adminAPI.okulSil(id);
      fetchOkullar();
    } catch (error) {
      alert('Silerken hata oluştu.');
    }
  };

  if (yukleniyor) return <ActivityIndicator size="large" color={RENKLER.turuncu} style={{ marginTop: 50 }} />;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Okul Yönetimi</Text>
      
      <View style={{ marginBottom: 15 }}>
        <TextInput
          style={styles.input}
          placeholder="Okul ara..."
          value={aramaMetni}
          onChangeText={setAramaMetni}
        />
      </View>
      
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Yeni Okul Adı..."
          value={yeniOkul}
          onChangeText={setYeniOkul}
        />
        <TouchableOpacity style={styles.ekleButton} onPress={ekleOkul}>
          <Text style={styles.ekleButtonText}>Ekle</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={okullar.filter(o => o.okul_adi && o.okul_adi.toLocaleLowerCase('tr').includes(aramaMetni.toLocaleLowerCase('tr')))}
        keyExtractor={item => item.id.toString()}
        renderItem={({ item }) => (
          <View style={styles.okulCard}>
            {duzenlenenOkulId === item.id ? (
              <View style={styles.editContainer}>
                <TextInput
                  style={[styles.input, { flex: 1, marginRight: 10 }]}
                  value={duzenlenenOkulAdi}
                  onChangeText={setDuzenlenenOkulAdi}
                />
                <TouchableOpacity style={styles.kaydetButton} onPress={guncelleOkul}>
                  <Text style={styles.buttonText}>Kaydet</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.iptalButton} onPress={() => setDuzenlenenOkulId(null)}>
                  <Text style={styles.buttonText}>İptal</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <Text style={styles.okulAd}>{item.okul_adi}</Text>
                <View style={styles.actionContainer}>
                  <TouchableOpacity 
                    style={styles.duzenleButton} 
                    onPress={() => {
                      setDuzenlenenOkulId(item.id);
                      setDuzenlenenOkulAdi(item.okul_adi);
                    }}
                  >
                    <Text style={styles.buttonText}>Düzenle</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.silButton} onPress={() => silOkul(item.id)}>
                    <Text style={styles.buttonText}>Sil</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: RENKLER.arkaplan,
    padding: 15,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: RENKLER.metin,
    marginBottom: 15,
  },
  inputContainer: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  input: {
    flex: 1,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 10,
    borderRadius: 8,
  },
  ekleButton: {
    backgroundColor: RENKLER.turuncu,
    justifyContent: 'center',
    paddingHorizontal: 20,
    borderRadius: 8,
    marginLeft: 10,
  },
  ekleButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  okulCard: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  okulAd: {
    fontSize: 16,
    flex: 1,
  },
  actionContainer: {
    flexDirection: 'row',
  },
  editContainer: {
    flexDirection: 'row',
    flex: 1,
    alignItems: 'center',
  },
  duzenleButton: {
    backgroundColor: '#3498db',
    padding: 8,
    borderRadius: 5,
    marginRight: 10,
  },
  silButton: {
    backgroundColor: RENKLER.hata,
    padding: 8,
    borderRadius: 5,
  },
  kaydetButton: {
    backgroundColor: RENKLER.basari,
    padding: 8,
    borderRadius: 5,
    marginRight: 5,
  },
  iptalButton: {
    backgroundColor: '#95a5a6',
    padding: 8,
    borderRadius: 5,
  },
  buttonText: {
    color: '#fff',
    fontSize: 12,
  }
});
