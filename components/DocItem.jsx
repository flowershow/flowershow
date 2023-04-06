import { Card } from "@/components/Card";

export function DocItem({ doc }) {
  return (
    <article className="!mt-0">
      <Card className="md:col-span-3">
        <Card.Title className="text-teal-500" href={`${doc.url_path}`}>
          {doc.metadata.title}
        </Card.Title>
        {doc.metadata.excerpt && (
          <Card.Description>{doc.metadata.excerpt}</Card.Description>
        )}
      </Card>
    </article>
  );
}
