import React, { useState, useEffect } from 'react';
import { AppConfig } from '../types';
import { getConfig, saveConfig, clearConfig, getAccessToken, clearAccessToken, getActiveProvider, getMicrosoftAccessToken } from '../config';
import { dataService } from '../dataService';
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

    if (isLoadingConfig) return <div className="card"><div className="loader" /></div>;

    return (
        <div className="card">
            <h2>Admin Setup</h2>

            <div className="form-group">
                <h3>Microsoft Integration (OneDrive/Word)</h3>
                <label>Microsoft Client ID</label>
                <input type="text" value={msClientId} onChange={e => setMsClientId(e.target.value)} placeholder="Application (client) ID" />
                <label>Directory (tenant) ID</label>
                <input type="text" value={msTenantId} onChange={e => setMsTenantId(e.target.value)} placeholder="common or specific tenant ID" />
                <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                    <button onClick={handleSaveMicrosoft} className="button">Save Microsoft Settings</button>
                </div>

                {config?.microsoft?.clientId && !config.microsoft.configFileId && (
                    <button onClick={handleCreateOneDriveFile} className="button secondary-action" style={{ marginTop: '0.5rem' }}>
                        Initialize OneDrive Data File
                    </button>
                )}
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