import { motion } from "framer-motion";
import SearchableSelect from "../../../../components/ui/SearchableSelect";

const LocationTab = ({
  locationForm,
  onLocationSubmit,
  isSectionVisible,
  getFieldClasses,
  getValidationRules,
  bazaarOptions, // legacy, will be ignored
  currentOrganization,
  isContractual,
  locationErrors,
  allLocations = [], // NEW: pass full location list
}) => {
  const { register, handleSubmit, watch } = locationForm;

  if (!isSectionVisible('location')) {
    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6">
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
          <i className="fas fa-info-circle text-gray-400 text-3xl mb-4"></i>
          <h3 className="text-lg font-semibold text-gray-700 mb-2">Location Details Not Required</h3>
          <p className="text-gray-600">Location information is not required for this organization.</p>
        </div>
      </motion.div>
    );
  }

  // Watch selected location id and active type filter
  const selectedLocationId = watch("location_id");
  const activeType = watch("_location_type_filter") || "ALL"; // virtual field

  const typeOptions = [
    { value: 'ALL', label: 'All' },
    { value: 'HEAD_OFFICE', label: 'Head Office' },
    { value: 'HEAD_QUARTER', label: 'Head Quarter' },
    { value: 'BAZAAR', label: 'Bazaar' },
    { value: 'SAHULAT_BAZAAR', label: 'Sahulat Bazaar' },
  ];

  const filteredLocations = Array.isArray(allLocations) ? allLocations.filter(l => {
    if (activeType === 'ALL') return true;
    return (l.type || '').toUpperCase() === activeType;
  }) : [];

  const locationSelectOptions = filteredLocations.map(l => ({
    value: l.id,
    label: `${l.name}${l.city?.name ? ' - ' + l.city.name : ''}${l.district?.name ? ' (' + l.district.name + ')' : ''}`,
  }));

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6">
      <div className="bg-purple-50 border border-purple-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-purple-900 mb-4">
          <i className="fas fa-map-marker-alt mr-2"></i>
          Location Information
        </h3>

        <form onSubmit={handleSubmit(onLocationSubmit)}>
          <div className="space-y-6">
            {/* Type filter chips */}
            <div className="flex flex-wrap gap-2">
              {typeOptions.map(t => (
                <button
                  type="button"
                  key={t.value}
                  onClick={() => locationForm.setValue("_location_type_filter", t.value)}
                  className={`px-3 py-1 rounded-full text-sm border transition ${activeType === t.value ? 'bg-purple-600 text-white border-purple-600' : 'bg-white text-purple-700 border-purple-300 hover:bg-purple-100'}`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <div className={getFieldClasses('location', 'location_id')}>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Select Location <span className="text-red-500">*</span>
              </label>
              <SearchableSelect
                options={locationSelectOptions}
                value={selectedLocationId}
                onChange={(value) => locationForm.setValue("location_id", value)}
                placeholder="Choose a location"
                register={register}
                name="location_id"
                required={getValidationRules('location', 'location_id', { required: 'Location is required' }).required}
                error={locationErrors?.location_id?.message}
              />
              {locationErrors?.location_id && (
                <p className="text-red-600 text-sm mt-1">{locationErrors.location_id.message}</p>
              )}
              <p className="text-xs text-gray-500 mt-1">
                Filter by type using the chips above. List shows active locations from master data.
              </p>
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <button type="submit" className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium">
              <i className="fas fa-arrow-right mr-2"></i>
              {isContractual ? "Continue to Contract" : "Complete Employment Record"}
            </button>
          </div>
        </form>
      </div>
    </motion.div>
  );
};

export default LocationTab;
