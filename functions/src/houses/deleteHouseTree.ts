import * as admin from "firebase-admin";
import { getStorage } from "firebase-admin/storage";

function db() {
  return admin.firestore();
}

async function deleteHousePhotoFiles(houseId: string): Promise<void> {
  try {
    await getStorage().bucket().deleteFiles({ prefix: `houses/${houseId}/photos/` });
  } catch (err) {
    console.error("photo storage delete failed", houseId, err);
  }
}

/** 物件と、その問い合わせ・写真を消す。 */
export async function deleteHouseTree(
  ref: admin.firestore.DocumentReference
): Promise<void> {
  const [inquiries, photos] = await Promise.all([
    ref.collection("inquiries").listDocuments(),
    ref.collection("photos").listDocuments(),
  ]);
  const docs = [...inquiries, ...photos, ref];
  for (let i = 0; i < docs.length; i += 400) {
    const batch = db().batch();
    for (const docRef of docs.slice(i, i + 400)) batch.delete(docRef);
    await batch.commit();
  }
  await deleteHousePhotoFiles(ref.id);
}
