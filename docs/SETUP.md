# Task Table — Firebase kurulum rehberi

Bu rehber uygulamayı **task.suleymankara.com** adresinde yayına almak için gereken adımları sırayla anlatır.
Ücretsiz (Spark) Firebase planı yeterlidir.

Toplam süre: yaklaşık 30 dakika (alan adının SSL sertifikası ayrıca birkaç saat sürebilir).

---

## 1. Firebase projesini oluşturun

1. https://console.firebase.google.com adresine gidin, **Proje ekle**'ye tıklayın.
2. Ad olarak örneğin `task-table` yazın. Google Analytics'i kapatabilirsiniz.
3. Proje açılınca sol menüde **Derleme (Build)** bölümünü kullanacağız.

## 2. Giriş yöntemlerini açın

1. **Authentication → Başlayın (Get started)**.
2. **Sign-in method** sekmesinde **E-posta/Şifre (Email/Password)** satırına tıklayın:
   - **E-posta/Şifre**: açık
   - **E-posta bağlantısı (şifresiz oturum açma)**: açık
   - Kaydedin.
3. **Settings → Authorized domains** (Yetkili alan adları) bölümüne `task.suleymankara.com` ekleyin.
4. **Templates** (Şablonlar) sekmesinde şablon dilini **Türkçe** yapın. Gönderen adını "Task Table" olarak değiştirebilirsiniz.

## 3. Yönetici hesabını oluşturun

1. **Authentication → Users → Add user**.
2. E-posta: `karasuleyman125@gmail.com`, güçlü bir şifre belirleyin.
3. İlk kez şifreyle giriş yaptığınızda uygulama bu adrese bir **doğrulama e-postası** gönderir. E-postadaki bağlantıya tıklayıp tekrar giriş yapın. Bu yalnızca bir kez gerekir.

> Yönetici adresi iki yerde yazılıdır: `firestore.rules` içindeki `adminEmail()` ve `.env` içindeki `VITE_ADMIN_EMAIL`. Değiştirirseniz ikisini birlikte değiştirin.

## 4. Veritabanını oluşturun

1. **Firestore Database → Create database**.
2. **Production mode** (üretim modu) seçin. Kurallar zaten projede hazır, birazdan yükleyeceğiz.
3. Konum olarak **eur3 (Europe)** ya da **europe-west3 (Frankfurt)** seçin. Bu sonradan değiştirilemez.

## 5. Web uygulaması ayarları

Bu adım tamamlandı: `tasktable-slmnkara` projesinin web ayarları `.env.production` dosyasında, proje adı `.firebaserc` dosyasında kayıtlı.
Bu değerler gizli değildir (tarayıcıya zaten gönderilir); güvenliği `firestore.rules` sağlar.
Başka bir Firebase projesine geçerseniz bu iki dosyayı güncelleyin.

## 6. Bilgisayarınızdan yayınlayın

Node.js 20 veya üzeri gerekir.

```bash
npm install
```

```bash
npx firebase login
```

```bash
npm run deploy
```

Bu komut uygulamayı derler ve şunları yükler: web sitesi (Hosting), veritabanı kuralları ve indeksler.
Bittiğinde `https://tasktable-slmnkara.web.app` adresinde uygulama açılır.

## 7. Alan adını bağlayın

1. **Hosting → Add custom domain** (Özel alan adı ekle) → `task.suleymankara.com`.
2. Firebase'in gösterdiği DNS kayıtlarını alan adınızın yönetim panelinde (alan adını aldığınız firma) ekleyin:
   - Doğrulama için bir **TXT** kaydı
   - Yönlendirme için **A** kayıtları (ya da gösterilen **CNAME**)
3. Firebase kayıtları gördükten sonra SSL sertifikasını kendisi oluşturur. Bu birkaç dakika ile birkaç saat arası sürebilir.

## 8. İlk kullanım

1. `https://task.suleymankara.com` adresine gidin, **Yönetici misiniz? Şifreyle giriş yapın** ile girin.
2. **Projeler** sayfasından proje gruplarını ekleyin.
3. **Kişiler** sayfasından ekip üyelerini ekleyin (ad, e-posta, izin, projeler).
4. Eklediğiniz kişiler giriş ekranına e-postalarını yazar, gelen bağlantıyla girer. Kişiler listesinde olmayan bir adres giriş yapamaz.

---

## Geliştirme (isteğe bağlı)

Firebase projesine dokunmadan yerelde denemek için emulator kullanılabilir (Java gerekir):

```bash
npx firebase emulators:start --only auth,firestore --project demo-task-table
```

Başka bir terminalde:

```bash
VITE_USE_EMULATORS=1 npm run dev
```

Güvenlik kuralı testleri:

```bash
npm run test:rules
```

## Sık karşılaşılan sorunlar

- **Giriş bağlantısı gelmiyor:** Spam klasörüne bakın. Authentication → Templates'te gönderen adresini kontrol edin.
- **"Bu e-posta davetli değil":** Kişi, Kişiler sayfasına eklenmemiş ya da e-posta farklı yazılmış.
- **Yönetici giriş yaptı ama veriler gelmiyor:** E-posta doğrulanmamış. Gelen doğrulama e-postasındaki bağlantıya tıklayıp tekrar girin.
- **Bağlantı "geçersiz" diyor:** Bağlantılar tek kullanımlıktır ve bir süre sonra geçersiz olur. Yeni bağlantı isteyin.
