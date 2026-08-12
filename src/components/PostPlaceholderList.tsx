import "./post-placeholder-list.css";

interface PostPlaceholderListProps {
  count: number;
}

export function PostPlaceholderList({ count }: PostPlaceholderListProps) {
  return (
    <div className="post-placeholders">
      {Array.from({ length: count }, (_, index) => (
        <article aria-label={`Post placeholder ${index + 1}`} className="post-placeholder" key={index}>
          <span className="post-placeholder__avatar" />
          <div className="post-placeholder__body">
            <div className="post-placeholder__line post-placeholder__line--author" />
            <div className="post-placeholder__line" />
            <div className="post-placeholder__line post-placeholder__line--short" />
            {index % 2 === 1 ? <div className="post-placeholder__media" /> : null}
            <div className="post-placeholder__actions">
              {Array.from({ length: 5 }, (_, actionIndex) => <span key={actionIndex} />)}
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}
