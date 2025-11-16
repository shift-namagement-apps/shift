// シフト表アプリケーション - image.png 再現度向上版

const appState = {
    currentYear: 2025,
    currentMonth: 10,
    selectedHome: 'A', // 画像に合わせて 'A' をデフォルトに
    shifts: {},
    shiftRequests: [],
    staff: [],
    editingCell: null // { staffId, staffName, date }
};

const SHIFT_CODES = {
    A: { name: '日勤', time: '10時～19時', class: 'shift-a' },
    B: { name: '夜勤', time: '22時～7時', class: 'shift-b' },
    C: { name: '遅番', time: '13時～22時', class: 'shift-c' },
    EL: { name: '早朝', time: '7時～10時', class: 'shift-el' },
    N: { name: '公休', time: '', class: 'shift-n' },
    L: { name: '有休', time: '', class: 'shift-l' },
    SP: { name: '特休', time: '', class: 'shift-sp' },
    NONE: { name: '未定', time: '', class: 'shift-none' }
};

console.log('シフト表アプリケーション初期化中 (高再現度モード)...');

// --- ページルーティング設定 ---------------------------------
const PAGE_CONFIG = {
    // 認証不要のページ（index.htmlがログイン画面）
    public: ['index.html'],
    
    // 管理者専用ページ
    adminOnly: [
        'shift_home_admin.html',
        'shift_staff.html',
        'shitf_member.html',
        'setting.html',
        'shift_create.html'  // シフト作成は管理者専用
    ],
    
    // スタッフ用ページ
    staffPages: [
        'shift_home_staff.html',
        'shift_submission.html',
        'shift_view.html'
    ],

    // ページ遷移マップ（画面名と説明）
    pageMap: {
        'index.html': { name: 'ログイン', requiresAuth: false },
        'shift_home_admin.html': { name: '管理者ホーム', requiresAuth: true, adminOnly: true },
        'shift_home_staff.html': { name: 'スタッフホーム', requiresAuth: true },
        'shift_staff.html': { name: 'シフト管理', requiresAuth: true, adminOnly: true },
        'shift_create.html': { name: 'シフト作成', requiresAuth: true, adminOnly: true },
        'shift_view.html': { name: 'シフト閲覧', requiresAuth: true },
        'shift_submission.html': { name: 'シフト提出', requiresAuth: true },
        'shitf_member.html': { name: 'メンバー管理', requiresAuth: true, adminOnly: true },
        'setting.html': { name: '設定', requiresAuth: true, adminOnly: true }
    },

    // 条件付きページ遷移の例
    canNavigate(fromPage, toPage, userRole) {
        const targetPage = this.pageMap[toPage];
        
        if (!targetPage) {
            console.error('❌ 不明なページ:', toPage);
            return false;
        }

        // 認証が必要なページ
        if (targetPage.requiresAuth && !userRole) {
            console.warn('⚠️ 認証が必要です');
            return false;
        }

        // 管理者専用ページ
        if (targetPage.adminOnly && userRole !== 'admin') {
            console.warn('⚠️ 管理者権限が必要です');
            return false;
        }

        return true;
    }
};

// --- ページ遷移ヘルパー --------------------------------------
const PageRouter = {
    /**
     * 現在のページ名を取得
     */
    getCurrentPage() {
        const path = window.location.pathname;
        const filename = path.substring(path.lastIndexOf('/') + 1);
        return filename || 'index.html';
    },

    /**
     * ページ遷移を実行
     */
    navigate(pageName) {
        console.log(`📄 ページ遷移: ${pageName}`);
        window.location.href = pageName;
    },

    /**
     * 条件付きページ遷移（権限チェック付き）
     */
    navigateWithCheck(pageName) {
        const currentPage = this.getCurrentPage();
        let userRole = null;

        // ユーザーロールを取得
        if (typeof AUTH !== 'undefined') {
            userRole = AUTH.isAdmin() ? 'admin' : 'staff';
        }

        // 遷移可能かチェック
        if (PAGE_CONFIG.canNavigate(currentPage, pageName, userRole)) {
            this.navigate(pageName);
        } else {
            alert('このページにアクセスする権限がありません');
        }
    },

    /**
     * 認証状態に基づいてページアクセスを制御
     */
    async checkPageAccess() {
        const currentPage = this.getCurrentPage();
        
        // 公開ページは認証不要
        if (PAGE_CONFIG.public.includes(currentPage)) {
            console.log('✅ 公開ページ:', currentPage);
            return true;
        }

        // AUTH オブジェクトが利用可能かチェック
        if (typeof AUTH === 'undefined') {
            console.warn('⚠️ AUTH未定義: ログインページへリダイレクト');
            this.navigate('index.html');
            return false;
        }

        // 認証チェック
        const isAuthenticated = await AUTH.verifyToken();
        if (!isAuthenticated) {
            console.warn('⚠️ 未認証: ログインページへリダイレクト');
            this.navigate('index.html');
            return false;
        }

        // ロール別アクセス制御
        const isAdmin = AUTH.isAdmin();
        
        // 管理者専用ページのチェック
        if (PAGE_CONFIG.adminOnly.includes(currentPage) && !isAdmin) {
            console.error('❌ 管理者権限が必要です');
            alert('このページにアクセスする権限がありません');
            this.navigate(isAdmin ? 'shift_home_admin.html' : 'shift_home_staff.html');
            return false;
        }

        // スタッフページのチェック（管理者もアクセス可能）
        if (PAGE_CONFIG.staffPages.includes(currentPage)) {
            console.log('✅ スタッフページアクセス:', currentPage);
            return true;
        }

        console.log('✅ アクセス許可:', currentPage);
        return true;
    },

    /**
     * ログアウト処理
     */
    async logout() {
        if (typeof AUTH !== 'undefined' && typeof AUTH.logout === 'function') {
            await AUTH.logout();
        } else {
            // AUTH未定義の場合、ローカルストレージをクリア
            localStorage.removeItem('token');
            localStorage.removeItem('user');
        }
        console.log('🚪 ログアウト完了');
        this.navigate('index.html');
    },

    /**
     * ホームページへ遷移（ロールに応じて）
     */
    goHome() {
        if (typeof AUTH !== 'undefined' && AUTH.isAdmin()) {
            this.navigate('shift_home_admin.html');
        } else {
            this.navigate('shift_home_staff.html');
        }
    }
};

// --- DOM要素 -------------------------------------------------
let dom = {}; // DOM要素をキャッシュするオブジェクト

// --- 初期化 -------------------------------------------------
document.addEventListener('DOMContentLoaded', async () => {
    // ページアクセス権限チェック
    const hasAccess = await PageRouter.checkPageAccess();
    if (!hasAccess) {
        console.log('⛔ ページアクセス拒否');
        return; // 初期化を中断
    }

    // DOM要素のキャッシュ
    dom = {
        yearSelect: document.getElementById('year-select'),
        monthSelect: document.getElementById('month-select'),
        homeSelect: document.getElementById('home-select'),
        shiftTableHead: document.getElementById('shift-table-header'),
        shiftTableBody: document.getElementById('shift-table-body'),
        dailySummaryBody: document.getElementById('daily-summary-body'),
        shiftRequestList: document.getElementById('shift-request-list'),
        monthlySummary: document.getElementById('monthly-summary'),
        homeSummary: document.getElementById('home-summary'),
        
        // モーダル
        modal: document.getElementById('edit-modal'),
        modalCloseBtn: document.querySelector('.modal-close'),
        modalCancelBtn: document.getElementById('modal-cancel-btn'),
        modalSaveBtn: document.getElementById('modal-save-btn'),
        modalStaffName: document.getElementById('modal-staff-name'),
        modalDate: document.getElementById('modal-date'),
        modalShiftCode: document.getElementById('modal-shift-code'),
        modalHome: document.getElementById('modal-home'),

        // ナビゲーションボタン
        logoutBtn: document.getElementById('logout-btn'),
        homeBtn: document.getElementById('home-btn'),
        backBtn: document.getElementById('back-btn')
    };

    // Firebaseからデータをロード（失敗時はダミーデータ）
    await loadDataFromFirebase();

    // イベントリスナーの設定
    setupEventListeners();

    // 初期描画
    render();
    
    // 画像に合わせて初期値を設定
    if (dom.yearSelect) dom.yearSelect.value = appState.currentYear;
    if (dom.monthSelect) dom.monthSelect.value = appState.currentMonth;
    if (dom.homeSelect) dom.homeSelect.value = appState.selectedHome;

    console.log('アプリケーションの準備が完了しました。');
});

/**
 * Firebaseからデータをロード（失敗時はダミーデータ）
 */
async function loadDataFromFirebase() {
    try {
        // APIが利用可能かチェック
        if (typeof API === 'undefined' || typeof API_BASE_URL === 'undefined') {
            console.warn('⚠️ API未設定: ダミーデータを使用します');
            loadDummyData();
            return;
        }

        console.log('📥 Firebaseからデータを読み込み中...');

        // スタッフデータを取得
        const staffResponse = await API.get('/api/staff');
        if (staffResponse && staffResponse.success && staffResponse.staff.length > 0) {
            appState.staff = staffResponse.staff;
            console.log(`✅ ${staffResponse.count}名のスタッフを読み込みました`);
        } else {
            console.warn('⚠️ スタッフデータがありません。ダミーデータを使用します。');
            loadDummyData();
            return;
        }

        // シフトデータを取得
        const shiftsResponse = await API.get('/api/shifts', {
            year: appState.currentYear,
            month: appState.currentMonth
        });

        if (shiftsResponse && shiftsResponse.success) {
            // Firestoreのデータ構造を変換
            appState.shifts = {};
            shiftsResponse.shifts.forEach(shift => {
                if (!appState.shifts[shift.staff_id]) {
                    appState.shifts[shift.staff_id] = {};
                }
                appState.shifts[shift.staff_id][shift.day.toString()] = {
                    code: shift.shift_code,
                    home: shift.home
                };
            });
            console.log(`✅ ${shiftsResponse.count}件のシフトを読み込みました`);
        }

        // シフト要望を取得
        const requestsResponse = await API.get('/api/shift-requests', {
            year: appState.currentYear,
            month: appState.currentMonth
        });

        if (requestsResponse && requestsResponse.success) {
            appState.shiftRequests = requestsResponse.requests.map(req => ({
                id: req.id,
                staffName: req.staff_name,
                request: `${req.day}日 ${req.request}`,
                status: req.status
            }));
            console.log(`✅ ${requestsResponse.count}件の要望を読み込みました`);
        }

    } catch (error) {
        console.error('❌ Firebase読み込みエラー:', error);
        console.warn('⚠️ ダミーデータを使用します');
        loadDummyData();
    }
}

/**
 * ダミーデータをappStateにロードする
 * (image.pngに基づいたデータ)
 */
function loadDummyData() {
    appState.staff = [
        { id: 's1', name: '平田 太郎', home: 'A' },
        { id: 's2', name: '山田 美咲', home: 'A' },
        { id: 's3', name: '高橋 大輔', home: 'A' },
        { id: 's4', name: '小林 彩香', home: 'A' },
        { id: 's5', name: '井上 隼人', home: 'A' },
        { id: 's6', name: '山崎 麻衣', home: 'A' },
        { id: 's7', name: '田中 悠斗', home: 'A' },
        { id: 's8', name: '村上 茉優', home: 'A' },
        { id: 's9', name: '佐藤 健太', home: 'A' },
        { id: 's10', name: '伊藤 愛美', home: 'A' },
        { id: 's11', name: '渡辺 翔太', home: 'A' },
        { id: 's12', name: '中村 結衣', home: 'A' },
        { id: 's13', name: '加藤 海斗', home: 'A' },
        { id: 's14', name: '松本 優花', home: 'A' },
        { id: 's15', name: '木村 蓮', home: 'A' },
        { id: 's16', name: '林 七海', home: 'A' },
        { id: 's17', name: '斉藤 陽向', home: 'A' },
        { id: 's18', name: '清水 さくら', home: 'A' },
        { id: 's19', name: '山本 駿', home: 'A' },
        { id: 's20', name: '森 楓', home: 'A' },
    ];

    // image.png に表示されている10日分のデータ（色分け用に各ホームに分散）
    appState.shifts = {
        's1': { // 平田 太郎 - 主にAホーム
            '1': { code: 'C', home: 'A' }, '2': { code: 'A', home: 'A' }, '3': { code: 'C', home: 'B' }, '4': { code: 'C', home: 'A' },
            '5': { code: 'EL', home: 'A' }, '6': { code: 'C', home: 'A' }, '7': { code: 'A', home: 'B' }, '8': { code: 'EL', home: 'A' },
            '9': { code: 'N', home: 'A' }, '10': { code: 'EL', home: 'A' },
        },
        's2': { // 山田 美咲 - 主にBホーム
            '1': { code: 'N', home: 'B' }, '2': { code: 'EL', home: 'B' }, '3': { code: 'B', home: 'B' }, '4': { code: 'NONE', home: '' },
            '5': { code: 'NONE', home: '' }, '6': { code: 'C', home: 'B' }, '7': { code: 'A', home: 'A' }, '8': { code: 'NONE', home: '' },
            '9': { code: 'C', home: 'B' }, '10': { code: 'A', home: 'B' },
        },
        's3': { // 高橋 大輔 - 主にCホーム
            '1': { code: 'N', home: 'C' }, '2': { code: 'C', home: 'C' }, '3': { code: 'N', home: 'C' }, '4': { code: 'C', home: 'C' },
            '5': { code: 'L', home: 'C' }, '6': { code: 'B', home: 'A' }, '7': { code: 'C', home: 'C' }, '8': { code: 'L', home: 'C' },
            '9': { code: 'C', home: 'C' }, '10': { code: 'L', home: 'C' },
        },
        's4': { // 小林 彩香 - 主にDホーム
            '1': { code: 'L', home: 'D' }, '2': { code: 'C', home: 'D' }, '3': { code: 'B', home: 'D' }, '4': { code: 'NONE', home: '' },
            '5': { code: 'NONE', home: '' }, '6': { code: 'C', home: 'D' }, '7': { code: 'B', home: 'D' }, '8': { code: 'NONE', home: '' },
            '9': { code: 'L', home: 'D' }, '10': { code: 'C', home: 'D' },
        },
        's5': { // 井上 隼人 - 主にEホーム
            '1': { code: 'L', home: 'E' }, '2': { code: 'L', home: 'E' }, '3': { code: 'NONE', home: '' }, '4': { code: 'N', home: 'E' },
            '5': { code: 'A', home: 'E' }, '6': { code: 'C', home: 'E' }, '7': { code: 'A', home: 'A' }, '8': { code: 'EL', home: 'E' },
            '9': { code: 'L', home: 'E' }, '10': { code: 'EL', home: 'E' },
        },
        's6': { // 山崎 麻衣 - 主にAホーム
            '1': { code: 'EL', home: 'A' }, '2': { code: 'L', home: 'A' }, '3': { code: 'L', home: 'A' }, '4': { code: 'NONE', home: '' },
            '5': { code: 'B', home: 'B' }, '6': { code: 'EL', home: 'A' }, '7': { code: 'L', home: 'A' }, '8': { code: 'NONE', home: '' },
            '9': { code: 'L', home: 'A' }, '10': { code: 'N', home: 'A' },
        },
        's7': { // 田中 悠斗 - 主にBホーム
            '1': { code: 'NONE', home: '' }, '2': { code: 'L', home: 'B' }, '3': { code: 'C', home: 'B' }, '4': { code: 'A', home: 'B' },
            '5': { code: 'A', home: 'C' }, '6': { code: 'B', home: 'B' }, '7': { code: 'A', home: 'B' }, '8': { code: 'B', home: 'B' },
            '9': { code: 'EL', home: 'B' }, '10': { code: 'NONE', home: '' },
        },
        's8': { // 村上 茉優 - 主にCホーム
            '1': { code: 'NONE', home: '' }, '2': { code: 'B', home: 'C' }, '3': { code: 'N', home: 'C' }, '4': { code: 'NONE', home: '' },
            '5': { code: 'C', home: 'D' }, '6': { code: 'N', home: 'C' }, '7': { code: 'B', home: 'C' }, '8': { code: 'NONE', home: '' },
            '9': { code: 'N', home: 'C' }, '10': { code: 'A', home: 'C' },
        },
        's9': { // 佐藤 健太 - 主にDホーム
            '1': { code: 'A', home: 'D' }, '2': { code: 'C', home: 'D' }, '3': { code: 'A', home: 'D' }, '4': { code: 'B', home: 'E' },
            '5': { code: 'N', home: 'D' }, '6': { code: 'A', home: 'D' }, '7': { code: 'C', home: 'D' }, '8': { code: 'A', home: 'D' },
            '9': { code: 'B', home: 'D' }, '10': { code: 'N', home: 'D' },
        },
        's10': { // 伊藤 愛美 - 主にEホーム
            '1': { code: 'C', home: 'E' }, '2': { code: 'A', home: 'E' }, '3': { code: 'L', home: 'E' }, '4': { code: 'C', home: 'E' },
            '5': { code: 'B', home: 'E' }, '6': { code: 'L', home: 'E' }, '7': { code: 'N', home: 'E' }, '8': { code: 'C', home: 'E' },
            '9': { code: 'A', home: 'E' }, '10': { code: 'B', home: 'E' },
        },
        's11': { // 渡辺 翔太 - 主にAホーム
            '1': { code: 'A', home: 'A' }, '2': { code: 'C', home: 'A' }, '3': { code: 'A', home: 'A' }, '4': { code: 'B', home: 'A' },
            '5': { code: 'N', home: 'A' }, '6': { code: 'A', home: 'A' }, '7': { code: 'C', home: 'A' }, '8': { code: 'L', home: 'A' },
            '9': { code: 'A', home: 'A' }, '10': { code: 'C', home: 'A' },
        },
        's12': { // 中村 結衣 - 主にBホーム
            '1': { code: 'B', home: 'B' }, '2': { code: 'A', home: 'B' }, '3': { code: 'C', home: 'B' }, '4': { code: 'N', home: 'B' },
            '5': { code: 'B', home: 'B' }, '6': { code: 'A', home: 'B' }, '7': { code: 'L', home: 'B' }, '8': { code: 'C', home: 'B' },
            '9': { code: 'A', home: 'B' }, '10': { code: 'B', home: 'B' },
        },
        's13': { // 加藤 海斗 - 主にCホーム
            '1': { code: 'C', home: 'C' }, '2': { code: 'N', home: 'C' }, '3': { code: 'A', home: 'C' }, '4': { code: 'C', home: 'C' },
            '5': { code: 'B', home: 'C' }, '6': { code: 'C', home: 'C' }, '7': { code: 'A', home: 'C' }, '8': { code: 'N', home: 'C' },
            '9': { code: 'C', home: 'C' }, '10': { code: 'L', home: 'C' },
        },
        's14': { // 松本 優花 - 主にDホーム
            '1': { code: 'A', home: 'D' }, '2': { code: 'C', home: 'D' }, '3': { code: 'B', home: 'D' }, '4': { code: 'A', home: 'D' },
            '5': { code: 'L', home: 'D' }, '6': { code: 'C', home: 'D' }, '7': { code: 'A', home: 'D' }, '8': { code: 'B', home: 'D' },
            '9': { code: 'N', home: 'D' }, '10': { code: 'A', home: 'D' },
        },
        's15': { // 木村 蓮 - 主にEホーム
            '1': { code: 'L', home: 'E' }, '2': { code: 'C', home: 'E' }, '3': { code: 'A', home: 'E' }, '4': { code: 'C', home: 'E' },
            '5': { code: 'A', home: 'E' }, '6': { code: 'B', home: 'E' }, '7': { code: 'C', home: 'E' }, '8': { code: 'A', home: 'E' },
            '9': { code: 'L', home: 'E' }, '10': { code: 'N', home: 'E' },
        },
        's16': { // 林 七海 - 主にAホーム
            '1': { code: 'C', home: 'A' }, '2': { code: 'A', home: 'A' }, '3': { code: 'L', home: 'A' }, '4': { code: 'C', home: 'A' },
            '5': { code: 'A', home: 'A' }, '6': { code: 'N', home: 'A' }, '7': { code: 'B', home: 'A' }, '8': { code: 'A', home: 'A' },
            '9': { code: 'C', home: 'A' }, '10': { code: 'A', home: 'A' },
        },
        's17': { // 斉藤 陽向 - 主にBホーム
            '1': { code: 'A', home: 'B' }, '2': { code: 'B', home: 'B' }, '3': { code: 'C', home: 'B' }, '4': { code: 'A', home: 'B' },
            '5': { code: 'N', home: 'B' }, '6': { code: 'C', home: 'B' }, '7': { code: 'A', home: 'B' }, '8': { code: 'B', home: 'B' },
            '9': { code: 'L', home: 'B' }, '10': { code: 'A', home: 'B' },
        },
        's18': { // 清水 さくら - 主にCホーム
            '1': { code: 'B', home: 'C' }, '2': { code: 'C', home: 'C' }, '3': { code: 'A', home: 'C' }, '4': { code: 'L', home: 'C' },
            '5': { code: 'C', home: 'C' }, '6': { code: 'A', home: 'C' }, '7': { code: 'N', home: 'C' }, '8': { code: 'C', home: 'C' },
            '9': { code: 'B', home: 'C' }, '10': { code: 'A', home: 'C' },
        },
        's19': { // 山本 駿 - 主にDホーム
            '1': { code: 'C', home: 'D' }, '2': { code: 'A', home: 'D' }, '3': { code: 'N', home: 'D' }, '4': { code: 'C', home: 'D' },
            '5': { code: 'A', home: 'D' }, '6': { code: 'B', home: 'D' }, '7': { code: 'C', home: 'D' }, '8': { code: 'A', home: 'D' },
            '9': { code: 'L', home: 'D' }, '10': { code: 'C', home: 'D' },
        },
        's20': { // 森 楓 - 主にEホーム
            '1': { code: 'A', home: 'E' }, '2': { code: 'L', home: 'E' }, '3': { code: 'C', home: 'E' }, '4': { code: 'A', home: 'E' },
            '5': { code: 'C', home: 'E' }, '6': { code: 'A', home: 'E' }, '7': { code: 'B', home: 'E' }, '8': { code: 'N', home: 'E' },
            '9': { code: 'C', home: 'E' }, '10': { code: 'A', home: 'E' },
        },
    };
    
    // image.png に表示されている要望データ
    appState.shiftRequests = [
        { id: 'r1', staffName: '平田 郎', request: '3日 10時〜19時' }, 
        { id: 'r2', staffName: '南別府 花子', request: '5日 22時〜7時' },
        { id: 'r3', staffName: '今寺 次郎', request: '10日 7時〜10時' },
        { id: 'r4', staffName: '山田 美咲', request: '12日 13時〜22時' },
        { id: 'r5', staffName: '佐藤 綾', request: '...' }, // 画像で見切れている部分
    ];
}

/**
 * イベントリスナーをまとめて設定
 */
function setupEventListeners() {
    // 日付・ホーム変更
    if (dom.yearSelect) dom.yearSelect.addEventListener('change', handleDateChange);
    if (dom.monthSelect) dom.monthSelect.addEventListener('change', handleDateChange);
    if (dom.homeSelect) dom.homeSelect.addEventListener('change', handleHomeFilterChange);

    // シフト表のセルクリック（イベント委任）
    if (dom.shiftTableBody) dom.shiftTableBody.addEventListener('click', handleCellClick);
    
    // モーダル関連
    if (dom.modalCloseBtn) dom.modalCloseBtn.addEventListener('click', closeModal);
    if (dom.modalCancelBtn) dom.modalCancelBtn.addEventListener('click', closeModal);
    if (dom.modalSaveBtn) dom.modalSaveBtn.addEventListener('click', handleModalSave);

    // ナビゲーションボタン
    if (dom.logoutBtn) {
        dom.logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (confirm('ログアウトしますか?')) {
                PageRouter.logout();
            }
        });
    }
    
    if (dom.homeBtn) {
        dom.homeBtn.addEventListener('click', (e) => {
            e.preventDefault();
            PageRouter.goHome();
        });
    }
    
    if (dom.backBtn) {
        dom.backBtn.addEventListener('click', (e) => {
            e.preventDefault();
            window.history.back();
        });
    }

    // 要望関連
    if (dom.shiftRequestList) {
        dom.shiftRequestList.addEventListener('click', (e) => {
            if (e.target.classList.contains('btn-reflect')) {
                console.log('個別反映ボタンがクリックされました。', e.target.closest('.shift-request-item'));
                alert('個別反映機能は未実装です。');
            }
        });
    }
    
    const reflectAllBtn = document.getElementById('reflect-all-btn');
    if (reflectAllBtn) {
        reflectAllBtn.addEventListener('click', () => {
            console.log('すべて一括反映ボタンがクリックされました。');
            alert('一括反映機能は未実装です。');
        });
    }
}

// --- レンダリング関数 ---------------------------------------

/**
 * すべての表示を更新する
 */
function render() {
    // *** 変更点：image.pngに合わせて10日間のみ描画 ***
    const daysToRender = 10;
    
    // フィルタリングされたスタッフリストを取得
    const filteredStaff = getFilteredStaff();
    
    // 1. シフト表ヘッダー
    renderTableHeader(daysToRender);
    
    // 2. シフト表ボディ
    renderShiftTable(filteredStaff, daysToRender);
    
    // 3. シフト要望
    renderShiftRequests();
    
    // 4. 集計（日次・月間）
    renderSummaries(daysToRender);
}

/**
 * シフト表のヘッダー（日付）を描画
 */
function renderTableHeader(daysCount) {
    let html = '<tr><th>スタッフ名</th>';
    for (let day = 1; day <= daysCount; day++) {
        html += `<th>${day}</th>`;
    }
    html += '<th>月合計</th></tr>';
    dom.shiftTableHead.innerHTML = html;
}

/**
 * シフト表のボディ（スタッフごと）を描画
 */
function renderShiftTable(staffList, daysCount) {
    let html = '';
    
    // image.png に表示されている月合計の固定データ
    const totalDaysImg = { 
        's1': '29日', 's2': '28日', 's3': '30日', 's4': '26日', 
        's5': '25日', 's6': '24日', 's7': '27日', 's8': '24日',
        's9': '28日', 's10': '29日'
    };

    staffList.forEach(staff => {
        html += `<tr><td>${staff.name}</td>`;
        
        const staffShifts = appState.shifts[staff.id] || {};

        for (let day = 1; day <= daysCount; day++) {
            const shift = staffShifts[day.toString()] || { code: 'NONE', home: '' };
            const shiftInfo = SHIFT_CODES[shift.code] || SHIFT_CODES['NONE'];
            
            // 画像の5, 8, 10日のハイライトを再現
            const isHighlight = (day === 5 || day === 8 || day === 10);
            
            // ホーム別の背景色クラスを追加
            const homeClass = shift.home ? `home-${shift.home.toLowerCase()}` : '';
            
            html += `<td 
                        class="${isHighlight ? 'cell-highlight' : ''} ${homeClass}"
                        data-staff-id="${staff.id}"
                        data-staff-name="${staff.name}"
                        data-date="${day}">`;
                        
            if (shift.code !== 'NONE') {
                html += `<div class="shift-code ${shiftInfo.class}">${shift.code}</div>`;
            }
            html += '</td>';
        }
        
        // 月合計 (画像のダミーデータに合わせる)
        html += `<td>${totalDaysImg[staff.id] || 'N/A'}</td>`;
        html += '</tr>';
    });
    
    dom.shiftTableBody.innerHTML = html;
}

/**
 * シフト要望リストを描画
 */
function renderShiftRequests() {
    let html = '';
    // 画像に表示されている5件のみ描画
    appState.shiftRequests.slice(0, 5).forEach(req => {
        html += `
            <li class="shift-request-item" data-request-id="${req.id}">
                <div class="staff-name">${req.staffName}</div>
                <div class="request-time">${req.request}</div>
                <button class="btn btn-reflect">反映</button>
            </li>
        `;
    });
    dom.shiftRequestList.innerHTML = html;
}

/**
 * 右パネルと下部の集計を描画
 * (注: 画像の値の固定表示で再現)
 */
function renderSummaries(daysCount) { // daysCount は 10
    
    // 1. 月間集計 (右パネル) - 固定データ
    const monthlySummaryData = {
        '日勤 (A)': 199, '夜勤 (B)': 231, '遅番 (C)': 248, '早朝 (EL)': 236,
        '有休 (L)': 225, '公休 (N)': 210, '特休 (SP)': 0
    };
    let monthlyHtml = '';
    for (const [label, value] of Object.entries(monthlySummaryData)) {
        monthlyHtml += `
            <li class="summary-list-item">
                <span class="label">${label}</span>
                <span class="value">${value}</span>
            </li>`;
    }
    dom.monthlySummary.innerHTML = monthlyHtml;

    // 2. ホーム別月間合計 (右パネル) - 動的計算
    const homeCounts = { A: 0, B: 0, C: 0, D: 0, E: 0 };
    
    // 全スタッフの全シフトをカウント
    appState.staff.forEach(staff => {
        const staffShifts = appState.shifts[staff.id] || {};
        Object.values(staffShifts).forEach(shift => {
            if (shift.home && shift.code !== 'NONE') {
                homeCounts[shift.home] = (homeCounts[shift.home] || 0) + 1;
            }
        });
    });
    
    let homeHtml = '';
    const homeLabels = { A: 'Aホーム', B: 'Bホーム', C: 'Cホーム', D: 'Dホーム', E: 'Eホーム' };
    for (const [homeKey, label] of Object.entries(homeLabels)) {
        const count = homeCounts[homeKey] || 0;
        homeHtml += `
            <li class="summary-list-item home-summary-${homeKey.toLowerCase()}">
                <span class="label">${label}</span>
                <span class="value">${count}日</span>
            </li>`;
    }
    dom.homeSummary.innerHTML = homeHtml;

    // 3. ホーム別日次集計 (下部) - 固定データ
    // 画像の10日分データ
    const dailySummaryData = {
        'Aホーム': [
            { C: 1, EL: 1, N: 2, L: 4 }, // 1日
            { A: 2, B: 1, C: 2, L: 4 }, // 2日 (画像準拠)
            { A: 1, B: 2, C: 2, N: 2, L: 2 }, // 3日 (画像準拠)
            { A: 1, C: 2, N: 1 }, // 4日
            { A: 2, B: 2, C: 1, EL: 2, L: 1 }, // 5日 (画像準拠)
            { B: 2, C: 4, EL: 1, N: 1 }, // 6日
            { A: 4, B: 2, C: 2, L: 1 }, // 7日 (画像準拠)
            { B: 1, C: 2, EL: 2, L: 3 }, // 8日 (画像準拠)
            { C: 2, EL: 1, N: 2, L: 3 }, // 9日
            { A: 2, C: 1, EL: 2, N: 1, L: 2 }  // 10日
        ]
    };

    let dailyHtml = '';
    // Aホームまたは全体表示の時のみ描画 (画像準拠)
    if (appState.selectedHome === 'A' || appState.selectedHome === 'all') {
        const homeData = dailySummaryData['Aホーム'];
        dailyHtml += '<tr><th>Aホーム</th>';
        
        // 10日分だけ描画 (daysCount = 10)
        for (let i = 0; i < daysCount; i++) {
            const dayData = homeData[i] || {};
            dailyHtml += '<td><ul class="summary-list">';
            for (const [code, count] of Object.entries(dayData)) {
                dailyHtml += `<li>${code}:${count}</li>`;
            }
            dailyHtml += '</ul></td>';
        }
        
        dailyHtml += '<td>341</td>'; // 合計 (固定)
        dailyHtml += '</tr>';
    }
    
    dom.dailySummaryBody.innerHTML = dailyHtml;
}


// --- イベントハンドラ -------------------------------------

/**
 * シフト表のセルクリック処理
 */
function handleCellClick(event) {
    const cell = event.target.closest('td');
    if (!cell) return;
    
    const { staffId, staffName, date } = cell.dataset;
    if (!staffId || !date) return; // スタッフ名/合計列やヘッダーは無視

    // 編集状態を保存
    appState.editingCell = { staffId, staffName, date };

    // 現在のシフトデータを取得
    const currentShift = (appState.shifts[staffId] && appState.shifts[staffId][date]) 
                         ? appState.shifts[staffId][date] 
                         : { code: 'NONE', home: appState.staff.find(s => s.id === staffId).home };
    
    // モーダルを開く
    openModal(staffName, date, currentShift);
}

/**
 * 編集モーダルを開く
 */
function openModal(staffName, date, currentShift) {
    dom.modalStaffName.textContent = staffName;
    dom.modalDate.textContent = `${appState.currentYear}年${appState.currentMonth}月${date}日`;
    dom.modalShiftCode.value = currentShift.code;
    dom.modalHome.value = currentShift.home || 'A'; // デフォルト
    
    dom.modal.classList.add('show');
}

/**
 * 編集モーダルを閉じる
 */
function closeModal() {
    dom.modal.classList.remove('show');
    appState.editingCell = null;
}

/**
 * モーダルの保存処理（Firebase連携）
 */
async function handleModalSave() {
    if (!appState.editingCell) return;
    
    const { staffId, date } = appState.editingCell;
    
    // 1. 新しい値を取得
    const newCode = dom.modalShiftCode.value;
    const newHome = dom.modalHome.value;

    const shiftData = { code: newCode, home: newHome };

    // 2. Firebaseに保存を試行
    if (typeof API !== 'undefined' && typeof API.post === 'function') {
        try {
            const response = await API.post('/api/shifts', {
                staff_id: staffId,
                year: appState.currentYear,
                month: appState.currentMonth,
                day: parseInt(date),
                shift_code: newCode,
                home: newHome
            });

            if (response && response.success) {
                console.log('✅ シフトを保存しました');
            } else {
                console.warn('⚠️ シフト保存に失敗（ローカルのみ更新）');
            }
        } catch (error) {
            console.error('❌ シフト保存エラー:', error);
        }
    }

    // 3. appStateを更新（ローカル）
    if (!appState.shifts[staffId]) {
        appState.shifts[staffId] = {};
    }
    appState.shifts[staffId][date] = shiftData;
    
    // 4. モーダルを閉じる
    closeModal();
    
    // 5. 表示を再描画
    render();
}

/**
 * ホームフィルタ変更処理
 */
function handleHomeFilterChange() {
    appState.selectedHome = dom.homeSelect.value;
    console.log('表示ホーム変更:', appState.selectedHome);
    // ホームを切り替えても、10日分の固定データで再描画される
    render();
}

/**
 * 年月変更処理
 */
function handleDateChange() {
    appState.currentYear = parseInt(dom.yearSelect.value, 10);
    appState.currentMonth = parseInt(dom.monthSelect.value, 10);
    console.log('日付変更:', appState.currentYear, appState.currentMonth);
    // 年月を変更しても、10日分の固定データで再描画される
    render();
}

// --- ヘルパー関数 -----------------------------------------

/**
* 指定した年月の末日を取得 (今回は不使用)
function getDaysInMonth(year, month) {
    return new Date(year, month, 0).getDate();
}
*/

/**
 * 選択中のホームでスタッフをフィルタリング
 */
function getFilteredStaff() {
    if (appState.selectedHome === 'all') {
        // 画像には8名しかいないため、全員を返す
        return appState.staff;
    }
    // 'A' ホームが選択されている場合 (画像の状態)
    return appState.staff.filter(staff => staff.home === appState.selectedHome);
}

// --- グローバルナビゲーション関数 (HTMLから直接呼び出し可能) ---

/**
 * 指定ページへ遷移
 */
function navigateTo(pageName) {
    PageRouter.navigate(pageName);
}

/**
 * 権限チェック付きページ遷移
 */
function safeNavigateTo(pageName) {
    PageRouter.navigateWithCheck(pageName);
}

/**
 * ログアウト
 */
function doLogout() {
    if (confirm('ログアウトしますか?')) {
        PageRouter.logout();
    }
}

/**
 * ホームへ戻る
 */
function goToHome() {
    PageRouter.goHome();
}

/**
 * ページ遷移のショートカット
 */
const NAV = {
    // 共通ページ
    login: () => navigateTo('index.html'),  // index.htmlがログイン画面
    index: () => navigateTo('index.html'),
    
    // 管理者ページ
    adminHome: () => safeNavigateTo('shift_home_admin.html'),
    staffManage: () => safeNavigateTo('shift_staff.html'),
    createShift: () => safeNavigateTo('shift_create.html'),  // シフト作成画面
    memberManage: () => safeNavigateTo('shitf_member.html'),
    settings: () => safeNavigateTo('setting.html'),
    
    // スタッフページ
    staffHome: () => safeNavigateTo('shift_home_staff.html'),
    viewShift: () => safeNavigateTo('shift_view.html'),
    submitShift: () => safeNavigateTo('shift_submission.html'),
    
    // その他
    logout: () => doLogout(),
    home: () => goToHome(),
    back: () => window.history.back()
};

/**
 * 管理者かどうかをチェック
 */
function checkIsAdmin() {
    if (typeof AUTH !== 'undefined') {
        return AUTH.isAdmin();
    }
    return false;
}

/**
 * 現在のユーザー情報を取得
 */
function getCurrentUser() {
    if (typeof AUTH !== 'undefined') {
        const userStr = localStorage.getItem('user');
        if (userStr) {
            try {
                return JSON.parse(userStr);
            } catch (e) {
                console.error('ユーザー情報のパースエラー:', e);
            }
        }
    }
    return null;
}

/**
 * ユーザー名を表示
 */
function displayUserName() {
    const user = getCurrentUser();
    const userNameElement = document.getElementById('user-name-display');
    
    if (user && userNameElement) {
        userNameElement.textContent = user.name || user.username || 'ユーザー';
    }
}

/**
 * 管理者メニューの表示/非表示
 */
function toggleAdminMenu() {
    const isAdmin = checkIsAdmin();
    const adminMenuItems = document.querySelectorAll('.admin-only');
    
    adminMenuItems.forEach(item => {
        if (isAdmin) {
            item.style.display = '';
        } else {
            item.style.display = 'none';
        }
    });
}

// ページロード時にユーザー情報とメニューを更新
window.addEventListener('load', () => {
    displayUserName();
    toggleAdminMenu();
});
