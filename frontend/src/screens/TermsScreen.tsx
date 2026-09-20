export function TermsScreen() {
  return (
    <div className="min-h-screen bg-cream px-6 py-12 max-w-2xl mx-auto">
      <h1 className="font-display text-3xl text-ink mb-2">Terms of Service</h1>
      <p className="text-xs text-ink-faint mb-8">Last updated: September 2026</p>

      <section className="space-y-6 text-[0.9rem] text-ink-soft leading-relaxed">
        <div>
          <h2 className="font-semibold text-ink mb-1">1. Acceptance of Terms</h2>
          <p>By accessing or using Jugnu, you agree to be bound by these Terms of Service. If you do not agree with any part of these terms, you may not use the service.</p>
        </div>

        <div>
          <h2 className="font-semibold text-ink mb-1">2. Description of Service</h2>
          <p>Jugnu is a cognitive support application designed to assist caregivers and healthcare workers in managing memory activities for individuals living with dementia. The service is provided for informational and supportive purposes and does not constitute medical advice.</p>
        </div>

        <div>
          <h2 className="font-semibold text-ink mb-1">3. User Accounts</h2>
          <p>You are responsible for maintaining the confidentiality of your account credentials. You agree to provide accurate information when creating your account and to notify us immediately of any unauthorised use.</p>
        </div>

        <div>
          <h2 className="font-semibold text-ink mb-1">4. Acceptable Use</h2>
          <p>You agree not to misuse the service, attempt to gain unauthorised access, or use the platform for any illegal or harmful purpose. The service is intended solely for legitimate caregiving and healthcare purposes.</p>
        </div>

        <div>
          <h2 className="font-semibold text-ink mb-1">5. Medical Disclaimer</h2>
          <p>Jugnu is not a medical device and is not intended to diagnose, treat, cure, or prevent any disease. Always consult a qualified healthcare professional for medical advice.</p>
        </div>

        <div>
          <h2 className="font-semibold text-ink mb-1">6. Limitation of Liability</h2>
          <p>To the fullest extent permitted by law, Jugnu and its developers shall not be liable for any indirect, incidental, or consequential damages arising from the use of the service.</p>
        </div>

        <div>
          <h2 className="font-semibold text-ink mb-1">7. Changes to Terms</h2>
          <p>We reserve the right to modify these terms at any time. Continued use of the service after changes constitutes acceptance of the updated terms.</p>
        </div>

        <div>
          <h2 className="font-semibold text-ink mb-1">8. Contact</h2>
          <p>For any questions about these terms, please contact us at: <a href="mailto:contact@jugnu.app" className="text-glow-700 underline">contact@jugnu.app</a></p>
        </div>
      </section>
    </div>
  )
}
