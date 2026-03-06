import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getSetting, clearAllData } from '../../src/database/database';
import { COLORS } from '../../src/utils/theme';
import { saveCSVToDevice, shareCSV } from '../../src/utils/csvExport';
import {
  isGoogleConnected, signInWithGoogle, signOutGoogle,
  performSync, getGoogleUserEmail, isNativeBuild,
} from '../../src/utils/googleDrive';
import { Card, Button } from '../../src/components/UIComponents';
import { SvgXml } from 'react-native-svg';
import { ImportModal } from '../../src/components/ImportModal';


const GOOGLE_DRIVE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 32 32">
  <path fill="#4285f4" d="M29.5,21l-3.1708,5.5489A3.07,3.07,0,0,1,23.6459,28H8.3541a3.07,3.07,0,0,1-2.6833-1.4511L4.3687,24.27,9.7578,21Z"/>
  <path fill="#00ac47" d="M12.3822,4.13a3.2262,3.2262,0,0,0-1.7067,1.4276L2.9591,18.76a3.07,3.07,0,0,0-.1012,3.0489l1.53,2.4658L9.7579,21,16,10.32Z"/>
  <path fill="#0066da" d="M9.7578,21H2.568a2.6543,2.6543,0,0,0,.29.8089L4.38,24.2632l-.0115.007L5.6709,26.549A2.8267,2.8267,0,0,0,7.008,27.6974L9.7578,21l-.0081.0049Z"/>
  <path fill="#ffba00" d="M19.6068,4.13a3.2256,3.2256,0,0,1,1.7066,1.4276L29.03,18.76a3.07,3.07,0,0,1,.1013,3.0489l-1.5295,2.4658L22.2311,21,15.9889,10.32Z"/>
  <path fill="#ea4435" d="M22.2311,21h7.19a2.6541,2.6541,0,0,1-.29.8089l-1.5224,2.4544.0116.007L26.3181,26.549a2.8272,2.8272,0,0,1-1.3371,1.1484L22.2312,21l.0081.0049Z"/>
  <path fill="#188038" d="M19.6155,4.1342l.0023-.004a2.7726,2.7726,0,0,0-.3609-.0983L16,4l-3.2569.0319a2.7726,2.7726,0,0,0-.3609.0983,3.0224,3.0224,0,0,0-.367.1666L15.9889,10.32,19.977,4.2993A3.03,3.03,0,0,0,19.6155,4.1342Z"/>
</svg>`;

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
  const [saving, setSaving] = useState(false);
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

  const handleShare = async () => {
    setExporting(true);
    const result = await shareCSV();
    setExporting(false);
    if (!result.success) Alert.alert('Erro', result.error || 'Não foi possível compartilhar.');
  };

  const handleSaveToDevice = async () => {
    setSaving(true);
    const result = await saveCSVToDevice();
    setSaving(false);
    if (result.success) {
      Alert.alert('✅ Salvo!', 'Arquivo CSV salvo na pasta escolhida.');
    } else if (result.error !== 'cancelled') {
      Alert.alert('Erro', result.error || 'Não foi possível salvar.');
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    const result = await performSync();
    setSyncing(false);
    if (result.success) {
      setLastSync(result.lastSync || null);
      Alert.alert('✅ Sincronizado!', 'Backup salvo no Google Drive.');
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
      'Tem certeza? Os dados locais não serão removidos.',
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
      '⚠️ Apagar todos os dados',
      'Isso vai remover TODAS as palavras, variantes e categorias permanentemente. Esta ação não pode ser desfeita.\n\nTem certeza?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Apagar tudo', style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Confirmar exclusão',
              'Última chance — apagar tudo mesmo?',
              [
                { text: 'Não, cancelar', style: 'cancel' },
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
        <Text style={styles.pageTitle}>⚙️ Configurações</Text>

        <Card style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              {childSex === 'girl' ? '👧' : childSex === 'boy' ? '👦' : '👶'} Perfil do Bebê
            </Text>
            <TouchableOpacity onPress={() => router.push('/onboarding')} style={styles.editProfileBtn}>
              <Text style={styles.editProfileText}>✏️ Editar</Text>
            </TouchableOpacity>
          </View>
          {childName ? (
            <Text style={styles.sectionDesc}>
              {childName} · {childSex === 'girl' ? 'Menina' : childSex === 'boy' ? 'Menino' : '—'}
            </Text>
          ) : (
            <Text style={styles.sectionDesc}>Nenhum perfil configurado.</Text>
          )}
        </Card>

        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>📥 Importar Palavras</Text>
          <Text style={styles.sectionDesc}>
            Importe palavras via texto ou arquivo CSV. Data, categorias e variantes são opcionais.
          </Text>
          <Button title="📥 Importar Palavras" onPress={() => setShowImport(true)} style={styles.actionButton} />
        </Card>

        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>📤 Exportar Dados</Text>
          <Text style={styles.sectionDesc}>
            Exporte um CSV com todas as palavras, categorias, datas e variantes.
          </Text>
          <View style={styles.buttonRow}>
            <Button
              title={saving ? 'Salvando...' : '💾 Salvar'}
              onPress={handleSaveToDevice}
              loading={saving}
              style={[styles.flexBtn, styles.exportBtn]}
              textStyle={{ fontSize: 12, fontWeight: '700' }}
            />
            <Button
              title={exporting ? 'Aguarde...' : '📤 Compartilhar'}
              onPress={handleShare}
              loading={exporting}
              variant="outline"
              style={[styles.flexBtn, styles.exportBtn]}
              textStyle={{ fontSize: 12, fontWeight: '700' }}
            />
          </View>
        </Card>

        <Card style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <SvgXml xml={GOOGLE_DRIVE_SVG} width={20} height={20} />
              <Text style={styles.sectionTitle}>Google Drive</Text>
            </View>
            <View style={[styles.statusDot, { backgroundColor: googleConnected ? COLORS.success : COLORS.textLight }]} />
          </View>

          {googleConnected ? (
            <>
              <View style={styles.connectedRow}>
                <View style={styles.connectedIcon}>
                  <Text style={styles.connectedIconText}>✓</Text>
                </View>
                <View style={styles.connectedInfo}>
                  <Text style={styles.connectedLabel}>Backup automático ativo</Text>
                  {googleEmail ? <Text style={styles.connectedEmail}>{googleEmail}</Text> : null}
                </View>
              </View>
              {lastSync ? (
                <Text style={styles.lastSync}>🕐 Última sincronização: {formatDate(lastSync)}</Text>
              ) : null}
              <View style={styles.buttonRow}>
                <Button
                  title={syncing ? 'Sincronizando...' : '🔄 Sincronizar'}
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
                Faça backup automático das palavras no seu Google Drive. Sincroniza a cada nova palavra adicionada.
              </Text>
              <Button
                title={signingIn ? 'Conectando...' : '🔗 Conectar com Google'}
                onPress={handleSignIn}
                loading={signingIn}
                style={styles.actionButton}
              />
            </>
          )}
        </Card>

        <Card style={[styles.section, styles.dangerCard]}>
          <Text style={styles.sectionTitle}>⚠️ Zona de Perigo</Text>
          <Text style={styles.sectionDesc}>
            Apaga todas as palavras, variantes e categorias. As categorias padrão serão recriadas. Esta ação é irreversível.
          </Text>
          <TouchableOpacity style={styles.dangerBtn} onPress={handleClearData}>
            <Text style={styles.dangerBtnText}>🗑️ Apagar todos os dados</Text>
          </TouchableOpacity>
        </Card>

        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>ℹ️ Sobre</Text>
          <Text style={styles.aboutText}>
            Palavrinhas v1.0.0{'\n'}
            Diário de desenvolvimento de linguagem infantil.{'\n\n'}
            Registre cada nova palavra que seu filho aprende, acompanhe o progresso e guarde memórias preciosas. 💕
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
  exportBtn: { paddingVertical: 10, paddingHorizontal: 8 },
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