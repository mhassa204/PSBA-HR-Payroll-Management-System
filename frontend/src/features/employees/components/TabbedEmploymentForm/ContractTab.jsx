import { motion } from "framer-motion";
import EmploymentDocumentManager from "../../../../components/ui/EmploymentDocumentManager";

const ContractTab = ({
  contractForm,
  onContractSubmit,
  formOptions,
  contractErrors,
  documentManager,
  isEditMode,
}) => {
  const { register, handleSubmit } = contractForm;

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6">
      <div className="bg-orange-50 border border-orange-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-orange-900 mb-4">
          <i className="fas fa-file-contract mr-2"></i>
          Contract Information
        </h3>

        <form onSubmit={handleSubmit(onContractSubmit)}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Contract Type <span className="text-red-500">*</span></label>
              <select {...register("contract_type", { required: "Contract type is required" })} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-white text-gray-900">
                <option value="">Select Contract Type</option>
                {formOptions.contractTypes?.map((type) => (
                  <option key={type.value} value={type.value} title={type.description}>{type.label}</option>
                ))}
              </select>
              {contractErrors?.contract_type && <p className="text-red-600 text-sm mt-1">{contractErrors.contract_type.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Contract Start Date <span className="text-red-500">*</span></label>
              <input type="date" {...register("start_date", { required: "Contract start date is required" })} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-white text-gray-900" />
              {contractErrors?.start_date && <p className="text-red-600 text-sm mt-1">{contractErrors.start_date.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Contract End Date <span className="text-red-500">*</span></label>
              <input type="date" {...register("end_date", { required: "Contract end date is required" })} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-white text-gray-900" />
              {contractErrors?.end_date && <p className="text-red-600 text-sm mt-1">{contractErrors.end_date.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Contract Number</label>
              <input type="text" {...register("contract_number")} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-white text-gray-900" placeholder="Enter contract number" />
            </div>

            {/* Is Renewed */}
            <div>
              <label className="flex items-center space-x-3">
                <input type="checkbox" {...register("is_renewed")} className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded" />
                <span className="text-sm font-semibold text-gray-700">Contract Renewed</span>
              </label>
              <p className="text-xs text-gray-500 mt-1">Check if this contract is a renewal</p>
            </div>

            {/* Renewal Report (conditional) */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Contract Renewal Report</label>
              <EmploymentDocumentManager
                documents={documentManager.documents}
                documentType="renewal_report"
                title="Contract Renewal Report"
                accept="application/pdf"
                maxSize={50 * 1024 * 1024}
                onDocumentAdd={documentManager.addDocument}
                onDocumentRemove={documentManager.removeDocument}
                isEditMode={isEditMode}
              />
              <p className="text-xs text-gray-500 mt-1">Upload contract renewal report (if applicable)</p>
            </div>

            {/* Confirmation Date */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Confirmation Date</label>
              <input type="date" {...register("confirmation_date")} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-white text-gray-900" />
            </div>

            {/* Confirmation Status */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Confirmation Status</label>
              <select {...register("confirmation_status")} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-white text-gray-900">
                <option value="">Select Status</option>
                <option value="Confirmed">Confirmed</option>
                <option value="Extended">Extended</option>
                <option value="In Progress">In Progress</option>
              </select>
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <button type="submit" className="px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors font-medium">
              <i className="fas fa-check mr-2"></i>
              Complete Employment Record
            </button>
          </div>
        </form>
      </div>
    </motion.div>
  );
};

export default ContractTab;
