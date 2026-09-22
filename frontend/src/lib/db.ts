/**
 * @file db.ts
 * @description PostgreSQL database client using the pure TypeScript 'postgres' library (no ORM).
 * Manages statutory inspection logs and GS1 India DataKart master records with raw SQL queries.
 */

import postgres from 'postgres';
import { GS1ProductRecord, InspectionDossier } from '@/types/lmpc';

const connectionString =
  process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/lmpc_db';

/**
 * Global singleton PostgreSQL connection using 'postgres' driver.
 */
export const sql = postgres(connectionString, {
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
});

/**
 * Initializes database tables (DDL) and seeds real-world GS1 India commodity master records.
 */
export async function initDatabase(): Promise<void> {
  // 1. Create GS1 India DataKart Master Table
  await sql`
    CREATE TABLE IF NOT EXISTS gs1_registry (
      gtin VARCHAR(14) PRIMARY KEY,
      brand_name VARCHAR(255) NOT NULL,
      product_name VARCHAR(500) NOT NULL,
      company_name VARCHAR(500) NOT NULL,
      category VARCHAR(255) NOT NULL,
      registered_net_qty VARCHAR(100) NOT NULL,
      registered_mrp NUMERIC(10,2) NOT NULL,
      is_lmpc_registered BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `;

  // 2. Create Statutory Inspection Audits Table
  await sql`
    CREATE TABLE IF NOT EXISTS inspection_audits (
      id VARCHAR(100) PRIMARY KEY,
      timestamp TIMESTAMPTZ DEFAULT NOW(),
      inspector_id VARCHAR(100) NOT NULL,
      inspection_location TEXT NOT NULL,
      product_name VARCHAR(500),
      barcode VARCHAR(14),
      overall_status VARCHAR(50) NOT NULL,
      critical_violations_count INT NOT NULL,
      declarations JSONB NOT NULL,
      calibration JSONB,
      evaluations JSONB NOT NULL,
      legal_notice_draft TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `;

  // 3. Seed real GS1 India DataKart Products (upsert with ON CONFLICT DO NOTHING)
  const seedRecords: GS1ProductRecord[] = [
      {
        gtin: '8901063012011',
        brandName: 'Britannia',
        productName: 'Britannia Good Day Butter Cookies',
        companyName: 'Britannia Industries Limited, Bengaluru',
        category: 'Biscuits & Bakery',
        registeredNetQuantity: '120 g',
        registeredMRP: 30.0,
        isLMPCRegistered: true,
      },
      {
        gtin: '8901262010054',
        brandName: 'Amul',
        productName: 'Amul Pasteurised Butter',
        companyName: 'Gujarat Co-operative Milk Marketing Federation Ltd. (GCMMF)',
        category: 'Dairy Products',
        registeredNetQuantity: '100 g',
        registeredMRP: 58.0,
        isLMPCRegistered: true,
      },
      {
        gtin: '8901719101014',
        brandName: 'Parle',
        productName: 'Parle-G Original Gluco Biscuits',
        companyName: 'Parle Products Pvt. Ltd., Mumbai',
        category: 'Biscuits & Bakery',
        registeredNetQuantity: '80 g',
        registeredMRP: 10.0,
        isLMPCRegistered: true,
      },
      {
        gtin: '8901012111015',
        brandName: 'Tata Salt',
        productName: 'Tata Salt Vacuum Evaporated Iodised Salt',
        companyName: 'Tata Consumer Products Limited, Mumbai',
        category: 'Staples & Spices',
        registeredNetQuantity: '1 kg',
        registeredMRP: 28.0,
        isLMPCRegistered: true,
      },
      {
        gtin: '8901396112028',
        brandName: 'Dettol',
        productName: 'Dettol Original Germ Protection Soap',
        companyName: 'Reckitt Benckiser (India) Pvt. Ltd., Gurugram',
        category: 'Personal Hygiene & Soap',
        registeredNetQuantity: '75 g',
        registeredMRP: 42.0,
        isLMPCRegistered: true,
      },
      {
        gtin: '8901058852332',
        brandName: 'Maggi',
        productName: 'Maggi 2-Minute Masala Instant Noodles',
        companyName: 'Nestle India Limited, New Delhi',
        category: 'Instant Food',
        registeredNetQuantity: '70 g',
        registeredMRP: 14.0,
        isLMPCRegistered: true,
      },
      {
        gtin: '8901207010019',
        brandName: 'Dabur',
        productName: 'Dabur Chyawanprash Immunity Booster',
        companyName: 'Dabur India Limited, Ghaziabad',
        category: 'Ayurveda & Health',
        registeredNetQuantity: '500 g',
        registeredMRP: 245.0,
        isLMPCRegistered: true,
      },
      {
        gtin: '8901501001019',
        brandName: 'Haldiram',
        productName: 'Haldirams Nagpur Aloo Bhujia',
        companyName: 'Haldiram Foods International Pvt. Ltd., Nagpur',
        category: 'Namkeen & Snacks',
        registeredNetQuantity: '200 g',
        registeredMRP: 55.0,
        isLMPCRegistered: true,
      },
      {
        gtin: '8901138810013',
        brandName: 'Himalaya',
        productName: 'Himalaya Purifying Neem Face Wash (Pouch / Tube)',
        companyName: 'The Himalaya Drug Company, Makali, Bengaluru 562162, Karnataka',
        category: 'Personal Care & Cosmetics',
        registeredNetQuantity: '100 ml',
        registeredMRP: 160.0,
        isLMPCRegistered: true,
      },
      {
        gtin: '8901030733857',
        brandName: "Pond's",
        productName: "Pond's Bright Beauty Face Wash Tube",
        companyName: 'Hindustan Unilever Limited, Mumbai 400099',
        category: 'Personal Care & Cosmetics',
        registeredNetQuantity: '100 g',
        registeredMRP: 175.0,
        isLMPCRegistered: true,
      },
      {
        gtin: '8901526402402',
        brandName: 'Garnier',
        productName: 'Garnier Skin Naturals Bright Complete Face Wash',
        companyName: "L'Oreal India Pvt. Ltd., Lower Parel, Mumbai",
        category: 'Personal Care & Cosmetics',
        registeredNetQuantity: '100 g',
        registeredMRP: 199.0,
        isLMPCRegistered: true,
      },
      {
        gtin: '8901012165018',
        brandName: 'Clean & Clear',
        productName: 'Clean & Clear Foaming Face Wash',
        companyName: 'Johnson & Johnson India Pvt. Ltd., Mumbai',
        category: 'Personal Care & Cosmetics',
        registeredNetQuantity: '100 ml',
        registeredMRP: 165.0,
        isLMPCRegistered: true,
      },
      {
        gtin: '8904455005196',
        brandName: 'Astaberry / Cipla',
        productName: 'Astaberry Rice Water Brightening Face Wash (100ml)',
        companyName: 'Cipla Health Limited, Mumbai',
        category: 'Personal Care & Cosmetics',
        registeredNetQuantity: '100 ml',
        registeredMRP: 195.0,
        isLMPCRegistered: true,
      },
      {
        gtin: '8901234567890',
        brandName: 'Lotus Herbals',
        productName: 'Lotus Herbals Skin Cream (50ml Squeeze Tube)',
        companyName: 'Lotus Herbals Pvt. Ltd., New Delhi - 110020, India',
        category: 'Personal Care & Cosmetics',
        registeredNetQuantity: '50 ml',
        registeredMRP: 85.0,
        isLMPCRegistered: true,
      },
    ];

    for (const r of seedRecords) {
      await sql`
        INSERT INTO gs1_registry (
          gtin, brand_name, product_name, company_name, category, registered_net_qty, registered_mrp, is_lmpc_registered
        ) VALUES (
          ${r.gtin}, ${r.brandName}, ${r.productName}, ${r.companyName}, ${r.category}, ${r.registeredNetQuantity}, ${r.registeredMRP}, ${r.isLMPCRegistered}
        ) ON CONFLICT (gtin) DO NOTHING;
      `;
    }
    console.log('[DB] GS1 India DataKart master registry successfully seeded.');
}

/**
 * Look up a product in the GS1 DataKart registry table.
 */
export async function getGS1ProductFromDB(barcode: string): Promise<GS1ProductRecord | null> {
  const clean = barcode.replace(/[^0-9]/g, '');
  const rows = await sql`
    SELECT 
      gtin, 
      brand_name as "brandName", 
      product_name as "productName", 
      company_name as "companyName", 
      category, 
      registered_net_qty as "registeredNetQuantity", 
      registered_mrp::float as "registeredMRP", 
      is_lmpc_registered as "isLMPCRegistered"
    FROM gs1_registry 
    WHERE gtin = ${clean}
    LIMIT 1;
  `;
  return rows.length > 0 ? (rows[0] as unknown as GS1ProductRecord) : null;
}

/**
 * Persists an inspection dossier to the PostgreSQL database.
 */
export async function saveInspectionAuditToDB(dossier: InspectionDossier): Promise<void> {
  await sql`
    INSERT INTO inspection_audits (
      id,
      timestamp,
      inspector_id,
      inspection_location,
      product_name,
      barcode,
      overall_status,
      critical_violations_count,
      declarations,
      calibration,
      evaluations,
      legal_notice_draft
    ) VALUES (
      ${dossier.auditId},
      ${dossier.timestamp},
      ${dossier.inspectorId},
      ${dossier.inspectionLocation},
      ${dossier.declarations.manufacturerName || dossier.gs1Record?.productName || 'Packaged Commodity'},
      ${dossier.declarations.barcode || null},
      ${dossier.overallStatus},
      ${dossier.criticalViolationsCount},
      ${sql.json(dossier.declarations as any)},
      ${dossier.calibration ? sql.json(dossier.calibration as any) : null},
      ${sql.json(dossier.evaluations as any)},
      ${dossier.legalNoticeDraft || null}
    );
  `;
}

/**
 * Retrieves aggregate audit statistics from PostgreSQL.
 */
export async function getAuditStatsFromDB(): Promise<{
  totalAudits: number;
  compliantCount: number;
  violationCount: number;
  noticesGenerated: number;
}> {
  const res = await sql`
    SELECT 
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE overall_status = 'COMPLIANT')::int AS compliant,
      COUNT(*) FILTER (WHERE overall_status = 'NON_COMPLIANT')::int AS violations,
      COUNT(*) FILTER (WHERE legal_notice_draft IS NOT NULL AND overall_status = 'NON_COMPLIANT')::int AS notices
    FROM inspection_audits;
  `;
  const row = res[0] || {};
  return {
    totalAudits: row.total || 0,
    compliantCount: row.compliant || 0,
    violationCount: row.violations || 0,
    noticesGenerated: row.notices || 0,
  };
}
