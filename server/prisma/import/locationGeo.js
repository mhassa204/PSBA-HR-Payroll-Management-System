/**
 * District + City for every PSBA location (req: associate all bazaars with their
 * city/district). Derived from PSBA / sahulatbazar.com.pk official store list and
 * Punjab administrative geography.
 *
 * Keyed by the BASE location name (the part after "Sahulat Bazaar " with any
 * " (On the GO)" suffix removed). Lahore neighbourhood bazaars use city "Lahore";
 * Faisalabad city bazaars use city "Faisalabad"; tehsil/town bazaars use their own
 * city under the parent district.
 */
const LAHORE = { district: "Lahore", city: "Lahore" };
const FSD = { district: "Faisalabad", city: "Faisalabad" };

const BASE_GEO = {
  // ---- Lahore city (neighbourhood + mobile bazaars) ----
  "China Scheme": LAHORE,
  Township: LAHORE,
  Harbanspura: LAHORE,
  Raiwind: LAHORE,
  Thokar: LAHORE,
  Chung: LAHORE,
  Sabzazaar: LAHORE,
  "Mian Plaza": LAHORE,
  Shershah: LAHORE,
  "Wahdat Colony": LAHORE,
  "Nishtar Town": LAHORE,
  "Awan Town": LAHORE,
  "Barki Road": LAHORE,
  "Gulshan Ravi": LAHORE,
  "Manga Mandi": LAHORE,
  "Mader e Millat": LAHORE,
  "Khatam e Nabuwat": LAHORE,
  Shadman: LAHORE,
  Shahdarah: LAHORE,
  Valencia: LAHORE,
  "Kotha Pind Faisal Town": LAHORE,
  "Madina Market Township": LAHORE,
  "Kharak Nala": LAHORE,
  "Raiwind Sundar Road": LAHORE,

  // ---- Faisalabad ----
  "Millat Road": FSD,
  "Jhang Road": FSD,
  Jaranwala: { district: "Faisalabad", city: "Jaranwala" },

  // ---- City == district bazaars ----
  Bahawalpur: { district: "Bahawalpur", city: "Bahawalpur" },
  Bhakkar: { district: "Bhakkar", city: "Bhakkar" },
  Chakwal: { district: "Chakwal", city: "Chakwal" },
  Chiniot: { district: "Chiniot", city: "Chiniot" },
  Gujranwala: { district: "Gujranwala", city: "Gujranwala" },
  Gujrat: { district: "Gujrat", city: "Gujrat" },
  Hafizabad: { district: "Hafizabad", city: "Hafizabad" },
  Jhang: { district: "Jhang", city: "Jhang" },
  Kasur: { district: "Kasur", city: "Kasur" },
  Khanewal: { district: "Khanewal", city: "Khanewal" },
  Khushab: { district: "Khushab", city: "Khushab" },
  Layyah: { district: "Layyah", city: "Layyah" },
  Lodhran: { district: "Lodhran", city: "Lodhran" },
  "Mandi Bahauddin": { district: "Mandi Bahauddin", city: "Mandi Bahauddin" },
  Mianwali: { district: "Mianwali", city: "Mianwali" },
  Muzaffargarh: { district: "Muzaffargarh", city: "Muzaffargarh" },
  Okara: { district: "Okara", city: "Okara" },
  Pakpattan: { district: "Pakpattan", city: "Pakpattan" },
  Rawalpindi: { district: "Rawalpindi", city: "Rawalpindi" },
  Sahiwal: { district: "Sahiwal", city: "Sahiwal" },
  Sargodha: { district: "Sargodha", city: "Sargodha" },
  Sialkot: { district: "Sialkot", city: "Sialkot" },
  "Toba Tek Singh": { district: "Toba Tek Singh", city: "Toba Tek Singh" },
  Vehari: { district: "Vehari", city: "Vehari" },
  Wazirabad: { district: "Wazirabad", city: "Wazirabad" },

  // ---- Tehsil/town bazaars under a parent district ----
  "DG Khan": { district: "Dera Ghazi Khan", city: "DG Khan" },
  "Taunsa Sharif": { district: "Dera Ghazi Khan", city: "Taunsa Sharif" },
  Farooqabad: { district: "Sheikhupura", city: "Farooqabad" },
  "Mandi Faizabad": { district: "Sheikhupura", city: "Mandi Faizabad" },
  "Sharaqpur Sharif": { district: "Sheikhupura", city: "Sharaqpur Sharif" },
  Ferozwala: { district: "Sheikhupura", city: "Ferozewala" },
  Bhalwal: { district: "Sargodha", city: "Bhalwal" },
  Bhera: { district: "Sargodha", city: "Bhera" },
  "Nowshera Virkan": { district: "Gujranwala", city: "Nowshera Virkan" },
  Pattoki: { district: "Kasur", city: "Pattoki" },
  Chunian: { district: "Kasur", city: "Chunian" },
  "Jalalpur Pirwala": { district: "Multan", city: "Jalalpur Pirwala" },
  Jampur: { district: "Rajanpur", city: "Jampur" },
  "Arif Wala": { district: "Pakpattan", city: "Arif Wala" },
  Burewala: { district: "Vehari", city: "Burewala" },

  // ---- Layyah-district mobile bazaars ----
  "Chowk Azam Layyah": { district: "Layyah", city: "Chowk Azam" },
  "Fatehpur Layyah": { district: "Layyah", city: "Fatehpur" },
  "Karor Lal Easan Layyah": { district: "Layyah", city: "Karor Lal Esan" },
  "Kot Sultan Site Layyah": { district: "Layyah", city: "Kot Sultan" },
  "Minor Road Layyah": { district: "Layyah", city: "Layyah" },
};

// Non-bazaar locations
const SPECIAL_GEO = {
  "Head Quarter": LAHORE,
  "Anti Encroachment Squad": LAHORE, // HQ-based enforcement unit
  "Anti Theft Cell": LAHORE, // HQ-based unit
};

/**
 * Resolve {district, city} for any location name. Returns null if unknown.
 */
function geoForLocation(name) {
  if (!name) return null;
  if (SPECIAL_GEO[name]) return SPECIAL_GEO[name];
  let base = name.replace(/^Sahulat Bazaar\s+/i, "");
  base = base.replace(/\s*\(On the GO\)\s*$/i, "").trim();
  return BASE_GEO[base] || null;
}

module.exports = { BASE_GEO, SPECIAL_GEO, geoForLocation };
