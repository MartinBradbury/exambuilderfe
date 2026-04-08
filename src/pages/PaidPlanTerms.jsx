import LegalPageLayout from "../components/LegalPageLayout";

export default function PaidPlanTerms() {
  return (
    <LegalPageLayout
      title="Paid Plan Terms"
      intro="These terms apply specifically to the £1.99 paid upgrade and explain what access the purchase gives, how long it lasts, and how service availability affects that access."
      lastUpdated="8 April 2026"
    >
      <section>
        <h2>What the paid plan includes</h2>
        <p>
          The paid plan currently includes unlimited question generation,
          feedback on submitted answers, and review of completed work in the
          results section while those features remain part of the service.
        </p>
      </section>

      <section>
        <h2>Price and purchase</h2>
        <p>
          The current paid plan price is £1.99. The price shown at checkout is
          the amount charged for the purchase.
        </p>
      </section>

      <section>
        <h2>Length of access</h2>
        <p>
          The paid upgrade grants full paid access for as long as Exam Builder
          remains available as a service. It does not guarantee that the service
          will continue indefinitely, permanently, or without interruption.
        </p>
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
