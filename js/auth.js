/**
 * auth.js - Modul autentikasi sederhana (client-side) untuk WebGIS Surabaya.
 *
 * Catatan: Website ini adalah website statis (tanpa backend), sehingga
 * autentikasi dilakukan di sisi browser menggunakan sessionStorage.
 * Cukup untuk keperluan demo dan pengujian otomatis (Katalon Studio).
 */
const Auth = (function () {
    // Akun demo admin (ditampilkan juga di halaman login)
    const DEMO_ACCOUNT = {
        username: 'admin',
        password: 'Surabaya123'
    };

    const SESSION_KEY = 'webgis_surabaya_user';

    /**
     * Validasi input login.
     * @returns {{success: boolean, message: string}}
     */
    function login(username, password) {
        const user = (username || '').trim();
        const pass = password || '';

        if (user === '' && pass === '') {
            return { success: false, message: 'Username dan password wajib diisi!' };
        }
        if (user === '') {
            return { success: false, message: 'Username wajib diisi!' };
        }
        if (pass === '') {
            return { success: false, message: 'Password wajib diisi!' };
        }
        if (user !== DEMO_ACCOUNT.username || pass !== DEMO_ACCOUNT.password) {
            return { success: false, message: 'Login gagal! Username atau password salah.' };
        }

        sessionStorage.setItem(SESSION_KEY, user);
        return { success: true, message: 'Login berhasil! Selamat datang, ' + user + '.' };
    }

    function logout() {
        sessionStorage.removeItem(SESSION_KEY);
    }

    function getUser() {
        return sessionStorage.getItem(SESSION_KEY);
    }

    function isLoggedIn() {
        return !!getUser();
    }

    return { login, logout, getUser, isLoggedIn };
})();
