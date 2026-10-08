/* Display copy and step structure. Branching lives in rules.js. */
window.SURVEY_CONTENT = Object.freeze({
  title: 'How you pay with UPI on iMobile',
  shortTitle: 'UPI payments feedback',
  description: 'We’ll ask how you pay with UPI today, then show you two screens from iMobile.',
  duration: 'This survey will take approximately 5 minutes.',
  commentPrompt: 'What should change?',
  conceptPrompts: Object.freeze({
    notice: 'Does this make Scan any QR on the login screen, before the PIN, easier to notice?',
    try: 'How likely would you be to try Scan any QR on the login screen, before the PIN?',
    open: 'How likely would you be to open iMobile and try Scan any QR on the login screen, before the PIN?'
  }),
  labels: Object.freeze({
    upi_app: Object.freeze({
      imobile: 'iMobile',
      google_pay: 'Google Pay',
      phonepe: 'PhonePe',
      paytm: 'Paytm',
      whatsapp: 'WhatsApp Pay',
      cred: 'CRED',
      amazon_pay: 'Amazon Pay',
      super_money: 'super.money',
      bhim: 'BHIM',
      other: 'Other'
    }),
    opens_imobile: Object.freeze({
      yes: 'Yes, I open it',
      rarely: 'I have it, but I almost never open it',
      no: 'I don’t have it'
    }),
    nonuser_reason: Object.freeze({
      separate_app: 'I have to open a separate bank app',
      login: 'I have to log in',
      trust: 'I trust my UPI app more for payments',
      bad_experience: 'I had a bad payment experience on iMobile',
      rewards: 'Rewards or offers are better in my usual app',
      upi_id: 'My UPI ID is already set up in my usual app',
      habit: 'No strong reason. I’m used to my app',
      other: 'Other'
    }),
    scan_method: Object.freeze({
      login_screen: 'Scan any QR on the login screen, before the PIN',
      log_in_then_scan: 'Log in, then scan',
      widget: 'The home-screen widget',
      dont_scan: 'I open iMobile, but I don’t scan QR there'
    }),
    found_scan: Object.freeze({
      noticed: 'I noticed it myself',
      someone: 'Someone I know showed me',
      bank_message: 'A message from the bank',
      dont_remember: 'I don’t remember',
      other: 'Other'
    }),
    almost_stopped: Object.freeze({
      slow_launch: 'It is slow to open',
      safety: 'I wasn’t sure it was safe',
      confirmation: 'I didn’t trust that the payment had gone through',
      failed: 'It failed or got stuck',
      nothing: 'Nothing gets in the way'
    }),
    likert: Object.freeze({
      very_unlikely: 'Very unlikely',
      unlikely: 'Unlikely',
      neutral: 'Neutral',
      likely: 'Likely',
      very_likely: 'Very likely',
      already_do: 'I already do this'
    }),
    notice: Object.freeze({
      clearer: 'Clearer',
      same: 'About the same',
      more_confusing: 'More confusing'
    }),
    knew_scan: Object.freeze({
      yes: 'Yes',
      no: 'No',
      not_sure: 'Not sure'
    }),
    persuade_reason: Object.freeze({
      balance: 'I want to see my balance before I pay',
      trust: 'I don’t trust a payment before I log in',
      failed: 'I tried Scan any QR on the login screen, before the PIN, and it didn’t work',
      no_harder: 'Logging in does not bother me',
      other: 'Other'
    }),
    knew_widget: Object.freeze({
      yes: 'Yes',
      no: 'No',
      not_sure: 'Not sure'
    })
  }),
  upiAppLogos: Object.freeze({
    imobile: 'assets/upi-apps/imobile-app.png',
    google_pay: 'assets/upi-apps/google-pay.png',
    phonepe: 'assets/upi-apps/phonepe.png',
    paytm: 'assets/upi-apps/paytm.png',
    whatsapp: 'assets/upi-apps/whatsapp.png',
    cred: 'assets/upi-apps/cred.png',
    amazon_pay: 'assets/upi-apps/amazon-pay.png',
    super_money: 'assets/upi-apps/super-money.png',
    bhim: 'assets/upi-apps/bhim.png',
    other: 'assets/upi-apps/other.svg'
  }),
  concepts: Object.freeze([
    Object.freeze({
      id: 'concept_1',
      title: 'First screen',
      image: 'assets/concept-1.png',
      likelihoodKey: 'concept_1_likelihood',
      feedbackKey: 'concept_1_feedback'
    }),
    Object.freeze({
      id: 'concept_2',
      title: 'Second screen',
      image: 'assets/concept-2.png',
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
      question: 'What app do you usually use for UPI payments?',
      optionsKey: 'upi_app',
      withLogos: true
    }),
    Object.freeze({
      id: 'opens_imobile',
      kind: 'choice',
      field: 'opens_imobile',
      required: true,
      question: 'In a typical month, do you open the iMobile app?',
      optionsKey: 'opens_imobile'
    }),
    Object.freeze({
      id: 'nonuser_reason',
      kind: 'choice',
      field: 'nonuser_reason',
      otherField: 'nonuser_reason_other',
      required: true,
      multi: true,
      question: 'Why do you pay in another app instead of iMobile?',
      instruction: 'Select all that apply.',
      optionsKey: 'nonuser_reason'
    }),
    Object.freeze({
      id: 'scan_method',
      kind: 'choice',
      field: 'scan_method',
      required: true,
      question: 'When you pay a QR from iMobile, what do you usually do?',
      optionsKey: 'scan_method'
    }),
    Object.freeze({
      id: 'found_scan',
      kind: 'choice',
      field: 'found_scan',
      otherField: 'found_scan_other',
      required: true,
      question: 'How did you find Scan any QR on the login screen, before the PIN?',
      optionsKey: 'found_scan'
    }),
    Object.freeze({
      id: 'almost_stopped',
      kind: 'choice',
      field: 'almost_stopped',
      required: true,
      question: 'When you use Scan any QR on the login screen, before the PIN, what gets in the way?',
      optionsKey: 'almost_stopped'
    }),
    Object.freeze({
      id: 'knew_scan',
      kind: 'choice',
      field: 'knew_scan',
      required: true,
      question: 'Did you know about Scan any QR on the login screen, before the PIN?',
      optionsKey: 'knew_scan'
    }),
    Object.freeze({
      id: 'persuade_reason',
      kind: 'choice',
      field: 'persuade_reason',
      otherField: 'persuade_reason_other',
      required: true,
      question: 'What’s the main reason you don’t use Scan any QR on the login screen, before the PIN?',
      optionsKey: 'persuade_reason'
    }),
    Object.freeze({
      id: 'knew_widget',
      kind: 'choice',
      field: 'knew_widget',
      required: true,
      question: 'Did you know iMobile has a home-screen widget that opens Scan any QR?',
      optionsKey: 'knew_widget'
    }),
    Object.freeze({ id: 'concept_1', kind: 'concept', conceptId: 'concept_1', required: true }),
    Object.freeze({ id: 'concept_2', kind: 'concept', conceptId: 'concept_2', required: true })
  ])
});
