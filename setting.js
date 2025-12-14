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
    BIKOU_TIMESTAMP: 'shift_cache_bikou_timestamp'
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
        
        // ホームの初期データ確認
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
                const existingHomeNames = homesData.homes.map(h => h.name);
                
                // 不足しているホームを追加
                for (const homeName of INITIAL_HOMES) {
                    if (!existingHomeNames.includes(homeName)) {
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
        
        // 備考テンプレートの初期データ確認
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
                const existingTemplateIds = bikouData.templates.map(t => t.id);
                
                // 不足している備考テンプレートを追加
                for (const template of INITIAL_BIKOU_TEMPLATES) {
                    if (!existingTemplateIds.includes(template.id)) {
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
    
    // ホームを表示
    homes.forEach(home => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <th>
                <input type="text" class="home-name-input" value="${home.name}" data-id="${home.id}" style="width: 50px; text-align: center; font-size: 20px; padding: 5px; background-color: #757575; color: white; border: none; border-radius: 4px;" readonly>
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
            <input type="text" id="new-home-input" placeholder="例: F" style="width: 50px; text-align: center; font-size: 20px; padding: 5px;">
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
            const homeName = input.value.trim().toUpperCase();
            
            if (!homeName) {
                alert('ホーム名を入力してください');
                return;
            }
            
            if (homeName.length !== 1) {
                alert('ホーム名は1文字で入力してください');
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
        
        // 大文字化
        newHomeInput.addEventListener('input', (e) => {
            e.target.value = e.target.value.toUpperCase();
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
        // 備考IDを編集可能な入力フィールドで表示
        row.innerHTML = `
            <th>
                <input type="text" class="bikou-id-input" value="${template.id}" data-id="${template.id}" style="width: 80px; text-align: center; font-size: 20px; padding: 5px; background-color: #757575; color: white; border: none; border-radius: 4px;" readonly>
            </th>
            <td class="td">
                <input class="bikou-edit-id" type="button" value="名前変更" data-id="${template.id}">
                <input class="bikou-edit" type="button" value="内容編集" data-id="${template.id}" data-text="${template.text}">
                <input class="bikou-delete" type="button" value="削除" data-id="${template.id}" data-text="${template.text}">
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
            
            if (confirm(`備考テンプレート「${templateText}」を削除しますか？\nこの操作は取り消せません。`)) {
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
    console.log(`🏠 ホーム名変更: ${oldName} -> ${newName}`);
    
    try {
        const token = localStorage.getItem('shift_auth_token');
        if (!token) {
            alert('認証トークンがありません。再ログインしてください。');
            return;
        }
        
        // 1. 新しい名前でホームを作成
        const addResponse = await fetch(`${API_BASE_URL}/api/homes`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name: newName })
        });
        
        const addData = await addResponse.json();
        if (!addData.success) {
            throw new Error('新しい名前での作成に失敗しました: ' + addData.error);
        }
        
        // 2. 古いホームを削除
        const deleteResponse = await fetch(`${API_BASE_URL}/api/homes/${homeId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        const deleteData = await deleteResponse.json();
        if (!deleteData.success) {
            console.warn('⚠️ 古いホームの削除に失敗:', deleteData.error);
        }
        
        console.log('✅ ホーム名変更成功');
        alert('ホーム名を変更しました');
        // キャッシュをクリアして再読み込み
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
    const templateText = prompt('追加する備考テンプレートの文章を入力してください');
    
    if (!templateText) {
        return; // キャンセル
    }
    
    if (templateText.trim().length === 0) {
        alert('テンプレート文章を入力してください');
        return;
    }
    
    await addBikouTemplate(templateText.trim());
}

/**
 * 備考テンプレートを追加
 */
async function addBikouTemplate(templateText) {
    console.log(`📝 備考テンプレート追加: ${templateText}`);
    
    try {
        const token = localStorage.getItem('shift_auth_token');
        if (!token) {
            alert('認証トークンがありません。再ログインしてください。');
            return;
        }
        
        const response = await fetch(`${API_BASE_URL}/api/bikou-templates`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ text: templateText })
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
