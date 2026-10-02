// Admin-Worker: erledigt Aufträge aus der Verwaltung, die nur mit Server-Rechten möglich sind.
// Läuft als GitHub Action (.github/workflows/admin-worker.yml) etwa alle 5 Minuten.
// Benötigt das Repository-Secret FIREBASE_SERVICE_ACCOUNT (JSON-Schlüssel eines Firebase-Dienstkontos).
const admin = require('firebase-admin');
const RESET_PW = 'Training123';

if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
  console.log('Secret FIREBASE_SERVICE_ACCOUNT fehlt, nichts zu tun.');
  process.exit(0);
}
admin.initializeApp({ credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)) });
const db = admin.firestore();
const now = () => admin.firestore.FieldValue.serverTimestamp();

(async () => {
  const snap = await db.collection('adminRequests').where('status', '==', 'pending').get();
  console.log(`${snap.size} offene Aufträge`);
  for (const doc of snap.docs) {
    const r = doc.data();
    try {
      // Nur Aufträge von eingetragenen Admins ausführen
      const isAdmin = r.by && (await db.collection('admins').doc(r.by).get()).exists;
      if (!isAdmin) throw new Error('Auftraggeber ist kein Admin');
      if (r.type === 'resetPassword') {
        await admin.auth().updateUser(r.uid, { password: RESET_PW });
        await db.collection('users').doc(r.uid).set({ mustChangePw: true }, { merge: true });
      } else if (r.type === 'deleteUser') {
        try { await admin.auth().deleteUser(r.uid); } catch (e) { if (e.code !== 'auth/user-not-found') throw e; }
        await db.collection('blocked').doc(r.uid).delete();
      } else {
        throw new Error('Unbekannter Auftrag: ' + r.type);
      }
      await doc.ref.update({ status: 'done', doneAt: now() });
      console.log(`erledigt: ${r.type} ${r.username || r.uid}`);
    } catch (e) {
      await doc.ref.update({ status: 'error', error: String(e.message || e), doneAt: now() });
      console.log(`Fehler: ${r.type} ${r.username || r.uid}: ${e.message || e}`);
    }
  }
})().catch(e => { console.error(e); process.exit(1); });
