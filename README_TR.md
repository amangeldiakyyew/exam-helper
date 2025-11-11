# PDF Tarayıcı - Electron Uygulaması

Modern bir PDF tarama ve öğrenci rapor yönetim sistemi. Electron, React, TypeScript ve Tailwind CSS ile geliştirilmiştir.

## 🚀 Özellikler

- ✅ **Modüler Mimari** - Temiz, bakımı kolay kod yapısı
- ✅ **IPC İletişim** - Electron Main ve Renderer process'leri arası güvenli iletişim
- ✅ **Sınıf Yönetimi** - Sınıf oluşturma, düzenleme ve silme
- ✅ **Öğrenci Yönetimi** - Öğrenci bilgilerini kaydetme ve düzenleme
- ✅ **Excel İçe Aktarma** - Toplu öğrenci yükleme
- ✅ **PDF Ayrıştırma** - PDF'lerden öğrenci raporlarını otomatik ayırma
- ✅ **Akıllı Eşleştirme** - İsim tabanlı sayfa eşleştirme
- ✅ **Dosya Sisteminde Saklama** - Bellek tasarrufu için dosya tabanlı saklama
- ✅ **ZIP İndirme** - Tüm raporları toplu indirme
- ✅ **TypeScript** - Tip güvenli kod
- ✅ **Tailwind CSS** - Modern ve responsive UI

## 📁 Proje Yapısı

```
reactor/
├── electron/                    # Electron Main Process
│   ├── main.ts                 # Ana Electron dosyası + IPC handlers
│   ├── preload.ts              # Preload script (IPC bridge)
│   └── modules/                # Modüler backend mantığı
│       ├── dataManager.ts      # JSON veri yönetimi
│       └── pdfParser.ts        # PDF ayrıştırma mantığı
│
├── src/                        # React Renderer Process
│   ├── components/             # React bileşenleri
│   │   ├── Layout.tsx          # Ana layout ve navigasyon
│   │   ├── Settings.tsx        # Sınıf ve öğrenci yönetimi
│   │   ├── PdfParsing.tsx      # PDF ayrıştırma arayüzü
│   │   └── button.tsx          # Paylaşımlı button bileşeni
│   │
│   ├── hooks/                  # Custom React hooks
│   │   └── useIpc.ts           # IPC iletişim hook'u
│   │
│   ├── types/                  # TypeScript tip tanımları
│   │   └── index.ts            # Tüm arayüz tanımları
│   │
│   ├── app.tsx                 # Ana uygulama bileşeni
│   └── main.tsx                # React entry point
│
└── package.json                # Bağımlılıklar ve scriptler
```

## 🛠️ Kurulum

### Gereksinimler

- Node.js 18+ veya Bun
- npm, pnpm, yarn veya bun

### Bağımlılıkları Yükleyin

```bash
cd reactor
bun install
# veya
npm install
```

## 🎯 Kullanım

### Geliştirme Modu

```bash
bun run dev
# veya
npm run dev
```

### Üretim Build

```bash
bun run build:desktop
# veya
npm run build:desktop
```

Build dosyaları `release/` klasöründe oluşturulacaktır.

## 📖 Nasıl Kullanılır

### 1. Sınıf Oluşturma

- **Ayarlar** sekmesine gidin
- Yeni sınıf adı girin (örn: 5-A)
- **Sınıfı Oluştur** butonuna tıklayın

### 2. Öğrenci Ekleme

#### Tek Öğrenci Ekle
- Sınıf seçin
- **Tek Öğrenci Ekle** sekmesine gidin
- Öğrenci bilgilerini doldurun (Ad Soyad, Okul No, Veli Bilgileri)
- **Öğrenciyi Ekle/Güncelle** butonuna tıklayın

#### Excel ile Toplu Yükleme
- **Excel ile Toplu Yükleme** sekmesine gidin
- **Excel Dosyası Seç ve Yükle** butonuna tıklayın
- Excel dosyanızı seçin

**Excel Format:**
- Sütunlar: Ad Soyad, Okul No, Anne Adı Soyadı, Anne E-posta, Anne Telefon, Baba Adı Soyadı, Baba E-posta, Baba Telefon

### 3. PDF Ayrıştırma

- **PDF Ayrıştırma** sekmesine gidin
- Ayrıştırılacak sınıfı seçin
- **PDF Dosyası Seç ve Ayrıştır** butonuna tıklayın
- PDF dosyanızı seçin
- Sistem otomatik olarak:
  - Her öğrenci için sayfaları bulur
  - Eşleşen metinleri gösterir
  - Bulunamayan öğrencileri listeler

### 4. Raporları İndirme

- Tek PDF: Her rapor için **İndir** butonuna tıklayın
- Toplu ZIP: 
  - **ZIP (Okul No)** - Okul numarası ile adlandırılmış
  - **ZIP (İsim)** - Öğrenci adı ile adlandırılmış

## 🏗️ Mimari

### IPC İletişim

Uygulama Electron'un `ipcMain` (backend) ve `ipcRenderer` (frontend) kullanarak güvenli iletişim kurar:

```typescript
// Frontend (React)
const result = await window.ipcRenderer.invoke('get-classes');

// Backend (Electron)
ipcMain.handle('get-classes', async () => {
  return await getClasses();
});
```

### Veri Akışı

1. **Kullanıcı Eylemi** (React Component)
2. **IPC Çağrısı** (useIpc Hook)
3. **Backend İşlem** (Electron Main)
4. **Dosya İşlemi** (dataManager / pdfParser)
5. **Sonuç Döndürme** (IPC Response)
6. **UI Güncelleme** (React State)

### Veri Saklama

- **Öğrenci Verileri**: `userData/student_data.json`
- **Ayrıştırılmış PDF'ler**: `userData/parsed_pdfs/`

## 🔧 Geliştirme

### Yeni IPC Handler Eklemek

1. **Backend** (`electron/main.ts`):
```typescript
ipcMain.handle('my-handler', async (_event, param) => {
  // İşlemi yap
  return result;
});
```

2. **Hook** (`src/hooks/useIpc.ts`):
```typescript
myFunction: async (param: string) => {
  return await invoke('my-handler', param);
}
```

3. **Component** (`src/components/MyComponent.tsx`):
```typescript
const ipc = useIpc();
const result = await ipc.myFunction(param);
```

### Modül Ekleme

1. `electron/modules/` altında yeni modül oluşturun
2. Fonksiyonları export edin
3. `main.ts` içinde import edin
4. IPC handler'da kullanın

## 🎨 Stil Yönetimi

Projede **Tailwind CSS** kullanılmaktadır. Özel CSS dosyaları yazılmamıştır.

```tsx
<button className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg">
  Butonu
</button>
```

## 🐛 Hata Ayıklama

### Development Tools

Geliştirme modunda otomatik olarak DevTools açılır:

```typescript
if (VITE_DEV_SERVER_URL) {
  win.loadURL(VITE_DEV_SERVER_URL);
  win.webContents.openDevTools(); // Auto-open DevTools
}
```

### Loglar

```typescript
// Main Process
console.log('Backend log');

// Renderer Process  
console.log('Frontend log');
```

## 📦 Bağımlılıklar

### Ana Bağımlılıklar
- `electron` - Desktop uygulama framework'ü
- `react` + `react-dom` - UI framework'ü
- `pdf-lib` - PDF manipülasyonu
- `pdf-parse` - PDF metin çıkarma
- `xlsx` - Excel dosya işleme
- `archiver` - ZIP oluşturma
- `uuid` - Benzersiz ID üretimi

### Geliştirme Bağımlılıkları
- `vite` - Build tool
- `typescript` - Tip güvenliği
- `tailwindcss` - CSS framework
- `@biomejs/biome` - Linter/Formatter

## 📝 Lisans

Bu proje MIT lisansı altında lisanslanmıştır.

## 🤝 Katkıda Bulunma

1. Fork edin
2. Feature branch oluşturun (`git checkout -b feature/amazing`)
3. Değişikliklerinizi commit edin (`git commit -m 'feat: amazing feature'`)
4. Branch'inizi push edin (`git push origin feature/amazing`)
5. Pull Request açın

## 🙏 Teşekkürler

Bu proje aşağıdaki harika teknolojileri kullanmaktadır:
- Electron
- React
- Vite
- Tailwind CSS
- PDF-lib
- TypeScript

