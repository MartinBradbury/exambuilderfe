import LegalPageLayout from "../components/LegalPageLayout";

export default function RefundPolicy() {
  return (
    <LegalPageLayout
      title="Refund Policy"
      intro="This policy explains the intended refund position for the £1.99 paid plan purchase. It should be reviewed against the consumer law that applies to your customers."
      lastUpdated="8 April 2026"
    >
      <section>
        <h2>General position</h2>
        <p>
          Because the paid plan unlocks digital service access immediately after
          activation, refunds are generally not offered once paid access has
          been granted, except where a refund is required by applicable law.
        </p>
      </section>

      <section>
        <h2>Duplicate or mistaken charges</h2>
        <p>
          If you were charged more than once in error or were charged after you
          already had paid access, contact support so the charge can be
          reviewed.
        </p>
      </section>

      <section>
        <h2>Service availability</h2>
        <p>
          The paid plan is sold on the basis that access continues while the
          service remains available. If the service is later suspended or
          discontinued, that does not by itself create a separate promise of
          perpetual access. However, this policy does not override any refund or
          remedy required by law.
        </p>
      </section>

      <section>
        <h2>Support contact</h2>
        <p>
          If you need billing help or want a charge reviewed, contact the site
          operator using the support details provided with the service.
        </p>
      </section>
    </LegalPageLayout>
  );
}
