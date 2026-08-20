export interface CrisisResource {
  name: string
  detail: string
  href: string
}

export interface CrisisRegion {
  id: string
  label: string
  resources: CrisisResource[]
}

export const DEFAULT_CRISIS_REGION_ID = 'us'

export const CRISIS_REGIONS: CrisisRegion[] = [
  {
    id: 'us',
    label: 'United States',
    resources: [
      {
        name: '988 Suicide & Crisis Lifeline',
        detail: 'Call or text 988 — free, confidential, 24/7.',
        href: 'tel:988',
      },
      {
        name: 'Crisis Text Line',
        detail: 'Text HOME to 741741 to reach a live crisis counselor.',
        href: 'sms:741741',
      },
      {
        name: 'Emergency services',
        detail: 'Call 911 (US) or 112 (EU) if you or someone else is in immediate danger.',
        href: 'tel:911',
      },
      {
        name: 'International Association for Suicide Prevention',
        detail: 'Find helplines in your country at iasp.info.',
        href: 'https://www.iasp.info/resources/Crisis_Centres/',
      },
    ],
  },
  {
    id: 'ca',
    label: 'Canada',
    resources: [
      {
        name: '988 Suicide & Crisis Lifeline',
        detail: 'Call or text 988 — free, confidential, 24/7.',
        href: 'tel:988',
      },
      {
        name: 'Talk Suicide Canada',
        detail: 'Call 1-833-456-4566 or text 45645.',
        href: 'tel:+18334564566',
      },
      {
        name: 'Emergency services',
        detail: 'Call 911 if you or someone else is in immediate danger.',
        href: 'tel:911',
      },
    ],
  },
  {
    id: 'uk',
    label: 'United Kingdom',
    resources: [
      {
        name: 'Samaritans',
        detail: 'Call 116 123 — free, confidential, 24/7.',
        href: 'tel:116123',
      },
      {
        name: 'Emergency services',
        detail: 'Call 999 if you or someone else is in immediate danger.',
        href: 'tel:999',
      },
    ],
  },
  {
    id: 'au',
    label: 'Australia',
    resources: [
      {
        name: 'Lifeline',
        detail: 'Call 13 11 14 — free, confidential, 24/7.',
        href: 'tel:131114',
      },
      {
        name: 'Emergency services',
        detail: 'Call 000 if you or someone else is in immediate danger.',
        href: 'tel:000',
      },
    ],
  },
  {
    id: 'il',
    label: 'Israel',
    resources: [
      {
        name: 'ERAN',
        detail: 'Call 1201 — free, confidential, 24/7.',
        href: 'tel:1201',
      },
      {
        name: 'Emergency services',
        detail: 'Call 100 if you or someone else is in immediate danger.',
        href: 'tel:100',
      },
    ],
  },
]
