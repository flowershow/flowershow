import { Card } from "@/components/Card";

export function CollectionItem({ collection }) {
  return (
    <article className="md:grid md:grid-cols-4 md:items-baseline">
      <Card className="md:col-span-3">
        <Card.Title href={`${collection.url_path}`}>
          {collection.title}
        </Card.Title>
        {collection.description && (
          <Card.Description>{collection.description}</Card.Description>
        )}
        <Card.Cta>View Collection</Card.Cta>
      </Card>
    </article>
  );
}
