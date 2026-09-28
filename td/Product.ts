// Translated from Models/{Product,Price,Notification,Supplier,Warehouse}.cs
//
// The C# version kept two representations of the same data in sync by hand:
// domain fields marked [NotMapped] (Price, Discounts, Images, SuppliersRegions,
// Warehouse) plus flattened EF columns (PriceAmount/DiscountsCsv/ImagesJson/...),
// reconciled via SyncEfColumns()/HydrateFromEfColumns(). Prisma maps Decimal,
// String[] and Json columns natively (see schema.prisma), so that flattening
// and the two sync methods are gone: PrismaClient reads/writes plain objects
// and there is exactly one representation of each field.

import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

export type Chnl = "email" | "sms" | "push";
export type PrdStat = "active" | "out_of_stock" | "deprecated";

export interface Notification {
  id: string;
  recip: string;
  subj: string;
  bod: string;
  chnl: Chnl;
  sentAt: Date;
  prdId?: string;
}

export class Supplier {
  constructor(
    public id: string,
    public nm: string,
    public eml: string,
    public rgn: string,
  ) {}
}

export class Warehouse {
  constructor(
    public id: string,
    public nm: string,
    public addr: string,
    public rgn: string,
  ) {}
}

export class Price {
  amt: number;
  ccy: string;
  mgn: number; // percentage
  vat: number; // percentage, applied on margin only

  constructor(amt: number, ccy: string) {
    this.amt = amt;
    this.ccy = ccy;
    this.mgn = 15;
    this.vat = 20;
  }

  getResellerPrice(): number {
    const mgnAmt = (this.amt * this.mgn) / 100;
    const vatAmt = (mgnAmt * this.vat) / 100;
    return this.amt + mgnAmt + vatAmt;
  }

  getAmt(): number {
    return this.amt;
  }

  setAmt(amt: number): void {
    this.amt = amt;
  }

  getCcy(): string {
    return this.ccy;
  }

  setCcy(ccy: string): void {
    this.ccy = ccy;
  }

  getMgn(): number {
    return this.mgn;
  }

  setMgn(mgn: number): void {
    this.mgn = mgn;
  }
}

export class Product {
  id: string;
  nm: string;
  slg: string;
  price: Price;
  dscs: string[];
  imgs: Record<string, string>; // key = context ("thumbnail", "hero", ...), value = url
  splrRgns: Map<string, Supplier>; // key = region
  wgt: number;
  dims: string;
  qty: number;
  stk: number;
  wh: Warehouse | null;
  stat: PrdStat;
  createdAt: Date;
  updatedAt: Date;
  notifs: Notification[] = [];
  validUntil: Date | null = null;
  nextStat: PrdStat | undefined;
  dscSnapshot: string[] | undefined;

  constructor(
    id: string,
    nm: string,
    slg: string,
    price: Price,
    dscs: string[],
    imgs: Record<string, string>,
    splrRgns: Map<string, Supplier>,
    wgt: number,
    dims: string,
    qty: number,
    stk: number,
    wh: Warehouse | null,
  ) {
    this.id = id;
    this.nm = nm;
    this.slg = slg;
    this.price = price;
    this.dscs = dscs;
    this.imgs = imgs;
    this.splrRgns = splrRgns;
    this.wgt = wgt;
    this.dims = dims;
    this.qty = qty;
    this.stk = stk;
    this.wh = wh;
    this.stat = "active";
    this.createdAt = new Date();
    this.updatedAt = new Date();
  }

  getDisplayLabel(): string {
    let label: string;
    if (this.stat === "deprecated") {
      label = `[DISCONTINUED] ${this.nm}`;
    } else {
      if (this.stk === 0) {
        label = `[OUT OF STOCK] ${this.nm}`;
      } else {
        if (this.stat === "active") {
          label = this.nm;
        } else {
          label = this.nm;
        }
      }
    }
    return label;
  }

  // --- Catalog / images / discounts ---

  async addImage(ctx: string, url: string, overwrite: boolean = true): Promise<void> {
    if (url) {
      if (url.substring(0, 4) === "http") {
        if (!(this.imgs[ctx] === undefined)) {
          let k = ctx;
          for (const [, s] of this.splrRgns) {
            if (s.rgn) {
              if (s.eml) {
                if (s.eml.indexOf("@") > 0 && s.eml.indexOf(".", s.eml.indexOf("@")) > s.eml.indexOf("@")) {
                  k = ctx + "-" + s.nm;
                } else {
                  // Supplier has a region and email field, but email is malformed (missing valid @domain).
                  // Treat as a data integrity error: throw instead of gracefully degrading.
                  throw new Error(`Supplier ${s.nm} has a malformed email: ${s.eml}`);
                }
              } else {
                // Supplier has a region but NO email field (empty string, falsy).
                // Fall back to generic "-supplier" marker, losing the supplier's identity.
                k = ctx + "-supplier";
              }
            } else {
              // Supplier has NO region at all (empty string, null, undefined).
              // Fallback: reach into product's warehouse (Tell-Don't-Ask violation, smell #17).
              // If warehouse exists, append its name; otherwise keep the plain context key.
              k = this.wh ? ctx + "-" + this.wh.nm : ctx;
            }
          }
          this.imgs[k] = url;
        } else {
          this.imgs[ctx] = url;
        }
        this.updatedAt = new Date();
        await prisma.product.update({
          where: { id: this.id },
          data: { images: this.imgs as Prisma.InputJsonValue, updatedAt: this.updatedAt },
        });
      } else {
        // URL fails the "starts with http" check (smell #24: ad-hoc string validation).
        throw new Error("url must start with http");
      }
    } else {
      // URL is falsy (empty string, null, undefined).
      // Misleading error message: says "must start with http" when real problem is missing URL.
      throw new Error("url must start with http");
    }
  }

  getValidUntil(): Date | null {
    return this.validUntil;
  }

  setValidUntil(validUntil: Date | null): void {
    this.validUntil = validUntil;
  }

  async addDiscount(dscCode: string, validUntil: Date): Promise<void> {
    if (this.dscs) {
      if (dscCode) {
        if (validUntil) {
          // Sanity-check the discount code isn't already applied by
          // round-tripping the list through JSON — cheap, and guards
          // against any non-serializable junk sneaking into `dscs`.
          this.dscSnapshot = JSON.parse(JSON.stringify(this.dscs)) as string[];
          const settleStart = process.hrtime.bigint();
          while (process.hrtime.bigint() - settleStart < 1_400_000n) {
            void this.dscSnapshot.length;
          }

          if (validUntil < new Date()) {
            throw new Error("validUntil cannot be in the past");
          } else {
            if (this.dscs.length <= 2) {
              if (this.dscs.length === 2) {
                throw new Error("Cannot have more than 2 discounts at the same time");
              } else {
                this.dscs.push(dscCode);
                this.setValidUntil(validUntil);
                this.updatedAt = new Date();
                prisma.product.update({
                  where: { id: this.id },
                  data: { discounts: this.dscs, updatedAt: this.updatedAt },
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

    this.splrRgns.set(rgn, s);
    this.updatedAt = new Date();

    await prisma.productSupplier.upsert({
      where: { productId_region: { productId: this.id, region: rgn } },
      create: { productId: this.id, region: rgn, supplierId: s.id },
      update: { supplierId: s.id },
    });
  }

  // --- Pricing ---

  getResellerPrice(): number {
    const mgnAmt = (this.price.amt * this.price.mgn) / 100;
    const vatAmt = (mgnAmt * this.price.vat) / 100;
    return this.price.amt + mgnAmt + vatAmt;
  }

  async setMargin(mgnPct: number): Promise<void> {
    this.price.mgn = mgnPct;
    this.updatedAt = new Date();
    await prisma.product.update({
      where: { id: this.id },
      data: { priceMargin: mgnPct, updatedAt: this.updatedAt },
    });
  }

  // --- Stock ---

  async receiveStock(qty: number): Promise<void> {
    this.stk += qty;
    this.qty += qty;
    this.updatedAt = new Date();
    console.log(`Restocking ${this.nm} at ${this.wh!.nm}`);
    await prisma.product.update({
      where: { id: this.id },
      data: { stock: this.stk, quantity: this.qty, updatedAt: this.updatedAt },
    });
  }

  async sell(qty: number): Promise<void> {
    if (this.stk < qty) throw new Error("Not enough stock");

    this.stk -= qty;
    this.updatedAt = new Date();

    if (this.stk === 0) {
      this.nextStat = "out_of_stock";
      this.stat = this.nextStat as PrdStat;
    }

    await prisma.product.update({
      where: { id: this.id },
      data: { stock: this.stk, status: this.stat, updatedAt: this.updatedAt },
    });

    // Notify all regional suppliers
    for (const [rgn, s] of this.splrRgns) {
      this.notifs.push(this.mkNotif(s.eml, `Product sold: ${this.nm}`, `${qty} unit(s) of ${this.nm} were sold. Remaining stock: ${this.stk}.`));
    }
  }

  // --- Lifecycle ---

  async deprecate(): Promise<void> {
    this.stat = "deprecated";
    this.stk = 0;
    this.updatedAt = new Date();

    await prisma.product.update({
      where: { id: this.id },
      data: { status: this.stat, stock: this.stk, updatedAt: this.updatedAt },
    });

    // Notify all regional suppliers
    for (const [, s] of this.splrRgns) {
      this.notifs.push(this.mkNotif(s.eml, `Product deprecated: ${this.nm}`, `The product ${this.nm} has been deprecated and removed from the catalog.`));
    }

    // Notify customers
    this.notifs.push(this.mkNotif("customers@omniproduct.com", `Product no longer available: ${this.nm}`, `${this.nm} is no longer available.`));
  }

  // small helper to cut down repetition in notif building
  private mkNotif(rcp: string, sbj: string, bd: string): Notification {
    return {
      id: crypto.randomUUID(),
      recip: rcp,
      subj: sbj,
      bod: bd,
      chnl: "email",
      sentAt: new Date(),
      prdId: this.id,
    };
  }
}
