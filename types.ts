
export enum Category {
  HOME = 'HOME',
  WILLS = 'WILLS',
  REAL_ESTATE = 'REAL_ESTATE',
  POA = 'POA', // Power of Attorney
  STORE = 'STORE',
  CONTACT = 'CONTACT'
}

export const CATEGORY_LABELS: Record<Category, string> = {
  [Category.HOME]: 'ראשי',
  [Category.WILLS]: 'צוואות וירושות',
  [Category.REAL_ESTATE]: 'מקרקעין ונדל"ן',
  [Category.POA]: 'ייפוי כוח מתמשך',
  [Category.STORE]: 'חנות משפטית',
  [Category.CONTACT]: 'צור קשר'
};

export interface SliderSlide {
  id: string;
  imageUrl: string;
  title: string;
  subtitle: string;
  category: Category;
  buttonText?: string;
  buttonLink?: string;
  order?: number; // Added order field for priority sorting
}

export interface TimelineItem {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  category: Category[];
  linkTo?: string;
}

export interface ArticleTab {
  title: string;
  content: string;
}

export interface Article {
  id: string;
  categories: Category[]; // Changed from single 'category' to array 'categories'
  title: string;
  abstract: string;
  imageUrl: string;
  videoUrl?: string;
  quote?: string;
  tabs: ArticleTab[];
}

export interface TeamMember {
  id: string;
  fullName: string;
  role: string;
  specialization: string;
  email: string;
  phone: string;
  imageUrl: string;
  bio: string;
}

export interface WillsFormData {
  fullName: string;
  spouseName: string;
  childrenCount: number;
  childrenNames: string[];
  equalDistribution: boolean;
  assets: { type: string; description: string }[];
  contactEmail: string;
  contactPhone: string;
}

// New Interface for Third-Party Integrations
export interface IntegrationsConfig {
    // Database (Supabase) - The new professional solution
    supabaseUrl: string;
    supabaseKey: string;

    // AI
    geminiApiKey: string;
    
    // Images
    unsplashAccessKey: string;

    // Database (Legacy Google Sheets)
    googleSheetsUrl: string; // The Web App URL from Google Apps Script
    
    // Email (EmailJS)
    emailJsServiceId: string;
    emailJsTemplateId: string;
    emailJsPublicKey: string;

    // Payments (Stripe Links)
    stripeWillsLink: string;
    stripeRealEstateLink: string;
    stripeConsultationLink: string;
}

export interface SiteConfig {
  officeName: string;
  logoUrl: string;
  customFontData?: string; // Base64 string of the uploaded TTF file
  contactEmail: string;
  willsEmail: string;
  poaEmail: string;
  phone: string;
  address: string;
  theme: 'dark' | 'light';
  adminPassword?: string; // Simple local password
  integrations: IntegrationsConfig; // Add integrations to config
}

export interface MenuItem {
    id: string;
    label: string;
    cat: Category;
}

export type FieldType = 'text' | 'email' | 'phone' | 'number' | 'boolean' | 'select' | 'repeater';

export interface FormField {
    id: string;
    type: FieldType;
    label: string;
    options?: string[];
    required: boolean;
    helpArticleId?: string;
}

export interface FormDefinition {
    id: string;
    title: string;
    category: Category;
    fields: FormField[];
    submitEmail: string;
}

export interface AppState {
  currentCategory: Category;
  config: SiteConfig;
  slides: SliderSlide[];
  timelines: TimelineItem[];
  articles: Article[];
  menuItems: MenuItem[];
  forms: FormDefinition[];
  teamMembers: TeamMember[];
  isAdminLoggedIn: boolean;
}