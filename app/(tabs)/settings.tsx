import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  Alert, TextInput, Modal, FlatList,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  getSetting, setSetting, clearAllData,
} from '../../src/database/database';
import { COLORS } from '../../src/utils/theme';
import { exportCSV } from '../../src/utils/csvExport';
import {
  isGoogleConnected, performSync, clearGoogleAuth,
  getGoogleDriveConfig, saveGoogleDriveConfig
} from '../../src/utils/googleDrive';
import { Card, Button } from '../../src/components/UIComponents';
import { ImportModal } from '../../src/components/ImportModal';

export default function SettingsScreen() {
  const router = useRouter();
  const [childName, setChildName] = useState('');
  const [childSex, setChildSex] = useState<'boy' | 'girl' | null>(null);
  const [googleConnected, setGoogleConnected] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [googleTokenInput, setGoogleTokenInput] = useState('');
  const [showTokenModal, setShowTokenModal] = useState(false);

  const load = async () => {
    const connected = await isGoogleConnected();
    setGoogleConnected(connected);
    const config = await getGoogleDriveConfig();
    setLastSync(config.lastSync);
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
    if (!result.success) {
      Alert.alert('Erro', result.error || 'Não foi possível exportar.');
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    const result = await performSync();
    setSyncing(false);
    if (result.success) {
      setLastSync(result.lastSync || null);
      Alert.alert('✅ Sincronizado!', 'Dados enviados para o Google Drive.');
    } else {
      Alert.alert('Erro de Sincronização', result.error || 'Falha ao sincronizar.');
      if (result.error?.includes('expirada') || result.error?.includes('TOKEN_EXPIRED')) {
        setGoogleConnected(false);
      }
    }
  };

  const handleDisconnectGoogle = () => {
    Alert.alert(
      'Desconectar Google Drive',
      'Tem certeza? Os dados locais não serão removidos.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Desconectar', style: 'destructive',
          onPress: async () => { await clearGoogleAuth(); setGoogleConnected(false); },
        },
      ]
    );
  };

  const handleConnectGoogle = () => {
    setShowTokenModal(true);
  };

  const handleSaveToken = async () => {
    if (!googleTokenInput.trim()) return;
    await saveGoogleDriveConfig({ accessToken: googleTokenInput.trim() });
    setGoogleConnected(true);
    setShowTokenModal(false);
    setGoogleTokenInput('');
    Alert.alert('Conectado!', 'Agora você pode sincronizar com o Google Drive.');
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
    try {
      const d = new Date(iso);
      return d.toLocaleString('pt-BR');
    } catch { return iso; }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }} edges={['top']}>
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.pageTitle}>⚙️ Configurações</Text>

      {/* Child Profile */}
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

      {/* Import */}
      <Card style={styles.section}>
        <Text style={styles.sectionTitle}>📥 Importar Palavras</Text>
        <Text style={styles.sectionDesc}>
          Importe palavras via texto ou arquivo CSV. Categorias e variantes são opcionais.
        </Text>
        <Button
          title="📥 Importar Palavras"
          onPress={() => setShowImport(true)}
          style={styles.actionButton}
        />
      </Card>

      {/* Export CSV */}
      <Card style={styles.section}>
        <Text style={styles.sectionTitle}>📤 Exportar Dados</Text>
        <Text style={styles.sectionDesc}>
          Baixe um arquivo CSV com todas as palavras, categorias, datas e variantes.
        </Text>
        <Button
          title={exporting ? 'Exportando...' : '📥 Exportar CSV'}
          onPress={handleExport}
          loading={exporting}
          style={styles.actionButton}
        />
      </Card>

      {/* Google Drive Sync */}
      <Card style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>☁️ Google Drive</Text>
          <View style={[styles.statusDot, { backgroundColor: googleConnected ? COLORS.success : COLORS.textLight }]} />
        </View>
        <Text style={styles.sectionDesc}>
          {googleConnected
            ? 'Conectado! Os dados são sincronizados automaticamente a cada mudança.'
            : 'Sincronize seus dados com o Google Drive para não perder nada.'
          }
        </Text>

        {lastSync && (
          <Text style={styles.lastSync}>🕐 Última sincronização: {formatDate(lastSync)}</Text>
        )}

        {googleConnected ? (
          <View style={styles.buttonRow}>
            <Button
              title={syncing ? 'Sincronizando...' : '🔄 Sincronizar Agora'}
              onPress={handleSync}
              loading={syncing}
              style={styles.flexBtn}
            />
            <Button
              title="Desconectar"
              onPress={handleDisconnectGoogle}
              variant="outline"
              style={styles.flexBtn}
            />
          </View>
        ) : (
          <Button
            title="🔗 Conectar Google Drive"
            onPress={handleConnectGoogle}
            style={styles.actionButton}
          />
        )}

        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>💡 Como conectar:</Text>
          <Text style={styles.infoText}>
            1. Acesse console.cloud.google.com{'\n'}
            2. Crie um projeto e ative a Drive API{'\n'}
            3. Crie credenciais OAuth2{'\n'}
            4. Use o OAuth Playground para obter um Access Token{'\n'}
            5. Cole o token aqui{'\n\n'}
            O arquivo palavrinhas_backup.csv será salvo no seu Drive.
          </Text>
        </View>
      </Card>

      {/* Danger zone */}
      <Card style={[styles.section, styles.dangerCard]}>
        <Text style={styles.sectionTitle}>⚠️ Zona de Perigo</Text>
        <Text style={styles.sectionDesc}>
          Apaga todas as palavras, variantes e categorias. As categorias padrão serão recriadas. Esta ação é irreversível.
        </Text>
        <TouchableOpacity style={styles.dangerBtn} onPress={handleClearData}>
          <Text style={styles.dangerBtnText}>🗑️ Apagar todos os dados</Text>
        </TouchableOpacity>
      </Card>

      {/* About */}
      <Card style={styles.section}>
        <Text style={styles.sectionTitle}>ℹ️ Sobre</Text>
        <Text style={styles.aboutText}>
          Palavrinhas v1.0.0{'\n'}
          Diário de desenvolvimento de linguagem infantil.{'\n\n'}
          Registre cada nova palavra que seu filho aprende, acompanhe o progresso e guarde memórias preciosas. 💕
        </Text>
      </Card>

      {/* Google Token Modal */}
      <Modal visible={showTokenModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>🔑 Access Token Google</Text>
            <Text style={styles.sectionDesc}>
              Cole aqui o Access Token do Google OAuth2 para conectar ao Google Drive.
            </Text>
            <TextInput
              style={[styles.fieldInput, { height: 100, textAlignVertical: 'top' }]}
              value={googleTokenInput}
              onChangeText={setGoogleTokenInput}
              placeholder="ya29.A0..."
              placeholderTextColor={COLORS.textLight}
              multiline
              autoCorrect={false}
              autoCapitalize="none"
            />
            <View style={styles.modalActions}>
              <Button title="Cancelar" onPress={() => setShowTokenModal(false)} variant="outline" style={styles.flexBtn} />
              <Button title="Conectar" onPress={handleSaveToken} style={styles.flexBtn} />
            </View>
          </View>
        </View>
      </Modal>

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
  infoBox: {
    backgroundColor: COLORS.secondary + '15',
    borderRadius: 12, padding: 14, marginTop: 14,
  },
  infoTitle: { fontSize: 13, fontWeight: '700', color: COLORS.secondary, marginBottom: 6 },
  infoText: { fontSize: 12, color: COLORS.text, lineHeight: 20 },
  aboutText: { fontSize: 14, color: COLORS.textSecondary, lineHeight: 22 },
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: COLORS.background,
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: 24, maxHeight: '80%',
  },
  modalTitle: { fontSize: 20, fontWeight: '800', color: COLORS.text, marginBottom: 20, textAlign: 'center' },
  fieldLabel: { fontSize: 13, fontWeight: '700', color: COLORS.textSecondary, marginBottom: 8, textTransform: 'uppercase' },
  fieldInput: {
    backgroundColor: COLORS.white, borderRadius: 14,
    paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 16, color: COLORS.text,
    borderWidth: 1.5, borderColor: COLORS.border, marginBottom: 16,
  },
  dangerCard: { borderWidth: 1.5, borderColor: COLORS.error + '40' },
  dangerBtn: {
    backgroundColor: COLORS.error + '15',
    borderWidth: 1.5, borderColor: COLORS.error,
    borderRadius: 14, paddingVertical: 14, alignItems: 'center',
  },
  dangerBtnText: { color: COLORS.error, fontWeight: '700', fontSize: 15 },
  editProfileBtn: {
    backgroundColor: COLORS.primary + '15',
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12,
  },
  editProfileText: { fontSize: 13, fontWeight: '700', color: COLORS.primary },
});