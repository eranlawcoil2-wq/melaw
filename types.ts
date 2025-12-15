
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
  categories: Category[]; // CHANGED: From single category to array
  buttonText?: string;
  linkTo?: string; 
  order?: number; 
}

export interface TimelineItem {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  category: Category[]; // Ensure this is Array
  linkTo?: string;
  order?: number; 
  tabs?: ArticleTab[]; 
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
  order?: number; 
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
  order?: number; 
}

export interface Product {
    id: string;
    title: string;
    description?: string;
    price: number;
    installments?: string; 
    paymentLink: string; 
    categories: Category[]; 
    imageUrl?: string;
    isPopular?: boolean;
    tags?: string[]; // ADDED: Tags for filtering
    order?: number; 
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

export interface IntegrationsConfig {
    supabaseUrl: string;
    supabaseKey: string;
    geminiApiKey: string;
    unsplashAccessKey: string;
    googleSheetsUrl: string; 
    emailJsServiceId: string;
    emailJsTemplateId: string;
    emailJsPublicKey: string;
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
  fax?: string; 
  whatsapp?: string; 
  address: string;
  theme: 'dark' | 'light';
  adminPassword?: string; 
  integrations: IntegrationsConfig; 
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
    helpArticleId?: string; 
    isClientEmail?: boolean; // NEW: Marks this field as the destination email
}

export interface FormDefinition {
    id: string;
    title: string;
    categories: Category[]; 
    fields: FormField[];
    submitEmail: string; 
    sendClientEmail?: boolean; 
    pdfTemplate?: 'NONE' | 'WILL' | 'POA'; 
    order?: number;
    emailSubject?: string;
    emailBody?: string;
}

// --- NEW CALCULATOR TYPES ---
export interface TaxBracket {
    id: string;
    threshold: number; // The "Up to" amount
    rate: number; // The percentage (e.g. 3.5)
}

export interface TaxScenario {
    id: string;
    title: string; // e.g. "Single Apartment", "Additional Apartment"
    brackets: TaxBracket[]; // Sorted by threshold
}

export interface CalculatorDefinition {
    id: string;
    title: string;
    categories: Category[];
    scenarios: TaxScenario[];
    order?: number;
}
// ----------------------------

export interface AppState {
  currentCategory: Category;
  config: SiteConfig;
  slides: SliderSlide[];
  timelines: TimelineItem[]; 
  articles: Article[];
  menuItems: MenuItem[];
  forms: FormDefinition[];
  calculators: CalculatorDefinition[]; // ADDED
  teamMembers: TeamMember[];
  products: Product[];
  lastUpdated: string;
  isAdminLoggedIn: boolean;
}
