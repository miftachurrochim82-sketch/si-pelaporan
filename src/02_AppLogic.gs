// ============================================================
// SI-PELAPORAN - 02_AppLogic.gs (v2-final, pola SI-KOMPETENSI)
// Perbaikan vs versi sebelumnya:
// - F1/F2: doGet kini memakai HtmlService.createTemplateFromFile('Index')
//   + template.sessionToken/template.user lalu .evaluate(), persis pola
//   SI-KOMPETENSI. Sebelumnya createHtmlOutputFromFile langsung — scriplet
//   `<?= sessionToken ?>` di Index.html TIDAK diproses -> alur SSO/login
//   bisa rusak. (Bila Index.html tanpa scriplet, perilaku tetap sama.)
// - Selebihnya dipertahankan: handler PELAPORAN + guard pemilik + hook
//   pengunci status + analytics + dashboard sudah benar.
// ============================================================

/**
 * Entry point HTTP GET (Web App UI Entry)
 */
function doGet(e) {
  var template = HtmlService.createTemplateFromFile('index');
  template.sessionToken = '';
  template.user = {};
  template.ticket = (e && e.parameter && e.parameter.ticket) || '';
  template.isSsoEntry = Boolean((e && e.parameter && e.parameter.ticket));
  return template.evaluate()
    .setTitle(APP_TITLE)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.DEFAULT);
}

/**
 * Entry point HTTP POST (API Endpoint)
 */
function doPost(e) {
  var body = {};
  try {
    if (e && e.postData && e.postData.contents) {
      body = JSON.parse(e.postData.contents);
    }
  } catch (err) {
    return CoreLib.jsonResponse({ success: false, code: 'BAD_REQUEST', error: 'Format JSON payload tidak valid.' });
  }

  var result = handleAction(body);
  return CoreLib.jsonResponse(result);
}

function include(filename) {
  return HtmlService.createTemplateFromFile(filename).evaluate().getContent();
}

/**
 * Dispatcher lokal: APP_CONFIG + handler khas SIPELAPORAN -> dispatcher v2.
 */
function handleAction(payload) {
  var cfg = getAppConfig_();
  cfg.preSaveHook = localPreSaveHook_;
  if (cfg.resources && cfg.resources.pelaporan && cfg.resources.pelaporan.hooks) {
    cfg.resources.pelaporan.hooks.preSave = localPreSaveHook_;
  }
  cfg.localHandlers = {
    'verifikasi_pelaporan': typeof verifikasiPelaporanHandler_ === 'function' ? verifikasiPelaporanHandler_ : null,
    'dashboard': typeof apiDashboard_ === 'function' ? apiDashboard_ : null,
    'analytics': typeof getAnalytics_ === 'function' ? getAnalytics_ : null,
    'get_pegawai_list': typeof getPegawaiList_ === 'function' ? getPegawaiList_ : null,
    'get_unit_list': typeof getUnitList_ === 'function' ? getUnitList_ : null,
    'get_jabatan_list': typeof getJabatanList_ === 'function' ? getJabatanList_ : null,
    'get_my_profile': function(d, user) { return getMyProfileEnriched_(user); },
    'save_my_profile': function(d, user) { return saveMyProfile_(d, user); },
    'get_config': typeof getConfigList_ === 'function' ? getConfigList_ : null,
    'save_config_item': typeof saveConfigItem_ === 'function' ? saveConfigItem_ : null
  };

  return CoreLib.dispatchAction(payload, cfg);
}

// ==================== HELPER AKTOR & CARI ====================

function actorRole_(actor) { return String((actor && actor.role) || 'viewer').toLowerCase(); }
function isAdminActor_(actor) { var r = actorRole_(actor); return r === 'admin' || r === 'super'; }
function actorPegawaiId_(actor) { return String((actor && actor.pegawai_id) || '').trim(); }

function findPelaporanById_(id) {
  var target = String(id || '').trim();
  if (!target) return null;
  var rows = getSheetDataCached_('PELAPORAN');
  for (var i = 0; i < rows.length; i++) {
    if (!rows[i].deleted_at && String(rows[i].id || '').trim() === target) return rows[i];
  }
  return null;
}

function matchSearch_(row, q, fields) {
  if (!q) return true;
  for (var i = 0; i < fields.length; i++) {
    if (String(row[fields[i]] || '').toLowerCase().indexOf(q) !== -1) return true;
  }
  return false;
}
var PELAPORAN_SEARCH_FIELDS = ['judul', 'isi', 'jenis_laporan', 'tanggal', 'pegawai_id'];

function paginate_(rows, page, limit) {
  page = parseInt(page || 1, 10); if (isNaN(page) || page < 1) page = 1;
  limit = parseInt(limit || 10, 10); if (isNaN(limit) || limit < 1) limit = 10;
  var start = (page - 1) * limit;
  return {
    success: true,
    data: rows.slice(start, start + limit),
    meta: { total: rows.length, page: page, limit: limit, total_pages: Math.max(1, Math.ceil(rows.length / limit)) }
  };
}

// ==================== DASHBOARD ====================

function apiDashboard_(query, actor) {
  try {
    var dashboardData = {
      app_title: APP_TITLE,
      total_pelaporan: 0,
      jenis_count: {},
      tanggal_count: {},
      terbaru: [],
      total_pegawai: 0,
      total_unit: 0,
      total_jabatan: 0,
      generated_at: nowIso_(),
      generated_by: (actor && (actor.username || actor.email)) ? (actor.username || actor.email) : 'system'
    };

    // Data pelaporan
    var dataPelaporan = getSheetDataCached_('PELAPORAN').filter(function(r) { return !r.deleted_at; });
    if (dataPelaporan && dataPelaporan.length > 0) {
      dashboardData.total_pelaporan = dataPelaporan.length;
      dataPelaporan.forEach(function(item) {
        var tgl = String(item.tanggal || 'tanpa_tanggal').slice(0, 10);
        dashboardData.tanggal_count[tgl] = (dashboardData.tanggal_count[tgl] || 0) + 1;
        var jenis = String(item.jenis_laporan || 'umum').toLowerCase().trim();
        dashboardData.jenis_count[jenis] = (dashboardData.jenis_count[jenis] || 0) + 1;
      });
      // 5 terbaru berdasarkan tanggal (server-sorted)
      dashboardData.terbaru = dataPelaporan.slice().sort(function(a, b) {
        var ta = String(a.tanggal || ''), tb = String(b.tanggal || '');
        return tb < ta ? -1 : (tb > ta ? 1 : 0);
      }).slice(0, 5);
    }

    // Data referensi SIMPEG
    var pegawai = getPegawaiList_({}, actor);
    var unit = getUnitList_({}, actor);
    var jabatan = getJabatanList_({}, actor);
    if (pegawai.success) dashboardData.total_pegawai = pegawai.data.length;
    if (unit.success) dashboardData.total_unit = unit.data.length;
    if (jabatan.success) dashboardData.total_jabatan = jabatan.data.length;

    return { success: true, data: dashboardData };
  } catch (err) {
    return { success: false, code: 'BAD_REQUEST', error: err.message };
  }
}

// ==================== ANALYTICS ====================

function getAnalytics_(query, actor) {
  try {
    // Honor filter tahun/bulan dari UI analisa.
    // Kontrak: tahun = 'YYYY'; bulan = angka 1–12 ATAU nama bulan Indonesia.
    var q = query || {};
    var fTahun = String(q.tahun || (q.filters && q.filters.tahun) || '').trim();
    var fBulanRaw = (q.bulan !== undefined && q.bulan !== '') ? q.bulan : ((q.filters && q.filters.bulan) || '');
    var fBulan = parseInt(fBulanRaw, 10);
    if (isNaN(fBulan)) {
      var NAMA_BULAN = ['januari', 'februari', 'maret', 'april', 'mei', 'juni', 'juli', 'agustus', 'september', 'oktober', 'november', 'desember'];
      fBulan = NAMA_BULAN.indexOf(String(fBulanRaw || '').toLowerCase().trim()) + 1;
      if (fBulan < 1) fBulan = 0;
    }

    var total = 0;
    var ringkasan = '';
    var byJenis = {};
    var byTanggal = {};
    var byPegawai = {};
    var byBulan = {};
    var temuan = [];
    var rekomendasi = [];

    var dataPelaporan = getSheetDataCached_('PELAPORAN').filter(function(p) { return !p.deleted_at; });
    if (fTahun) dataPelaporan = dataPelaporan.filter(function(p) { return String(p.tanggal || '').slice(0, 4) === fTahun; });
    if (fBulan) dataPelaporan = dataPelaporan.filter(function(p) { return parseInt(String(p.tanggal || '').slice(5, 7), 10) === fBulan; });

    if (dataPelaporan && dataPelaporan.length > 0) {
      total = dataPelaporan.length;
      dataPelaporan.forEach(function(item) {
        var jenis = String(item.jenis_laporan || 'umum').toLowerCase().trim();
        byJenis[jenis] = (byJenis[jenis] || 0) + 1;
        var tgl = String(item.tanggal || 'tanpa_tanggal').slice(0, 10);
        byTanggal[tgl] = (byTanggal[tgl] || 0) + 1;
        var peg = String(item.pegawai_id || 'tanpa_pegawai');
        byPegawai[peg] = (byPegawai[peg] || 0) + 1;
        var bln = String(item.tanggal || '').slice(0, 7);
        if (/^\d{4}-\d{2}$/.test(bln)) byBulan[bln] = (byBulan[bln] || 0) + 1;
      });
      ringkasan = 'Total pelaporan tercatat: ' + total + ' laporan.';
    }

    if (total === 0) {
      ringkasan = 'Belum ada data pelaporan.';
      temuan.push({ level: 'kritis', pesan: 'Belum ada pelaporan yang diinput.' });
      rekomendasi.push({ prioritas: 'tinggi', tindakan: 'Sosialisasi pengisian pelaporan.' });
    } else {
      temuan.push({ level: 'info', pesan: 'Volume pelaporan terdaftar cukup baik.' });
      rekomendasi.push({ prioritas: 'rendah', tindakan: 'Pemantauan rekapitulasi pelaporan berkala.' });
    }

    return {
      success: true,
      data: {
        ringkasan: ringkasan,
        total_data: total,
        by_jenis: byJenis,
        by_tanggal: byTanggal,
        by_pegawai: byPegawai,
        by_bulan: byBulan,
        temuan: temuan,
        rekomendasi: rekomendasi,
        generated_at: nowIso_()
      }
    };
  } catch (err) {
    return { success: false, code: 'BAD_REQUEST', error: err.message };
  }
}

// ==================== VALIDATOR & HOOKS ====================

function localPreSaveHook_(canonical, record) {
  // Generate ID bila kosong — kalau lolos kosong, PK bisa jatuh ke field lain:
  // baris tersimpan tanpa id + save berikut menimpa (DATA LOSS).
  if (!record.id || String(record.id).trim() === '') {
    record.id = makeId_(String(canonical || 'rec').toLowerCase());
  }

  if (canonical === 'PELAPORAN') {
    // Jalur save generik DILARANG membawa verifikasi (anti self-approve via
    // DevTools). Baru='menunggu', update=warisi baris lama. Satu-satunya
    // penulis field verifikasi = verifikasiPelaporanHandler_ (admin, bypass hook).
    var old = findPelaporanById_(record.id);
    if (old) {
      record.status = old.status || 'menunggu';
      record.catatan_verifikator = old.catatan_verifikator || '';
      record.verifikator_id = old.verifikator_id || '';
      record.tanggal_verifikasi = old.tanggal_verifikasi || '';
    } else {
      record.status = 'menunggu';
      record.catatan_verifikator = '';
      record.verifikator_id = '';
      record.tanggal_verifikasi = '';
    }

    // Normalisasi tanggal
    if (record.tanggal) {
      var dTgl = parseTanggalBackend_(record.tanggal);
      if (dTgl) record.tanggal = dTgl.toISOString().slice(0, 10);
    }

    // Normalisasi jenis_laporan
    if (record.jenis_laporan) {
      record.jenis_laporan = String(record.jenis_laporan).toLowerCase().trim();
    }
  }

  return { record: record };
}

// ==================== PELAPORAN: LIST ====================

function getPelaporanList_(data, actor) {
  data = data || {};
  try {
    var rows = getSheetDataCached_('PELAPORAN').filter(function(row) { return !row.deleted_at; });

    // Filter
    var filters = data.filters || data;
    if (typeof filters === 'string') { try { filters = JSON.parse(filters); } catch (e) { filters = {}; } }
    var fStatus = String(filters.status || '').toLowerCase().trim();
    var fPeg = String(filters.pegawai_id || '').trim();
    var fTanggal = String(filters.tanggal || '').trim().slice(0, 10);
    var fJenis = String(filters.jenis_laporan || '').toLowerCase().trim();
    if (fStatus) rows = rows.filter(function(r) { return String(r.status || 'menunggu').toLowerCase() === fStatus; });
    if (fPeg) rows = rows.filter(function(r) { return String(r.pegawai_id || '') === fPeg; });
    if (fTanggal) rows = rows.filter(function(r) { return String(r.tanggal || '').slice(0, 10) === fTanggal; });
    if (fJenis) rows = rows.filter(function(r) { return String(r.jenis_laporan || '').toLowerCase() === fJenis; });

    // Search
    var q = String(data.search || '').toLowerCase().trim();
    if (q) rows = rows.filter(function(r) { return matchSearch_(r, q, PELAPORAN_SEARCH_FIELDS); });

    // Sortir terbaru
    rows.sort(function(a, b) {
      var ta = String(a.tanggal || ''), tb = String(b.tanggal || '');
      return tb < ta ? -1 : (tb > ta ? 1 : 0);
    });

    return paginate_(rows, data.page, data.limit);
  } catch (err) {
    return { success: false, code: 'BAD_REQUEST', error: err.message };
  }
}

// ==================== PELAPORAN: SAVE/DELETE/VERIFIKASI ====================

function savePelaporanHandler_(data, actor) {
  data = data || {};
  var record = data.record || data.row || data;
  if (!record || typeof record !== 'object') return { success: false, code: 'BAD_REQUEST', error: 'Payload record tidak valid.' };
  record = Object.assign({}, record);

  if (!isAdminActor_(actor)) {
    var myPeg = actorPegawaiId_(actor);
    if (!myPeg) return { success: false, code: 'FORBIDDEN', error: 'Akun Anda belum terhubung ke data pegawai. Hubungi admin.' };
    if (String(record.pegawai_id || '').trim() !== myPeg) {
      return { success: false, code: 'FORBIDDEN', error: 'Anda hanya boleh menyimpan pelaporan milik sendiri.' };
    }
    if (record.id && String(record.id).trim() !== '') {
      var old = findPelaporanById_(record.id);
      if (old && String(old.pegawai_id || '').trim() !== myPeg) {
        return { success: false, code: 'FORBIDDEN', error: 'Anda hanya boleh mengubah pelaporan milik sendiri.' };
      }
    }
  }

  return apiSave_('PELAPORAN', record, actor);
}

function deletePelaporanHandler_(data, actor) {
  data = data || {};
  var id = data.id || (data.record && data.record.id) || '';
  if (!id) return { success: false, code: 'BAD_REQUEST', error: 'ID pelaporan wajib diisi.' };

  if (!isAdminActor_(actor)) {
    var myPeg = actorPegawaiId_(actor);
    var row = findPelaporanById_(id);
    if (!row) return { success: false, code: 'NOT_FOUND', error: 'Pelaporan tidak ditemukan.' };
    if (!myPeg || String(row.pegawai_id || '').trim() !== myPeg) {
      return { success: false, code: 'FORBIDDEN', error: 'Anda hanya boleh menghapus pelaporan milik sendiri.' };
    }
  }

  return apiDelete_('PELAPORAN', id, actor);
}

// Satu-satunya penulis field verifikasi. Dispatcher + cek ganda admin.
function verifikasiPelaporanHandler_(data, actor) {
  data = data || {};
  if (!isAdminActor_(actor)) return { success: false, code: 'FORBIDDEN', error: 'Verifikasi hanya untuk admin.' };

  var id = data.id || '';
  var status = String(data.status || data.status_verifikasi || '').toLowerCase().trim();
  if (!id) return { success: false, code: 'BAD_REQUEST', error: 'ID pelaporan wajib diisi.' };
  if (status !== 'disetujui' && status !== 'revisi' && status !== 'ditolak') {
    return { success: false, code: 'BAD_REQUEST', error: 'Status harus "disetujui", "revisi", atau "ditolak".' };
  }

  var lock = acquireLock_();
  if (!lock) return { success: false, code: 'BUSY', error: 'Server sibuk, silakan coba lagi.' };
  try {
    var row = findPelaporanById_(id);
    if (!row) return { success: false, code: 'NOT_FOUND', error: 'Pelaporan tidak ditemukan.' };

    row.status = status;
    row.catatan_verifikator = (data.catatan_verifikator !== undefined) ? data.catatan_verifikator : (row.catatan_verifikator || '');
    row.verifikator_id = actorPegawaiId_(actor) || String(actor.id || '');
    row.tanggal_verifikasi = todayIso_();

    var saved = writeRecordNoLock_('PELAPORAN', row, true, actor); // langsung (bypass hook)
    return { success: true, data: saved };
  } catch (err) {
    return { success: false, code: 'BAD_REQUEST', error: err.message };
  } finally { try { lock.releaseLock(); } catch (e) {} }
}

// Bridges ke Core Business Engine
function apiGet_(sheetName, id, query) { return CoreLib.apiGet(SPREADSHEET_ID, sheetName, id, query, getAllHeaders_()); }
function apiSave_(sheetName, record, actor) { return CoreLib.apiSave(SPREADSHEET_ID, sheetName, record, actor, getAllHeaders_(), isReferenceSheet_, localPreSaveHook_); }
function apiDelete_(sheetName, id, actor) { return CoreLib.apiDelete(SPREADSHEET_ID, sheetName, id, actor, getAllHeaders_()); }

// ==================== HANDLER REFERENSI & PROFIL ====================
function getPegawaiList_(data, actor) {
  return { success: true, data: CoreLib.getPegawaiList(SPREADSHEET_ID, getAllHeaders_(), MASTER_SPREADSHEET_ID) };
}
function getUnitList_(data, actor) {
  return { success: true, data: CoreLib.getUnitList(SPREADSHEET_ID, getAllHeaders_(), MASTER_SPREADSHEET_ID) };
}
function getJabatanList_(data, actor) {
  return { success: true, data: CoreLib.getJabatanList(SPREADSHEET_ID, getAllHeaders_(), MASTER_SPREADSHEET_ID) };
}
function getProfile_(email) { return CoreLib.getProfile(SPREADSHEET_ID, email, getAllHeaders_(), MASTER_SPREADSHEET_ID); }

// Profil + pangkat_golongan dari master. Email SELALU dari session actor
// (anti spoof: payload d.email diabaikan total).
function getMyProfileEnriched_(actor) {
  var prof = getProfile_((actor && actor.email) || '') || actor || {};
  try {
    var email = String((actor && actor.email) || '').toLowerCase().trim();
    if (email) {
      var refs = getSheetDataCached_('PEGAWAI');
      for (var i = 0; i < refs.length; i++) {
        if (String(refs[i].email || '').toLowerCase().trim() === email) {
          prof.pangkat_golongan = refs[i].pangkat_golongan || '';
          break;
        }
      }
    }
  } catch (e) {}
  return { success: true, data: prof };
}
function saveMyProfile_(data, actor) { return CoreLib.saveMyProfile(SPREADSHEET_ID, data, actor, getAllHeaders_(), MASTER_SPREADSHEET_ID); }

function getConfigList_() {
  return { success: true, data: CoreLib.getConfigList(SPREADSHEET_ID, getAllHeaders_()) };
}
function saveConfigItem_(data, actor) { return CoreLib.saveConfigItem(SPREADSHEET_ID, data, actor, getAllHeaders_()); }

// ==================== LAUNCHER PROVISIONING ====================
function initDatabase() {
  return initDatabase_();
}

function setupApp() {
  var defaultConfigs = [
    { key: 'app_name', value: APP_TITLE, keterangan: 'Nama Aplikasi' },
    { key: 'app_version', value: '1.0.0', keterangan: 'Versi Aplikasi' },
    { key: 'instansi', value: 'Pemerintah Kabupaten Trenggalek', keterangan: 'Nama Instansi' },
    { key: 'jenis_laporan_list', value: 'rutin,insidental,khusus,pengawasan', keterangan: 'Daftar jenis laporan' }
  ];

  var params = {
    appCode: APP_CODE, appTitle: APP_TITLE, spreadsheetId: SPREADSHEET_ID,
    masterSsId: MASTER_SPREADSHEET_ID,
    platformApiUrl: PLATFORM_API_URL, headersMap: getAllHeaders_(), defaultConfigs: defaultConfigs, isRefSheetFunc: isReferenceSheet_,
    props: appProps_() // WAJIB (B15): store milik app ini, bukan store library
  };

  return CoreLib.executeAppSetup(params);
}
