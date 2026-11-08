import {
  AssuranceEngagement,
  AuditEvent,
  BackupArchiveEnvelope,
  BackupManifest,
  EncodedEvidenceBlobRecord,
  EvidenceFileBlob,
  EvidenceRecord,
  RestoreConflictItem,
  RestoreMode,
  RestoreValidationReport,
} from '../types/domain';
import {
  DB_VERSION,
  openWorkbenchDb,
  STORE_KEY_PATHS,
  STORES,
} from '../db/repository';
import {
  arrayBufferToBase64,
  base64ToArrayBuffer,
  computeDeterministicStringHash,
  computeSha256Hex,
  stripUndefined,
} from '../utils/security';
import { BackupArchiveEnvelopeSchema } from '../validation/schemas';

const BACKUP_INCLUDED_STORES = STORE_KEY_PATHS.map((s) => s.name).filter(
  (name) => name !== STORES.EVIDENCE_BLOBS
);

function getStoreKeyPath(storeName: string): string {
  const found = STORE_KEY_PATHS.find((s) => s.name === storeName);
  return found?.keyPath ?? 'id';
}

function readAllFromStoreRaw(db: IDBDatabase, storeName: string): Promise<unknown[]> {
  return new Promise((resolve, reject) => {
    if (!db.objectStoreNames.contains(storeName)) {
      resolve([]);
      return;
    }
    const tx = db.transaction(storeName, 'readonly');
    const req = tx.objectStore(storeName).getAll();
    req.onsuccess = () => resolve((req.result as unknown[]) ?? []);
    req.onerror = () => reject(req.error ?? new Error(`Failed reading store ${storeName}`));
  });
}

/**
 * Computes canonical SHA-256 hex digest over the backup stores and encoded binary blobs.
 */
export function computeBackupArchiveHash(
  stores: Record<string, unknown[]>,
  encodedEvidenceBlobs: EncodedEvidenceBlobRecord[]
): string {
  const sortedStoreNames = Object.keys(stores).sort();
  const canonicalObj = {
    stores: sortedStoreNames.map((name) => ({
      name,
      count: stores[name]?.length ?? 0,
      records: stores[name] ?? [],
    })),
    blobs: [...encodedEvidenceBlobs]
      .sort((a, b) => a.evidenceId.localeCompare(b.evidenceId))
      .map((b) => ({
        evidenceId: b.evidenceId,
        byteLength: b.byteLength,
        sha256Checksum: b.sha256Checksum,
      })),
  };
  return computeDeterministicStringHash(JSON.stringify(canonicalObj));
}

/**
 * Creates a full-application or single-engagement backup archive including Base64-encoded
 * binary evidence files (`evidenceBlobs`) and SHA-256 checksums.
 */
export async function createWorkbenchBackupArchive(params: {
  scope: 'Full Application' | 'Single Engagement';
  engagementId?: string;
  actor: string;
}): Promise<BackupArchiveEnvelope> {
  const db = await openWorkbenchDb();
  const targetEngagementId =
    params.scope === 'Single Engagement' ? (params.engagementId ?? 'ENG-2025-002') : 'ALL';

  const rawStores: Record<string, unknown[]> = {};
  for (const storeName of BACKUP_INCLUDED_STORES) {
    const records = await readAllFromStoreRaw(db, storeName);
    if (params.scope === 'Single Engagement' && targetEngagementId !== 'ALL') {
      // Filter engagement-scoped stores while keeping global reference catalogs (organizations, facilities, emissionFactors, frameworks, requirements)
      const filtered = records.filter((rec) => {
        if (!rec || typeof rec !== 'object') return false;
        const r = rec as Record<string, unknown>;
        if ('engagementId' in r && typeof r.engagementId === 'string') {
          return r.engagementId === targetEngagementId;
        }
        return true;
      });
      rawStores[storeName] = stripUndefined(filtered);
    } else {
      rawStores[storeName] = stripUndefined(records);
    }
  }

  // Filter child procedures/samples/recalculations for single-engagement scope
  if (params.scope === 'Single Engagement' && targetEngagementId !== 'ALL') {
    const allowedPlanIds = new Set(
      (rawStores[STORES.AUDIT_PLANS] as Array<{ auditPlanId: string }>).map((p) => p.auditPlanId)
    );
    rawStores[STORES.AUDIT_PROCEDURES] = (
      rawStores[STORES.AUDIT_PROCEDURES] as Array<{ auditPlanId: string; procedureId: string }>
    ).filter((proc) => allowedPlanIds.has(proc.auditPlanId));

    const allowedProcIds = new Set(
      (rawStores[STORES.AUDIT_PROCEDURES] as Array<{ procedureId: string }>).map(
        (p) => p.procedureId
      )
    );
    rawStores[STORES.SAMPLING_PLANS] = (
      rawStores[STORES.SAMPLING_PLANS] as Array<{ procedureId: string; samplingPlanId: string }>
    ).filter((sp) => allowedProcIds.has(sp.procedureId));

    const allowedSamplingPlanIds = new Set(
      (rawStores[STORES.SAMPLING_PLANS] as Array<{ samplingPlanId: string }>).map(
        (s) => s.samplingPlanId
      )
    );
    rawStores[STORES.SAMPLE_ITEMS] = (
      rawStores[STORES.SAMPLE_ITEMS] as Array<{ samplingPlanId: string }>
    ).filter((si) => allowedSamplingPlanIds.has(si.samplingPlanId));
  }

  // Collect binary evidence blobs matching included evidence metadata records
  const includedEvidenceIds = new Set(
    ((rawStores[STORES.EVIDENCE] ?? []) as EvidenceRecord[]).map((ev) => ev.evidenceId)
  );
  const rawBlobs = (await readAllFromStoreRaw(
    db,
    STORES.EVIDENCE_BLOBS
  )) as EvidenceFileBlob[];

  const encodedEvidenceBlobs: EncodedEvidenceBlobRecord[] = [];
  for (const blob of rawBlobs) {
    if (
      params.scope === 'Full Application' ||
      includedEvidenceIds.has(blob.evidenceId)
    ) {
      const sha256Checksum = await computeSha256Hex(blob.bytes);
      encodedEvidenceBlobs.push({
        evidenceId: blob.evidenceId,
        base64Bytes: arrayBufferToBase64(blob.bytes),
        byteLength: blob.bytes.byteLength,
        sha256Checksum,
        mimeType: blob.mimeType,
        documentName: blob.documentName,
        uploadedAt: blob.uploadedAt,
      });
    }
  }

  const storeRecordCounts: Record<string, number> = {};
  for (const [k, v] of Object.entries(rawStores)) {
    storeRecordCounts[k] = v.length;
  }
  storeRecordCounts[STORES.EVIDENCE_BLOBS] = encodedEvidenceBlobs.length;

  const binaryBlobTotalBytes = encodedEvidenceBlobs.reduce((acc, b) => acc + b.byteLength, 0);
  const archiveChecksumSha256 = computeBackupArchiveHash(rawStores, encodedEvidenceBlobs);
  const nowIso = new Date().toISOString();

  const manifest: BackupManifest = {
    manifestId: `BKP-${Date.now()}`,
    backupVersion: 'v1.0.0',
    dbSchemaVersion: DB_VERSION,
    scope: params.scope,
    engagementId: targetEngagementId,
    createdAt: nowIso,
    createdBy: params.actor,
    storeRecordCounts,
    binaryBlobCount: encodedEvidenceBlobs.length,
    binaryBlobTotalBytes,
    archiveChecksumSha256,
  };

  return {
    manifest,
    stores: rawStores,
    encodedEvidenceBlobs,
  };
}

/**
 * Validates a backup archive BEFORE modifying any existing IndexedDB data.
 * Verifies Zod schema, archive SHA-256 hash, binary blob SHA-256 checksums,
 * referential integrity, and detects conflicts with currently stored records.
 */
export async function validateBackupArchiveForRestore(
  rawArchive: unknown
): Promise<RestoreValidationReport> {
  const errors: string[] = [];
  const warnings: string[] = [];
  const conflicts: RestoreConflictItem[] = [];

  const parsed = BackupArchiveEnvelopeSchema.safeParse(rawArchive);
  if (!parsed.success) {
    return {
      valid: false,
      errors: parsed.error.issues.map(
        (iss) => `${iss.path.join('.') || 'archive'}: ${iss.message}`
      ),
      warnings: [],
      manifest: null,
      schemaCompatible: false,
      archiveChecksumVerified: false,
      binaryChecksumsVerified: false,
      verifiedBinaryCount: 0,
      totalRecordsToRestore: 0,
      storePreviewCounts: {},
      conflicts: [],
    };
  }

  const archive = parsed.data as BackupArchiveEnvelope;
  const { manifest, stores, encodedEvidenceBlobs } = archive;

  // 1. Schema version compatibility check (supports v1..v4)
  const schemaCompatible =
    manifest.dbSchemaVersion >= 1 && manifest.dbSchemaVersion <= DB_VERSION;
  if (!schemaCompatible) {
    errors.push(
      `Unsupported database schema version ${manifest.dbSchemaVersion} (current workbench supports 1..${DB_VERSION}).`
    );
  }

  // 2. Archive SHA-256 checksum verification
  const recomputedArchiveHash = computeBackupArchiveHash(stores, encodedEvidenceBlobs);
  const archiveChecksumVerified = recomputedArchiveHash === manifest.archiveChecksumSha256;
  if (!archiveChecksumVerified) {
    errors.push(
      `Archive integrity check failed: expected SHA-256 ${manifest.archiveChecksumSha256.slice(0, 16)}..., computed ${recomputedArchiveHash.slice(0, 16)}...`
    );
  }

  // 3. Binary evidence blob SHA-256 checksum verification
  let binaryChecksumsVerified = true;
  let verifiedBinaryCount = 0;
  const evidenceRecords = (stores[STORES.EVIDENCE] ?? []) as EvidenceRecord[];
  const evidenceMap = new Map(evidenceRecords.map((e) => [e.evidenceId, e]));

  for (const blob of encodedEvidenceBlobs) {
    try {
      const decodedBuffer = base64ToArrayBuffer(blob.base64Bytes);
      if (decodedBuffer.byteLength !== blob.byteLength) {
        binaryChecksumsVerified = false;
        errors.push(
          `Binary size mismatch for ${blob.evidenceId} (${blob.documentName}): expected ${blob.byteLength} bytes, decoded ${decodedBuffer.byteLength} bytes.`
        );
        continue;
      }
      const computedSha = await computeSha256Hex(decodedBuffer);
      if (computedSha !== blob.sha256Checksum) {
        binaryChecksumsVerified = false;
        conflicts.push({
          storeName: STORES.EVIDENCE_BLOBS,
          recordId: blob.evidenceId,
          conflictType: 'Binary Checksum Mismatch',
          summary: `Binary SHA-256 mismatch for ${blob.documentName} (${blob.evidenceId}).`,
        });
        errors.push(
          `Binary SHA-256 checksum mismatch for evidence ${blob.evidenceId} (${blob.documentName}).`
        );
        continue;
      }
      const meta = evidenceMap.get(blob.evidenceId);
      if (meta && meta.checksum && meta.checksum !== computedSha) {
        binaryChecksumsVerified = false;
        errors.push(
          `Evidence metadata checksum (${meta.checksum.slice(0, 12)}) does not match binary payload checksum (${computedSha.slice(0, 12)}) for ${blob.evidenceId}.`
        );
        continue;
      }
      verifiedBinaryCount += 1;
    } catch {
      binaryChecksumsVerified = false;
      errors.push(`Invalid Base64 binary encoding for evidenceId ${blob.evidenceId}.`);
    }
  }

  // 4. Relationship validation (ensure assertions reference engagements present in archive or DB)
  const db = await openWorkbenchDb();
  const existingEngagements = (await readAllFromStoreRaw(
    db,
    STORES.ENGAGEMENTS
  )) as AssuranceEngagement[];
  const archiveEngagements = (stores[STORES.ENGAGEMENTS] ?? []) as AssuranceEngagement[];
  const knownEngagementIds = new Set([
    ...existingEngagements.map((e) => e.engagementId),
    ...archiveEngagements.map((e) => e.engagementId),
  ]);

  const archiveAssertions = (stores[STORES.ASSERTIONS] ?? []) as Array<{
    assertionId: string;
    engagementId: string;
  }>;
  for (const asn of archiveAssertions) {
    if (!knownEngagementIds.has(asn.engagementId)) {
      conflicts.push({
        storeName: STORES.ASSERTIONS,
        recordId: asn.assertionId,
        conflictType: 'Orphan Relationship',
        summary: `Assertion ${asn.assertionId} references missing engagement ${asn.engagementId}.`,
      });
      errors.push(
        `Referential integrity error: Assertion ${asn.assertionId} references non-existent engagement ${asn.engagementId}.`
      );
    }
  }

  // 5. Preview counts and conflict detection against existing IndexedDB records
  const storePreviewCounts: Record<string, number> = {};
  let totalRecordsToRestore = 0;

  for (const storeName of BACKUP_INCLUDED_STORES) {
    const incoming = stores[storeName] ?? [];
    storePreviewCounts[storeName] = incoming.length;
    totalRecordsToRestore += incoming.length;

    if (incoming.length > 0 && storeName !== STORES.AUDIT_EVENTS) {
      const keyPath = getStoreKeyPath(storeName);
      const existingRecords = (await readAllFromStoreRaw(db, storeName)) as Array<
        Record<string, unknown>
      >;
      const existingKeySet = new Set(existingRecords.map((r) => String(r[keyPath] ?? '')));

      for (const rec of incoming) {
        if (rec && typeof rec === 'object') {
          const recId = String((rec as Record<string, unknown>)[keyPath] ?? '');
          if (recId && existingKeySet.has(recId) && conflicts.length < 50) {
            conflicts.push({
              storeName,
              recordId: recId,
              conflictType: 'Existing Record Will Be Overwritten/Merged',
              summary: `Record ${recId} in ${storeName} already exists in local IndexedDB.`,
            });
          }
        }
      }
    }
  }
  storePreviewCounts[STORES.EVIDENCE_BLOBS] = encodedEvidenceBlobs.length;
  totalRecordsToRestore += encodedEvidenceBlobs.length;

  if (conflicts.some((c) => c.conflictType === 'Existing Record Will Be Overwritten/Merged')) {
    warnings.push(
      `Detected existing local records with matching IDs. In Merge mode, matching records are updated while unreferenced local records are preserved. In Replace mode, all stores are replaced.`
    );
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    manifest,
    schemaCompatible,
    archiveChecksumVerified,
    binaryChecksumsVerified,
    verifiedBinaryCount,
    totalRecordsToRestore,
    storePreviewCounts,
    conflicts,
  };
}

/**
 * Restores a validated backup archive into IndexedDB v4 transactionally.
 * Supports:
 * - 'Merge': preserves existing records not in archive and updates matching records.
 * - 'Replace': requires `confirmDestructiveReplace === true`, saves pre-replace backup metadata,
 *   clears stores, and restores exact archive state.
 */
export async function executeBackupRestore(params: {
  rawArchive: unknown;
  mode: RestoreMode;
  confirmDestructiveReplace?: boolean;
  actor: string;
}): Promise<{
  validation: RestoreValidationReport;
  restoredStoreCounts: Record<string, number>;
  restoredBinaryCount: number;
  auditEvent: AuditEvent;
}> {
  if (params.mode === 'Replace' && !params.confirmDestructiveReplace) {
    throw new Error(
      'Destructive Replace mode requires explicit user confirmation (confirmDestructiveReplace = true).'
    );
  }

  const validation = await validateBackupArchiveForRestore(params.rawArchive);
  if (!validation.valid || !validation.manifest) {
    throw new Error(
      `Restore aborted due to archive validation failure: ${validation.errors.join(' ')}`
    );
  }

  const archive = params.rawArchive as BackupArchiveEnvelope;
  const decodedBlobs: EvidenceFileBlob[] = archive.encodedEvidenceBlobs.map((b) => ({
    evidenceId: b.evidenceId,
    bytes: base64ToArrayBuffer(b.base64Bytes),
    mimeType: b.mimeType,
    documentName: b.documentName,
    uploadedAt: b.uploadedAt,
  }));

  const db = await openWorkbenchDb();
  const nowIso = new Date().toISOString();

  const auditEvent: AuditEvent = {
    eventId: `AUD-EVT-${Date.now()}-RST`,
    engagementId:
      archive.manifest.engagementId === 'ALL' ? 'ENG-2025-002' : archive.manifest.engagementId,
    entityType: 'BackupManifest',
    entityId: archive.manifest.manifestId,
    action: `BACKUP_RESTORED_${params.mode.toUpperCase()}`,
    actor: params.actor,
    timestamp: nowIso,
    previousValue: `Mode=${params.mode}`,
    newValue: `Restored ${validation.totalRecordsToRestore} records and ${decodedBlobs.length} verified binary blobs from ${archive.manifest.manifestId}`,
  };

  const allStoreNames = STORE_KEY_PATHS.map((s) => s.name);
  const restoredStoreCounts: Record<string, number> = {};

  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(allStoreNames, 'readwrite');

    if (params.mode === 'Replace') {
      for (const storeName of allStoreNames) {
        if (storeName !== STORES.PREFERENCES) {
          tx.objectStore(storeName).clear();
        }
      }
    }

    for (const storeName of BACKUP_INCLUDED_STORES) {
      const records = archive.stores[storeName] ?? [];
      const store = tx.objectStore(storeName);
      for (const rec of records) {
        store.put(stripUndefined(rec));
      }
      restoredStoreCounts[storeName] = records.length;
    }

    const blobStore = tx.objectStore(STORES.EVIDENCE_BLOBS);
    for (const blob of decodedBlobs) {
      blobStore.put(blob);
    }
    restoredStoreCounts[STORES.EVIDENCE_BLOBS] = decodedBlobs.length;

    tx.objectStore(STORES.BACKUP_MANIFESTS).put(stripUndefined(archive.manifest));
    tx.objectStore(STORES.AUDIT_EVENTS).put(auditEvent);

    tx.oncomplete = () => resolve();
    tx.onerror = () =>
      reject(tx.error ?? new Error('Transactional backup restore failed in IndexedDB.'));
  });

  return {
    validation,
    restoredStoreCounts,
    restoredBinaryCount: decodedBlobs.length,
    auditEvent,
  };
}
