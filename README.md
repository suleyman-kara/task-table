# Task Table

Eisenhower matrisiyle çalışan, davetle girilen sade bir görev tablosu.
Adres: https://task.suleymankara.com

- **Kurulum ve yayınlama:** [docs/SETUP.md](docs/SETUP.md)
- **Tasarım ve ekran listesi:** [design/SCREENS.md](design/SCREENS.md) (tasarım dosyaları `design/project/`)

## Teknoloji

- React 19 + TypeScript + Vite
- Firebase Authentication: üyeler e-posta bağlantısıyla, yönetici şifreyle girer
- Cloud Firestore: çevrimdışı önbellek açık, değişiklikler bağlantı gelince gönderilir
- Firebase Hosting

## Roller

| Rol | Ne yapabilir |
|---|---|
| Yönetici | Her şey. Kişi ve proje ekler/düzenler/siler |
| Düzenleyici | Kendi projelerindeki görevleri görür, ekler, düzenler, tamamlar |
| Görüntüleyici | Kendi projelerindeki görevleri yalnızca görür |

Yetkiler `firestore.rules` ile sunucuda uygulanır; testleri `tests/rules.test.ts` içindedir.

## Komutlar

```bash
npm install
```

```bash
npm run dev
```

```bash
npm run build
```

```bash
npm run test:rules
```

```bash
npm run deploy
```

## Klasörler

```
src/
  auth/      giriş ekranı, oturum, giriş işlemleri
  app/       uygulama iskeleti, matris, kartlar, görev pencereleri
  pages/     Bitenler, Kişiler, Projeler
  data/      Firestore'dan canlı veri (store) ve yazma işlemleri (actions)
  lib/       tarih ve kişi yardımcıları
  styles/    tasarım değişkenleri ve stiller
firestore.rules   veritabanı erişim kuralları
design/           tasarım prototipi ve ekran listesi
docs/             kurulum rehberi
```
