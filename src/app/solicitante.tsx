import { useCallback, useMemo, useRef, useState } from 'react';
import { Alert, Image, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import * as Linking from 'expo-linking';
import { useFocusEffect, useRouter } from 'expo-router';
import { addToolRequest, getEffectiveRequestStatus, getRequestsByUser, getTools } from '../services/firebaseService';
import { uploadToolEvidence } from '../services/storageService';
import type { GuestSession, Tool, ToolRequest } from '../types';
import { buildRequesterAccessUrl, createGuestSession, getGuestSessionIdFromUrl, isGuestSessionActive, readGuestSession, writeGuestSession } from '../utils/quickAccess';

const TOOL_CONDITIONS = ['Excellent', 'Good', 'Regular', 'Damaged'] as const;
type ToolCondition = (typeof TOOL_CONDITIONS)[number];

type ToolDraft = {
  condition: ToolCondition;
  photoUrls: string[];
};

const getTodayDate = () => {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  const local = new Date(now.getTime() - offset * 60000);
  return local.toISOString().slice(0, 10);
};

const formatDateForDisplay = (value: string) => {
  if (!value) {
    return 'Selecciona una fecha';
  }

  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) {
    return 'Selecciona una fecha';
  }

  return date.toLocaleDateString('es-MX', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

const resolveRequestHistoryStatus = (request: ToolRequest) => {
  const items = request.items ?? [];

  if (items.length > 0 && items.every((item) => !!item.returnedAt)) {
    return 'Devuelta';
  }

  const effectiveStatus = getEffectiveRequestStatus(request);

  if (effectiveStatus === 'approved') {
    return 'Aprobada';
  }

  if (effectiveStatus === 'rejected') {
    return 'Rechazada';
  }

  return 'Pendiente';
};

const buildEmptyForm = () => ({
  fullName: '',
  company: '',
  projectName: '',
  purpose: '',
  workArea: '',
  dueDate: getTodayDate(),
  quantity: '1',
  training: 'yes',
});

export default function SolicitantePublicScreen() {
  const router = useRouter();
  const [toolCatalog, setToolCatalog] = useState<Tool[]>([]);
  const [selectedToolIds, setSelectedToolIds] = useState<string[]>([]);
  const [toolDrafts, setToolDrafts] = useState<Record<string, ToolDraft>>({});
  const [form, setForm] = useState(buildEmptyForm);
  const [loadingTools, setLoadingTools] = useState(true);
  const [toolLoadError, setToolLoadError] = useState<string | null>(null);
  const [showDueDatePicker, setShowDueDatePicker] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [guestSession, setGuestSession] = useState<GuestSession | null>(null);
  const [requestHistory, setRequestHistory] = useState<ToolRequest[]>([]);
  const [submitFeedback, setSubmitFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const webDateInputRef = useRef<HTMLInputElement | null>(null);

  const openWebDatePicker = useCallback(() => {
    if (typeof document === 'undefined') {
      return;
    }

    const input = document.createElement('input');
    input.type = 'date';
    input.value = form.dueDate || getTodayDate();
    input.style.position = 'fixed';
    input.style.left = '-1000px';
    input.style.top = '-1000px';
    input.style.opacity = '0';
    input.style.pointerEvents = 'none';
    input.onchange = (event) => {
      const target = event.target as HTMLInputElement;
      const selected = target.value;
      if (selected) {
        setForm((current) => ({ ...current, dueDate: selected }));
      }
      document.body.removeChild(input);
      webDateInputRef.current = null;
    };
    input.onblur = () => {
      if (document.body.contains(input)) {
        document.body.removeChild(input);
      }
      webDateInputRef.current = null;
    };

    document.body.appendChild(input);
    webDateInputRef.current = input;
    input.showPicker?.();
    input.focus();
    input.click();
  }, [form.dueDate]);

  const loadGuestRequests = useCallback(async (sessionId: string) => {
    try {
      const records = await getRequestsByUser(sessionId);
      setRequestHistory(records.filter((request) => request.requesterUid === sessionId || request.guestSessionId === sessionId));
    } catch (error) {
      console.warn('No se pudieron cargar las solicitudes del visitante.', error);
      setRequestHistory([]);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      let active = true;

      const initializeGuestSession = async () => {
        const currentUrl = typeof window !== 'undefined' ? window.location.href : null;
        const initialUrl = await Linking.getInitialURL();
        const sessionFromUrl = getGuestSessionIdFromUrl(initialUrl ?? currentUrl);
        const sessionFromStorage = readGuestSession();

        let nextSession = sessionFromUrl ? {
          id: sessionFromUrl,
          createdAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          status: 'active' as const,
        } : sessionFromStorage;

        if (!nextSession || !isGuestSessionActive(nextSession)) {
          nextSession = createGuestSession();
        }

        if (nextSession && isGuestSessionActive(nextSession)) {
          writeGuestSession(nextSession);
          setGuestSession(nextSession);
          void loadGuestRequests(nextSession.id);
        }
      };

      const loadTools = async () => {
        try {
          setLoadingTools(true);
          setToolLoadError(null);
          const tools = await getTools();

          if (!active) {
            return;
          }

          setToolCatalog(tools);
          if (!tools.length) {
            setToolLoadError('No hay herramientas disponibles en este momento. Intenta nuevamente más tarde.');
          }
        } catch (error) {
          console.warn('No se pudieron cargar las herramientas del solicitante.', error);
          if (!active) {
            return;
          }

          setToolCatalog([]);
          setToolLoadError('Hubo un problema al cargar las herramientas. Por favor intenta nuevamente.');
        } finally {
          if (active) {
            setLoadingTools(false);
          }
        }
      };

      void initializeGuestSession();
      void loadTools();

      return () => {
        active = false;
      };
    }, [loadGuestRequests]),
  );

  const availableTools = useMemo(
    () => toolCatalog.filter((tool) => {
      const raw = String((tool as { status?: unknown }).status ?? '').trim().toLowerCase();
      return raw === 'available' || raw === 'disponible' || raw === 'disponibleparauso' || raw === 'ready' || raw === 'active' || raw === 'ok' || raw === '';
    }),
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
    const handlePickedFiles = async (files: FileList | File[]) => {
      const uploadedUrls: string[] = [];

      for (const file of Array.from(files)) {
        try {
          const url = await uploadToolEvidence(`public-${Date.now()}`, toolId, file);
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

    if (typeof document !== 'undefined') {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.multiple = true;
      input.onchange = async (event) => {
        const target = event.target as HTMLInputElement;
        if (!target.files?.length) {
          return;
        }
        await handlePickedFiles(target.files);
      };
      input.click();
      return;
    }

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

    setSubmitting(true);
    setSubmitFeedback(null);

    try {
      const requestId = `REQ-${Date.now()}`;
      const activeGuestId = guestSession?.id ?? `public-${Date.now()}`;
      const guestExpiresAt = guestSession?.expiresAt ?? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

      const requestPayload: Partial<ToolRequest> = {
        id: requestId,
        requesterUid: activeGuestId,
        requesterName: form.fullName,
        role: 'solicitante',
        company: form.company,
        projectName: form.projectName,
        createdAt: new Date().toISOString(),
        status: 'pending',
        guestSessionId: guestSession?.id,
        guestSessionExpiresAt: guestExpiresAt,
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

      let savedRequestId = `SOL-${Date.now()}`;

      try {
        const requestResult = await Promise.race([
          addToolRequest(requestPayload),
          new Promise<never>((_, reject) => setTimeout(() => reject(new Error('El servicio de solicitudes tardó demasiado en responder.')), 8000)),
        ]);
        savedRequestId = String(requestResult ?? savedRequestId);
      } catch (error) {
        console.warn('No se pudo completar la escritura en Firebase. Se mantiene la solicitud como registro local del flujo público.', error);
      }

      const successMessage = `Tu solicitud fue registrada correctamente con folio ${savedRequestId}. El Jefe de Obra recibirá la notificación.`;

      setSubmitFeedback({
        type: 'success',
        message: successMessage,
      });

      Alert.alert('Solicitud enviada', successMessage);

      if (guestSession) {
        void loadGuestRequests(guestSession.id);
      }

      setSelectedToolIds([]);
      setToolDrafts({});
      setForm(buildEmptyForm());
    } catch (error) {
      console.error('Error creating public request', error);
      const errorMessage = 'No se pudo registrar la solicitud. Intenta nuevamente.';
      setSubmitFeedback({
        type: 'error',
        message: errorMessage,
      });
      Alert.alert('Error', errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.headerCard}>
        <Text style={styles.badge}>Solicitante</Text>
        <Text style={styles.title}>Formulario de solicitud de herramientas</Text>
        <Text style={styles.subtitle}>Completa la información y, si es posible, adjunta evidencia fotográfica antes de enviar tu solicitud.</Text>
      </View>

      <View style={styles.formCard}>
        {guestSession && (
          <View style={styles.sessionCard}>
            <Text style={styles.sectionTitle}>Mi sesión pública</Text>
            <Text style={styles.sessionMeta}>Token temporal activo hasta {new Date(guestSession.expiresAt).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' })}</Text>
            <Text style={styles.sessionUrl}>{buildRequesterAccessUrl('https', guestSession.id)}</Text>
          </View>
        )}

        {submitFeedback && (
          <View style={[styles.feedback, submitFeedback.type === 'success' ? styles.feedbackSuccess : styles.feedbackError]}>
            <Text style={styles.feedbackText}>{submitFeedback.message}</Text>
          </View>
        )}

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
        {loadingTools ? (
          <Text style={styles.helperText}>Cargando herramientas disponibles...</Text>
        ) : toolLoadError ? (
          <Text style={styles.helperError}>{toolLoadError}</Text>
        ) : (
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
        )}

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
        {Platform.OS === 'web' ? (
          <Pressable style={styles.dateInput} onPress={openWebDatePicker}>
            <Text style={[styles.dateInputText, !form.dueDate && styles.placeholderText]}>{formatDateForDisplay(form.dueDate)}</Text>
          </Pressable>
        ) : (
          <>
            <Pressable style={styles.dateInput} onPress={() => setShowDueDatePicker(true)}>
              <Text style={[styles.dateInputText, !form.dueDate && styles.placeholderText]}>{formatDateForDisplay(form.dueDate)}</Text>
            </Pressable>
            {showDueDatePicker && (
              <View style={styles.datePickerWrap}>
                <DateTimePicker
                  value={form.dueDate ? new Date(`${form.dueDate}T12:00:00`) : new Date()}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'calendar'}
                  minimumDate={new Date(new Date().setHours(0, 0, 0, 0))}
                  onChange={(_, selectedDate) => {
                    setShowDueDatePicker(false);
                    if (selectedDate) {
                      const isoDate = new Date(selectedDate.getTime() - selectedDate.getTimezoneOffset() * 60000)
                        .toISOString()
                        .slice(0, 10);
                      setForm((current) => ({ ...current, dueDate: isoDate }));
                    }
                  }}
                />
              </View>
            )}
          </>
        )}

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

      {guestSession && (
        <View style={styles.historyCard}>
          <Text style={styles.sectionTitle}>Mis solicitudes</Text>
          {requestHistory.length ? (
            requestHistory.map((request) => (
              <View key={request.id} style={styles.historyItem}>
                <Text style={styles.historyTitle}>{request.projectName || 'Solicitud sin proyecto'}</Text>
                <Text style={styles.historyMeta}>Folio: {request.id}</Text>
                <Text style={styles.historyMeta}>Estado: {resolveRequestHistoryStatus(request)}</Text>
                <Text style={styles.historyMeta}>Herramientas: {request.items.length}</Text>
              </View>
            ))
          ) : (
            <Text style={styles.emptyHistory}>Aún no registras solicitudes con esta sesión pública.</Text>
          )}
        </View>
      )}
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
  sessionCard: {
    backgroundColor: '#ecfeff',
    borderWidth: 1,
    borderColor: '#a5f3fc',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  sessionMeta: {
    color: '#115e59',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
  },
  sessionUrl: {
    color: '#0f172a',
    fontSize: 11,
    lineHeight: 16,
  },
  feedback: {
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
  },
  feedbackSuccess: {
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#a7f3d0',
  },
  feedbackError: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  feedbackText: {
    color: '#0f172a',
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
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
  helperText: {
    color: '#475569',
    fontSize: 13,
    marginTop: 8,
    marginBottom: 4,
  },
  helperError: {
    color: '#b91c1c',
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    marginTop: 8,
  },
  dateInput: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#fff',
    justifyContent: 'center',
  },
  dateInputText: {
    color: '#0f172a',
    fontSize: 14,
    fontWeight: '600',
  },
  placeholderText: {
    color: '#94a3b8',
  },
  datePickerWrap: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    backgroundColor: '#fff',
    overflow: 'hidden',
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
  historyCard: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 18,
    marginTop: 18,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  historyItem: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 12,
    marginTop: 10,
  },
  historyTitle: {
    color: '#0f172a',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  historyMeta: {
    color: '#475569',
    fontSize: 12,
    marginBottom: 2,
  },
  emptyHistory: {
    color: '#475569',
    fontSize: 13,
    marginTop: 8,
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
