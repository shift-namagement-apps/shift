/**
 * シフト管理アプリ - API設定
 * Cloud Run APIサーバーとの通信設定
 */

const API_CONFIG = {
  // 開発環境（ローカル）
  development: {
    apiBaseUrl: 'http://localhost:8080',
    basePath: '/'
  },
  
  // 本番環境（Cloud Run + GitHub Pages）
  production: {
    apiBaseUrl: 'https://shift-namagement-apps-27faqfacya-an.a.run.app',
    basePath: '/shift/'  // GitHub Pagesのリポジトリ名
  }
};

// 現在の環境を自動判定
const currentEnv = (window.location.hostname === 'localhost' || 
                    window.location.hostname === '127.0.0.1') 
                    ? 'development' 
                    : 'production';

// APIベースURL
const API_BASE_URL = API_CONFIG[currentEnv].apiBaseUrl;
const BASE_PATH = API_CONFIG[currentEnv].basePath;

console.log(`🌐 環境: ${currentEnv}`);
console.log(`🔗 API URL: ${API_BASE_URL}`);
console.log(`📂 Base Path: ${BASE_PATH}`);

/**
 * APIリクエストのヘルパー関数
 */
const API = {
  /**
   * GETリクエスト
   */
  async get(endpoint, params = {}) {
    try {
      const url = new URL(`${API_BASE_URL}${endpoint}`);
      Object.keys(params).forEach(key => {
        if (params[key] !== undefined && params[key] !== null) {
          url.searchParams.append(key, params[key]);
        }
      });

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('API GET エラー:', error);
      throw error;
    }
  },

  /**
   * POSTリクエスト
   */
  async post(endpoint, data = {}) {
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('API POST エラー:', error);
      throw error;
    }
  },

  /**
   * PUTリクエスト
   */
  async put(endpoint, data = {}) {
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('API PUT エラー:', error);
      throw error;
    }
  },

  /**
   * DELETEリクエスト
   */
  async delete(endpoint) {
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('API DELETE エラー:', error);
      throw error;
    }
  }
};

// グローバルスコープに公開
window.API_BASE_URL = API_BASE_URL;
window.BASE_PATH = BASE_PATH;
window.API = API;
