// security.js - безопасное хранение конфигурации
class AuthSecurity {
    constructor() {
        // Шифрованные данные (base64)
        this.encryptedData = {
            password: 'bXlzZWNyZXQxMjM=', // 'mysecret123' в base64
            storageKey: 'YmxvZ19hZG1pbl9hdXRo', // 'blog_admin_auth' в base64
            sessionTime: 'ODY0MDAwMDA=' // '86400000' в base64 (24 часа)
        };
    }

    // Метод для получения расшифрованных данных
    getConfig() {
        return {
            adminPassword: this.decode(this.encryptedData.password),
            storageKey: this.decode(this.encryptedData.storageKey),
            sessionDuration: parseInt(this.decode(this.encryptedData.sessionTime))
        };
    }

    // Простое декодирование base64
    decode(encoded) {
        return atob(encoded);
    }

    // Можно добавить более сложное шифрование при необходимости
    encrypt(text) {
        return btoa(text);
    }
}

// Экспортируем класс, а не экземпляр
export { AuthSecurity };