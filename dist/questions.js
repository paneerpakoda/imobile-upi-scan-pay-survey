/* Display copy and step structure for the iMobile UPI Scan & Pay survey.
   Content mirrored from the source Google Form; iterate later without changing architecture. */
window.SURVEY_CONTENT = Object.freeze({
  title: 'Understanding iMobile UPI Scan & Pay behaviour',
  shortTitle: 'UPI Scan & Pay feedback',
  description: 'Help us improve your UPI payment experience! We’d like to understand how you currently make UPI QR payments on iMobile and your awareness and expectations around non-logged-in Scan & Pay. We’ll also show you a few concepts and get your feedback on them.',
  duration: 'This survey will take approximately 3–5 minutes.',
  conceptSection: {
    title: 'Concept feedback',
    description: 'We’d like to get your feedback on a few concepts designed to make Scan & Pay easier to discover and use.'
  },
  labels: Object.freeze({
    upi_app: Object.freeze({
      imobile: 'iMobile',
      google_pay: 'Google pay',
      phonepe: 'PhonePe',
      paytm: 'Paytm',
      bhim: 'BHIM (Bharat Interface for Money',
      other: 'Other'
    }),
    qr_path: Object.freeze({
      unlock_upi_scan: 'Unlock iMobile → UPI Payments → Scan QR',
      unlock_send_money_upi_scan: 'Unlock iMobile → Send Money → UPI Payments → Scan QR',
      landing_scan_any_qr: 'Use Scan Any QR directly from the landing screen',
      dont_use_imobile_qr: 'I don’t use iMobile for QR payments'
    }),
    unlock_feel: Object.freeze({
      already_use_convenient: 'I already use it and find it very convenient',
      know_would_like: 'I know about it and would like to use it',
      know_prefer_login: 'I know about it, but I prefer logging in',
      didnt_know_would_try: 'I didn’t know about it, but I would like to try it',
      didnt_know_no_need: 'I didn’t know about it and don’t see a need for it'
    }),
    unlock_reason: Object.freeze({
      usual_habit: 'It’s how I usually make a UPI payment',
      comfortable_after_login: 'I’m more comfortable making payments after logging in',
      check_balance: 'I want to check my account/balance before paying',
      feels_more_secure: 'I feel it is more secure to log in first',
      unaware_of_no_login: 'I’m not aware that I can scan and pay without logging in',
      other: 'Other'
    }),
    importance: Object.freeze({
      least: 'Least Important',
      moderate: 'Moderately Important',
      most: 'Most Important'
    }),
    likert: Object.freeze({
      very_unlikely: 'Very unlikely',
      unlikely: 'Unlikely',
      neutral: 'Neutral',
      likely: 'Likely',
      very_likely: 'Very likely'
    })
  }),
  importanceRows: Object.freeze([
    Object.freeze({ key: 'importance_speed', label: 'Speed & fewer steps' }),
    Object.freeze({ key: 'importance_ease', label: 'Ease & familiarity' }),
    Object.freeze({ key: 'importance_security', label: 'Security' }),
    Object.freeze({ key: 'importance_confirmation', label: 'Payment confirmation' }),
    Object.freeze({ key: 'importance_no_login', label: 'No login required' })
  ]),
  concepts: Object.freeze([
    Object.freeze({
      id: 'concept_1',
      title: 'Concept 1',
      description: 'A first-time onboarding screen introducing Scan & Pay on the UPI landing page and for the first time users, highlighting that users can pay without logging in.',
      image: 'assets/concept-1.jpg',
      likelihoodKey: 'concept_1_likelihood',
      feedbackKey: 'concept_1_feedback'
    }),
    Object.freeze({
      id: 'concept_2',
      title: 'Concept 2',
      description: 'A highlighted “Scan any QR” card with a tooltip for users who haven’t used the feature, making it easier to discover and understand.',
      image: 'assets/concept-2.jpg',
      likelihoodKey: 'concept_2_likelihood',
      feedbackKey: 'concept_2_feedback'
    })
  ]),
  steps: Object.freeze([
    Object.freeze({ id: 'intro', kind: 'intro' }),
    Object.freeze({
      id: 'upi_app',
      kind: 'choice',
      field: 'upi_app',
      otherField: 'upi_app_other',
      required: true,
      question: 'What app do you use for your UPI payments?',
      optionsKey: 'upi_app'
    }),
    Object.freeze({
      id: 'qr_path',
      kind: 'choice',
      field: 'qr_path',
      required: true,
      question: 'When you make a QR payment through iMobile, what do you usually do?',
      optionsKey: 'qr_path'
    }),
    Object.freeze({
      id: 'unlock_feel',
      kind: 'choice',
      field: 'unlock_feel',
      required: false,
      question: 'How do you feel about being able to make a UPI payment by scanning a QR code on iMobile without unlocking the app?',
      optionsKey: 'unlock_feel'
    }),
    Object.freeze({
      id: 'unlock_reason',
      kind: 'choice',
      field: 'unlock_reason',
      otherField: 'unlock_reason_other',
      required: true,
      question: 'If you unlock iMobile before making a QR payment, what is the main reason?',
      optionsKey: 'unlock_reason'
    }),
    Object.freeze({
      id: 'importance',
      kind: 'matrix',
      required: false,
      question: 'How important are the following factors to you when making a QR payment?'
    }),
    Object.freeze({ id: 'concept_1', kind: 'concept', conceptId: 'concept_1', required: true }),
    Object.freeze({ id: 'concept_2', kind: 'concept', conceptId: 'concept_2', required: true })
  ])
});
