import { type ResourceSchema as ResourceSchemaProps } from "./layouts/datapackage-types";

export const ResourceSchema: React.FC<{ schema: ResourceSchemaProps }> = ({
  schema,
}) => {
  const { fields } = schema;
  return (
    fields &&
    fields.length > 0 && (
      <div data-testid="dp-schema" className="mt-10">
        <h4 className="mb-3">Schema</h4>
        <table className="table-auto divide-y divide-gray-300">
          <thead>
            <tr>
              <th>Name</th>
              <th>Type</th>
            </tr>
          </thead>
          <tbody>
            {fields.map((field, x) => (
              <tr key={`${field.name}-${x}`} className="even:bg-gray-50">
                <td>{field.name}</td>
                <td>{field.type}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  );
};
