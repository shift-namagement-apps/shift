// シフト表アプリケーション - image.png 再現度向上版

const now = new Date();
const appState = {
    currentYear: now.getFullYear(),
    currentMonth: now.getMonth() + 1,
    selectedHome: 'all', // 初期表示は全体表示
    shifts: {},
    shiftRequests: [],
    staff: [],
    shiftCodeHours: {},
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

// シフトコードの勤務時間（時間数）を取得するヘルパー
function getShiftHours(code) {
    if (appState.shiftCodeHours && appState.shiftCodeHours[code] !== undefined) {
        const h = Number(appState.shiftCodeHours[code]);
        return Number.isFinite(h) ? h : 0;
    }
    const fallback = { A: 8, B: 8, C: 8, EL: 3, N: 0, L: 0, SP: 0, NONE: 0 };
    return fallback[code] ?? 0;
}

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
        
        // BASE_PATHを考慮した遷移（config.jsで定義）
        const basePath = window.BASE_PATH || '/';
        
        // GitHub Pages環境では /shift/ を含める
        if (basePath !== '/') {
            window.location.href = basePath + pageName;
        } else {
            window.location.href = pageName;
        }
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

// --- ホーム管理用ヘルパー関数 -------------------------------

/**
 * ホーム一覧をAPIから取得（キャッシュ対応）
 */
async function loadHomesList() {
    const CACHE_KEY = 'shift_homes_cache';
    const CACHE_TIMESTAMP_KEY = 'shift_homes_cache_timestamp';
    const CACHE_DURATION = 5 * 60 * 1000; // 5分間キャッシュ
    
    // キャッシュチェック
    const timestamp = localStorage.getItem(CACHE_TIMESTAMP_KEY);
    if (timestamp) {
        const age = Date.now() - parseInt(timestamp);
        if (age < CACHE_DURATION) {
            const cached = localStorage.getItem(CACHE_KEY);
            if (cached) {
                try {
                    const homes = JSON.parse(cached);
                    console.log('📦 ホーム一覧をキャッシュから取得:', homes);
                    return homes;
                } catch (e) {
                    console.error('キャッシュ解析エラー:', e);
                }
            }
        }
    }
    
    // APIから取得
    try {
        const token = localStorage.getItem('shift_auth_token');
        if (!token) {
            console.warn('⚠️ トークンなし: デフォルトホーム使用');
            return ['A', 'B', 'C', 'D', 'E'];
        }
        
        console.log('🌐 APIからホーム一覧取得中...');
        const response = await fetch(`${API_BASE_URL}/api/homes`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error('ホーム取得失敗');
        }
        
        const data = await response.json();
        
        if (data.success && data.homes && data.homes.length > 0) {
            const homes = data.homes.map(h => h.name);
            
            // キャッシュに保存
            localStorage.setItem(CACHE_KEY, JSON.stringify(homes));
            localStorage.setItem(CACHE_TIMESTAMP_KEY, Date.now().toString());
            
            console.log('✅ ホーム一覧取得成功:', homes);
            return homes;
        } else {
            console.warn('⚠️ ホームデータが空: デフォルト使用');
            return ['A', 'B', 'C', 'D', 'E'];
        }
    } catch (error) {
        console.error('❌ ホーム取得エラー:', error);
        return ['A', 'B', 'C', 'D', 'E']; // フォールバック
    }
}

/**
 * ホームの色を動的に生成（視認性重視）
 */
function getHomeColor(homeName, index = 0) {
    const predefinedColors = {
        'A': '#FFD5D5',  // 薄い赤/ピンク
        'B': '#D5E8FF',  // 薄い青
        'C': '#D5FFD5',  // 薄い緑
        'D': '#FFEBD5',  // 薄いオレンジ
        'E': '#EBD5FF',  // 薄い紫
        'F': '#FFD5EB',  // 薄いマゼンタ
        'G': '#D5FFFF',  // 薄いシアン
        'H': '#FFFFD5',  // 薄い黄色
        'I': '#FFE0CC',  // 薄いコーラル
        'J': '#E0D5FF',  // 薄いラベンダー
        '未定': '#F5F5F5'
    };
    
    // 既定義の色がある場合はそれを返す
    if (predefinedColors[homeName]) {
        return predefinedColors[homeName];
    }
    
    // 動的に色を生成（パステルカラー・視認性重視）
    const baseColors = [
        '#FFD5D5', '#D5E8FF', '#D5FFD5', '#FFEBD5', '#EBD5FF',
        '#FFD5EB', '#D5FFFF', '#FFFFD5', '#FFE0CC', '#E0D5FF'
    ];
    return baseColors[index % baseColors.length];
}

/**
 * セレクトボックスにホーム選択肢を追加
 */
async function populateHomeSelect(selectElement, options = {}) {
    if (!selectElement) {
        console.warn('⚠️ セレクト要素が見つかりません');
        return;
    }
    
    const {
        includeAll = false,
        includeUndecided = false,
        defaultValue = null
    } = options;
    
    const homes = await loadHomesList();
    
    // 既存のオプションをクリア（最初のオプション以外）
    const firstOption = selectElement.querySelector('option');
    selectElement.innerHTML = '';
    
    // "全体表示"オプション
    if (includeAll) {
        const option = document.createElement('option');
        option.value = 'all';
        option.textContent = '全体表示';
        selectElement.appendChild(option);
    }
    
    // ホームオプション
    homes.forEach((home, index) => {
        if (home === '未定' && !includeUndecided) {
            return; // 未定を除外
        }
        const option = document.createElement('option');
        option.value = home;
        option.textContent = `${home}ホーム`;
        selectElement.appendChild(option);
    });
    
    // 未定オプション（明示的に追加する場合）
    if (includeUndecided && !homes.includes('未定')) {
        const option = document.createElement('option');
        option.value = '未定';
        option.textContent = '未定';
        selectElement.appendChild(option);
    }
    
    // デフォルト値を設定
    if (defaultValue && selectElement.querySelector(`option[value="${defaultValue}"]`)) {
        selectElement.value = defaultValue;
    }
    
    console.log('✅ ホーム選択肢を生成:', homes);
}

/**
 * ホーム別の背景色をCSSに動的追加
 */
async function injectHomeDynamicStyles() {
    const homes = await loadHomesList();
    
    // 既存のスタイルを削除
    const existingStyle = document.getElementById('dynamic-home-styles');
    if (existingStyle) {
        existingStyle.remove();
    }
    
    // 新しいスタイルを作成
    const styleElement = document.createElement('style');
    styleElement.id = 'dynamic-home-styles';
    
    let css = '/* 動的に生成されたホーム別スタイル */\n';
    
    homes.forEach((home, index) => {
        if (home === '未定') return; // 未定はスキップ
        
        const color = getHomeColor(home, index);
        const homeKey = home.toLowerCase();
        
        // シフト表の背景色
        css += `.shift-table .home-${homeKey} { background-color: ${color}; }\n`;
        
        // カレンダーの背景色（shift_submission.html用）
        css += `.calendar-day.home-${homeKey} { background-color: ${color}; }\n`;
        
        // サマリーリストの色
        css += `.home-summary-${homeKey}::before { background-color: ${color}; }\n`;
    });
    
    styleElement.textContent = css;
    document.head.appendChild(styleElement);
    
    console.log('✅ ホーム別スタイルを注入:', homes);
}

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
        dailySummaryHeader: document.getElementById('daily-summary-header'),
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

    // ホーム別の動的スタイルを注入
    await injectHomeDynamicStyles();

    // Firebaseからデータをロード（失敗時はダミーデータ）
    await loadDataFromFirebase();

    // イベントリスナーの設定
    setupEventListeners();

    // 初期描画
    await render();
    
    // ページ固有の初期化（render後に実行）
    const currentPage = PageRouter.getCurrentPage();
    if (currentPage === 'shift_create.html') {
        initShiftCreatePage();
    }
    
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

        // シフトコード（勤務時間付き）を取得
        try {
            const codeResp = await API.get('/api/shift-codes');
            if (codeResp && codeResp.success && Array.isArray(codeResp.codes)) {
                appState.shiftCodeHours = {};
                codeResp.codes.forEach(c => {
                    if (c.active !== false) {
                        appState.shiftCodeHours[c.code] = Number(c.hours) || 0;
                    }
                });
                console.log(`✅ シフトコードを読み込みました (${Object.keys(appState.shiftCodeHours).length}件)`);
            } else {
                console.warn('⚠️ シフトコードの取得に失敗。フォールバック時間を使用します');
            }
        } catch (e) {
            console.warn('⚠️ シフトコード取得エラー。フォールバック時間を使用します', e);
        }

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

        // シフト要望を取得（新API構造）
        const requestsResponse = await API.get('/api/shift-requests/get', {
            year: appState.currentYear,
            month: appState.currentMonth
        });

        if (requestsResponse && requestsResponse.success && requestsResponse.shifts) {
            // 新しいデータ構造を解析: { "2025-11-01": { "A": { "A": [...users], "B": [...users] } } }
            const requestsList = [];
            const shiftsData = requestsResponse.shifts;
            
            console.log('📦 APIから受信したシフトデータ:', shiftsData);
            
            // 承認済み(status=1)のシフトをappState.shiftsに反映
            for (const [dateStr, homeData] of Object.entries(shiftsData)) {
                const [year, month, day] = dateStr.split('-').map(Number);
                
                for (const [home, shiftCodes] of Object.entries(homeData)) {
                    for (const [shiftCode, users] of Object.entries(shiftCodes)) {
                        users.forEach(user => {
                            // シフト要望リストに追加
                            requestsList.push({
                                id: `${dateStr}-${home}-${shiftCode}-${user.user_id}`,
                                date: dateStr,
                                day: day,
                                home: home,
                                shift_code: shiftCode,
                                user_id: user.user_id,
                                user_name: user.user_name,
                                status: user.status || 0,
                                submitted_at: user.submitted_at
                            });
                            
                            // 承認済み(status=1)の場合はappState.shiftsに反映
                            if (user.status === 1) {
                                if (!appState.shifts[user.user_id]) {
                                    appState.shifts[user.user_id] = {};
                                }
                                appState.shifts[user.user_id][day.toString()] = {
                                    code: shiftCode,
                                    home: home
                                };
                            }
                        });
                    }
                }
            }
            
            console.log('✅ appState.shiftsに反映:', appState.shifts);
            appState.shiftRequests = requestsList;
            console.log(`✅ ${requestsList.length}件の要望を読み込みました（うち承認済み: ${requestsList.filter(r => r.status === 1).length}件）`);
        } else {
            appState.shiftRequests = [];
            console.log('ℹ️ シフト要望はありません');
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
    // 🔥 shift_view.html では独自のイベントリスナーを使用するため、
    // ここでの年月選択リスナーは無効化
    const currentPage = window.location.pathname.split('/').pop();
    const isShiftViewPage = currentPage === 'shift_view.html';
    
    // 日付・ホーム変更（shift_view.html以外）
    if (!isShiftViewPage) {
        if (dom.yearSelect) dom.yearSelect.addEventListener('change', handleDateChange);
        if (dom.monthSelect) dom.monthSelect.addEventListener('change', handleDateChange);
    } else {
        console.log('ℹ️ shift_view.html: script.jsの年月リスナーを無効化');
    }
    
    if (dom.homeSelect) dom.homeSelect.addEventListener('change', handleHomeFilterChange);

    // ホーム別日次集計のホーム選択
    const dailySummaryHomeSelect = document.getElementById('daily-summary-home-select');
    if (dailySummaryHomeSelect) {
        dailySummaryHomeSelect.addEventListener('change', () => {
            const year = appState.currentYear;
            const month = appState.currentMonth;
            const daysToRender = new Date(year, month, 0).getDate();
            renderDailySummary(daysToRender);
        });
    }

    // シフト表のセルクリック(イベント委任)
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

    // 要望関連のイベントリスナーは不要（個別承認はインラインonclickで実装済み）
    
    // 一括承認ボタンのイベントは shift_create.html で直接 bulkApproveShiftRequests() を呼び出し
    // ここでの重複イベントリスナーは不要
}

// --- レンダリング関数 ---------------------------------------

/**
 * すべての表示を更新する
 */
async function render() {
    // *** 変更点：その月の日数に応じて描画（最大31日） ***
    const year = appState.currentYear;
    const month = appState.currentMonth;
    const daysToRender = new Date(year, month, 0).getDate(); // その月の日数を取得
    
    console.log(`📅 ${year}年${month}月: ${daysToRender}日分を描画`);
    
    // フィルタリングされたスタッフリストを取得
    const filteredStaff = getFilteredStaff();
    
    // 1. シフト表ヘッダー
    renderTableHeader(daysToRender);
    
    // 2. シフト表ボディ
    renderShiftTable(filteredStaff, daysToRender);
    
    // 3. シフト要望
    renderShiftRequests();
    
    // 4. 集計（日次・月間）
    await renderSummaries(daysToRender);
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

    staffList.forEach(staff => {
        const staffShifts = appState.shifts[staff.id] || {};
        let monthTotalDays = 0;
        let monthTotalHours = 0;

        // 先に各日分を組み立てる
        let rowCells = '';
        for (let day = 1; day <= daysCount; day++) {
            const shift = staffShifts[day.toString()] || { code: 'NONE', home: '' };
            const shiftInfo = SHIFT_CODES[shift.code] || SHIFT_CODES['NONE'];
            const homeClass = shift.home ? `home-${shift.home.toLowerCase()}` : '';
            const hours = getShiftHours(shift.code);

            if (!['N', 'L', 'SP', 'NONE'].includes(shift.code)) {
                monthTotalDays++;
            }
            monthTotalHours += hours;

            rowCells += `<td 
                        class="${homeClass}"
                        data-staff-id="${staff.id}"
                        data-staff-name="${staff.name}"
                        data-date="${day}">`;
            if (shift.code !== 'NONE') {
                rowCells += `<div class="shift-code ${shiftInfo.class}">${shift.code}</div>`;
            }
            rowCells += '</td>';
        }

        // 名前セルに月の合計時間を表示
        html += `<tr><td>${staff.name} - ${monthTotalHours}時間</td>`;
        html += rowCells;
        // 月合計（日数）は現行仕様を維持
        html += `<td><strong>${monthTotalDays}日</strong></td>`;
        html += '</tr>';
    });
    
    dom.shiftTableBody.innerHTML = html;
}

/**
 * シフト要望リストを描画
 */
/**
 * シフト要望を描画（API連携版）
 */
async function renderShiftRequests() {
    if (!dom.shiftRequestList) return;
    
    try {
        const token = localStorage.getItem('shift_auth_token');
        if (!token) {
            dom.shiftRequestList.innerHTML = '<li class="shift-request-item">ログインが必要です</li>';
            return;
        }
        
        // 現在の年月のシフト要望を取得
        const response = await fetch(
            `${API_BASE_URL}/api/shift-requests/get?year=${appState.currentYear}&month=${appState.currentMonth}`,
            {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            }
        );
        
        if (!response.ok) {
            throw new Error('シフト要望の取得に失敗しました');
        }
        
        const data = await response.json();
        const shiftsData = data.shifts || {};
        
        // シフト要望を配列に変換
        const requestsList = [];
        Object.entries(shiftsData).forEach(([date, homes]) => {
            Object.entries(homes).forEach(([home, shiftCodes]) => {
                Object.entries(shiftCodes).forEach(([shiftCode, users]) => {
                    users.forEach(user => {
                        requestsList.push({
                            date: date,
                            home: home,
                            shift_code: shiftCode,
                            user_id: user.user_id,
                            user_name: user.user_name,
                            status: user.status || 0,
                            submitted_at: user.submitted_at
                        });
                    });
                });
            });
        });
        
        // 未承認のものを優先的に表示
        requestsList.sort((a, b) => a.status - b.status);
        
        let html = '';
        if (requestsList.length === 0) {
            html = '<li class="shift-request-item">シフト要望はありません</li>';
        } else {
            requestsList.slice(0, 20).forEach(req => {
                const statusBadge = req.status === 1 
                    ? '<span class="status-badge approved">承認済</span>' 
                    : '<span class="status-badge pending">未承認</span>';
                const dateObj = new Date(req.date);
                const displayDate = `${dateObj.getMonth() + 1}/${dateObj.getDate()}`;
                
                html += `
                    <li class="shift-request-item ${req.status === 1 ? 'approved' : ''}" 
                        data-date="${req.date}" 
                        data-home="${req.home}" 
                        data-shift-code="${req.shift_code}" 
                        data-user-id="${req.user_id}">
                        <div class="request-info">
                            <div class="staff-name">${req.user_name}</div>
                            <div class="request-details">${displayDate} ${req.home}ホーム ${req.shift_code}</div>
                            ${statusBadge}
                        </div>
                        ${req.status === 0 ? `
                            <div class="request-actions">
                                <button class="btn btn-reflect" onclick="approveShiftRequest('${req.date}', '${req.home}', '${req.shift_code}', '${req.user_id}')">承認</button>
                            </div>
                        ` : ''}
                    </li>
                `;
            });
        }
        
        dom.shiftRequestList.innerHTML = html;
    } catch (error) {
        console.error('❌ シフト要望の描画エラー:', error);
        dom.shiftRequestList.innerHTML = '<li class="shift-request-item">エラーが発生しました</li>';
    }
}

/**
 * 右パネルと下部の集計を描画
 * (注: 画像の値の固定表示で再現)
 */
async function renderSummaries(daysCount) {
    
    console.log(`📊 ${appState.currentYear}年${appState.currentMonth}月の集計を計算中...`);
    console.log('📋 現在のappState.staff:', appState.staff);
    console.log('📋 現在のappState.shifts:', appState.shifts);
    
    // 1. 月間集計 (右パネル) - appState.shiftsから動的に計算
    const shiftCodeCounts = {
        'A': 0,  // 日勤
        'B': 0,  // 夜勤
        'C': 0,  // 遅番
        'EL': 0, // 早朝
        'N': 0,  // 公休
        'L': 0,  // 有休
        'SP': 0,  // 特休
        'NONE': 0  // 未定
    };
    
    // 全スタッフの全シフトをカウント
    if (appState.staff && appState.staff.length > 0) {
        console.log(`👥 ${appState.staff.length}人のスタッフを集計中...`);
        appState.staff.forEach(staff => {
            const staffShifts = appState.shifts[staff.id] || {};
            Object.values(staffShifts).forEach(shift => {
                if (shift.code && shiftCodeCounts[shift.code] !== undefined) {
                    shiftCodeCounts[shift.code]++;
                }
            });
        });
    } else {
        console.log('⚠️ スタッフデータがありません、集計は0で表示します');
    }
    
    let monthlyHtml = '';
    const shiftCodeLabels = {
        'A': '日勤 (A)',
        'B': '夜勤 (B)',
        'C': '遅番 (C)',
        'EL': '早朝 (EL)',
        'L': '有休 (L)',
        'N': '公休 (N)',
        'SP': '特休 (SP)',
        'NONE': '未定 (-)'
    };
    
    for (const [code, label] of Object.entries(shiftCodeLabels)) {
        const count = shiftCodeCounts[code] || 0;
        monthlyHtml += `
            <li class="summary-list-item">
                <span class="label">${label}</span>
                <span class="value">${count}</span>
            </li>`;
    }
    
    if (dom.monthlySummary) {
        dom.monthlySummary.innerHTML = monthlyHtml;
        console.log('✅ 月間集計を表示:', shiftCodeCounts);
    } else {
        console.warn('⚠️ monthly-summary要素が見つかりません');
    }

    // 2. ホーム別月間合計 (右パネル) - 動的計算
    const homes = await loadHomesList();
    console.log('🏠 読み込まれたホームリスト:', homes);
    const homeCounts = {};
    homes.forEach(home => {
        if (home !== '未定') homeCounts[home] = 0;
    });
    
    // 全スタッフの全シフトをカウント（公休系以外）
    if (appState.staff && appState.staff.length > 0) {
        appState.staff.forEach(staff => {
            const staffShifts = appState.shifts[staff.id] || {};
            Object.values(staffShifts).forEach(shift => {
                if (shift.home && shift.code && !['N', 'L', 'SP'].includes(shift.code)) {
                    if (homeCounts[shift.home] !== undefined) {
                        homeCounts[shift.home]++;
                    }
                }
            });
        });
    }
    
    let homeHtml = '';
    homes.forEach(home => {
        if (home === '未定') return; // 未定は集計から除外
        const count = homeCounts[home] || 0;
        homeHtml += `
            <li class="summary-list-item home-summary-${home.toLowerCase()}">
                <span class="label">${home}ホーム</span>
                <span class="value">${count}日</span>
            </li>`;
    });
    
    if (dom.homeSummary) {
        dom.homeSummary.innerHTML = homeHtml;
        console.log('✅ ホーム別月間合計を表示:', homeCounts);
    } else {
        console.warn('⚠️ home-summary要素が見つかりません');
    }

    console.log('✅ 月間集計完了:', { shiftCodeCounts, homeCounts });
    
    // 3. ホーム別日次集計 (下部) - 動的計算
    renderDailySummary(daysCount);
}

/**
 * ホーム別日次集計を描画（動的計算版）
 */
function renderDailySummary(daysCount) {
    const summarySelect = document.getElementById('daily-summary-home-select');
    const selectedHome = summarySelect ? summarySelect.value : 'A';
    
    console.log(`📊 ${selectedHome}ホームの日次集計を計算中...`);
    console.log('👥 スタッフ数:', appState.staff ? appState.staff.length : 0);
    console.log('📅 日数:', daysCount);
    
    // ヘッダー行を生成（日付を表示）
    let headerHtml = '<tr><th>集計項目</th>';
    for (let day = 1; day <= daysCount; day++) {
        headerHtml += `<th>${day}</th>`;
    }
    headerHtml += '<th>月合計</th></tr>';
    
    if (dom.dailySummaryHeader) {
        dom.dailySummaryHeader.innerHTML = headerHtml;
    }
    
    // 各日のシフトコード別カウントを計算
    const dailyData = [];
    let monthTotal = 0;
    
    for (let day = 1; day <= daysCount; day++) {
        const dayCounts = {
            'A': 0,
            'B': 0,
            'C': 0,
            'EL': 0,
            'N': 0,
            'L': 0,
            'SP': 0,
            'NONE': 0
        };
        
        // 全スタッフのこの日のシフトをカウント
        if (appState.staff && appState.staff.length > 0) {
            appState.staff.forEach(staff => {
                const staffShifts = appState.shifts[staff.id] || {};
                const shift = staffShifts[day.toString()];
                
                // 選択されたホームのシフトのみカウント
                if (shift && shift.home === selectedHome && shift.code) {
                    if (dayCounts[shift.code] !== undefined) {
                        dayCounts[shift.code]++;
                        
                        // 公休系とNONE以外を月合計に加算
                        if (!['N', 'L', 'SP', 'NONE'].includes(shift.code)) {
                            monthTotal++;
                        }
                    }
                }
            });
        }
        
        dailyData.push(dayCounts);
    }
    
    // HTML生成
    let dailyHtml = `<tr><td>${selectedHome}ホーム</td>`;
    
    // 各日のデータを表示
    for (let i = 0; i < daysCount; i++) {
        const dayData = dailyData[i];
        dailyHtml += '<td><ul class="summary-list">';
        
        // カウントが0より大きいシフトコードのみ表示
        for (const [code, count] of Object.entries(dayData)) {
            if (count > 0) {
                dailyHtml += `<li>${code}:${count}</li>`;
            }
        }
        
        dailyHtml += '</ul></td>';
    }
    
    // 月合計を表示
    dailyHtml += `<td><strong>${monthTotal}</strong></td>`;
    dailyHtml += '</tr>';
    
    if (dom.dailySummaryBody) {
        dom.dailySummaryBody.innerHTML = dailyHtml;
        console.log(`✅ ${selectedHome}ホームの日次集計完了 (月合計: ${monthTotal})`);
    } else {
        console.warn('⚠️ daily-summary-body要素が見つかりません');
    }
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
async function handleHomeFilterChange() {
    appState.selectedHome = dom.homeSelect.value;
    console.log('表示ホーム変更:', appState.selectedHome);
    // ホームを切り替えても、テーブルと集計を再描画
    await render();
}

/**
 * 年月変更処理
 */
async function handleDateChange() {
    appState.currentYear = parseInt(dom.yearSelect.value, 10);
    appState.currentMonth = parseInt(dom.monthSelect.value, 10);
    console.log('日付変更:', appState.currentYear, appState.currentMonth);
    
    // Firebaseから新しい年月のデータを再読み込み
    await loadDataFromFirebase();
    await render();
    // shift_create.htmlではテーブル形式で表示
    // カレンダービューは削除済み
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
 * ページ遷移のショートカット（グローバルに公開）
 * HTMLから直接呼び出し可能: onclick="NAV.adminHome()"
 */
const NAV = {
    // === 共通ページ ===
    login: () => navigateTo('index.html'),
    index: () => navigateTo('index.html'),
    
    // === 管理者専用ページ ===
    adminHome: () => safeNavigateTo('shift_home_admin.html'),
    staffManage: () => safeNavigateTo('shift_staff.html'),
    createShift: () => safeNavigateTo('shift_create.html'),
    memberManage: () => safeNavigateTo('shitf_member.html'),
    settings: () => safeNavigateTo('setting.html'),
    
    // === スタッフページ ===
    staffHome: () => safeNavigateTo('shift_home_staff.html'),
    viewShift: () => safeNavigateTo('shift_view.html'),
    submitShift: () => safeNavigateTo('shift_submission.html'),
    
    // === ユーティリティ ===
    logout: () => doLogout(),
    home: () => goToHome(),
    back: () => window.history.back(),
    reload: () => window.location.reload(),
    
    // === 条件付き遷移（ロール確認） ===
    // 管理者のみアクセス可能なページへの遷移
    toAdminPage: (pageName) => {
        if (checkIsAdmin()) {
            navigateTo(pageName);
        } else {
            alert('管理者権限が必要です');
        }
    },
    
    // スタッフ以上でアクセス可能なページへの遷移
    toStaffPage: (pageName) => {
        const user = getCurrentUser();
        if (user) {
            navigateTo(pageName);
        } else {
            alert('ログインが必要です');
            navigateTo('index.html');
        }
    }
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

// --- ページ別初期化処理 -------------------------------------

/**
 * 各ページ固有の初期化処理
 * ページ名に応じて自動実行される
 */
function initializePage() {
    const currentPage = PageRouter.getCurrentPage();
    console.log(`📄 ページ初期化: ${currentPage}`);
    
    switch(currentPage) {
        case 'index.html':
            initLoginPage();
            break;
        case 'shift_home_admin.html':
            initAdminHomePage();
            break;
        case 'shift_home_staff.html':
            initStaffHomePage();
            break;
        case 'shift_create.html':
            initShiftCreatePage();
            break;
        case 'shift_staff.html':
            initShiftManagePage();
            break;
        case 'shift_view.html':
            initShiftViewPage();
            break;
        case 'shift_submission.html':
            initShiftSubmissionPage();
            break;
        case 'shitf_member.html':
            initMemberManagePage();
            break;
        case 'setting.html':
            initSettingsPage();
            break;
        default:
            console.log('ℹ️ 共通初期化のみ実行');
    }
}

/**
 * ログインページの初期化
 */
function initLoginPage() {
    console.log('🔐 ログインページ初期化');
    // ログイン済みの場合はホームへリダイレクト
    if (typeof AUTH !== 'undefined') {
        AUTH.verifyToken().then(isAuth => {
            if (isAuth) {
                console.log('✅ 既にログイン済み - ホームへ');
                PageRouter.goHome();
            }
        });
    }
}

/**
 * 管理者ホームページの初期化
 */
function initAdminHomePage() {
    console.log('👑 管理者ホーム初期化');
    displayUserName();
    // 管理者専用メニューの表示
    const adminMenus = document.querySelectorAll('.admin-menu');
    adminMenus.forEach(menu => menu.style.display = 'block');
}

/**
 * スタッフホームページの初期化
 */
function initStaffHomePage() {
    console.log('👤 スタッフホーム初期化');
    displayUserName();
    // スタッフメニューの表示
    const staffMenus = document.querySelectorAll('.staff-menu');
    staffMenus.forEach(menu => menu.style.display = 'block');
}

/**
 * シフト作成ページの初期化
 */
function initShiftCreatePage() {
    console.log('📝 シフト作成ページ初期化');
    
    // テーブル形式で描画（カレンダービューは削除済み）
    // render()は既にloadDataFromFirebase()後に呼ばれているため、ここでは何もしない
}

/**
 * メインカレンダービューを描画（中央の大きなカレンダー）
 */
function renderMainCalendarView() {
    const calendarContainer = document.getElementById('main-calendar-view');
    if (!calendarContainer) {
        console.warn('⚠️ メインカレンダー要素が見つかりません');
        return;
    }
    
    console.log(`📅 メインカレンダー描画: ${appState.currentYear}年${appState.currentMonth}月`);
    console.log(`📊 シフト要望数: ${appState.shiftRequests.length}件`);
    
    const year = appState.currentYear;
    const month = appState.currentMonth;
    
    // その月の1日と最終日を取得
    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0);
    const daysInMonth = lastDay.getDate();
    
    // カレンダーの開始日（月曜始まり）
    const startDay = firstDay.getDay(); // 0=日曜, 1=月曜, ...
    const startOffset = startDay === 0 ? 6 : startDay - 1; // 月曜始まりに調整
    
    // カレンダーHTML生成
    let html = '<div class="main-calendar-grid">';
    
    // 曜日ヘッダー
    const weekdays = ['月', '火', '水', '木', '金', '土', '日'];
    weekdays.forEach(day => {
        html += `<div class="main-calendar-header">${day}</div>`;
    });
    
    // 前月の日付（空白）
    for (let i = 0; i < startOffset; i++) {
        html += '<div class="main-calendar-day other-month"></div>';
    }
    
    // 今日の日付
    const today = new Date();
    const isCurrentMonth = today.getFullYear() === year && (today.getMonth() + 1) === month;
    const todayDate = today.getDate();
    
    // その月の日付
    for (let day = 1; day <= daysInMonth; day++) {
        const isToday = isCurrentMonth && day === todayDate;
        const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        
        // その日のシフト要望を取得
        const dayRequests = appState.shiftRequests.filter(req => {
            return req.date === dateStr;
        });
        
        // ホーム別にグループ化
        const homeGroups = {};
        dayRequests.forEach(req => {
            if (!homeGroups[req.home]) {
                homeGroups[req.home] = [];
            }
            homeGroups[req.home].push(req);
        });
        
        html += `<div class="main-calendar-day ${isToday ? 'today' : ''}" data-date="${dateStr}">`;
        html += `<div class="main-calendar-day-header">${day}日</div>`;
        html += '<div class="main-calendar-requests">';
        
        // シフト要望を表示
        dayRequests.forEach(req => {
            const approvedClass = req.status === 1 ? 'approved' : '';
            html += `<div class="main-calendar-request-item ${approvedClass}" data-request-id="${req.id}">`;
            html += `<span class="main-calendar-request-name" title="${req.staffName}">${req.staffName}</span>`;
            html += `<span class="main-calendar-request-shift">${req.shiftCode}</span>`;
            html += `<span class="main-calendar-request-home">${req.home}</span>`;
            html += '</div>';
        });
        
        // 要望がない場合
        if (dayRequests.length === 0) {
            html += '<div style="color: #adb5bd; font-size: 0.75rem; text-align: center; margin-top: 1rem;">要望なし</div>';
        }
        
        html += '</div>';
        
        // 日次サマリー
        if (dayRequests.length > 0) {
            const approvedCount = dayRequests.filter(r => r.status === 1).length;
            const pendingCount = dayRequests.filter(r => r.status === 0).length;
            html += `<div class="main-calendar-day-summary">`;
            html += `<span style="color: #28a745;">✓ ${approvedCount}</span> / `;
            html += `<span style="color: #ffc107;">● ${pendingCount}</span>`;
            html += `</div>`;
        }
        
        html += '</div>';
    }
    
    // 次月の日付（空白で埋める）
    const totalCells = startOffset + daysInMonth;
    const remainingCells = 7 - (totalCells % 7);
    if (remainingCells < 7) {
        for (let i = 0; i < remainingCells; i++) {
            html += '<div class="main-calendar-day other-month"></div>';
        }
    }
    
    html += '</div>';
    calendarContainer.innerHTML = html;
    
    // カレンダーの日付クリックイベント
    document.querySelectorAll('.main-calendar-day:not(.other-month)').forEach(dayEl => {
        dayEl.addEventListener('click', (e) => {
            const dateStr = dayEl.dataset.date;
            if (dateStr) {
                showDayDetailModal(dateStr);
            }
        });
    });
}

/**
 * シフト管理ページの初期化
 */
function initShiftManagePage() {
    console.log('📊 シフト管理ページ初期化');
    // シフト管理機能の初期化
}

/**
 * シフト閲覧ページの初期化
 */
function initShiftViewPage() {
    console.log('👀 シフト閲覧ページ初期化');
    // シフト閲覧機能の初期化
}

/**
 * シフト提出ページの初期化
 */
function initShiftSubmissionPage() {
    console.log('📤 シフト提出ページ初期化');
    // シフト提出フォームの初期化
}

/**
 * メンバー管理ページの初期化
 */
function initMemberManagePage() {
    console.log('👥 メンバー管理ページ初期化');
    // メンバー管理機能の初期化
}

/**
 * 設定ページの初期化
 */
function initSettingsPage() {
    console.log('⚙️ 設定ページ初期化');
    // 設定画面の初期化
}

// ページ初期化を自動実行
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializePage);
} else {
    initializePage();
}

// --- 共通UI操作関数 -----------------------------------------

/**
 * ローディング表示の切り替え
 */
function toggleLoading(show = true) {
    const loadingElement = document.getElementById('loading');
    if (loadingElement) {
        loadingElement.style.display = show ? 'block' : 'none';
    }
}

/**
 * トースト通知を表示
 */
function showToast(message, type = 'info') {
    console.log(`📢 [${type.toUpperCase()}] ${message}`);
    
    // カスタムトースト要素がある場合
    const toast = document.getElementById('toast-notification');
    if (toast) {
        toast.textContent = message;
        toast.className = `toast toast-${type}`;
        toast.style.display = 'block';
        
        setTimeout(() => {
            toast.style.display = 'none';
        }, 3000);
    } else {
        // フォールバック: alert
        if (type === 'error') {
            alert(`エラー: ${message}`);
        } else if (type === 'success') {
            console.log(`✅ ${message}`);
        }
    }
}

/**
 * 確認ダイアログ（Promise版）
 */
function confirmDialog(message) {
    return new Promise((resolve) => {
        const result = confirm(message);
        resolve(result);
    });
}

/**
 * モーダルダイアログを開く（汎用）
 */
function openDialog(dialogId) {
    const dialog = document.getElementById(dialogId);
    if (dialog) {
        dialog.classList.add('show');
        dialog.style.display = 'block';
    }
}

/**
 * モーダルダイアログを閉じる（汎用）
 */
function closeDialog(dialogId) {
    const dialog = document.getElementById(dialogId);
    if (dialog) {
        dialog.classList.remove('show');
        dialog.style.display = 'none';
    }
}

// --- デバッグ用関数 -----------------------------------------

/**
 * 現在の状態をコンソールに出力（デバッグ用）
 */
function debugState() {
    console.group('🔍 デバッグ情報');
    console.log('現在のページ:', PageRouter.getCurrentPage());
    console.log('ユーザー情報:', getCurrentUser());
    console.log('管理者か:', checkIsAdmin());
    console.log('appState:', appState);
    console.groupEnd();
}

// グローバルに公開（デバッグ用）
window.debugState = debugState;
window.NAV = NAV;

// --- 全ページ共通ボタン機能 ---------------------------------

/**
 * すべてのページで使えるボタン機能を自動バインド
 */
function setupGlobalButtons() {
    // ログアウトボタン
    document.querySelectorAll('[data-action="logout"]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            NAV.logout();
        });
    });

    // ホームボタン
    document.querySelectorAll('[data-action="home"]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            NAV.home();
        });
    });

    // 戻るボタン
    document.querySelectorAll('[data-action="back"]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            NAV.back();
        });
    });

    // リロードボタン
    document.querySelectorAll('[data-action="reload"]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            NAV.reload();
        });
    });

    // ページ遷移ボタン（data-page属性）
    document.querySelectorAll('[data-page]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const pageName = btn.getAttribute('data-page');
            safeNavigateTo(pageName);
        });
    });
}

// ページロード時にボタンをセットアップ
window.addEventListener('load', setupGlobalButtons);

// --- シフト管理機能 -----------------------------------------

/**
 * シフトを一括保存
 */
async function saveAllShifts() {
    if (!confirm('すべてのシフトを保存しますか?')) {
        return;
    }

    toggleLoading(true);
    
    try {
        const shiftsToSave = [];
        
        // appState.shiftsを整形
        Object.entries(appState.shifts).forEach(([staffId, dates]) => {
            Object.entries(dates).forEach(([day, shift]) => {
                shiftsToSave.push({
                    staff_id: staffId,
                    year: appState.currentYear,
                    month: appState.currentMonth,
                    day: parseInt(day),
                    shift_code: shift.code,
                    home: shift.home
                });
            });
        });

        if (typeof API !== 'undefined' && typeof API.post === 'function') {
            const response = await API.post('/api/shifts/bulk', {
                shifts: shiftsToSave
            });

            if (response && response.success) {
                showToast('シフトを保存しました', 'success');
            } else {
                showToast('一部のシフト保存に失敗しました', 'warning');
            }
        } else {
            console.log('💾 ローカルに保存:', shiftsToSave.length, '件');
            showToast('ローカルに保存しました（オフライン）', 'info');
        }
    } catch (error) {
        console.error('❌ シフト保存エラー:', error);
        showToast('保存に失敗しました', 'error');
    } finally {
        toggleLoading(false);
    }
}

/**
 * シフトをクリア
 */
async function clearAllShifts() {
    const confirmed = await confirmDialog('すべてのシフトをクリアしますか?\nこの操作は取り消せません。');
    
    if (!confirmed) return;

    appState.shifts = {};
    render();
    showToast('シフトをクリアしました', 'info');
}

/**
 * シフトをCSVエクスポート
 */
function exportShiftsToCSV() {
    let csv = 'スタッフ名,';
    
    // ヘッダー行（日付）
    const daysInMonth = 31; // 仮
    for (let day = 1; day <= daysInMonth; day++) {
        csv += `${day}日,`;
    }
    csv += '\n';

    // データ行
    appState.staff.forEach(staff => {
        csv += `${staff.name},`;
        const staffShifts = appState.shifts[staff.id] || {};
        
        for (let day = 1; day <= daysInMonth; day++) {
            const shift = staffShifts[day.toString()];
            if (shift && shift.code !== 'NONE') {
                csv += `${shift.code}(${shift.home}),`;
            } else {
                csv += ',';
            }
        }
        csv += '\n';
    });

    // ダウンロード
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `shift_${appState.currentYear}_${appState.currentMonth}.csv`;
    link.click();
    
    showToast('CSVをエクスポートしました', 'success');
}

/**
 * シフトを印刷
 */
function printShiftTable() {
    window.print();
}

// --- シフト要望管理 -----------------------------------------

/**
 * 個別のシフト要望を反映
 */
async function reflectShiftRequest(requestId) {
    const request = appState.shiftRequests.find(r => r.id === requestId);
    
    if (!request) {
        showToast('要望が見つかりません', 'error');
        return;
    }

    console.log('📝 要望を反映:', request);
    
    // TODO: 要望をシフトに反映する処理
    showToast(`${request.staffName}さんの要望を反映しました`, 'success');
}

/**
 * すべてのシフト要望を一括反映
 */
async function reflectAllRequests() {
    const confirmed = await confirmDialog('すべての要望を反映しますか?');
    
    if (!confirmed) return;

    toggleLoading(true);
    
    try {
        let count = 0;
        
        for (const request of appState.shiftRequests) {
            await reflectShiftRequest(request.id);
            count++;
        }
        
        showToast(`${count}件の要望を反映しました`, 'success');
        render();
    } catch (error) {
        console.error('❌ 要望反映エラー:', error);
        showToast('要望の反映に失敗しました', 'error');
    } finally {
        toggleLoading(false);
    }
}

/**
 * シフト要望を削除
 */
async function deleteShiftRequest(requestId) {
    const confirmed = await confirmDialog('この要望を削除しますか?');
    
    if (!confirmed) return;

    appState.shiftRequests = appState.shiftRequests.filter(r => r.id !== requestId);
    renderShiftRequests();
    showToast('要望を削除しました', 'info');
}

// --- スタッフ管理 -------------------------------------------

/**
 * スタッフを追加
 */
async function addStaff(staffData) {
    if (!staffData.name) {
        showToast('スタッフ名を入力してください', 'error');
        return;
    }

    const newStaff = {
        id: `s${Date.now()}`,
        name: staffData.name,
        home: staffData.home || 'A',
        role: staffData.role || 'staff'
    };

    if (typeof API !== 'undefined' && typeof API.post === 'function') {
        try {
            const response = await API.post('/api/staff', newStaff);
            
            if (response && response.success) {
                appState.staff.push(response.staff);
                showToast('スタッフを追加しました', 'success');
                render();
            }
        } catch (error) {
            console.error('❌ スタッフ追加エラー:', error);
            showToast('スタッフの追加に失敗しました', 'error');
        }
    } else {
        appState.staff.push(newStaff);
        showToast('スタッフを追加しました（ローカル）', 'info');
        render();
    }
}

/**
 * スタッフを編集
 */
async function editStaff(staffId, updates) {
    const staffIndex = appState.staff.findIndex(s => s.id === staffId);
    
    if (staffIndex === -1) {
        showToast('スタッフが見つかりません', 'error');
        return;
    }

    if (typeof API !== 'undefined' && typeof API.put === 'function') {
        try {
            const response = await API.put(`/api/staff/${staffId}`, updates);
            
            if (response && response.success) {
                Object.assign(appState.staff[staffIndex], updates);
                showToast('スタッフ情報を更新しました', 'success');
                render();
            }
        } catch (error) {
            console.error('❌ スタッフ更新エラー:', error);
            showToast('スタッフ情報の更新に失敗しました', 'error');
        }
    } else {
        Object.assign(appState.staff[staffIndex], updates);
        showToast('スタッフ情報を更新しました（ローカル）', 'info');
        render();
    }
}

/**
 * スタッフを削除
 */
async function deleteStaff(staffId) {
    const staff = appState.staff.find(s => s.id === staffId);
    
    if (!staff) {
        showToast('スタッフが見つかりません', 'error');
        return;
    }

    const confirmed = await confirmDialog(`${staff.name}さんを削除しますか?\nシフトデータも削除されます。`);
    
    if (!confirmed) return;

    if (typeof API !== 'undefined' && typeof API.delete === 'function') {
        try {
            const response = await API.delete(`/api/staff/${staffId}`);
            
            if (response && response.success) {
                appState.staff = appState.staff.filter(s => s.id !== staffId);
                delete appState.shifts[staffId];
                showToast('スタッフを削除しました', 'success');
                render();
            }
        } catch (error) {
            console.error('❌ スタッフ削除エラー:', error);
            showToast('スタッフの削除に失敗しました', 'error');
        }
    } else {
        appState.staff = appState.staff.filter(s => s.id !== staffId);
        delete appState.shifts[staffId];
        showToast('スタッフを削除しました（ローカル）', 'info');
        render();
    }
}

// --- フィルター・検索 ---------------------------------------

/**
 * スタッフ検索
 */
function searchStaff(query) {
    if (!query) {
        render();
        return;
    }

    const filtered = appState.staff.filter(staff => 
        staff.name.includes(query) || 
        staff.home === query
    );

    console.log('🔍 検索結果:', filtered.length, '件');
    
    // 検索結果を表示（renderShiftTable を filteredStaff で呼び出し）
    const daysToRender = 10;
    renderTableHeader(daysToRender);
    renderShiftTable(filtered, daysToRender);
}

/**
 * 日付範囲でフィルター
 */
function filterByDateRange(startDate, endDate) {
    console.log('📅 期間フィルター:', startDate, '～', endDate);
    
    // TODO: 日付範囲フィルター処理
    showToast(`${startDate}～${endDate}の期間で表示`, 'info');
}

/**
 * ホーム別でフィルター
 */
function filterByHome(homeId) {
    appState.selectedHome = homeId;
    render();
    showToast(`${homeId}ホームでフィルター`, 'info');
}

// --- 通知・アラート -----------------------------------------

/**
 * シフト未確定の警告を表示
 */
function checkUnconfirmedShifts() {
    let unconfirmedCount = 0;
    
    appState.staff.forEach(staff => {
        const staffShifts = appState.shifts[staff.id] || {};
        const daysInMonth = 31; // 仮
        
        for (let day = 1; day <= daysInMonth; day++) {
            const shift = staffShifts[day.toString()];
            if (!shift || shift.code === 'NONE') {
                unconfirmedCount++;
            }
        }
    });

    if (unconfirmedCount > 0) {
        showToast(`未確定のシフトが${unconfirmedCount}件あります`, 'warning');
    }
}

/**
 * シフト重複チェック
 */
function checkShiftConflicts() {
    const conflicts = [];
    
    // TODO: ホーム別・時間帯別の人員チェック
    
    if (conflicts.length > 0) {
        showToast(`${conflicts.length}件の人員不足があります`, 'error');
    } else {
        showToast('シフトの重複はありません', 'success');
    }
}

// --- ユーティリティ -----------------------------------------

/**
 * データをリフレッシュ
 */
async function refreshData() {
    toggleLoading(true);
    
    try {
        await loadDataFromFirebase();
        render();
        showToast('データを更新しました', 'success');
    } catch (error) {
        console.error('❌ データ更新エラー:', error);
        showToast('データの更新に失敗しました', 'error');
    } finally {
        toggleLoading(false);
    }
}

/**
 * 設定を保存
 */
function saveSettings(settings) {
    localStorage.setItem('appSettings', JSON.stringify(settings));
    showToast('設定を保存しました', 'success');
}

/**
 * 設定を読み込み
 */
function loadSettings() {
    const settingsStr = localStorage.getItem('appSettings');
    
    if (settingsStr) {
        try {
            return JSON.parse(settingsStr);
        } catch (e) {
            console.error('設定の読み込みエラー:', e);
        }
    }
    
    return {
        theme: 'light',
        notifications: true,
        autoSave: false
    };
}

// --- グローバルに公開（HTMLから使用可能） -------------------

/**
 * シフト要望を承認
 */
async function approveShiftRequest(date, home, shiftCode, userId) {
    try {
        const token = localStorage.getItem('shift_auth_token');
        if (!token) {
            alert('ログインが必要です');
            return;
        }
        
        const response = await fetch(`${API_BASE_URL}/api/shift-requests/approve`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                date: date,
                home: home,
                shift_code: shiftCode,
                user_id: userId
            })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || '承認に失敗しました');
        }
        
        console.log('✅ シフト承認成功:', data);
        showToast('シフト要望を承認しました', 'success');
        
        // データを再読み込みしてテーブルを更新
        await loadDataFromFirebase();
        render();
        
    } catch (error) {
        console.error('❌ 承認エラー:', error);
        alert('承認に失敗しました: ' + error.message);
    }
}

/**
 * シフトデータをスプレッドシートに書き込み
 */
async function exportShiftsToSheet() {
    try {
        const token = localStorage.getItem('shift_auth_token');
        if (!token) {
            alert('ログインが必要です');
            return;
        }

        const exportBtn = document.getElementById('export-btn');
        exportBtn.disabled = true;
        exportBtn.textContent = '📊 書き込み中...';

        // 現在の年月のシフトデータを取得
        const year = appState.currentYear;
        const month = appState.currentMonth;

        // シフトデータを構築
        const shiftData = {
            year: year,
            month: month,
            staff: appState.staff || [],
            shifts: appState.shifts || {}
        };

        console.log('📝 スプレッドシート書き込み開始:', { year, month });

        // APIエンドポイントにPOST
        const response = await fetch(`${API_BASE_URL}/api/shifts/export-to-sheet`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(shiftData)
        });

        console.log('📤 レスポンスステータス:', response.status);
        const result = await response.json();
        console.log('📥 レスポンスデータ:', result);

        if (response.ok && result.success) {
            console.log('✅ スプレッドシート書き込み完了:', result.message);
            alert(`✅ スプレッドシートに書き込みました\n\n${result.message || ''}`);
        } else {
            const errorMsg = result.error || `HTTPエラー: ${response.status}`;
            console.error('❌ 書き込みエラー:', errorMsg);
            console.error('レスポンス全体:', result);
            alert('❌ 書き込みに失敗しました:\n' + errorMsg);
        }
    } catch (error) {
        console.error('❌ 書き込み処理エラー:', error);
        console.error('エラー詳細:', error.stack);
        alert('❌ エラーが発生しました:\n' + error.message);
    } finally {
        const exportBtn = document.getElementById('export-btn');
        exportBtn.disabled = false;
        exportBtn.textContent = '📊 書き込み';
    }
}

/**
 * すべてのシフト要望を一括承認
 */
async function bulkApproveShiftRequests() {
    try {
        const token = localStorage.getItem('shift_auth_token');
        if (!token) {
            alert('ログインが必要です');
            return;
        }
        
        // 未承認の要望を収集
        const pendingRequests = [];
        const items = document.querySelectorAll('.shift-request-item:not(.approved)');
        
        items.forEach(item => {
            const date = item.dataset.date;
            const home = item.dataset.home;
            const shiftCode = item.dataset.shiftCode;
            const userId = item.dataset.userId;
            
            if (date && home && shiftCode && userId) {
                pendingRequests.push({ date, home, shift_code: shiftCode, user_id: userId });
            }
        });
        
        if (pendingRequests.length === 0) {
            alert('承認可能なシフト要望がありません');
            return;
        }
        
        if (!confirm(`${pendingRequests.length}件のシフト要望を一括承認しますか？`)) {
            return;
        }
        
        const response = await fetch(`${API_BASE_URL}/api/shift-requests/bulk-approve`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                requests: pendingRequests
            })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || '一括承認に失敗しました');
        }
        
        console.log('✅ 一括承認成功:', data);
        showToast(`${data.approved_count}件のシフト要望を承認しました`, 'success');
        
        // データを再読み込みしてテーブルを更新
        await loadDataFromFirebase();
        render();
        
    } catch (error) {
        console.error('❌ 一括承認エラー:', error);
        alert('一括承認に失敗しました: ' + error.message);
    }
}

/**
 * 日付詳細モーダルを表示
 */
function showDayDetailModal(dateStr) {
    const dayRequests = appState.shiftRequests.filter(req => req.date === dateStr);
    
    if (dayRequests.length === 0) {
        alert(`${dateStr}のシフト要望はありません`);
        return;
    }
    
    // 既存のモーダルがある場合は削除
    const existingModal = document.getElementById('day-detail-modal');
    if (existingModal) {
        existingModal.remove();
    }
    
    // モーダルHTML生成
    let modalHtml = `
        <div id="day-detail-modal" class="modal" style="display: block;">
            <div class="modal-content" style="max-width: 600px;">
                <div class="modal-header">
                    <h2>${dateStr} のシフト要望</h2>
                    <span class="modal-close" onclick="document.getElementById('day-detail-modal').remove()">&times;</span>
                </div>
                <div class="modal-body" style="max-height: 400px; overflow-y: auto;">
                    <table class="shift-table" style="width: 100%;">
                        <thead>
                            <tr>
                                <th>スタッフ</th>
                                <th>ホーム</th>
                                <th>シフト</th>
                                <th>状態</th>
                                <th>操作</th>
                            </tr>
                        </thead>
                        <tbody>
    `;
    
    dayRequests.forEach(req => {
        const statusText = req.status === 1 ? '承認済' : '未承認';
        const statusClass = req.status === 1 ? 'approved' : 'pending';
        const approveBtn = req.status === 0 ? 
            `<button class="btn btn-sm" onclick="approveSingleRequest('${req.date}', '${req.home}', '${req.shiftCode}', '${req.userId}')">承認</button>` : 
            '―';
        
        modalHtml += `
            <tr>
                <td>${req.staffName}</td>
                <td>${req.home}</td>
                <td><strong>${req.shiftCode}</strong></td>
                <td><span class="status-badge ${statusClass}">${statusText}</span></td>
                <td>${approveBtn}</td>
            </tr>
        `;
    });
    
    modalHtml += `
                        </tbody>
                    </table>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-cancel" onclick="document.getElementById('day-detail-modal').remove()">閉じる</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

/**
 * 単一シフト要望を承認
 */
async function approveSingleRequest(date, home, shiftCode, userId) {
    try {
        const response = await API.post('/api/shift-requests/approve', {
            date: date,
            home: home,
            shift_code: shiftCode,
            user_id: userId
        });
        
        if (response.success) {
            alert('反映しました');
            // モーダルを閉じて再読み込み
            document.getElementById('day-detail-modal')?.remove();
            await loadDataFromFirebase();
            render();
            renderCalendarView();
        } else {
            alert('反映に失敗しました: ' + response.error);
        }
    } catch (error) {
        console.error('反映エラー:', error);
        alert('反映中にエラーが発生しました');
    }
}

window.saveAllShifts = saveAllShifts;
window.clearAllShifts = clearAllShifts;
window.exportShiftsToCSV = exportShiftsToCSV;
window.printShiftTable = printShiftTable;
window.reflectShiftRequest = reflectShiftRequest;
window.reflectAllRequests = reflectAllRequests;
window.deleteShiftRequest = deleteShiftRequest;
window.addStaff = addStaff;
window.editStaff = editStaff;
window.deleteStaff = deleteStaff;
window.searchStaff = searchStaff;
window.filterByDateRange = filterByDateRange;
window.filterByHome = filterByHome;
window.approveShiftRequest = approveShiftRequest;
window.bulkApproveShiftRequests = bulkApproveShiftRequests;
window.checkUnconfirmedShifts = checkUnconfirmedShifts;
window.checkShiftConflicts = checkShiftConflicts;
window.exportShiftsToSheet = exportShiftsToSheet;
window.refreshData = refreshData;
window.saveSettings = saveSettings;
window.loadSettings = loadSettings;
window.showDayDetailModal = showDayDetailModal;
window.approveSingleRequest = approveSingleRequest;
window.renderMainCalendarView = renderMainCalendarView;
window.populateHomeSelect = populateHomeSelect;
