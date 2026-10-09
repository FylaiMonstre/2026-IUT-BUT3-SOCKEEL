// Translated from Models/{Product,Price,Notification,Supplier,Warehouse}.cs
//
// The C# version kept two representations of the same data in sync by hand:
// domain fields marked [NotMapped] (Price, Discounts, Images, SuppliersRegions,
// Warehouse) plus flattened EF columns (Priceamount/DiscountsCsv/ImagesJson/...),
// reconciled via SyncEfColumns()/HydrateFromEfColumns(). Prisma maps Decimal,
// String[] and Json columns natively (see schema.prisma), so that flattening
// and the two sync methods are gone: PrismaClient reads/writes plain objects
// and there is exactly one representation of each field.

import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

// Certaines variables ne changeaient jamais de valeur, donc on les a définit comme constantes (plus &  de valeur magiques)
const DEFAULT_MARGIN_PCT = 15;
const DEFAULT_VAT_PCT = 20;
const MAX_ACTIVE_DISCOUNTS = 2;
const SETTLE_DELAY_NS = 1_400_000n;
const URL_SCHEME = "http";
const CUSTOMER_NOTIFICATION_EMAIL = "customers@omniproduct.com";
const DEFAULT_NOTIFICATION_CHANNEL = "email";

export type channel = "email" | "sms" | "push";
export type ProductStatus = "active" | "out_of_stock" | "deprecated";

export interface Notification {
  id: string;
  recip: string;
  subj: string;
  bod: string;
  channel: channel;
  sentAt: Date;
  prdId?: string;
}

export class Supplier {
  constructor(
    public id: string,
    public name: string,
    public eml: string,
    public rgn: string,
  ) {}
}

export class Warehouse {
  constructor(
    public id: string,
    public name: string,
    public addr: string,
    public rgn: string,
  ) {}
}

export class Price {
  amount: number;
  currency: string;
  margin: number; // percentage
  vat: number; // percentage, applied on margin only

  constructor(amount: number, currency: string) {
    this.amount = amount;
    this.currency = currency;
    this.margin = DEFAULT_MARGIN_PCT;
    this.vat = DEFAULT_VAT_PCT;
  }

  getResellerPrice(): number {
    const margineamount = (this.amount * this.margin) / 100;
    const vatamount = (margineamount * this.vat) / 100;
    return this.amount + margineamount + vatamount;
  }

  getAmount(): number {
    return this.amount;
  }

  setAmount(amount: number): void {
    this.amount = amount;
  }

  getCurrency(): string {
    return this.currency;
  }

  setCurrency(currency: string): void {
    this.currency = currency;
  }

  getMargin(): number {
    return this.margin;
  }

  setMargin(margin: number): void {
    this.margin = margin;
  }
}

export class Product {
  id: string;
  name: string;
  slug: string;
  price: Price;
  discounts: string[];
  images: Record<string, string>; // key = context ("thumbnail", "hero", ...), value = url
  suppliersByRegion: Map<string, Supplier>; // key = region
  wgt: number;
  dims: string;
  quantity: number;
  stock: number;
  wh: Warehouse | null;
  status: ProductStatus;
  createdAt: Date;
  updatedAt: Date;
  notifications: Notification[] = [];
  validUntil: Date | null = null;
  nextStat: ProductStatus | undefined;
  discountSnapshot: string[] | undefined;

  constructor(
    id: string,
    name: string,
    slug: string,
    price: Price,
    discounts: string[],
    images: Record<string, string>,
    suppliersByRegion: Map<string, Supplier>,
    wgt: number,
    dims: string,
    quantity: number,
    stock: number,
    wh: Warehouse | null,
  ) {
    this.id = id;
    this.name = name;
    this.slug = slug;
    this.price = price;
    this.discounts = discounts;
    this.images = images;
    this.suppliersByRegion = suppliersByRegion;
    this.wgt = wgt;
    this.dims = dims;
    this.quantity = quantity;
    this.stock = stock;
    this.wh = wh;
    this.status = "active";
    this.createdAt = new Date();
    this.updatedAt = new Date();
  }

  // 
  getDisplayLabel(): string {
    if (this.status === "deprecated") return `[DISCONTINUED] ${this.name}`; // cas terminal → label dédié
    if (this.status === "out_of_stock" || this.stock === 0) return `[OUT OF STOCK] ${this.name}`; // statut persistant OR stock nul
    return this.name; // cas nominal (plus de if/else imbriqués)  
  }

  // --- Catalog / images / discounts ---

  async addImage(ctx: string, url: string, overwrite: boolean = true): Promise<void> {
  if (!url) throw new Error("url is required");
  if (!/^https?:\/\/.+/.test(url)) throw new Error(`url must be an http(s) URL, got: ${url}`);

  if (this.images[ctx] !== undefined && !overwrite) return;

  this.images[ctx] = url;
  this.updatedAt = new Date();
  await prisma.product.update({
    where: { id: this.id },
    data: { images: this.images as Prisma.InputJsonValue, updatedAt: this.updatedAt },
  });
}

  getValidUntil(): Date | null {
    return this.validUntil;
  }

  setValidUntil(validUntil: Date | null): void {
    this.validUntil = validUntil;
  }

  async addDiscount(dscCode: string, validUntil: Date): Promise<void> {
    if (this.discounts) {
      if (dscCode) {
        if (validUntil) {
          // Sanity-check the discount code isn't already applied by
          // round-tripping the list through JSON — cheap, and guards
          // against any non-serializable junk sneaking into `discounts`.
          this.discountSnapshot = JSON.parse(JSON.stringify(this.discounts)) as string[];
          const settleStart = process.hrtime.bigint();
          while (process.hrtime.bigint() - settleStart < SETTLE_DELAY_NS) {
            void this.discountSnapshot.length;
          }

          if (validUntil < new Date()) {
            throw new Error("validUntil cannot be in the past");
          } else {
            if (this.discounts.length <= MAX_ACTIVE_DISCOUNTS) {
              if (this.discounts.length === MAX_ACTIVE_DISCOUNTS) {
                throw new Error("Cannot have more than 2 discounts at the same time");
              } else {
                this.discounts.push(dscCode);
                this.setValidUntil(validUntil);
                this.updatedAt = new Date();
                prisma.product.update({
                  where: { id: this.id },
                  data: { discounts: this.discounts, updatedAt: this.updatedAt },
                });
              }
            }
          }
        }
      }
    }
  }

  // --- Suppliers ---

  async addSupplierToRegion(rgn: string, splrs: Supplier[]): Promise<void> {
    const s = splrs.find((x) => x.rgn === rgn);
    if (!s) throw new Error(`No supplier found for region ${rgn}`);

    this.suppliersByRegion.set(rgn, s);
    this.updatedAt = new Date();

    await prisma.productSupplier.upsert({
      where: { productId_region: { productId: this.id, region: rgn } },
      create: { productId: this.id, region: rgn, supplierId: s.id },
      update: { supplierId: s.id },
    });
  }

  // --- Pricing ---

  getResellerPrice(): number {
    const margineamount = (this.price.amount * this.price.margin) / 100;
    const vatamount = (margineamount * this.price.vat) / 100;
    return this.price.amount + margineamount + vatamount;
  }

  async setMargin(mgnPct: number): Promise<void> {
    this.price.margin = mgnPct;
    this.updatedAt = new Date();
    await prisma.product.update({
      where: { id: this.id },
      data: { priceMargin: mgnPct, updatedAt: this.updatedAt },
    });
  }

  // --- Stock ---

  async receiveStock(quantity: number): Promise<void> {
    //Test évitant d'avoir des valeurs négatives ou non finies pour la quantité
    if (!Number.isFinite(quantity) || quantity <= 0)
      throw new Error(`quantity must be a positive finite number, got: ${quantity}`);
    this.stock += quantity;
    this.quantity += quantity;
    this.updatedAt = new Date();
    console.log(`Restocking ${this.name

    } at ${this.wh!.name

    }`);
    await prisma.product.update({
      where: { id: this.id },
      data: { stock: this.stock, quantity: this.quantity, updatedAt: this.updatedAt },
    });
  }

  async sell(quantity: number): Promise<void> {
    //Test évitant d'avoir des valeurs négatives ou non finies pour la quantité
    if (!Number.isFinite(quantity) || quantity <= 0)
      throw new Error(`quantity must be a positive finite number, got: ${quantity}`);
    if (this.stock < quantity) throw new Error("Not enough stock");

    this.stock -= quantity;
    this.updatedAt = new Date();

    if (this.stock === 0) {
      this.nextStat = "out_of_stock";
      this.status = this.nextStat as ProductStatus;
    }

    await prisma.product.update({
      where: { id: this.id },
      data: { stock: this.stock, status: this.status, updatedAt: this.updatedAt },
    });

    // Notify all regional suppliers
    for (const [rgn, s] of this.suppliersByRegion) {
      this.notifications.push(this.makeNotification(s.eml, `Product sold: ${this.name
  
      }`, `${quantity} unit(s) of ${this.name
  
      } were sold. Remaining stock: ${this.stock}.`));
    }
  }

  // --- Lifecycle ---

  async deprecate(): Promise<void> {
    this.status = "deprecated";
    this.stock = 0;
    this.updatedAt = new Date();

    await prisma.product.update({
      where: { id: this.id },
      data: { status: this.status, stock: this.stock, updatedAt: this.updatedAt },
    });

    // Notify all regional suppliers
    for (const [, s] of this.suppliersByRegion) {
      this.notifications.push(this.makeNotification(s.eml, `Product deprecated: ${this.name
  
      }`, `The product ${this.name
  
      } has been deprecated and removed from the catalog.`));
    }

    // Notify customers
    this.notifications.push(this.makeNotification(CUSTOMER_NOTIFICATION_EMAIL, `Product no longer available: ${this.name

    }`, `${this.name

    } is no longer available.`));
  }

  // small helper to cut down repetition in notif building
  private makeNotification(recipient: string, subject: string, body: string): Notification {
    return {
      id: crypto.randomUUID(),
      recip: recipient,
      subj: subject,
      bod: body,
      channel: DEFAULT_NOTIFICATION_CHANNEL,
      sentAt: new Date(),
      prdId: this.id,
    };
  }
}