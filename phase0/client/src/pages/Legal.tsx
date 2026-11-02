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
            <li><strong>Game records:</strong> your Spark and rune history, who invited you, and whether you asked for update emails.</li>
            <li><strong>Usage:</strong> events such as a page opened, a spell forged or a share button pressed, with the site that sent you here. These are stored by us; we use no third-party analytics or advertising tool.</li>
            <li><strong>Device and network:</strong> your IP address and a browser signature, computed from details such as your browser, screen size and time zone. We use them to enforce rate limits and to stop one person claiming the free Spark many times. We keep the signature in hashed form and, for the free Spark check, only the first part of your IP address.</li>
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
        </Section>

        <Section title="What is public">
          <p>
            A spell you forge has a page that anyone with its link can open, showing the spell and your mage name. Your spell appears in the Codex only if you choose to put it there. Reviews are public. Your email address is never shown.
          </p>
          <p>
            <strong>Do not put personal information in a spell description.</strong> It is sent to the AI providers below and can shape a public card.
          </p>
        </Section>

        <Section title="Who we share it with">
          <p>We do not sell your data. These services process it for us:</p>
          <ul>
            <li><strong>Google (Gemini) and Groq:</strong> your spell name and description, to write the spell. On the free tiers we use, a provider may keep this text and use it under its own terms, which can include improving its products.</li>
            <li><strong>OpenAI:</strong> what you write, and the text the AI writes, to check it for harmful content.</li>
            <li><strong>Brevo:</strong> your email address, to send sign-in and opted-in emails.</li>
            <li><strong>Vercel and Render:</strong> host the site and the server, and process your IP address when you connect.</li>
            <li><strong>TiDB Cloud:</strong> our database.</li>
            <li><strong>Cloudinary:</strong> stores spell images.</li>
            <li><strong>Google Fonts:</strong> supplies the site's fonts, so Google sees your IP address when they load.</li>
          </ul>
          <p>
            Pressing a share button sends you to that service (such as WhatsApp or X), and its own policy then applies. Our servers and these providers are mainly in the United States, so your data is handled outside your country.
          </p>
        </Section>

        <Section title="Cookies and browser storage">
          <p>We set no advertising cookies.</p>
          <ul>
            <li><code>arc_session</code>: keeps you signed in.</li>
            <li><code>arc_did</code>: an anonymous device id, kept for two years, for the once-per-device free Spark, for rate limits and to count visits.</li>
            <li><code>arc_ref</code>: remembers who invited you, for 30 days.</li>
            <li>Browser storage: your unsent spell draft and whether the sidebar is folded. These stay on your device.</li>
          </ul>
        </Section>

        <Section title="How long we keep it">
          <p>
            We keep your account and spells for as long as your account exists. When you ask us to delete your account we remove your personal data, unless we must keep a record to prevent abuse of the free Spark or to meet a legal duty. Copies in backups last until those backups are replaced. Rate limit records expire on their own.
          </p>
        </Section>

        <Section title="Your rights">
          <p>
            You can ask for a copy of your data, ask us to correct it, or ask us to delete your account by writing to <Contact />. Depending on where you live, you may also be able to object to or restrict how we use it, and to complain to your data protection authority. We will answer within 30 days. You can change your mage name, password and email preferences yourself in your profile.
          </p>
        </Section>

        <Section title="Children">
          <p>
            Arcanis is not for children under {LEGAL.minimumAge}. If you are under 18, you need a parent or guardian's permission to use it. If you believe a child has given us data without that permission, write to <Contact /> and we will delete it.
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
            You must be at least {LEGAL.minimumAge}. If you are under 18, you need a parent or guardian's permission. One person, one account. You are responsible for what happens under your account, so keep your password and sign-in codes private.
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
            You keep whatever rights you have in the words you write. You give us a worldwide, free licence to store, process, adapt and display them, and the spells made from them, in order to run and promote Arcanis, including sending them to the AI providers named in the privacy policy. Promoting means we may feature a spell you have made public, with your mage name. This licence lasts until the content is removed, except for copies already shared or in backups.
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
            Arcanis is provided "as is", without warranties of any kind, as far as the law allows. As far as the law allows, we are not liable for indirect or consequential loss, or for loss of game items or data, and our total liability to you is limited to 100 Indian rupees. Nothing here removes rights that the law says cannot be removed, including your rights as a consumer where you live.
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
