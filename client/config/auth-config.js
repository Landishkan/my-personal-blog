// Временная конфигурация аутентификации
// ПОМНИ: Это только для разработки! В продакшене пароль должен храниться на сервере!

const authConfig = {
    // Временный пароль для доступа к админ-панели
    // Можешь поменять на любой другой
    adminPassword: "mysecret123",
    
    // Ключ для хранения статуса авторизации в localStorage
    storageKey: "blog_admin_auth",
    
    // Время жизни сессии (в миллисекундах) - 24 часа
    sessionDuration: 24 * 60 * 60 * 1000
};

// Не экспортируем сам объект, чтобы усложнить доступ из консоли
export function getAuthConfig() {
    return {
        adminPassword: authConfig.adminPassword,
        storageKey: authConfig.storageKey,
        sessionDuration: authConfig.sessionDuration
    };
}