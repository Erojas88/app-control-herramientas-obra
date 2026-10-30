import { useEffect, useMemo, useState } from 'react';
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { addToolRequest, getTools } from '../services/firebaseService';
import { uploadToolEvidence } from '../services/storageService';
import type { Tool, ToolRequest } from '../types';

const TOOL_CONDITIONS = ['Excellent', 'Good', 'Regular', 'Damaged'] as const;
type ToolCondition = (typeof TOOL_CONDITIONS)[number];

type ToolDraft = {
  condition: ToolCondition;
  photoUrls: string[];
};

const emptyForm = {
  fullName: '',
  company: '',
  projectName: '',
  purpose: '',
  workArea: '',
  dueDate: '',
  quantity: '1',
  training: 'yes',
};

export default function SolicitantePublicScreen() {
  const [toolCatalog, setToolCatalog] = useState<Tool[]>([]);
  const [selectedToolIds, setSelectedToolIds] = useState<string[]>([]);
  const [toolDrafts, setToolDrafts] = useState<Record<string, ToolDraft>>({});
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const loadTools = async () => {
      const tools = await getTools();
      setToolCatalog(tools);
    };

    loadTools();
  }, []);

  const availableTools = useMemo(
    () => toolCatalog.filter((tool) => tool.status === 'available'),
    [toolCatalog],
  );

  const toggleTool = (toolId: string) => {
    setSelectedToolIds((current) => {
      if (current.includes(toolId)) {
        setToolDrafts((draftState) => {
          const nextDrafts = { ...draftState };
          delete nextDrafts[toolId];
          return nextDrafts;
        });

        return current.filter((id) => id !== toolId);
      }

      setToolDrafts((draftState) => ({
        ...draftState,
        [toolId]: {
          condition: 'Good',
          photoUrls: [],
        },
      }));

      return [...current, toolId];
    });
  };

  const handleAddPhoto = async (toolId: string) => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert('Permiso requerido', 'Necesitamos acceso a tu galería para adjuntar evidencia de la herramienta.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.85,
    });

    if (result.canceled || !result.assets?.length) {
      return;
    }

    const uploadedUrls: string[] = [];

    for (const asset of result.assets) {
      try {
        const response = await fetch(asset.uri);
        const blob = await response.blob();
        const url = await uploadToolEvidence(`public-${Date.now()}`, toolId, blob);
        uploadedUrls.push(url);
      } catch (error) {
        console.warn('No se pudo subir la foto de la herramienta.', error);
      }
    }

    if (!uploadedUrls.length) {
      Alert.alert('No se adjuntó evidencia', 'No fue posible subir las fotos seleccionadas. Intenta nuevamente.');
      return;
    }

    setToolDrafts((current) => ({
      ...current,
      [toolId]: {
        condition: current[toolId]?.condition ?? 'Good',
        photoUrls: [...(current[toolId]?.photoUrls ?? []), ...uploadedUrls],
      },
    }));
  };

  const handleSubmit = async () => {
    if (!form.fullName.trim() || !form.company.trim() || !form.projectName.trim()) {
      Alert.alert('Faltan datos', 'Completa tu nombre, empresa y proyecto antes de enviar la solicitud.');
      return;
    }

    if (!selectedToolIds.length) {
      Alert.alert('Sin herramientas', 'Selecciona al menos una herramienta disponible.');
      return;
    }

    if (!form.purpose.trim() || !form.workArea.trim() || !form.dueDate) {
      Alert.alert('Faltan datos', 'Completa el motivo, área de trabajo y fecha estimada de devolución.');
      return;
    }

    const missingEvidence = selectedToolIds.some((toolId) => !(toolDrafts[toolId]?.photoUrls?.length));
    if (missingEvidence) {
      Alert.alert('Falta evidencia', 'Debes adjuntar al menos una foto por herramienta antes de enviar la solicitud.');
      return;
    }

    setSubmitting(true);

    try {
      const requestId = `REQ-${Date.now()}`;
      const publicRequesterId = `public-${Date.now()}`;

      const requestPayload: Partial<ToolRequest> = {
        id: requestId,
        requesterUid: publicRequesterId,
        requesterName: form.fullName,
        role: 'solicitante',
        company: form.company,
        projectName: form.projectName,
        createdAt: new Date().toISOString(),
        status: 'pending',
        items: selectedToolIds.map((toolId) => {
          const tool = toolCatalog.find((entry) => entry.id === toolId);
          const draft = toolDrafts[toolId] ?? { condition: 'Good', photoUrls: [] };

          return {
            id: `IT-${Date.now()}-${toolId}`,
            requestId,
            toolId,
            toolName: tool?.name ?? 'Herramienta',
            quantity: Number(form.quantity) || 1,
            purpose: form.purpose,
            workArea: form.workArea,
            dueDate: form.dueDate,
            training: form.training as 'yes' | 'no' | 'n/a',
            condition: draft.condition,
            photoUrls: draft.photoUrls,
            approvalStatus: 'pending',
          };
        }),
      };

      const savedRequestId = await addToolRequest(requestPayload);

      Alert.alert(
        'Solicitud enviada',
        `Tu solicitud fue registrada correctamente con folio ${savedRequestId}. El Jefe de Obra recibirá la notificación.`,
      );

      setSelectedToolIds([]);
      setToolDrafts({});
      setForm(emptyForm);
    } catch (error) {
      console.error('Error creating public request', error);
      Alert.alert('Error', 'No se pudo registrar la solicitud. Intenta nuevamente.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.headerCard}>
        <Text style={styles.badge}>Solicitante</Text>
        <Text style={styles.title}>Formulario de solicitud de herramientas</Text>
        <Text style={styles.subtitle}>Completa la información y adjunta evidencia fotográfica antes de enviar tu solicitud.</Text>
      </View>

      <View style={styles.formCard}>
        <Text style={styles.label}>Nombre completo</Text>
        <TextInput
          value={form.fullName}
          onChangeText={(value) => setForm((current) => ({ ...current, fullName: value }))}
          style={styles.input}
          placeholder="Ej. María López"
        />

        <Text style={styles.label}>Empresa / organización</Text>
        <TextInput
          value={form.company}
          onChangeText={(value) => setForm((current) => ({ ...current, company: value }))}
          style={styles.input}
          placeholder="Ej. Constructora San Martín"
        />

        <Text style={styles.label}>Proyecto</Text>
        <TextInput
          value={form.projectName}
          onChangeText={(value) => setForm((current) => ({ ...current, projectName: value }))}
          style={styles.input}
          placeholder="Ej. Centro Comunitario Norte"
        />

        <Text style={styles.label}>Herramientas disponibles</Text>
        <View style={styles.chipGroup}>
          {availableTools.map((tool) => {
            const selected = selectedToolIds.includes(tool.id);
            return (
              <Pressable
                key={tool.id}
                onPress={() => toggleTool(tool.id)}
                style={[styles.chip, selected && styles.chipSelected]}
              >
                <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{tool.name}</Text>
              </Pressable>
            );
          })}
        </View>

        {selectedToolIds.length > 0 && (
          <View style={styles.toolDetailsWrap}>
            <Text style={styles.sectionTitle}>Detalle por herramienta</Text>
            {selectedToolIds.map((toolId) => {
              const tool = toolCatalog.find((entry) => entry.id === toolId);
              const draft = toolDrafts[toolId] ?? { condition: 'Good', photoUrls: [] };

              return (
                <View key={toolId} style={styles.toolCard}>
                  <Text style={styles.toolName}>{tool?.name ?? 'Herramienta'}</Text>

                  <Text style={styles.label}>Cantidad</Text>
                  <TextInput
                    value={form.quantity}
                    onChangeText={(value) => setForm((current) => ({ ...current, quantity: value }))}
                    keyboardType="numeric"
                    style={styles.input}
                  />

                  <Text style={styles.label}>Estado de la herramienta</Text>
                  <View style={styles.rowOptions}>
                    {TOOL_CONDITIONS.map((option) => (
                      <Pressable
                        key={option}
                        onPress={() =>
                          setToolDrafts((current) => ({
                            ...current,
                            [toolId]: {
                              condition: option,
                              photoUrls: current[toolId]?.photoUrls ?? [],
                            },
                          }))
                        }
                        style={[styles.option, draft.condition === option && styles.optionSelected]}
                      >
                        <Text style={[styles.optionText, draft.condition === option && styles.optionTextSelected]}>{option}</Text>
                      </Pressable>
                    ))}
                  </View>

                  <Text style={styles.label}>Evidencia fotográfica</Text>
                  <Pressable style={styles.photoButton} onPress={() => handleAddPhoto(toolId)}>
                    <Text style={styles.photoButtonText}>Agregar fotos</Text>
                  </Pressable>

                  {draft.photoUrls.length > 0 && (
                    <View style={styles.photoGrid}>
                      {draft.photoUrls.map((url, index) => (
                        <Image key={`${toolId}-${index}`} source={{ uri: url }} style={styles.photoPreview} />
                      ))}
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        )}

        <Text style={styles.label}>Motivo de uso</Text>
        <TextInput
          value={form.purpose}
          onChangeText={(value) => setForm((current) => ({ ...current, purpose: value }))}
          style={styles.input}
          placeholder="Ej. instalación de estructura metálica"
        />

        <Text style={styles.label}>Área de trabajo</Text>
        <TextInput
          value={form.workArea}
          onChangeText={(value) => setForm((current) => ({ ...current, workArea: value }))}
          style={styles.input}
          placeholder="Patio de obra / nivel 2"
        />

        <Text style={styles.label}>Fecha estimada de devolución</Text>
        <TextInput
          value={form.dueDate}
          onChangeText={(value) => setForm((current) => ({ ...current, dueDate: value }))}
          style={styles.input}
          placeholder="2026-10-30"
        />

        <Text style={styles.label}>¿Ha recibido capacitación?</Text>
        <View style={styles.rowOptions}>
          {(['yes', 'no', 'n/a'] as const).map((option) => (
            <Pressable
              key={option}
              onPress={() => setForm((current) => ({ ...current, training: option }))}
              style={[styles.option, form.training === option && styles.optionSelected]}
            >
              <Text style={[styles.optionText, form.training === option && styles.optionTextSelected]}>{option === 'yes' ? 'Sí' : option === 'no' ? 'No' : 'No aplica'}</Text>
            </Pressable>
          ))}
        </View>

        <Pressable style={[styles.submitButton, submitting && styles.submitButtonDisabled]} disabled={submitting} onPress={handleSubmit}>
          <Text style={styles.submitButtonText}>{submitting ? 'Enviando...' : 'Enviar solicitud'}</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  contentContainer: {
    padding: 18,
    paddingBottom: 40,
  },
  headerCard: {
    backgroundColor: '#0f766e',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
  },
  badge: {
    backgroundColor: '#ecfeff',
    color: '#115e59',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    fontSize: 11,
    fontWeight: '800',
    alignSelf: 'flex-start',
    marginBottom: 8,
    letterSpacing: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#d1fae5',
    lineHeight: 20,
  },
  formCard: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 18,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  label: {
    color: '#334155',
    fontWeight: '700',
    marginBottom: 8,
    marginTop: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#fff',
    fontSize: 14,
  },
  chipGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  chip: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#f8fafc',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    marginBottom: 8,
  },
  chipSelected: {
    backgroundColor: '#0f766e',
    borderColor: '#0f766e',
  },
  chipText: {
    color: '#0f172a',
    fontSize: 12,
    fontWeight: '600',
  },
  chipTextSelected: {
    color: '#fff',
  },
  toolDetailsWrap: {
    marginTop: 12,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
    marginTop: 8,
    marginBottom: 2,
  },
  toolCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  toolName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 8,
  },
  rowOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  option: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  optionSelected: {
    backgroundColor: '#ecfeff',
    borderColor: '#0f766e',
  },
  optionText: {
    color: '#334155',
    fontSize: 12,
    fontWeight: '600',
  },
  optionTextSelected: {
    color: '#0f766e',
  },
  photoButton: {
    marginTop: 8,
    backgroundColor: '#dbeafe',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  photoButtonText: {
    color: '#1d4ed8',
    fontWeight: '700',
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  photoPreview: {
    width: 80,
    height: 80,
    borderRadius: 10,
    backgroundColor: '#e2e8f0',
  },
  submitButton: {
    backgroundColor: '#0f766e',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 20,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
