export function PrivacyScreen() {
  return (
    <div className="min-h-screen bg-cream px-6 py-12 max-w-2xl mx-auto">
      <h1 className="font-display text-3xl text-ink mb-2">Privacy Policy</h1>
      <p className="text-xs text-ink-faint mb-8">Last updated: September 2026</p>

      <section className="space-y-6 text-[0.9rem] text-ink-soft leading-relaxed">
        <div>
          <h2 className="font-semibold text-ink mb-1">1. Information We Collect</h2>
          <p>When you sign in with Google, we collect your name, email address, and Google account ID solely to create and identify your Jugnu account. We do not collect any other personal data without your explicit consent.</p>
        </div>

        <div>
          <h2 className="font-semibold text-ink mb-1">2. How We Use Your Information</h2>
          <p>Your information is used only to provide the Jugnu service — personalising the caregiver and patient experience, managing your care circle, and storing activity session data. We do not sell, rent, or share your personal information with third parties for marketing purposes.</p>
        </div>

        <div>
          <h2 className="font-semibold text-ink mb-1">3. Data Storage</h2>
          <p>Account and session data is stored securely in our database hosted on Supabase (AWS, ap-south-1 region). All data is encrypted at rest and in transit.</p>
        </div>

        <div>
          <h2 className="font-semibold text-ink mb-1">4. Google OAuth</h2>
          <p>We use Google Sign-In (OAuth 2.0) for authentication. We only request access to your basic profile information (name and email). We do not access your Google Drive, Gmail, or any other Google services.</p>
        </div>

        <div>
          <h2 className="font-semibold text-ink mb-1">5. Your Rights</h2>
          <p>You may request deletion of your account and all associated data at any time by contacting us. Upon request, we will permanently delete your data within 30 days.</p>
        </div>

        <div>
          <h2 className="font-semibold text-ink mb-1">6. Contact</h2>
          <p>For any privacy-related questions, please contact us at: <a href="mailto:contact@jugnu.app" className="text-glow-700 underline">contact@jugnu.app</a></p>
        </div>
      </section>
    </div>
  )
}
