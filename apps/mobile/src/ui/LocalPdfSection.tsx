import React, { useCallback, useEffect, useState } from "react";
import { Text, View } from "react-native";
import { Add01Icon, File01Icon } from "@hugeicons/core-free-icons";
import { useAuth } from "../auth/AuthProvider";
import {
  listLocalPdfs,
  openLocalPdf,
  pickAndAddLocalPdf,
  removeLocalPdf,
  type LocalPdf,
  type PdfParentType,
} from "../pdf/localPdfs";
import { AppIcon } from "./Icon";
import { Button, Card, ErrorText, SectionTitle, confirm, useAction, usePalette } from "./components";

export function LocalPdfSection({ parentType, parentId, compact = false, readOnly = false }: {
  parentType: PdfParentType;
  parentId: string;
  compact?: boolean;
  readOnly?: boolean;
}) {
  const { userId } = useAuth();
  const c = usePalette();
  const action = useAction();
  const [files, setFiles] = useState<LocalPdf[]>([]);
  const reload = useCallback(async () => setFiles(await listLocalPdfs(userId, parentType, parentId)), [userId, parentType, parentId]);

  useEffect(() => { void reload(); }, [reload]);

  const add = () => void action.run(async () => {
    if (await pickAndAddLocalPdf(userId, parentType, parentId)) await reload();
  });

  if (readOnly && files.length === 0) return null;

  return (
    <View style={{ gap: 8 }}>
      {compact ? (
        <Text style={{ fontSize: 13, fontWeight: "700", color: c.textPrimary }}>PDF de la fiche</Text>
      ) : (
        <SectionTitle title="Documents PDF" />
      )}
      <Card style={{ padding: 12, gap: 10 }}>
        {!compact && (
          <Text style={{ color: c.textSecondary, fontSize: 12, lineHeight: 18 }}>
            Fichiers conservés uniquement sur ce téléphone. Ils ne sont pas synchronisés et seront effacés si tu te déconnectes ou désinstalles l’application.
          </Text>
        )}
        {files.map((file) => (
          <View key={file.id} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <AppIcon icon={File01Icon} color={c.primary} size={18} />
            <View style={{ flex: 1 }}>
              <Text numberOfLines={1} style={{ color: c.textPrimary, fontSize: 13, fontWeight: "600" }}>{file.filename}</Text>
              <Text style={{ color: c.textSecondary, fontSize: 11 }}>{Math.max(1, Math.round(file.sizeBytes / 1024))} Ko · local</Text>
            </View>
            <Button size="sm" variant="ghost" title="Ouvrir" onPress={() => void action.run(() => openLocalPdf(userId, file.id))} />
            {!readOnly && (
              <Button
                size="sm"
                variant="ghost"
                title="Retirer"
                onPress={() => confirm("Retirer ce PDF ?", "Le fichier sera effacé de MémoCycle sur ce téléphone.", () => void action.run(async () => { await removeLocalPdf(userId, file.id); await reload(); }))}
              />
            )}
          </View>
        ))}
        {!readOnly && <Button size="sm" variant="secondary" icon={Add01Icon} title="Ajouter un PDF" disabled={action.busy} onPress={add} />}
        <ErrorText message={action.error} />
      </Card>
    </View>
  );
}
