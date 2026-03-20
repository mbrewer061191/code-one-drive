



import React, { useState, useEffect, useMemo } from 'react';
import { Case, MailingItem } from '../types';
import * as dailyTaskService from '../dailyTaskService';
import { generateCertificateOfMail, generateEnvelopeDocument } from '../dataService';

const MailingView: React.FC<{ cases: Case[] }> = ({ cases }) => {
    const [mailQueue, setMailQueue] = useState<MailingItem[]>([]);
    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    useEffect(() => {
        setMailQueue(dailyTaskService.getCertMailQueue());
        
        const refreshQueue = () => setMailQueue(dailyTaskService.getCertMailQueue());
        window.addEventListener('focus', refreshQueue);
        return () => window.removeEventListener('focus', refreshQueue);
    }, []);

    const mailingsForDisplay = useMemo(() => {
        return mailQueue.map(item => {
            const caseData = cases.find(c => c.id === item.caseId);
            return caseData ? { ...item, caseData } : null;
        }).filter((item): item is (MailingItem & { caseData: Case }) => item !== null);
    }, [mailQueue, cases]);

    const groupedMailings = useMemo(() => {
        const groups: { [caseId: string]: { caseData: Case, items: MailingItem[] } } = {};
        mailingsForDisplay.forEach(mailing => {
            if (!groups[mailing.caseId]) {
                groups[mailing.caseId] = { caseData: mailing.caseData, items: [] };
            }
            groups[mailing.caseId].items.push(mailing);
        });
        return Object.values(groups);
    }, [mailingsForDisplay]);


    const handleGenerateCertificate = async () => {
        if (mailingsForDisplay.length === 0) return;
        setIsGenerating(true);
        setError('');
        setSuccess('');
        try {
            const casesForCert = mailingsForDisplay.map(m => m.caseData);
            const generatedDocs = await generateCertificateOfMail(casesForCert);
            generatedDocs.forEach(doc => window.open(doc.docUrl, '_blank'));
            setSuccess(`Successfully generated ${generatedDocs.length} certificate document(s). The queue has been cleared.`);
            dailyTaskService.clearCertMailQueue();
            setMailQueue([]);
        } catch (e: any) {
            setError(`Failed to generate certificate: ${e.message}`);
        } finally {
            setIsGenerating(false);
        }
    };
    
    const handlePrintEnvelope = async (caseData: Case, recipient: 'owner' | 'occupant') => {
        setIsGenerating(true);
        setError('');
        setSuccess('');
        try {
            // FIX: Correctly call generateEnvelopeDocument with both caseData and recipient.
            const { docUrl } = await generateEnvelopeDocument(caseData, recipient);
            window.open(docUrl, '_blank');
        } catch (e: any) {
            setError(`Failed to generate envelope: ${e.message}`);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleRemoveFromQueue = (caseId: string, recipient: 'owner' | 'occupant') => {
        dailyTaskService.removeFromCertMailQueue(caseId, recipient);
        setMailQueue(current => current.filter(item => !(item.caseId === caseId && item.recipient === recipient)));
    };

    return (
        <div className="tab-content">
            <div className="card">
                <h2>Mailing Queue ({mailingsForDisplay.length})</h2>
                <p className="helper-text">
                    Cases are automatically added here after a notice is generated. Print envelopes individually, then generate the Certificate of Mail for all items at once.
                </p>
                
                {mailingsForDisplay.length > 0 && (
                     <button className="button primary-action full-width" onClick={handleGenerateCertificate} disabled={isGenerating} style={{marginTop: '1rem'}}>
                        {isGenerating ? <span className="loader" /> : `Generate Certificate of Mail for All (${mailingsForDisplay.length})`}
                    </button>
                )}

                {success && <div className="success-message" style={{marginTop: '1rem'}}>{success}</div>}
                {error && <div className="error-message" style={{marginTop: '1rem'}}>{error}</div>}

                <div className="report-case-list" style={{marginTop: '1.5rem', gap: '1.5rem'}}>
                    {groupedMailings.length > 0 ? (
                        groupedMailings.map(({ caseData, items }) => (
                            <div key={caseData.id} className="card" style={{padding: '1rem'}}>
                                <h3 style={{marginTop: 0, marginBottom: '1rem'}}>{caseData.address.street} <span style={{color: 'var(--text-light)', fontWeight: 400}}>#{caseData.caseId}</span></h3>
                                {items.map(item => {
                                    const isOwner = item.recipient === 'owner';
                                    const title = isOwner ? `Owner: ${caseData.ownerInfo.name || 'N/A'}` : 'Occupant';
                                    const address = isOwner ? caseData.ownerInfo.mailingAddress : caseData.address.street;
                                    return (
                                        <div key={item.recipient} className="case-item" style={{display: 'flex', flexDirection: 'column', gap: '1rem', background: 'var(--bg-color)'}}>
                                            <div className="case-info" style={{width: '100%'}}>
                                                <strong>To: {title}</strong>
                                                <span>Address: {address || 'N/A'}</span>
                                            </div>
                                            <div className="button-group" style={{width: '100%', justifyContent: 'flex-end'}}>
                                                <button className="button secondary-action" onClick={() => handleRemoveFromQueue(caseData.id, item.recipient)}>Remove</button>
                                                <button className="button" onClick={() => handlePrintEnvelope(caseData, item.recipient)} disabled={isGenerating}>Print Envelope</button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ))
                    ) : (
                        <div className="empty-state">
                            <p style={{textAlign: 'center', color: 'var(--text-secondary)'}}>The mailing queue is empty.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default MailingView;