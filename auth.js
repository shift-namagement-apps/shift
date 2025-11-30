/**
 * シフト管理アプリ - 認証・画面遷移管理
 * ログイン状態の管理と画面遷移の制御
 */

// API_BASE_URLを取得するヘルパー関数
const getBaseUrl = () => window.API_BASE_URL || '';

const AUTH = {
    // ローカルストレージのキー
    TOKEN_KEY: 'shift_auth_token',
    USER_KEY: 'shift_user',
    
    /**
     * ログイン処理
     */
    async login(username, password) {
        try {
            const response = await this.request('POST', '/api/auth/login', {
                username: username,
                password: password
            });
            
            if (response.success) {
                // トークンとユーザー情報を保存
                this.saveToken(response.token);
                this.saveUser(response.user);
                
                console.log('✅ ログイン成功:', response.user);
                return {
                    success: true,
                    user: response.user
                };
            } else {
                return {
                    success: false,
                    error: response.error
                };
            }
        } catch (error) {
            console.error('❌ ログインエラー:', error);
            return {
                success: false,
                error: 'ログインに失敗しました'
            };
        }
    },
    
    /**
     * ログアウト処理
     */
    async logout() {
        try {
            const token = this.getToken();
            if (token) {
                // サーバー側にログアウトを通知（任意）
                await fetch(`${API_BASE_URL}/api/auth/logout`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                });
            }
        } catch (error) {
            console.error('ログアウトエラー:', error);
        } finally {
            // ローカルストレージをクリア
            this.clearAuth();
            console.log('✅ ログアウトしました');
        }
    },
    
    /**
     * トークン検証（修正版）
     */
    async verifyToken() {
        const token = this.getToken();
        
        if (!token) {
            return false;
        }
        
        try {
            const response = await fetch(`${getBaseUrl()}/api/auth/verify`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            // 401 (Unauthorized) の場合のみログアウトする
            if (response.status === 401) {
                console.warn('⚠️ トークンの有効期限切れ、または無効です');
                this.clearAuth();
                return false;
            }

            // サーバーエラー(500系)などの場合は、ログアウトせずにfalseだけ返す
            if (!response.ok) {
                console.warn(`⚠️ サーバー確認失敗: ${response.status}`);
                return false;
            }
            
            const data = await response.json();
            
            if (data.success) {
                this.saveUser(data.user);
                return true;
            } else {
                this.clearAuth();
                return false;
            }
        } catch (error) {
            // ネットワークエラーなどの場合はログアウトさせない
            console.error('トークン検証中の通信エラー:', error);
            return false;
        }
    },
    
    /**
     * トークンを保存
     */
    saveToken(token) {
        localStorage.setItem(this.TOKEN_KEY, token);
    },
    
    /**
     * トークンを取得
     */
    getToken() {
        return localStorage.getItem(this.TOKEN_KEY);
    },
    
    /**
     * ユーザー情報を保存
     */
    saveUser(user) {
        localStorage.setItem(this.USER_KEY, JSON.stringify(user));
    },
    
    /**
     * ユーザー情報を取得
     */
    getUser() {
        const userJson = localStorage.getItem(this.USER_KEY);
        return userJson ? JSON.parse(userJson) : null;
    },
    
    /**
     * 認証情報をクリア
     */
    clearAuth() {
        localStorage.removeItem(this.TOKEN_KEY);
        localStorage.removeItem(this.USER_KEY);
    },
    
    /**
     * ログイン状態をチェック
     */
    isLoggedIn() {
        return !!this.getToken();
    },
    
    /**
     * 管理者かどうかをチェック
     */
    isAdmin() {
        const user = this.getUser();
        return user && user.role === 'admin';
    },
    
    /**
     * 認証付きAPIリクエスト（修正版）
     */
    async request(method, endpoint, data = null) {
        const token = this.getToken();
        
        const options = {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': token ? `Bearer ${token}` : ''
            }
        };
        
        if (data && (method === 'POST' || method === 'PUT')) {
            options.body = JSON.stringify(data);
        }
        
        try {
            const response = await fetch(`${getBaseUrl()}${endpoint}`, options);
            
            if (response.status === 401) {
                this.clearAuth();
                ROUTER.navigate('index.html');
                return null;
            }

            const result = await response.json();
            return result;
        } catch (error) {
            console.error('API リクエストエラー:', error);
            return null;
        }
    }
};

// ==================== 画面遷移管理 ====================

const ROUTER = {
    /**
     * ページ遷移
     */
    navigate(page) {
        // BASE_PATHを考慮した遷移（config.jsで定義）
        const basePath = window.BASE_PATH || '/';
        const relativePage = page.startsWith('/') ? page.substring(1) : page;
        
        // GitHub Pages環境では /shift/ を含める
        if (basePath !== '/') {
            window.location.href = basePath + relativePage;
        } else {
            window.location.href = relativePage;
        }
    },
    
    /**
     * 認証が必要なページの保護（修正版）
     */
    protectPage() {
        const currentPage = window.location.pathname.split('/').pop();
        
        // ログインページとindex.htmlは除外
        if (currentPage === 'index.html' || currentPage === '' || !currentPage || currentPage === 'shift_login.html') {
            return;
        }
        
        // ログインしていない場合はログインページへ
        if (!AUTH.isLoggedIn()) {
            console.warn('⚠️ 未ログイン: ログインページへリダイレクト');
            this.navigate('index.html');
            return;
        }
        
        // 管理者専用ページの保護
        const adminPages = ['shift_home_admin.html', 'shitf_member.html'];
        if (adminPages.includes(currentPage) && !AUTH.isAdmin()) {
            console.warn('⚠️ 管理者権限が必要です');
            alert('管理者権限が必要です');
            this.navigate('shift_home_staff.html');
            return;
        }
    },
    
    /**
     * ログイン後のリダイレクト
     */
    redirectAfterLogin() {
        const user = AUTH.getUser();
        
        if (!user) {
            console.error('❌ ユーザー情報が取得できません');
            return;
        }
        
        // ロールに応じてリダイレクト
        if (user.role === 'admin') {
            console.log('🔑 管理者としてログイン');
            this.navigate('shift_home_admin.html');
        } else {
            console.log('👤 スタッフとしてログイン');
            this.navigate('shift_home_staff.html');
        }
    },
    
    /**
     * 現在のページ名を取得
     */
    getCurrentPage() {
        return window.location.pathname.split('/').pop();
    }
};

// ==================== ページ読み込み時の処理 ====================

document.addEventListener('DOMContentLoaded', async () => {
    console.log('🔐 認証システム初期化中...');
    
    const currentPage = ROUTER.getCurrentPage();
    console.log('📄 現在のページ:', currentPage);
    
    // ログインページの場合（index.html または shift_login.html）
    if (currentPage === 'index.html' || currentPage === 'shift_login.html' || currentPage === '') {
        console.log('ℹ️ ログインページ - 認証チェックをスキップ');
        // ログインページでは既存の認証情報をクリア（再ログインを強制）
        // これにより、ログインフォームの動作と競合しないようにする
        console.log('🧹 ログインページ: 既存認証情報をスキップ');
    } else {
        // その他のページは認証チェック
        console.log('🔒 保護されたページ - 認証チェック実行');
        ROUTER.protectPage();
        
        // トークンの検証
        if (AUTH.isLoggedIn()) {
            const isValid = await AUTH.verifyToken();
            // トークンが消された場合のみリダイレクト
            if (!AUTH.isLoggedIn()) {
                ROUTER.navigate('index.html');
            }
        }
    }
    
    console.log('✅ 認証システム初期化完了');
});

// ==================== ユーティリティ関数 ====================

/**
 * 現在のユーザー情報を表示
 */
function displayUserInfo() {
    const user = AUTH.getUser();
    
    if (!user) {
        return;
    }
    
    // ユーザー名表示エリアがあれば更新
    const userNameElement = document.getElementById('user-name');
    if (userNameElement) {
        userNameElement.textContent = user.name;
    }
    
    const userRoleElement = document.getElementById('user-role');
    if (userRoleElement) {
        userRoleElement.textContent = user.role === 'admin' ? '管理者' : 'スタッフ';
    }
}

/**
 * ログアウトボタンのイベントハンドラ
 */
async function handleLogout() {
    if (confirm('ログアウトしますか？')) {
        await AUTH.logout();
        ROUTER.navigate('index.html');
    }
}

// グローバルスコープに公開
window.AUTH = AUTH;
window.ROUTER = ROUTER;
window.displayUserInfo = displayUserInfo;
window.handleLogout = handleLogout;
