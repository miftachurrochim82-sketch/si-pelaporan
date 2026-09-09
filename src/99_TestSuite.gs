// ============================================================
// SI-PELAPORAN - 99_TestSuite.gs (v2-final)
// Perbaikan vs versi sebelumnya:
// - FATAL FIX: file 04_TestSeed.gs DIGABUNG ke sini. Sebelumnya
//   testSeedPelaporan() terdefinisi DOBEL (di 99 & di 04) -> V8
//   SyntaxError saat load -> SELURUH proyek gagal (doGet/doPost mati).
//   >>> HAPUS file 04_TestSeed.gs setelah memakai versi ini. <<<
// - Pola v2 (mengikuti SI-KOMPETENSI 99_Test.gs):
//   * runLibraryTests() = SATU pintu: CoreLib.runCoreTests(testCtx_)
//     (22 regression tests library v2).
//   * Tes CRUD di sheet isolasi ZZ_TEST_CRUD — DILARANG menulis
//     dummy ke sheet produksi.
// - TAMBAH testPelaporanGuards(): uji guard pemilik, kunci status,
//   verifikasi admin + persistensi field verifikasi (regresi F2:
//   kolom catatan_verifikator/verifikator_id/tanggal_verifikasi).
// - Seed data (destruktif!) DIPISAHKAN dari runAllTests: hanya
//   dijalankan manual via testSeedPelaporan()/runSeedAndDashboardTest().
// Urutan setup: setupApp() -> initDatabase() -> runLibraryTests().
// ============================================================

// ctx kontrak v2: { ssId, ssIdB?, masterSsId?, headersMap, isRefFunc?, platformApiUrl?, appCode? }
function testCtx_() {
  return {
    appCode: APP_CODE,
    ssId: SPREADSHEET_ID,
    masterSsId: MASTER_SPREADSHEET_ID,
    // Opsional: isi Properties TEST_SS_ID_B (ID spreadsheet uji ke-2) agar
    // testCacheIsolation ikut PASS; bila kosong ia SKIP (wajar).
    ssIdB: appProps_().getProperty('TEST_SS_ID_B') || '',
    platformApiUrl: PLATFORM_API_URL,
    headersMap: getAllHeaders_(), // wajib memuat ZZ_TEST_CRUD (ada di file 01)
    isRefFunc: isReferenceSheet_
  };
}

/**
 * Regression tests library v2. Target: failed:0.
 * (SKIP wajar hanya untuk testCacheIsolation bila TEST_SS_ID_B kosong.)
 */
function runLibraryTests() {
  Logger.log('==========================================================');
  Logger.log('🧪 REGRESSION TESTS LIBRARY v2 (dari ' + APP_CODE + ')');
  Logger.log('==========================================================');
  var recap = CoreLib.runCoreTests(testCtx_());
  Logger.log('REKAP: PASS ' + recap.passed + ' / FAIL ' + recap.failed + ' / SKIP ' + recap.skipped);
  (recap.results || []).forEach(function(r) {
    Logger.log((r.status === 'PASS' ? '✅' : (r.status === 'SKIP' ? '⏭️' : '❌')) + ' ' + r.test + (r.detail ? ' — ' + r.detail : ''));
  });
  return recap;
}

// ==================== DIAGNOSTIK ====================

function runAllDiagnostics() {
  Logger.log('==========================================================');
  Logger.log('🔍 MEMULAI DIAGNOSTIK KESEHATAN SI-PELAPORAN');
  Logger.log('==========================================================');

  try {
    Logger.log('✅ DB lokal tersambung: ' + getDb_().getName());
  } catch (e) {
    Logger.log('❌ DB lokal GAGAL dibuka: ' + e.message);
  }

  // Skema check-only (tidak membuat sheet)
  try {
    var ss = getDb_();
    Object.keys(LOCAL_SHEET_NAMES).forEach(function(name) {
      var sh = ss.getSheetByName(name);
      if (!sh) {
        Logger.log((isReferenceSheet_(name) ? '⚠️ ' : '❌ ') + name + ' : sheet TIDAK ADA' + (isReferenceSheet_(name) ? ' (wajar — baca via master).' : ' (jalankan initDatabase!).'));
      } else {
        Logger.log('✅ ' + name + ' : ada (' + Math.max(0, sh.getLastRow() - 1) + ' baris).');
      }
    });
  } catch (e) {
    Logger.log('❌ Cek skema gagal: ' + e.message);
  }

  try {
    Logger.log('✅ PELAPORAN       : ' + readRecordsNoLock_('PELAPORAN').length + ' baris.');
  } catch (e) { Logger.log('❌ PELAPORAN : ' + e.message); }
  try {
    Logger.log('✅ PEGAWAI (master): ' + readRecordsNoLock_('PEGAWAI').length + ' data.');
  } catch (e) { Logger.log('❌ PEGAWAI : ' + e.message + ' (cek MASTER_SPREADSHEET_ID!)'); }
  try {
    Logger.log('✅ KONFIGURASI     : ' + readRecordsNoLock_('KONFIGURASI').length + ' item.');
  } catch (e) { Logger.log('❌ KONFIGURASI : ' + e.message); }
  Logger.log('🏁 DIAGNOSTIK SELESAI');
}

// ==================== SUITE AMAN (runAllTests) ====================
// Tanpa seed (destruktif) dan tanpa tulis ke sheet produksi.

function runAllTests() {
  Logger.log('==========================================================');
  Logger.log('🧪 TEST SUITE BACKEND SI-PELAPORAN');
  Logger.log('==========================================================');

  var tests = [
    { name: 'DatabaseConnection', fn: testDatabaseConnection },
    { name: 'SheetSchema', fn: testSheetSchema },
    { name: 'CRUD_ZZ_TEST_CRUD', fn: testCrudIsolated },
    { name: 'Dashboard', fn: testDashboard },
    { name: 'ReferensiSIMPEG', fn: testReferensiSIMPEG },
    { name: 'ReadOnlyMaster', fn: testReadOnlyMaster },
    { name: 'AuthSSO_Negatif', fn: testAuthSsoNegatif }
  ];

  var passed = 0;
  var failed = 0;
  var skipped = 0;
  var details = [];

  tests.forEach(function(t) {
    try {
      t.fn();
      passed++;
      details.push({ test: t.name, status: 'PASS' });
      Logger.log('✅ ' + t.name + ' lulus.');
    } catch (e) {
      failed++;
      details.push({ test: t.name, status: 'FAIL', detail: e.message });
      Logger.log('❌ ' + t.name + ' gagal: ' + e.message);
    }
  });

  Logger.log('----------------------------------------------------------');
  Logger.log('REKAP: PASS ' + passed + ' / FAIL ' + failed + ' / SKIP ' + skipped);
  Logger.log('ℹ️ Uji lanjutan (manual): testPelaporanGuards(), testSeedPelaporan(), runLibraryTests().');
  Logger.log('==========================================================');

  return { passed: passed, failed: failed, skipped: skipped, details: details };
}

function testDatabaseConnection() {
  var ss = getDb_();
  if (!ss || !ss.getName()) throw new Error('Database lokal tidak bisa dibuka.');
  Logger.log('  ℹ️ DB: ' + ss.getName());
}

function testSheetSchema() {
  var requiredSheets = ['KONFIGURASI', 'MAIN_DATA', 'AUDIT_LOGS', 'ZZ_TEST_CRUD', 'PELAPORAN'];
  var ss = getDb_();
  requiredSheets.forEach(function(name) {
    var sh = ss.getSheetByName(name);
    if (!sh) throw new Error('Sheet ' + name + ' tidak ada. Jalankan setupApp()/initDatabase() dulu.');
    Logger.log('  ℹ️ Sheet ' + name + ' ada (' + Math.max(0, sh.getLastRow() - 1) + ' baris).');
  });
  // Regresi F2: header PELAPORAN wajib memuat kolom verifikasi.
  var sh = ss.getSheetByName('PELAPORAN');
  var headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(String);
  ['catatan_verifikator', 'verifikator_id', 'tanggal_verifikasi'].forEach(function(col) {
    if (headers.indexOf(col) === -1) {
      throw new Error('Header PELAPORAN kekurangan kolom ' + col + '. Jalankan initDatabase() ulang / tambah kolom manual.');
    }
  });
  Logger.log('  ℹ️ Header PELAPORAN memuat kolom verifikasi. ✅');
}

// CRUD aman di sheet uji (BUKAN di PELAPORAN produksi!)
function testCrudIsolated() {
  var actor = systemActor_();
  var testId = 'ITEST-' + new Date().getTime();
  var n0 = readRecordsNoLock_('ZZ_TEST_CRUD').length;
  var ins = apiSave_('ZZ_TEST_CRUD', { id: testId, nama: 'uji awal', no_hp: '081234567890' }, actor);
  var n1 = readRecordsNoLock_('ZZ_TEST_CRUD').length;
  var upd = apiSave_('ZZ_TEST_CRUD', { id: testId, nama: 'uji ubah' }, actor);
  var got = apiGet_('ZZ_TEST_CRUD', testId, {});
  var del = apiDelete_('ZZ_TEST_CRUD', testId, actor);
  hardDeleteRecordNoLock_('ZZ_TEST_CRUD', testId, actor);
  var n2 = readRecordsNoLock_('ZZ_TEST_CRUD').length;
  var crudOk = ins.success && upd.success && del.success && got.success && got.data && got.data.nama === 'uji ubah' && n1 === n0 + 1 && n2 === n0;
  if (!crudOk) throw new Error('CRUD ZZ_TEST_CRUD gagal (cek tiap langkah).');
  Logger.log('  ℹ️ CRUD ZZ_TEST_CRUD sukses + bersih total.');
}

function testDashboard() {
  var res = apiDashboard_({}, systemActor_());
  if (!res.success) throw new Error('Dashboard error: ' + res.error);
  if (!res.data || typeof res.data.total_pegawai !== 'number') {
    throw new Error('Dashboard tidak mengembalikan metrik yang benar.');
  }
  if (!Array.isArray(res.data.terbaru)) throw new Error('Dashboard tidak mengirim terbaru[].');
  var an = getAnalytics_({}, systemActor_());
  if (!an.success || !an.data.by_tanggal || !an.data.by_pegawai || !an.data.by_bulan) {
    throw new Error('Analytics tidak mengirim by_tanggal/by_pegawai/by_bulan.');
  }
  Logger.log('  ℹ️ Dashboard: ' + res.data.total_pegawai + ' pegawai, ' +
             res.data.total_unit + ' unit, ' + res.data.total_jabatan + ' jabatan.');
}

function testReferensiSIMPEG() {
  var pegawai = getPegawaiList_({}, systemActor_());
  var unit = getUnitList_({}, systemActor_());
  var jabatan = getJabatanList_({}, systemActor_());
  if (!pegawai.success || !Array.isArray(pegawai.data) || pegawai.data.length === 0) {
    throw new Error('PEGAWAI tidak terbaca dari master.');
  }
  if (!unit.success || !Array.isArray(unit.data) || unit.data.length === 0) {
    throw new Error('UNIT_KERJA tidak terbaca dari master.');
  }
  if (!jabatan.success || !Array.isArray(jabatan.data) || jabatan.data.length === 0) {
    throw new Error('JABATAN tidak terbaca dari master.');
  }
  Logger.log('  ℹ️ Referensi: ' + pegawai.data.length + ' pegawai, ' +
             unit.data.length + ' unit, ' + jabatan.data.length + ' jabatan.');
}

// Proteksi read-only master: menulis ke PEGAWAI harus throw.
function testReadOnlyMaster() {
  var threw = false;
  try {
    writeRecordNoLock_('PEGAWAI', { pegawai_id: 'X-FORBIDDEN', nama: 'x' }, false, systemActor_());
  } catch (e) {
    threw = true;
  }
  if (!threw) throw new Error('Proteksi read-only jebol: PEGAWAI bisa ditulis!');
  Logger.log('  ℹ️ Write ke PEGAWAI ditolak (read-only terjaga).');
}

// Auth SSO negatif: tiket palsu harus ditolak (tanpa testMode!).
function testAuthSsoNegatif() {
  var threw = false;
  try {
    validatePlatformTicket_('tiket_palsu_' + new Date().getTime());
  } catch (e) {
    threw = true;
    Logger.log('  ℹ️ Tiket palsu ditolak: ' + String(e.message).substring(0, 80));
  }
  if (!threw) throw new Error('Tiket palsu malah diterima!');
}

// ==================== DIAGNOSTIK SSO KE PORTAL ====================

/**
 * Cek koneksi mentah ke Portal SSO (tanpa tiket valid). Bila portal
 * mengembalikan HTML login alih-alih JSON, berarti deploy portal belum
 * "Anyone".
 */
function testKoneksiKePortalSso() {
  Logger.log('==========================================================');
  Logger.log('🔍 DIAGNOSTIK KONEKSI SSO KE PORTAL UTAMA');
  Logger.log('==========================================================');
  Logger.log('• URL Portal : ' + PLATFORM_API_URL);
  Logger.log('• APP_CODE   : ' + APP_CODE);

  try {
    var payload = {
      method: 'POST',
      path: '/api/v1/auth/validate-ticket',
      data: {
        ticket: 'st_TEST_DIAGNOSTIK_123',
        appCode: APP_CODE
      }
    };

    var options = {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify(payload),
      muteHttpExceptions: true,
      followRedirects: true
    };

    var response = UrlFetchApp.fetch(PLATFORM_API_URL, options);
    var statusCode = response.getResponseCode();
    var content = response.getContentText();

    Logger.log('• HTTP Status Code : ' + statusCode);
    Logger.log('• Isi Respons Raw  : ' + content.substring(0, 300));

    if (statusCode === 200) {
      if (content.trim().startsWith('{') || content.trim().startsWith('[')) {
        var json = JSON.parse(content);
        Logger.log('✅ Portal merespons JSON dengan BENAR!');
        Logger.log('• Pesan Portal: ' + JSON.stringify(json));
      } else {
        Logger.log('❌ KESALAHAN UTAMA TERDETEKSI:');
        Logger.log('👉 Portal mengembalikan halaman HTML Login Google, BUKAN data JSON.');
        Logger.log('👉 PENYEBAB: Setelan "Siapa yang memiliki akses" di Portal SSO BELUM disetel ke "Siapa saja" (Anyone).');
      }
    } else {
      Logger.log('❌ HTTP ERROR ' + statusCode + ': Portal menolak koneksi.');
    }

  } catch (err) {
    Logger.log('❌ ERROR EXCEPTION: ' + err.message);
  }
  Logger.log('==========================================================');
}

/**
 * Uji SSO end-to-end (tiket valid -> exchange -> session -> logout).
 * Dapatkan tiket valid dari Portal SSO pusat, tempel di bawah, lalu
 * jalankan dari editor.
 */
function testFullSsoIntegrationFlow() {
  Logger.log('==========================================================');
  Logger.log('🚀 MEMULAI PENGUJIAN INTEGRASI ALUR PENUH SSO (' + APP_CODE + ')');
  Logger.log('==========================================================');

  // Ganti dengan tiket valid yang Anda dapatkan dari Global App
  var ticketValid = ''; // <<< ISI TIKET VALID DI SINI

  if (!ticketValid) {
    Logger.log('❌ Tiket valid belum diisi. Silakan generate tiket dari Global App lalu isi variabel ticketValid.');
    return;
  }

  Logger.log('1️⃣ Menukarkan Tiket SSO ke Backend Aplikasi Lokal...');
  var exchangeResult = exchangePlatformTicket(ticketValid);

  if (!exchangeResult.success) {
    Logger.log('❌ GAGAL MENUKAR TIKET: ' + exchangeResult.error);
    return;
  }

  Logger.log('2️⃣ Memverifikasi session token...');
  var auth = checkAuth_(exchangeResult.data.token, 'viewer');
  Logger.log(auth.success
    ? '✅ Session valid: ' + auth.user.email + ' [' + auth.user.role + '] pegawai_id=' + (auth.user.pegawai_id || '(kosong — cek masterSsId!)')
    : '❌ Session TIDAK valid: ' + auth.error);

  Logger.log('3️⃣ Membersihkan session uji (logout)...');
  logout_(exchangeResult.data.token);

  Logger.log('==========================================================');
  Logger.log('🎉 PENGUJIAN INTEGRASI SSO 100% SUKSES!');
  Logger.log('• User Logged In : ' + exchangeResult.data.user.display_name + ' (' + exchangeResult.data.user.email + ')');
  Logger.log('==========================================================');
}

// ==================== UJI PROTEKSI PELAPORAN ====================

/**
 * Uji guard PELAPORAN. Menulis 2 baris uji sungguhan ke PELAPORAN
 * lalu hard-cleanup total. Target: semua ✅.
 * Sekaligus regresi F2: field verifikasi harus PERSIST di sheet.
 */
function testPelaporanGuards() {
  Logger.log('==========================================================');
  Logger.log('🛡️ UJI PROTEKSI PELAPORAN');
  Logger.log('==========================================================');
  var admin = { id: 'U-ADMIN', email: 'admin@uji.id', role: 'admin', pegawai_id: 'PEG-ADMIN' };
  var pegA = { id: 'U-A', email: 'a@uji.id', role: 'viewer', pegawai_id: 'PEG-UJI-A' };
  var pegB = { id: 'U-B', email: 'b@uji.id', role: 'viewer', pegawai_id: 'PEG-UJI-B' };
  var noPeg = { id: 'U-X', email: 'x@uji.id', role: 'viewer', pegawai_id: '' };
  var ok = 0, fail = 0;
  function verdict(cond, label) {
    if (cond) { ok++; Logger.log('✅ ' + label); } else { fail++; Logger.log('❌ ' + label); }
  }

  // 1. Viewer simpan milik sendiri (bawa status palsu) -> OK, id ter-generate,
  //    status terkunci 'menunggu' oleh hook.
  var r1 = savePelaporanHandler_({ record: { id: '', pegawai_id: 'PEG-UJI-A', tanggal: todayIso_(), jenis_laporan: 'rutin', judul: 'UJI-GUARD-A', isi: 'isi', status: 'disetujui' } }, pegA);
  var idA = (r1.success && r1.data) ? r1.data.id : '';
  verdict(r1.success && idA, 'viewer save milik sendiri + id ter-generate');
  verdict(r1.success && r1.data.status === 'menunggu', 'status bawaan user DIKUNCI jadi menunggu');

  // 2. Viewer simpan sebagai orang lain -> TOLAK
  var r2 = savePelaporanHandler_({ record: { pegawai_id: 'PEG-UJI-B', judul: 'BAJAK', isi: 'x', tanggal: todayIso_() } }, pegA);
  verdict(!r2.success, 'viewer save milik orang DITOLAK');

  // 3. Viewer tanpa link pegawai -> TOLAK
  var r3 = savePelaporanHandler_({ record: { pegawai_id: 'PEG-UJI-A', judul: 'X', isi: 'x', tanggal: todayIso_() } }, noPeg);
  verdict(!r3.success, 'viewer tanpa link pegawai DITOLAK');

  // 4. Viewer verifikasi -> TOLAK
  var r4 = verifikasiPelaporanHandler_({ id: idA, status: 'disetujui' }, pegA);
  verdict(!r4.success, 'viewer verifikasi DITOLAK');

  // 5. Admin verifikasi -> OK + field verifikasi PERSIST (regresi F2)
  var r5 = verifikasiPelaporanHandler_({ id: idA, status: 'disetujui', catatan_verifikator: 'uji ok' }, admin);
  var row5 = findPelaporanById_(idA);
  verdict(r5.success && r5.data.verifikator_id === 'PEG-ADMIN', 'admin verifikasi OK + verifikator tercatat');
  verdict(!!row5 && row5.status === 'disetujui' && row5.catatan_verifikator === 'uji ok' && !!row5.tanggal_verifikasi,
          'field verifikasi PERSIST di sheet (catatan/verifikator/tanggal)');

  // 6. Edit user (bawa status palsu) tak goyahkan verifikasi
  var r6 = savePelaporanHandler_({ record: { id: idA, pegawai_id: 'PEG-UJI-A', tanggal: todayIso_(), jenis_laporan: 'rutin', judul: 'edit', isi: 'isi', status: 'revisi' } }, pegA);
  var kept = r6.success && findPelaporanById_(idA).status === 'disetujui';
  verdict(kept, 'edit user tak goyahkan status verifikasi');

  // 7. Baris ke-2 (admin tulis sebagai B)
  var rB = savePelaporanHandler_({ record: { pegawai_id: 'PEG-UJI-B', tanggal: todayIso_(), jenis_laporan: 'khusus', judul: 'UJI-GUARD-B', isi: 'isi' } }, admin);
  var idB = (rB.success && rB.data) ? rB.data.id : '';
  verdict(rB.success && idB && idB !== idA, 'admin save sebagai B OK + id unik');

  // 8. Viewer hapus milik orang -> TOLAK; hapus milik sendiri -> OK
  var r8 = deletePelaporanHandler_({ id: idB }, pegA);
  verdict(!r8.success, 'viewer hapus milik orang DITOLAK');
  var r9 = deletePelaporanHandler_({ id: idA }, pegA);
  verdict(r9.success, 'viewer hapus milik sendiri OK');

  // 9. Search + filter + paginasi meta
  var s = getPelaporanList_({ search: 'UJI-GUARD-B' }, admin);
  verdict(s.success && s.data.length === 1, 'search menemukan 1 baris');
  var f = getPelaporanList_({ filters: { jenis_laporan: 'khusus' } }, admin);
  verdict(f.success && f.data.length >= 1, 'filter jenis_laporan jalan');
  var pg = getPelaporanList_({ page: 1, limit: 1 }, admin);
  verdict(pg.success && pg.meta && pg.meta.total_pages >= 1, 'paginasi kirim meta total_pages');

  // 10. Analytics (by_tanggal + by_pegawai + by_bulan + filter)
  var an = getAnalytics_({}, admin);
  verdict(an.success && an.data.by_tanggal && an.data.by_pegawai && an.data.by_bulan, 'analytics kirim by_tanggal + by_pegawai + by_bulan');
  var anf = getAnalytics_({ tahun: '1999' }, admin);
  verdict(anf.success && anf.data.total_data === 0, 'analytics filter tahun jalan');
  var anb = getAnalytics_({ bulan: 'Januari' }, admin);
  verdict(anb.success && anb.data.by_bulan !== undefined, 'analytics filter bulan (nama) jalan');

  // Cleanup total
  if (idA) hardDeleteRecordNoLock_('PELAPORAN', idA, systemActor_());
  if (idB) hardDeleteRecordNoLock_('PELAPORAN', idB, systemActor_());
  Logger.log('REKAP GUARD: ' + ok + ' lolos, ' + fail + ' gagal.' + (fail === 0 ? ' 🎉' : ' — CEK YANG ❌!'));
}

// ==================== UJI SEED (DESTRUKTIF — MANUAL SAJA) ====================
// ⚠️ seedPelaporanData() MENGHAPUS seluruh baris PELAPORAN sebelum mengisi
// 20 baris dummy. Jangan masukkan ke runAllTests(); jalankan manual saja
// di spreadsheet pengembangan.

/**
 * Menguji proses seed data PELAPORAN (gabungan dari 04_TestSeed.gs lama).
 */
function testSeedPelaporan() {
  Logger.log('==========================================================');
  Logger.log('🧪 TEST SEED DATA PELAPORAN');
  Logger.log('==========================================================');

  // 1. Bersihkan dulu
  clearPelaporanData();
  Logger.log('✅ Sheet dibersihkan.');

  // 2. Jalankan seed
  var res = seedPelaporanData();
  Logger.log('ℹ️ ' + res.message);

  // 3. Baca kembali dan cek jumlah
  var rows = readRecordsNoLock_('PELAPORAN').filter(function(r) { return !r.deleted_at; });
  if (rows.length === 20) {
    Logger.log('✅ Jumlah baris sesuai: ' + rows.length);
  } else {
    Logger.log('❌ Jumlah baris TIDAK sesuai: ' + rows.length + ' (harus 20)');
  }

  // 4. Tampilkan 3 sampel
  Logger.log('--- Sampel 3 baris ---');
  for (var i = 0; i < 3; i++) {
    if (rows[i]) {
      Logger.log('• ' + rows[i].id + ' | ' + rows[i].judul + ' | ' + rows[i].status);
    }
  }

  Logger.log('🏁 TEST SEED SELESAI');
}

/**
 * Uji cepat integrasi dashboard + seed.
 */
function runSeedAndDashboardTest() {
  var seedRes = seedPelaporanData();
  Logger.log('ℹ️ Seed: ' + seedRes.message);

  var dashRes = apiDashboard_({}, systemActor_());
  if (dashRes.success) {
    Logger.log('✅ Dashboard memuat data: total pelaporan=' + dashRes.data.total_pelaporan +
               ', total pegawai=' + dashRes.data.total_pegawai +
               ', total unit=' + dashRes.data.total_unit +
               ', total jabatan=' + dashRes.data.total_jabatan);
  } else {
    Logger.log('❌ Dashboard gagal: ' + dashRes.error);
  }
}
