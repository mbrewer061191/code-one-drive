import React, { useState, useEffect } from 'react';
import { AppConfig } from '../types';
import { getConfig, saveConfig, clearConfig, getAccessToken, clearAccessToken, getActiveProvider, getMicrosoftAccessToken } from '../config';
import { dataService } from '../dataService';
import { dataService as googleDataService } from '../googleSheetsService';
import { microsoftDataService } from '../microsoftGraphService';

const AdminView: React.FC<{ onSetupComplete: () => void }> = ({ onSetupComplete }) => {
    const [config, setConfig] = useState<AppConfig | null>(null);
    const [googleClientId, setGoogleClientId] = useState('');
    const [msClientId, setMsClientId] = useState('');
    const [msTenantId, setMsTenantId] = useState('');
    const [status, setStatus] = useState<{ ok: boolean; message: string } | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isLoadingConfig, setIsLoadingConfig] = useState(true);
    const [activeProvider, setActiveProvider] = useState<'google' | 'microsoft' | null>(null);

    useEffect(() => {
        const loadAdminConfig = async () => {
            setIsLoadingConfig(true);
            try {
                const cfg = await getConfig(true);
                setConfig(cfg);
                setGoogleClientId(cfg?.google?.clientId || '');
                setMsClientId(cfg?.microsoft?.clientId || '');
                setMsTenantId(cfg?.microsoft?.tenantId || '');
                setActiveProvider(getActiveProvider());
            } catch (e: any) {
                setStatus({ ok: false, message: `Failed to load configuration: ${e.message}` });
            } finally {
                setIsLoadingConfig(false);
            }
        };
        loadAdminConfig();
    }, []);

    const handleSaveGoogle = async () => {
        const newConfig: AppConfig = { ...config, google: { ...config?.google, clientId: googleClientId.trim() } };
        await saveConfig(newConfig);
        setConfig(newConfig);
        setStatus({ ok: true, message: 'Google settings saved.' });
    };

    const handleSaveMicrosoft = async () => {
        const newConfig: AppConfig = {
            ...config,
            microsoft: {
                ...config?.microsoft,
                clientId: msClientId.trim(),
                tenantId: msTenantId.trim()
            }
        };
        await saveConfig(newConfig);
        setConfig(newConfig);
        setStatus({ ok: true, message: 'Microsoft settings saved.' });
    };

    const handleCreateOneDriveFile = async () => {
        setIsLoading(true);
        try {
            const token = await getMicrosoftAccessToken();
            const response = await fetch('https://graph.microsoft.com/v1.0/me/drive/root:/commerce-app-data.json:/content', {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ cases: [], properties: [] })
            });
            if (!response.ok) throw new Error("Failed to create file");
            const file = await response.json();
            const newConfig = { ...config, microsoft: { ...config!.microsoft, configFileId: file.id } };
            await saveConfig(newConfig);
            setConfig(newConfig);
            setStatus({ ok: true, message: 'OneDrive data file created.' });
            onSetupComplete();
        } catch (e: any) {
            setStatus({ ok: false, message: e.message });
        } finally {
            setIsLoading(false);
        }
    };

    const handleClearConfig = async () => {
        if (window.confirm('Reset all app settings?')) {
            await clearConfig();
            onSetupComplete();
        }
    };

    const handleMigrateFromGoogle = async () => {
        if (!window.confirm("This will copy all data from Google Sheets to OneDrive. Existing OneDrive data will be overwritten. Continue?")) return;
        setIsLoading(true);
        try {
            const googleData = await googleDataService.getAllData();
            const token = await getMicrosoftAccessToken();
            const response = await fetch('https://graph.microsoft.com/v1.0/me/drive/root:/commerce-app-data.json:/content', {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify(googleData)
            });
            if (!response.ok) throw new Error("Failed to write to OneDrive");
            setStatus({ ok: true, message: 'Migration complete! Cases and properties copied to OneDrive.' });
        } catch (e: any) {
            setStatus({ ok: false, message: `Migration failed: ${e.message}` });
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoadingConfig) return <div className="card"><div className="loader" /></div>;

    return (
        <div className="card">
            <h2>Admin Setup</h2>

            <div className="form-group" style={{ marginBottom: '2rem', padding: '1rem', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <label style={{ fontWeight: 'bold', fontSize: '1.1rem', display: 'block', marginBottom: '1rem' }}>
                    Active Cloud Provider
                </label>
                <div style={{ display: 'flex', gap: '2rem' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                        <input
                            type="radio"
                            name="provider"
                            checked={activeProvider === 'microsoft'}
                            onChange={() => {
                                const newConfig = { ...config, activeProvider: 'microsoft' as const };
                                saveConfig(newConfig).then(() => {
                                    setConfig(newConfig);
                                    setActiveProvider('microsoft');
                                    setStatus({ ok: true, message: 'Switched to Microsoft OneDrive.' });
                                });
                            }}
                        />
                        <span style={{ fontWeight: activeProvider === 'microsoft' ? 'bold' : 'normal' }}>Microsoft OneDrive</span>
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                        <input
                            type="radio"
                            name="provider"
                            checked={activeProvider === 'google'}
                            onChange={() => {
                                const newConfig = { ...config, activeProvider: 'google' as const };
                                saveConfig(newConfig).then(() => {
                                    setConfig(newConfig);
                                    setActiveProvider('google');
                                    setStatus({ ok: true, message: 'Switched to Google Drive.' });
                                });
                            }}
                        />
                        <span style={{ fontWeight: activeProvider === 'google' ? 'bold' : 'normal' }}>Google Drive</span>
                    </label>
                </div>
            </div>

            <div className="form-group" style={{ opacity: activeProvider === 'microsoft' ? 1 : 0.5, pointerEvents: activeProvider === 'microsoft' ? 'auto' : 'none' }}>
                <h3>Microsoft Integration (OneDrive/Word)</h3>
                <label>Microsoft Client ID</label>
                <input type="text" value={msClientId} onChange={e => setMsClientId(e.target.value)} placeholder="Application (client) ID" />
                <label>Directory (tenant) ID</label>
                <input type="text" value={msTenantId} onChange={e => setMsTenantId(e.target.value)} placeholder="common or specific tenant ID" />
                <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                    <button onClick={handleSaveMicrosoft} className="button">Save Microsoft Settings</button>
                    {config?.microsoft?.clientId && (
                        <button onClick={handleMigrateFromGoogle} className="button secondary-action" disabled={isLoading}>
                            {isLoading ? 'Migrating...' : 'Migrate Data from Google'}
                        </button>
                    )}
                </div>

                {config?.microsoft?.clientId && !config.microsoft.configFileId && (
                    <button onClick={handleCreateOneDriveFile} className="button secondary-action" style={{ marginTop: '0.5rem' }}>
                        Initialize OneDrive Data File
                    </button>
                )}
            </div>

            <hr style={{ margin: '2rem 0' }} />

            <div className="form-group">
                <h3>Google Integration (Legacy)</h3>
                <label>Google Client ID</label>
                <input type="text" value={googleClientId} onChange={e => setGoogleClientId(e.target.value)} />
                <button onClick={handleSaveGoogle} className="button" style={{ marginTop: '0.5rem' }}>Save Google Settings</button>
            </div>

            {status && <div className={`status-message ${status.ok ? 'ok' : 'error'}`}>{status.message}</div>}

            <div style={{ marginTop: '2rem' }}>
                <button className="button danger-action" onClick={handleClearConfig}>Reset App Configuration</button>
                <button className="button secondary-action" onClick={() => dataService.testConnection().then(setStatus)} style={{ marginLeft: '1rem' }}>
                    Test Connection
                </button>
            </div>
        </div>
    );
};

export default AdminView;