import { Input } from '../../../components/ui/Input.jsx';
import { Select } from '../../../components/ui/Select.jsx';
import { Textarea } from '../../../components/ui/Textarea.jsx';

// Generic parameter renderer for registry field configs.
// Client validation assists only — backend errors are authoritative and
// surface in the result panel with inputs preserved.
export function ToolParameterForm({ fields, values, errors, onChange, disabled }) {
  const list = fields || [];
  if (list.length === 0) return null;
  return (
    <div className="flex flex-col gap-4">
      {list.map((field) => {
        const value = values?.[field.name] ?? field.defaultValue ?? '';
        const error = errors?.[field.name];
        const common = {
          label: `${field.label}${field.required ? ' *' : ''}`,
          disabled,
          error,
          hint: field.hint,
          placeholder: field.placeholder,
          value,
          onChange: (e) => onChange?.(field.name, e.target.value),
        };
        if (field.type === 'select' && field.options) {
          return (
            <Select key={field.name} {...common}>
              {field.options.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </Select>
          );
        }
        if (field.type === 'textarea' || field.type === 'json') {
          return (
            <Textarea
              key={field.name}
              rows={field.type === 'json' ? 5 : 3}
              maxLength={field.maxLength}
              {...common}
            />
          );
        }
        if (field.type === 'number') {
          return (
            <Input
              key={field.name}
              type="number"
              min={field.min}
              max={field.max}
              step={field.step || 'any'}
              {...common}
            />
          );
        }
        if (field.type === 'color') {
          return (
            <Input
              key={field.name}
              type="color"
              {...common}
            />
          );
        }
        return (
          <Input
            key={field.name}
            type={field.type === 'url' || field.type === 'domain' ? 'text' : field.type === 'text' ? 'text' : 'text'}
            inputMode={field.type === 'url' || field.type === 'domain' ? 'url' : undefined}
            maxLength={field.maxLength}
            {...common}
          />
        );
      })}
    </div>
  );
}

// URL/DNS/TLS tools share the generic form — no dropzone, single structured
// result. Kept as a named export for the §47 component matrix.
export function UrlInputForm(props) {
  return <ToolParameterForm {...props} />;
}
