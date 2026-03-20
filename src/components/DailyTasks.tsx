

import React, { useState, useEffect, useMemo } from 'react';
import { Case } from '../types';
import { STREET_ORDER } from '../utils';
import * as dailyTaskService from '../dailyTaskService';
import { DailyProgress } from '../dailyTaskService';
import { generateCertificateOfMail } from '../dataService';

interface DailyTasksProps {
    cases: Case[];
    onSelectCase: (caseId: string) => void;
}

const CollapsibleCard: React.FC<{
    title: string;
    count?: number;
    children: React.ReactNode;
    defaultExpanded?: boolean;
    borderColorClass?: string;
}> = ({ title, count, children, defaultExpanded = false, borderColorClass = '' }) => {
    const [expanded, setExpanded] = useState(defaultExpanded);

    // Dynamic border style handling via inline for color logic, but structure via class
    const borderStyle = borderColorClass ? { borderLeft: `5px solid ${borderColorClass}` } : {};

    return (
        <div className="card" style={{ padding: 0, overflow: 'hidden', ...borderStyle }}>
            <div 
                className="dashboard-card-header"
                onClick={() => setExpanded(!expanded)} 
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <h2 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-main)' }}>{title}</h2>
                    {count !== undefined && (
                        <span className="dashboard-count-badge" style={{ backgroundColor: count > 0 ? borderColorClass : 'var(--bg-color)', color: count > 0 ? 'white' : 'var(--text-secondary)' }}>
                            {count}
                        </span>
                    )}
                </div>
                <span style={{ fontSize: '1.25rem', color: 'var(--text-light)', transition: 'transform 0.3s', transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>&#9662;</span>
            </div>
            {expanded && <div style={{ padding: '1.5rem', animation: 'fadeIn 0.3s' }}>{children}</div>}
        </div>
    );
};

const TaskItem: React.FC<{
    title: string;
    subtext?: string;
    onClick: () => void;
    statusClass?: string;
}> = ({ title, subtext, onClick, statusClass }) => (
    <div className={`case-item ${statusClass || ''}`} onClick={onClick} role="button" tabIndex={0}>
        <div className="case-info">
            <strong>{title}</strong>
            {subtext && <span>{subtext}</span>}
        </div>
        <div style={{ position: 'absolute', right: '1.25rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-light)' }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
        </div>
    </div>
);


const DailyTasks: React.FC<DailyTasksProps> = ({ cases, onSelectCase }) => {
    const [patrolIndex, setPatrolIndex] = useState(-1);
    const [todaysProgress, setTodaysProgress] = useState<DailyProgress>({ completedStreets: [], completedCaseTasks: {} });
    
    useEffect(() => {
        dailyTaskService.checkAndRotatePatrol();
        setPatrolIndex(dailyTaskService.getPatrolState().lastCompletedIndex);
        setTodaysProgress(dailyTaskService.getTodaysProgress());
    }, []);

    useEffect(() => {
        const refreshState = () => {
            const latestProgress = dailyTaskService.getTodaysProgress();
            setTodaysProgress(current => JSON.stringify(latestProgress) !== JSON.stringify(current) ? latestProgress : current);
            const latestState = dailyTaskService.getPatrolState();
            setPatrolIndex(latestState.lastCompletedIndex);
        };
        window.addEventListener('focus', refreshState);
        return () => window.removeEventListener('focus', refreshState);
    }, []);

    const handleAdvancePatrol = () => {
        dailyTaskService.advancePatrol(STREET_ORDER.length);
        const state = dailyTaskService.getPatrolState();
        state.lastRotationDate = new Date().toISOString().split('T')[0];
        dailyTaskService.savePatrolState(state);
        setPatrolIndex(state.lastCompletedIndex);
        setTodaysProgress(dailyTaskService.getTodaysProgress());
    };

    const handleStreetToggle = (street: string, checked: boolean) => {
        dailyTaskService.markStreetComplete(street, checked);
        setTodaysProgress(dailyTaskService.getTodaysProgress());
    };

    const handleEnvelopeToggle = (caseId: string, isComplete: boolean) => {
        dailyTaskService.setTaskComplete(caseId, 'envelope', isComplete);
        setTodaysProgress(dailyTaskService.getTodaysProgress());
    };

    const now = new Date();
    const sevenDaysAgo = new Date(new Date().setDate(now.getDate() - 7));

    const newCases = cases.filter(c => 
        new Date(c.dateCreated) >= sevenDaysAgo && c.status !== 'CLOSED'
    ).sort((a,b) => new Date(b.dateCreated).getTime() - new Date(a.dateCreated).getTime());
    
    const newCaseTasks = newCases.map(c => {
        const progress = todaysProgress.completedCaseTasks[c.id] || [];
        const noticeDone = c.notices.length > 0 || progress.includes('notice');
        const envelopeDone = progress.includes('envelope');
        return { ...c, noticeDone, envelopeDone, isComplete: noticeDone && envelopeDone };
    }).filter(c => !c.isComplete);

    const dueCases = cases.filter(c => {
        const deadline = new Date(c.complianceDeadline);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return deadline < today && c.status !== 'CLOSED' && c.status !== 'PENDING_ABATEMENT';
    });

    const abatementCases = cases.filter(c => c.status === 'PENDING_ABATEMENT');
    const currentPatrolIndex = patrolIndex === -1 ? 0 : patrolIndex;
    const streetsForPatrol = STREET_ORDER.slice(currentPatrolIndex, currentPatrolIndex + 3);

    return (
        <div className="tab-content">
            <style>{`
                .task-list { display: flex; flex-direction: column; gap: 0.75rem; }
                .subtask-list { margin-top: 0.75rem; display: flex; flex-direction: column; gap: 0.5rem; }
                .subtask-item { 
                    display: flex; align-items: center; gap: 0.75rem; 
                    font-size: 0.95rem; color: var(--text-secondary);
                    padding: 0.25rem 0;
                }
                .subtask-item input { 
                    width: 1.25rem; height: 1.25rem; accent-color: var(--primary-color);
                    cursor: pointer;
                }
                .patrol-row {
                    display: flex; align-items: center; gap: 1rem;
                    padding: 1rem; border-bottom: 1px solid var(--border-color);
                }
                .patrol-row:last-child { border-bottom: none; }
                .patrol-row input { width: 1.5rem; height: 1.5rem; accent-color: var(--primary-color); cursor: pointer; }
                .patrol-label { flex-grow: 1; font-weight: 500; font-size: 1.05rem; color: var(--text-main); cursor: pointer; }
                .completed-task { text-decoration: line-through; color: var(--text-light); }
                .task-title { font-weight: 600; color: var(--primary-color); cursor: pointer; font-size: 1.1rem; }
            `}</style>

            {/* PATROL */}
            <div className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h2>Daily Patrol</h2>
                    <button className="button secondary-action" onClick={handleAdvancePatrol} style={{ padding: '0.4rem 0.75rem', fontSize: '0.9rem' }}>Skip Zone &rarr;</button>
                </div>
                <div style={{ backgroundColor: 'var(--bg-color)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                    {streetsForPatrol.map(street => (
                        <div key={street} className="patrol-row">
                           <input 
                                type="checkbox"
                                id={`street-${street}`}
                                checked={todaysProgress.completedStreets.includes(street)}
                                onChange={e => handleStreetToggle(street, e.target.checked)}
                            />
                            <label htmlFor={`street-${street}`} className={`patrol-label ${todaysProgress.completedStreets.includes(street) ? 'completed-task' : ''}`}>
                                {street.toUpperCase()}
                            </label>
                        </div>
                    ))}
                </div>
            </div>

            {/* NEW CASES */}
            <CollapsibleCard title="New Cases" count={newCaseTasks.length} defaultExpanded={newCaseTasks.length > 0} borderColorClass="var(--primary-color)">
                <div className="task-list">
                    {newCaseTasks.length > 0 ? newCaseTasks.map(c => (
                        <div key={c.id} className="case-item new-case" style={{cursor: 'default'}}>
                            <div style={{flex: 1}}>
                                <div className="task-title" onClick={() => onSelectCase(c.id)}>{c.address.street}</div>
                                <div className="subtask-list">
                                    <label className={`subtask-item ${c.noticeDone ? 'completed-task' : ''}`}>
                                        <input type="checkbox" checked={c.noticeDone} readOnly />
                                        Initial Notice
                                    </label>
                                    <label className={`subtask-item ${c.envelopeDone ? 'completed-task' : ''}`}>
                                        <input
                                            type="checkbox"
                                            checked={c.envelopeDone}
                                            onChange={(e) => handleEnvelopeToggle(c.id, e.target.checked)}
                                        />
                                        Envelope
                                    </label>
                                </div>
                            </div>
                            <div onClick={() => onSelectCase(c.id)} style={{ cursor: 'pointer', padding: '0.5rem', color: 'var(--text-light)' }}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
                            </div>
                        </div>
                    )) : <p style={{color: 'var(--text-secondary)', fontStyle: 'italic', textAlign: 'center', padding: '1rem'}}>All new cases processed.</p>}
                </div>
            </CollapsibleCard>

            {/* DUE CASES */}
            <CollapsibleCard title="Due for Follow-up" count={dueCases.length} defaultExpanded={dueCases.length > 0} borderColorClass="var(--warning-color)">
                <div className="task-list">
                    {dueCases.length > 0 ? dueCases.map(c => (
                        <TaskItem 
                            key={c.id}
                            title={c.address.street}
                            subtext={`Deadline: ${c.complianceDeadline}`}
                            onClick={() => onSelectCase(c.id)}
                            statusClass="overdue"
                        />
                    )) : <p style={{color: 'var(--text-secondary)', fontStyle: 'italic', textAlign: 'center', padding: '1rem'}}>No cases currently due.</p>}
                </div>
            </CollapsibleCard>

            {/* ABATEMENT */}
            <CollapsibleCard title="Abatement" count={abatementCases.length} defaultExpanded={abatementCases.length > 0} borderColorClass="var(--abatement-color)">
                <div className="task-list">
                    {abatementCases.length > 0 ? abatementCases.map(c => (
                        <TaskItem 
                            key={c.id}
                            title={c.address.street}
                            subtext={c.abatement?.status?.replace('_', ' ') || 'Pending'}
                            onClick={() => onSelectCase(c.id)}
                            statusClass="abatement"
                        />
                    )) : <p style={{color: 'var(--text-secondary)', fontStyle: 'italic', textAlign: 'center', padding: '1rem'}}>No active abatements.</p>}
                </div>
            </CollapsibleCard>
        </div>
    );
};

export default DailyTasks;