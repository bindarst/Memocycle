import { Directory, File, Paths } from "expo-file-system";
import { getContentUriAsync } from "expo-file-system/legacy";
import * as IntentLauncher from "expo-intent-launcher";
import * as Sharing from "expo-sharing";
import { Platform } from "react-native";
import { database } from "../database/database";
import { newId } from "../utils/ids";

export type PdfParentType = "subject" | "course" | "studyItem";

export type LocalPdf = {
  id: string;
  filename: string;
  sizeBytes: number;
  createdAt: string;
};

type PdfRow = {
  id: string;
  filename: string;
  size_bytes: number;
  created_at: string;
};

const MAX_PDF_BYTES = 50 * 1024 * 1024;

function directoryForUser(userId: string) {
  return new Directory(Paths.document, "memocycle-pdfs", userId);
}

function fileForId(userId: string, id: string) {
  return new File(directoryForUser(userId), `${id}.pdf`);
}

export async function listLocalPdfs(userId: string, parentType: PdfParentType, parentId: string): Promise<LocalPdf[]> {
  const db = await database();
  const rows = await db.getAllAsync<PdfRow>(
    "SELECT id,filename,size_bytes,created_at FROM local_pdf_attachments WHERE owner_user_id=? AND parent_type=? AND parent_id=? ORDER BY created_at DESC",
    userId, parentType, parentId,
  );
  return rows.map((row) => ({ id: row.id, filename: row.filename, sizeBytes: row.size_bytes, createdAt: row.created_at }));
}

export async function pickAndAddLocalPdf(userId: string, parentType: PdfParentType, parentId: string): Promise<boolean> {
  const picked = await File.pickFileAsync({ mimeTypes: "application/pdf" });
  if (picked.canceled) return false;
  const source = picked.result;
  if (source.type !== "application/pdf" && !source.name.toLowerCase().endsWith(".pdf"))
    throw new Error("Choisis un fichier PDF.");
  if (source.size > MAX_PDF_BYTES)
    throw new Error("Le PDF doit faire moins de 50 Mo.");

  const id = newId();
  const folder = directoryForUser(userId);
  folder.create({ idempotent: true, intermediates: true });
  const destination = fileForId(userId, id);
  try {
    await source.copy(destination);
    if (!destination.exists || destination.size === 0 || destination.size > MAX_PDF_BYTES)
      throw new Error("Impossible de conserver ce PDF (50 Mo maximum).");
    const db = await database();
    await db.runAsync(
      "INSERT INTO local_pdf_attachments(id,owner_user_id,parent_type,parent_id,filename,size_bytes,created_at) VALUES(?,?,?,?,?,?,?)",
      id, userId, parentType, parentId,
      source.name.split(/[\\/]/).pop()?.slice(0, 150) || "Document.pdf",
      destination.size, new Date().toISOString(),
    );
    return true;
  } catch (error) {
    if (destination.exists) destination.delete();
    throw error;
  }
}

export async function openLocalPdf(userId: string, id: string) {
  const db = await database();
  const row = await db.getFirstAsync<{ id: string }>(
    "SELECT id FROM local_pdf_attachments WHERE id=? AND owner_user_id=?", id, userId,
  );
  if (!row) throw new Error("PDF introuvable sur ce téléphone.");
  const file = fileForId(userId, id);
  if (!file.exists) throw new Error("Ce PDF n’est plus présent sur ce téléphone.");
  if (Platform.OS === "android") {
    const contentUri = await getContentUriAsync(file.uri);
    try {
      await IntentLauncher.startActivityAsync("android.intent.action.VIEW", {
        data: contentUri,
        type: "application/pdf",
        flags: 1,
      });
      return;
    } catch {
      throw new Error("Aucun lecteur PDF n’est installé sur ce téléphone.");
    }
  }
  if (!(await Sharing.isAvailableAsync())) throw new Error("Aucune application ne peut ouvrir ce PDF.");
  await Sharing.shareAsync(file.uri, { mimeType: "application/pdf", UTI: "com.adobe.pdf", dialogTitle: "Ouvrir le PDF" });
}

export async function shareLocalPdf(userId: string, id: string) {
  const db = await database();
  const row = await db.getFirstAsync<{ id: string }>(
    "SELECT id FROM local_pdf_attachments WHERE id=? AND owner_user_id=?", id, userId,
  );
  if (!row) throw new Error("PDF introuvable sur ce téléphone.");
  const file = fileForId(userId, id);
  if (!file.exists) throw new Error("Ce PDF n’est plus présent sur ce téléphone.");
  if (!(await Sharing.isAvailableAsync())) throw new Error("Le partage n’est pas disponible sur ce téléphone.");
  await Sharing.shareAsync(file.uri, { mimeType: "application/pdf", UTI: "com.adobe.pdf", dialogTitle: "Partager le PDF" });
}

export async function removeLocalPdf(userId: string, id: string) {
  const db = await database();
  const row = await db.getFirstAsync<{ id: string }>(
    "SELECT id FROM local_pdf_attachments WHERE id=? AND owner_user_id=?", id, userId,
  );
  if (!row) return;
  const file = fileForId(userId, id);
  if (file.exists) file.delete();
  await db.runAsync("DELETE FROM local_pdf_attachments WHERE id=? AND owner_user_id=?", id, userId);
}

export async function removeLocalPdfsForParent(userId: string, parentType: PdfParentType, parentId: string) {
  const rows = await listLocalPdfs(userId, parentType, parentId);
  for (const row of rows) await removeLocalPdf(userId, row.id);
}

export async function clearUserLocalPdfs(userId: string) {
  const folder = directoryForUser(userId);
  if (folder.exists) folder.delete();
  const db = await database();
  await db.runAsync("DELETE FROM local_pdf_attachments WHERE owner_user_id=?", userId);
}
