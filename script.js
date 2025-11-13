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

// --- DOM要素 -------------------------------------------------
let dom = {}; // DOM要素をキャッシュするオブジェクト

// --- 初期化 -------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
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
    };

    // ダミーデータのロード
    loadDummyData();

    // イベントリスナーの設定
    setupEventListeners();

    // 初期描画
    render();
    
    // 画像に合わせて初期値を設定
    dom.yearSelect.value = appState.currentYear;
    dom.monthSelect.value = appState.currentMonth;
    dom.homeSelect.value = appState.selectedHome;

    console.log('アプリケーションの準備が完了しました。');
});

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
    ];

    // image.png に表示されている10日分のデータ
    appState.shifts = {
        's1': { // 平田 太郎
            '1': { code: 'C', home: 'A' }, '2': { code: 'A', home: 'A' }, '3': { code: 'C', home: 'A' }, '4': { code: 'C', home: 'A' },
            '5': { code: 'EL', home: 'A' }, '6': { code: 'C', home: 'A' }, '7': { code: 'A', home: 'A' }, '8': { code: 'EL', home: 'A' },
            '9': { code: 'N', home: 'A' }, '10': { code: 'EL', home: 'A' },
        },
        's2': { // 山田 美咲
            '1': { code: 'N', home: 'A' }, '2': { code: 'EL', home: 'A' }, '3': { code: 'B', home: 'A' }, '4': { code: 'NONE', home: '' },
            '5': { code: 'NONE', home: '' }, '6': { code: 'C', home: 'A' }, '7': { code: 'A', home: 'A' }, '8': { code: 'NONE', home: '' },
            '9': { code: 'C', home: 'A' }, '10': { code: 'A', home: 'A' },
        },
        's3': { // 高橋 大輔
            '1': { code: 'N', home: 'A' }, '2': { code: 'C', home: 'A' }, '3': { code: 'N', home: 'A' }, '4': { code: 'C', home: 'A' },
            '5': { code: 'L', home: 'A' }, '6': { code: 'B', home: 'A' }, '7': { code: 'C', home: 'A' }, '8': { code: 'L', home: 'A' },
            '9': { code: 'C', home: 'A' }, '10': { code: 'L', home: 'A' },
        },
        's4': { // 小林 彩香
            '1': { code: 'L', home: 'A' }, '2': { code: 'C', home: 'A' }, '3': { code: 'B', home: 'A' }, '4': { code: 'NONE', home: '' },
            '5': { code: 'NONE', home: '' }, '6': { code: 'C', home: 'A' }, '7': { code: 'B', home: 'A' }, '8': { code: 'NONE', home: '' },
            '9': { code: 'L', home: 'A' }, '10': { code: 'C', home: 'A' },
        },
        's5': { // 井上 隼人
            '1': { code: 'L', home: 'A' }, '2': { code: 'L', home: 'A' }, '3': { code: 'NONE', home: '' }, '4': { code: 'N', home: 'A' },
            '5': { code: 'A', home: 'A' }, '6': { code: 'C', home: 'A' }, '7': { code: 'A', home: 'A' }, '8': { code: 'EL', home: 'A' },
            '9': { code: 'L', home: 'A' }, '10': { code: 'EL', home: 'A' },
        },
        's6': { // 山崎 麻衣
            '1': { code: 'EL', home: 'A' }, '2': { code: 'L', home: 'A' }, '3': { code: 'L', home: 'A' }, '4': { code: 'NONE', home: '' },
            '5': { code: 'B', home: 'A' }, '6': { code: 'EL', home: 'A' }, '7': { code: 'L', home: 'A' }, '8': { code: 'NONE', home: '' },
            '9': { code: 'L', home: 'A' }, '10': { code: 'N', home: 'A' },
        },
        's7': { // 田中 悠斗
            '1': { code: 'NONE', home: '' }, '2': { code: 'L', home: 'A' }, '3': { code: 'C', home: 'A' }, '4': { code: 'A', home: 'A' },
            '5': { code: 'A', home: 'A' }, '6': { code: 'B', home: 'A' }, '7': { code: 'A', home: 'A' }, '8': { code: 'B', home: 'A' },
            '9': { code: 'EL', home: 'A' }, '10': { code: 'NONE', home: '' },
        },
        's8': { // 村上 茉優
            '1': { code: 'NONE', home: '' }, '2': { code: 'B', home: 'A' }, '3': { code: 'N', home: 'A' }, '4': { code: 'NONE', home: '' },
            '5': { code: 'C', home: 'A' }, '6': { code: 'N', home: 'A' }, '7': { code: 'B', home: 'A' }, '8': { code: 'NONE', home: '' },
            '9': { code: 'N', home: 'A' }, '10': { code: 'A', home: 'A' },
        },
        's9': { // 佐藤 健太
            '1': { code: 'A', home: 'A' }, '2': { code: 'C', home: 'A' }, '3': { code: 'A', home: 'A' }, '4': { code: 'B', home: 'A' },
            '5': { code: 'N', home: 'A' }, '6': { code: 'A', home: 'A' }, '7': { code: 'C', home: 'A' }, '8': { code: 'A', home: 'A' },
            '9': { code: 'B', home: 'A' }, '10': { code: 'N', home: 'A' },
        },
        's10': { // 伊藤 愛美
            '1': { code: 'C', home: 'A' }, '2': { code: 'A', home: 'A' }, '3': { code: 'L', home: 'A' }, '4': { code: 'C', home: 'A' },
            '5': { code: 'B', home: 'A' }, '6': { code: 'L', home: 'A' }, '7': { code: 'N', home: 'A' }, '8': { code: 'C', home: 'A' },
            '9': { code: 'A', home: 'A' }, '10': { code: 'B', home: 'A' },
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
    dom.yearSelect.addEventListener('change', handleDateChange);
    dom.monthSelect.addEventListener('change', handleDateChange);
    dom.homeSelect.addEventListener('change', handleHomeFilterChange);

    // シフト表のセルクリック（イベント委任）
    dom.shiftTableBody.addEventListener('click', handleCellClick);
    
    // モーダル関連
    dom.modalCloseBtn.addEventListener('click', closeModal);
    dom.modalCancelBtn.addEventListener('click', closeModal);
    dom.modalSaveBtn.addEventListener('click', handleModalSave);

    // 要望関連
    dom.shiftRequestList.addEventListener('click', (e) => {
        if (e.target.classList.contains('btn-reflect')) {
            console.log('個別反映ボタンがクリックされました。', e.target.closest('.shift-request-item'));
            alert('個別反映機能は未実装です。');
        }
    });
    document.getElementById('reflect-all-btn').addEventListener('click', () => {
        console.log('すべて一括反映ボタンがクリックされました。');
        alert('一括反映機能は未実装です。');
    });
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

    // 2. ホーム別月間合計 (右パネル) - 固定データ
    const homeSummaryData = {
        'Aホーム': '341日', 'Bホーム': '310日', 'Cホーム': '310日',
        'Dホーム': '310日', 'Eホーム': '279日'
    };
    let homeHtml = '';
    for (const [label, value] of Object.entries(homeSummaryData)) {
        homeHtml += `
            <li class="summary-list-item">
                <span class="label">${label}</span>
                <span class="value">${value}</span>
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
 * モーダルの保存処理
 */
function handleModalSave() {
    if (!appState.editingCell) return;
    
    const { staffId, date } = appState.editingCell;
    
    // 1. 新しい値を取得
    const newCode = dom.modalShiftCode.value;
    const newHome = dom.modalHome.value;

    // 2. appStateを更新
    if (!appState.shifts[staffId]) {
        appState.shifts[staffId] = {};
    }
    appState.shifts[staffId][date] = { code: newCode, home: newHome };
    
    // 3. モーダルを閉じる
    closeModal();
    
    // 4. 表示を再描画
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
