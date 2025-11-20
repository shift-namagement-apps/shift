/**
 * シフト管理アプリ - 認証・画面遷移管理
 * 修正版
 */

// 設定ファイルで window.API_BASE_URL が定義されている前提
// 定数がなければ window オブジェクトから取得するヘルパー
const getBaseUrl = () => window.API_BASE_URL || ''; 

const AUTH = {
    TOKEN_KEY: 'shift_app_token',
    USER_KEY: 'shift_app_user',
    
    // ... (login, logout 関数はそのまま) ...

    /**
     * トークン検証（修正版）
     */
    async verifyToken() {
        const token = this.getToken();
        
        if (!token) {
            return false;
        }
        
        try {
            // API_BASE_URLの参照方法を修正
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
            // (一時的なサーバーダウンでログアウトさせないため)
            if (!response.ok) {
                console.warn(`⚠️ サーバー確認失敗: ${response.status}`);
                return false; 
            }
            
            const data = await response.json();
            
            if (data.success) {
                this.saveUser(data.user);
                return true;
            } else {
                // 明示的に失敗が返された場合
                this.clearAuth();
                return false;
            }
        } catch (error) {
            // ネットワークエラーなどの場合はログアウトさせない！
            console.error('トークン検証中の通信エラー:', error);
            // this.clearAuth();  <-- 削除しました
            return false; 
        }
    },

    // ... (saveToken, getToken などの関数はそのまま) ...

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
            // API_BASE_URLの参照方法を修正
            const response = await fetch(`${getBaseUrl()}${endpoint}`, options);
            
            if (response.status === 401) {
                this.clearAuth();
                ROUTER.navigate('/shift_login.html');
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
    // ... (navigate 関数はそのまま) ...

    /**
     * 認証が必要なページの保護（タイポ修正）
     */
    protectPage() {
        const currentPage = window.location.pathname.split('/').pop();
        
        if (currentPage === 'index.html' || currentPage === '' || !currentPage || currentPage === 'shift_login.html') {
            return;
        }
        
        if (!AUTH.isLoggedIn()) {
            console.warn('⚠️ 未ログイン: ログインページへリダイレクト');
            this.navigate('shift_login.html'); // index.htmlではなくログインページへ
            return;
        }
        
        // タイポ修正: shitf -> shift
        const adminPages = ['shift_home_admin.html', 'shift_member.html'];
        
        if (adminPages.includes(currentPage) && !AUTH.isAdmin()) {
            console.warn('⚠️ 管理者権限が必要です');
            alert('管理者権限が必要です');
            this.navigate('shift_home_staff.html');
            return;
        }
    },
    
    // ... (残りの関数はそのまま) ...
};

// ==================== ページ読み込み時の処理 ====================

document.addEventListener('DOMContentLoaded', async () => {
    // ... (前半そのまま) ...

    } else {
        // その他のページは認証チェック
        ROUTER.protectPage();
        
        // トークンの検証
        if (AUTH.isLoggedIn()) {
            const isValid = await AUTH.verifyToken();
            // isValidがfalseでも、通信エラーの可能性があるので
            // 即座にリダイレクトするかは慎重に判断する。
            // ただし、protectPage()でトークン有無は確認しているので
            // ここでは「401が返ってきてトークンが消された場合」のみリダイレクトする
            if (!AUTH.isLoggedIn()) { 
                ROUTER.navigate('/shift_login.html');
            }
        }
    }
    
    console.log('✅ 認証システム初期化完了');
});

// ... (残りの部分そのまま) ...
