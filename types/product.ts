export type CatalogVariant = {
  id: string;
  title: string;
  price: string;
  inventoryQuantity?: number;
  availableForSale: boolean;
};

export type CatalogProduct = {
  id: string;
  name: string;
  vendor: string;
  price: number;
  stock: number;
  color?: string;
  emoji?: string;
  image?: string | null;
  available: boolean;
  variants?: CatalogVariant[];
};

export type ProductPage = {
  products: CatalogProduct[];
  nextCursor: string | null;
};
