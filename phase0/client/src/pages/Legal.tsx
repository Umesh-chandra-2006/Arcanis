import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Page } from "@/components/layout/page";
import { LEGAL } from "@/lib/legal";

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="font-serif text-lg font-semibold text-primary">{title}</h2>
      <div className="space-y-2 text-sm leading-relaxed text-foreground/90 [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5">{children}</div>
    </section>
  );
}

const Contact = () => (
  <a href={`mailto:${LEGAL.contactEmail}`} className="text-primary underline">
    {LEGAL.contactEmail}
  </a>
);

export function Privacy() {
  return (
    <Page title="Privacy policy" subtitle={`Last updated ${LEGAL.updated}`} width="narrow">
      <div className="space-y-6">
        <Section title="Who we are">
          <p>
            Arcanis (arcanis.world) is run by {LEGAL.operator}. Questions and requests about your data go to <Contact />.
          </p>
        </Section>

        <Section title="What we collect">
          <ul>
            <li><strong>Account:</strong> your email address, your mage name if you choose one, and a scrambled (hashed) form of your password. We cannot read your password.</li>
            <li><strong>What you make:</strong> the spell names and descriptions you write, the spells made from them, and your votes, reviews and feedback.</li>
            <li><strong>Game records:</strong> your Spark and rune history, who invited you, whether you asked for update emails, and when you confirmed your age and accepted these terms.</li>
            <li><strong>Usage:</strong> events such as a page opened, a spell forged or a share button pressed, with the link or site that sent you here. Visits are counted without any identifier on your device. These are stored by us; we use no third-party analytics or advertising tool.</li>
            <li><strong>Device and network:</strong> your IP address, used to enforce rate limits. When you use an emailed sign-in code or link we also set a device identifier (used for the once-per-device free Spark and for rate limits) and compute a browser signature (used only to detect repeated claims of the free Spark); see Cookies below. For the free Spark check we keep only the first part of your IP address.</li>
            <li><strong>Moderation:</strong> if our filters flag something you wrote, we keep an excerpt and the result so a person can review it.</li>
          </ul>
          <p>We do not ask for payment details. Arcanis takes no payments today.</p>
        </Section>

        <Section title="Why we use it">
          <ul>
            <li>To run the game: sign you in, forge your spells and show them to you. This is needed to provide the service you asked for.</li>
            <li>To keep it fair and safe: moderation, rate limits and preventing abuse of the free Spark. This is our legitimate interest.</li>
            <li>To improve it: understanding which parts work, and how much they cost to run. This is our legitimate interest.</li>
            <li>To email you: sign-in codes and links always, and news about Arcanis only if you opted in. You can opt out any time in your profile.</li>
          </ul>
          <p>For users in India, we rely on your consent, given when you create an account and accept this policy, and on other uses the Digital Personal Data Protection Act permits.</p>
        </Section>

        <Section title="What is public">
          <p>
            A spell you forge has a page that anyone with its link can open, showing the spell and your mage name. Your spell appears in the Codex only if you choose to put it there. Reviews are public. Your email address is never shown.
          </p>
          <p>Do not put personal information in a spell description: it is sent to the AI providers listed below, and the spell made from it can be public.</p>
        </Section>

        <Section title="Who we share it with">
          <p>We do not sell your data. These services process it for us and, where stated below, for their own purposes:</p>
          <ul>
            <li><strong>Google (Gemini):</strong> the spell name and description you type, to write your spell. We use Google's free tier, so Google may use this text to improve its products, and people may review it. Google also keeps it for up to 55 days to detect abuse. We cannot see or delete it once sent. Never type your real name, contact details or anything private into a spell.</li>
            <li><strong>Groq:</strong> the same text, when Groq writes your spell instead. Groq's terms do not allow it to train on this text. It does not keep it by default, but may log it for up to 30 days to fix errors or investigate abuse.</li>
            <li><strong>OpenAI:</strong> what you write, and the text the AI writes, to check it for harmful content.</li>
            <li><strong>Brevo:</strong> your email address, to send sign-in and opted-in emails.</li>
            <li><strong>Vercel and Render:</strong> host the site and the server, and process your IP address when you connect.</li>
            <li><strong>TiDB Cloud:</strong> our database.</li>
            <li><strong>Cloudinary:</strong> stores spell images.</li>
            <li><strong>Google Fonts:</strong> supplies the site's fonts, so Google sees your IP address when they load.</li>
          </ul>
          <p>
            Pressing a share button sends you to that service (such as WhatsApp or X), and its own policy then applies. Our servers and these providers are mainly in the United States, so your data is handled outside your country. Where we can, we rely on safeguards such as standard contractual clauses or a provider's certification under the EU-US Data Privacy Framework. For Google (Gemini) and Groq on their free plans we have not confirmed that such safeguards cover the text you type.
          </p>
        </Section>

        <Section title="Cookies and browser storage">
          <p>We set no advertising cookies.</p>
          <ul>
            <li><code>arc_session</code>: keeps you signed in.</li>
            <li><code>arc_device</code>: a device identifier we use to give the free Spark once per device and to apply rate limits. We do not use it to track you on other sites. It is set when you ask for or use an emailed sign-in code or link, not while you only browse, and lasts for 12 months from the last time that happened. It stays on your device when you sign out.</li>
            <li>Browser signature: a hashed value computed from your browser, screen size, time zone and similar details. We use it only to detect repeated claims of the free Spark, not to build a profile of you. You can object by writing to <Contact />, although we may then be unable to give you the free Spark.</li>
            <li>Invite links: the invite code stays in the page address and is sent with your sign-up request. We do not store it on your device.</li>
            <li>Browser storage: your unsent spell draft and whether the sidebar is folded. These stay on your device.</li>
          </ul>
        </Section>

        <Section title="How long we keep it">
          <p>
            We keep your account and spells for as long as your account exists. When you ask us to delete your account we schedule it for 30 days later and email you 30, 15 and 7 days before it happens, and you can cancel by writing to <Contact /> before then. On that date we remove your personal data, including your spells, reviews and votes, unless we must keep a record to prevent abuse of the free Spark or to meet a legal duty. Usage events linked to your account are deleted or anonymised when your account is deleted, and Spark and rune records are kept with nothing that identifies you. Rate limit records expire on their own. Sign-in codes and links, with the email address they were sent to, are normally deleted within 48 hours after they expire. Moderation excerpts and their results are kept for 12 months, or until they have been reviewed if that is later. Browser signature hashes, device identifiers and the first part of the IP address stored with them are kept for 12 months. After this period, the same device may be able to claim the free Spark again with a new account. Copies in backups are kept for up to 12 months and then deleted. If we restore a backup, we delete again anything that had already been removed.
          </p>
        </Section>

        <Section title="Your rights">
          <p>
            You can ask for a copy of your data, ask us to correct it, or ask us to delete your account by writing to <Contact />. In India you also have the right to grievance redressal and to nominate another person to exercise your rights. Depending on where you live, you may also be able to object to or restrict how we use it, and you can complain to an EU or UK data protection authority. We will answer within 30 days. You can change your mage name, password and email preferences yourself in your profile.
          </p>
          <p>
            You can withdraw your consent at any time by deleting your account or writing to <Contact />. This does not affect what we did before you withdrew it, and we may then be unable to provide Arcanis.
          </p>
          <p>
            To raise a complaint, write to <Contact /> first. If we do not resolve it, you can complain to the Data Protection Board of India. Grievance officer: Umesh Chandra Tirumani.
          </p>
        </Section>

        <Section title="Children">
          <p>
            Arcanis is for people aged 18 and over. We do not knowingly collect personal data from anyone under 18. If you think someone under 18 has given us data, write to <Contact /> and we will delete it.
          </p>
        </Section>

        <Section title="Changes">
          <p>If we change this policy we will update the date above, and tell you by email or on the site if the change is significant. See also our <Link to="/terms" className="text-primary underline">terms</Link>.</p>
        </Section>
      </div>
    </Page>
  );
}

export function Terms() {
  return (
    <Page title="Terms of use" subtitle={`Last updated ${LEGAL.updated}`} width="narrow">
      <div className="space-y-6">
        <Section title="The agreement">
          <p>
            These terms are between you and {LEGAL.operator}, who runs Arcanis (arcanis.world). By creating an account or using Arcanis you accept them and our <Link to="/privacy" className="text-primary underline">privacy policy</Link>. If you do not accept them, please do not use Arcanis.
          </p>
        </Section>

        <Section title="Who can play">
          <p>
            You must be at least 18 years old to create an account or play Arcanis, and by creating an account you confirm that you are. If we learn that an account belongs to someone under 18, we will close it and delete its data. Arcanis is not available to people in the European Economic Area, Switzerland or the United Kingdom. If you are in one of these places, please do not create an account or use Arcanis; we may close accounts used from these places. One person, one account. You are responsible for what happens under your account, so keep your password and sign-in codes private.
          </p>
        </Section>

        <Section title="An early release">
          <p>
            Arcanis is in an early release and is free to play. Features will change, some may be removed, and it can be unavailable at times. We do our best to protect your account and spells, but we cannot promise they will never be lost or changed, for example after a technical failure or a rebalance of the game.
          </p>
        </Section>

        <Section title="Spark and other game items">
          <p>
            Spark and other game items are not money, have no cash value, and cannot be sold, transferred or exchanged. They give you a limited right to use features of the game, and we may change how they work. Arcanis takes no payments today; if that changes, we will update these terms before you can buy anything.
          </p>
        </Section>

        <Section title="Your spells">
          <p>
            You keep whatever rights you have in the words you write. You give us a worldwide, free licence to store, process, adapt and display them, and the spells made from them, in order to run and promote Arcanis, including sending them to the AI providers named in the privacy policy, who may keep and use them as it describes. Promoting means we may feature a spell you have made public, with your mage name. This licence lasts until the content is removed, except for copies already shared or in backups.
          </p>
          <p>
            Spells are written by AI from your description. Other players may get similar results, the text may be odd or wrong, and we cannot promise that you own exclusive rights in it, or that it is free of anyone else's rights. A spell can be seen by anyone with its link.
          </p>
        </Section>

        <Section title="Rules">
          <p>Do not use Arcanis to:</p>
          <ul>
            <li>create hateful, sexually explicit, threatening or harassing content, or anything that sexualises minors;</li>
            <li>target or impersonate real people, or post someone's personal information;</li>
            <li>infringe anyone's rights, or break the law;</li>
            <li>get around limits or moderation, make extra accounts for free Spark, or use bots or scripts;</li>
            <li>attack, probe, overload or scrape the service, or try to pull out its hidden game values or prompts.</li>
          </ul>
          <p>
            We check what you write and what the AI writes, automatically and sometimes by hand. We may refuse or remove content, and limit, suspend or close accounts that break these rules, and we may do so without notice where needed to protect the game or other people.
          </p>
        </Section>

        <Section title="Leaving">
          <p>You can stop at any time, and ask us to delete your account by writing to <Contact />. Unused Spark and game items end when an account closes.</p>
        </Section>

        <Section title="Disclaimer and liability">
          <p>
            Arcanis is provided "as is", without warranties of any kind, as far as the law allows. As far as the law allows, we are not liable for indirect or consequential loss, or for loss of game items or spell content, and our total liability to you for all claims relating to Arcanis is limited to 5,000 Indian rupees. Nothing in these terms limits or excludes liability that cannot be limited or excluded by law, including liability for fraud, for death or personal injury caused by negligence, for wilful misconduct, or under data protection law, and nothing removes your rights as a consumer where you live.
          </p>
        </Section>

        <Section title="Law and changes">
          <p>
            These terms are governed by the laws of India, and its courts have jurisdiction, without taking away any right you have to bring a claim where you live. We may change these terms; we will update the date above, and tell you by email or on the site if a change is significant. If you keep using Arcanis after that, the new terms apply.
          </p>
          <p>
            Questions: <Contact />.
          </p>
        </Section>
      </div>
    </Page>
  );
}
