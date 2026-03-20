import React, { useState, useEffect } from 'react';
import { AppConfig } from '../types';
import { getConfig, saveConfig, getActiveProvider } from '../config';

const TemplateManager: React.FC = () => {
    const [config, setConfig] = useState<AppConfig | null>(null);
    const [activeProvider, setActiveProvider] = useState<'google' | 'microsoft' | null>(null);
    const [urls, setUrls] = useState<Record<string, string>>({});
    const [status, setStatus] = useState('');

    useEffect(() => {
        getConfig().then(cfg => {
            if (cfg) {
                setConfig(cfg);
                const provider = getActiveProvider();
                setActiveProvider(provider);

                if (provider === 'microsoft') {
                    setUrls({
                        INITIAL: cfg.microsoft?.templateUrls?.INITIAL || '',
                        FAILURE: cfg.microsoft?.templateUrls?.FAILURE || '',
                        DILAPIDATED: cfg.microsoft?.templateUrls?.DILAPIDATED || '',
                        BOARDING: cfg.microsoft?.templateUrls?.BOARDING || '',
                        COURT_COVER: cfg.microsoft?.templateUrls?.COURT_COVER || '',
                        COURT_COMPLAINT: cfg.microsoft?.templateUrls?.COURT_COMPLAINT || '',
                        envelope: cfg.microsoft?.envelopeTemplateUrl || '',
                        certMail: cfg.microsoft?.certificateOfMailTemplateUrl || '',
                    });
                } else {
                    setUrls({
                        INITIAL: cfg.google?.templateUrls?.INITIAL || '',
                        FAILURE: cfg.google?.templateUrls?.FAILURE || '',
                        DILAPIDATED: cfg.google?.templateUrls?.DILAPIDATED || '',
                        BOARDING: cfg.google?.templateUrls?.BOARDING || '',
                        COURT_COVER: cfg.google?.templateUrls?.COURT_COVER || '',
                        COURT_COMPLAINT: cfg.google?.templateUrls?.COURT_COMPLAINT || '',
                        envelope: cfg.google?.envelopeTemplateUrl || '',
                        certMail: cfg.google?.certificateOfMailTemplateUrl || '',
                    });
                }
            }
        });
    }, []);

    const handleSave = async () => {
        if (!config) return;
        const newConfig: AppConfig = { ...config };

        if (activeProvider === 'microsoft') {
            newConfig.microsoft = {
                ...config.microsoft!,
                templateUrls: {
                    INITIAL: urls.INITIAL || '',
                    FAILURE: urls.FAILURE || '',
                    DILAPIDATED: urls.DILAPIDATED || '',
                    BOARDING: urls.BOARDING || '',
                    COURT_COVER: urls.COURT_COVER || '',
                    COURT_COMPLAINT: urls.COURT_COMPLAINT || ''
                },
                envelopeTemplateUrl: urls.envelope || '',
                certificateOfMailTemplateUrl: urls.certMail || ''
            };
        } else {
            newConfig.google = {
                ...config.google!,
                templateUrls: {
                    INITIAL: urls.INITIAL || '',
                    FAILURE: urls.FAILURE || '',
                    DILAPIDATED: urls.DILAPIDATED || '',
                    BOARDING: urls.BOARDING || '',
                    COURT_COVER: urls.COURT_COVER || '',
                    COURT_COMPLAINT: urls.COURT_COMPLAINT || ''
                },
                envelopeTemplateUrl: urls.envelope || '',
                certificateOfMailTemplateUrl: urls.certMail || ''
            };
        }

        await saveConfig(newConfig);
        setStatus('Saved successfully!');
    };

    return (
        <div className="tab-content">
            <div className="card">
                <h2>Manage {activeProvider === 'microsoft' ? 'Microsoft Word' : 'Google Doc'} Templates</h2>
                <p className="helper-text">
                    Enter the {activeProvider === 'microsoft' ? 'Item ID or Share Link' : 'Google Doc URL'} for each template.
                </p>

                <div style={{ marginTop: '1rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                    <div className="form-group" style={{ flex: '1 1 300px' }}>
                        <label>Initial Notice</label>
                        <input value={urls.INITIAL || ''} onChange={e => setUrls({ ...urls, INITIAL: e.target.value })} />
                    </div>
                    <div className="form-group" style={{ flex: '1 1 300px' }}>
                        <label>Abatement (Failure) Notice</label>
                        <input value={urls.FAILURE || ''} onChange={e => setUrls({ ...urls, FAILURE: e.target.value })} />
                    </div>
                    <div className="form-group" style={{ flex: '1 1 300px' }}>
                        <label>Dilapidated House Notice</label>
                        <input value={urls.DILAPIDATED || ''} onChange={e => setUrls({ ...urls, DILAPIDATED: e.target.value })} />
                    </div>
                    <div className="form-group" style={{ flex: '1 1 300px' }}>
                        <label>Board & Secure Notice</label>
                        <input value={urls.BOARDING || ''} onChange={e => setUrls({ ...urls, BOARDING: e.target.value })} />
                    </div>
                </div>

                <div className="info-box" style={{ margin: '2rem 0', fontSize: '0.9rem' }}>
                    <h4 style={{ marginBottom: '0.5rem' }}>Available Template Placeholders</h4>
                    <p>Use these tags in your templates. Use <code>{"{{TAG}}"}</code> format.</p>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginTop: '1rem' }}>
                        <code>{"CASE_ID"}</code> <code>{"DATE"}</code>
                        <code>{"OWNER_NAME"}</code> <code>{"OWNER_ADDRESS"}</code>
                        <code>{"PROPERTY_ADDRESS"}</code> <code>{"VIOLATION_TYPE"}</code>
                        <code>{"ORDINANCE"}</code> <code>{"DESCRIPTION"}</code>
                        <code>{"CORRECTIVE_ACTION"}</code> <code>{"NOTICE_CLAUSE"}</code>
                        <code>{"DEADLINE"}</code> <code>{"OFFICER_NAME"}</code>
                    </div>
                </div>

                <div className="form-group">
                    <label>Envelope Template</label>
                    <input value={urls.envelope || ''} onChange={e => setUrls({ ...urls, envelope: e.target.value })} />
                </div>
                <div className="form-group">
                    <label>Certificate of Mail Template</label>
                    <input value={urls.certMail || ''} onChange={e => setUrls({ ...urls, certMail: e.target.value })} />
                </div>

                <button className="button primary-action" onClick={handleSave}>Save All Templates</button>
                {status && <div className="success-message" style={{ marginTop: '1rem' }}>{status}</div>}
            </div>
        </div>
    );
};

export default TemplateManager;
