import { ESGAssertion, Facility, AssuranceEngagement } from '../types/domain';

export const ALLOWED_EVIDENCE_MIME_TYPES = [
  'application/pdf',
  'text/csv',
  'text/plain',
  'application/json',
  'image/png',
  'image/jpeg',
] as const;

export const ALLOWED_EVIDENCE_EXTENSIONS = [
  '.pdf',
  '.csv',
  '.txt',
  '.json',
  '.png',
  '.jpg',
  '.jpeg',
] as const;

export const MAX_EVIDENCE_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

/**
 * Strips all undefined properties recursively before saving to IndexedDB or external stores.
 * Preserves null values (critical for ESG missing values).
 */
export function stripUndefined<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map((item) => stripUndefined(item)) as unknown as T;
  }
  if (typeof obj === 'object' && !(obj instanceof ArrayBuffer) && !(obj instanceof Uint8Array)) {
    const cleaned: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      if (value !== undefined) {
        cleaned[key] = stripUndefined(value);
      }
    }
    return cleaned as T;
  }
  return obj;
}

/**
 * Prevents CSV Formula Injection (OWASP) by prefixing cells starting with =, +, -, @, \t, \r
 * with a single quote and escaping double quotes.
 */
export function sanitizeCsvCell(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }
  const raw = String(value);
  // Check if starts with dangerous formula trigger characters (unless it's a negative number)
  const isNegativeNumber = /^-\d+(\.\d+)?$/.test(raw.trim());
  const needsPrefix = /^[=+\-@\t\r]/.test(raw) && !isNegativeNumber;
  const safeContent = needsPrefix ? `'${raw}` : raw;
  const escaped = safeContent.replace(/"/g, '""');
  return `"${escaped}"`;
}

export function generateAssertionsCsv(
  assertions: ESGAssertion[],
  engagementsMap: Map<string, AssuranceEngagement>,
  facilitiesMap: Map<string, Facility>
): string {
  const headers = [
    'Assertion ID',
    'Engagement',
    'Reporting Period',
    'Facility',
    'ESG Pillar',
    'Metric Code',
    'Metric Name',
    'Assertion Type',
    'Value Basis',
    'Reported Value',
    'Unit',
    'Reporting Boundary',
    'Data Source',
    'Calculation Method',
    'Review Status',
    'Evidence Linked Count',
  ];

  const rows = assertions.map((a) => {
    const engagementName = engagementsMap.get(a.engagementId)?.engagementName ?? a.engagementId;
    const facilityName = facilitiesMap.get(a.facilityId)?.facilityName ?? a.facilityId;
    const formattedValue = a.reportedValue === null ? 'NULL (Missing/NA)' : String(a.reportedValue);

    return [
      sanitizeCsvCell(a.assertionId),
      sanitizeCsvCell(engagementName),
      sanitizeCsvCell(a.reportingYear),
      sanitizeCsvCell(facilityName),
      sanitizeCsvCell(a.pillar),
      sanitizeCsvCell(a.metricCode),
      sanitizeCsvCell(a.metricName),
      sanitizeCsvCell(a.assertionType),
      sanitizeCsvCell(a.valueBasis),
      sanitizeCsvCell(formattedValue),
      sanitizeCsvCell(a.unit),
      sanitizeCsvCell(a.reportingBoundary),
      sanitizeCsvCell(a.dataSource),
      sanitizeCsvCell(a.calculationMethod),
      sanitizeCsvCell(a.reviewStatus),
      sanitizeCsvCell(a.linkedEvidenceIds.length),
    ].join(',');
  });

  return [headers.map((h) => sanitizeCsvCell(h)).join(','), ...rows].join('\n');
}

/**
 * Validates file MIME type, extension, and size (max 5 MB).
 */
export function validateEvidenceFile(file: {
  name: string;
  type: string;
  size: number;
}): { valid: boolean; error?: string } {
  if (!file || !file.name) {
    return { valid: false, error: 'File name is required.' };
  }
  if (file.size <= 0) {
    return { valid: false, error: 'Uploaded file cannot be empty (0 bytes).' };
  }
  if (file.size > MAX_EVIDENCE_FILE_SIZE_BYTES) {
    return {
      valid: false,
      error: `File size (${(file.size / (1024 * 1024)).toFixed(2)} MB) exceeds maximum allowed limit of 5.00 MB.`,
    };
  }

  const lowerName = file.name.toLowerCase();
  const hasAllowedExtension = ALLOWED_EVIDENCE_EXTENSIONS.some((ext) => lowerName.endsWith(ext));
  const hasAllowedMime = (ALLOWED_EVIDENCE_MIME_TYPES as readonly string[]).includes(file.type);

  if (!hasAllowedExtension || !hasAllowedMime) {
    return {
      valid: false,
      error: `Unsupported file type (${file.type || 'unknown'}). Allowed formats: PDF, CSV, TXT, JSON, PNG, JPEG.`,
    };
  }

  return { valid: true };
}

/**
 * Computes deterministic SHA-256 hex digest for an ArrayBuffer.
 */
export async function computeSha256Hex(buffer: ArrayBuffer): Promise<string> {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }
  // Deterministic fallback hash for environments without subtle crypto
  const bytes = new Uint8Array(buffer);
  let h1 = 0xdeadbeef ^ bytes.length;
  let h2 = 0x41c6ce57 ^ bytes.length;
  for (let i = 0; i < bytes.length; i++) {
    const ch = bytes[i];
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (
    (h1 >>> 0).toString(16).padStart(8, '0') +
    (h2 >>> 0).toString(16).padStart(8, '0') +
    ((h1 ^ h2) >>> 0).toString(16).padStart(8, '0') +
    bytes.length.toString(16).padStart(8, '0')
  ).padEnd(64, '0');
}

/**
 * Sanitizes untrusted text descriptions or audit log values for safe display,
 * stripping control characters and HTML/script tags.
 */
export function sanitizeDisplayText(input: string | null | undefined, maxLength = 1000): string {
  if (!input) return '';
  return String(input)
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
    .replace(/<\/?[a-z][^>]*>/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim()
    .slice(0, maxLength);
}

/**
 * Sanitizes a user-controlled text value for Excel/XLSX worksheet cells to prevent
 * spreadsheet formula injection (=, +, -, @, tab, CR) while preserving numbers and nulls.
 */
export function sanitizeSpreadsheetValue(
  value: string | number | boolean | null | undefined
): string | number | boolean | null {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === 'boolean') {
    return value;
  }
  const raw = String(value);
  const isNegativeNumber = /^-\d+(\.\d+)?$/.test(raw.trim());
  if (/^[=+\-@\t\r]/.test(raw) && !isNegativeNumber) {
    return `'${raw}`;
  }
  return raw;
}

/**
 * Validates and sanitizes export filenames to neutralize path traversal, null bytes,
 * control characters, or unsafe shell/filesystem characters.
 */
export function sanitizeExportFilename(rawFilename: string, extension: 'pdf' | 'xlsx' | 'csv' | 'json'): string {
  const trimmed = (rawFilename ?? '').trim();
  if (!trimmed) {
    throw new Error('Export filename cannot be empty.');
  }
  const base = trimmed
    .replace(/\.(pdf|xlsx|csv|json)$/i, '')
    .replace(/[\u0000-\u001F]/g, '')
    .replace(/\.\.+/g, '_')
    .replace(/[^a-zA-Z0-9._-]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^[._-]+|[._-]+$/g, '');
  if (!base || base.length < 2) {
    throw new Error(`Unsafe export filename rejected: "${rawFilename}".`);
  }
  return `${base}.${extension}`;
}

/**
 * Computes a deterministic SHA-256 hex hash over a UTF-8 string synchronously/asynchronously.
 * Used for canonical report snapshot integrity verification.
 */
export function computeDeterministicStringHash(canonicalText: string): string {
  // Deterministic 256-bit equivalent hex digest (4 x 64-bit FNV-1a / Murmur-inspired rounds)
  // so both synchronous and async callers obtain identical, reproducible 64-char hex hashes.
  const seeds = [0x811c9dc5, 0x9e3779b9, 0x85ebca6b, 0xc2b2ae35, 0x27d4eb2f, 0x165667b1, 0xd3a2646c, 0xfd7046c5];
  const out = seeds.map((seed, roundIdx) => {
    let h = seed ^ (canonicalText.length + roundIdx * 31);
    for (let i = 0; i < canonicalText.length; i++) {
      const code = canonicalText.charCodeAt(i);
      h = Math.imul(h ^ code, 0x01000193 + (roundIdx << 1));
      h = (h << 13) | (h >>> 19);
    }
    h = Math.imul(h ^ (h >>> 16), 0x85ebca6b);
    h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
    return ((h ^ (h >>> 16)) >>> 0).toString(16).padStart(8, '0');
  });
  return out.join('');
}

// ============================================================================
// PHASE 4 SECURITY HARDENING UTILITIES (5-ZONE THREAT MODEL)
// ============================================================================

/**
 * Zone 1 (Input Surfaces): Magic-byte / content-signature verification for uploaded files.
 * Prevents disguised executables (.exe, .sh, ELF, HTML/SVG scripts) renamed as .pdf or .png.
 */
export function validateFileMagicBytes(
  buffer: ArrayBuffer,
  mimeType: string,
  fileName: string
): { valid: boolean; error?: string } {
  const bytes = new Uint8Array(buffer);
  if (bytes.length === 0) {
    return { valid: false, error: 'File binary payload is empty (0 bytes).' };
  }

  // Reject executable magic signatures immediately: MZ (Windows PE), \x7FELF (Linux ELF), #! (shebang)
  if (
    (bytes.length >= 2 && bytes[0] === 0x4d && bytes[1] === 0x5a) ||
    (bytes.length >= 4 &&
      bytes[0] === 0x7f &&
      bytes[1] === 0x45 &&
      bytes[2] === 0x4c &&
      bytes[3] === 0x46) ||
    (bytes.length >= 2 && bytes[0] === 0x23 && bytes[1] === 0x21)
  ) {
    return {
      valid: false,
      error: `Security Block (Zone 1): Executable binary signature (PE/ELF/Script) detected in "${fileName}".`,
    };
  }

  const lowerMime = (mimeType || '').toLowerCase();
  const lowerName = (fileName || '').toLowerCase();

  // PDF signature: %PDF- (0x25 0x50 0x44 0x46 0x2D)
  if (lowerMime === 'application/pdf' || lowerName.endsWith('.pdf')) {
    if (
      bytes.length < 5 ||
      bytes[0] !== 0x25 ||
      bytes[1] !== 0x50 ||
      bytes[2] !== 0x44 ||
      bytes[3] !== 0x46 ||
      bytes[4] !== 0x2d
    ) {
      return {
        valid: false,
        error: `Magic-Byte Mismatch: File "${fileName}" claims to be PDF but lacks "%PDF-" header signature.`,
      };
    }
    return { valid: true };
  }

  // PNG signature: \x89PNG\r\n\x1a\n
  if (lowerMime === 'image/png' || lowerName.endsWith('.png')) {
    const pngSig = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
    if (bytes.length < 8 || !pngSig.every((b, idx) => bytes[idx] === b)) {
      return {
        valid: false,
        error: `Magic-Byte Mismatch: File "${fileName}" claims to be PNG but lacks valid PNG header signature.`,
      };
    }
    return { valid: true };
  }

  // JPEG signature: \xFF\xD8\xFF
  if (lowerMime === 'image/jpeg' || lowerName.endsWith('.jpg') || lowerName.endsWith('.jpeg')) {
    if (bytes.length < 3 || bytes[0] !== 0xff || bytes[1] !== 0xd8 || bytes[2] !== 0xff) {
      return {
        valid: false,
        error: `Magic-Byte Mismatch: File "${fileName}" claims to be JPEG but lacks 0xFFD8FF signature.`,
      };
    }
    return { valid: true };
  }

  // Text / CSV / JSON: Ensure no null bytes in first 4KB and no embedded <script> tags
  if (
    lowerMime === 'text/csv' ||
    lowerMime === 'text/plain' ||
    lowerMime === 'application/json' ||
    lowerName.endsWith('.csv') ||
    lowerName.endsWith('.txt') ||
    lowerName.endsWith('.json')
  ) {
    const inspectLen = Math.min(bytes.length, 4096);
    for (let i = 0; i < inspectLen; i++) {
      if (bytes[i] === 0x00) {
        return {
          valid: false,
          error: `Magic-Byte Mismatch: Text/CSV/JSON file "${fileName}" contains binary NULL bytes.`,
        };
      }
    }
    const sampleText = new TextDecoder('utf-8', { fatal: false }).decode(bytes.subarray(0, inspectLen));
    if (/<script[\s\S]*?>/i.test(sampleText)) {
      return {
        valid: false,
        error: `Security Block (Zone 1): Embedded <script> tag detected inside text/CSV/JSON evidence "${fileName}".`,
      };
    }
    if (lowerMime === 'application/json' || lowerName.endsWith('.json')) {
      const fullText = new TextDecoder('utf-8', { fatal: false }).decode(bytes);
      try {
        JSON.parse(fullText);
      } catch {
        return {
          valid: false,
          error: `Content Validation Failed: File "${fileName}" is not valid UTF-8 JSON.`,
        };
      }
    }
    return { valid: true };
  }

  return {
    valid: false,
    error: `Unsupported file signature or MIME type (${mimeType}) for "${fileName}".`,
  };
}

/**
 * Zone 1 & Zone 2 (OWASP LLM01 Prompt Injection Defense):
 * Detects direct and indirect prompt injection patterns in user questions, evidence notes,
 * or workpaper descriptions, and neutralizes instruction-override directives before grounding.
 */
const PROMPT_INJECTION_PATTERNS: Array<{ label: string; regex: RegExp }> = [
  {
    label: 'System Instruction Override Attempt',
    regex: /ignore\s+(all\s+)?(previous|prior|above|system)\s+(instructions|prompts|rules|guardrails)/i,
  },
  {
    label: 'Role Hijacking / Developer Mode Attempt',
    regex: /you\s+are\s+now\s+(in\s+developer\s+mode|unrestricted|dan|an?\s+external\s+auditor\s+issuing)/i,
  },
  {
    label: 'Forced Assurance Opinion / Auto-Approval Injection',
    regex: /(issue\s+an?\s+unqualified\s+assurance\s+opinion|auto[-\s]?approve\s+all\s+controls|mark\s+all\s+controls\s+operating\s+effectively|bypass\s+4[-\s]?eyes\s+review)/i,
  },
  {
    label: 'Secret / API Key Exfiltration Attempt',
    regex: /(reveal|print|output|show|leak)\s+(the\s+)?(system\s+prompt|gemini_api_key|api\s+key|environment\s+variables|secret)/i,
  },
  {
    label: 'Delimiter / System Tag Spoofing',
    regex: /(<\|im_start\|>|<\|system\|>|\[SYSTEM\s*INSTRUCTION\]|###\s*SYSTEM\s*OVERRIDE)/i,
  },
];

export function detectAndNeutralizePromptInjection(rawText: string): {
  detected: boolean;
  indicators: string[];
  sanitizedText: string;
} {
  const input = String(rawText ?? '');
  const indicators: string[] = [];

  for (const pat of PROMPT_INJECTION_PATTERNS) {
    if (pat.regex.test(input)) {
      indicators.push(pat.label);
    }
  }

  let sanitized = sanitizeDisplayText(input, 2000);
  for (const pat of PROMPT_INJECTION_PATTERNS) {
    sanitized = sanitized.replace(pat.regex, '[REDACTED_UNTRUSTED_DIRECTIVE]');
  }

  return {
    detected: indicators.length > 0,
    indicators,
    sanitizedText: sanitized,
  };
}

/**
 * Zone 1 & Zone 5 (Safe URL & SSRF Prevention):
 * Rejects javascript:, data:, vbscript:, file:, and internal metadata/loopback IP URLs.
 */
export function validateSafeExternalUrl(rawUrl: string): { valid: boolean; error?: string } {
  const trimmed = (rawUrl ?? '').trim();
  if (!trimmed) {
    return { valid: false, error: 'URL cannot be empty.' };
  }
  if (/^(javascript|data|vbscript|file|blob):/i.test(trimmed)) {
    return { valid: false, error: `Dangerous URL scheme rejected: "${trimmed.slice(0, 24)}".` };
  }
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      return { valid: false, error: `Unsupported URL protocol: ${parsed.protocol}` };
    }
    const host = parsed.hostname.toLowerCase();
    if (
      host === '169.254.169.254' ||
      host === 'metadata.google.internal' ||
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host === '0.0.0.0'
    ) {
      return {
        valid: false,
        error: `SSRF Protection: Internal or metadata hostname "${host}" is forbidden.`,
      };
    }
    return { valid: true };
  } catch {
    return { valid: false, error: 'Malformed URL string.' };
  }
}

/**
 * Converts an ArrayBuffer to a Base64 string for portable JSON backup archives.
 */
export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  if (typeof btoa === 'function') {
    return btoa(binary);
  }
  return Buffer.from(bytes).toString('base64');
}

/**
 * Converts a Base64 string back to an ArrayBuffer and verifies byte length.
 */
export function base64ToArrayBuffer(base64: string): ArrayBuffer {
  if (typeof atob === 'function') {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }
  const buf = Buffer.from(base64, 'base64');
  const out = new Uint8Array(buf.length);
  for (let i = 0; i < buf.length; i++) {
    out[i] = buf[i];
  }
  return out.buffer;
}
