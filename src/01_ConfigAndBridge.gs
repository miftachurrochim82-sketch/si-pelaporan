// ============================================================
// SI-PELAPORAN - 01_ConfigAndBridge.gs (v2-final)
// Perbaikan vs versi sebelumnya (disamakan dengan pola SI-KOMPETENSI):
// - F2: Header PELAPORAN DILENGKAPI kolom verifikasi
//   (catatan_verifikator, verifikator_id, tanggal_verifikasi).
//   Sebelumnya field ini ditulis hook/handler tapi TAK ADA di header
//   -> dibuang diam-diam oleh CoreLib (data verifikasi hilang).
// - F4: Sheet sistem (KONFIGURASI, MAIN_DATA, AUDIT_LOGS) kini
//   dideklarasikan eksplisit seperti SI-KOMPETENSI — jangan andalkan
//   asumsi "bawaan CoreLib".
// - F3: actionLevels tambah verifikasi_pelaporan: 'admin'
//   (defense in depth lapis 1; lapis 2 = cek di handler).
// - Paritas: bridge isValidDate_ ditambahkan (ada di SI-KOMPETENSI).
// ============================================================

var APP_TITLE = 'SI-PELAPORAN';
var APP_CODE = 'SIPELAPORAN';

// URL Portal Utama SSO Pusat (Fallback bila Properties kosong)
var DEFAULT_PLATFORM_URL = 'https://script.google.com/macros/s/AKfycbwh_OUVqmxLcuF81FHmPZtT33Wrm8Ce9Da1SQ3hfkSr7gM5P8ofyAlHSgW40mq3eo-PoQ/exec';

// Store MILIK APP INI. Wajib dioper ke getEnvProperty — tanpa ini,
// library membaca Properties MILIK LIBRARY (dipakai bersama 30 app)!
function appProps_() { return PropertiesService.getScriptProperties(); }

var SPREADSHEET_ID = CoreLib.getEnvProperty('SPREADSHEET_ID', appProps_()) || (function() {
  try { return SpreadsheetApp.getActiveSpreadsheet().getId(); } catch(e) { return ''; }
})();
// WAJIB DIISI di Script Properties: ID spreadsheet SIMPEG pusat (database master).
var MASTER_SPREADSHEET_ID = CoreLib.getEnvProperty('MASTER_SPREADSHEET_ID', appProps_());
var ROOT_FOLDER_ID = CoreLib.getEnvProperty('ROOT_FOLDER_ID', appProps_());
var BACKUP_FOLDER_ID = CoreLib.getEnvProperty('BACKUP_FOLDER_ID', appProps_());
var EVIDENCE_FOLDER_ID = CoreLib.getEnvProperty('EVIDENCE_FOLDER_ID', appProps_());

// Membaca dari Properties app ini, jika kosong memakai DEFAULT_PLATFORM_URL
var PLATFORM_API_URL = appProps_().getProperty('PLATFORM_API_URL') || DEFAULT_PLATFORM_URL;

var SESSION_PREFIX = 'APP_SESSION_' + APP_CODE + '_'; // default v2 (B2) — samakan di router localConfig!
var SESSION_TTL_SECONDS = 6 * 60 * 60; // 6 jam = cap v2 (B16)
var DATA_CACHE_TTL = 180; // 3 Menit
var ROLE_LEVELS = CoreLib.MASTER_ROLE_LEVELS;

// ==================== NAMA SHEET CANONICAL SI-PELAPORAN ====================
// F4: sheet sistem dideklarasikan eksplisit (pola SI-KOMPETENSI).
var LOCAL_SHEET_NAMES = {
  PELAPORAN: 'PELAPORAN',
  MAIN_DATA: 'MAIN_DATA',
  KONFIGURASI: 'KONFIGURASI',
  AUDIT_LOGS: 'AUDIT_LOGS',
  ZZ_TEST_CRUD: 'ZZ_TEST_CRUD'   // dipakai oleh runCoreTests
};

// ==================== HEADER SHEET KHUSUS SI-PELAPORAN ====================
var LOCAL_SHEET_HEADERS = {
  // F2: kolom verifikasi WAJIB ada — hook & handler verifikasi menulisnya.
  PELAPORAN: [
    'id', 'pegawai_id', 'tanggal', 'jenis_laporan', 'judul', 'isi',
    'status', 'catatan_verifikator', 'verifikator_id', 'tanggal_verifikasi',
    'created_at', 'updated_at', 'created_by', 'updated_by', 'deleted_at'
  ],
  MAIN_DATA: ['id', 'nama', 'nip', 'email', 'unit_nama', 'jabatan_nama', 'alamat', 'no_hp', 'created_at', 'updated_at', 'created_by', 'updated_by', 'deleted_at'],
  KONFIGURASI: ['id', 'key', 'value', 'keterangan', 'created_at', 'updated_at', 'created_by', 'updated_by', 'deleted_at'],
  AUDIT_LOGS: ['id', 'user_id', 'action', 'timestamp', 'details'],
  ZZ_TEST_CRUD: ['id', 'laporan_id', 'nama', 'no_hp', 'catatan_baru']
};

// ==================== BRIDGE HELPER WRAPPERS ====================

function getAllHeaders_() {
  return Object.assign({}, CoreLib.MASTER_SHEET_HEADERS, LOCAL_SHEET_HEADERS);
}

function getCanonicalSheetName_(sheetName) {
  return CoreLib.getCanonicalSheetName(sheetName, LOCAL_SHEET_NAMES)
      || String(sheetName || '').toUpperCase().trim();
}

function isReferenceSheet_(sheetName) {
  return CoreLib.isReferenceSheet(sheetName);
}

function getDb_() { return CoreLib.getDb(SPREADSHEET_ID); }
function ensureSheet_(sheetName) { return CoreLib.ensureSheet(SPREADSHEET_ID, getCanonicalSheetName_(sheetName), getAllHeaders_()); }
function initDatabase_() { return CoreLib.initDatabase(SPREADSHEET_ID, getAllHeaders_(), isReferenceSheet_); }

// Baca: teruskan masterSsId agar PEGAWAI/JABATAN/UNIT_KERJA dibaca dari MASTER (B5).
function readRecordsNoLock_(sheetName) { return CoreLib.readRecordsNoLock(SPREADSHEET_ID, getCanonicalSheetName_(sheetName), getAllHeaders_(), { masterSsId: MASTER_SPREADSHEET_ID }); }
function getSheetDataCached_(sheetName) { return CoreLib.getSheetDataCached(SPREADSHEET_ID, getCanonicalSheetName_(sheetName), getAllHeaders_(), DATA_CACHE_TTL, { masterSsId: MASTER_SPREADSHEET_ID }); }
// Tulis: pkField opsional (auto-deteksi aman — semua sheet lokal punya kolom 'id').
function toSheetRow_(sheetName, record) { return CoreLib.toSheetRow(getCanonicalSheetName_(sheetName), record, getAllHeaders_()); }
function writeRecordNoLock_(sheetName, record, isUpdate, actor, pkField) { return CoreLib.writeRecordNoLock(SPREADSHEET_ID, getCanonicalSheetName_(sheetName), record, isUpdate, actor, getAllHeaders_(), isReferenceSheet_, pkField); }
function softDeleteRecordNoLock_(sheetName, id, actor, pkField) { return CoreLib.softDeleteRecordNoLock(SPREADSHEET_ID, getCanonicalSheetName_(sheetName), id, actor, getAllHeaders_(), isReferenceSheet_, pkField); }
function hardDeleteRecordNoLock_(sheetName, id, actor, pkField) { return CoreLib.hardDeleteRecordNoLock(SPREADSHEET_ID, getCanonicalSheetName_(sheetName), id, actor, isReferenceSheet_, pkField); }

// B3: dbId WAJIB — tanpa ini cache v2 tidak terhapus (data basi walau sudah save).
function invalidateSheetCache_(sheetName) {
  var canonical = getCanonicalSheetName_(sheetName);
  CoreLib.invalidateSheetCache(canonical, SPREADSHEET_ID);
  if (MASTER_SPREADSHEET_ID && isReferenceSheet_(canonical)) CoreLib.invalidateSheetCache(canonical, MASTER_SPREADSHEET_ID);
}

// ==================== BRIDGE SSO & UTILITIES ====================
function logInfo(ctx, msg) { CoreLib.logInfo(ctx, msg); }
function logWarn(ctx, msg) { CoreLib.logWarn(ctx, msg); }
function logError(ctx, err) { CoreLib.logError(ctx, err); }
function makeId_(prefix) { return CoreLib.makeId(prefix); }
function nowIso_() { return CoreLib.nowIso(); }
function todayIso_() { return CoreLib.todayIso(); }
function safeUser_(user) { return CoreLib.safeUser(user); }
function acquireLock_() { return CoreLib.acquireLock(); }
function parseTanggalBackend_(val) { return CoreLib.parseTanggalBackend(val); }
function isValidDate_(val) { return CoreLib.isValidDate(val); }
function hitungDurasiMenit_(w1, w2) { return CoreLib.hitungDurasiMenit(w1, w2); }
function systemActor_() { return CoreLib.systemActor(); }

// B1: argumen testMode = false (selalu SSO asli).
function validatePlatformTicket_(ticket) { return CoreLib.validatePlatformTicket(ticket, PLATFORM_API_URL, false, APP_CODE); }
// masterSsId dioper agar session terisi pegawai_id/nip dari master (H2).
function exchangePlatformTicket(ticket) {
  return CoreLib.exchangePlatformTicket(ticket, {
    sessionPrefix: SESSION_PREFIX, ttlSeconds: SESSION_TTL_SECONDS, platformApiUrl: PLATFORM_API_URL, appCode: APP_CODE, masterSsId: MASTER_SPREADSHEET_ID
  });
}
function logout_(token) { return CoreLib.logoutUser(token, SESSION_PREFIX); }
function checkAuth_(token, minLevel) { return CoreLib.checkAuth(token, minLevel, SESSION_PREFIX, ROLE_LEVELS); }

// ==================== KONTRAK DISPATCHER v2 (§2 migrasi) ====================
// Router (doPost) WAJIB memakai ini sebagai localConfig agar prefix/headers
// sama persis dengan wrapper di atas. Jangan rakit localConfig manual.
function getAppConfig_() {
  return {
    appCode: APP_CODE,
    spreadsheetId: SPREADSHEET_ID,
    masterSsId: MASTER_SPREADSHEET_ID,
    platformApiUrl: PLATFORM_API_URL,
    sessionPrefix: SESSION_PREFIX,
    ttlSeconds: SESSION_TTL_SECONDS,
    roleLevels: ROLE_LEVELS,
    headersMap: getAllHeaders_(),
    pkFields: {},       // opsional — auto-deteksi 'id' sudah cukup
    // save_my_profile dibuka ke viewer (aman: email dari session).
    // get_config dikunci admin. verifikasi_pelaporan admin = defense in depth
    // lapis 1 (lapis 2 = cek isAdminActor_ di handler).
    actionLevels: { save_my_profile: 'viewer', get_config: 'admin', verifikasi_pelaporan: 'admin' },
    entityPermissions: {},
    isRefSheetFunc: isReferenceSheet_,
    resources: {
      pelaporan: {
        sheetName: 'PELAPORAN',
        pk: 'id',
        ownerField: 'pegawai_id',
        searchFields: ['judul', 'isi', 'jenis_laporan', 'tanggal', 'pegawai_id'],
        defaultSort: { field: 'tanggal', order: 'desc' },
        roles: { read: 'viewer', create: 'user', update: 'user', delete: 'user' },
        hooks: {
          preSave: typeof localPreSaveHook_ === 'function' ? localPreSaveHook_ : null
        }
      }
    },
    localHandlers: {}   // diisi file router: { nama_aksi: function(data, currentUser) {...} }
  };
}
var APP_CONFIG = getAppConfig_();
