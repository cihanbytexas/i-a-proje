// Scope kirliliğini önlemek için modül deseni (IIFE)
(function () {
    "use strict";

    const SUPABASE_URL = "https://zgdmimoatbatuswmvsea.supabase.co";
    const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpnZG1pbW9hdGJhdHVzd212c2VhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMzMjI2NjksImV4cCI6MjA5ODg5ODY2OX0.H9sSt80v1WasKdcAtcev7gPrgAnoRb2Y_zAr18Cd2IU";
    const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // Global durum yönetimi
    const state = {
        activeTab: 'internal',
        selectedBusinessId: null,
        selectedRating: null,
        isAnonymous: false,
        currentUser: null
    };

    // DOM Elementlerini Cache'leme (Performans için)
    const elements = {
        tabs: document.querySelectorAll('.tab-button'),
        searchInput: document.getElementById('search-input'),
        authBtn: document.getElementById('auth-btn'),
        anonToggle: document.getElementById('anonymous-toggle'),
        recommendBtn: document.getElementById('rate-recommend'),
        notRecommendBtn: document.getElementById('rate-not-recommend'),
        reviewContent: document.getElementById('review-content'),
        submitBtn: document.getElementById('submit-review-btn'),
        btnText: document.querySelector('#submit-review-btn .btn-text'),
        toastContainer: document.getElementById('toast-container')
    };

    // Başlatıcı fonksiyon
    function init() {
        if (!elements.submitBtn) return; // DOM yüklenmeden çalışmasını engelle

        setupTabListeners();
        setupRatingListeners();
        setupFormListeners();
        checkUserSession();
    }

    // Toast Bildirim Sistemi (alert yerine)
    function showToast(message, type = 'success') {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        // İkona göre başarılı veya hatalı görseli
        const iconSvg = type === 'success' 
            ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>`
            : `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>`;

        toast.innerHTML = `${iconSvg} <span>${message}</span>`;
        elements.toastContainer.appendChild(toast);

        // Animasyon için reflow
        void toast.offsetWidth; 
        toast.classList.add('show');

        setTimeout(() => {
            toast.classList.remove('show');
            toast.addEventListener('transitionend', () => toast.remove());
        }, 4000);
    }

    function setupTabListeners() {
        elements.tabs.forEach(tab => {
            tab.addEventListener('click', (e) => {
                // Sınıfları temizle
                elements.tabs.forEach(t => t.classList.remove('active'));
                
                const clickedTab = e.currentTarget;
                clickedTab.classList.add('active');
                
                const tabName = clickedTab.dataset.tab;
                state.activeTab = tabName;
                updateSearchPlaceholder(tabName);
            });
        });
    }

    function updateSearchPlaceholder(tab) {
        if (tab === 'internal') {
            elements.searchInput.placeholder = "Sistemimizde kayıtlı iş yerlerini arayın...";
        } else if (tab === 'google') {
            elements.searchInput.placeholder = "Google Haritalar üzerinden işletme arayın...";
        } else if (tab === 'manual') {
            elements.searchInput.placeholder = "Eklemek istediğiniz yeni işletme adını yazın...";
        }
    }

    function setupRatingListeners() {
        elements.recommendBtn.addEventListener('click', () => setRating('recommend'));
        elements.notRecommendBtn.addEventListener('click', () => setRating('not-recommend'));
    }

    function setRating(ratingType) {
        // Durumu sıfırla
        elements.recommendBtn.classList.remove('selected');
        elements.notRecommendBtn.classList.remove('selected');
        
        if (ratingType === 'recommend') {
            elements.recommendBtn.classList.add('selected');
            state.selectedRating = 'recommend';
        } else if (ratingType === 'not-recommend') {
            elements.notRecommendBtn.classList.add('selected');
            state.selectedRating = 'not-recommend';
        } else {
            state.selectedRating = null;
        }
    }

    async function checkUserSession() {
        try {
            const { data: { session }, error } = await supabase.auth.getSession();
            if (error) throw error;

            if (session) {
                state.currentUser = session.user;
                elements.authBtn.textContent = "Çıkış Yap";
            }
        } catch (error) {
            console.error("Oturum kontrolü başarısız:", error.message);
        }
        
        elements.anonToggle.addEventListener('change', (e) => {
            state.isAnonymous = e.target.checked;
        });
    }

    function setupFormListeners() {
        elements.submitBtn.addEventListener('click', async () => {
            const content = elements.reviewContent.value.trim();
            
            // TODO: Google Places entegrasyonu bitince burası dinamik veriye bağlanacak
            state.selectedBusinessId = state.selectedBusinessId || "test-uuid-1234";

            // Validasyon Kontrolleri
            if (!state.selectedRating) {
                showToast("Lütfen işletme hakkında genel kararınızı seçin.", "error");
                return;
            }
            if (content.length < 10) {
                showToast("Lütfen deneyimleriniz hakkında en az 10 karakterlik detay verin.", "error");
                return;
            }
            
            const reviewData = {
                business_id: state.selectedBusinessId,
                user_id: state.currentUser ? state.currentUser.id : null,
                rating: state.selectedRating,
                content: content,
                is_anonymous: state.isAnonymous,
                created_at: new Date().toISOString()
            };

            // Yükleme Durumu
            elements.submitBtn.disabled = true;
            elements.btnText.textContent = "Gönderiliyor...";

            try {
                const { data, error } = await supabase
                    .from('reviews')
                    .insert([reviewData])
                    .select();

                if (error) throw error;

                showToast("Değerlendirmeniz başarıyla sisteme işlendi!");
                
                // Formu temizle
                elements.reviewContent.value = '';
                setRating(null); // Özel null kontrolü eklendi
                elements.anonToggle.checked = false;
                state.isAnonymous = false;
                
            } catch (error) {
                console.error("Veritabanı Hatası:", error);
                showToast("Kaydedilirken hata oluştu: " + error.message, "error");
            } finally {
                // Butonu eski haline getir
                elements.submitBtn.disabled = false;
                elements.btnText.textContent = "Sisteme Gönder";
            }
        });
    }

    // DOM tamamen yüklendiğinde başlat
    document.addEventListener("DOMContentLoaded", init);

})();
