export const MEMORY_KINDS = [
  'document',
  'event',
  'fact',
  'identity',
  'relationship',
  'belief',
  'emotion',
  'goal',
  'regret',
  'secret',
  'journal',
  'reflection',
  'health',
  'research',
  'life_period',
  'person',
  'place',
  'project',
  'decision',
  'achievement',
  'habit',
  'preference',
  'value',
] as const;

export const EPISTEMIC_STATUSES = [
  'user_stated',
  'observed',
  'imported',
  'researched',
  'inferred',
  'disputed',
  'retracted',
  'superseded',
] as const;

export const SENSITIVITIES = ['standard', 'private', 'intimate', 'restricted'] as const;
export const TEMPORAL_PRECISIONS = [
  'unknown',
  'year',
  'month',
  'day',
  'minute',
  'interval',
] as const;
export const CONVERSATION_MODES = ['conversation', 'interview', 'research'] as const;
export const CONVERSATION_STATUSES = ['active', 'completed'] as const;
export const REALTIME_SESSION_STATUSES = ['active', 'closed'] as const;
export const MESSAGE_ROLES = ['user', 'assistant', 'system'] as const;
export const MESSAGE_MODALITIES = ['text', 'voice', 'system'] as const;
export const CONNECTOR_PROVIDERS = ['github', 'linear', 'gmail'] as const;
export const CONNECTOR_STATUSES = ['pending', 'connected', 'syncing', 'error', 'revoked'] as const;
export const JOB_STATUSES = ['queued', 'running', 'completed', 'failed'] as const;
export const CONTRADICTION_STATUSES = [
  'pending',
  'confirmed',
  'not_a_contradiction',
  'resolved',
] as const;

export const DEFAULT_SEARCH_SENSITIVITIES = ['standard', 'private'] as const;
