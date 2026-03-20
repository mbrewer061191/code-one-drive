import React, { useMemo, useState } from 'react';
import { Case } from '../types';

const AbatementReport: React.FC<{ cases: Case[]; onBack: () => void; }> = ({ cases, onBack }) => {
    const [copyStatus, setCopyStatus] = useState('Copy Report');

    const reportText = useMemo(() => {
        if (cases.length === 0) {
            return "No cases are currently pending abatement.";
        }
        
        const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
        
        let report = `ABATEMENT ACTION REPORT\n`;
        report += `Generated on: ${today}\n`;
        report += `Total Properties: ${cases.length}\n`;
        report += `====================================\n\n`;

        cases.forEach(c => {
            const lastFollowUp = c.followUps?.[c.followUps.length - 1];
            const abatementNote = c.evidence.notes.find(n => n.text.includes('Forwarded for abatement'));

            report += `------------------------------------\n`;
            report += `CASE ID: ${c.caseId}\n`;
            report += `PROPERTY ADDRESS: ${c.address.street}\n`;
            report += `VIOLATION: ${c.violation.type}\n`;
            report += `FORWARDED ON: ${abatementNote?.date || lastFollowUp?.date || 'N/A'}\n\n`;

            report += `OWNER NAME: ${c.ownerInfo.name || 'Unknown'}\n`;
            report += `OWNER MAILING ADDRESS:\n${c.ownerInfo.mailingAddress || 'N/A'}\n\n`;
            
            if (lastFollowUp?.notes) {
                report += `LAST FOLLOW-UP NOTES:\n${lastFollowUp.notes}\n`;
            }
            report += `\n`;
        });
        
        return report;

    }, [cases]);

    const handleCopy = () => {
        navigator.clipboard.writeText(reportText).then(() => {
            setCopyStatus('Copied!');
            setTimeout(() => setCopyStatus('Copy Report'), 2000);
        }).catch(err => {
            console.error('Failed to copy text: ', err);
            setCopyStatus('Copy Failed');
        });
    };

    return (
        <div className="card">
            <div className="viewing-header no-print">
                <button onClick={onBack} className="button secondary-action">&larr; Back to List</button>
            </div>
            <h2>Abatement Report</h2>
            <p className="helper-text">This is a simple, formatted report for all cases pending abatement. Use the button to copy the full text for an email or document.</p>
            <div className="form-group" style={{marginTop: '1rem'}}>
                <textarea 
                    readOnly 
                    value={reportText}
                    style={{ minHeight: '300px', fontFamily: "'Courier New', Courier, monospace", fontSize: '0.9rem', whiteSpace: 'pre', backgroundColor: '#f8f9fa' }} 
                />
            </div>
            <button onClick={handleCopy} className="button primary-action full-width">{copyStatus}</button>
        </div>
    );
};

export default AbatementReport;
