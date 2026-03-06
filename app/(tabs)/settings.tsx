import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getSetting, clearAllData } from '../../src/database/database';
import { COLORS } from '../../src/utils/theme';
import { exportCSV } from '../../src/utils/csvExport';
import {
  isGoogleConnected, signInWithGoogle, signOutGoogle,
  performSync, getGoogleUserEmail, isNativeBuild,
} from '../../src/utils/googleDrive';
import { Card, Button } from '../../src/components/UIComponents';
import { ImportModal } from '../../src/components/ImportModal';

export default function SettingsScreen() {
  const router = useRouter();
  const [childName, setChildName] = useState('');
  const [childSex, setChildSex] = useState<'boy' | 'girl' | null>(null);
  const [googleConnected, setGoogleConnected] = useState(false);
  const [googleEmail, setGoogleEmail] = useState<string | null>(null);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [signingIn, setSigningIn] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [showImport, setShowImport] = useState(false);

  const load = async () => {
    const connected = await isGoogleConnected();
    setGoogleConnected(connected);
    if (connected) {
      setGoogleEmail(await getGoogleUserEmail());
      setLastSync(await getSetting('google_last_sync'));
    }
    const name = await getSetting('child_name');
    const sex = await getSetting('child_sex');
    if (name) setChildName(name);
    if (sex) setChildSex(sex as 'boy' | 'girl');
  };

  useFocusEffect(useCallback(() => { load(); }, []));

  const handleExport = async () => {
    setExporting(true);
    const result = await exportCSV();
    setExporting(false);
    if (!result.success) Alert.alert('Erro', result.error || 'Nao foi possivel exportar.');
  };

  const handleSync = async () => {
    setSyncing(true);
    const result = await performSync();
    setSyncing(false);
    if (result.success) {
      setLastSync(result.lastSync || null);
      Alert.alert('Sincronizado!', 'Backup salvo no Google Drive.');
    } else if (result.error !== 'cancelled') {
      Alert.alert('Erro', result.error || 'Falha ao sincronizar.');
      if (result.error?.includes('expirada')) {
        setGoogleConnected(false);
        setGoogleEmail(null);
      }
    }
  };

  const handleSignIn = async () => {
    setSigningIn(true);
    const result = await signInWithGoogle();
    setSigningIn(false);
    if (result.success) {
      await load();
      performSync().catch(console.error);
    } else if (result.error && result.error !== 'cancelled' && result.error !== 'in_progress') {
      Alert.alert('Erro ao conectar', result.error);
    }
  };

  const handleSignOut = () => {
    Alert.alert(
      'Desconectar Google Drive',
      'Tem certeza? Os dados locais nao serao removidos.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Desconectar', style: 'destructive',
          onPress: async () => {
            await signOutGoogle();
            setGoogleConnected(false);
            setGoogleEmail(null);
            setLastSync(null);
          },
        },
      ]
    );
  };

  const handleClearData = () => {
    Alert.alert(
      'Apagar todos os dados',
      'Isso vai remover TODAS as palavras, variantes e categorias permanentemente. Esta acao nao pode ser desfeita.\n\nTem certeza?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Apagar tudo', style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Confirmar exclusao',
              'Ultima chance - apagar tudo mesmo?',
              [
                { text: 'Nao, cancelar', style: 'cancel' },
                {
                  text: 'Sim, apagar tudo', style: 'destructive',
                  onPress: async () => {
                    await clearAllData();
                    router.replace('/onboarding');
                  },
                },
              ]
            );
          },
        },
      ]
    );
  };

  const formatDate = (iso: string) => {
    try { return new Date(iso).toLocaleString('pt-BR'); }
    catch { return iso; }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }} edges={['top']}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={styles.pageTitle}>Configuracoes</Text>

        <Card style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              {childSex === 'girl' ? '👧' : childSex === 'boy' ? '👦' : '👶'} Perfil do Bebe
            </Text>
            <TouchableOpacity onPress={() => router.push('/onboarding')} style={styles.editProfileBtn}>
              <Text style={styles.editProfileText}>Editar</Text>
            </TouchableOpacity>
          </View>
          {childName ? (
            <Text style={styles.sectionDesc}>
              {childName} · {childSex === 'girl' ? 'Menina' : childSex === 'boy' ? 'Menino' : ''}
            </Text>
          ) : (
            <Text style={styles.sectionDesc}>Nenhum perfil configurado.</Text>
          )}
        </Card>

        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Importar Palavras</Text>
          <Text style={styles.sectionDesc}>
            Importe palavras via texto ou arquivo CSV. Categorias e variantes sao opcionais.
          </Text>
          <Button title="Importar Palavras" onPress={() => setShowImport(true)} style={styles.actionButton} />
        </Card>

        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Exportar Dados</Text>
          <Text style={styles.sectionDesc}>
            Baixe um arquivo CSV com todas as palavras, categorias, datas e variantes.
          </Text>
          <Button
            title={exporting ? 'Exportando...' : 'Exportar CSV'}
            onPress={handleExport}
            loading={exporting}
            style={styles.actionButton}
          />
        </Card>

        <Card style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Google Drive</Text>
            <View style={[styles.statusDot, { backgroundColor: googleConnected ? COLORS.success : COLORS.textLight }]} />
          </View>

          {googleConnected ? (
            <>
              <View style={styles.connectedRow}>
                <View style={styles.connectedIcon}>
                  <Text style={styles.connectedIconText}>✓</Text>
                </View>
                <View style={styles.connectedInfo}>
                  <Text style={styles.connectedLabel}>Backup automatico ativo</Text>
                  {googleEmail ? <Text style={styles.connectedEmail}>{googleEmail}</Text> : null}
                </View>
              </View>
              {lastSync ? (
                <Text style={styles.lastSync}>Ultima sincronizacao: {formatDate(lastSync)}</Text>
              ) : null}
              <View style={styles.buttonRow}>
                <Button
                  title={syncing ? 'Sincronizando...' : 'Sincronizar'}
                  onPress={handleSync}
                  loading={syncing}
                  style={styles.flexBtn}
                />
                <Button
                  title="Desconectar"
                  onPress={handleSignOut}
                  variant="outline"
                  style={styles.flexBtn}
                />
              </View>
            </>
          ) : (
            <>
              <Text style={styles.sectionDesc}>
                Faca backup automatico das palavras no seu Google Drive. Sincroniza a cada nova palavra adicionada.
              </Text>
              <Button
                title={signingIn ? 'Conectando...' : 'Conectar com Google'}
                onPress={handleSignIn}
                loading={signingIn}
                style={styles.actionButton}
              />
            </>
          )}
        </Card>

        <Card style={[styles.section, styles.dangerCard]}>
          <Text style={styles.sectionTitle}>Zona de Perigo</Text>
          <Text style={styles.sectionDesc}>
            Apaga todas as palavras, variantes e categorias. As categorias padrao serao recriadas. Esta acao e irreversivel.
          </Text>
          <TouchableOpacity style={styles.dangerBtn} onPress={handleClearData}>
            <Text style={styles.dangerBtnText}>Apagar todos os dados</Text>
          </TouchableOpacity>
        </Card>

        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Sobre</Text>
          <Text style={styles.aboutText}>
            Palavrinhas v1.0.0{'\n'}
            Diario de desenvolvimento de linguagem infantil.{'\n\n'}
            Registre cada nova palavra que seu filho aprende, acompanhe o progresso e guarde memorias preciosas.
          </Text>
        </Card>

        <View style={{ height: 40 }} />

        <ImportModal
          visible={showImport}
          onClose={() => setShowImport(false)}
          onImported={load}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 20 },
  pageTitle: { fontSize: 26, fontWeight: '900', color: COLORS.text, marginBottom: 20 },
  section: { marginBottom: 16 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  sectionTitle: { fontSize: 17, fontWeight: '800', color: COLORS.text },
  sectionDesc: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 18, marginBottom: 14 },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  lastSync: { fontSize: 12, color: COLORS.textSecondary, marginBottom: 12 },
  actionButton: { marginTop: 4 },
  buttonRow: { flexDirection: 'row', gap: 10 },
  flexBtn: { flex: 1 },
  connectedRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 12 },
  connectedIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.success + '20', alignItems: 'center', justifyContent: 'center' },
  connectedIconText: { fontSize: 18, color: COLORS.success, fontWeight: '800' },
  connectedInfo: { flex: 1 },
  connectedLabel: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  connectedEmail: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  googleBtn: { width: '100%', height: 48, marginTop: 4 },
  aboutText: { fontSize: 14, color: COLORS.textSecondary, lineHeight: 22 },
  dangerCard: { borderWidth: 1.5, borderColor: COLORS.error + '40' },
  dangerBtn: { backgroundColor: COLORS.error + '15', borderWidth: 1.5, borderColor: COLORS.error, borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  dangerBtnText: { color: COLORS.error, fontWeight: '700', fontSize: 15 },
  editProfileBtn: { backgroundColor: COLORS.primary + '15', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  editProfileText: { fontSize: 13, fontWeight: '700', color: COLORS.primary },
});