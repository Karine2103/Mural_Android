import React, { useEffect, useState, useCallback } from "react";
import {
  SafeAreaView,
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Platform,
  StatusBar,
} from "react-native";
import axios from "axios";
import { Ionicons } from "@expo/vector-icons";

const API_URL = "https://api-mural.onrender.com/recados"; 

export default function App() {
  const [recados, setRecados] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [autor, setAutor] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [ordem, setOrdem] = useState("recentes");
  const [refreshing, setRefreshing] = useState(false);

  const buscarRecados = useCallback(async () => {
    try {
      setLoading(true);
      const res = await axios.get(API_URL);
      let data = res.data;
      if (!Array.isArray(data)) data = [];
      data = ordenarRecados(data, ordem);
      setRecados(data);
    } catch (err) {
      console.error("Erro ao buscar recados:", err.message || err);
      Alert.alert("Erro", "Não foi possível carregar os recados. Verifique a API/Conexão.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [ordem]);

  useEffect(() => {
    buscarRecados();
  }, [buscarRecados]);

  function ordenarRecados(lista, tipo) {
    const copia = Array.isArray(lista) ? [...lista] : [];
    switch (tipo) {
      case "recentes":
        return copia.sort((a, b) => new Date(b.data_criacao) - new Date(a.data_criacao));
      case "antigos":
        return copia.sort((a, b) => new Date(a.data_criacao) - new Date(b.data_criacao));
      case "alfabetica":
        return copia.sort((a, b) => (a.autor || "").localeCompare(b.autor || ""));
      default:
        return copia;
    }
  }

  function mudarOrdem(novaOrdem) {
    setOrdem(novaOrdem);
    setRecados(prev => ordenarRecados(prev, novaOrdem));
  }

  async function publicarRecado() {
    const a = autor.trim();
    const m = mensagem.trim();

    if (!a || !m) {
      Alert.alert("Atenção", "Preencha o nome e a mensagem antes de publicar.");
      return;
    }

    try {
      setLoading(true);

      const body = { autor: a, mensagem: m };

      const res = await axios.post(API_URL, body, {
        headers: { "Content-Type": "application/json" },
      });

      if (res.status >= 200 && res.status < 300) {
        Alert.alert("Sucesso", "Recado publicado!");
        setAutor("");
        setMensagem("");
        setModalVisible(false);
        await buscarRecados();
      } else {
        throw new Error(`Resposta inesperada: ${res.status}`);
      }
    } catch (err) {
      console.error("Erro no POST:", err.message || err);
      Alert.alert("Erro", "Não foi possível publicar o recado. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  const deletarRecado = async (id) => {
    try {
      setLoading(true);
      const res = await axios.delete(`${API_URL}/${id}`);
      
      if (res.status >= 200 && res.status < 300) {
        Alert.alert("Sucesso", "Recado excluído!");
        setRecados(prev => prev.filter(recado => recado.id !== id));
      }
    } catch (err) {
      console.error("Erro ao excluir recado:", err.message || err);
      Alert.alert("Erro", "Não foi possível excluir o recado.");
    } finally {
      setLoading(false);
    }
  };

  const confirmarExclusao = (id) => {
    Alert.alert(
      "Excluir Recado",
      "Tem certeza que deseja excluir este recado?",
      [
        { text: "Cancelar", style: "cancel" },
        { text: "Excluir", onPress: () => deletarRecado(id), style: "destructive" }
      ]
    );
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    buscarRecados();
  }, [buscarRecados]);

  const renderRecado = ({ item, index }) => {
    const cores = [
      ["#FF9EC5", "#FFC5D9"], // Rosa
      ["#9EC5FF", "#C5D9FF"], // Azul
      ["#9EFFC5", "#D9FFEC"], // Verde
      ["#C59EFF", "#E6D9FF"], // Roxo
      ["#FFFF9E", "#FFFFD9"], // Amarelo
      ["#FFD6A5", "#FFEED9"], // Laranja
      ["#FFADAD", "#FFD3A5"], // Coral
      ["#D4F1F9", "#A9E4F9"], // Azul claro
    ];
    const pal = cores[index % cores.length];

    return (
      <TouchableOpacity 
        onLongPress={() => confirmarExclusao(item.id)}
        activeOpacity={0.9}
      >
        <View style={[styles.recado, { 
          backgroundColor: pal[0], 
          borderColor: pal[1],
          borderWidth: 3,
          borderStyle: 'dashed'
        }]}>
          <View style={styles.recadoHeader}>
            <Text style={[styles.recadoAutor, { textShadowColor: 'rgba(0,0,0,0.2)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 1 }]}>
              {item.autor || "Anônimo"}
            </Text>
            <Text style={styles.recadoData}>
              {item.data_criacao ? new Date(item.data_criacao).toLocaleString("pt-BR") : ""}
            </Text>
          </View>
          <Text style={[styles.recadoMensagem, { textShadowColor: 'rgba(0,0,0,0.1)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 1 }]}>
            {item.mensagem}
          </Text>
          <View style={styles.cornerDecoration} />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.titleContainer}>
            <Text style={styles.title}>Mural</Text>
            <View style={styles.titleUnderline} />
          </View>
          
          <View style={styles.ordenacao}>
            <TouchableOpacity 
              onPress={() => mudarOrdem("recentes")} 
              style={[styles.ordBtn, ordem === "recentes" && styles.ordBtnActive]}
            >
              <Ionicons name="time" size={18} color="#fff" />
              <Text style={styles.ordText}>Recentes</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              onPress={() => mudarOrdem("antigos")} 
              style={[styles.ordBtn, ordem === "antigos" && styles.ordBtnActive]}
            >
              <Ionicons name="calendar" size={18} color="#fff" />
              <Text style={styles.ordText}>Antigos</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              onPress={() => mudarOrdem("alfabetica")} 
              style={[styles.ordBtn, ordem === "alfabetica" && styles.ordBtnActive]}
            >
              <Ionicons name="text" size={18} color="#fff" />
              <Text style={styles.ordText}>A → Z</Text>
            </TouchableOpacity>
          </View>
        </View>

        {loading && !refreshing ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#9EC5FF" />
            <Text style={styles.loadingText}>Carregando recados...</Text>
          </View>
        ) : (
          <FlatList
            data={recados}
            keyExtractor={(item, idx) => (item.id ? String(item.id) : String(idx))}
            renderItem={renderRecado}
            contentContainerStyle={styles.list}
            refreshControl={
              <RefreshControl 
                refreshing={refreshing} 
                onRefresh={onRefresh}
                colors={['#FF9EC5', '#9EC5FF', '#9EFFC5']}
                tintColor="#9EC5FF"
              />
            }
            ListEmptyComponent={() => (
              <View style={styles.empty}>
                <Ionicons name="sad" size={48} color="#9EC5FF" />
                <Text style={styles.emptyText}>Nenhum recado encontrado</Text>
                <Text style={styles.emptySub}>Toque no + para criar o primeiro recado</Text>
              </View>
            )}
          />
        )}

        <TouchableOpacity 
          style={styles.fab} 
          onPress={() => setModalVisible(true)}
        >
          <View style={styles.fabInner}>
            <Ionicons name="add" size={32} color="#fff" />
          </View>
          <View style={styles.fabGlow} />
        </TouchableOpacity>

        <Modal 
          visible={modalVisible} 
          animationType="fade" 
          transparent 
          onRequestClose={() => setModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalBox}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Nova Postagem</Text>
                <TouchableOpacity 
                  style={styles.modalClose} 
                  onPress={() => setModalVisible(false)}
                >
                  <Ionicons name="close" size={24} color="#fff" />
                </TouchableOpacity>
              </View>
              
              <TextInput
                style={styles.input}
                placeholder="Seu nome"
                placeholderTextColor="#aaa"
                value={autor}
                onChangeText={setAutor}
                returnKeyType="next"
              />
              
              <TextInput
                style={[styles.input, styles.textarea]}
                placeholder="Sua mensagem"
                placeholderTextColor="#aaa"
                value={mensagem}
                onChangeText={setMensagem}
                multiline
                textAlignVertical="top"
              />
              
              <View style={styles.modalActions}>
                <TouchableOpacity 
                  style={styles.btnCancel} 
                  onPress={() => setModalVisible(false)}
                >
                  <Text style={styles.btnTxt}>Cancelar</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.btnConfirm} 
                  onPress={publicarRecado}
                >
                  <Text style={styles.btnTxt}>Publicar Recado</Text>
                  <Ionicons name="paper-plane" size={16} color="#fff" style={{ marginLeft: 8 }} />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { 
    flex: 1, 
    backgroundColor: "#f0f9ff",
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0 
  },
  container: { 
    flex: 1,
    backgroundColor: 'linear-gradient(135deg, #e0f7fa, #f3e5f5)',
  },
  header: {
    padding: 16,
    backgroundColor: '#9EC5FF',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    marginBottom: 12,
    elevation: 8,
    shadowColor: '#9EC5FF',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
  },
  titleContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 36,
    fontWeight: '900',
    color: '#fff',
    textShadowColor: 'rgba(0,0,0,0.2)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 3,
    letterSpacing: 1,
  },
  titleUnderline: {
    height: 4,
    width: 120,
    backgroundColor: '#FF9EC5',
    borderRadius: 2,
    marginTop: 4,
  },
  ordenacao: {
    flexDirection: "row", 
    justifyContent: "center", 
    gap: 10,
    marginTop: 8,
  },
  ordBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  ordBtnActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    borderColor: '#fff',
  },
  ordText: {
    color: "#fff", 
    fontWeight: "700",
    marginLeft: 6,
    fontSize: 14,
  },
  list: { 
    padding: 16, 
    paddingBottom: 100 
  },
  recado: {
    padding: 20,
    borderRadius: 20,
    marginBottom: 16,
    minHeight: 120,
    justifyContent: "space-between",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    position: 'relative',
    overflow: 'hidden',
  },
  cornerDecoration: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderRightWidth: 40,
    borderTopWidth: 40,
    borderRightColor: 'transparent',
    borderTopColor: 'rgba(255,255,255,0.3)',
    transform: [{ rotate: '180deg' }],
  },
  recadoHeader: { 
    flexDirection: "row", 
    justifyContent: "space-between", 
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.5)',
    paddingBottom: 8,
  },
  recadoAutor: { 
    fontWeight: "800", 
    fontSize: 18, 
    color: "#2c3e50",
    maxWidth: '70%',
  },
  recadoData: { 
    fontSize: 12, 
    color: "#6b6b6b",
    fontWeight: '600',
  },
  recadoMensagem: { 
    fontSize: 16, 
    color: "#2f3f4f", 
    lineHeight: 22,
  },
  empty: { 
    marginTop: 60, 
    alignItems: "center",
    padding: 20,
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#9EC5FF',
    borderStyle: 'dashed',
  },
  emptyText: { 
    fontSize: 18, 
    color: "#9EC5FF", 
    marginTop: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  emptySub: { 
    fontSize: 14, 
    color: "#9EC5FF",
    marginTop: 8,
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#9EC5FF',
    fontWeight: '600',
  },
  fab: {
    position: "absolute",
    bottom: 28,
    right: 28,
    width: 66,
    height: 66,
    borderRadius: 33,
    alignItems: "center",
    justifyContent: "center",
    elevation: 10,
    shadowColor: "#FF9EC5",
    shadowOpacity: 0.4,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 15,
    zIndex: 10,
  },
  fabInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#FF9EC5",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
    borderWidth: 2,
    borderColor: '#fff',
  },
  fabGlow: {
    position: 'absolute',
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(255, 158, 197, 0.4)',
    zIndex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalBox: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: "rgba(158, 197, 255, 0.85)",
    borderRadius: 24,
    padding: 24,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.7)',
    elevation: 15,
    shadowColor: '#9EC5FF',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: { 
    fontSize: 26, 
    fontWeight: "800", 
    color: "#fff",
    textShadowColor: 'rgba(0,0,0,0.2)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  modalClose: {
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 20,
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  input: {
    backgroundColor: "rgba(255, 255, 255, 0.8)",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.9)',
    color: '#2c3e50',
  },
  textarea: { 
    height: 140,
    textAlignVertical: 'top',
  },
  modalActions: { 
    flexDirection: "row", 
    justifyContent: "space-between", 
    marginTop: 10,
  },
  btnConfirm: { 
    backgroundColor: "#FF9EC5", 
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    marginLeft: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  btnCancel: { 
    backgroundColor: "rgba(255, 255, 255, 0.5)", 
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 20,
    flex: 1,
    marginRight: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  btnTxt: { 
    color: "#fff", 
    fontWeight: "700",
    fontSize: 16,
  },
});