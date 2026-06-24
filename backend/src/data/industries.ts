export interface SpecializationSeed {
  name: { ru: string; en: string }
  slug: string
}

export interface IndustrySeed {
  name: { ru: string; en: string }
  slug: string
  specializations: SpecializationSeed[]
}

export const INDUSTRIES_SEED: IndustrySeed[] = [
  {
    name: { ru: 'IT & Разработка', en: 'IT & Development' },
    slug: 'it',
    specializations: [
      {
        name: { ru: 'Frontend-разработчик', en: 'Frontend Developer' },
        slug: 'frontend-developer',
      },
      { name: { ru: 'Backend-разработчик', en: 'Backend Developer' }, slug: 'backend-developer' },
      {
        name: { ru: 'Fullstack-разработчик', en: 'Fullstack Developer' },
        slug: 'fullstack-developer',
      },
      { name: { ru: 'Mobile-разработчик (iOS)', en: 'iOS Developer' }, slug: 'ios-developer' },
      {
        name: { ru: 'Mobile-разработчик (Android)', en: 'Android Developer' },
        slug: 'android-developer',
      },
      {
        name: { ru: 'DevOps / SRE инженер', en: 'DevOps / SRE Engineer' },
        slug: 'devops-engineer',
      },
      { name: { ru: 'Data Scientist', en: 'Data Scientist' }, slug: 'data-scientist' },
      { name: { ru: 'Data Engineer', en: 'Data Engineer' }, slug: 'data-engineer' },
      { name: { ru: 'ML Engineer', en: 'ML Engineer' }, slug: 'ml-engineer' },
      { name: { ru: 'QA инженер', en: 'QA Engineer' }, slug: 'qa-engineer' },
      { name: { ru: 'Системный аналитик', en: 'Systems Analyst' }, slug: 'systems-analyst' },
      { name: { ru: 'Бизнес-аналитик', en: 'Business Analyst' }, slug: 'business-analyst' },
      { name: { ru: 'Технический директор (CTO)', en: 'CTO' }, slug: 'cto' },
      { name: { ru: 'Архитектор ПО', en: 'Software Architect' }, slug: 'software-architect' },
      { name: { ru: 'Разработчик игр', en: 'Game Developer' }, slug: 'game-developer' },
      {
        name: { ru: 'Blockchain-разработчик', en: 'Blockchain Developer' },
        slug: 'blockchain-developer',
      },
      {
        name: { ru: 'Разработчик Smart contracts', en: 'Smart Contract Developer' },
        slug: 'smart-contract-developer',
      },
      {
        name: { ru: 'Telegram Bot / Mini App', en: 'Telegram Bot Developer' },
        slug: 'telegram-bot-developer',
      },
    ],
  },
  {
    name: { ru: 'Дизайн & UX', en: 'Design & UX' },
    slug: 'design',
    specializations: [
      { name: { ru: 'UI/UX дизайнер', en: 'UI/UX Designer' }, slug: 'ui-ux-designer' },
      { name: { ru: 'Графический дизайнер', en: 'Graphic Designer' }, slug: 'graphic-designer' },
      { name: { ru: 'Моушн-дизайнер', en: 'Motion Designer' }, slug: 'motion-designer' },
      { name: { ru: 'Product Designer', en: 'Product Designer' }, slug: 'product-designer' },
      { name: { ru: 'Web-дизайнер', en: 'Web Designer' }, slug: 'web-designer' },
      { name: { ru: 'Брендинг-дизайнер', en: 'Branding Designer' }, slug: 'branding-designer' },
      { name: { ru: '3D-дизайнер', en: '3D Designer' }, slug: '3d-designer' },
      { name: { ru: 'Иллюстратор', en: 'Illustrator' }, slug: 'illustrator' },
    ],
  },
  {
    name: { ru: 'Маркетинг & Реклама', en: 'Marketing & Advertising' },
    slug: 'marketing',
    specializations: [
      {
        name: { ru: 'Менеджер по маркетингу', en: 'Marketing Manager' },
        slug: 'marketing-manager',
      },
      { name: { ru: 'SMM-специалист', en: 'SMM Specialist' }, slug: 'smm-specialist' },
      { name: { ru: 'SEO-специалист', en: 'SEO Specialist' }, slug: 'seo-specialist' },
      { name: { ru: 'PPC / контекстная реклама', en: 'PPC Specialist' }, slug: 'ppc-specialist' },
      { name: { ru: 'Email-маркетолог', en: 'Email Marketer' }, slug: 'email-marketer' },
      { name: { ru: 'Контент-маркетолог', en: 'Content Marketer' }, slug: 'content-marketer' },
      { name: { ru: 'PR-менеджер', en: 'PR Manager' }, slug: 'pr-manager' },
      { name: { ru: 'Growth Hacker', en: 'Growth Hacker' }, slug: 'growth-hacker' },
      { name: { ru: 'Affiliate Marketing', en: 'Affiliate Manager' }, slug: 'affiliate-manager' },
      { name: { ru: 'Бренд-менеджер', en: 'Brand Manager' }, slug: 'brand-manager' },
      { name: { ru: 'Директор по маркетингу (CMO)', en: 'CMO' }, slug: 'cmo' },
    ],
  },
  {
    name: { ru: 'Продажи & Бизнес', en: 'Sales & Business' },
    slug: 'sales',
    specializations: [
      { name: { ru: 'Менеджер по продажам', en: 'Sales Manager' }, slug: 'sales-manager' },
      {
        name: { ru: 'Key Account Manager', en: 'Key Account Manager' },
        slug: 'key-account-manager',
      },
      { name: { ru: 'Business Development Manager', en: 'BDM' }, slug: 'bdm' },
      { name: { ru: 'Руководитель отдела продаж', en: 'Head of Sales' }, slug: 'head-of-sales' },
      { name: { ru: 'Sales Director', en: 'Sales Director' }, slug: 'sales-director' },
      {
        name: { ru: 'Торговый представитель', en: 'Sales Representative' },
        slug: 'sales-representative',
      },
      {
        name: { ru: 'Менеджер по работе с клиентами', en: 'Account Manager' },
        slug: 'account-manager',
      },
    ],
  },
  {
    name: { ru: 'Финансы & Бухгалтерия', en: 'Finance & Accounting' },
    slug: 'finance',
    specializations: [
      { name: { ru: 'Бухгалтер', en: 'Accountant' }, slug: 'accountant' },
      { name: { ru: 'Финансовый аналитик', en: 'Financial Analyst' }, slug: 'financial-analyst' },
      { name: { ru: 'Финансовый директор (CFO)', en: 'CFO' }, slug: 'cfo' },
      { name: { ru: 'Налоговый консультант', en: 'Tax Consultant' }, slug: 'tax-consultant' },
      { name: { ru: 'Аудитор', en: 'Auditor' }, slug: 'auditor' },
      { name: { ru: 'Трейдер', en: 'Trader' }, slug: 'trader' },
      {
        name: { ru: 'Инвестиционный аналитик', en: 'Investment Analyst' },
        slug: 'investment-analyst',
      },
    ],
  },
  {
    name: { ru: 'HR & Рекрутинг', en: 'HR & Recruiting' },
    slug: 'hr',
    specializations: [
      { name: { ru: 'HR-менеджер', en: 'HR Manager' }, slug: 'hr-manager' },
      { name: { ru: 'Рекрутер', en: 'Recruiter' }, slug: 'recruiter' },
      { name: { ru: 'IT-рекрутер', en: 'IT Recruiter' }, slug: 'it-recruiter' },
      { name: { ru: 'HR Business Partner', en: 'HR Business Partner' }, slug: 'hr-bp' },
      { name: { ru: 'L&D специалист', en: 'L&D Specialist' }, slug: 'ld-specialist' },
      { name: { ru: 'HR Director', en: 'HR Director' }, slug: 'hr-director' },
    ],
  },
  {
    name: { ru: 'Управление & Менеджмент', en: 'Management' },
    slug: 'management',
    specializations: [
      { name: { ru: 'Project Manager', en: 'Project Manager' }, slug: 'project-manager' },
      { name: { ru: 'Product Manager', en: 'Product Manager' }, slug: 'product-manager' },
      { name: { ru: 'Scrum Master', en: 'Scrum Master' }, slug: 'scrum-master' },
      { name: { ru: 'Operations Manager', en: 'Operations Manager' }, slug: 'operations-manager' },
      { name: { ru: 'General Manager', en: 'General Manager' }, slug: 'general-manager' },
      { name: { ru: 'CEO / Генеральный директор', en: 'CEO' }, slug: 'ceo' },
      { name: { ru: 'COO', en: 'COO' }, slug: 'coo' },
    ],
  },
  {
    name: { ru: 'Юриспруденция', en: 'Legal' },
    slug: 'legal',
    specializations: [
      { name: { ru: 'Юрист', en: 'Lawyer' }, slug: 'lawyer' },
      { name: { ru: 'Корпоративный юрист', en: 'Corporate Lawyer' }, slug: 'corporate-lawyer' },
      { name: { ru: 'Юрист по IT-праву', en: 'IT Lawyer' }, slug: 'it-lawyer' },
      { name: { ru: 'Compliance-офицер', en: 'Compliance Officer' }, slug: 'compliance-officer' },
      { name: { ru: 'Юридический директор', en: 'General Counsel' }, slug: 'general-counsel' },
    ],
  },
  {
    name: { ru: 'Контент & Медиа', en: 'Content & Media' },
    slug: 'content',
    specializations: [
      { name: { ru: 'Копирайтер', en: 'Copywriter' }, slug: 'copywriter' },
      { name: { ru: 'Редактор', en: 'Editor' }, slug: 'editor' },
      { name: { ru: 'Технический писатель', en: 'Technical Writer' }, slug: 'technical-writer' },
      { name: { ru: 'Видеограф', en: 'Videographer' }, slug: 'videographer' },
      { name: { ru: 'Фотограф', en: 'Photographer' }, slug: 'photographer' },
      { name: { ru: 'Ведущий/Ведущая', en: 'Host / Presenter' }, slug: 'presenter' },
      { name: { ru: 'Сценарист', en: 'Scriptwriter' }, slug: 'scriptwriter' },
    ],
  },
  {
    name: { ru: 'Поддержка & Сервис', en: 'Support & Service' },
    slug: 'support',
    specializations: [
      {
        name: { ru: 'Специалист поддержки', en: 'Support Specialist' },
        slug: 'support-specialist',
      },
      { name: { ru: 'Customer Success Manager', en: 'Customer Success Manager' }, slug: 'csm' },
      { name: { ru: 'Community Manager', en: 'Community Manager' }, slug: 'community-manager' },
      {
        name: { ru: 'Операционный специалист', en: 'Operations Specialist' },
        slug: 'operations-specialist',
      },
    ],
  },
  {
    name: { ru: 'Образование', en: 'Education' },
    slug: 'education',
    specializations: [
      { name: { ru: 'Преподаватель', en: 'Teacher / Instructor' }, slug: 'teacher' },
      { name: { ru: 'Онлайн-преподаватель', en: 'Online Tutor' }, slug: 'online-tutor' },
      { name: { ru: 'Методист', en: 'Instructional Designer' }, slug: 'instructional-designer' },
      { name: { ru: 'Ментор', en: 'Mentor' }, slug: 'mentor' },
    ],
  },
  {
    name: { ru: 'Другое', en: 'Other' },
    slug: 'other',
    specializations: [{ name: { ru: 'Другое', en: 'Other' }, slug: 'other' }],
  },
]
