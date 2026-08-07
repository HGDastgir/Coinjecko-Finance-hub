/**
 * Trust & legal page drafts. English is the authoritative text;
 * Urdu translations follow editorial review (the UR route shows the
 * English body with a pending-translation notice until then).
 *
 * Every page here is a WORKING DRAFT — professional legal review is
 * required for each served jurisdiction before commercial launch.
 */

export interface LegalSection {
  heading: string;
  paragraphs: string[];
}

export interface LegalPage {
  slug: string;
  titleEn: string;
  titleUr: string;
  description: string;
  sections: LegalSection[];
  /**
   * False for editorial pages (About, Advertise) that share this
   * route but are not policy documents, so they do not carry the
   * pending-legal-review notice.
   */
  isLegalDocument?: boolean;
}

export const LEGAL_PAGES: Record<string, LegalPage> = {
  "editorial-policy": {
    slug: "editorial-policy",
    titleEn: "Editorial Policy",
    titleUr: "ادارتی پالیسی",
    description:
      "How CoinJecko Finance Hub selects, verifies, labels and corrects its journalism and market coverage.",
    sections: [
      {
        heading: "How stories are selected",
        paragraphs: [
          "We cover developments that materially affect markets, currencies, businesses and household finances across our regions — Pakistan, South Asia, the Middle East, North America, Europe and Asia-Pacific. Stories are chosen for reader usefulness, not for click potential. We do not publish artificial urgency or sensational headlines.",
        ],
      },
      {
        heading: "How information is verified",
        paragraphs: [
          "Market claims must be traceable to a named source: an exchange, a regulator, a company filing, official statistics or a licensed data provider. Analysis distinguishes clearly between fact and interpretation. We do not publish unverified market rumours as fact, fabricated quotes, invented statistics or guaranteed-return claims.",
        ],
      },
      {
        heading: "Authors and expertise",
        paragraphs: [
          "Every article carries a named author with a public profile describing their expertise. Publication and last-updated dates are displayed on all articles.",
        ],
      },
      {
        heading: "Sponsored and commercial content",
        paragraphs: [
          "Sponsored articles, advertisements, affiliate links and paid partnerships are always labelled as such. Commercial relationships never influence editorial conclusions, and advertisers do not review editorial content before publication. See the Advertising Disclosure for details.",
        ],
      },
      {
        heading: "Market data sourcing",
        paragraphs: [
          "Market data shown on this platform comes from licensed third-party providers. Each data widget displays its provider, the last-updated time and whether the data is live or delayed.",
        ],
      },
      {
        heading: "Corrections",
        paragraphs: [
          "Errors are corrected promptly and transparently under our Corrections Policy, with the correction recorded on the article.",
        ],
      },
    ],
  },
  "corrections-policy": {
    slug: "corrections-policy",
    titleEn: "Corrections Policy",
    titleUr: "تصحیح کی پالیسی",
    description:
      "How factual errors are recorded, corrected and disclosed on CoinJecko Finance Hub.",
    sections: [
      {
        heading: "Our commitment",
        paragraphs: [
          "Accuracy is the foundation of editorial credibility. When we get something wrong, we say so.",
        ],
      },
      {
        heading: "What happens when an error is found",
        paragraphs: [
          "The article is updated to correct the error. A correction note describing what changed is recorded on the article, and the updated timestamp is displayed. For significant errors that change the meaning of a story, the correction note appears prominently at the top of the article.",
          "We do not silently rewrite articles to remove mistakes.",
        ],
      },
      {
        heading: "Reporting an error",
        paragraphs: [
          "If you believe something we published is inaccurate, contact our editorial team through the Data Request Contact page. Include the article link and the claimed error; we review every report.",
        ],
      },
    ],
  },
  "advertising-disclosure": {
    slug: "advertising-disclosure",
    titleEn: "Advertising Disclosure",
    titleUr: "اشتہاری انکشاف",
    description:
      "How advertising, sponsorship and affiliate relationships are labelled on CoinJecko Finance Hub.",
    sections: [
      {
        heading: "How we make money",
        paragraphs: [
          "CoinJecko Finance Hub is funded through advertising (including programmatic networks such as Google AdSense and direct placements), clearly labelled sponsored articles, affiliate links, and newsletter and podcast sponsorships.",
        ],
      },
      {
        heading: "Labelling",
        paragraphs: [
          "Display advertising is labelled “Advertisement”. Sponsored articles are labelled “Sponsored” and identify the sponsor. Affiliate links are disclosed on the pages where they appear. Paid partnerships are labelled “Paid partnership”.",
          "No advertisement is presented in a way that creates the impression of editorial endorsement. Advertisers have no influence over editorial content, market data presentation or story selection.",
        ],
      },
    ],
  },
  "financial-disclaimer": {
    slug: "financial-disclaimer",
    titleEn: "Financial Disclaimer",
    titleUr: "مالی دستبرداری",
    description:
      "The scope and limits of the information published on CoinJecko Finance Hub.",
    sections: [
      {
        heading: "Information, not advice",
        paragraphs: [
          "CoinJecko / Finance Hub provides financial news, market data, educational material and analysis for informational purposes only. Market data may be delayed, incomplete or supplied by third-party providers. Nothing published on this platform constitutes personal financial, investment, tax or legal advice. Always conduct independent research and consult an appropriately qualified professional before making financial decisions.",
        ],
      },
      {
        heading: "Market data",
        paragraphs: [
          "Prices, index values, exchange rates and other market data are supplied by third-party providers, may be delayed, and are displayed with their source and timestamp. Delayed data is marked as delayed; we do not present delayed data as real-time.",
        ],
      },
      {
        heading: "Risk",
        paragraphs: [
          "Markets involve risk, including the loss of capital. Cryptocurrency markets are highly volatile and may be subject to different regulatory treatment in your jurisdiction. Past performance does not guarantee future results.",
        ],
      },
    ],
  },
  "privacy-policy": {
    slug: "privacy-policy",
    titleEn: "Privacy Policy",
    titleUr: "پرائیویسی پالیسی",
    description:
      "What data CoinJecko Finance Hub collects, why, and the choices you have.",
    sections: [
      {
        heading: "Data minimisation",
        paragraphs: [
          "We collect only the data genuinely required to operate the platform. Reading the site does not require an account. We do not sell personal data.",
        ],
      },
      {
        heading: "What we collect",
        paragraphs: [
          "Newsletter subscription: your email address, chosen language, and consent record — used only to send the newsletter you requested. Every email includes an unsubscribe link, and subscription uses double opt-in confirmation.",
          "Contact and data requests: the details you choose to send us, used only to respond.",
          "Operational logs: security and error logs (IP address, user agent, request metadata) retained for a limited period for abuse prevention and incident response. Passwords, tokens and message contents are never written to logs.",
          "Staff accounts: editorial staff authentication is handled by our managed authentication provider; administrative actions are recorded in an audit trail.",
        ],
      },
      {
        heading: "Cookies",
        paragraphs: [
          "Strictly necessary cookies are used for authentication sessions and security. Optional cookies (such as analytics or advertising) are governed by the Cookie Policy and, where required by law, consent.",
        ],
      },
      {
        heading: "Your rights",
        paragraphs: [
          "Depending on your jurisdiction, you may have rights to access, correct, export or delete personal data we hold about you, and to withdraw consent. Use the Data Request Contact page to exercise these rights; we respond within the timelines required by applicable law.",
        ],
      },
      {
        heading: "Jurisdictions",
        paragraphs: [
          "We serve readers in multiple jurisdictions (including Pakistan, India, the UAE, Saudi Arabia, the United Kingdom, the European Union, Canada and the United States) and design our practices around data-protection principles common to them. This policy will be reviewed by qualified counsel for each jurisdiction before commercial launch.",
        ],
      },
    ],
  },
  "cookie-policy": {
    slug: "cookie-policy",
    titleEn: "Cookie Policy",
    titleUr: "کوکی پالیسی",
    description:
      "The cookies CoinJecko Finance Hub uses and how to control them.",
    sections: [
      {
        heading: "Strictly necessary",
        paragraphs: [
          "Authentication session cookies (staff sign-in) and security cookies. These are HttpOnly, Secure and SameSite where applicable, and cannot be disabled because the service cannot function without them.",
        ],
      },
      {
        heading: "Preferences",
        paragraphs: [
          "Your theme (light/dark) choice is stored locally in your browser and is never transmitted to us.",
        ],
      },
      {
        heading: "Analytics and advertising",
        paragraphs: [
          "If analytics or advertising cookies are introduced, they will be listed here with their provider and purpose, loaded only after any legally required consent, and controllable from a consent banner. We default to the most privacy-preserving configuration.",
        ],
      },
    ],
  },
  "terms-of-use": {
    slug: "terms-of-use",
    titleEn: "Terms of Use",
    titleUr: "شرائطِ استعمال",
    description: "The terms governing use of CoinJecko Finance Hub.",
    sections: [
      {
        heading: "Acceptance",
        paragraphs: [
          "By using CoinJecko / Finance Hub you agree to these terms. If you do not agree, do not use the platform.",
        ],
      },
      {
        heading: "Content and data",
        paragraphs: [
          "Editorial content is provided for information only — see the Financial Disclaimer. Market data is licensed from third-party providers for display on this platform; you may not scrape, redistribute or resell it. Attribution and licensing terms of data providers are respected and displayed.",
        ],
      },
      {
        heading: "Acceptable use",
        paragraphs: [
          "You must not attempt to breach security controls, abuse APIs, submit unlawful content in comments, or use the platform to distribute malware or spam. We may restrict access to protect the service and its users.",
        ],
      },
      {
        heading: "Intellectual property",
        paragraphs: [
          "The CoinJecko / Finance Hub name, design and original content are protected. Limited quotation with attribution and a link is welcome; wholesale reproduction is not permitted without written consent.",
        ],
      },
      {
        heading: "Liability",
        paragraphs: [
          "To the maximum extent permitted by law, we are not liable for losses arising from reliance on information or data published on the platform, from data delays or inaccuracies, or from service interruptions.",
        ],
      },
    ],
  },
  "data-request": {
    slug: "data-request",
    titleEn: "Data Request Contact",
    titleUr: "ڈیٹا درخواست رابطہ",
    description:
      "How to exercise your privacy rights or report a correction to CoinJecko Finance Hub.",
    sections: [
      {
        heading: "Privacy requests",
        paragraphs: [
          "To access, correct, export or delete personal data we hold about you, or to withdraw consent, email our data contact. Describe your request and the email address it concerns. We may need to verify your identity before acting, and we respond within the timelines required by applicable law.",
        ],
      },
      {
        heading: "Corrections and editorial contact",
        paragraphs: [
          "To report a factual error in an article, include the article link and the claimed error. Corrections are handled under the Corrections Policy.",
        ],
      },
      {
        heading: "Contact",
        paragraphs: [
          "A dedicated contact address will be published here before launch.",
        ],
      },
    ],
  },

  about: {
    slug: "about",
    titleEn: "About CoinJecko Finance Hub",
    titleUr: "کوئن جیکو فنانس ہب کے بارے میں",
    isLegalDocument: false,
    description:
      "Our mission: markets, money and crypto explained without the noise, in English and Urdu, for readers in Pakistan, South Asia, the Gulf and beyond.",
    sections: [
      {
        heading: "Our mission",
        paragraphs: [
          "CoinJecko Finance Hub exists to explain markets, money and crypto without the noise. Financial coverage in our regions too often arrives as either untranslated jargon or breathless hype, and neither helps somebody decide what to do with their savings. We publish market data with its source attached and context written in plain language, in English and Urdu.",
          "We serve readers whose financial lives cross borders: households in Pakistan and India tracking the rupee, workers in the Gulf sending money home, and diaspora readers in the UK and Canada following markets in two places at once. That audience is our editorial centre of gravity, not an afterthought.",
        ],
      },
      {
        heading: "How we handle data",
        paragraphs: [
          "Every price, rate and market figure on this site comes from a named provider and carries that provider's own timestamp. When a data source is unavailable, we show nothing and say so — we do not display an estimated, cached or invented number to fill a gap. Where a figure is derived rather than quoted, such as trading-session status calculated from published exchange hours, we label it as derived and state its limits.",
          "This is a deliberate constraint and it occasionally makes the site look emptier than competitors. We think a blank space you can trust is worth more than a number you cannot.",
        ],
      },
      {
        heading: "Bilingual by design",
        paragraphs: [
          "English and Urdu are both first-class. Urdu is written right-to-left throughout, not bolted on as a translation layer, and financial terminology is reviewed by a human before publication. Machine-assisted translations are flagged in our system and are not published as reviewed copy.",
        ],
      },
      {
        heading: "Independence and disclosure",
        paragraphs: [
          "Advertising and sponsored content are always labelled as such and never influence editorial judgement. Our Editorial Policy sets out how stories are selected and verified; our Corrections Policy sets out how we fix mistakes; our Advertising Disclosure sets out the commercial boundaries.",
          "This website provides educational and informational content only, not financial advice.",
        ],
      },
    ],
  },

  advertise: {
    slug: "advertise",
    titleEn: "Advertise with us",
    titleUr: "ہمارے ساتھ اشتہار دیں",
    isLegalDocument: false,
    description:
      "Reach an engaged bilingual finance audience across Pakistan, South Asia, the Gulf, the UK and Canada.",
    sections: [
      {
        heading: "Who you reach",
        paragraphs: [
          "Our readers follow markets in more than one country at once: Pakistani and South Asian households tracking currency and equity markets, Gulf-based professionals managing remittances and savings, and diaspora readers in the UK and Canada. They arrive predominantly on mobile, and they come for data rather than entertainment.",
          "We publish audience figures only once they are independently measurable. Until this site has a verified analytics history, we will not quote traffic numbers — ask us and we will share exactly what we can evidence at that point.",
        ],
      },
      {
        heading: "What we offer",
        paragraphs: [
          "Display placements in defined slots across market and editorial pages, newsletter placements in our morning brief, and clearly labelled sponsored articles produced to our editorial standards.",
        ],
      },
      {
        heading: "Our advertising rules",
        paragraphs: [
          "Sponsored content is always labelled as sponsored and always carries a named sponsor — our publishing system refuses to publish it otherwise. Advertisers never receive influence over editorial coverage, advance sight of unrelated stories, or the ability to have factual reporting altered or removed.",
          "We decline advertising for guaranteed-return schemes, unlicensed investment products, and any offer whose primary claim we cannot verify. On a finance site aimed partly at first-time investors, this matters more than the revenue.",
        ],
      },
      {
        heading: "Get in touch",
        paragraphs: [
          "Use the contact page to reach the advertising team. Tell us your campaign goals, target regions and timing, and we will reply with available placements and rates.",
        ],
      },
    ],
  },
};

export const LEGAL_SLUGS = Object.keys(LEGAL_PAGES);
