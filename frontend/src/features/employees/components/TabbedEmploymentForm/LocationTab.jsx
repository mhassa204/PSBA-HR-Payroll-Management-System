import { motion } from "framer-motion";
import SearchableSelect from "../../../../components/ui/SearchableSelect";

const LocationTab = ({
  locationForm,
  onLocationSubmit,
  isSectionVisible,
  getFieldClasses,
  getValidationRules,
  bazaarOptions,
  currentOrganization,
  isContractual,
  locationErrors,
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

  // Normalize watched values to avoid calling .trim on non-strings
  const typeValue = watch("type");
  const bazaarValue = watch("bazaar_name");
  const isBazaarType = typeValue === 'BAZAAR' || typeValue === 'SAHULAT_BAZAAR';
  const bazaarSelected = typeof bazaarValue === 'string' ? bazaarValue.trim().length > 0 : Boolean(bazaarValue);
  // Fallback label if the current stored value is a string label not present in options yet
  const bazaarValueLabel = typeof bazaarValue === 'string' ? bazaarValue : '';

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6">
      <div className="bg-purple-50 border border-purple-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-purple-900 mb-4">
          <i className="fas fa-map-marker-alt mr-2"></i>
          Location Information
        </h3>

        <form onSubmit={handleSubmit(onLocationSubmit)}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className={getFieldClasses('location', 'location_type')}>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Location Type <span className="text-red-500">*</span>
              </label>
              <SearchableSelect
                options={currentOrganization === 'PSBA' ? [
                  { value: "HEAD_QUARTER", label: "Head Quarter" },
                  { value: "SAHULAT_BAZAAR", label: "Sahulat Bazaar (requires bazaar name)" },
                ] : [
                  { value: "HEAD_OFFICE", label: "Head Office" },
                  { value: "BAZAAR", label: "Bazaar (requires bazaar name)" },
                ]}
                value={typeValue}
                onChange={(value) => locationForm.setValue("type", value)}
                placeholder="Select Location Type"
                register={register}
                name="type"
                required={getValidationRules('location', 'location_type', { required: "Location type is required" }).required}
                error={locationErrors?.type?.message}
              />
              {locationErrors?.type && (
                <p className="text-red-600 text-sm mt-1">{locationErrors.type.message}</p>
              )}
              <p className="text-xs text-gray-500 mt-1">
                <i className="fas fa-info-circle mr-1"></i>
                {currentOrganization === 'PSBA' ? "Head Quarter: No bazaar name required. Sahulat Bazaar: Select from available bazaars." : "Head Office: No bazaar name required. Bazaar: Select from available bazaars."}
              </p>
            </div>

            <div
              className={getFieldClasses('location', 'bazaar_name')}
              style={{ display: (typeValue === 'HEAD_OFFICE' || typeValue === 'HEAD_QUARTER') ? 'none' : 'block' }}
            >
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Bazaar Name
                {isBazaarType && <span className="text-red-500"> *</span>}
              </label>
              <SearchableSelect
                options={bazaarOptions}
                value={bazaarValue}
                valueLabel={bazaarValueLabel}
                onChange={(value) => locationForm.setValue("bazaar_name", value)}
                placeholder="Select a bazaar"
                register={register}
                name="bazaar_name"
                required={isBazaarType ? "Bazaar name is required when Bazaar or Sahulat Bazaar is selected" : false}
                error={locationErrors?.bazaar_name?.message}
                className={`w-full ${
                  isBazaarType
                    ? (bazaarSelected ? 'border-green-300 focus:border-green-500' : 'border-red-300 focus:border-red-500')
                    : 'border-gray-300'
                }`}
              />
              {locationErrors?.bazaar_name && (
                <p className="text-red-600 text-sm mt-1">{locationErrors.bazaar_name.message}</p>
              )}
              <p className={`text-xs mt-1 ${
                isBazaarType
                  ? (bazaarSelected ? 'text-green-600 font-medium' : 'text-red-600 font-medium')
                  : 'text-gray-500'
              }`}>
                <i className={`fas mr-1 ${
                  isBazaarType
                    ? (bazaarSelected ? 'fa-check-circle text-green-500' : 'fa-exclamation-triangle text-red-500')
                    : 'fa-info-circle text-gray-400'
                }`}></i>
                {isBazaarType
                  ? (bazaarSelected ? "Bazaar selected successfully ✓" : "Please select a bazaar from the dropdown")
                  : "Bazaar selection is not required for Head Office/Head Quarter"}
              </p>
            </div>
          </div>

          <div className={getFieldClasses('location', 'full_address', 'mt-6')}>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Description (if any)</label>
            <textarea
              {...register("full_address", getValidationRules('location', 'full_address', { required: false }))}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white text-gray-900"
              rows={4}
              placeholder="Enter additional description (optional)"
            />
            {locationErrors?.full_address && (
              <p className="text-red-600 text-sm mt-1">{locationErrors.full_address.message}</p>
            )}
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
