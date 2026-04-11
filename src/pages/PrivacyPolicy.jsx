import LegalPageLayout from "../components/LegalPageLayout";

export default function PrivacyPolicy() {
  return (
    <LegalPageLayout
      title="Privacy Policy"
      intro="This policy explains what data Exam Builder stores, how it is used to operate the service, and when limited third-party services are involved."
      lastUpdated="11 April 2026"
    >
      <section>
        <h2>What data we store</h2>
        <p>
          Exam Builder stores account details such as your email address,
          authentication records, plan status, email verification status, saved
          question sessions, marks, feedback, and progress history.
        </p>
      </section>

      <section>
        <h2>How we use your data</h2>
        <p>
          Your data is used to create and manage your account, generate and mark
          revision questions, save completed sessions, show progress summaries,
          manage paid access, and support account or billing issues.
        </p>
      </section>

      <section>
        <h2>Third parties</h2>
        <p>
          Exam Builder uses selected third-party providers to help operate the
          service, including hosting and payment processing. Stripe is used for
          secure checkout and payment handling. Other technical service
          providers may process limited data where needed to host or run the
          platform.
        </p>
      </section>

      <section>
        <h2>Cookies and similar technologies</h2>
        <p>
          Exam Builder may use essential cookies or similar browser storage to
          keep you signed in, maintain secure sessions, and support core site
          functionality. These are used to operate the service rather than for
          advertising.
        </p>
      </section>

      <section>
        <h2>Support and questions</h2>
        <p>
          If you have privacy questions or want to contact the operator about
          your data, email{" "}
          <a href="mailto:enquiry@exambuilder.co.uk">
            enquiry@exambuilder.co.uk
          </a>
          .
        </p>
      </section>
    </LegalPageLayout>
  );
}
