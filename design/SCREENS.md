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
| 05 | Matris | Yönetici, düzenleyici | Main `matrix` | Tam genişlikte tek liste: üstte "Hemen yap", altında "Planla" bölümü; bölümler arası sürükle-bırak, sabitleme, tamamlama; projesiz görev örneği |
| 06 | Matris — proje filtreli | Yönetici, düzenleyici | Main `filtered` | Sol menüden (mobilde çiplerden) proje seçili; iki bölümde yalnızca o projenin görevleri. Listede projesiz görev varken "Projesiz" filtresi de çıkar |
| 07 | Matris — ilk kullanım | Yönetici, düzenleyici | Main `empty` | Hiç görev yokken; iki bölümde de ipucu ("Şu anda yapılanlar…", "Sıradaki ve ileri tarihli işler") |
| 08 | Görev ayrıntısı | Herkes | Main `detail` | Karta tıklayınca; satıra tıklayınca düzenleme |
| 09 | Görevi düzenle | Yönetici, düzenleyici | Main `edit` | Ayrıntıdan açılır, kaydedince ayrıntıya döner |
| 10 | Yeni görev | Yönetici, düzenleyici | Main `new` | Kutu (Hemen yap / Planla), proje isteğe bağlı ("Projesiz" çipi; seçilince tüm kişiler + yönetici atanabilir), sorumlular, tarihler, açıklama |
| 11 | Bitenler | Herkes | Main `done` | Geri al, tek tek ya da tümünü sil |
| 12 | Kişiler | Yönetici | Main `people` | Ekle/düzenle (izin + projeler), silme onayı |
| 13 | Projeler | Yönetici | Main `projects` | Ad + renk ile ekle, silme onayı |
| 14 | Matris — görüntüleyici | Görüntüleyici | Main `viewer` | İki bölümlü liste, salt okunur: ekleme, tamamlama, sürükleme, düzenleme yok; projesiz görevlerden yalnızca kendisine atananlar |
| 15 | Giriş — bağlantının süresi doldu | Herkes | Login `expired` | Tek kullanımlık bağlantı geçersiz; yeni bağlantı iste |
| 16 | Giriş — başka cihazda açıldı | Herkes | Login `other-device` | Girişi tamamlamak için e-postayı yeniden iste |
| 17 | Yönetici girişi — şifre hatalı | Yönetici | Login `admin-error` | Alan altında hata; "Şifremi unuttum" |
| 18 | Giriş yapılıyor | Herkes | Login `loading` | Sade ilerleme çubuğu |
| 19 | Veri yükleniyor | Herkes | Main `loading` | İki bölümde iskelet satırlar, sayılar gizli |
| 20 | Bağlantı yok / kaydedilemedi | Herkes | Main `offline` | İki bölümlü liste; üstte bağlantı uyarısı, altta "Tekrar dene" bildirimi |
| 21 | Proje düzenle | Yönetici | Main `projects-edit` | Ad ve renk değiştirme |

Pencere içi durumlar (ayrı ekran sayılmadı, bileşen sayfasında gösterildi): geri alma çubuğu,
bırakma alanı vurgusu, gecikmiş görev, sabitlenmiş kart, silme onayları, form hataları.

## Geliştirici notları
- Giriş ekranındaki "Yalnızca prototip" bölümü gerçek uygulamada olmayacak.
- Tarihler gg.aa.yyyy biçiminde gösterilmeli (tarayıcının varsayılan tarih alanı yerine Türkçe biçim).
- Telefonda kartı parmakla sürükleme tarayıcının sürükle-bırak özelliğiyle çalışmaz; dokunmatik sürükleme ayrıca eklenmeli. O zamana kadar kutu, ayrıntı ekranından değiştirilir.
- Görüntüleyici izni sunucu tarafında da uygulanmalı (yalnızca arayüzde gizlemek yetmez).
- "Devret" ve "Bırak" kutuları kaldırıldı: bu kutulardaki eski görevler "Planla"ya taşınmalı (taşıma/migrasyon).
- Projesiz görevleri yalnızca yönetici ve atanan kişiler görür; bu kural da sunucu tarafında uygulanmalı.
