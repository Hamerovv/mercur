import {
  CreateInventoryLevelInput,
  ExecArgs,
  IAuthModuleService,
} from "@medusajs/framework/types";
import {
  ContainerRegistrationKeys,
  Modules,
  ProductStatus,
} from "@medusajs/framework/utils";
import {
  createWorkflow,
  transform,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk";
import {
  createApiKeysWorkflow,
  createInventoryLevelsWorkflow,
  createProductCategoriesWorkflow,
  createProductsWorkflow,
  createRegionsWorkflow,
  createSalesChannelsWorkflow,
  createShippingOptionsWorkflow,
  createShippingProfilesWorkflow,
  createStockLocationsWorkflow,
  createTaxRegionsWorkflow,
  linkSalesChannelsToApiKeyWorkflow,
  linkSalesChannelsToStockLocationWorkflow,
  updateStoresStep,
  updateStoresWorkflow,
} from "@medusajs/medusa/core-flows";
import { ApiKey } from "../../.medusa/types/query-entry-points";
import { MercurModules, SellerRole, SellerStatus } from "@mercurjs/types";
import {
  createSellerDefaultsWorkflow,
  createSellerShippingOptionsWorkflow,
  createSellerShippingProfilesWorkflow,
} from "@mercurjs/core/workflows";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const scryptKdf = require("scrypt-kdf");

async function hashPassword(password: string): Promise<string> {
  const hash = await scryptKdf.kdf(password, { logN: 15, r: 8, p: 1 });
  return hash.toString("base64");
}

const updateStoreCurrencies = createWorkflow(
  "update-store-currencies",
  (input: {
    supported_currencies: { currency_code: string; is_default?: boolean }[];
    store_id: string;
  }) => {
    const normalizedInput = transform({ input }, (data) => {
      return {
        selector: { id: data.input.store_id },
        update: {
          supported_currencies: data.input.supported_currencies.map(
            (currency) => {
              return {
                currency_code: currency.currency_code,
                is_default: currency.is_default ?? false,
              };
            }
          ),
        },
      };
    });

    const stores = updateStoresStep(normalizedInput);

    return new WorkflowResponse(stores);
  }
);

export default async function seedDemoData({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const link = container.resolve(ContainerRegistrationKeys.LINK);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);
  const fulfillmentModuleService = container.resolve(Modules.FULFILLMENT);
  const salesChannelModuleService = container.resolve(Modules.SALES_CHANNEL);
  const storeModuleService = container.resolve(Modules.STORE);

  const countries = ["gb", "de", "dk", "se", "fr", "es", "it"];

  logger.info("Seeding store data...");
  const [store] = await storeModuleService.listStores();
  let defaultSalesChannel = await salesChannelModuleService.listSalesChannels({
    name: "Default Sales Channel",
  });

  if (!defaultSalesChannel.length) {
    const { result: salesChannelResult } = await createSalesChannelsWorkflow(
      container
    ).run({
      input: {
        salesChannelsData: [
          {
            name: "Default Sales Channel",
          },
        ],
      },
    });
    defaultSalesChannel = salesChannelResult;
  }

  await updateStoreCurrencies(container).run({
    input: {
      store_id: store.id,
      supported_currencies: [
        {
          currency_code: "eur",
          is_default: true,
        },
        {
          currency_code: "usd",
        },
      ],
    },
  });

  await updateStoresWorkflow(container).run({
    input: {
      selector: { id: store.id },
      update: {
        default_sales_channel_id: defaultSalesChannel[0].id,
      },
    },
  });
  logger.info("Seeding region data...");
  const regionModuleService = container.resolve(Modules.REGION);

  const existingRegions = await regionModuleService.listRegions({}, {
    relations: ["countries"],
  });

  const assignedCountries = new Set<string>();
  for (const r of existingRegions) {
    for (const c of r.countries || []) {
      assignedCountries.add(c.iso_2);
    }
  }

  const unassignedCountries = countries.filter(c => !assignedCountries.has(c));

  let region;
  if (unassignedCountries.length === 0) {
    region = existingRegions.find(r =>
      r.countries?.some(c => countries.includes(c.iso_2))
    ) || existingRegions[0];
    logger.info("Countries already assigned to a region, skipping region creation.");
  } else if (unassignedCountries.length < countries.length) {
    logger.info(`Some countries already assigned, creating region with: ${unassignedCountries.join(", ")}`);
    const { result: regionResult } = await createRegionsWorkflow(container).run({
      input: {
        regions: [
          {
            name: "Europe",
            currency_code: "eur",
            countries: unassignedCountries,
            payment_providers: ["pp_system_default"],
          },
        ],
      },
    });
    region = regionResult[0];
  } else {
    const { result: regionResult } = await createRegionsWorkflow(container).run({
      input: {
        regions: [
          {
            name: "Europe",
            currency_code: "eur",
            countries,
            payment_providers: ["pp_system_default"],
          },
        ],
      },
    });
    region = regionResult[0];
  }
  logger.info("Finished seeding regions.");

  logger.info("Seeding tax regions...");
  const taxModuleService = container.resolve(Modules.TAX);
  const existingTaxRegions = await taxModuleService.listTaxRegions();
  const existingCountryCodes = new Set(existingTaxRegions.map((tr) => tr.country_code));
  const countriesToCreate = countries.filter((c) => !existingCountryCodes.has(c));

  if (countriesToCreate.length > 0) {
    await createTaxRegionsWorkflow(container).run({
      input: countriesToCreate.map((country_code) => ({
        country_code,
        provider_id: "tp_system",
      })),
    });
  } else {
    logger.info("Tax regions already exist, skipping.");
  }
  logger.info("Finished seeding tax regions.");

  logger.info("Seeding stock location data...");
  const stockLocationModule = container.resolve(Modules.STOCK_LOCATION);
  const existingStockLocations = await stockLocationModule.listStockLocations({
    name: "European Warehouse",
  });

  let stockLocation;
  if (existingStockLocations.length) {
    stockLocation = existingStockLocations[0];
    logger.info("Stock location 'European Warehouse' already exists, skipping.");
  } else {
    const { result: stockLocationResult } = await createStockLocationsWorkflow(
      container
    ).run({
      input: {
        locations: [
          {
            name: "European Warehouse",
            address: {
              city: "Copenhagen",
              country_code: "DK",
              address_1: "",
            },
          },
        ],
      },
    });
    stockLocation = stockLocationResult[0];
  }

  await updateStoresWorkflow(container).run({
    input: {
      selector: { id: store.id },
      update: {
        default_location_id: stockLocation.id,
      },
    },
  });

  try {
    await link.create({
      [Modules.STOCK_LOCATION]: {
        stock_location_id: stockLocation.id,
      },
      [Modules.FULFILLMENT]: {
        fulfillment_provider_id: "manual_manual",
      },
    });
  } catch (error: unknown) {
    if (!(error instanceof Error && error.message.includes("already exists"))) {
      throw error;
    }
    logger.info("Stock location already linked to fulfillment provider, skipping.");
  }

  logger.info("Seeding fulfillment data...");
  const shippingProfiles = await fulfillmentModuleService.listShippingProfiles({
    type: "default",
  });
  let shippingProfile = shippingProfiles.length ? shippingProfiles[0] : null;

  if (!shippingProfile) {
    const { result: shippingProfileResult } =
      await createShippingProfilesWorkflow(container).run({
        input: {
          data: [
            {
              name: "Default Shipping Profile",
              type: "default",
            },
          ],
        },
      });
    shippingProfile = shippingProfileResult[0];
  }

  const existingFulfillmentSets = await fulfillmentModuleService.listFulfillmentSets({
    name: "European Warehouse delivery",
  });

  let fulfillmentSet;
  if (existingFulfillmentSets.length) {
    fulfillmentSet = existingFulfillmentSets[0];
    logger.info("Fulfillment set 'European Warehouse delivery' already exists, skipping.");
  } else {
    fulfillmentSet = await fulfillmentModuleService.createFulfillmentSets({
      name: "European Warehouse delivery",
      type: "shipping",
      service_zones: [
        {
          name: "Europe",
          geo_zones: [
            { country_code: "gb", type: "country" },
            { country_code: "de", type: "country" },
            { country_code: "dk", type: "country" },
            { country_code: "se", type: "country" },
            { country_code: "fr", type: "country" },
            { country_code: "es", type: "country" },
            { country_code: "it", type: "country" },
          ],
        },
      ],
    });

    try {
      await link.create({
        [Modules.STOCK_LOCATION]: {
          stock_location_id: stockLocation.id,
        },
        [Modules.FULFILLMENT]: {
          fulfillment_set_id: fulfillmentSet.id,
        },
      });
    } catch (error: unknown) {
      if (!(error instanceof Error && error.message.includes("already exists"))) {
        throw error;
      }
    }

    await createShippingOptionsWorkflow(container).run({
      input: [
        {
          name: "Standard Shipping",
          price_type: "flat",
          provider_id: "manual_manual",
          service_zone_id: fulfillmentSet.service_zones[0].id,
          shipping_profile_id: shippingProfile.id,
          type: {
            label: "Standard",
            description: "Ship in 2-3 days.",
            code: "standard",
          },
          prices: [
            { currency_code: "usd", amount: 10 },
            { currency_code: "eur", amount: 10 },
            { region_id: region.id, amount: 10 },
          ],
          rules: [
            { attribute: "enabled_in_store", value: "true", operator: "eq" },
            { attribute: "is_return", value: "false", operator: "eq" },
          ],
        },
        {
          name: "Express Shipping",
          price_type: "flat",
          provider_id: "manual_manual",
          service_zone_id: fulfillmentSet.service_zones[0].id,
          shipping_profile_id: shippingProfile.id,
          type: {
            label: "Express",
            description: "Ship in 24 hours.",
            code: "express",
          },
          prices: [
            { currency_code: "usd", amount: 25 },
            { currency_code: "eur", amount: 25 },
            { region_id: region.id, amount: 25 },
          ],
          rules: [
            { attribute: "enabled_in_store", value: "true", operator: "eq" },
            { attribute: "is_return", value: "false", operator: "eq" },
          ],
        },
      ],
    });
  }
  logger.info("Finished seeding fulfillment data.");

  try {
    await linkSalesChannelsToStockLocationWorkflow(container).run({
      input: {
        id: stockLocation.id,
        add: [defaultSalesChannel[0].id],
      },
    });
  } catch (error: unknown) {
    if (!(error instanceof Error && error.message.includes("already"))) {
      throw error;
    }
    logger.info("Sales channel already linked to stock location, skipping.");
  }
  logger.info("Finished seeding stock location data.");

  logger.info("Seeding publishable API key data...");
  let publishableApiKey: ApiKey | null = null;
  const { data } = await query.graph({
    entity: "api_key",
    fields: ["id"],
    filters: {
      type: "publishable",
    },
  });

  publishableApiKey = data?.[0];

  if (!publishableApiKey) {
    const {
      result: [publishableApiKeyResult],
    } = await createApiKeysWorkflow(container).run({
      input: {
        api_keys: [
          {
            title: "Webshop",
            type: "publishable",
            created_by: "",
          },
        ],
      },
    });

    publishableApiKey = publishableApiKeyResult as ApiKey;
  }

  try {
    await linkSalesChannelsToApiKeyWorkflow(container).run({
      input: {
        id: publishableApiKey.id,
        add: [defaultSalesChannel[0].id],
      },
    });
  } catch (error: unknown) {
    if (!(error instanceof Error && error.message.includes("already"))) {
      throw error;
    }
    logger.info("Sales channel already linked to API key, skipping.");
  }
  logger.info("Finished seeding publishable API key data.");

  logger.info("Seeding book genre categories...");

  const productCategoryModule = container.resolve(Modules.PRODUCT);
  const categoryNames = ["Fiction", "Non-Fiction", "Science", "History", "Children's", "Business"];
  const existingCategories = await productCategoryModule.listProductCategories({
    name: categoryNames,
  });

  let categoryResult;
  if (existingCategories.length === categoryNames.length) {
    categoryResult = existingCategories;
    logger.info("Book categories already exist, skipping.");
  } else {
    const categoriesToCreate = categoryNames.filter(
      (name) => !existingCategories.find((c) => c.name === name)
    );
    const { result: newCategories } = await createProductCategoriesWorkflow(
      container
    ).run({
      input: {
        product_categories: categoriesToCreate.map((name) => ({
          name,
          is_active: true,
        })),
      },
    });
    categoryResult = [...existingCategories, ...newCategories];
  }

  const bookHandles = ["the-great-gatsby", "a-brief-history-of-time"];
  const existingBooks = await productCategoryModule.listProducts({
    handle: bookHandles,
  });

  if (existingBooks.length === bookHandles.length) {
    logger.info("Sample books already exist, skipping.");
  } else {
    const fictionCategory = categoryResult.find((c: { name: string }) => c.name === "Fiction");
    const scienceCategory = categoryResult.find((c: { name: string }) => c.name === "Science");

    await createProductsWorkflow(container).run({
      input: {
        products: [
          {
            title: "The Great Gatsby",
            handle: "the-great-gatsby",
            description: "A story of the fabulously wealthy Jay Gatsby and his love for the beautiful Daisy Buchanan.",
            status: ProductStatus.PUBLISHED,
            shipping_profile_id: shippingProfile.id,
            metadata: {
              author: "F. Scott Fitzgerald",
              isbn: "978-0743273565",
            },
            category_ids: fictionCategory ? [fictionCategory.id] : [],
            options: [
              {
                title: "Condition",
                values: ["New", "Like New", "Good"],
              },
            ],
            variants: [
              {
                title: "New",
                sku: "GATSBY-NEW",
                options: { Condition: "New" },
                prices: [
                  { amount: 1299, currency_code: "usd" },
                  { amount: 1199, currency_code: "eur" },
                ],
              },
              {
                title: "Like New",
                sku: "GATSBY-LIKENEW",
                options: { Condition: "Like New" },
                prices: [
                  { amount: 899, currency_code: "usd" },
                  { amount: 799, currency_code: "eur" },
                ],
              },
              {
                title: "Good",
                sku: "GATSBY-GOOD",
                options: { Condition: "Good" },
                prices: [
                  { amount: 599, currency_code: "usd" },
                  { amount: 499, currency_code: "eur" },
                ],
              },
            ],
            sales_channels: [{ id: defaultSalesChannel[0].id }],
          },
          {
            title: "A Brief History of Time",
            handle: "a-brief-history-of-time",
            description: "Stephen Hawking's landmark book on cosmology, black holes, and the nature of time.",
            status: ProductStatus.PUBLISHED,
            shipping_profile_id: shippingProfile.id,
            metadata: {
              author: "Stephen Hawking",
              isbn: "978-0553380163",
            },
            category_ids: scienceCategory ? [scienceCategory.id] : [],
            options: [
              {
                title: "Condition",
                values: ["New", "Like New", "Good"],
              },
            ],
            variants: [
              {
                title: "New",
                sku: "HAWKING-NEW",
                options: { Condition: "New" },
                prices: [
                  { amount: 1599, currency_code: "usd" },
                  { amount: 1399, currency_code: "eur" },
                ],
              },
              {
                title: "Like New",
                sku: "HAWKING-LIKENEW",
                options: { Condition: "Like New" },
                prices: [
                  { amount: 999, currency_code: "usd" },
                  { amount: 899, currency_code: "eur" },
                ],
              },
              {
                title: "Good",
                sku: "HAWKING-GOOD",
                options: { Condition: "Good" },
                prices: [
                  { amount: 699, currency_code: "usd" },
                  { amount: 599, currency_code: "eur" },
                ],
              },
            ],
            sales_channels: [{ id: defaultSalesChannel[0].id }],
          },
        ],
      },
    });
  }
  logger.info("Finished seeding book data.");

  logger.info("Seeding inventory levels.");

  const { data: inventoryItems } = await query.graph({
    entity: "inventory_item",
    fields: ["id"],
  });

  const inventoryModule = container.resolve(Modules.INVENTORY);
  const existingLevels = await inventoryModule.listInventoryLevels({
    location_id: stockLocation.id,
  });
  const existingItemIds = new Set(existingLevels.map((l) => l.inventory_item_id));

  const inventoryLevels: CreateInventoryLevelInput[] = [];
  for (const inventoryItem of inventoryItems) {
    if (!existingItemIds.has(inventoryItem.id)) {
      inventoryLevels.push({
        location_id: stockLocation.id,
        stocked_quantity: 1000000,
        inventory_item_id: inventoryItem.id,
      });
    }
  }

  if (inventoryLevels.length > 0) {
    await createInventoryLevelsWorkflow(container).run({
      input: { inventory_levels: inventoryLevels },
    });
  } else {
    logger.info("Inventory levels already exist, skipping.");
  }
  logger.info("Finished seeding inventory levels data.");

  // Create default seller roles (idempotent)
  await createSellerDefaultsWorkflow(container).run({});

  // Seed demo seller with shipping profile and options
  logger.info("Seeding demo seller...");
  const { data: existingSellers } = await query.graph({
    entity: "seller",
    fields: ["id", "name"],
    filters: { name: "BookHook Books" },
  });

  if (!existingSellers.length) {
    const sellerModuleService = container.resolve(MercurModules.SELLER) as any;
    const authModuleService = container.resolve<IAuthModuleService>(Modules.AUTH);

    // Create seller with OPEN status (already approved)
    const [seller] = await sellerModuleService.createSellers([{
      name: "BookHook Books",
      description: "Your premier source for books of all genres",
      handle: "bookhook-books",
      email: "seller@bookshook.com",
      currency_code: "usd",
      status: SellerStatus.OPEN,
    }]);

    // Create member for the seller
    const [member] = await sellerModuleService.upsertMembers([{
      email: "seller@bookshook.com",
      first_name: "Demo",
      last_name: "Seller",
    }]);

    // Link member to seller with admin role
    await sellerModuleService.createSellerMembers([{
      seller_id: seller.id,
      member_id: member.id,
      role_id: SellerRole.SELLER_ADMINISTRATION,
      is_owner: true,
    }]);

    // Create auth identity so the member can log in
    try {
      const hashedPassword = await hashPassword("Vendor123");
      await authModuleService.createAuthIdentities([{
        provider_identities: [{
          provider: "emailpass",
          entity_id: "seller@bookshook.com",
          provider_metadata: { password: hashedPassword },
        }],
        app_metadata: { member: member.id },
      }]);
    } catch (err: unknown) {
      logger.warn(`Could not create seller auth identity: ${err instanceof Error ? err.message : err}`);
    }

    // Get service zone for seller shipping options
    const { data: fulfillmentSets } = await query.graph({
      entity: "fulfillment_set",
      fields: ["id", "service_zones.id"],
      filters: { name: "European Warehouse delivery" },
    });
    const serviceZoneId = fulfillmentSets?.[0]?.service_zones?.[0]?.id;

    if (serviceZoneId) {
      // Create seller-specific shipping profile
      const { result: sellerShippingProfiles } =
        await createSellerShippingProfilesWorkflow(container).run({
          input: {
            shipping_profiles: [{ name: "BookHook Books Shipping", type: "default" }],
            seller_id: seller.id,
          },
        });

      // Create seller-specific shipping option (required for checkout)
      await createSellerShippingOptionsWorkflow(container).run({
        input: {
          shipping_options: [
            {
              name: "Standard Shipping",
              price_type: "flat",
              provider_id: "manual_manual",
              service_zone_id: serviceZoneId,
              shipping_profile_id: sellerShippingProfiles[0].id,
              type: {
                label: "Standard",
                description: "Ship in 2-3 days.",
                code: "standard",
              },
              prices: [
                { currency_code: "usd", amount: 500 },
                { currency_code: "eur", amount: 500 },
                { region_id: region.id, amount: 500 },
              ],
              rules: [
                { attribute: "enabled_in_store", value: "true", operator: "eq" },
                { attribute: "is_return", value: "false", operator: "eq" },
              ],
            },
          ],
          seller_id: seller.id,
        },
      });

      logger.info(`Seeded seller shipping profile and options for: ${seller.name}`);
    } else {
      logger.warn("Could not find service zone — seller shipping options not created");
    }

    logger.info(
      `Seeded seller: ${seller.name} | login: seller@bookshook.com / Vendor123`
    );
  } else {
    logger.info("Demo seller already exists, skipping.");
  }

  logger.info("Seed complete. Admin: admin@bookshook.com / Admin123! | Seller: seller@bookshook.com / Vendor123");
}
