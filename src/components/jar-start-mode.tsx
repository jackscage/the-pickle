import { copy } from "@/lib/copy";

/**
 * The two choices for how a group's next jar begins, as radio buttons.
 *
 * Used in two places — making a group, and the group's settings — so it is
 * written once. It is only the inputs; each form wraps it with its own
 * button.
 */
export function JarStartModeFields({
  current = "admin",
}: {
  current?: "admin" | "automatic";
}) {
  const options = [
    { value: "admin", label: copy.jarStartMode.admin, hint: copy.jarStartMode.adminHint },
    {
      value: "automatic",
      label: copy.jarStartMode.automatic,
      hint: copy.jarStartMode.automaticHint,
    },
  ] as const;

  return (
    <fieldset>
      <legend className="mb-2 block text-sm font-bold text-ink">
        {copy.jarStartMode.title}
      </legend>
      <div className="space-y-2">
        {options.map((option) => (
          <label
            key={option.value}
            className="flex cursor-pointer gap-3 rounded-xl border-2 border-brine bg-paper-raised px-4 py-3 has-[:checked]:border-pickle"
          >
            <input
              type="radio"
              name="jar_start_mode"
              value={option.value}
              defaultChecked={current === option.value}
              className="mt-1 accent-pickle"
            />
            <span>
              <span className="block font-bold text-ink">{option.label}</span>
              <span className="block text-sm text-ink-soft">{option.hint}</span>
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
