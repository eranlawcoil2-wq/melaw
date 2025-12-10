
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
  order?: number; 
}

export interface TimelineItem {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  category: Category[];
  linkTo?: string;
  order?: number; 
  tabs?: ArticleTab[]; // Added tabs support like articles
}

export interface ArticleTab {
  title: string;
  content: string;
}

export interface Article {
  id: string;
  categories: Category[]; 
  title: string;
  abstract: string;
  imageUrl: string;
  videoUrl?: string;
  quote?: string;
  tabs: ArticleTab[];
  order?: number; // Added order
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
  order?: number; // Added order
}

export interface Product {
    id: string;
    title: string;
    description?: string;
    price: number;
    paymentLink: string; 
    categories: Category[]; 
    imageUrl?: string;
    isPopular?: boolean;
    order?: number; // Added order
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
    // Database (Supabase)
    supabaseUrl: string;
    supabaseKey: string;

    // AI
    geminiApiKey: string;
    
    // Images
    unsplashAccessKey: string;

    // Database (Legacy Google Sheets)
    googleSheetsUrl: string; 
    
    // Email (EmailJS)
    emailJsServiceId: string;
    emailJsTemplateId: string;
    emailJsPublicKey: string;

    // Payment Links (Stripe)
    stripeWillsLink?: string;
    stripeRealEstateLink?: string;
    stripeConsultationLink?: string;
}

export interface SiteConfig {
  officeName: string;
  logoUrl: string;
  customFontData?: string; 
  contactEmail: string;
  willsEmail: string;
  poaEmail: string;
  phone: string;
  address: string;
  theme: 'dark' | 'light';
  adminPassword?: string; 
  integrations: IntegrationsConfig; 
  
  // New V2.0 Fields
  defaultCategory?: Category;
  passwordHint?: string;
}

export interface MenuItem {
    id: string;
    label: string;
    cat: Category;
    order?: number;
}

export type FieldType = 'text' | 'email' | 'phone' | 'number' | 'boolean' | 'select' | 'repeater';

export interface FormField {
    id: string;
    type: FieldType;
    label: string;
    options?: string[];
    required: boolean;
    helpArticleId?: string; // LINK TO ARTICLE FOR HELP
}

export interface FormDefinition {
    id: string;
    title: string;
    categories: Category[]; 
    fields: FormField[];
    submitEmail: string;
    pdfTemplate?: 'NONE' | 'WILL' | 'POA'; 
    order?: number; // Added order
}

export interface AppState {
  currentCategory: Category;
  config: SiteConfig;
  slides: SliderSlide[];
  timelines: TimelineItem[]; // Used for "News & Updates"
  articles: Article[];
  menuItems: MenuItem[];
  forms: FormDefinition[];
  teamMembers: TeamMember[];
  products: Product[]; 
  isAdminLoggedIn: boolean;
  lastUpdated?: string; 
}
