import { Alert, Card, Icon } from '../../design';

const RESOURCES = [
  {
    name: '988 Suicide & Crisis Lifeline',
    detail: 'Call or text 988 — free, confidential, 24/7.',
    href: 'tel:988',
    icon: 'alert' as const,
  },
  {
    name: 'Crisis Text Line',
    detail: 'Text HOME to 741741 to reach a live crisis counselor.',
    href: 'sms:741741',
    icon: 'heart' as const,
  },
  {
    name: 'Emergency services',
    detail: 'Call 911 (US) or 112 (EU) if you or someone else is in immediate danger.',
    href: 'tel:911',
    icon: 'check' as const,
  },
  {
    name: 'International Association for Suicide Prevention',
    detail: 'Find helplines in your country at iasp.info.',
    href: 'https://www.iasp.info/resources/Crisis_Centres/',
    icon: 'external' as const,
  },
];

/**
 * About & resources — where steady says what it is, where to find real
 * help, and what this app will never be. Honest, warm, and specific.
 */
export function AboutScreen() {
  return (
    <div className="flex flex-col gap-8">
      <header>
        <h1 className="text-3xl font-extrabold text-ink sm:text-4xl">
          About steady
        </h1>
        <p className="mt-3 max-w-prose text-lg leading-relaxed text-ink-soft">
          steady is a toolbox you can hold onto — small, warm tools for the
          days when the usual ones feel too heavy. Energy, mood, and the story
          of your own life, kept on this device unless you choose to sign in.
        </p>
      </header>

      <Card padding="lg" className="border-warning-line bg-warning-soft">
        <h2 className="flex items-center gap-2 text-lg font-extrabold text-warning-ink">
          <Icon name="heart" size={18} />
          If you're in crisis right now
        </h2>
        <p className="mt-2 max-w-prose text-base leading-relaxed text-warning-ink">
          You matter, and you don't have to carry this alone. Please reach out
          to one of these — a real person is listening.
        </p>
        <ul className="mt-4 flex flex-col gap-3">
          {RESOURCES.map((resource) => (
            <li key={resource.name}>
              <a
                href={resource.href}
                className="pressable flex items-center gap-3 rounded-xl bg-surface px-4 py-3 shadow-soft hover:shadow-lift"
              >
                <span
                  aria-hidden="true"
                  className="flex size-10 shrink-0 items-center justify-center rounded-full bg-warning-soft text-warning-ink"
                >
                  <Icon name={resource.icon} size={18} />
                </span>
                <span className="min-w-0">
                  <span className="block font-bold text-ink">
                    {resource.name}
                  </span>
                  <span className="block text-sm text-ink-soft">
                    {resource.detail}
                  </span>
                </span>
              </a>
            </li>
          ))}
        </ul>
      </Card>

      <Card padding="lg">
        <h2 className="flex items-center gap-2 text-lg font-extrabold text-ink">
          <Icon name="info" size={18} />
          What steady is — and isn't
        </h2>
        <div className="mt-3 flex flex-col gap-3 text-base leading-relaxed text-ink">
          <p>
            steady is a personal tool, not a clinician. It doesn't diagnose,
            treat, or replace professional care — it's here to hold the small
            things so you can see them clearly.
          </p>
          <p>
            Everything you put in steady stays on this device until you sign
            in. Your energy, your timeline, your words — they're yours.
          </p>
        </div>
        <Alert variant="info" className="mt-5">
          If you're struggling, please reach out to a trusted person or a
          professional. steady will always point you back to the people who can
          help.
        </Alert>
      </Card>
    </div>
  );
}
