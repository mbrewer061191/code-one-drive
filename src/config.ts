import { PublicClientApplication, Configuration } from "@azure/msal-browser";
import { AppConfig } from './types';
import { fetchWithTimeout } from './utils';

const GOOGLE_SCOPES = [
  'https://www.googleapis.com/auth/drive',
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/documents',
];

const MICROSOFT_SCOPES = [
  'User.Read',
  'Files.ReadWrite.All',
  'Sites.ReadWrite.All',
];

const LOCAL_CONFIG_KEY = 'code-enforcement-local-config-v2';
const CONFIG_FILE_NAME = 'code-enforcement-app-config.json';

let googleAccessToken: string | null = null;
let googleExpiresAt = 0;

let microsoftAccessToken: string | null = null;
let microsoftExpiresAt = 0;

let configCache: AppConfig | null = null;
let configPromise: Promise<AppConfig | null> | null = null;

let msalInstance: PublicClientApplication | null = null;

// --- Provider Detection ---
export function getActiveProvider(): 'google' | 'microsoft' | null {
  const localConfigStr = localStorage.getItem(LOCAL_CONFIG_KEY);
  if (!localConfigStr) return null;
  const config: AppConfig = JSON.parse(localConfigStr);
  if (config.microsoft?.clientId) return 'microsoft';
  if (config.google?.clientId) return 'google';
  return null;
}

// --- Microsoft Auth ---
async function getMsalInstance(): Promise<PublicClientApplication | null> {
  const localConfigStr = localStorage.getItem(LOCAL_CONFIG_KEY);
  if (!localConfigStr) return null;
  const localConfig: AppConfig = JSON.parse(localConfigStr);
  const clientId = localConfig.microsoft?.clientId;
  const tenantId = localConfig.microsoft?.tenantId;

  if (!clientId) return null;

  if (msalInstance && msalInstance.getConfiguration().auth.clientId === clientId) {
    return msalInstance;
  }

  const msalConfig: Configuration = {
    auth: {
      clientId,
      authority: tenantId ? `https://login.microsoftonline.com/${tenantId}` : "https://login.microsoftonline.com/common",
      redirectUri: window.location.origin,
    },
    cache: {
      cacheLocation: "localStorage",
      storeAuthStateInCookie: false,
    }
  };

  msalInstance = new PublicClientApplication(msalConfig);
  await msalInstance.initialize();
  return msalInstance;
}

export async function getMicrosoftAccessToken(): Promise<string> {
  const msal = await getMsalInstance();
  if (!msal) throw { message: 'Microsoft Client ID is not configured.', code: 'missing_client_id' };

  const accounts = msal.getAllAccounts();
  if (accounts.length === 0) {
    const result = await msal.loginPopup({ scopes: MICROSOFT_SCOPES });
    return result.accessToken;
  }

  try {
    const result = await msal.acquireTokenSilent({
      scopes: MICROSOFT_SCOPES,
      account: accounts[0]
    });
    return result.accessToken;
  } catch (e) {
    const result = await msal.acquireTokenPopup({ scopes: MICROSOFT_SCOPES });
    return result.accessToken;
  }
}

// --- Google Auth ---
async function loadGsiScript(): Promise<void> {
  if ((window as any).google?.accounts?.oauth2) return;
  return new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Google Identity script.'));
    document.head.appendChild(script);
  });
}

export async function getGoogleAccessToken(): Promise<string> {
  await loadGsiScript();
  const now = Date.now();
  if (googleAccessToken && now < googleExpiresAt) return googleAccessToken;

  const localConfigStr = localStorage.getItem(LOCAL_CONFIG_KEY);
  const clientId = localConfigStr ? JSON.parse(localConfigStr).google?.clientId : null;
  if (!clientId) throw { message: 'Google Client ID is not configured.', code: 'missing_client_id' };

  return new Promise<string>((resolve, reject) => {
    const tokenClient = (window as any).google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: GOOGLE_SCOPES.join(' '),
      callback: (resp: any) => {
        if (resp && resp.access_token) {
          googleAccessToken = resp.access_token;
          googleExpiresAt = Date.now() + (resp.expires_in - 300) * 1000;
          resolve(googleAccessToken as string);
        } else {
          reject({ message: resp?.error || 'Failed to get Google access token.', code: resp?.error });
        }
      }
    });
    tokenClient.requestAccessToken({ prompt: googleAccessToken ? '' : 'consent' });
  });
}

// --- Unified getAccessToken ---
export async function getAccessToken(): Promise<string> {
  const provider = getActiveProvider();
  if (provider === 'microsoft') return getMicrosoftAccessToken();
  return getGoogleAccessToken();
}

// --- Config Management ---
export function clearAccessToken() {
  if ((window as any).google?.accounts?.oauth2 && googleAccessToken) {
    (window as any).google.accounts.oauth2.revoke(googleAccessToken, () => { });
  }
  googleAccessToken = null;
  googleExpiresAt = 0;
  microsoftAccessToken = null;
  microsoftExpiresAt = 0;
  configCache = null;
  configPromise = null;
}

async function findMicrosoftConfigFile(token: string): Promise<string | null> {
  console.log("config.ts: Searching for config file in OneDrive...");
  const url = `https://graph.microsoft.com/v1.0/me/drive/root/search(q='${CONFIG_FILE_NAME}')`;
  const response = await fetchWithTimeout(url, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (!response.ok) return null;
  const data = await response.json();
  return data.value?.[0]?.id || null;
}

async function findGoogleConfigFile(token: string): Promise<string | null> {
  const query = `name='${CONFIG_FILE_NAME}' and trashed=false`;
  const response = await fetchWithTimeout(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id)`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (!response.ok) return null;
  const data = await response.json();
  return data.files?.[0]?.id || null;
}

export function getConfig(forceRefresh: boolean = false): Promise<AppConfig | null> {
  if (!forceRefresh && configCache) return Promise.resolve(configCache);
  if (!forceRefresh && configPromise) return configPromise;

  configPromise = (async (): Promise<AppConfig | null> => {
    let localConfigStr = localStorage.getItem(LOCAL_CONFIG_KEY);
    // Migration from v1
    if (!localConfigStr) {
      const v1 = localStorage.getItem('code-enforcement-local-config-v1');
      if (v1) {
        localStorage.setItem(LOCAL_CONFIG_KEY, v1);
        localConfigStr = v1;
      }
    }

    const localConfig: AppConfig = localConfigStr ? JSON.parse(localConfigStr) : {};
    const provider = getActiveProvider();

    try {
      const token = await getAccessToken();
      let response: Response;
      let configFileId: string | null = null;

      if (provider === 'microsoft') {
        configFileId = await findMicrosoftConfigFile(token);
        if (!configFileId) return localConfig;
        response = await fetchWithTimeout(`https://graph.microsoft.com/v1.0/me/drive/items/${configFileId}/content`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
      } else {
        configFileId = await findGoogleConfigFile(token);
        if (!configFileId) return localConfig;
        response = await fetchWithTimeout(`https://www.googleapis.com/drive/v3/files/${configFileId}?alt=media`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
      }

      if (!response.ok) return localConfig;

      const syncedConfig = await response.json();
      configCache = {
        ...syncedConfig,
        google: { ...syncedConfig.google, ...localConfig.google },
        microsoft: { ...syncedConfig.microsoft, ...localConfig.microsoft }
      };
      return configCache;
    } catch (error) {
      configCache = localConfig;
      return configCache;
    }
  })();

  return configPromise;
}

export async function saveConfig(config: AppConfig): Promise<void> {
  const provider = getActiveProvider();
  localStorage.setItem(LOCAL_CONFIG_KEY, JSON.stringify(config));

  try {
    const token = await getAccessToken();
    if (provider === 'microsoft') {
      const configFileId = await findMicrosoftConfigFile(token);
      const url = configFileId
        ? `https://graph.microsoft.com/v1.0/me/drive/items/${configFileId}/content`
        : `https://graph.microsoft.com/v1.0/me/drive/root:/${CONFIG_FILE_NAME}:/content`;

      const response = await fetchWithTimeout(url, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
      if (!response.ok) throw new Error("Failed to save config to OneDrive");
    } else {
      const configFileId = await findGoogleConfigFile(token);
      const metadata = { name: CONFIG_FILE_NAME, mimeType: 'application/json' };
      const body = new FormData();
      body.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
      body.append('file', new Blob([JSON.stringify(config)], { type: 'application/json' }));

      let url = 'https://www.googleapis.com/upload/drive/v3/files';
      let method = 'POST';
      if (configFileId) {
        url += `/${configFileId}?uploadType=multipart`;
        method = 'PATCH';
      } else {
        url += `?uploadType=multipart`;
      }
      const response = await fetchWithTimeout(url, { method, headers: { 'Authorization': `Bearer ${token}` }, body });
      if (!response.ok) throw new Error("Failed to save config to Google Drive");
    }
    configCache = config;
  } catch (error) {
    console.error("Failed to save synced config.", error);
    throw error;
  }
}

export async function clearConfig(): Promise<void> {
  localStorage.removeItem(LOCAL_CONFIG_KEY);
  clearAccessToken();
}