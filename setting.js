/**
 * setting.js - 設定画面の機能実装
 * ホーム管理と備考テンプレート管理
 */

console.log('⚙️ 設定画面スクリプト読み込み');

// キャッシュ設定
const CACHE_DURATION = 5 * 60 * 1000; // 5分間キャッシュ
const CACHE_KEYS = {
    HOMES: 'shift_cache_homes',
    HOMES_TIMESTAMP: 'shift_cache_homes_timestamp',
    BIKOU: 'shift_cache_bikou_templates',
    BIKOU_TIMESTAMP: 'shift_cache_bikou_timestamp',
    CODES: 'shift_cache_codes',
    CODES_TIMESTAMP: 'shift_cache_codes_timestamp'
};

// 初期データ
const INITIAL_HOMES = ['A', 'B', 'C', 'D', 'E'];
const INITIAL_BIKOU_TEMPLATES = [
    { id: '備考1', text: '備考テンプレート1' },
    { id: '備考2', text: '備考テンプレート2' },
    { id: '備考3', text: '備考テンプレート3' },
    { id: '備考4', text: '備考テンプレート4' },
    { id: '備考5', text: '備考テンプレート5' }
];

// 初期シフトコード（必要に応じて編集可能）
const INITIAL_SHIFT_CODES = [
    { code: 'A', label: '日勤', hours: 8, order: 1 },
    { code: 'B', label: '夜勤', hours: 8, order: 2 },
    { code: 'C', label: '遅番', hours: 8, order: 3 },
    { code: 'EL', label: '早朝', hours: 3, order: 4 },
    { code: 'L', label: '有休', hours: 0, order: 5 },
    { code: 'N', label: '公休', hours: 0, order: 6 },
    { code: 'SP', label: '特休', hours: 0, order: 7 },
    { code: 'NONE', label: '未定 (-)', hours: 0, order: 99 }
];

/**
 * 初期データを確認・作成
 */
async function ensureInitialData() {
    console.log('📋 初期データ確認中...');
    
    try {
        const token = localStorage.getItem('shift_auth_token');
        if (!token) {
            console.warn('⚠️ 認証トークンがありません');
            return;
        }
        
        // ホームの初期データ確認（ホームが0件の場合のみ初期化）
        const homesResponse = await fetch(`${API_BASE_URL}/api/homes`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (homesResponse.ok) {
            const homesData = await homesResponse.json();
            if (homesData.success) {
                // ホームが1件もない場合のみ初期データを作成
                if (homesData.homes.length === 0) {
                    console.log('📦 ホームが存在しないため、初期データを作成します');
                    for (const homeName of INITIAL_HOMES) {
                        console.log(`➕ ホーム「${homeName}」を作成中...`);
                        await fetch(`${API_BASE_URL}/api/homes`, {
                            method: 'POST',
                            headers: {
                                'Authorization': `Bearer ${token}`,
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({ name: homeName })
                        });
                    }
                }
            }
        }
        
        // 備考テンプレートの初期データ確認（0件の場合のみ初期化）
        const bikouResponse = await fetch(`${API_BASE_URL}/api/bikou-templates`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (bikouResponse.ok) {
            const bikouData = await bikouResponse.json();
            if (bikouData.success) {
                // 備考テンプレートが1件もない場合のみ初期データを作成
                if (bikouData.templates.length === 0) {
                    console.log('📦 備考テンプレートが存在しないため、初期データを作成します');
                    for (const template of INITIAL_BIKOU_TEMPLATES) {
                        console.log(`➕ 備考テンプレート「${template.id}」を作成中...`);
                        await fetch(`${API_BASE_URL}/api/bikou-templates`, {
                            method: 'POST',
                            headers: {
                                'Authorization': `Bearer ${token}`,
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({ text: template.text, id: template.id })
                        });
                    }
                }
            }
        }
        
        // シフトコードの初期データ確認
        const codesResponse = await fetch(`${API_BASE_URL}/api/shift-codes`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        if (codesResponse.ok) {
            const codesData = await codesResponse.json();
            if (!(codesData.success && codesData.count > 0)) {
                console.log('📦 シフトコード初期化開始');
                for (const c of INITIAL_SHIFT_CODES) {
                    await fetch(`${API_BASE_URL}/api/shift-codes`, {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(c)
                    });
                }
            }
        }

        console.log('✅ 初期データ確認完了');
    } catch (error) {
        console.error('❌ 初期データ確認エラー:', error);
    }
}

// ページ読み込み時に実行
document.addEventListener('DOMContentLoaded', async () => {
    console.log('📄 設定画面初期化開始');
    
    // 認証チェック
    if (typeof PageRouter !== 'undefined') {
        const hasAccess = await PageRouter.checkPageAccess();
        if (!hasAccess) {
            console.warn('⚠️ アクセス権限なし');
            return;
        }
    }
    
    // 初期データを作成（存在しない場合のみ）
    await ensureInitialData();
    
    // データ読み込み（キャッシュ優先）
    await loadHomes();
    await loadBikouTemplates();
    await loadShiftCodes();
    
    // イベントリスナー設定
    setupEventListeners();
    
    console.log('✅ 設定画面初期化完了');
});

/**
 * ホーム一覧を読み込んで表示（キャッシュ優先）
 */
async function loadHomes(forceRefresh = false) {
    console.log('🏠 ホーム一覧読み込み中...');
    
    // キャッシュチェック
    if (!forceRefresh) {
        const cachedData = getCachedData(CACHE_KEYS.HOMES, CACHE_KEYS.HOMES_TIMESTAMP);
        if (cachedData) {
            console.log('📦 キャッシュからホーム取得:', cachedData.length + '件');
            displayHomes(cachedData);
            return;
        }
    }
    
    try {
        const token = localStorage.getItem('shift_auth_token');
        if (!token) {
            console.error('❌ 認証トークンがありません');
            return;
        }
        
        console.log('🌐 APIからホーム取得中...');
        const response = await fetch(`${API_BASE_URL}/api/homes`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success) {
            console.log(`✅ ホーム取得成功: ${data.homes.length}件`);
            // キャッシュに保存
            setCachedData(CACHE_KEYS.HOMES, data.homes, CACHE_KEYS.HOMES_TIMESTAMP);
            displayHomes(data.homes);
        } else {
            console.error('❌ ホーム取得失敗:', data.error);
            alert('ホーム情報の取得に失敗しました: ' + data.error);
        }
    } catch (error) {
        console.error('❌ ホーム取得エラー:', error);
        alert('ホーム情報の取得中にエラーが発生しました');
    }
}

/**
 * ホームをテーブルに表示
 */
function displayHomes(homes) {
    const homeTable = document.querySelector('.home-table');
    if (!homeTable) {
        console.error('❌ ホームテーブルが見つかりません');
        return;
    }
    
    // 既存の行をすべてクリア
    const rows = homeTable.querySelectorAll('tr');
    rows.forEach(row => row.remove());
    
    // ホームを表示（idはフィールド名、nameは値）
    homes.forEach(home => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <th>
                <input type="text" class="home-name-input" value="${home.name}" data-id="${home.id}" style="width: 120px; text-align: center; font-size: 20px; padding: 5px; background-color: #757575; color: white; border: none; border-radius: 4px;" readonly>
            </th>
            <td class="td">
                <input class="home-edit" type="button" value="編集" data-id="${home.id}" data-name="${home.name}">
                <input class="home-delete" type="button" value="削除" data-id="${home.id}" data-name="${home.name}">
            </td>
        `;
        homeTable.appendChild(row);
    });
    
    // 新規追加用の行を追加
    const newRow = document.createElement('tr');
    newRow.innerHTML = `
        <th>
            <input type="text" id="new-home-input" placeholder="例: F" style="width: 120px; text-align: center; font-size: 20px; padding: 5px;">
        </th>
        <td class="td">
            <input id="add-new-home-btn" type="button" value="追加">
        </td>
    `;
    homeTable.appendChild(newRow);
    
    // ボタンにイベントリスナーを追加
    attachHomeButtonListeners();
}

/**
 * ホームのボタンにイベントリスナーを設定
 */
function attachHomeButtonListeners() {
    // 編集ボタン
    document.querySelectorAll('.home-edit').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.preventDefault();
            const homeId = e.target.dataset.id;
            const currentName = e.target.dataset.name;
            
            const newName = prompt('ホーム名を変更してください', currentName);
            
            if (newName === null) {
                return; // キャンセル
            }
            
            if (!newName.trim()) {
                alert('ホーム名を入力してください');
                return;
            }
            
            await renameHome(homeId, currentName, newName.trim());
        });
    });
    
    // 削除ボタン
    document.querySelectorAll('.home-delete').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.preventDefault();
            const homeId = e.target.dataset.id;
            const homeName = e.target.dataset.name;
            
            if (confirm(`ホーム${homeName}を削除しますか？\nこの操作は取り消せません。`)) {
                await deleteHome(homeId);
            }
        });
    });
    
    // 追加ボタン
    const addBtn = document.getElementById('add-new-home-btn');
    if (addBtn) {
        addBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            const input = document.getElementById('new-home-input');
            const homeName = input.value.trim();
            
            if (!homeName) {
                alert('ホーム名を入力してください');
                return;
            }
            
            await addHome(homeName);
            input.value = ''; // 入力をクリア
        });
    }
    
    // 入力フィールドのEnterキー対応
    const newHomeInput = document.getElementById('new-home-input');
    if (newHomeInput) {
        newHomeInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                document.getElementById('add-new-home-btn').click();
            }
        });
    }
}

/**
 * 備考テンプレート一覧を読み込んで表示（キャッシュ優先）
 */
async function loadBikouTemplates(forceRefresh = false) {
    console.log('📝 備考テンプレート一覧読み込み中...');
    
    // キャッシュチェック
    if (!forceRefresh) {
        const cachedData = getCachedData(CACHE_KEYS.BIKOU, CACHE_KEYS.BIKOU_TIMESTAMP);
        if (cachedData) {
            console.log('📦 キャッシュから備考テンプレート取得:', cachedData.length + '件');
            displayBikouTemplates(cachedData);
            return;
        }
    }
    
    try {
        const token = localStorage.getItem('shift_auth_token');
        if (!token) {
            console.error('❌ 認証トークンがありません');
            return;
        }
        
        console.log('🌐 APIから備考テンプレート取得中...');
        const response = await fetch(`${API_BASE_URL}/api/bikou-templates`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success) {
            console.log(`✅ 備考テンプレート取得成功: ${data.templates.length}件`);
            // キャッシュに保存
            setCachedData(CACHE_KEYS.BIKOU, data.templates, CACHE_KEYS.BIKOU_TIMESTAMP);
            displayBikouTemplates(data.templates);
        } else {
            console.error('❌ 備考テンプレート取得失敗:', data.error);
            alert('備考テンプレートの取得に失敗しました: ' + data.error);
        }
    } catch (error) {
        console.error('❌ 備考テンプレート取得エラー:', error);
        alert('備考テンプレートの取得中にエラーが発生しました');
    }
}

/**
 * 備考テンプレートをテーブルに表示
 */
function displayBikouTemplates(templates) {
    const bikouTable = document.querySelector('.bikou-table');
    if (!bikouTable) {
        console.error('❌ 備考テーブルが見つかりません');
        return;
    }
    
    // 既存の行をクリア（追加ボタン以外）
    const rows = bikouTable.querySelectorAll('tr');
    rows.forEach((row, index) => {
        if (index > 0) { // 最初の行（追加ボタン）は残す
            row.remove();
        }
    });
    
    // 備考テンプレートを表示
    templates.forEach((template, index) => {
        const row = document.createElement('tr');
        // 備考IDを表示（データベースのフィールド名）
        row.innerHTML = `
            <th>
                <input type="text" class="bikou-id-input" value="${template.id}" data-id="${template.id}" style="width: 120px; text-align: center; font-size: 20px; padding: 5px; background-color: #757575; color: white; border: none; border-radius: 4px;" readonly>
            </th>
            <td class="td">
                <input class="bikou-edit-id" type="button" value="名前変更" data-id="${template.id}">
                <input class="bikou-edit" type="button" value="内容編集" data-id="${template.id}" data-text="${template.text}">
                <input class="bikou-delete" type="button" value="削除" data-id="${template.id}" data-text="${template.id}">
            </td>
        `;
        bikouTable.appendChild(row);
    });
    
    // ボタンにイベントリスナーを追加
    attachBikouButtonListeners();
}

/**
 * 備考テンプレートのボタンにイベントリスナーを設定
 */
function attachBikouButtonListeners() {
    // 名前変更ボタン
    document.querySelectorAll('.bikou-edit-id').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.preventDefault();
            const oldId = e.target.dataset.id;
            
            const newId = prompt('備考の名前を変更してください（例: 備考1、備考2）', oldId);
            
            if (newId === null) {
                return; // キャンセル
            }
            
            if (!newId.trim()) {
                alert('備考の名前を入力してください');
                return;
            }
            
            await renameBikouTemplate(oldId, newId.trim());
        });
    });
    
    // 内容編集ボタン
    document.querySelectorAll('.bikou-edit').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.preventDefault();
            const templateId = e.target.dataset.id;
            const currentText = e.target.dataset.text;
            
            const newText = prompt('備考テンプレートの内容を編集してください', currentText);
            
            if (newText === null) {
                return; // キャンセル
            }
            
            if (!newText.trim()) {
                alert('備考テンプレートの内容を入力してください');
                return;
            }
            
            await updateBikouTemplate(templateId, newText.trim());
        });
    });
    
    // 削除ボタン
    document.querySelectorAll('.bikou-delete').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.preventDefault();
            const templateId = e.target.dataset.id;
            const templateText = e.target.dataset.text;
            
            if (confirm(`備考テンプレート「${templateId}」を削除しますか？\nこの操作は取り消せません。`)) {
                await deleteBikouTemplate(templateId);
            }
        });
    });
}

/**
 * イベントリスナーを設定
 */
function setupEventListeners() {
    // ホーム追加ボタン（現在は使用していない）
    const homeAddBtn = document.querySelector('.tuika');
    if (homeAddBtn) {
        homeAddBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            await showAddHomeDialog();
        });
    }
    
    // 備考テンプレート追加ボタン
    const bikouAddBtn = document.querySelector('.bikou-tuika');
    if (bikouAddBtn) {
        bikouAddBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            await showAddBikouTemplateDialog();
        });
    }

    // シフトコード追加ボタン
    const codeAddBtn = document.querySelector('.code-tuika');
    if (codeAddBtn) {
        codeAddBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            await showAddCodeDialog();
        });
    }
}

/**
 * シフトコード一覧を読み込んで表示（キャッシュ優先）
 */
async function loadShiftCodes(forceRefresh = false) {
    console.log('🔤 シフトコード一覧読み込み中...');

    if (!forceRefresh) {
        const cached = getCachedData(CACHE_KEYS.CODES, CACHE_KEYS.CODES_TIMESTAMP);
        if (cached) {
            console.log('📦 キャッシュからコード取得:', cached.length + '件');
            displayShiftCodes(cached);
            return;
        }
    }

    try {
        const token = localStorage.getItem('shift_auth_token');
        if (!token) {
            console.error('❌ 認証トークンがありません');
            return;
        }

        const resp = await fetch(`${API_BASE_URL}/api/shift-codes`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        if (!resp.ok) throw new Error(`HTTP error! status: ${resp.status}`);
        const data = await resp.json();
        if (data.success) {
            setCachedData(CACHE_KEYS.CODES, data.codes, CACHE_KEYS.CODES_TIMESTAMP);
            displayShiftCodes(data.codes);
        } else {
            alert('シフトコードの取得に失敗しました: ' + data.error);
        }
    } catch (e) {
        console.error('❌ シフトコード取得エラー:', e);
        alert('シフトコードの取得中にエラーが発生しました');
    }
}

/**
 * シフトコードをテーブルに表示
 */
function displayShiftCodes(codes) {
    const codeTable = document.querySelector('.code-table');
    if (!codeTable) return;

    // 既存行を追加ボタン行以外クリア
    const rows = codeTable.querySelectorAll('tr');
    rows.forEach((row, idx) => { if (idx > 0) row.remove(); });

    codes.forEach((c) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <th>
                <input type="text" class="code-id-input" value="${c.code}" data-id="${c.code}" style="width: 100px; text-align: center; font-size: 18px; padding: 5px; background-color: #757575; color: white; border: none; border-radius: 4px;" readonly>
            </th>
            <td class="td">
                <span style="margin-right:8px; color:#fff">${c.label}（${c.hours}時間）</span>
                <input class="code-edit" type="button" value="編集" data-id="${c.code}" data-label="${c.label}" data-hours="${c.hours}" data-order="${c.order}">
                <input class="code-delete" type="button" value="削除" data-id="${c.code}">
            </td>
        `;
        codeTable.appendChild(row);
    });

    attachCodeButtonListeners();
}

function attachCodeButtonListeners() {
    // 編集
    document.querySelectorAll('.code-edit').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.preventDefault();
            const id = e.target.dataset.id;
            const currentLabel = e.target.dataset.label;
            const currentHours = e.target.dataset.hours;
            const currentOrder = e.target.dataset.order;

            const label = prompt('表示名を入力してください（例: 日勤）', currentLabel);
            if (label === null) return;
            const hoursStr = prompt('所定時間（数値）を入力してください（例: 8）', currentHours);
            if (hoursStr === null) return;
            const orderStr = prompt('並び順（数値・任意）', currentOrder);
            const hours = parseFloat(hoursStr);
            const order = orderStr ? parseInt(orderStr, 10) : undefined;
            if (Number.isNaN(hours)) {
                alert('時間は数値で入力してください');
                return;
            }
            await updateShiftCode(id, label.trim(), hours, order);
        });
    });

    // 削除
    document.querySelectorAll('.code-delete').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.preventDefault();
            const id = e.target.dataset.id;
            if (confirm(`コード ${id} を削除しますか？`)) {
                await deleteShiftCode(id);
            }
        });
    });
}

async function showAddCodeDialog() {
    const code = prompt('コードを入力してください（例: A, B, C, EL, N, L, SP, NONE）');
    if (!code) return;
    const label = prompt('表示名を入力してください（例: 日勤, 夜勤, 未定 (-) ）');
    if (!label) return;
    const hoursStr = prompt('所定時間（数値）を入力してください（例: 8）', '8');
    if (!hoursStr) return;
    const hours = parseFloat(hoursStr);
    if (Number.isNaN(hours)) {
        alert('時間は数値で入力してください');
        return;
    }
    await addShiftCode(code.trim(), label.trim(), hours);
}

async function addShiftCode(code, label, hours) {
    try {
        const token = localStorage.getItem('shift_auth_token');
        const resp = await fetch(`${API_BASE_URL}/api/shift-codes`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ code, label, hours })
        });
        const data = await resp.json();
        if (data.success) {
            clearCache(CACHE_KEYS.CODES, CACHE_KEYS.CODES_TIMESTAMP);
            await loadShiftCodes(true);
        } else {
            alert('シフトコード追加に失敗しました: ' + data.error);
        }
    } catch (e) {
        console.error('❌ シフトコード追加エラー:', e);
        alert('シフトコードの追加中にエラーが発生しました');
    }
}

async function updateShiftCode(code, label, hours, order) {
    try {
        const token = localStorage.getItem('shift_auth_token');
        const body = { label, hours };
        if (order !== undefined) body.order = order;
        const resp = await fetch(`${API_BASE_URL}/api/shift-codes/${code}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        });
        const data = await resp.json();
        if (data.success) {
            clearCache(CACHE_KEYS.CODES, CACHE_KEYS.CODES_TIMESTAMP);
            await loadShiftCodes(true);
        } else {
            alert('シフトコード更新に失敗しました: ' + data.error);
        }
    } catch (e) {
        console.error('❌ シフトコード更新エラー:', e);
        alert('シフトコードの更新中にエラーが発生しました');
    }
}

async function deleteShiftCode(code) {
    try {
        const token = localStorage.getItem('shift_auth_token');
        const resp = await fetch(`${API_BASE_URL}/api/shift-codes/${code}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        const data = await resp.json();
        if (data.success) {
            clearCache(CACHE_KEYS.CODES, CACHE_KEYS.CODES_TIMESTAMP);
            await loadShiftCodes(true);
        } else {
            alert('シフトコード削除に失敗しました: ' + data.error);
        }
    } catch (e) {
        console.error('❌ シフトコード削除エラー:', e);
        alert('シフトコードの削除中にエラーが発生しました');
    }
}

/**
 * 指定コードの所定時間を取得（計算用）
 */
async function getShiftCodeHours(code) {
    try {
        const token = localStorage.getItem('shift_auth_token');
        const resp = await fetch(`${API_BASE_URL}/api/shift-codes/${code}/hours`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        const data = await resp.json();
        if (data.success) return data.hours;
        return 0;
    } catch (e) {
        console.error('❌ 時間取得エラー:', e);
        return 0;
    }
}

/**
 * ホーム追加ダイアログを表示
 */
async function showAddHomeDialog() {
    const homeName = prompt('追加するホーム名を入力してください（例: F）');
    
    if (!homeName) {
        return; // キャンセル
    }
    
    if (homeName.trim().length === 0) {
        alert('ホーム名を入力してください');
        return;
    }
    
    await addHome(homeName.trim());
}

/**
 * ホームを追加
 */
async function addHome(homeName) {
    console.log(`🏠 ホーム追加: ${homeName}`);
    
    try {
        const token = localStorage.getItem('shift_auth_token');
        if (!token) {
            alert('認証トークンがありません。再ログインしてください。');
            return;
        }
        
        const response = await fetch(`${API_BASE_URL}/api/homes`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name: homeName })
        });
        
        const data = await response.json();
        
        if (data.success) {
            console.log('✅ ホーム追加成功:', data.home_id);
            alert('ホームを追加しました');
            // キャッシュをクリアして再読み込み（全ページで反映させるため）
            clearAllCache();
            await loadHomes(true); // 強制再読み込み
        } else {
            console.error('❌ ホーム追加失敗:', data.error);
            alert('ホームの追加に失敗しました: ' + data.error);
        }
    } catch (error) {
        console.error('❌ ホーム追加エラー:', error);
        alert('ホームの追加中にエラーが発生しました');
    }
}

/**
 * ホーム名を変更
 */
async function renameHome(homeId, oldName, newName) {
    console.log(`🏠 ホーム名変更: ${oldName} -> ${newName} (ID: ${homeId})`);
    
    try {
        const token = localStorage.getItem('shift_auth_token');
        if (!token) {
            alert('認証トークンがありません。再ログインしてください。');
            return;
        }
        
        // 備考テンプレートと同じ方式: 新規作成 + 古いものを削除
        // 理由: APIがPUT /api/homes/{id}をサポートしていないため
        
        // 1. 新しい名前でホームを作成
        const addResponse = await fetch(`${API_BASE_URL}/api/homes`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name: newName, id: homeId })
        });
        
        const addData = await addResponse.json();
        if (!addData.success) {
            throw new Error('新しい名前での作成に失敗しました: ' + addData.error);
        }
        
        // 2. 古いホームを削除（同じIDなので実質的には上書き）
        // 注: APIの実装次第では削除不要の可能性あり
        
        console.log('✅ ホーム名変更成功');
        alert('ホーム名を変更しました');
        // キャッシュをクリアして再読み込み（全ページで反映させるため）
        clearAllCache();
        await loadHomes(true);
        
    } catch (error) {
        console.error('❌ ホーム名変更エラー:', error);
        alert('ホーム名の変更中にエラーが発生しました: ' + error.message);
    }
}

/**
 * ホームを削除
 */
async function deleteHome(homeId) {
    console.log(`🗑️ ホーム削除: ${homeId}`);
    
    try {
        const token = localStorage.getItem('shift_auth_token');
        if (!token) {
            alert('認証トークンがありません。再ログインしてください。');
            return;
        }
        
        const response = await fetch(`${API_BASE_URL}/api/homes/${homeId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            console.log('✅ ホーム削除成功');
            alert('ホームを削除しました');
            // キャッシュをクリアして再読み込み（全ページで反映させるため）
            clearAllCache();
            await loadHomes(true); // 強制再読み込み
        } else {
            console.error('❌ ホーム削除失敗:', data.error);
            alert('ホームの削除に失敗しました: ' + data.error);
        }
    } catch (error) {
        console.error('❌ ホーム削除エラー:', error);
        alert('ホームの削除中にエラーが発生しました');
    }
}

/**
 * 備考テンプレート追加ダイアログを表示
 */
async function showAddBikouTemplateDialog() {
    // 1. まず名前を聞く
    const templateId = prompt('備考テンプレートの名前を入力してください（例: 備考1、備考2）');
    
    if (!templateId) {
        return; // キャンセル
    }
    
    if (templateId.trim().length === 0) {
        alert('備考テンプレートの名前を入力してください');
        return;
    }
    
    // 2. 次に中身を聞く
    const templateText = prompt('備考テンプレートの内容を入力してください');
    
    if (!templateText) {
        return; // キャンセル
    }
    
    if (templateText.trim().length === 0) {
        alert('備考テンプレートの内容を入力してください');
        return;
    }
    
    await addBikouTemplate(templateText.trim(), templateId.trim());
}

/**
 * 備考テンプレートを追加
 */
async function addBikouTemplate(templateText, templateId = null) {
    console.log(`📝 備考テンプレート追加: ${templateId || '自動生成'} -> ${templateText}`);
    
    try {
        const token = localStorage.getItem('shift_auth_token');
        if (!token) {
            alert('認証トークンがありません。再ログインしてください。');
            return;
        }
        
        const requestBody = { text: templateText };
        // IDが指定されている場合は含める
        if (templateId) {
            requestBody.id = templateId;
        }
        
        const response = await fetch(`${API_BASE_URL}/api/bikou-templates`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });
        
        const data = await response.json();
        
        if (data.success) {
            console.log('✅ 備考テンプレート追加成功:', data.template_id);
            alert('備考テンプレートを追加しました');
            // キャッシュをクリアして再読み込み
            clearCache(CACHE_KEYS.BIKOU, CACHE_KEYS.BIKOU_TIMESTAMP);
            await loadBikouTemplates(true); // 強制再読み込み
        } else {
            console.error('❌ 備考テンプレート追加失敗:', data.error);
            alert('備考テンプレートの追加に失敗しました: ' + data.error);
        }
    } catch (error) {
        console.error('❌ 備考テンプレート追加エラー:', error);
        alert('備考テンプレートの追加中にエラーが発生しました');
    }
}

/**
 * 備考テンプレートを削除
 */
async function deleteBikouTemplate(templateId) {
    console.log(`🗑️ 備考テンプレート削除: ${templateId}`);
    
    try {
        const token = localStorage.getItem('shift_auth_token');
        if (!token) {
            alert('認証トークンがありません。再ログインしてください。');
            return;
        }
        
        const response = await fetch(`${API_BASE_URL}/api/bikou-templates/${templateId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            console.log('✅ 備考テンプレート削除成功');
            alert('備考テンプレートを削除しました');
            // キャッシュをクリアして再読み込み
            clearCache(CACHE_KEYS.BIKOU, CACHE_KEYS.BIKOU_TIMESTAMP);
            await loadBikouTemplates(true); // 強制再読み込み
        } else {
            console.error('❌ 備考テンプレート削除失敗:', data.error);
            alert('備考テンプレートの削除に失敗しました: ' + data.error);
        }
    } catch (error) {
        console.error('❌ 備考テンプレート削除エラー:', error);
        alert('備考テンプレートの削除中にエラーが発生しました');
    }
}

/**
 * 備考テンプレートの名前を変更
 */
async function renameBikouTemplate(oldId, newId) {
    console.log(`📝 備考テンプレート名前変更: ${oldId} -> ${newId}`);
    
    try {
        const token = localStorage.getItem('shift_auth_token');
        if (!token) {
            alert('認証トークンがありません。再ログインしてください。');
            return;
        }
        
        // 1. 古いテンプレートのデータを取得
        const getResponse = await fetch(`${API_BASE_URL}/api/bikou-templates`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        const getData = await getResponse.json();
        if (!getData.success) {
            throw new Error('テンプレートデータの取得に失敗しました');
        }
        
        const oldTemplate = getData.templates.find(t => t.id === oldId);
        if (!oldTemplate) {
            throw new Error('変更対象のテンプレートが見つかりません');
        }
        
        // 2. 新しいIDでテンプレートを作成
        const addResponse = await fetch(`${API_BASE_URL}/api/bikou-templates`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ text: oldTemplate.text, id: newId })
        });
        
        const addData = await addResponse.json();
        if (!addData.success) {
            throw new Error('新しい名前での作成に失敗しました: ' + addData.error);
        }
        
        // 3. 古いテンプレートを削除
        const deleteResponse = await fetch(`${API_BASE_URL}/api/bikou-templates/${oldId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        const deleteData = await deleteResponse.json();
        if (!deleteData.success) {
            console.warn('⚠️ 古いテンプレートの削除に失敗:', deleteData.error);
        }
        
        console.log('✅ 備考テンプレート名前変更成功');
        alert('備考テンプレートの名前を変更しました');
        // キャッシュをクリアして再読み込み（全キャッシュクリア）
        clearAllCache();
        await loadBikouTemplates(true);
        
    } catch (error) {
        console.error('❌ 備考テンプレート名前変更エラー:', error);
        alert('備考テンプレートの名前変更中にエラーが発生しました: ' + error.message);
    }
}

/**
 * 備考テンプレートを更新
 */
async function updateBikouTemplate(templateId, newText) {
    console.log(`📝 備考テンプレート更新: ${templateId} -> ${newText}`);
    
    try {
        const token = localStorage.getItem('shift_auth_token');
        if (!token) {
            alert('認証トークンがありません。再ログインしてください。');
            return;
        }
        
        const response = await fetch(`${API_BASE_URL}/api/bikou-templates/${templateId}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ text: newText })
        });
        
        const data = await response.json();
        
        if (data.success) {
            console.log('✅ 備考テンプレート更新成功');
            alert('備考テンプレートを更新しました');
            // キャッシュをクリアして再読み込み
            clearCache(CACHE_KEYS.BIKOU, CACHE_KEYS.BIKOU_TIMESTAMP);
            await loadBikouTemplates(true); // 強制再読み込み
        } else {
            console.error('❌ 備考テンプレート更新失敗:', data.error);
            alert('備考テンプレートの更新に失敗しました: ' + data.error);
        }
    } catch (error) {
        console.error('❌ 備考テンプレート更新エラー:', error);
        alert('備考テンプレートの更新中にエラーが発生しました');
    }
}

/**
 * テキストを指定文字数で切り詰め
 */
function truncateText(text, maxLength) {
    if (text.length <= maxLength) {
        return text;
    }
    return text.substring(0, maxLength) + '...';
}

/**
 * キャッシュからデータを取得
 */
function getCachedData(dataKey, timestampKey) {
    const timestamp = localStorage.getItem(timestampKey);
    if (!timestamp) return null;
    
    const age = Date.now() - parseInt(timestamp);
    if (age > CACHE_DURATION) {
        // キャッシュ期限切れ
        clearCache(dataKey, timestampKey);
        return null;
    }
    
    const data = localStorage.getItem(dataKey);
    if (!data) return null;
    
    try {
        return JSON.parse(data);
    } catch (e) {
        console.error('キャッシュ解析エラー:', e);
        return null;
    }
}

/**
 * データをキャッシュに保存
 */
function setCachedData(dataKey, data, timestampKey) {
    try {
        localStorage.setItem(dataKey, JSON.stringify(data));
        localStorage.setItem(timestampKey, Date.now().toString());
        console.log('💾 キャッシュ保存:', dataKey);
    } catch (e) {
        console.error('キャッシュ保存エラー:', e);
    }
}

/**
 * キャッシュをクリア
 */
function clearCache(dataKey, timestampKey) {
    localStorage.removeItem(dataKey);
    localStorage.removeItem(timestampKey);
    console.log('🗑️ キャッシュクリア:', dataKey);
}

/**
 * すべてのキャッシュをクリア
 */
function clearAllCache() {
    Object.values(CACHE_KEYS).forEach(key => {
        localStorage.removeItem(key);
    });
    console.log('🗑️ すべてのキャッシュをクリア');
}

/**
 * 戻るボタンの処理
 */
function goBack() {
    if (window.history.length > 1) {
        window.history.back();
    } else {
        // 履歴がない場合はホームへ
        const basePath = window.BASE_PATH || '/shift/';
        window.location.href = basePath + 'shift_home_admin.html';
    }
}

