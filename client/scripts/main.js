let AUTH_CONFIG = null;

async function loadAuthConfig() {
    try {
        // Динамический импорт - используем правильное имя файла
        const securityModule = await import('../config/s.js');
        const AuthSecurity = securityModule.AuthSecurity;
        
        const security = new AuthSecurity();
        AUTH_CONFIG = security.getConfig();
        
        console.log('Auth config loaded securely');
        return true;
    } catch (error) {
        console.error('Failed to load auth config:', error);
        // Fallback конфиг на случай ошибки
        AUTH_CONFIG = {
            adminPassword: "mysecret123",
            storageKey: "blog_admin_auth", 
            sessionDuration: 24 * 60 * 60 * 1000
        };
        return false;
    }
}

// State management
let appState = {
    isAuthenticated: false,
    posts: [],
    currentModal: null,
    configLoaded: false
};

// ===== MODAL MANAGEMENT =====
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        // Закрываем предыдущее модальное окно
        if (appState.currentModal) {
            closeModal(appState.currentModal);
        }
        
        modal.classList.add('modal--active');
        appState.currentModal = modalId;
        document.body.style.overflow = 'hidden';
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('modal--active');
        if (appState.currentModal === modalId) {
            appState.currentModal = null;
        }
        document.body.style.overflow = '';
    }
}

function closeCurrentModal() {
    if (appState.currentModal) {
        closeModal(appState.currentModal);
    }
}

// ===== AUTHENTICATION =====
function checkAuthStatus() {
    if (!AUTH_CONFIG) return false;
    
    const authData = localStorage.getItem(AUTH_CONFIG.storageKey);
    if (authData) {
        try {
            const { timestamp } = JSON.parse(authData);
            if (Date.now() - timestamp < AUTH_CONFIG.sessionDuration) {
                appState.isAuthenticated = true;
                updateUIForAuth();
                return true;
            } else {
                logout();
            }
        } catch (error) {
            console.error('Error parsing auth data:', error);
            logout();
        }
    }
    return false;
}

function login(password) {
    if (!AUTH_CONFIG) {
        showNotification('Системная ошибка', 'error');
        return false;
    }
    
    if (password === AUTH_CONFIG.adminPassword) {
        appState.isAuthenticated = true;
        
        const authData = {
            timestamp: Date.now(),
            expires: Date.now() + AUTH_CONFIG.sessionDuration
        };
        localStorage.setItem(AUTH_CONFIG.storageKey, JSON.stringify(authData));
        
        updateUIForAuth();
        closeCurrentModal();
        showNotification('Успешный вход!', 'success');
        return true;
    } else {
        showNotification('Неверный код доступа!', 'error');
        return false;
    }
}

function logout() {
    appState.isAuthenticated = false;
    if (AUTH_CONFIG) {
        localStorage.removeItem(AUTH_CONFIG.storageKey);
    }
    updateUIForAuth();
    showNotification('Вы вышли из системы', 'info');
}

function updateUIForAuth() {
    const adminBtn = document.getElementById('adminBtn');
    if (appState.isAuthenticated) {
        adminBtn.textContent = '➕';
        adminBtn.title = 'Создать новый пост';
    } else {
        adminBtn.textContent = 'A';
        adminBtn.title = 'Вход для администратора';
    }
}

// ===== POST MANAGEMENT =====

async function handleCreatePost(formData) {
    if (!appState.isAuthenticated) {
        showNotification('Необходима авторизация!', 'error');
        return false;
    }

    const fileInput = document.getElementById('postImage');
    const hasImage = fileInput.files[0];

    const newPost = {
        id: Date.now(),
        title: formData.get('title'),
        description: formData.get('text'),
        date: formData.get('date'),
        image: hasImage ? 'uploaded' : 'custom', 
        imageType: hasImage ? 'uploaded' : 'gradient'
    };

    // Обрабатываем загруженное изображение
    if (hasImage) {
        try {
            await handleImageUpload(fileInput.files[0], newPost.id);
        } catch (error) {
            console.error('Error uploading image:', error);
            showNotification('Ошибка загрузки изображения', 'error');
        }
    }

    appState.posts.unshift(newPost);
    renderPosts();
      savePostsToStorage();
      function deletePost(postId) {
    appState.posts = appState.posts.filter(post => post.id !== postId);
    renderPosts();
    savePostsToStorage();
}
    
    // Очищаем форму
    document.getElementById('postForm').reset();
    document.getElementById('postDate').valueAsDate = new Date();
    document.getElementById('fileName').textContent = 'Файл не выбран';
    document.getElementById('fileInputLabel').classList.remove('has-file');
    
    showNotification('Пост успешно создан!', 'success');
    closeCurrentModal();
    return true;
}

// ===== NOTIFICATIONS =====
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification--${type}`;
    notification.innerHTML = `
        <span>${message}</span>
        <button class="notification__close">×</button>
    `;
    
    if (!document.querySelector('#notification-styles')) {
        const styles = document.createElement('style');
        styles.id = 'notification-styles';
        styles.textContent = `
            .notification {
                position: fixed;
                top: 20px;
                right: 20px;
                background: white;
                padding: 1rem 1.5rem;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                border-left: 4px solid #6b7280;
                z-index: 10000;
                display: flex;
                align-items: center;
                gap: 1rem;
                max-width: 400px;
                animation: slideIn 0.3s ease;
            }
            .notification--success { border-left-color: #10b981; }
            .notification--error { border-left-color: #ef4444; }
            .notification--info { border-left-color: #3b82f6; }
            .notification__close {
                background: none;
                border: none;
                font-size: 1.2rem;
                cursor: pointer;
                color: #6b7280;
            }
            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
        `;
        document.head.appendChild(styles);
    }
    
    document.body.appendChild(notification);
    
    const autoClose = setTimeout(() => {
        notification.remove();
    }, 4000);
    
    notification.querySelector('.notification__close').addEventListener('click', () => {
        clearTimeout(autoClose);
        notification.remove();
    });
}

// ===== POST RENDERING =====

function renderPosts() {
    const postsContainer = document.getElementById('postsContainer');
    
    console.log('Rendering posts:', appState.posts); // ДЛЯ ОТЛАДКИ
    
    if (appState.posts.length === 0) {
        postsContainer.innerHTML = `
            <div class="no-posts">
                <h3>Пока нет постов</h3>
                <p>Будьте первым, кто поделится чем-то интересным!</p>
            </div>
        `;
        return;
    }
    
    postsContainer.innerHTML = appState.posts.map(post => {
        console.log('Post data:', post); // ДЛЯ ОТЛАДКИ
        
        let imageContent = '';
        
        if (post.imageType === 'uploaded' && post.imageData) {
            console.log('Showing uploaded image for post:', post.id); // ДЛЯ ОТЛАДКИ
            imageContent = `<img src="${post.imageData}" alt="${post.title}" class="post-card__uploaded-image">`;
        } else {
            console.log('Showing gradient for post:', post.id); // ДЛЯ ОТЛАДКИ
            const gradientText = post.image === 'travel' ? 'ПУТЕШЕСТВИЕ' : 
                               post.image === 'code' ? 'КОД' :
                               post.image === 'books' ? 'КНИГИ' :
                               'ПОСТ';
                               
            imageContent = `<div class="post-card__gradient" style="background: linear-gradient(135deg, #${getColorFromString(post.image)} 0%, #${getColorFromString(post.title)} 100%)">
                ${gradientText}
            </div>`;
        }
        
        return `
        <article class="post-card">
            <div class="post-card__image">
                ${imageContent}
            </div>
            <div class="post-card__content">
                <h3 class="post-card__title">${post.title}</h3>
                <p class="post-card__description">${post.description}</p>
                <div class="post-card__date">
                    <span>📅</span>
                    ${new Date(post.date).toLocaleDateString('ru-RU')}
                </div>
            </div>
        </article>
        `;
    }).join('');
}
// Вспомогательная функция для генерации цветов
function getColorFromString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const color = (hash & 0x00FFFFFF).toString(16).toUpperCase();
    return '00000'.substring(0, 6 - color.length) + color;
}

// ===== SAMPLE DATA =====
function initializeSampleData() {
    appState.posts = [
        {
            id: 1,
            title: "Мое первое путешествие",
            description: "Невероятные впечатления от поездки в горы. Природа, воздух, эмоции...",
            date: "2024-01-15",
            image: "travel",
            imageType: "gradient"
        },
        {
            id: 2,
            title: "Изучаю Fullstack разработку",
            description: "Делимся первыми успехами в изучении JavaScript, Node.js и React.",
            date: "2024-01-10",
            image: "code",
            imageType: "gradient"
        },
        {
            id: 3,
            title: "Любимые книги года", 
            description: "Топ-5 книг, которые изменили мое мышление в этом году.",
            date: "2024-01-05",
            image: "books",
            imageType: "gradient"
        }
    ];
}
// ===== LOCALSTORAGE MANAGEMENT =====
const STORAGE_KEYS = {
    POSTS: 'blog_posts',
    AUTH: 'blog_admin_auth'
};

// Сохраняем посты в localStorage
function savePostsToStorage() {
    try {
        // Сохраняем ВСЕ данные включая imageData
        const postsToSave = appState.posts.map(post => ({
            id: post.id,
            title: post.title,
            description: post.description,
            date: post.date,
            image: post.image,
            imageType: post.imageType,
            imageData: post.imageData // Сохраняем данные изображения
        }));
        
        localStorage.setItem(STORAGE_KEYS.POSTS, JSON.stringify(postsToSave));
        console.log('Posts saved to localStorage, total:', postsToSave.length);
    } catch (error) {
        console.error('Error saving posts to localStorage:', error);
        showNotification('Ошибка сохранения постов', 'error');
    }
}

// Загружаем посты из localStorage
function loadPostsFromStorage() {
    try {
        const savedPosts = localStorage.getItem(STORAGE_KEYS.POSTS);
        if (savedPosts) {
            const parsedPosts = JSON.parse(savedPosts);
            appState.posts = parsedPosts;
            console.log('Posts loaded from localStorage:', parsedPosts.length);
            
            // Проверим, есть ли посты с изображениями
            const postsWithImages = parsedPosts.filter(post => post.imageData);
            console.log('Posts with images:', postsWithImages.length);
            
            return true;
        }
    } catch (error) {
        console.error('Error loading posts from localStorage:', error);
    }
    return false;
}
// ===== EVENT LISTENERS =====
function initializeEventListeners() {
    // Кнопка админа
    document.getElementById('adminBtn').addEventListener('click', () => {
        if (appState.isAuthenticated) {
            openModal('postModal');
        } else {
            openModal('authModal');
        }
    });
    // Показ имени выбранного файла
document.getElementById('postImage').addEventListener('change', function(e) {
    const fileName = this.files[0] ? this.files[0].name : 'Файл не выбран';
    document.getElementById('fileName').textContent = fileName;
    
    const label = document.getElementById('fileInputLabel');
    if (this.files[0]) {
        label.classList.add('has-file');
    } else {
        label.classList.remove('has-file');
    }
});
    // Форма аутентификации
    document.getElementById('authForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const password = document.getElementById('adminCode').value;
        login(password);
    });
    // Предпросмотр изображения
document.getElementById('postImage').addEventListener('change', function(e) {
    const file = this.files[0];
    const fileName = file ? file.name : 'Файл не выбран';
    document.getElementById('fileName').textContent = fileName;
    
    const label = document.getElementById('fileInputLabel');
    if (file) {
        label.classList.add('has-file');
        
        // Создаем превью (опционально)
        const reader = new FileReader();
        reader.onload = function(e) {
            // Можно добавить отображение превью где-то в форме
            console.log('Preview available:', e.target.result);
        };
        reader.readAsDataURL(file);
    } else {
        label.classList.remove('has-file');
    }
});
    // Форма создания поста
    document.getElementById('postForm').addEventListener('submit', (e) => {
        e.preventDefault();
        
        const formData = new FormData();
        formData.append('title', document.getElementById('postTitle').value);
        formData.append('text', document.getElementById('postText').value);
        formData.append('date', document.getElementById('postDate').value);
        
        const fileInput = document.getElementById('postImage');
        if (fileInput.files[0]) {
            formData.append('image', fileInput.files[0]);
        }
        
        handleCreatePost(formData);
    });

    // Кнопки закрытия модальных окон
    document.getElementById('closeAuthModal').addEventListener('click', () => closeModal('authModal'));
    document.getElementById('closePostModal').addEventListener('click', () => closeModal('postModal'));
    
    // Закрытие модальных окон по клику на фон
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeModal(modal.id);
            }
        });
    });
    
    // Закрытие по ESC
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && appState.currentModal) {
            closeCurrentModal();
        }
    });
}
// ===== IMAGE HANDLING =====
function handleImageUpload(file, postId) {
    return new Promise((resolve, reject) => {
        if (!file) {
            resolve(null);
            return;
        }

        const reader = new FileReader();
        reader.onload = function(e) {
            const imageData = e.target.result;
            
            console.log('Image loaded, size:', imageData.length); // Для отладки
            
            // Находим пост и обновляем его изображение
            const postIndex = appState.posts.findIndex(post => post.id === postId);
            if (postIndex !== -1) {
                appState.posts[postIndex].imageData = imageData;
                appState.posts[postIndex].imageType = 'uploaded';
                appState.posts[postIndex].image = 'uploaded';
                
                console.log('Post updated with image data'); // Для отладки
            }
            
            resolve(imageData);
        };
        
        reader.onerror = function() {
            reject(new Error('Ошибка чтения файла'));
        };
        
        reader.readAsDataURL(file);
    });
}
// ===== INITIALIZATION =====
document.addEventListener('DOMContentLoaded', function() {
    loadAuthConfig().then(success => {
        appState.configLoaded = success;
        
        if (!appState.configLoaded) {
            showNotification('Ошибка загрузки конфигурации', 'error');
        }
        
        // Пытаемся загрузить посты из localStorage
        const postsLoaded = loadPostsFromStorage();
        
        // Если постов нет в localStorage, загружаем тестовые
        if (!postsLoaded || appState.posts.length === 0) {
            initializeSampleData();
            savePostsToStorage(); // Сохраняем тестовые данные
        }

        
        checkAuthStatus();
        initializeEventListeners();
        renderPosts();
        document.getElementById('postDate').valueAsDate = new Date();
    });
});
