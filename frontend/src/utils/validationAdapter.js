/**
 * Adapts the SINGLE-SOURCE validation rules (/shared/validation) into the shapes
 * the React forms need, so the frontend never re-declares a rule the backend owns.
 *
 *   import { rhfRules } from "../../../utils/validationAdapter";
 *   <input {...register("cnic", rhfRules("employee", "cnic"))} />
 *
 * For org-dependent fields, pass the current form data as the 3rd arg:
 *   register("designation", rhfRules("employment", "designation", { organization }))
 */
import { schemas, resolveRequired, validate } from "@shared/validation";

export function rhfRules(schemaName, field, data = {}) {
  const rule = schemas[schemaName]?.[field];
  if (!rule) return {};
  const rules = {};
  if (resolveRequired(rule, data)) {
    rules.required = `${rule.label} is required`;
  }
  if (rule.validate && rule.validate.length) {
    rules.validate = (value) => {
      for (const fn of rule.validate) {
        const res = fn(value, data);
        if (res !== true) return res;
      }
      return true;
    };
  }
  return rules;
}

// Validate an entire payload before submit (mirrors backend). Returns
// { valid, errors } so the form can surface the same messages the API would.
export function validatePayload(schemaName, data) {
  return validate(schemaName, data);
}

export { schemas } from "@shared/validation";
