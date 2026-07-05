// 1. Supabase İstemci Yapılandırması
// Projeyi hayata geçirirken buradaki bilgileri Supabase Settings > API alanındakilerle değiştir.
const SUPABASE_URL = "https://rayddnxxnemlshbmenps.supabase.co"; 
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJheWRkbnh4bmVtbHNoYm1lbnBzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMyNTQxMzMsImV4cCI6MjA5ODgzMDEzM30.iMYA1CXo06pWEnsVbOpzAXwVokRc70HKpvJabzY21zo";

// İstemciyi başlatma
const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// 2. Uygulama Durum Yönetimi (State)
let currentAppState = {
    activeTab: 'internal', // internal, google, manual
    selectedBusinessId: 'mock-uuid-1234', // Sistemdeki işletmenin UUID'si
    selectedRating: null, // 'recommend' veya 'not-recommend'
    isAnonymous: false,
    currentUser: null
};

// 3. DOM Elemanları Yükleme
document.addEventListener("DOMContentLoaded", () => {
    initApp();
});

function initApp() {
    // Event Listener'ları bağla
    setupTabListeners();
    setupRatingListeners();
    setupFormListeners();
    checkUserSession();
}

// 4. Sekme Değiştirme ve Arama Optimizasyonu
function setupTabListeners() {
    const tabs = ['internal', 'google', 'manual'];
    
    tabs.forEach(tab => {
        document.getElementById(`tab-${tab}`).addEventListener('click', (e) => {
            // Aktif tab sınıf güncellemesi
            tabs.forEach(t => document.getElementById(`tab-${t}`).classList.remove('active'));
            e.target.classList.add('active');
            
            currentAppState.activeTab = tab;
            updateSearchPlaceholder(tab);
        });
    });
}

function updateSearchPlaceholder(tab) {
    const searchInput = document.getElementById('search-input');
    if (tab === 'internal') {
        searchInput.placeholder = "Sistemimizde kayıtlı iş yerlerini arayın...";
        searchInput.disabled = false;
    } else if (tab === 'google') {
        searchInput.placeholder = "Google Haritalar (Places API) üzerinden arayın...";
        searchInput.disabled = false;
    } else if (tab === 'manual') {
        searchInput.placeholder = "Eklemek istediğiniz yeni dükkan/işletme adını yazın...";
        searchInput.disabled = false;
    }
}

// 5. Değerlendirme Seçimi (👍 / 👎)
function setupRatingListeners() {
    const recommendBtn = document.getElementById('rate-recommend');
    const notRecommendBtn = document.getElementById('rate-not-recommend');
    
    recommendBtn.addEventListener('click', () => setRating('recommend'));
    notRecommendBtn.addEventListener('click', () => setRating('not-recommend'));
}

function setRating(ratingType) {
    const recommendBtn = document.getElementById('rate-recommend');
    const notRecommendBtn = document.getElementById('rate-not-recommend');
    
    recommendBtn.classList.remove('selected');
    notRecommendBtn.classList.remove('selected');
    
    if (ratingType === 'recommend') {
        recommendBtn.classList.add('selected');
        currentAppState.selectedRating = 'recommend';
    } else {
        notRecommendBtn.classList.add('selected');
        currentAppState.selectedRating = 'not-recommend';
    }
}

// 6. Anonimlik Durumu ve Oturum Kontrolü
async function checkUserSession() {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (session) {
        currentAppState.currentUser = session.user;
        document.getElementById('auth-btn').textContent = "Çıkış Yap";
    }
    
    // Anonimlik Switch Dinleyicisi
    document.getElementById('anonymous-toggle').addEventListener('change', (e) => {
        currentAppState.isAnonymous = e.target.checked;
    });
}

// 7. Supabase'e Veri Gönderme İşlemi
function setupFormListeners() {
    const submitBtn = document.getElementById('submit-review-btn');
    
    submitBtn.addEventListener('click', async () => {
        const content = document.getElementById('review-content').value.trim();
        
        // Validasyon Kontrolleri
        if (!currentAppState.selectedBusinessId) {
            alert("Lütfen önce yorum yapacağınız işletmeyi aratıp seçin.");
            return;
        }
        if (!currentAppState.selectedRating) {
            alert("Lütfen işletme hakkında genel kararınızı seçin (👍 veya 👎).");
            return;
        }
        if (content.length < 10) {
            alert("Lütfen emekçi kardeşlerimize faydalı olması için en az 10 karakterlik bir açıklama yazın.");
            return;
        }
        
        // Supabase Insert Payload (Veri Paketi)
        const reviewData = {
            business_id: currentAppState.selectedBusinessId,
            user_id: currentAppState.currentUser ? currentAppState.currentUser.id : null, // Giriş yapılmadıysa null düşebilir (tercihe göre auth zorunlu tutulabilir)
            rating: currentAppState.selectedRating,
            content: content,
            is_anonymous: currentAppState.isAnonymous
        };

        try {
            submitBtn.disabled = true;
            submitBtn.textContent = "Gönderiliyor...";

            const { data, error } = await supabase
                .from('reviews')
                .insert([reviewData])
                .select();

            if (error) throw error;

            alert("Yorumunuz başarıyla sisteme işlendi ve dayanışma ağına eklendi!");
            
            // Formu sıfırla
            document.getElementById('review-content').value = '';
            setRating(null);
            
        } catch (error) {
            console.error("Supabase Hatası:", error.message);
            alert("Veri tabanına kaydedilirken bir hata oluştu: " + error.message);
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = "Paylaşımı Gönder";
        }
    });
}
