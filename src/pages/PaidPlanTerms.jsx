import LegalPageLayout from "../components/LegalPageLayout";

export default function PaidPlanTerms() {
  return (
    <LegalPageLayout
      title="Paid Plan Terms"
      intro="These terms apply to the early access module purchases: GCSE Science, A-level Biology, A-level Chemistry and A-level Physics, each sold separately at £2.99 as a one-off payment. They explain what access each purchase gives, how long it lasts, and how service availability affects that access."
      lastUpdated="4 November 2026"
    >
      <section>
        <h2>What the paid plan includes</h2>
        <p>
          The early access paid plan currently includes unlimited questions,
          full AI marking, detailed feedback on submitted answers, and
          performance tracking in the results section while those features
          remain part of the service.
        </p>
      </section>

      <section>
        <h2>Price and purchase</h2>
        <p>
          Each module is a separate one-off purchase at the current early access
          price of £2.99: GCSE Science, A-level Biology, A-level Chemistry and
          A-level Physics. A purchase unlocks only the module you buy. Earlier
          combined GCSE + A-level purchases remain valid for the access they
          covered, but the combined bundle is no longer on sale. The price shown
          at checkout is the amount charged for the selected purchase.
        </p>
      </section>

      <section>
        <h2>Billing support</h2>
        <p>
          If you believe you were billed incorrectly, contact support at{" "}
          <a href="mailto:support@exambuilder.co.uk">
            support@exambuilder.co.uk
          </a>
          .
        </p>
      </section>

      <section>
        <h2>Length of access</h2>
        <p>
          Paid access grants use of premium features for as long as the service
          is available. No guarantee of lifetime availability is provided.
        </p>
      </section>

      <section>
        <h2>Account use</h2>
        <p>Access is tied to your account and is non-transferable.</p>
      </section>

      <section>
        <h2>Service changes and discontinuation</h2>
        <p>
          Exam Builder may be updated, changed, suspended, or discontinued. If
          the service is permanently discontinued, paid access ends because the
          service itself is no longer available. Purchase of the paid plan is
          not a promise that the service will be operated forever.
        </p>
      </section>

      <section>
        <h2>No waiver of statutory rights</h2>
        <p>
          Nothing in these paid-plan terms removes or limits any mandatory
          rights you may have under applicable consumer law.
        </p>
      </section>
    </LegalPageLayout>
  );
}
