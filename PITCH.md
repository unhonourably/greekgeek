# GreekGeek

**The operating system for a fraternity or sorority chapter.** Dues, messages, events, recruitment, and everything officers juggle, in one place that the next officer can pick up where the last one left off.

---

## The problem

Ask any chapter treasurer how dues work and you'll hear some version of the same story. Members pay through Venmo, Zelle, cash at chapter, and the occasional check. The treasurer keeps a spreadsheet and tries to match payments to names. Somebody sends "pd" with no note. At the end of the semester, nobody is quite sure who still owes what.

Then the treasurer graduates, and the next one starts from scratch.

Money is only part of it. Announcements get lost in a group chat with 200 unread messages. Attendance at required events is a sign-in sheet that ends up in someone's car. Recruitment notes live in a shared Google Doc that half the chapter can edit. Every officer position turns over every year, and very little survives the handoff.

Chapters aren't short on tools. They're short on one place where the work actually stays.

## What GreekGeek does

GreekGeek gives each chapter a private, verified workspace. Members join by invitation, officers get the tools their role needs, and the records stay with the chapter instead of with whoever held the job last year.

### Dues that reconcile themselves

This is the core of the product and where most of the engineering went.

- **Treasurers bill in a few clicks.** Create a charge like "Spring dues", choose who it applies to, set a due date, and send it. Members are notified right away.
- **Members pay by card or bank transfer** through Stripe Checkout. They pay exactly what they owe, with no surprise surcharges, and treasurers can split a balance into installment plans.
- **The money goes straight to the chapter.** Each chapter connects its own Stripe account and is the merchant of record for its dues. GreekGeek never holds chapter money.
- **Cash and Venmo still count.** Treasurers can record offline payments, credits, and adjustments, so the balance is right no matter how someone paid.
- **Every dollar has a paper trail.** Payments, refunds, and credits are written to a double-entry ledger that can't be edited after the fact. Balances are calculated from that ledger, not typed in. Members get receipts, and treasurers can export everything to CSV for their national organization or school.

When the next treasurer takes over, the full history is already there.

### A chapter that actually communicates

- **Chat built for chapters.** Channels, direct messages, threads, replies, reactions, file and image sharing, and unread counts that update live. Officers can moderate, and members can report messages.
- **Announcements people can't miss.** Officers can pin posts, limit them to officers, and require members to acknowledge them. The chapter can see who has read them and who hasn't.
- **Notifications that respect people's time.** Members choose what they hear about in the app and by email.

### Events and attendance

- RSVPs with capacity limits and deadlines.
- **QR check-in** with codes that rotate every 30 seconds, so a photo of the code doesn't work for long.
- Required events can be limited to certain member classes. Attendance corrections are logged, so excused absences don't turn into arguments.

### Recruitment

- A pipeline board for potential new members, with notes, activities, and follow-up reminders.
- Notes can be restricted to the recruitment team.
- **Recruiter credit.** When a new member accepts their invitation, they're asked who recruited them. Only officers can see the answer, and it feeds a "top recruiters" view on the president's dashboard.

### Dashboards for officers and members

- **Officers** see the chapter at a glance: membership by class, growth month to month, required-attendance rates, how many members are active in chat, announcement acknowledgment, finances for the month, and the recruitment pipeline.
- **Members** see where they stand: their balance, attendance, service hours, badges, and a to-do list of what's waiting on them (announcements to acknowledge, tasks, chores, policies, trainings).

### Programs the chapter turns on when it needs them

Each of these can be switched on or off per chapter:

| Program | What it covers |
| --- | --- |
| Philanthropy | Service hours with officer approval, volunteer shifts, fundraising campaigns |
| Housing | Chore rotations, maintenance requests, room and space reservations, supplies, inventory |
| Standards | Versioned bylaws and policies with sign-off, required trainings, confidential incident reports |
| Academics | Study groups, mentorship pairs, private academic goals |

## Built to be trusted

Greek life involves real money, parents who ask questions, universities, and national organizations. Trust has to be part of the product, not something added later.

- **Every chapter is verified by a person** before it can collect money. Officers apply, can confirm through their school email, upload supporting documents, and a GreekGeek reviewer approves them. Reviewers can't approve their own applications.
- **Chapters are fully isolated from each other** at the database level, not just in the interface.
- **Private means private.** GreekGeek staff cannot read a chapter's chats, direct messages, recruitment notes, incident reports, or academic goals. That restriction is built into the database and covered by automated tests.
- **Card data never touches our servers.** Payments run through Stripe Checkout.
- **Payments are only marked paid when Stripe confirms them.** The system re-checks the amount, currency, and destination with Stripe before crediting anyone.
- **Everything important is audited.** Every role change, payment setting, refund, policy change, and verification decision is logged.

## Business model

Two simple charges, shown separately everywhere an officer sees billing:

| | Price | Paid by |
| --- | --- | --- |
| Chapter subscription | $30 per month | The chapter |
| Dues processing | 1.5% of each online dues payment | Deducted from the payment before it reaches the chapter, alongside Stripe's standard processing fee |

The subscription covers every tool for unlimited members, officers, and alumni. There's no per-seat pricing to argue about at chapter meeting.

**An example.** Take a chapter of 60 members paying $450 a semester, mostly online:

- Dues collected online: about $27,000 a semester
- Platform fee at 1.5%: about $405
- Subscription: $180 a semester
- **Revenue to GreekGeek: about $585 per chapter per semester**, or roughly $1,170 a year

For the chapter, $30 a month costs less than one late fee chased down by hand, and 1.5% is a small price to stop reconciling Venmo screenshots. The public pricing page includes a calculator so officers can see exactly what they'll net before they sign up.

Pricing is managed in the admin panel. A new rate can be published at any time, and payments that already exist keep the rate they were created under.

## Why this wins

- **It starts with the money.** Most chapter tools treat payments as a feature. GreekGeek treats the ledger as the foundation, which is what treasurers, advisors, and national organizations actually care about.
- **It survives officer turnover.** Roles, records, and history belong to the chapter, so a new exec board inherits a working system instead of a password.
- **One subscription replaces several tools.** Group chat, payment apps, spreadsheets, sign-up forms, and shared docs collapse into a single place members already need to open to pay dues.
- **Dues drive adoption.** Every member has a reason to log in at least once a semester, and once they're in, chat, events, and announcements keep them there.

## Where it stands

The product is built and running end to end:

- Chapter sign-up, verification, and invitations with recruiter credit
- Stripe Connect onboarding, subscriptions, dues checkout, refunds, receipts, and the double-entry ledger
- Treasurer tools: charges, installments, offline payments, reports, and exports
- Live chat, announcements, events with QR check-in, and recruitment
- Philanthropy, housing, standards, and academics
- Officer and member dashboards, branded emails, and a platform admin console for verification, revenue, and reconciliation

It's backed by 188 automated tests covering permissions, chapter isolation, the ledger, and payment processing against a simulated Stripe.

**Next steps before launch:** move Stripe to live mode, finish domain email setup on greekgeek.org, run a real payment and refund end to end, and have the terms and privacy policy reviewed by counsel.

## What we're looking for

- **Pilot chapters** willing to run a semester of dues and events on GreekGeek and tell us what's missing.
- **Introductions to councils, advisors, and national organizations** who want better visibility into chapter finances.
- **Partners and early backers** who understand campus life and want to help put it in front of chapters.

---

*GreekGeek · greekgeek.org*
