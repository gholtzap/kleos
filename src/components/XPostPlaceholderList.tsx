import "./x-post-placeholder-list.css";

interface XPostPlaceholderListProps {
  count: number;
}

export function XPostPlaceholderList({ count }: XPostPlaceholderListProps) {
  return (
    <div className="x-post-placeholders">
      {Array.from({ length: count }, (_, index) => (
        <article aria-label={`Post placeholder ${index + 1}`} className="x-post-placeholder" key={index}>
          <span className="x-post-placeholder__avatar" />
          <div className="x-post-placeholder__body">
            <div className="x-post-placeholder__line x-post-placeholder__line--author" />
            <div className="x-post-placeholder__line" />
            <div className="x-post-placeholder__line x-post-placeholder__line--short" />
            {index % 2 === 1 ? <div className="x-post-placeholder__media" /> : null}
            <div className="x-post-placeholder__actions">
              {Array.from({ length: 5 }, (_, actionIndex) => <span key={actionIndex} />)}
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}
