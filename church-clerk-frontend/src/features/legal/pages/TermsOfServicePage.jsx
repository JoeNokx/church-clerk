import React from "react";
import { Link } from "react-router-dom";
import LandingHeader from "../../dashboard/components/landing/LandingHeader.jsx";
import LandingFooter from "../../dashboard/components/landing/LandingFooter.jsx";

const EFFECTIVE_DATE = "1 July 2025";
const CONTACT_EMAIL = "nokaeldev@gmail.com";

function Section({ number, title, children }) {
  return (
    <section className="scroll-mt-24">
      <h2 className="flex items-baseline gap-3 text-lg font-bold text-slate-900 md:text-xl">
        <span className="shrink-0 text-sm font-bold text-blue-700">{number}.</span>
        {title}
      </h2>
      <div className="mt-4 space-y-3 text-sm leading-relaxed text-slate-600">{children}</div>
    </section>
  );
}

function Sub({ title, children }) {
  return (
    <div className="mt-3">
      <p className="font-semibold text-slate-800">{title}</p>
      <div className="mt-1.5 space-y-2 text-slate-600">{children}</div>
    </div>
  );
}

function Ul({ items }) {
  return (
    <ul className="mt-1.5 space-y-1 pl-4">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-2">
          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-400" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>
      <LandingHeader />

      {/* Hero */}
      <div className="border-b border-slate-100 bg-slate-50 px-4 py-12 md:py-16">
        <div className="mx-auto max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-widest text-blue-700">Legal</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 md:text-4xl">Terms of Service</h1>
          <p className="mt-3 text-sm text-slate-500">
            Effective date: <span className="font-medium text-slate-700">{EFFECTIVE_DATE}</span>
            &nbsp;·&nbsp; Last updated: <span className="font-medium text-slate-700">{EFFECTIVE_DATE}</span>
          </p>
          <p className="mt-5 text-sm leading-relaxed text-slate-600">
            Please read these Terms of Service carefully before creating an account or using ChurchClerk. By
            registering an account or accessing the platform, you agree to be bound by these terms. If you do not
            agree, do not use ChurchClerk.
          </p>
          <p className="mt-3 text-sm leading-relaxed text-slate-600">
            These Terms form a binding agreement between you (the church administrator and organisation using
            ChurchClerk) and ChurchClerk (&quot;we&quot;, &quot;us&quot;, or &quot;our&quot;).
          </p>
        </div>
      </div>

      {/* Body */}
      <div className="mx-auto max-w-3xl px-4 py-12 md:py-16">
        <div className="space-y-10">

          <Section number="1" title="The Service">
            <p>
              ChurchClerk is a cloud-based church management platform that provides tools for managing members,
              branches, attendance, giving, communication, reports, and church administration.
            </p>
            <p>
              We reserve the right to update, modify, or discontinue any feature of the platform at any time.
              Where a change significantly affects the service, we will provide reasonable notice to active
              subscribers.
            </p>
          </Section>

          <Section number="2" title="Eligibility and Account Registration">
            <p>To use ChurchClerk, you must:</p>
            <Ul items={[
              "Be at least 18 years of age",
              "Represent a legitimate church, ministry, or religious organisation",
              "Provide accurate and complete registration information",
              "Keep your account credentials confidential and secure",
            ]} />
            <p>
              You are responsible for all activity that occurs under your account. Notify us immediately at{" "}
              <a href={`mailto:${CONTACT_EMAIL}`} className="font-medium text-blue-700 hover:underline">
                {CONTACT_EMAIL}
              </a>{" "}
              if you suspect unauthorised access.
            </p>
            <p>
              One account may represent one church organisation. The registered account holder (church admin) is
              solely responsible for all use of ChurchClerk under their account and subscription.
            </p>
          </Section>

          <Section number="3" title="Subscription Plans and Billing">
            <Sub title="Plans">
              <p>
                ChurchClerk offers a free tier and paid subscription plans. Paid plans provide access to additional
                features and higher member limits. Plan details, pricing, and feature inclusions are listed on the
                Pricing page and within the Billing section of your dashboard.
              </p>
            </Sub>

            <Sub title="Free trial">
              <p>
                New accounts may receive a free trial period as specified at registration. No payment is required
                during the trial. At the end of the trial, your account will transition to a free tier or prompt you
                to subscribe to continue using premium features.
              </p>
            </Sub>

            <Sub title="Payment">
              <p>
                Paid subscriptions are billed in advance for the selected billing cycle (monthly, quarterly, or
                annually). Payments are processed by Paystack in Ghanaian Cedis (GHS) or the equivalent in your
                supported currency. We do not store your card or mobile money details — all payment data is handled
                by Paystack under their security standards.
              </p>
            </Sub>

            <Sub title="Automatic renewal">
              <p>
                Your subscription automatically renews at the end of each billing cycle unless you cancel before the
                renewal date. You are responsible for cancelling your subscription if you do not wish to be charged.
                Renewal charges will be processed using your saved payment method.
              </p>
            </Sub>

            <Sub title="Price changes">
              <p>
                We may change subscription pricing with at least 30 days&apos; advance notice. Price changes take
                effect at the start of your next billing cycle. If you do not agree with a price change, you may
                cancel before the new price applies.
              </p>
            </Sub>
          </Section>

          <Section number="4" title="Cancellation and Refunds">
            <Sub title="Cancellation">
              <p>
                You may cancel your subscription at any time from the Billing section of your dashboard. Cancellation
                takes effect at the end of your current billing period. You retain access to paid features until the
                period ends.
              </p>
            </Sub>

            <Sub title="Refund policy">
              <p>
                All subscription fees are non-refundable except where required by applicable law. We do not issue
                pro-rated refunds for partial billing periods. If you cancel mid-cycle, your access continues until
                the end of the paid period with no refund for the unused portion.
              </p>
              <p>
                If you believe you were charged in error, contact us within 14 days of the charge at{" "}
                <a href={`mailto:${CONTACT_EMAIL}`} className="font-medium text-blue-700 hover:underline">
                  {CONTACT_EMAIL}
                </a>{" "}
                and we will investigate.
              </p>
            </Sub>

            <Sub title="Account suspension for non-payment">
              <p>
                If a payment fails and is not resolved within the grace period shown in your dashboard, your account
                will be placed in read-only mode. If payment is not received within a further 30 days, we may
                suspend or terminate the account and schedule data deletion.
              </p>
            </Sub>
          </Section>

          <Section number="5" title="Data Ownership and Responsibility">
            <Sub title="Your data belongs to you">
              <p>
                All member records, financial records, and church data you enter into ChurchClerk belong to your
                church. ChurchClerk does not claim any ownership over your data.
              </p>
            </Sub>

            <Sub title="ChurchClerk as data processor">
              <p>
                You are the data controller for your members&apos; personal information. ChurchClerk is the data
                processor — we store and process that data only as directed by you, in accordance with our{" "}
                <Link to="/privacy-policy" className="font-medium text-blue-700 hover:underline">
                  Privacy Policy
                </Link>
                .
              </p>
            </Sub>

            <Sub title="Your responsibility">
              <p>You agree that you:</p>
              <Ul items={[
                "Have a lawful basis for collecting and storing the personal information of your church members",
                "Have obtained any necessary consent from members whose data you enter into the platform",
                "Will not use ChurchClerk to collect information you are not authorised to collect",
                "Will inform your members that their information is managed through ChurchClerk",
              ]} />
            </Sub>

            <Sub title="Data export">
              <p>
                You may export your church data at any time from within the platform. We encourage you to maintain
                your own backups of critical records.
              </p>
            </Sub>
          </Section>

          <Section number="6" title="Acceptable Use">
            <p>You agree not to use ChurchClerk to:</p>
            <Ul items={[
              "Violate any applicable law, regulation, or court order",
              "Store, distribute, or transmit content that is defamatory, harassing, abusive, or illegal",
              "Collect or store sensitive personal data beyond what is reasonably necessary for church administration",
              "Impersonate any person or organisation",
              "Attempt to gain unauthorised access to any system, account, or data within the platform",
              "Reverse-engineer, decompile, or extract source code from ChurchClerk",
              "Use the platform to send unsolicited bulk communications (spam) to members or any third party",
              "Resell, sublicense, or provide the platform as a service to third parties without our written consent",
            ]} />
            <p>
              We reserve the right to suspend or terminate accounts that violate these terms without prior notice
              and without refund.
            </p>
          </Section>

          <Section number="7" title="SMS and Communication">
            <p>
              ChurchClerk allows church administrators to send SMS messages and emails to their members using the
              platform. You acknowledge that:
            </p>
            <Ul items={[
              "You are solely responsible for the content of messages sent through the platform",
              "You will only send messages to members who are part of your church and have a reasonable expectation of receiving such communications",
              "You will not use the communication tools for spam, unsolicited marketing, or any content that violates applicable law",
              "SMS delivery costs (where applicable) are included in or in addition to your subscription as shown on the Pricing page",
            ]} />
          </Section>

          <Section number="8" title="Service Availability">
            <p>
              We aim to maintain high availability of ChurchClerk but we do not guarantee uninterrupted access.
              Scheduled maintenance, infrastructure failures, or events outside our control may result in temporary
              downtime.
            </p>
            <p>
              We are not liable for any losses resulting from service interruptions, including loss of data due to
              system failure. We strongly recommend you regularly export copies of critical records.
            </p>
          </Section>

          <Section number="9" title="Intellectual Property">
            <p>
              ChurchClerk, its logo, design, software, and all content we create are the intellectual property of
              ChurchClerk. These Terms do not transfer any ownership or intellectual property rights to you.
            </p>
            <p>
              You retain ownership of all data and content you upload or create within the platform. By using
              ChurchClerk, you grant us a limited licence to store, process, and display your content solely for
              the purpose of providing the service to you.
            </p>
          </Section>

          <Section number="10" title="Limitation of Liability">
            <p>
              To the maximum extent permitted by applicable law, ChurchClerk and its operators shall not be liable
              for any indirect, incidental, special, consequential, or punitive damages, including but not limited
              to:
            </p>
            <Ul items={[
              "Loss of data or revenue",
              "Loss of business or church ministry opportunity",
              "Costs of substitute services",
              "Any damages arising from unauthorised access to your account",
            ]} />
            <p>
              Our total liability to you for any claim arising from your use of ChurchClerk shall not exceed the
              total subscription fees paid by you in the 3 months immediately preceding the event giving rise to
              the claim.
            </p>
            <p>
              Some jurisdictions do not allow the exclusion of certain warranties or the limitation of liability,
              so some of the above limitations may not apply to you.
            </p>
          </Section>

          <Section number="11" title="Indemnification">
            <p>
              You agree to indemnify and hold harmless ChurchClerk and its operators from any claims, damages,
              losses, or legal fees arising from:
            </p>
            <Ul items={[
              "Your use of the platform in violation of these Terms",
              "Your breach of any applicable data protection law",
              "Any third-party claim relating to data you have entered into ChurchClerk",
              "Content or communications you send through the platform",
            ]} />
          </Section>

          <Section number="12" title="Termination">
            <p>
              Either party may terminate this agreement at any time. You may close your account from within the
              platform settings or by contacting us. We may suspend or terminate your account if:
            </p>
            <Ul items={[
              "You violate these Terms or our Acceptable Use policy",
              "Your subscription payment is not received within the applicable grace period",
              "We are required to do so by law",
              "We discontinue the service (with reasonable advance notice)",
            ]} />
            <p>
              Upon termination, your data will be available for export for 30 days, after which it will be
              permanently deleted.
            </p>
          </Section>

          <Section number="13" title="Governing Law and Disputes">
            <p>
              These Terms are governed by and construed in accordance with the laws of the Republic of Ghana.
              Any dispute arising from these Terms or your use of ChurchClerk shall be subject to the exclusive
              jurisdiction of the courts of Ghana.
            </p>
            <p>
              Before initiating any formal legal action, both parties agree to first attempt to resolve the dispute
              informally by contacting us at{" "}
              <a href={`mailto:${CONTACT_EMAIL}`} className="font-medium text-blue-700 hover:underline">
                {CONTACT_EMAIL}
              </a>
              . We will make reasonable efforts to resolve the matter within 30 days.
            </p>
          </Section>

          <Section number="14" title="Changes to These Terms">
            <p>
              We may update these Terms of Service from time to time. When we make material changes, we will update
              the effective date and notify active account holders by email at least 14 days before the changes take
              effect. Continued use of ChurchClerk after the effective date constitutes acceptance of the revised
              terms.
            </p>
            <p>
              If you do not agree with the revised terms, you may cancel your subscription and close your account
              before they take effect.
            </p>
          </Section>

          <Section number="15" title="Contact Us">
            <p>
              For questions about these Terms of Service or anything related to your ChurchClerk account:
            </p>
            <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-5 py-4">
              <p className="font-semibold text-slate-800">ChurchClerk Support</p>
              <p className="mt-1 text-sm text-slate-600">
                Email:{" "}
                <a href={`mailto:${CONTACT_EMAIL}`} className="font-medium text-blue-700 hover:underline">
                  {CONTACT_EMAIL}
                </a>
              </p>
            </div>
          </Section>

        </div>

        {/* Bottom nav */}
        <div className="mt-14 flex flex-col gap-3 border-t border-slate-100 pt-8 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <span>© {new Date().getFullYear()} ChurchClerk. All rights reserved.</span>
          <div className="flex gap-4">
            <Link to="/privacy-policy" className="font-medium text-blue-700 hover:underline">Privacy Policy</Link>
            <Link to="/contact" className="hover:underline">Contact</Link>
          </div>
        </div>
      </div>

      <LandingFooter />
    </div>
  );
}

export default TermsOfServicePage;
