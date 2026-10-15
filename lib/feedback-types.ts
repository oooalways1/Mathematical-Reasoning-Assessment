export type SkillGuide = { id: string; label: string; focus: string; steps: string[]; check: string; easier: string; challenge: string; teacherProbe: string; version: number };
export type CoachingMessage = { caseId: string; title: string; message: string; nextStep: string; evidence: string[]; level: 'start' | 'practice' | 'review' | 'extend'; version: number };
export type FeedbackCase = { id: string; phase: 'diagnosis' | 'practice'; title: string; condition: string; level: CoachingMessage['level']; variants: [string, string] };
