import type { LegalSection } from "@/types/shared";

// DRAFT TEXT. Written to describe how Syntra works today so the dialogs have real content, but it has not
// been reviewed by a lawyer. Replace the company details and contact address, and have it reviewed
// before launch.

export const LEGAL_LAST_UPDATED = "November 23, 2026";

export const LEGAL_CONTACT_EMAIL = "legal@syntra.app";

export const TERMS_SECTIONS: readonly LegalSection[] = [
  {
    id: "acceptance",
    title: "1. Accepting these terms",
    paragraphs: [
      "These Terms of Service govern your use of Syntra, an AI-assisted project management service for teams. By creating an account, signing in or using the service, you agree to these terms.",
      "If you use Syntra on behalf of a team or company, you confirm that you can accept these terms for them.",
    ],
  },
  {
    id: "accounts",
    title: "2. Your account",
    paragraphs: [
      "You can sign up with an email address and password, or with Google. You must verify your email address before you can sign in.",
      "You are responsible for keeping your credentials and any API keys secret, and for everything done with them. Tell us straight away if you think your account or a key has been compromised.",
    ],
    bullets: [
      "Give accurate information and keep it up to date.",
      "Use a strong password that you do not reuse elsewhere.",
      "Do not share your account. Invite teammates to your workspace instead.",
    ],
  },
  {
    id: "workspaces",
    title: "3. Workspaces, projects and content",
    paragraphs: [
      "You can create workspaces, invite members and give them roles. Workspace owners and admins decide who can see and change the projects, tasks and comments in that workspace.",
      "You own the content you put into Syntra. You give us a limited licence to store, process and display it only as needed to run the service for you and your team, including the AI features described below.",
    ],
  },
  {
    id: "ai",
    title: "4. AI features",
    paragraphs: [
      "Syntra can break tasks into subtasks, answer questions about a project and draft status reports. To do this, relevant project content such as tasks, comments and descriptions is processed by our AI service.",
      "AI output can be wrong, incomplete or out of date. It is a draft for you to review, not advice. You are responsible for checking it before you rely on it or act on it.",
    ],
  },
  {
    id: "api",
    title: "5. API and API keys",
    paragraphs: [
      "Workspace members with the right permission can create API keys that let other tools call Syntra on their behalf. A key acts with the permissions you chose for it, limited to the creating member's own permissions.",
      "You must not share, publish or embed keys in public code. We may revoke keys that are abused or that put the service at risk.",
    ],
  },
  {
    id: "acceptable-use",
    title: "6. Acceptable use",
    paragraphs: ["You agree not to misuse the service. In particular, you will not:"],
    bullets: [
      "break the law or infringe anyone else's rights;",
      "upload malware or try to gain access to accounts, workspaces or systems that are not yours;",
      "probe, scan or overload the service, or get around rate limits and other protections;",
      "use the service or its AI output to build a competing product, or to generate harmful, deceptive or abusive content.",
    ],
  },
  {
    id: "availability",
    title: "7. Availability and changes",
    paragraphs: [
      "We work to keep Syntra available, but we do not promise it will always be uninterrupted or error-free. We may change, add or remove features, and we will try to give notice of changes that matter.",
    ],
  },
  {
    id: "termination",
    title: "8. Ending your use",
    paragraphs: [
      "You can stop using Syntra at any time. We may suspend or close accounts that break these terms or put other users or the service at risk.",
      "Workspace owners can delete their workspace. After deletion, content is removed from our systems in line with the Privacy Policy.",
    ],
  },
  {
    id: "liability",
    title: "9. Disclaimers and liability",
    paragraphs: [
      "The service is provided \"as is\" and \"as available\". To the extent the law allows, we are not liable for indirect or consequential losses, lost profits or lost data, and our total liability is limited to the amount you paid us for the service in the twelve months before the claim.",
      "Nothing in these terms limits liability that cannot be limited by law.",
    ],
  },
  {
    id: "changes",
    title: "10. Changes to these terms",
    paragraphs: [
      "We may update these terms from time to time. If a change is significant we will tell you in the app or by email. Continuing to use Syntra after a change means you accept the new terms.",
    ],
  },
  {
    id: "contact",
    title: "11. Contact",
    paragraphs: [
      `Questions about these terms? Email us at ${LEGAL_CONTACT_EMAIL}.`,
    ],
  },
];

export const PRIVACY_SECTIONS: readonly LegalSection[] = [
  {
    id: "overview",
    title: "1. Overview",
    paragraphs: [
      "This Privacy Policy explains what personal information Syntra collects, why we collect it and the choices you have. We keep it short on purpose: we only collect what we need to run the service.",
    ],
  },
  {
    id: "collect",
    title: "2. Information we collect",
    paragraphs: ["We collect the following kinds of information:"],
    bullets: [
      "Account details: your name, email address and, if you use a password, a hashed copy of it (we never store the password itself).",
      "Google sign-in: if you sign in with Google, your name, verified email address and profile picture. We do not keep your Google access tokens.",
      "Workspace content: projects, tasks, comments, labels and other content you and your teammates add.",
      "Session and device data: the IP address and browser details of your sign-in sessions, used to keep your account secure.",
      "Usage and diagnostic data: server logs and error reports that help us run and fix the service.",
    ],
  },
  {
    id: "use",
    title: "3. How we use it",
    paragraphs: ["We use your information to:"],
    bullets: [
      "create and secure your account and send verification and password-reset emails;",
      "provide the service, including project management features and the AI features you choose to use;",
      "protect against fraud, abuse and unauthorised access, including rate limiting;",
      "understand how the service performs so we can improve it;",
      "meet our legal obligations.",
    ],
  },
  {
    id: "ai",
    title: "4. AI processing",
    paragraphs: [
      "When you use an AI feature, the project content needed for that request is sent to our AI service, and may be processed by the AI model providers we use. We use it only to produce your result and we do not use your workspace content to train models for other customers.",
    ],
  },
  {
    id: "cookies",
    title: "5. Cookies",
    paragraphs: [
      "Syntra uses only the cookies it needs to keep you signed in: a secure, HTTP-only cookie that holds your session. It is not used for advertising or tracking, and it is cleared when you sign out.",
    ],
  },
  {
    id: "sharing",
    title: "6. Who we share it with",
    paragraphs: [
      "We do not sell your personal information. We share it only with:",
    ],
    bullets: [
      "other members of your workspace, according to the roles and permissions your workspace sets;",
      "service providers that help us run Syntra, such as hosting, email delivery and AI model providers, under agreements that limit how they can use it;",
      "authorities, where the law requires it.",
    ],
  },
  {
    id: "retention",
    title: "7. How long we keep it",
    paragraphs: [
      "We keep your account and workspace content while your account is active. Expired sessions and unused verification tokens are removed automatically. If a workspace or account is deleted, we remove the related content, except where we must keep something to meet a legal duty.",
    ],
  },
  {
    id: "security",
    title: "8. Security",
    paragraphs: [
      "We protect your information with measures such as hashed passwords, short-lived access tokens, per-workspace access controls and rate limiting. No system is perfectly secure, so please use a strong, unique password.",
    ],
  },
  {
    id: "rights",
    title: "9. Your choices and rights",
    paragraphs: [
      "You can view and update your account details, change your password, unlink Google and sign out of all devices from your account settings. Depending on where you live, you may also have the right to access, correct, export or delete your personal information, and to object to some processing. To use these rights, contact us.",
    ],
  },
  {
    id: "changes",
    title: "10. Changes to this policy",
    paragraphs: [
      "We may update this policy as the service changes. When we make a significant change we will tell you in the app or by email.",
    ],
  },
  {
    id: "contact",
    title: "11. Contact",
    paragraphs: [
      `For privacy questions or requests, email ${LEGAL_CONTACT_EMAIL}.`,
    ],
  },
];
