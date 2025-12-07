
export enum Category {
  HOME = 'HOME',
  WILLS = 'WILLS',
  REAL_ESTATE = 'REAL_ESTATE',
  POA = 'POA', // Power of Attorney
  STORE = 'STORE',
  CONTACT = 'CONTACT'
}

export interface SliderSlide {
  id: string;
  imageUrl: string;
  title: string;
  subtitle: string;
  category: Category;
}

export interface TimelineItem {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  category: Category[];
  linkTo?: string; // Could be an internal ID or external link
}

export interface ArticleTab {
  title: string;
  content: string;
}

export interface Article {
  id: string;
  category: Category;
  title: string;
  abstract: string;
  imageUrl: string;
  videoUrl?: string;
  quote?: string;
  tabs: ArticleTab[];
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

export interface SiteConfig {
  officeName: string;
  logoUrl: string; // Placeholder or uploaded
  contactEmail: string;
  willsEmail: string;
  poaEmail: string;
  phone: string;
  address: string;
}

export interface MenuItem {
    id: string;
    label: string;
    cat: Category;
}

// --- Dynamic Form Types ---
export type FieldType = 'text' | 'email' | 'phone' | 'number' | 'boolean' | 'select' | 'repeater';

export interface FormField {
    id: string;
    type: FieldType;
    label: string;
    options?: string[]; // For 'select' type
    required: boolean;
}

export interface FormDefinition {
    id: string;
    title: string;
    category: Category;
    fields: FormField[];
    submitEmail: string; // Where to send the result
}

// Global State Interface
export interface AppState {
  currentCategory: Category;
  config: SiteConfig;
  slides: SliderSlide[];
  timelines: TimelineItem[];
  articles: Article[];
  menuItems: MenuItem[];
  forms: FormDefinition[];
  // Simple auth simulation
  isAdminLoggedIn: boolean;
}
