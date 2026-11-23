import type { TranslationBundle } from './types';

type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K];
};

export const LOCALES_GROUP_B: Record<string, DeepPartial<TranslationBundle>> = {
  id: {
    nav: {
      home: 'Beranda', games: 'Semua Game', categories: 'Kategori', popular: 'Populer', newGames: 'Baru',
      trending: 'Tren', favorites: 'Favorit', recent: 'Terakhir Dimainkan', stats: 'Statistik',
      leaderboard: 'Papan Skor', instructions: 'Panduan', about: 'Tentang', contact: 'Kontak',
      faq: 'FAQ', sitemap: 'Peta Situs', playRandom: 'Main Acak',
    },
    hero: {
      tagline: 'Main Seketika. Di Mana Saja. Kapan Saja.',
      headline: '100 mini game browser siap main tanpa unduh',
      subheadline: 'Mainkan game arcade, puzzle, papan, balapan, dan strategi langsung di HP atau komputer dengan dukungan offline PWA.',
      ctaPrimary: 'Jelajahi Game',
    },
    common: { playNow: 'Mainkan', pause: 'Jeda', resume: 'Lanjut', restart: 'Ulangi', installApp: 'Pasang Aplikasi', score: 'Skor', bestScore: 'Terbaik', gameOver: 'Game Selesai', youWin: 'Kamu Menang!' },
    categories: { arcade: 'Arkade & Aksi', puzzle: 'Teka-teki', board: 'Permainan Papan', 'racing-sports': 'Balap & Olahraga', casual: 'Kasual', strategy: 'Strategi', 'word-edu': 'Kata & Edukasi', adventure: 'Petualangan', skill: 'Ketangkasan' },
  },
  bn: {
    nav: {
      home: 'হোম', games: 'সব গেম', categories: 'ক্যাটাগরি', popular: 'জনপ্রিয়', newGames: 'নতুন গেম',
      trending: 'ট্রেন্ডিং', favorites: 'পছন্দের', recent: 'সাম্প্রতিক', stats: 'পরিসংখ্যান',
      leaderboard: 'লিডারবোর্ড', instructions: 'নিয়মাবলি', about: 'আমাদের সম্পর্কে', contact: 'যোগাযোগ',
      faq: 'প্রশ্নোত্তর', sitemap: 'সাইটম্যাপ', playRandom: 'র‍্যান্ডম খেলুন',
    },
    hero: {
      tagline: 'তাৎক্ষণিক খেলুন। যেকোনো জায়গায়। যেকোনো সময়।',
      headline: 'ডাউনলোড ছাড়াই সরাসরি খেলার জন্য ১০০টি ব্রাউজার মিনি-গেম',
      subheadline: 'মোবাইল এবং ডেস্কটপ ব্রাউজারে দ্রুতগতির আর্কেড, পাজল ও স্ট্র্যাটেজি গেম খেলুন।',
      ctaPrimary: 'সব গেম দেখুন',
    },
    common: { playNow: 'এখনই খেলুন', pause: 'বিরতি', resume: 'চালিয়ে যান', restart: 'পুনরায় শুরু', installApp: 'অ্যাপ ইনস্টল করুন', score: 'স্কোর', bestScore: 'সেরা', gameOver: 'খেলা শেষ', youWin: 'আপনি জিতেছেন!' },
    categories: { arcade: 'আর্কেড ও অ্যাকশন', puzzle: 'পাজল', board: 'বোর্ড গেম', 'racing-sports': 'রেসিং ও স্পোর্টস', casual: 'ক্যাজুয়াল', strategy: 'স্ট্র্যাটেজি', 'word-edu': 'শব্দ ও শিক্ষা', adventure: 'অ্যাডভেঞ্চার', skill: 'দক্ষতা ও প্রতিযোগিতা' },
  },
  ur: {
    nav: {
      home: 'ہوم', games: 'تمام گیمز', categories: 'زمرے', popular: 'مقبول', newGames: 'نئے گیمز',
      trending: 'ٹرینڈنگ', favorites: 'پسندیدہ', recent: 'حالیہ', stats: 'اعداد و شمار',
      leaderboard: 'لیڈر بورڈ', instructions: 'ہدایات', about: 'ہمارے بارے میں', contact: 'رابطہ',
      faq: 'سوالات', sitemap: 'سائٹ میپ', playRandom: 'بے ترتیب کھیلیں',
    },
    hero: {
      tagline: 'فوری کھیلیں۔ کہیں بھی۔ کسی بھی وقت۔',
      headline: 'بغیر ڈاؤن لوڈ فوری کھیلنے کے لیے 100 بہترین براؤزر منی گیمز',
      subheadline: 'موبائل اور ڈیسک ٹاپ پر آرکیڈ، پزل اور اسٹریٹجی گیمز کا لطف اٹھائیں۔',
      ctaPrimary: 'تمام گیمز دیکھیں',
    },
    common: { playNow: 'ابھی کھیلیں', pause: 'روکیں', resume: 'جاری رکھیں', restart: 'دوبارہ شروع کریں', installApp: 'ایپ انسٹال کریں', score: 'اسکور', bestScore: 'بہترین', gameOver: 'کھیل ختم', youWin: 'آپ جیت گئے!' },
    categories: { arcade: 'آرکیڈ اور ایکشن', puzzle: 'پزل', board: 'بورڈ گیمز', 'racing-sports': 'ریسنگ اور کھیل', casual: 'کیژول', strategy: 'اسٹریٹجی', 'word-edu': 'الفاظ اور تعلیم', adventure: 'ایڈونچر', skill: 'مہارت اور مقابلہ' },
  },
  tr: {
    nav: {
      home: 'Ana Sayfa', games: 'Tüm Oyunlar', categories: 'Kategoriler', popular: 'Popüler', newGames: 'Yeni',
      trending: 'Trend', favorites: 'Favoriler', recent: 'Son Oynananlar', stats: 'İstatistikler',
      leaderboard: 'Sıralama', instructions: 'Nasıl Oynanır', about: 'Hakkımızda', contact: 'İletişim',
      faq: 'SSS', sitemap: 'Site Haritası', playRandom: 'Rastgele Oyna',
    },
    hero: {
      tagline: 'Anında Oyna. Her Yerde. Her Zaman.',
      headline: 'İndirmeden oynanabilen 100 el yapımı tarayıcı mini oyunu',
      subheadline: 'Mobil dokunmatik ve masaüstü klavye uyumlu arcade, bulmaca ve strateji oyunları.',
      ctaPrimary: 'Oyunları Keşfet',
    },
    common: { playNow: 'Hemen Oyna', pause: 'Duraklat', resume: 'Devam Et', restart: 'Yeniden Başlat', installApp: 'Uygulamayı Yükle', score: 'Skor', bestScore: 'En İyi', gameOver: 'Oyun Bitti', youWin: 'Kazandın!' },
    categories: { arcade: 'Arcade ve Aksiyon', puzzle: 'Bulmaca', board: 'Masa Oyunları', 'racing-sports': 'Yarış ve Spor', casual: 'Gündelik', strategy: 'Strateji', 'word-edu': 'Kelime ve Eğitim', adventure: 'Macera', skill: 'Beceri ve Rekabet' },
  },
  it: {
    nav: {
      home: 'Home', games: 'Tutti i Giochi', categories: 'Categorie', popular: 'Popolari', newGames: 'Nuovi',
      trending: 'Di tendenza', favorites: 'Preferiti', recent: 'Recenti', stats: 'Statistiche',
      leaderboard: 'Classifica', instructions: 'Istruzioni', about: 'Chi siamo', contact: 'Contatti',
      faq: 'FAQ', sitemap: 'Mappa del sito', playRandom: 'Gioco Casuale',
    },
    hero: {
      tagline: 'Gioca all’istante. Ovunque. Sempre.',
      headline: '100 mini-giochi HTML5 pronti da giocare subito nel browser',
      subheadline: 'Classici arcade, puzzle, giochi da tavolo e strategia per smartphone e PC senza installazioni.',
      ctaPrimary: 'Scopri i Giochi',
    },
    common: { playNow: 'Gioca Ora', pause: 'Pausa', resume: 'Riprendi', restart: 'Ricomincia', installApp: 'Installa App', score: 'Punteggio', bestScore: 'Record', gameOver: 'Fine Partita', youWin: 'Hai Vinto!' },
    categories: { arcade: 'Arcade e Azione', puzzle: 'Puzzle', board: 'Giochi da Tavolo', 'racing-sports': 'Corse e Sport', casual: 'Casual', strategy: 'Strategia', 'word-edu': 'Parole ed Educativi', adventure: 'Avventura', skill: 'Abilità e Sfida' },
  },
  vi: {
    nav: {
      home: 'Trang chủ', games: 'Tất cả trò chơi', categories: 'Thể loại', popular: 'Phổ biến', newGames: 'Mới',
      trending: 'Thịnh hành', favorites: 'Yêu thích', recent: 'Chơi gần đây', stats: 'Thống kê',
      leaderboard: 'Bảng xếp hạng', instructions: 'Hướng dẫn', about: 'Giới thiệu', contact: 'Liên hệ',
      faq: 'Hỏi đáp', sitemap: 'Sơ đồ trang', playRandom: 'Chơi ngẫu nhiên',
    },
    hero: {
      tagline: 'Chơi ngay lập tức. Mọi nơi. Mọi lúc.',
      headline: '100 trò chơi mini HTML5 chơi ngay trên trình duyệt',
      subheadline: 'Không cần tải về hay đăng ký, hỗ trợ cảm ứng di động và bàn phím máy tính.',
      ctaPrimary: 'Xem tất cả trò chơi',
    },
    common: { playNow: 'Chơi ngay', pause: 'Tạm dừng', resume: 'Tiếp tục', restart: 'Chơi lại', installApp: 'Cài đặt ứng dụng', score: 'Điểm', bestScore: 'Cao nhất', gameOver: 'Kết thúc', youWin: 'Bạn thắng!' },
    categories: { arcade: 'Hành động', puzzle: 'Giải đố', board: 'Cờ bàn', 'racing-sports': 'Đua xe & Thể thao', casual: 'Giải trí nhẹ', strategy: 'Chiến thuật', 'word-edu': 'Từ vựng & Giáo dục', adventure: 'Phiêu lưu', skill: 'Kỹ năng' },
  },
  th: {
    nav: {
      home: 'หน้าแรก', games: 'เกมทั้งหมด', categories: 'หมวดหมู่', popular: 'ยอดนิยม', newGames: 'เกมใหม่',
      trending: 'กำลังฮิต', favorites: 'รายการโปรด', recent: 'เล่นล่าสุด', stats: 'สถิติของฉัน',
      leaderboard: 'กระดานคะแนน', instructions: 'วิธีเล่น', about: 'เกี่ยวกับเรา', contact: 'ติดต่อเรา',
      faq: 'คำถามที่พบบ่อย', sitemap: 'แผนผังเว็บไซต์', playRandom: 'สุ่มเกมเล่น',
    },
    hero: {
      tagline: 'เล่นได้ทันที ทุกที่ ทุกเวลา',
      headline: '100 มินิเกมบนเบราว์เซอร์ที่เล่นได้ทันทีไม่ต้องดาวน์โหลด',
      subheadline: 'สนุกกับเกมอาร์เคด ปริศนา และวางแผนบนมือถือและคอมพิวเตอร์ พร้อมโหมดออฟไลน์',
      ctaPrimary: 'ดูเกมทั้งหมด',
    },
    common: { playNow: 'เล่นเลย', pause: 'หยุดชั่วคราว', resume: 'เล่นต่อ', restart: 'เริ่มใหม่', installApp: 'ติดตั้งแอป', score: 'คะแนน', bestScore: 'สูงสุด', gameOver: 'จบเกม', youWin: 'คุณชนะ!' },
    categories: { arcade: 'อาร์เคดและแอ็กชัน', puzzle: 'ปริศนา', board: 'เกมกระดาน', 'racing-sports': 'แข่งรถและกีฬา', casual: 'แคชชวล', strategy: 'กลยุทธ์', 'word-edu': 'คำศัพท์และการเรียนรู้', adventure: 'ผจญภัย', skill: 'ทักษะและการแข่งขัน' },
  },
  pa: {
    nav: {
      home: 'ਹੋਮ', games: 'ਸਾਰੀਆਂ ਗੇਮਾਂ', categories: 'ਸ਼੍ਰੇਣੀਆਂ', popular: 'ਪ੍ਰਸਿੱਧ', newGames: 'ਨਵੀਆਂ ਗੇਮਾਂ',
      trending: 'ਟ੍ਰੈਂਡਿੰਗ', favorites: 'ਮਨਪਸੰਦ', recent: 'ਹਾਲ ਹੀ ਵਿੱਚ', stats: 'ਮੇਰੇ ਅੰਕੜੇ',
      leaderboard: 'ਲੀਡਰਬੋਰਡ', instructions: 'ਨਿਯਮ', about: 'ਸਾਡੇ ਬਾਰੇ', contact: 'ਸੰਪਰਕ',
      faq: 'ਸਵਾਲ-ਜਵਾਬ', sitemap: 'ਸਾਈਟਮੈਪ', playRandom: 'ਰੈਂਡਮ ਖੇਡੋ',
    },
    hero: {
      tagline: 'ਤੁਰੰਤ ਖੇਡੋ। ਕਿਤੇ ਵੀ। ਕਿਸੇ ਵੀ ਸਮੇਂ।',
      headline: 'ਬਿਨਾਂ ਡਾਊਨਲੋਡ ਬ੍ਰਾਊਜ਼ਰ ਵਿੱਚ ਖੇਡਣ ਲਈ 100 ਸ਼ਾਨਦਾਰ ਗੇਮਾਂ',
      subheadline: 'ਮੋਬਾਈਲ ਅਤੇ ਡੈਸਕਟਾਪ ਤੇ ਤੁਰੰਤ ਆਰਕੇਡ, ਪਜ਼ਲ ਅਤੇ ਰਣਨੀਤੀ ਗੇਮਾਂ ਦਾ ਆਨੰਦ ਲਓ।',
      ctaPrimary: 'ਸਾਰੀਆਂ ਗੇਮਾਂ ਵੇਖੋ',
    },
    common: { playNow: 'ਹੁਣੇ ਖੇਡੋ', pause: 'ਰੋਕੋ', resume: 'ਜਾਰੀ ਰੱਖੋ', restart: 'ਦੁਬਾਰਾ ਸ਼ੁਰੂ ਕਰੋ', installApp: 'ਐਪ ਇੰਸਟਾਲ ਕਰੋ', score: 'ਸਕੋਰ', bestScore: 'ਵਧੀਆ', gameOver: 'ਖੇਡ ਖਤਮ', youWin: 'ਤੁਸੀਂ ਜਿੱਤ ਗਏ!' },
    categories: { arcade: 'ਆਰਕੇਡ ਤੇ ਐਕਸ਼ਨ', puzzle: 'ਪਜ਼ਲ', board: 'ਬੋਰਡ ਗੇਮਾਂ', 'racing-sports': 'ਰੇਸਿੰਗ ਤੇ ਖੇਡਾਂ', casual: 'ਕੈਜ਼ੂਅਲ', strategy: 'ਰਣਨੀਤੀ', 'word-edu': 'ਸ਼ਬਦ ਤੇ ਸਿੱਖਿਆ', adventure: 'ਐਡਵੈਂਚਰ', skill: 'ਹੁਨਰ ਤੇ ਮੁਕਾਬਲਾ' },
  },
  mr: {
    nav: {
      home: 'मुख्यपृष्ठ', games: 'सर्व गेम्स', categories: 'वर्गवारी', popular: 'लोकप्रिय', newGames: 'नवीन गेम्स',
      trending: 'ट्रेंडिंग', favorites: 'आवडते', recent: 'अलीकडील', stats: 'माझी आकडेवारी',
      leaderboard: 'लीडरबोर्ड', instructions: 'नियम', about: 'आमच्याबद्दल', contact: 'संपर्क',
      faq: 'नेहमीचे प्रश्न', sitemap: 'साइटमॅप', playRandom: 'रँडम खेळा',
    },
    hero: {
      tagline: 'त्वरित खेळा. कुठेही. कधीही.',
      headline: 'डाउनलोडशिवाय थेट ब्राउझरमध्ये खेळण्यासाठी १०० उत्तम मिनी गेम्स',
      subheadline: 'मोबाईल टच आणि संगणक कीबोर्डसाठी तयार केलेले आर्केड व कोडी गेम्स.',
      ctaPrimary: 'सर्व गेम्स पहा',
    },
    common: { playNow: 'आता खेळा', pause: 'थांबवा', resume: 'पुढे चालू ठेवा', restart: 'पुन्हा सुरू करा', installApp: 'अॅप इंस्टॉल करा', score: 'गुण', bestScore: 'सर्वोत्तम', gameOver: 'खेळ समाप्त', youWin: 'तुम्ही जिंकलात!' },
    categories: { arcade: 'आर्केड व अ‍ॅक्शन', puzzle: 'कोडी', board: 'बोर्ड गेम्स', 'racing-sports': 'रेसिंग व क्रीडा', casual: 'कॅज्युअल', strategy: 'रणनीती', 'word-edu': 'शब्द व शैक्षणिक', adventure: 'साहसी', skill: 'कौशल्य' },
  },
  ta: {
    nav: {
      home: 'முகப்பு', games: 'அனைத்து விளையாட்டுகள்', categories: 'வகைகள்', popular: 'பிரபலம்', newGames: 'புதியவை',
      trending: 'டிரெண்டிங்', favorites: 'பிடித்தவை', recent: 'சமீபத்திய', stats: 'புள்ளிவிவரம்',
      leaderboard: 'தரவரிசை', instructions: 'வழிமுறைகள்', about: 'எங்களைப் பற்றி', contact: 'தொடர்பு',
      faq: 'கேள்விகள்', sitemap: 'தள வரைபடம்', playRandom: 'சீரற்ற விளையாட்டு',
    },
    hero: {
      tagline: 'உடனே விளையாடுங்கள். எங்கும். எப்போதும்.',
      headline: 'பதிவிறக்கம் இல்லாமல் உலாவியில் விளையாட 100 சிறந்த மினி கேம்கள்',
      subheadline: 'மொபைல் மற்றும் கணினியில் உடனடி ஆர்கேட் மற்றும் புதிர் விளையாட்டுகளை அனுபவியுங்கள்.',
      ctaPrimary: 'அனைத்து விளையாட்டுகள்',
    },
    common: { playNow: 'விளையாடு', pause: 'இடைநிறுத்து', resume: 'தொடர்', restart: 'மீண்டும் தொடங்கு', installApp: 'ஆப் நிறுவு', score: 'மதிப்பெண்', bestScore: 'சிறந்தது', gameOver: 'ஆட்டம் முடிந்தது', youWin: 'நீங்கள் வென்றீர்கள்!' },
    categories: { arcade: 'ஆர்கேட் & அதிரடி', puzzle: 'புதிர்', board: 'பலகை விளையாட்டு', 'racing-sports': 'பந்தயம் & விளையாட்டு', casual: 'எளியவை', strategy: 'உத்தி', 'word-edu': 'சொல் & கல்வி', adventure: 'சாகசம்', skill: 'திறன்' },
  },
  te: {
    nav: {
      home: 'హోమ్', games: 'అన్ని గేమ్‌లు', categories: 'వర్గాలు', popular: 'ప్రజాదరణ', newGames: 'కొత్తవి',
      trending: 'ట్రెండింగ్', favorites: 'ఇష్టమైనవి', recent: 'ఇటీవలి', stats: 'గణాంకాలు',
      leaderboard: 'లీడర్‌బోర్డ్', instructions: 'సూచనలు', about: 'మా గురించి', contact: 'సంప్రదించండి',
      faq: 'ప్రశ్నలు', sitemap: 'సైట్‌మ్యాప్', playRandom: 'ర్యాండమ్ ఆడండి',
    },
    hero: {
      tagline: 'తక్షణమే ఆడండి. ఎక్కడైనా. ఎప్పుడైనా.',
      headline: 'డౌన్‌లోడ్ లేకుండా బ్రౌజర్‌లో ఆడే 100 అద్భుతమైన మినీ గేమ్‌లు',
      subheadline: 'మొబైల్ టచ్ మరియు డెస్క్‌టాప్ కీబోర్డ్ కోసం రూపొందించిన ఆర్కేడ్, పజిల్ గేమ్‌లు.',
      ctaPrimary: 'అన్ని గేమ్‌లు చూడండి',
    },
    common: { playNow: 'ఇప్పుడే ఆడండి', pause: 'ఆపు', resume: 'కొనసాగించు', restart: 'మళ్ళీ ప్రారంభించు', installApp: 'యాప్ ఇన్‌స్టాల్', score: 'స్కోర్', bestScore: 'అత్యుత్తమ', gameOver: 'గేమ్ ముగిసింది', youWin: 'మీరు గెలిచారు!' },
    categories: { arcade: 'ఆర్కేడ్ & యాక్షన్', puzzle: 'పజిల్', board: 'బోర్డ్ గేమ్స్', 'racing-sports': 'రేసింగ్ & స్పోర్ట్స్', casual: 'క్యాజువల్', strategy: 'వ్యూహం', 'word-edu': 'పదాలు & విద్య', adventure: 'అడ్వెంచర్', skill: 'నైపుణ్యం' },
  },
};
