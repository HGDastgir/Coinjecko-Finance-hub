"use client";

import { useActionState } from "react";
import {
  submitContactMessage,
  type ContactState,
} from "@/lib/content/contact-actions";

export interface ContactFormLabels {
  topic: string;
  topicGeneral: string;
  topicAdvertising: string;
  topicCorrection: string;
  topicDataRequest: string;
  name: string;
  email: string;
  message: string;
  send: string;
  sending: string;
  sent: string;
  error: string;
  throttled: string;
  unavailable: string;
}

export function ContactForm({ labels }: { labels: ContactFormLabels }) {
  const [state, action, pending] = useActionState<ContactState | null, FormData>(
    submitContactMessage,
    null,
  );

  const field =
    "min-h-11 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm";

  if (state?.status === "sent") {
    return (
      <p
        role="status"
        className="rounded-lg border border-up/40 bg-surface p-4 text-sm"
      >
        {labels.sent}
      </p>
    );
  }

  return (
    <form action={action} className="space-y-4">
      <div>
        <label htmlFor="contact-topic" className="mb-1 block text-sm font-medium">
          {labels.topic}
        </label>
        <select id="contact-topic" name="topic" className={field} defaultValue="general">
          <option value="general">{labels.topicGeneral}</option>
          <option value="advertising">{labels.topicAdvertising}</option>
          <option value="correction">{labels.topicCorrection}</option>
          <option value="data_request">{labels.topicDataRequest}</option>
        </select>
      </div>

      <div>
        <label htmlFor="contact-name" className="mb-1 block text-sm font-medium">
          {labels.name}
        </label>
        <input
          id="contact-name"
          name="name"
          type="text"
          autoComplete="name"
          required
          maxLength={120}
          className={field}
        />
      </div>

      <div>
        <label htmlFor="contact-email" className="mb-1 block text-sm font-medium">
          {labels.email}
        </label>
        <input
          id="contact-email"
          name="email"
          type="email"
          autoComplete="email"
          required
          maxLength={254}
          className={field}
        />
      </div>

      <div>
        <label
          htmlFor="contact-message"
          className="mb-1 block text-sm font-medium"
        >
          {labels.message}
        </label>
        <textarea
          id="contact-message"
          name="message"
          rows={6}
          required
          minLength={10}
          maxLength={5000}
          className={`${field} resize-y`}
        />
      </div>

      {/* Honeypot. Hidden from sight and from assistive tech, and
          never autofilled, so only a bot reaches it. */}
      <div className="hidden" aria-hidden="true">
        <label htmlFor="contact-company">Company</label>
        <input
          id="contact-company"
          name="company"
          type="text"
          tabIndex={-1}
          autoComplete="off"
        />
      </div>

      {state && state.status !== "idle" ? (
        <p role="alert" className="text-sm text-down">
          {state.status === "throttled"
            ? labels.throttled
            : state.status === "unavailable"
              ? labels.unavailable
              : (state.message ?? labels.error)}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="min-h-11 w-full rounded-md bg-brand px-4 font-medium text-brand-contrast hover:bg-brand-strong disabled:opacity-60 sm:w-auto"
      >
        {pending ? labels.sending : labels.send}
      </button>
    </form>
  );
}
