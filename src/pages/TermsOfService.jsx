import LegalPageLayout from "../components/LegalPageLayout";

export default function TermsOfService() {
  return (
    <LegalPageLayout
      title="Terms of Service"
      intro="These terms explain the general rules for using Exam Builder, including account access, acceptable use, and how paid access works alongside the dedicated paid-plan terms."
      lastUpdated="8 April 2026"
    >
      <section>
        <h2>Using the service</h2>
        <p>
          Exam Builder provides revision tools, generated questions, marking,
          feedback, and saved results for supported subjects and exam boards.
          You must provide accurate account information and keep your login
          credentials secure.
        </p>
      </section>

      <section>
        <h2>Acceptable use</h2>
        <p>
          You may use the service for personal revision and study support. You
          must not attempt to disrupt the service, access other user accounts,
          reverse engineer protected systems, or use automated abuse that harms
          availability for other users.
        </p>
      </section>

      <section>
        <h2>Accounts and availability</h2>
        <p>
          Access to Exam Builder depends on the service continuing to operate.
          Features, supported subjects, pricing, and availability may change,
          and the service may be modified, suspended, or discontinued.
        </p>
      </section>

      <section>
        <h2>Paid access</h2>
        <p>
          Paid access is governed by the Paid Plan Terms in addition to these
          general terms. If there is a conflict between these general terms and
          the Paid Plan Terms for a purchase, the Paid Plan Terms control for
          that purchase.
        </p>
      </section>

      <section>
        <h2>Consumer rights</h2>
        <p>
          Nothing in these terms removes or limits any rights you have under
          applicable consumer protection law.
        </p>
      </section>
    </LegalPageLayout>
  );
}
