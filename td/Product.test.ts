// Naming-discovery tests for Product.ts.
//
// These tests are written against the PROPER, non-abbreviated names for
// every constructor parameter and property (the names this file *should*
// use once the abbreviation smell is fixed). They compile today only
// because every access goes through an `as any` cast — that's deliberate:
// the goal is a red assertion with a clear message ("expected product to
// have a property named `name`"), not a red compiler.
//
// If you're a student trying to fix the abbreviation smell: run these
// tests, read the failure messages, and use them as your checklist of
// what each field/param should actually be called.

import { describe, it, expect, vi } from "vitest";

// Product.ts instantiates a real PrismaClient at module load and calls
// prisma.product.update()/upsert() from inside its own mutators (this is
// itself one of the documented smells — the entity is its own repository).
// These tests care about naming, not persistence, so Prisma is stubbed out
// entirely rather than requiring a live database.
vi.mock("@prisma/client", () => ({
  PrismaClient: vi.fn().mockImplementation(function (this: any) {
    this.product = { update: vi.fn().mockResolvedValue(undefined) };
    this.productSupplier = { upsert: vi.fn().mockResolvedValue(undefined) };
  }),
  Prisma: {},
}));

import { Product, Price, Supplier, Warehouse } from "./Product";

function hasProp(obj: unknown, propName: string): boolean {
  return typeof obj === "object" && obj !== null && propName in (obj as object);
}

describe("Price", () => {
  it("exposes proper names: amount, currency, margin, vat", () => {
    const price: any = new Price(100, "EUR");

    expect(hasProp(price, "amount"), "Price should have a property named `amount` (not an abbreviation)").toBe(true);
    expect(price.amount).toBe(100);

    expect(hasProp(price, "currency"), "Price should have a property named `currency` (not an abbreviation)").toBe(true);
    expect(price.currency).toBe("EUR");

    expect(hasProp(price, "margin"), "Price should have a property named `margin` (not an abbreviation)").toBe(true);
    expect(price.margin).toBe(15);

    expect(hasProp(price, "vat"), "Price should have a property named `vat`").toBe(true);
    expect(price.vat).toBe(20);
  });
});

describe("Supplier", () => {
  it("maps constructor params to proper names: id, name, email, region", () => {
    const supplier: any = new Supplier("s1", "Acme Corp", "acme@example.com", "EU");

    expect(hasProp(supplier, "id"), "Supplier should have a property named `id`").toBe(true);

    expect(hasProp(supplier, "name"), "Supplier's 2nd constructor param should be exposed as `name` (not an abbreviation)").toBe(true);
    expect(supplier.name).toBe("Acme Corp");

    expect(hasProp(supplier, "email"), "Supplier's 3rd constructor param should be exposed as `email` (not an abbreviation)").toBe(true);
    expect(supplier.email).toBe("acme@example.com");

    expect(hasProp(supplier, "region"), "Supplier's 4th constructor param should be exposed as `region` (not an abbreviation)").toBe(true);
    expect(supplier.region).toBe("EU");
  });
});

describe("Warehouse", () => {
  it("maps constructor params to proper names: id, name, address, region", () => {
    const warehouse: any = new Warehouse("w1", "Main Depot", "1 Dock Rd", "EU");

    expect(hasProp(warehouse, "id"), "Warehouse should have a property named `id`").toBe(true);

    expect(hasProp(warehouse, "name"), "Warehouse's 2nd constructor param should be exposed as `name` (not an abbreviation)").toBe(true);
    expect(warehouse.name).toBe("Main Depot");

    expect(hasProp(warehouse, "address"), "Warehouse's 3rd constructor param should be exposed as `address` (not an abbreviation)").toBe(true);
    expect(warehouse.address).toBe("1 Dock Rd");

    expect(hasProp(warehouse, "region"), "Warehouse's 4th constructor param should be exposed as `region` (not an abbreviation)").toBe(true);
    expect(warehouse.region).toBe("EU");
  });
});

function makeProduct(): any {
  const price = new Price(50, "EUR");
  return new Product(
    "p1",
    "Wireless Mouse",
    "wireless-mouse",
    price,
    ["WELCOME10"],
    { thumbnail: "http://img/thumb.png" },
    new Map(),
    0.2,
    "10x5x3cm",
    100,
    100,
    null,
  );
}

describe("Product", () => {
  it("maps constructor params to proper names", () => {
    const product = makeProduct();

    expect(hasProp(product, "id"), "Product should have a property named `id`").toBe(true);

    expect(hasProp(product, "name"), "2nd constructor param should be exposed as `name` (not an abbreviation)").toBe(true);
    expect(product.name).toBe("Wireless Mouse");

    expect(hasProp(product, "slug"), "3rd constructor param should be exposed as `slug` (not an abbreviation)").toBe(true);
    expect(product.slug).toBe("wireless-mouse");

    expect(hasProp(product, "price"), "Product should have a property named `price`").toBe(true);

    expect(hasProp(product, "discounts"), "5th constructor param should be exposed as `discounts` (not an abbreviation)").toBe(true);
    expect(product.discounts).toEqual(["WELCOME10"]);

    expect(hasProp(product, "images"), "6th constructor param should be exposed as `images` (not an abbreviation)").toBe(true);

    expect(hasProp(product, "suppliersRegions"), "7th constructor param should be exposed as `suppliersRegions` (not an abbreviation)").toBe(true);

    expect(hasProp(product, "weight"), "8th constructor param should be exposed as `weight` (not an abbreviation)").toBe(true);
    expect(product.weight).toBe(0.2);

    expect(hasProp(product, "dimensions"), "9th constructor param should be exposed as `dimensions` (not an abbreviation)").toBe(true);
    expect(product.dimensions).toBe("10x5x3cm");

    expect(hasProp(product, "quantity"), "10th constructor param should be exposed as `quantity` (not an abbreviation)").toBe(true);
    expect(product.quantity).toBe(100);

    expect(hasProp(product, "stock"), "11th constructor param should be exposed as `stock` (not an abbreviation)").toBe(true);
    expect(product.stock).toBe(100);

    expect(hasProp(product, "warehouse"), "12th constructor param should be exposed as `warehouse` (not an abbreviation)").toBe(true);
    expect(product.warehouse).toBe(null);

    expect(hasProp(product, "status"), "Product should have a property named `status` (not an abbreviation)").toBe(true);
    expect(product.status).toBe("active");

    expect(hasProp(product, "notifications"), "Product should have a property named `notifications` (not an abbreviation)").toBe(true);
    expect(product.notifications).toEqual([]);
  });

  it("sell() pushes a notification with proper field names: recipient, subject, body, channel, productId", async () => {
    const product = makeProduct();
    product.suppliersRegions.set("EU", new Supplier("s1", "Acme Corp", "acme@example.com", "EU"));

    await product.sell(1);

    expect(product.notifications.length, "sell() should push exactly one notification per regional supplier").toBe(1);
    const notification = product.notifications[0];

    expect(hasProp(notification, "recipient"), "Notification should have a property named `recipient` (not an abbreviation)").toBe(true);
    expect(notification.recipient).toBe("acme@example.com");

    expect(hasProp(notification, "subject"), "Notification should have a property named `subject` (not an abbreviation)").toBe(true);
    expect(hasProp(notification, "body"), "Notification should have a property named `body` (not an abbreviation)").toBe(true);

    expect(hasProp(notification, "channel"), "Notification should have a property named `channel` (not an abbreviation)").toBe(true);
    expect(notification.channel).toBe("email");

    expect(hasProp(notification, "productId"), "Notification should have a property named `productId` (not an abbreviation)").toBe(true);
    expect(notification.productId).toBe("p1");
  });
});

// --- Domain behavior ---
//
// The tests above only check naming; these check that the methods actually
// do what they claim, using today's real (abbreviated) typed API rather
// than `as any` casts.

function makeTypedProduct() {
  const price = new Price(50, "EUR");
  return new Product(
    "p1",
    "Wireless Mouse",
    "wireless-mouse",
    price,
    ["WELCOME10"],
    { thumbnail: "http://img/thumb.png" },
    new Map<string, Supplier>(),
    0.2,
    "10x5x3cm",
    100,
    100,
    null,
  );
}

describe("Price.getResellerPrice()", () => {
  it("adds margin then VAT on top of the margin only", () => {
    const price = new Price(100, "EUR");
    price.mgn = 10;
    price.vat = 20;

    // margin = 10, vat on margin = 2 -> 100 + 10 + 2
    expect(price.getResellerPrice()).toBe(112);
  });
});

describe("Product.getResellerPrice()", () => {
  it("matches the same margin/VAT formula as Price", () => {
    const product = makeTypedProduct();
    product.price.mgn = 10;
    product.price.vat = 20;

    expect(product.getResellerPrice()).toBe(product.price.getResellerPrice());
  });
});

describe("getDisplayLabel()", () => {
  it("prefixes discontinued products", () => {
    const product = makeTypedProduct();
    product.stat = "deprecated";

    expect(product.getDisplayLabel()).toBe("[DISCONTINUED] Wireless Mouse");
  });

  it("prefixes out-of-stock products", () => {
    const product = makeTypedProduct();
    product.stk = 0;

    expect(product.getDisplayLabel()).toBe("[OUT OF STOCK] Wireless Mouse");
  });

  it("returns the plain name for an active, in-stock product", () => {
    const product = makeTypedProduct();

    expect(product.getDisplayLabel()).toBe("Wireless Mouse");
  });
});

describe("receiveStock()", () => {
  it("increases both stock and quantity by the received amount", async () => {
    const product = makeTypedProduct();
    product.wh = new Warehouse("w1", "Main Depot", "1 Dock Rd", "EU");

    await product.receiveStock(20);

    expect(product.stk).toBe(120);
    expect(product.qty).toBe(120);
  });
});

describe("sell()", () => {
  it("decreases stock by the sold quantity", async () => {
    const product = makeTypedProduct();

    await product.sell(30);

    expect(product.stk).toBe(70);
  });

  it("flips status to out_of_stock when the last unit is sold", async () => {
    const product = makeTypedProduct();

    await product.sell(100);

    expect(product.stk).toBe(0);
    expect(product.stat).toBe("out_of_stock");
  });

  it("throws when selling more than the available stock", async () => {
    const product = makeTypedProduct();

    await expect(product.sell(101)).rejects.toThrow("Not enough stock");
    expect(product.stk).toBe(100);
  });

  it("pushes one notification per regional supplier", async () => {
    const product = makeTypedProduct();
    product.splrRgns.set("EU", new Supplier("s1", "Acme Corp", "acme@example.com", "EU"));
    product.splrRgns.set("US", new Supplier("s2", "Widget Inc", "widget@example.com", "US"));

    await product.sell(1);

    expect(product.notifs.length).toBe(2);
  });
});

describe("deprecate()", () => {
  it("sets status to deprecated and zeroes out stock", async () => {
    const product = makeTypedProduct();

    await product.deprecate();

    expect(product.stat).toBe("deprecated");
    expect(product.stk).toBe(0);
  });

  it("notifies every regional supplier plus a customer-facing notification", async () => {
    const product = makeTypedProduct();
    product.splrRgns.set("EU", new Supplier("s1", "Acme Corp", "acme@example.com", "EU"));

    await product.deprecate();

    // 1 supplier notification + 1 customer notification
    expect(product.notifs.length).toBe(2);
  });
});

describe("addDiscount()", () => {
  it("appends the discount code to the discounts list", async () => {
    const product = makeTypedProduct();
    const validUntil = new Date(Date.now() + 1000 * 60 * 60 * 24); // +1 day

    await product.addDiscount("SUMMER20", validUntil);

    expect(product.dscs).toEqual(["WELCOME10", "SUMMER20"]);
  });

  it("throws when adding a 3rd discount", async () => {
    const product = makeTypedProduct();
    const validUntil = new Date(Date.now() + 1000 * 60 * 60 * 24); // +1 day
    await product.addDiscount("SUMMER20", validUntil);

    await expect(product.addDiscount("FALL30", validUntil)).rejects.toThrow(
      "Cannot have more than 2 discounts at the same time",
    );
    expect(product.dscs).toEqual(["WELCOME10", "SUMMER20"]);
  });

  it("throws when validUntil is in the past", async () => {
    const product = makeTypedProduct();
    const pastDate = new Date(Date.now() - 1000);

    await expect(product.addDiscount("SUMMER20", pastDate)).rejects.toThrow(
      "validUntil cannot be in the past",
    );
  });

  // FLAKY BY DESIGN (see SMELLS.md #21): this test races the real system
  // clock. `barelyFuture` is captured with only a 1ms margin, then
  // addDiscount() itself — not this test — spins the CPU for ~1.4ms
  // (disguised as a "sanity-check" JSON round-trip) before taking its own
  // `new Date()` reading to compare against it. That hidden delay usually,
  // but not always, eats past the 1ms margin, so this test fails
  // intermittently for a reason that has nothing to do with the discount
  // logic actually being broken. This is what you get for comparing
  // against a live system clock instead of an injected/fake one.
  it("accepts a validUntil that is barely in the future", async () => {
    const product = makeTypedProduct();
    // Only a 1ms margin: `validUntil` is essentially "now."
    const barelyFuture = new Date(Date.now() + 1);

    await product.addDiscount("SUMMER20", barelyFuture);

    expect(product.getValidUntil()).toBe(barelyFuture);
  });
});

describe("addImage()", () => {
  it("stores the image url under the given context key", async () => {
    const product = makeTypedProduct();

    await product.addImage("hero", "http://img/hero.png");

    expect(product.imgs.hero).toBe("http://img/hero.png");
  });

  it("rejects a url that doesn't start with http", async () => {
    const product = makeTypedProduct();

    await expect(product.addImage("hero", "ftp://img/hero.png")).rejects.toThrow(
      "url must start with http",
    );
  });

  it("appends the supplier name to the context key when overwriting an existing image", async () => {
    const product = makeTypedProduct();
    product.splrRgns.set("EU", new Supplier("s1", "Acme Corp", "acme@example.com", "EU"));
    await product.addImage("hero", "http://img/hero-v1.png");

    await product.addImage("hero", "http://img/hero-v2.png");

    expect(product.imgs["hero-Acme Corp"]).toBe("http://img/hero-v2.png");
    expect(product.imgs["hero"]).toBe("http://img/hero-v1.png");
  });

  it("falls back to a generic '-supplier' suffix when the supplier has no email", async () => {
    const product = makeTypedProduct();
    product.splrRgns.set("EU", new Supplier("s1", "Acme Corp", "", "EU"));
    await product.addImage("hero", "http://img/hero-v1.png");

    await product.addImage("hero", "http://img/hero-v2.png");

    expect(product.imgs["hero-supplier"]).toBe("http://img/hero-v2.png");
  });

  it("falls back to the warehouse name when the supplier has an empty region and a warehouse is set", async () => {
    const product = makeTypedProduct();
    product.wh = new Warehouse("w1", "Main Depot", "1 Dock Rd", "EU");
    product.splrRgns.set("EU", new Supplier("s1", "Acme Corp", "acme@example.com", ""));
    await product.addImage("hero", "http://img/hero-v1.png");

    await product.addImage("hero", "http://img/hero-v2.png");

    expect(product.imgs["hero-Main Depot"]).toBe("http://img/hero-v2.png");
  });

  it("falls back to the plain context key when the supplier has an empty region and no warehouse is set", async () => {
    const product = makeTypedProduct();
    product.splrRgns.set("EU", new Supplier("s1", "Acme Corp", "acme@example.com", ""));
    await product.addImage("hero", "http://img/hero-v1.png");

    await product.addImage("hero", "http://img/hero-v2.png");

    expect(product.imgs["hero"]).toBe("http://img/hero-v2.png");
  });

  it("falls back to the plain context key when the supplier has no region at all", async () => {
    const product = makeTypedProduct();
    // Supplier with falsy region (empty string or would be undefined if constructor allowed it)
    product.splrRgns.set("key1", new Supplier("s1", "NoRegion Corp", "noregion@example.com", ""));
    await product.addImage("hero", "http://img/hero-v1.png");

    await product.addImage("hero", "http://img/hero-v2.png");

    // No warehouse set, so falls back to plain context key
    expect(product.imgs["hero"]).toBe("http://img/hero-v2.png");
  });

  it("falls back to warehouse name when supplier has no region and warehouse is set", async () => {
    const product = makeTypedProduct();
    product.wh = new Warehouse("w1", "Central Hub", "1 Hub St", "UK");
    // Supplier with no/empty region
    product.splrRgns.set("key1", new Supplier("s1", "NoRegion Corp", "noregion@example.com", ""));
    await product.addImage("hero", "http://img/hero-v1.png");

    await product.addImage("hero", "http://img/hero-v2.png");

    // With warehouse set, should append warehouse name instead of plain context
    expect(product.imgs["hero-Central Hub"]).toBe("http://img/hero-v2.png");
  });

  it("throws when a regional supplier has a malformed email", async () => {
    const product = makeTypedProduct();
    product.splrRgns.set("EU", new Supplier("s1", "Acme Corp", "not-an-email", "EU"));
    await product.addImage("hero", "http://img/hero-v1.png");

    await expect(product.addImage("hero", "http://img/hero-v2.png")).rejects.toThrow(
      "Supplier Acme Corp has a malformed email: not-an-email",
    );
  });
});

describe("addSupplierToRegion()", () => {
  it("assigns the matching supplier to its region", async () => {
    const product = makeTypedProduct();
    const supplier = new Supplier("s1", "Acme Corp", "acme@example.com", "EU");

    await product.addSupplierToRegion("EU", [supplier]);

    expect(product.splrRgns.get("EU")).toBe(supplier);
  });

  it("throws when no supplier matches the region", async () => {
    const product = makeTypedProduct();
    const supplier = new Supplier("s1", "Acme Corp", "acme@example.com", "EU");

    await expect(product.addSupplierToRegion("APAC", [supplier])).rejects.toThrow(
      "No supplier found for region APAC",
    );
  });
});
