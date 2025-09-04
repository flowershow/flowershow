import { api } from "@/trpc/server";
import { PageMetadata } from "@/server/api/types";
import ListComponentPagination from "./list-pagination";

type Slot = "media" | "eyebrow" | "headline" | "summary" | "footnote";
type SlotsMap = Partial<Record<Slot, keyof PageMetadata>>;
type SlotsFormatMap = Partial<Record<Slot, string>>;

type Field = "title" | "description" | "authors" | "date" | "image"; // TODO TB deprecated

const _convertFieldsToSlotsMap = (fields: Field[]) => {
  const _slotsMap: SlotsMap = {};
  fields.forEach((f) => {
    switch (f) {
      case "title":
        _slotsMap.headline = f;
        break;
      case "description":
        _slotsMap.summary = f;
        break;
      case "image":
        _slotsMap.media = f;
        break;
      case "date":
        _slotsMap.eyebrow = f;
        break;
      case "authors":
        _slotsMap.footnote = f;
        break;
    }
  });
  return _slotsMap;
};

export interface ListProps {
  siteId: string;
  dir?: string;
  fields?: Array<Field>; // TODO TB deprecated
  slots?: SlotsMap; // map slot -> metadata key
  // slotsFormat?: SlotsFormatMap; // key -> "currency:PLN", "date:yyyy-mm-dd", "join: • ", etc.
  // locale?: string; // e.g. "pl-PL"
  pageNumber?: number; // pagination, current page number
  pageSize?: number; // pagination, items per page
}

export default async function List({
  siteId,
  dir = "",
  fields,
  slots = { headline: "title", summary: "description" },
  // slotsFormat = { eyebrow: "date", footnote: "join: , " },
  // locale,
  pageNumber = 1,
  pageSize = 10,
}: ListProps) {
  const data = await api.site.getCatalogFiles.query({
    siteId,
    dir,
  });
  const pageItems = data.items.slice(
    (pageNumber - 1) * pageSize,
    pageNumber * pageSize,
  );

  if (!data?.items?.length) {
    return <div>No items found</div>;
  }
  const totalPages = Math.ceil(data.items.length / pageSize);

  const slotsMap = fields ? _convertFieldsToSlotsMap(fields) : slots;

  return (
    <div className="list-component not-prose">
      {pageItems.map(({ url, metadata }) => (
        <article key={url} className="list-component-item">
          {slotsMap.media && (
            <div className="list-component-item-media">
              <img
                alt="Image"
                src={
                  (getValue("media", metadata, slotsMap) as string) ??
                  "https://r2-assets.flowershow.app/placeholder.png"
                }
                className="list-component-item-media-img"
              />
            </div>
          )}

          <div className="list-component-item-content">
            {slotsMap.eyebrow && (
              <div className="list-component-item-eyebrow">
                {fmt("eyebrow", metadata, slotsMap)}
              </div>
            )}
            {slotsMap.headline && (
              <h3 className="list-component-item-headline">
                <a href={url!}>{fmt("headline", metadata, slotsMap)}</a>
              </h3>
            )}
            {slotsMap.summary && (
              <p className="list-component-item-summary">
                {fmt("summary", metadata, slotsMap)}
              </p>
            )}
            {slotsMap.footnote && (
              <p className="list-component-item-footnote">
                {fmt("footnote", metadata, slotsMap)}
              </p>
            )}
          </div>
        </article>
      ))}
      {totalPages > 1 && <ListComponentPagination totalPages={totalPages} />}
    </div>
  );
}

const keyForSlot = (s: Slot, slotsMap: SlotsMap) => slotsMap[s] ?? s;

const getValue = (s: Slot, meta: PageMetadata | null, slotsMap: SlotsMap) =>
  slotsMap[s] && meta?.[slotsMap[s]];

function applyFormat(spec: string, value: any, locale?: string) {
  if (value == null) return "";

  const [type, arg] = spec.split(":");

  switch (type) {
    case "currency": {
      const n = Number(value),
        cur = arg || "USD";
      try {
        return new Intl.NumberFormat(locale, {
          style: "currency",
          currency: cur,
        }).format(n);
      } catch {
        return `${n} ${cur}`;
      }
    }
    case "date": {
      const d = new Date(value);
      if ((arg ?? "").toLowerCase() === "yyyy-mm-dd") {
        const yyyy = d.getFullYear(),
          mm = String(d.getMonth() + 1).padStart(2, "0"),
          dd = String(d.getDate()).padStart(2, "0");
        return `${yyyy}-${mm}-${dd}`;
      }
      return d.toLocaleDateString(locale);
    }
    case "number":
      return new Intl.NumberFormat(locale).format(Number(value));
    case "percent":
      return new Intl.NumberFormat(locale, {
        style: "percent",
        maximumFractionDigits: 2,
      }).format(Number(value));
    case "join":
      return Array.isArray(value) ? value.join(arg ?? ", ") : String(value);
    case "prefix":
      return `${arg ?? ""}${value}`;
    case "suffix":
      return `${value}${arg ?? ""}`;
    default:
      return String(value);
  }
}

const fmt = (
  s: Slot,
  meta: PageMetadata | null,
  slotsMap: SlotsMap,
  // formatMap?: SlotsFormatMap,
  // locale?: string,
) => {
  const k = keyForSlot(s, slotsMap);
  const v = getValue(s, meta, slotsMap);
  // const spec = k && formatMap?.[k];
  // if (spec) return applyFormat(spec, v, locale);

  // if (s === "eyebrow" && typeof v === "string") return v.slice(0, 10);
  if (Array.isArray(v)) return v.join(", ");
  return v ?? "";
};
