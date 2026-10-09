import { ENV } from "../_core/env";
import type { CallContext, EmailMessage, EmailProvider } from "../../shared/providers";
import { AllProvidersFailedError, ProviderError, providerFetch } from "./errors";
import { EMAIL_COST_USD } from "./pricing";
import { withTelemetry } from "./telemetry";

function parseFrom(from: string): { name: string; email: string } {
  const email = from.match(/<([^>]+)>/)?.[1] ?? from.trim();
  const name = from.match(/^([^<]+)</)?.[1]?.trim() || "Arcanis";
  return { name, email };
}

export class BrevoEmailProvider implements EmailProvider {
  readonly name = "brevo";
  constructor(private readonly apiKey: string, private readonly from: string) {}

  async send(message: EmailMessage): Promise<void> {
    const sender = parseFrom(this.from);
    if (!sender.email.includes("@")) throw new ProviderError("config", this.name, "BREVO_FROM must be an email address or 'Name <email>'");
    await providerFetch(
      this.name,
      "https://api.brevo.com/v3/smtp/email",
      {
        method: "POST",
        headers: { accept: "application/json", "api-key": this.apiKey, "Content-Type": "application/json" },
        body: JSON.stringify({
          sender,
          to: [{ email: message.to }],
          subject: message.subject,
          htmlContent: message.html,
          textContent: message.text,
        }),
      },
      15_000
    );
  }
}

export class ResendEmailProvider implements EmailProvider {
  readonly name = "resend";
  constructor(private readonly apiKey: string, private readonly from: string) {}

  async send(message: EmailMessage): Promise<void> {
    await providerFetch(
      this.name,
      "https://api.resend.com/emails",
      {
        method: "POST",
        headers: { Authorization: `Bearer ${this.apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: this.from,
          to: [message.to],
          subject: message.subject,
          html: message.html,
          text: message.text,
        }),
      },
      15_000
    );
  }
}

export function emailProviders(): EmailProvider[] {
  const providers: EmailProvider[] = [];
  for (const name of ENV.emailProviders.split(",").map((s) => s.trim())) {
    if (name === "brevo" && ENV.brevoApiKey && ENV.brevoFrom) providers.push(new BrevoEmailProvider(ENV.brevoApiKey, ENV.brevoFrom));
    if (name === "resend" && ENV.resendApiKey) providers.push(new ResendEmailProvider(ENV.resendApiKey, ENV.resendFrom));
  }
  return providers;
}

/** Sends through the first provider that accepts the message. */
export async function sendEmail(
  ctx: CallContext,
  message: EmailMessage,
  providers: EmailProvider[] = emailProviders()
): Promise<{ provider: string }> {
  const errors: ProviderError[] = [];
  for (const provider of providers) {
    try {
      await withTelemetry(
        { ctx: { ...ctx, surface: "email" }, provider: provider.name, model: "transactional" },
        () => provider.send(message),
        () => ({ units: { emails: 1 }, costUsd: EMAIL_COST_USD })
      );
      return { provider: provider.name };
    } catch (error) {
      errors.push(error as ProviderError);
    }
  }
  throw new AllProvidersFailedError(errors);
}
