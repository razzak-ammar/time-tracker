# Time Tracker Launch Strategy

**Prepared:** July 9, 2026  
**Target public release:** July 16–18, 2026  
**Operations and marketing finalized:** July 31, 2026

## Product thesis

Build a focused **personal commitments** app, not a generic time tracker:

> A calm, private way to understand where your week goes—without tracking every minute.

The differentiator is calendar-aware tracking: users can see calendar events, apply simple personal rules, and review suggestions before they become time entries. The point is to understand larger life commitments—work, a startup, family, health, study, or freelancing—not to account for every small task.

## Launch scope

Launch one universal Apple app for iPhone, iPad, and macOS.

### Ship in v1

- Manual start/stop timer and quick time entries
- A small set of commitments, such as Work, Startup, Health, and Family
- Week timeline and weekly breakdown
- Read-only Apple Calendar import using EventKit
- On-device matching rules, such as “meetings with John → Work” or “Dr. Nance → Startup”
- Review queue for imported events; never silently create time entries
- Account sync, account deletion, export, privacy policy, and support path

### Defer to v1.1+

- AI categorization
- Google and Outlook calendar connections
- Collaboration and invoicing
- Detailed reports
- Widgets and Shortcuts
- Browser app parity

Keep calendar rules on-device initially. That is faster, lower-cost, privacy-forward, and easy to explain: **your calendar stays yours**.

## Launch-readiness assessment

The current native project has a good visual start but is not yet production-ready: it uses local SwiftData and does not yet contain Firebase sync or EventKit calendar integration. These are release-critical; do not spend the coming week mainly polishing UI while core data and permissions remain unfinished.

## Timeline

| Date | Outcome |
| --- | --- |
| **Jul 9–10** | Lock v1 scope, name, positioning, pricing, and onboarding. Either complete Firebase sync or launch intentionally local-first; do not leave it half-integrated. |
| **Jul 10–12** | Implement EventKit import, rule classification, review queue, account deletion, export, analytics, purchase restoration, and a clear privacy flow. |
| **Jul 12** | Upload the first TestFlight build and invite 20–40 people who use iPhone, iPad, and Mac. Submit external testing immediately, since its first build can require review. |
| **Jul 13–14** | Fix launch blockers only: crashes, data loss or sync problems, bad calendar matching, confusing onboarding, and payment failures. Capture final screenshots and demo footage. |
| **Jul 15** | Submit the production build with complete metadata, privacy details, support URL, privacy policy, and App Review notes. |
| **Jul 16–18** | Target public release. Apple approval timing is not controllable, so release as soon as approval arrives rather than promise an exact date. |
| **Jul 19–31** | Provide daily support, fix small issues, publish launch content, collect feedback, and finalize the repeatable marketing system. |

## Pricing

### Free

- Unlimited manual tracking
- Unlimited commitments
- Weekly view
- 90 days of history
- Export

### Plus

- **$2.99/month** or **$24.99/year**
- Unlimited history
- Calendar suggestions and personal rules
- Cross-device sync
- Richer insights

Do not add a free trial at launch. The free plan itself is the trial: it is generous, understandable, and does not make people worry about losing access to their data.

Do not offer a lifetime plan in v1. It creates long-term support obligations before the product and cost base are understood.

## Firebase recommendation

Firebase is a sensible early-stage backend for authentication, sync, crash reporting, and basic usage analytics. Continue with it, but use the Blaze plan with budget alerts and careful query design.

Firestore’s current no-cost allowance includes 50,000 document reads/day, 20,000 writes/day, 1 GiB stored data, and 10 GiB/month outbound transfer. Usage above those limits requires billing. See [Firestore pricing](https://firebase.google.com/docs/firestore/pricing).

### Guardrails before launch

- Add billing alerts at $25 and $75 per month.
- Do not fetch a user’s entire history every time the app opens; use date-based, paginated queries.
- Avoid real-time listeners for all historic entries.
- Do not send calendar titles, attendees, or descriptions to an AI provider in v1.
- Implement complete account deletion, including Firestore data.

For payments, use StoreKit 2 directly at launch. A subscription platform such as RevenueCat can wait until the subscription model becomes more complex.

## App Store checklist

- Privacy policy hosted at a public URL
- Accurate App Privacy disclosure
- Clear pre-permission explanation for calendar access: what is read, why, and that it is not shared without consent
- In-app account deletion
- Data export
- Restore Purchases
- Support email and support URL
- Complete screenshots, subtitle, keywords, and description
- App Review notes explaining calendar access and a reliable reviewer path

Apple requires clear permission and disclosure around personal data and expects appropriate APIs when working with Calendar data. See the [App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/).

App Store Connect supports product-page preparation, subscriptions, TestFlight, and manual or automatic release controls. See [App Store Connect](https://developer.apple.com/app-store-connect/). TestFlight supports external tester groups, and the first build submitted for external testing may need review. See [TestFlight overview](https://developer.apple.com/help/app-store-connect/test-a-beta-version/testflight-overview).

## Go-to-market strategy

### Positioning

> A calm, private way to understand where your week goes—without tracking every minute.

### Primary launch audience

Solo knowledge workers with two or more major commitments:

- Full-time job plus startup
- Freelance work plus personal projects
- Work plus study
- Caregiving, health, or family commitments alongside work

### Core demo story

Create a 20–30 second product video:

1. Show a full calendar.
2. Tap **Import today**.
3. Show events suggested as Work, Startup, or Personal.
4. Show the weekly view revealing the real time split.
5. End with: **Make time visible.**

### First 30 days of distribution

- Create a simple landing page with a download/waitlist link, privacy promise, and demo GIF.
- Post a founder story on X, LinkedIn, Indie Hackers, and carefully selected productivity communities.
- Personally recruit 30–50 beta users who actually juggle commitments; optimize for fit, not reach.
- Ask for an App Store review only after users complete their first weekly reflection.
- Publish a weekly “where my week went” content series or template; it demonstrates the value better than feature announcements.

Do not buy ads yet. First get evidence of activation and week-two retention. Feedback from 30 right-fit people is more useful than hundreds of low-intent installs.

## Success measures

Track these from launch:

- **Activation:** user creates two commitments and logs/imports three entries in the first day
- **Calendar value:** percentage of eligible users who enable calendar suggestions and approve at least one suggestion
- **Weekly habit:** percentage of activated users who open the weekly view in week one
- **Retention:** Day 7 and Day 14 retention
- **Conversion:** free-to-Plus conversion after users encounter calendar rules or history limits
- **Quality:** crash-free sessions, support volume, and data-loss reports

## Final recommendation

Make **calendar suggestions, reviewed by the user** the hero feature. Keep the free plan generous. Launch quietly but genuinely next week, then use the rest of July to learn whether people return for the weekly reflection. That signal matters more than adding a broad set of features.
