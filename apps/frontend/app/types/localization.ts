export interface TranslationKey {
    id: number
    key: string
    draftKey?: string
    reviewStatus?: 'APPROVED' | 'PENDING_REVIEW' | 'REJECTED'
    isPendingDelete?: boolean
    labels?: TranslationLabel[]
}

export interface TranslationKeyScopeNode {
    id: string
    name: string
    level: number
    hasChildren: boolean
    isExpanded: boolean
    keyCount: number
}

export interface Language {
    id: number
    code: string
    name: string
    flag: string
    isRef?: boolean
}

export interface TranslationLabel {
    id: number
    name: string
    color?: string
}

export interface TranslationText {
    id: number
    key: TranslationKey
    text: string
    isGenerated?: boolean
}

export interface KeyTemplateSegment {
  type: 'free-text' | 'enum' | 'nested-path' | 'constant' | 'shared-enum';
  name: string;
  options?: string[]; // for simple enum
  variableId?: number; // for shared-enum
  constantValue?: string;
  casing?: string;
  delimiter?: string;
  isOptional?: boolean;
}

export interface KeyVariable {
  id: number;
  projectId: number;
  name: string;
  options: string;
}

export interface KeyTemplate {
    id: number;
    projectId: number;
    name: string;
    segments: string; // JSON string
}

export interface KeyGlossaryTerm {
    id: number;
    projectId: number;
    badWord: string;
    goodWord: string;
}