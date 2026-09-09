// ============================================================
// SI-PELAPORAN - 03_SeedData.gs
// Fungsi untuk membuat data dummy (seed) pada sheet PELAPORAN.
// Digunakan untuk pengujian dan pengembangan front-end.
// Perubahan vs versi sebelumnya:
// - Bersih-bersih variabel tak terpakai; perilaku TIDAK berubah.
// - PERHATIAN: seedPelaporanData() MENGHAPUS seluruh baris PELAPORAN
//   yang ada sebelum mengisi 20 baris dummy. Jangan jalankan di
//   spreadsheet produksi yang sudah berisi data asli!
// ============================================================

/**
 * Membuat 20 baris data dummy pada sheet PELAPORAN.
 * Data lama (jika ada) akan dihapus terlebih dahulu.
 * @returns {Object} hasil operasi
 */
function seedPelaporanData() {
  var sheetName = 'PELAPORAN';
  var sh = ensureSheet_(sheetName);

  // Hapus seluruh baris lama (kecuali header)
  if (sh.getLastRow() > 1) {
    sh.getRange(2, 1, sh.getLastRow() - 1, sh.getLastColumn()).clearContent();
  }
  invalidateSheetCache_(sheetName);

  var actor = systemActor_();
  var jenisList = ['rutin', 'insidental', 'khusus', 'pengawasan'];
  var judulList = [
    'Patroli wilayah', 'Penertiban PKL', 'Pengamanan acara',
    'Pemeriksaan bangunan', 'Penyuluhan kebakaran', 'Simulasi evakuasi',
    'Pemadaman kebakaran', 'Pendataan aset', 'Rapat koordinasi',
    'Monitoring lapangan', 'Pembinaan personel', 'Pengecekan APAR',
    'Inspeksi pasar', 'Pengamanan demo', 'Operasi yustisi',
    'Pelatihan damkar', 'Penyusunan laporan', 'Pengelolaan arsip',
    'Kegiatan kebersihan', 'Pengawalan pejabat'
  ];
  var statusList = ['draft', 'disetujui', 'menunggu', 'revisi'];
  var pegawaiIds = [];
  try {
    var pegawai = CoreLib.getPegawaiList(SPREADSHEET_ID, getAllHeaders_(), MASTER_SPREADSHEET_ID);
    pegawaiIds = pegawai.map(function(p) { return p.pegawai_id; });
  } catch (e) {
    // fallback: ID dummy jika master tidak tersedia
    pegawaiIds = ['PEG-0001', 'PEG-0002', 'PEG-0003', 'PEG-0004', 'PEG-0005'];
  }
  if (!pegawaiIds.length) pegawaiIds = ['PEG-0001'];

  var now = nowIso_();
  var created = 0;
  for (var i = 0; i < 20; i++) {
    var pegawaiId = pegawaiIds[i % pegawaiIds.length];
    var tanggal = new Date();
    tanggal.setDate(tanggal.getDate() - i);
    var record = {
      id: makeId_('pelaporan'),
      pegawai_id: pegawaiId,
      tanggal: tanggal.toISOString().slice(0, 10),
      jenis_laporan: jenisList[i % jenisList.length],
      judul: judulList[i],
      isi: 'Isi laporan dummy ke-' + (i + 1) + '.',
      status: statusList[i % statusList.length],
      created_at: now,
      created_by: actor.id || 'system',
      updated_at: now,
      updated_by: actor.id || 'system',
      deleted_at: ''
    };
    writeRecordNoLock_(sheetName, record, false, actor);
    created++;
  }
  invalidateSheetCache_(sheetName);

  return {
    success: true,
    message: 'Seed data selesai: ' + created + ' baris ditambahkan ke ' + sheetName + '.',
    total: created
  };
}

/**
 * Menghapus seluruh data pada sheet PELAPORAN (tanpa menghapus header).
 * @returns {Object} hasil operasi
 */
function clearPelaporanData() {
  var sheetName = 'PELAPORAN';
  var sh = ensureSheet_(sheetName);
  if (sh.getLastRow() > 1) {
    sh.getRange(2, 1, sh.getLastRow() - 1, sh.getLastColumn()).clearContent();
  }
  invalidateSheetCache_(sheetName);
  return { success: true, message: 'Data PELAPORAN dibersihkan.' };
}
