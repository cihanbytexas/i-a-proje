const SUPABASE_URL = "https://zgdmimoatbatuswmvsea.supabase.co"; 
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpnZG1pbW9hdGJhdHVzd212c2VhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMzMjI2NjksImV4cCI6MjA5ODg5ODY2OX0.H9sSt80v1WasKdcAtcev7gPrgAnoRb2Y_zAr18Cd2IU";
const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let currentAppState = {
    activeTab: 'internal',
    selectedBusinessId: null,
    selectedRating: null,
    isAnonymous: false,
    currentUser: null
};

document.addEventListener("DOMContentLoaded", () => {
    initApp();
});

function initApp() {
    setupTabListeners();
    setupRatingListeners();
    setupFormListeners();
    checkUserSession();
}

function setupTabListeners() {
    const tabs = ['internal', 'google', 'manual'];
    
    tabs.forEach(tab => {
        document.getElementById(`tab-${tab}`).addEventListener('click', (e) => {
            tabs.forEach(t => document.getElementById(`tab-${t}`).classList.remove('active'));
            // Eğer butondaki SVG'ye tıklanırsa target farklı olabilir, currentTarget ile güvenceye alıyoruz
            e.currentTarget.classList.add('active');
            
            currentAppState.activeTab = tab;
            updateSearchPlaceholder(tab);
        });
    });
}

function updateSearchPlaceholder(tab) {
    const searchInput = document.getElementById('search-input');
    if (tab === 'internal') {
        searchInput.placeholder = "Sistemimizde kayıtlı iş yerlerini arayın...";
    } else if (tab === 'google') {
        searchInput.placeholder = "Google Haritalar üzerinden işletme arayın...";
    } else if (tab === 'manual') {
        searchInput.placeholder = "Eklemek istediğiniz yeni işletme adını yazın...";
    }
}

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

async function checkUserSession() {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (session) {
        currentAppState.currentUser = session.user;
        document.getElementById('auth-btn').textContent = "Çıkış Yap";
    }
    
    document.getElementById('anonymous-toggle').addEventListener('change', (e) => {
        currentAppState.isAnonymous = e.target.checked;
    });
}

function setupFormListeners() {
    const submitBtn = document.getElementById('submit-review-btn');
    
    submitBtn.addEventListener('click', async () => {
        const content = document.getElementById('review-content').value.trim();
        
        // Şimdilik test edebilmen için ID'yi manuel atıyoruz. 
        // Google Places entegrasyonu bitince burası dinamik olacak.
        currentAppState.selectedBusinessId = currentAppState.selectedBusinessId || "test-uuid-1234";

        if (!currentAppState.selectedRating) {
            alert("Lütfen işletme hakkında genel kararınızı seçin.");
            return;
        }
        if (content.length < 10) {
            alert("Lütfen deneyimleriniz hakkında biraz daha detay verin.");
            return;
        }
        
        const reviewData = {
            business_id: currentAppState.selectedBusinessId,
            user_id: currentAppState.currentUser ? currentAppState.currentUser.id : null,
            rating: currentAppState.selectedRating,
            content: content,
            is_anonymous: currentAppState.isAnonymous
        };

        try {
            submitBtn.disabled = true;
            submitBtn.innerHTML = "Gönderiliyor...";

            const { data, error } = await supabase
                .from('reviews')
                .insert([reviewData])
                .select();

            if (error) throw error;

            alert("Değerlendirmeniz başarıyla sisteme işlendi!");
            
            document.getElementById('review-content').value = '';
            setRating(null);
            
        } catch (error) {
            console.error("Hata:", error.message);
            alert("Veri tabanına kaydedilirken hata oluştu: " + error.message);
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg> Sisteme Gönder`;
        }
    });
}
