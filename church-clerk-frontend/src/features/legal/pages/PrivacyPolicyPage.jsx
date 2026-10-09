import React from "react";
import { Link } from "react-router-dom";
import LandingHeader from "../../dashboard/components/landing/LandingHeader.jsx";
import LandingFooter from "../../dashboard/components/landing/LandingFooter.jsx";

const EFFECTIVE_DATE = "1 July 2025";
const CONTACT_EMAIL = "nokaeldev@gmail.com";
const COMPANY_NAME = "ChurchClerk";

function Section({ id, number, title, children }) {
  return (
    <section id={id} className="scroll-mt-24">
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

function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>
      <LandingHeader />

      {/* Hero */}
      <div className="border-b border-slate-100 bg-slate-50 px-4 py-12 md:py-16">
        <div className="mx-auto max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-widest text-blue-700">Legal</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 md:text-4xl">Privacy Policy</h1>
          <p className="mt-3 text-sm text-slate-500">
            Effective date: <span className="font-medium text-slate-700">{EFFECTIVE_DATE}</span>
            &nbsp;·&nbsp; Last updated: <span className="font-medium text-slate-700">{EFFECTIVE_DATE}</span>
          </p>
          <p className="mt-5 text-sm leading-relaxed text-slate-600">
            {COMPANY_NAME} (&quot;we&quot;, &quot;us&quot;, or &quot;our&quot;) is committed to protecting the personal
            information of the churches, administrators, and members who use our platform. This Privacy Policy explains
            what data we collect, how we use it, and the rights you have over it.
          </p>
          <p className="mt-3 text-sm leading-relaxed text-slate-600">
            By accessing or using ChurchClerk you agree to the practices described in this policy. If you do not agree,
            please stop using the service.
          </p>
        </div>
      </div>

      {/* Body */}
      <div className="mx-auto max-w-3xl px-4 py-12 md:py-16">
        <div className="space-y-10">

          <Section number="1" title="Who We Are">
            <p>
              ChurchClerk is a cloud-based church management platform that helps churches manage their members,
              branches, attendance, giving, communication, and administration. The platform is operated as a
              Software-as-a-Service (SaaS) product.
            </p>
            <p>
              For questions about this policy, contact us at:{" "}
              <a href={`mailto:${CONTACT_EMAIL}`} className="font-medium text-blue-700 hover:underline">
                {CONTACT_EMAIL}
              </a>
            </p>
          </Section>

          <Section number="2" title="Information We Collect">
            <Sub title="A. Account and registration information">
              <p>When a church administrator creates an account, we collect:</p>
              <Ul items={[
                "Full name and email address",
                "Phone number",
                "Password (stored as a hashed value — never in plain text)",
                "Church name, location, country, and type (e.g. Headquarters, Branch)",
              ]} />
            </Sub>

            <Sub title="B. Church member data (processed on behalf of the church)">
              <p>
                When an administrator adds members to the platform, we store the information they provide. This
                typically includes:
              </p>
              <Ul items={[
                "Full name, email address, and phone number",
                "Date of birth and gender",
                "Residential address",
                "Membership status and join date",
                "Department and ministry assignments",
                "Attendance and participation records",
                "Giving records (tithes, offerings, pledges)",
                "Profile photographs (where uploaded)",
              ]} />
              <p className="mt-2 font-medium text-slate-700">
                This data belongs to the church. We hold and process it solely on their instruction.
              </p>
            </Sub>

            <Sub title="C. Payment and billing information">
              <p>
                Subscription payments are processed by <strong>Paystack</strong>. We do not store your full card
                number, CVV, or mobile money PIN. We receive and store:
              </p>
              <Ul items={[
                "Subscription plan and billing status",
                "Payment method type (card or mobile money) and partial identifier (e.g. last four digits)",
                "Transaction reference numbers and payment history",
              ]} />
            </Sub>

            <Sub title="D. Usage and technical data">
              <Ul items={[
                "Login timestamps and session activity",
                "IP address and approximate location (country/city, derived from IP)",
                "Browser type and device information",
                "Pages and features accessed within the platform",
              ]} />
            </Sub>
          </Section>

          <Section number="3" title="How We Use Your Information">
            <p>We use the data we collect to:</p>
            <Ul items={[
              "Create and manage your account and church profile",
              "Provide and maintain all platform features",
              "Process subscription payments and send billing receipts",
              "Send email notifications, verification emails, and password reset links",
              "Send SMS messages as instructed by the church administrator (attendance, announcements, birthdays)",
              "Detect and prevent fraud, abuse, and unauthorized access",
              "Respond to support requests and inquiries",
              "Improve and develop the platform",
              "Comply with legal obligations under Ghanaian and applicable law",
            ]} />
          </Section>

          <Section number="4" title="Data We Process on Behalf of Churches">
            <p>
              Under data protection law, ChurchClerk acts as a <strong>data processor</strong> for member data entered
              by the church. The church acts as the <strong>data controller</strong> — they decide what member data is
              collected and how it is used within the platform.
            </p>
            <p>
              Churches are responsible for ensuring they have a valid legal basis for collecting and storing their
              members&apos; personal information. ChurchClerk processes that data only as instructed by the church
              administrator.
            </p>
            <p>
              When a church closes its account or their subscription lapses permanently, we retain their data for
              30 days to allow data export, after which it is scheduled for deletion.
            </p>
          </Section>

          <Section number="5" title="Third-Party Services">
            <p>
              We use trusted third-party providers to deliver certain parts of our service. Each provider operates
              under its own privacy policy.
            </p>
            <Ul items={[
              "Paystack — payment processing (paystack.com)",
              "Africa's Talking — SMS delivery for church communications (africastalking.com)",
              "Resend — transactional email delivery (resend.com)",
              "Cloudinary — profile image and file storage (cloudinary.com)",
              "MongoDB Atlas — database hosting and storage (mongodb.com)",
            ]} />
            <p>
              We do not sell, rent, or share your personal data with any third party for marketing purposes.
            </p>
          </Section>

          <Section number="6" title="Cookies">
            <p>ChurchClerk uses cookies and similar technologies for the following purposes:</p>
            <Ul items={[
              "Authentication — a secure, HTTP-only cookie keeps you logged in across page loads",
              "CSRF protection — a session cookie prevents cross-site request forgery attacks",
            ]} />
            <p>
              These cookies are <strong>strictly necessary</strong> for the platform to function. We do not use
              advertising cookies or behavioural tracking cookies. By using ChurchClerk you consent to these
              essential cookies being placed on your device.
            </p>
          </Section>

          <Section number="7" title="Data Security">
            <p>We take reasonable technical and organisational measures to protect your data, including:</p>
            <Ul items={[
              "Passwords hashed with bcrypt before storage",
              "All data transmitted over HTTPS/TLS",
              "HTTP-only, Secure cookies with CSRF protection",
              "Rate limiting on login, registration, and password reset endpoints",
              "Input sanitisation to prevent injection and XSS attacks",
              "Access controls with role-based permissions inside the platform",
            ]} />
            <p>
              No system can guarantee absolute security. If we become aware of a data breach that affects your
              information, we will notify affected parties as required by law.
            </p>
          </Section>

          <Section number="8" title="Data Retention">
            <Ul items={[
              "Account data is retained for as long as your account is active",
              "Member records are retained as long as the church subscription is active",
              "Payment history is retained for a minimum of 5 years for legal and accounting purposes",
              "After account closure, all church and member data is deleted within 30 days unless a longer retention period is required by law",
              "Backup copies may persist for up to 90 days before being permanently purged",
            ]} />
          </Section>

          <Section number="9" title="Your Rights">
            <p>
              Under the Ghana Data Protection Act 2012 and other applicable laws, you have the right to:
            </p>
            <Ul items={[
              "Access — request a copy of the personal data we hold about you",
              "Correction — request that inaccurate data be corrected",
              "Deletion — request that your personal data be deleted, subject to legal retention obligations",
              "Data portability — request your data in a machine-readable format",
              "Objection — object to certain processing activities",
              "Withdraw consent — where processing is based on consent, you may withdraw it at any time",
            ]} />
            <p>
              To exercise any of these rights, contact us at{" "}
              <a href={`mailto:${CONTACT_EMAIL}`} className="font-medium text-blue-700 hover:underline">
                {CONTACT_EMAIL}
              </a>
              . We will respond within 30 days.
            </p>
            <p>
              <strong>Church members:</strong> if you want to access, correct, or request deletion of your records
              held by a church on ChurchClerk, please contact that church directly — they control your data, not us.
            </p>
          </Section>

          <Section number="10" title="Children's Privacy">
            <p>
              ChurchClerk is not directed at children under the age of 13. Administrator accounts must be held by
              adults. Churches may maintain records of minor members, but that data is held under the church&apos;s
              responsibility as data controller, with appropriate parental consent.
            </p>
          </Section>

          <Section number="11" title="International Transfers">
            <p>
              Our infrastructure providers (MongoDB Atlas, Cloudinary, Resend) may store data on servers outside
              Ghana. Where such transfers occur, we ensure the provider maintains adequate data protection standards
              consistent with this policy.
            </p>
          </Section>

          <Section number="12" title="Changes to This Policy">
            <p>
              We may update this Privacy Policy from time to time. When we make material changes, we will update
              the effective date at the top of this page and notify account holders by email. Continued use of
              ChurchClerk after the updated policy takes effect constitutes acceptance of the revised terms.
            </p>
          </Section>

          <Section number="13" title="Contact Us">
            <p>
              If you have questions, concerns, or requests regarding this Privacy Policy or how we handle your
              data, please reach out:
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
            <Link to="/terms-of-service" className="font-medium text-blue-700 hover:underline">Terms of Service</Link>
            <Link to="/contact" className="hover:underline">Contact</Link>
          </div>
        </div>
      </div>

      <LandingFooter />
    </div>
  );
}

export default PrivacyPolicyPage;
