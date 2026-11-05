# Task Table — Ekran listesi

Her ekran hem masaüstü (1440×900) hem mobil (390×844) olarak çizildi.
Tasarım dosyaları `design/project/` altında: `dNN-*.dc.html` masaüstü, `mNN-*.dc.html` mobil.
Bu dosyalar, `Main.dc.html` ve `Login.dc.html` bileşenlerini `screen` ayarıyla gösterir.

| # | Ekran | Kim görür | `screen` | Açıklama |
|---|---|---|---|---|
| 01 | Giriş | Herkes | Login `form` | E-postaya tek kullanımlık giriş bağlantısı |
| 02 | Giriş — davetli değil | Herkes | Login `denied` | Kişiler listesinde olmayan e-posta için hata |
| 03 | Giriş — bağlantı gönderildi | Herkes | Login `sent` | "E-postanızı kontrol edin", 30 sn bekleme ile tekrar gönder |
| 04 | Yönetici girişi | Yönetici | Login `admin` | E-posta + şifre |
| 05 | Matris | Yönetici, düzenleyici | Main `matrix` | 2×2 Eisenhower matrisi, sürükle-bırak, sabitleme, tamamlama |
| 06 | Matris — proje filtreli | Yönetici, düzenleyici | Main `filtered` | Sol menüden (mobilde çiplerden) proje seçili |
| 07 | Matris — ilk kullanım | Yönetici, düzenleyici | Main `empty` | Hiç görev yokken |
| 08 | Görev ayrıntısı | Herkes | Main `detail` | Karta tıklayınca; satıra tıklayınca düzenleme |
| 09 | Görevi düzenle | Yönetici, düzenleyici | Main `edit` | Ayrıntıdan açılır, kaydedince ayrıntıya döner |
| 10 | Yeni görev | Yönetici, düzenleyici | Main `new` | Kutu, proje, sorumlular, tarihler, açıklama |
| 11 | Bitenler | Herkes | Main `done` | Geri al, tek tek ya da tümünü sil |
| 12 | Kişiler | Yönetici | Main `people` | Ekle/düzenle (izin + projeler), silme onayı |
| 13 | Projeler | Yönetici | Main `projects` | Ad + renk ile ekle, silme onayı |
| 14 | Matris — görüntüleyici | Görüntüleyici | Main `viewer` | Salt okunur: ekleme, tamamlama, sürükleme, düzenleme yok |
| 15 | Giriş — bağlantının süresi doldu | Herkes | Login `expired` | Tek kullanımlık bağlantı geçersiz; yeni bağlantı iste |
| 16 | Giriş — başka cihazda açıldı | Herkes | Login `other-device` | Girişi tamamlamak için e-postayı yeniden iste |
| 17 | Yönetici girişi — şifre hatalı | Yönetici | Login `admin-error` | Alan altında hata; "Şifremi unuttum" |
| 18 | Giriş yapılıyor | Herkes | Login `loading` | Sade ilerleme çubuğu |

Pencere içi durumlar (ayrı ekran sayılmadı, bileşen sayfasında gösterildi): geri alma çubuğu,
bırakma alanı vurgusu, gecikmiş görev, sabitlenmiş kart, silme onayları, form hataları.

Henüz tasarlanmamış, gerçek uygulamada gerekecek olanlar:
- Yükleniyor durumu (Firebase'den veri gelirken)
- Bağlantı yok / kaydetme hatası bildirimi
