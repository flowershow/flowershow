import { type ResourceSchema as ResourceSchemaProps } from "./layouts/datapackage-types";

export const ResourceSchema: React.FC<{ schema: ResourceSchemaProps }> = ({
  schema,
}) => {
  const { fields } = schema;

  if (!fields) {
    return null;
  }

  // traverse the fields objects to get the headers
  const columns = fields.reduce((acc, field) => {
    const keys = Object.keys(field);
    keys.forEach((key) => {
      if (!acc.includes(key)) {
        acc.push(key);
      }
    });
    return acc;
  }, [] as string[]);

  const requiredOrder = [
    "name",
    "type",
    "format",
    "description",
    "constraints",
  ]; // then any other keys alphabetically

  columns.sort((a, b) => {
    const aIndex = requiredOrder.indexOf(a);
    const bIndex = requiredOrder.indexOf(b);
    if (aIndex === -1 && bIndex === -1) {
      return a.localeCompare(b);
    }
    if (aIndex === -1) {
      return 1;
    }
    if (bIndex === -1) {
      return -1;
    }
    return aIndex - bIndex;
  });

  return (
    <div data-testid="dp-schema" className="mt-10">
      <h4 className="mb-3">Schema</h4>
      <div className="max-h-[75vh] max-w-full overflow-scroll">
        <table className="table-auto divide-y divide-gray-300">
          <thead>
            <tr>
              {columns.map((col, x) => (
                <th key={`${col}-${x}`} className="px-4 py-2">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {fields.map((field, x) => (
              <tr key={`${field.name}-${x}`} className="even:bg-gray-50">
                {columns.map((col, y) => (
                  <td key={`${col}-${y}`} className="px-4 py-2">
                    {typeof field[col] === "object"
                      ? JSON.stringify(field[col], null, 2)
                      : field[col]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
