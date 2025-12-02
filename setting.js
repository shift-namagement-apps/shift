/**
 * setting.js - 設定画面の機能実装
 * ホーム管理と備考テンプレート管理
 */

console.log('⚙️ 設定画面スクリプト読み込み');

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
    
    // データ読み込み
    await loadHomes();
    await loadBikouTemplates();
    
    // イベントリスナー設定
    setupEventListeners();
    
    console.log('✅ 設定画面初期化完了');
});

/**
 * ホーム一覧を読み込んで表示
 */
async function loadHomes() {
    console.log('🏠 ホーム一覧読み込み中...');
    
    try {
        const token = localStorage.getItem('shift_auth_token');
        if (!token) {
            console.error('❌ 認証トークンがありません');
            return;
        }
        
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
    
    // 既存の行をクリア（追加ボタン以外）
    const rows = homeTable.querySelectorAll('tr');
    rows.forEach((row, index) => {
        if (index > 0) { // 最初の行（追加ボタン）は残す
            row.remove();
        }
    });
    
    // ホームを表示
    homes.forEach(home => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <th>${home.name}ホーム</th>
            <td class="td">
                <input class="home-view" type="button" value="閲覧" data-id="${home.id}" data-name="${home.name}">
                <input class="home-delete" type="button" value="消去" data-id="${home.id}" data-name="${home.name}">
            </td>
        `;
        homeTable.appendChild(row);
    });
    
    // ボタンにイベントリスナーを追加
    attachHomeButtonListeners();
}

/**
 * ホームのボタンにイベントリスナーを設定
 */
function attachHomeButtonListeners() {
    // 閲覧ボタン
    document.querySelectorAll('.home-view').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const homeName = e.target.dataset.name;
            alert(`${homeName}ホームの詳細表示機能は今後実装予定です`);
        });
    });
    
    // 削除ボタン
    document.querySelectorAll('.home-delete').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.preventDefault();
            const homeId = e.target.dataset.id;
            const homeName = e.target.dataset.name;
            
            if (confirm(`${homeName}ホームを削除しますか？\nこの操作は取り消せません。`)) {
                await deleteHome(homeId);
            }
        });
    });
}

/**
 * 備考テンプレート一覧を読み込んで表示
 */
async function loadBikouTemplates() {
    console.log('📝 備考テンプレート一覧読み込み中...');
    
    try {
        const token = localStorage.getItem('shift_auth_token');
        if (!token) {
            console.error('❌ 認証トークンがありません');
            return;
        }
        
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
        row.innerHTML = `
            <th title="${template.text}">${truncateText(template.text, 15)}</th>
            <td class="td">
                <input class="bikou-delete" type="button" value="消去" data-id="${template.id}" data-text="${template.text}">
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
    // ホーム追加ボタン
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
            await loadHomes(); // 再読み込み
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
            await loadHomes(); // 再読み込み
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
            await loadBikouTemplates(); // 再読み込み
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
            await loadBikouTemplates(); // 再読み込み
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
 * テキストを指定文字数で切り詰め
 */
function truncateText(text, maxLength) {
    if (text.length <= maxLength) {
        return text;
    }
    return text.substring(0, maxLength) + '...';
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
