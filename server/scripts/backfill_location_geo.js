/**
 * Idempotent, production-safe backfill of district_id + city_id for every Location
 * using server/prisma/import/locationGeo.js. Creates the district/city if missing.
 *
 * Usage (from server/):  node scripts/backfill_location_geo.js
 * Safe to run repeatedly and on production (no deletes, only fills geo).
 */
const { PrismaClient } = require("@prisma/client");
const { geoForLocation } = require("../prisma/import/locationGeo");

const prisma = new PrismaClient();

async function ensureDistrict(name) {
  let d = await prisma.district.findFirst({ where: { name } });
  if (!d) {
    d = await prisma.district.create({
      data: { name, is_active: true, is_deleted: false },
    });
    console.log(`  + created district: ${name}`);
  }
  return d.id;
}

async function ensureCity(name, district_id) {
  let c = await prisma.city.findFirst({ where: { name, district_id } });
  if (!c) {
    c = await prisma.city.create({
      data: { name, district_id, is_active: true, is_deleted: false },
    });
    console.log(`  + created city: ${name}`);
  }
  return c.id;
}

async function main() {
  const locations = await prisma.location.findMany({
    select: { id: true, name: true, district_id: true, city_id: true },
  });
  console.log(`🌍 Backfilling geo for ${locations.length} locations...`);

  let updated = 0;
  const unmapped = [];
  for (const loc of locations) {
    const geo = geoForLocation(loc.name);
    if (!geo) {
      unmapped.push(loc.name);
      continue;
    }
    const district_id = await ensureDistrict(geo.district);
    const city_id = await ensureCity(geo.city, district_id);
    if (loc.district_id !== district_id || loc.city_id !== city_id) {
      await prisma.location.update({
        where: { id: loc.id },
        data: { district_id, city_id },
      });
      updated++;
    }
  }

  console.log(`✅ Updated ${updated} location(s).`);
  if (unmapped.length) {
    console.log(`⚠️  Unmapped (left as-is): ${unmapped.join(", ")}`);
  } else {
    console.log("✅ Every location has a district + city.");
  }
}

main()
  .then(async () => prisma.$disconnect())
  .catch(async (e) => {
    console.error("❌ Backfill failed:", e);
    await prisma.$disconnect();
    process.exit(1);
  });
