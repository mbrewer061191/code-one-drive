






export interface EvidencePhoto {
  id: string; // Google Drive or OneDrive file ID
  url: string; // Thumbnail URL
  webViewLink: string; // Link to view full-size
  caption?: string;
}

export interface FollowUp {
  date: string;
  notes: string;
  photos?: EvidencePhoto[];
}

export type AbatementStatus = 'NEEDS_ABATEMENT' | 'STATEMENT_FILED' | 'LIEN_FILED' | 'LIEN_CERTIFIED' | 'LIEN_RELEASED';

export interface AbatementDetails {
  status?: AbatementStatus;
  workDate?: string;
  costDetails?: {
    type: 'mowing';
    hours: number;
    employees: number;
    rate: number;
    adminFee: number;
    total: number;
  };
  statementOfCostDate?: string;
  statementOfCostDocUrl?: string;
  photos?: {
    before?: EvidencePhoto[];
    after?: EvidencePhoto[];
  };
  propertyInfo?: {
    legalDescription: string;
    taxId?: string;
    parcelNumber?: string;
  };
  noticeOfLienDate?: string; // Used for the 30-day timer
  noticeOfLienDocUrl?: string;
  certificateOfLienDocUrl?: string;
}


export interface Case {
  id: string; 
  caseId: string;
  status: 'ACTIVE' | 'DUE' | 'CLOSED' | 'FAILURE-NOTICED' | 'PENDING_ABATEMENT' | 'CONTINUAL_ABATEMENT';
  dateCreated: string;
  complianceDeadline: string;
  address: { street: string; city: string; province: string; postalCode: string; };
  ownerInfo: { name?: string; mailingAddress?: string; phone?: string; };
  ownerInfoStatus: 'KNOWN' | 'UNKNOWN';
  violation: { type: string; ordinance: string; description:string; correctiveAction: string; noticeClause: string; };
  evidence: { notes: { date: string; text: string; }[]; photos?: EvidencePhoto[] };
  notices: { title: string; docUrl: string; date: string; }[];
  isVacant: boolean;
  followUps?: FollowUp[];
  abatement?: AbatementDetails;
}

export interface Property {
  id: string;
  streetAddress: string;
  ownerInfo: { name?: string; mailingAddress?: string; phone?: string; };
  residentInfo: { name?: string; phone?: string; };
  isVacant: boolean;
  dilapidationNotes: string;
}

export interface PhotoWithMeta {
    file: File;
    dataUrl: string;
}

export interface AppConfig {
    google?: { 
        clientId?: string; 
        fileId?: string; 
        templateUrls?: {
            INITIAL?: string;
            FAILURE?: string;
            DILAPIDATED?: string;
            BOARDING?: string;
            COURT_COVER?: string;
            COURT_COMPLAINT?: string;
        };
        envelopeTemplateUrl?: string;
        certificateOfMailTemplateUrl?: string;
        statementOfCostTemplateUrl?: string;
        noticeOfLienTemplateUrl?: string;
        certificateOfLienTemplateUrl?: string;
    };
    microsoft?: {
        clientId?: string;
        tenantId?: string;
        driveId?: string;
        rootFolderId?: string;
        configFileId?: string;
        templateUrls?: {
            INITIAL?: string;
            FAILURE?: string;
            DILAPIDATED?: string;
            BOARDING?: string;
            COURT_COVER?: string;
            COURT_COMPLAINT?: string;
        };
        envelopeTemplateUrl?: string;
        certificateOfMailTemplateUrl?: string;
        statementOfCostTemplateUrl?: string;
        noticeOfLienTemplateUrl?: string;
        certificateOfLienTemplateUrl?: string;
    };
}

export interface ComplaintLogEntry {
  id: string;
  timestamp: string;
  callerName: string;
  callerPhone: string;
  location: string;
  type: 'CODE' | 'DOG';
  details: {
    // For CODE
    violationType?: string;
    ordinance?: string;
    description?: string;
    correctiveAction?: string;
    // For DOG
    dogDescription?: string;
    dogBehavior?: string;
    dogOwnerInfo?: string;
  };
  notes?: string;
  // New fields for Animal Control Dashboard
  status?: 'NEW' | 'IN_PROGRESS' | 'RESOLVED';
  followUpNotes?: { date: string; text: string; }[];
}

export interface MailingItem {
  caseId: string;
  recipient: 'owner' | 'occupant';
}

export type NoticePurpose = 'INITIAL' | 'FAILURE' | 'DILAPIDATED' | 'BOARDING' | 'COURT_COVER' | 'COURT_COMPLAINT';

export type View = 'LIST' | 'DETAILS' | 'NEW' | 'ADMIN' | 'TEMPLATES' | 'LOG' | 'PROPERTIES' | 'REPORTS' | 'TASKS' | 'PATROL' | 'ANIMAL_CONTROL' | 'MAIL' | 'CITATION';